// Figma design-to-code bridge (idea 25) — NATIVE, no external MCP server.
// Same "native-first" reasoning that turned idea 27 (SAM/VLM) into the DOM
// relay: the official Figma Dev Mode MCP needs the desktop app running with the
// file open; we don't need it. The agent ALREADY sees PNGs natively (vision.ts),
// and the Figma REST API hands us both halves of the real problem:
//   - GET /v1/files/:key/nodes   → the design tree (fills, fonts, layout…)
//   - GET /v1/images/:key?...png → a pixel-perfect render of the frame
// So this is just an in-process MCP tool (mirrors vision's snapshotTool): a
// Figma URL in, the rendered IMAGE + distilled design tokens out. Auth is one
// personal token in .env (like GITHUB_TOKEN) — nothing to launch, exportable.
import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";

const API = "https://api.figma.com";
// Anthropic caps images near 8000px/side & ~5MB. A frame whose largest side is
// already big stays at scale 1; smaller frames get scale 2 for crisp text.
const SCALE2_MAX_DIM = 3500;
const MAX_IMAGE_BYTES = 4_500_000;
const MAX_DISTILL_CHARS = 6000;

export function figmaConfigured(): boolean {
  return Boolean(process.env.FIGMA_TOKEN?.trim());
}

function token(): string {
  const t = process.env.FIGMA_TOKEN?.trim();
  if (!t) {
    throw new Error(
      "Figma non configuré — crée un token perso sur https://www.figma.com/developers/api#access-tokens " +
        "et ajoute FIGMA_TOKEN=<ton token> dans server/.env, puis réessaie.",
    );
  }
  return t;
}

// "https://www.figma.com/design/KEY/Name?node-id=12-34" → { fileKey, nodeId }.
// The URL uses "12-34" but the REST API wants "12:34". Accepts the three link
// shapes Figma hands out: /design/, /file/ (legacy) and /proto/ (presentation).
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)figma\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/\/(?:design|file|proto)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  const raw = u.searchParams.get("node-id");
  const nodeId = raw ? raw.replace(/-/g, ":") : null;
  return { fileKey: m[1], nodeId };
}

type RGBA = { r: number; g: number; b: number; a?: number };
type FigmaNode = {
  id?: string;
  name?: string;
  type?: string;
  characters?: string;
  absoluteBoundingBox?: { width?: number; height?: number } | null;
  fills?: { type?: string; color?: RGBA; visible?: boolean }[];
  strokes?: { type?: string; color?: RGBA }[];
  style?: { fontFamily?: string; fontWeight?: number; fontSize?: number };
  children?: FigmaNode[];
};

function rgbaToHex(c: RGBA): string {
  const h = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

export type DistilledDesign = {
  name: string;
  type: string;
  width: number;
  height: number;
  palette: string[];
  typography: { text: string; font: string; size: number; weight: number }[];
  components: string[];
  outline: string[];
};

// Walks the node tree once and pulls out what a developer needs to rebuild the
// screen: palette, type ramp, component names, and a shallow layer outline.
// Pure (no network) → unit-testable on a fixture.
export function distillDesign(root: FigmaNode): DistilledDesign {
  const palette = new Set<string>();
  const typography: DistilledDesign["typography"] = [];
  const components = new Set<string>();
  const outline: string[] = [];
  const NODE_CAP = 4000;
  let seen = 0;

  const walk = (node: FigmaNode, depth: number): void => {
    if (seen >= NODE_CAP) return;
    seen++;

    for (const f of node.fills ?? []) {
      if (f?.type === "SOLID" && f.color && f.visible !== false && palette.size < 24) {
        palette.add(rgbaToHex(f.color));
      }
    }
    for (const s of node.strokes ?? []) {
      if (s?.type === "SOLID" && s.color && palette.size < 24) palette.add(rgbaToHex(s.color));
    }
    if (node.type === "TEXT" && node.characters && typography.length < 30) {
      typography.push({
        text: node.characters.replace(/\s+/g, " ").slice(0, 60),
        font: node.style?.fontFamily ?? "?",
        size: Math.round(node.style?.fontSize ?? 0),
        weight: node.style?.fontWeight ?? 400,
      });
    }
    if ((node.type === "COMPONENT" || node.type === "INSTANCE") && node.name && components.size < 30) {
      components.add(node.name);
    }
    if (depth <= 2 && node.name && outline.length < 50) {
      outline.push(`${"  ".repeat(depth)}${node.name} <${node.type ?? "?"}>`);
    }
    for (const c of node.children ?? []) walk(c, depth + 1);
  };
  walk(root, 0);

  const box = root.absoluteBoundingBox ?? {};
  return {
    name: root.name ?? "?",
    type: root.type ?? "?",
    width: Math.round(box.width ?? 0),
    height: Math.round(box.height ?? 0),
    palette: [...palette],
    typography,
    components: [...components],
    outline,
  };
}

// Picks the render scale so the largest side stays within Anthropic's image
// limits while keeping small frames crisp. Pure → testable.
export function pickScale(width: number, height: number): 1 | 2 {
  return Math.max(width, height) > SCALE2_MAX_DIM ? 1 : 2;
}

// Renders the distilled design as a compact, capped text block for the prompt.
function formatDistilled(d: DistilledDesign): string {
  const lines = [
    `Design « ${d.name} » <${d.type}> — ${d.width}×${d.height}px`,
    d.palette.length ? `Palette : ${d.palette.join(" ")}` : "",
    d.components.length ? `Composants : ${d.components.join(", ")}` : "",
    d.typography.length
      ? "Typographie :\n" +
        d.typography.map((t) => `  • ${t.size}px/${t.weight} ${t.font} — « ${t.text} »`).join("\n")
      : "",
    d.outline.length ? "Structure :\n" + d.outline.join("\n") : "",
  ].filter(Boolean);
  return lines.join("\n").slice(0, MAX_DISTILL_CHARS);
}

async function figmaApi(path: string): Promise<Response> {
  return fetch(`${API}${path}`, { headers: { "X-Figma-Token": token() } });
}

function friendly(status: number): string {
  if (status === 403) return "Token Figma invalide ou sans accès à ce fichier — vérifie FIGMA_TOKEN.";
  if (status === 404) return "Fichier ou frame Figma introuvable (vérifie le lien).";
  return `Figma a répondu ${status}.`;
}

/** Core bridge: URL → { image PNG (or null if too big), distilled tokens }. */
export async function importFigma(
  url: string,
): Promise<{ image: Buffer | null; distilled: DistilledDesign; note?: string }> {
  const parsed = parseFigmaUrl(url);
  if (!parsed) throw new Error("Lien Figma non reconnu — colle l'URL d'un fichier ou d'une frame figma.com.");
  const { fileKey, nodeId } = parsed;
  if (!nodeId) {
    throw new Error(
      "Aucune frame sélectionnée dans le lien — dans Figma, clic droit sur la frame → « Copy link to selection ».",
    );
  }

  // 1) Design tree.
  const nodesRes = await figmaApi(`/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`);
  if (!nodesRes.ok) throw new Error(friendly(nodesRes.status));
  const nodesJson = (await nodesRes.json()) as { nodes?: Record<string, { document?: FigmaNode }> };
  const doc = nodesJson.nodes?.[nodeId]?.document;
  if (!doc) throw new Error("La frame demandée est absente de la réponse Figma (lien périmé ?).");
  const distilled = distillDesign(doc);

  // 2) Rendered PNG (a temporary S3 URL we then fetch).
  const scale = pickScale(distilled.width, distilled.height);
  const imgRes = await figmaApi(
    `/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${scale}`,
  );
  if (!imgRes.ok) throw new Error(friendly(imgRes.status));
  const imgJson = (await imgRes.json()) as { images?: Record<string, string | null>; err?: string | null };
  const pngUrl = imgJson.images?.[nodeId];
  if (imgJson.err || !pngUrl) {
    return { image: null, distilled, note: "Rendu d'image Figma indisponible — je m'appuie sur les tokens extraits." };
  }
  const png = Buffer.from(await (await fetch(pngUrl)).arrayBuffer());
  if (png.length > MAX_IMAGE_BYTES) {
    return {
      image: null,
      distilled,
      note: `Image trop lourde (${Math.round(png.length / 1024)} Ko) — je m'appuie sur les tokens extraits.`,
    };
  }
  return { image: png, distilled };
}

const importTool = tool(
  "import",
  "Imports a Figma design from its URL: returns a rendered IMAGE of the frame you can SEE, plus its " +
    "extracted design tokens (palette, typography, components, layout outline). Call this FIRST whenever the " +
    "user gives a figma.com link, then reproduce the design faithfully with Tailwind v4.",
  {
    url: z.string().describe("Figma frame URL — best obtained via 'Copy link to selection' in Figma"),
  },
  async (args) => {
    try {
      const { image, distilled, note } = await importFigma(args.url);
      const summary = formatDistilled(distilled) + (note ? `\n\n(${note})` : "");
      const content: (
        | { type: "image"; data: string; mimeType: string }
        | { type: "text"; text: string }
      )[] = [];
      if (image) {
        content.push({ type: "image", data: image.toString("base64"), mimeType: "image/png" });
      }
      content.push({
        type: "text",
        text:
          `${summary}\n\n` +
          "Reproduis fidèlement ce design (palette, typo, espacements, hiérarchie) en React + Tailwind v4. " +
          "Compare visuellement ton rendu avec l'outil snapshot.",
      });
      return { content };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  },
);

export const figmaServer = createSdkMcpServer({
  name: "figma",
  version: "1.0.0",
  alwaysLoad: true,
  tools: [importTool],
});
