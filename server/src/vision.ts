// Advanced vision mode — the agent's eyes on the live preview.
// Transposed from Hermes Agent's briques: the browser/CDP tool becomes an
// in-process MCP tool (createSdkMcpServer) backed by Playwright, and
// IterationBudget becomes a per-turn snapshot counter with Hermes' soft-stop
// stance (the tool answers "budget exhausted", it never throws).
// The closed loop itself (patch → snapshot → critique → crop → re-patch)
// lives in the system prompt (VISION_RULES in agent.ts) — the model loops,
// this tool only captures.
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { chromium, type Browser } from "playwright";

export const SNAPSHOTS_DIR_NAME = ".snapshots";

// Hermes' IterationBudget concept: hard cap per turn, soft stop when spent.
// Two ceilings, picked per turn by the effort mode (idea 12): Élite gets the
// full budget for its patch→snapshot→crop loop; MVP gets a tight one (a single
// control snapshot is enough) to stay fast and cheap.
const BUDGET_ELITE = Number(process.env.VISION_BUDGET ?? 10);
const BUDGET_MVP = Number(process.env.VISION_BUDGET_MVP ?? 3);
// 1280×800 ≈ 1.0 MP ≈ ~1 400 vision tokens per global snapshot — cheap enough
// to loop, small enough never to hit Anthropic's 5 MB / 8 000 px limits.
const VIEWPORT = { width: 1280, height: 800 };
const FULL_PAGE_MAX_HEIGHT = 6000;
const MAX_IMAGE_BYTES = 4_000_000; // Hermes' proactive 4 MB embed cap
const IDLE_CLOSE_MS = 60_000;

// One agent turn at a time (agentBusy upstream) → simple module state.
let projectDir: string | null = null;
let previewUrl: string | null = null;
let used = 0;
let budget = BUDGET_ELITE;
let counter = 0;
let browser: Browser | null = null;
let idleTimer: NodeJS.Timeout | null = null;

/** Called at the start of each /api/chat turn: binds the tool to the active
 * project, sets the snapshot budget for the chosen effort mode, resets the
 * counter and purges the previous turn's files. */
export function setVisionContext(dir: string, url: string, mode: "mvp" | "elite" = "elite"): void {
  projectDir = dir;
  previewUrl = url;
  used = 0;
  budget = mode === "mvp" ? BUDGET_MVP : BUDGET_ELITE;
  try {
    fs.rmSync(path.join(dir, SNAPSHOTS_DIR_NAME), { recursive: true, force: true });
  } catch (err) {
    console.warn("[vision] purge:", err instanceof Error ? err.message : err);
  }
}

export function visionStatus(): { used: number; budget: number } {
  return { used, budget };
}

// The browser is a subprocess (jalon 1 isolation stance): a Playwright crash
// surfaces as a tool error, never as a server crash. Closed after idle so a
// finished turn doesn't keep Edge in memory.
async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  return browser;
}

function touchIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    browser?.close().catch(() => {});
    browser = null;
  }, IDLE_CLOSE_MS);
  idleTimer.unref();
}

const snapshotTool = tool(
  "snapshot",
  "Captures the live preview of the app as an image you can SEE (the rendered result, not the code). " +
    "Use it to verify your visual work: first a global snapshot, then — if a zone looks wrong, dense or unreadable " +
    "(table, chart, small text, alignment) — a zoomed crop of that zone via `selector` or `box` with `scale` 2-3.",
  {
    selector: z
      .string()
      .optional()
      .describe("CSS selector of one element to capture (crop + zoom on it)"),
    box: z
      .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
      .optional()
      .describe("Pixel bounding box to crop, in base viewport coordinates (1280×800)"),
    scale: z
      .number()
      .min(1)
      .max(3)
      .optional()
      .describe("Device scale factor for a high-resolution zoom (default 1; use 2-3 with selector/box)"),
    fullPage: z
      .boolean()
      .optional()
      .describe("Capture the whole page height (max 6000px; scale forced to 1)"),
  },
  async (args) => {
    if (!projectDir || !previewUrl) {
      return text("Aucun aperçu actif — impossible de capturer.", true);
    }
    if (used >= budget) {
      return text(
        `Budget vision épuisé pour ce tour (${budget} snapshots). N'en demande plus : livre l'état actuel et résume textuellement les écarts restants.`,
      );
    }
    used += 1;
    try {
      const effScale = args.fullPage ? 1 : Math.round(args.scale ?? 1);
      const b = await getBrowser();
      const context = await b.newContext({ viewport: VIEWPORT, deviceScaleFactor: effScale });
      try {
        const page = await context.newPage();
        await page.goto(previewUrl, { waitUntil: "load", timeout: 10_000 });
        await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {});
        await page.waitForTimeout(300); // settle animations/HMR

        const jpeg = { type: "jpeg" as const, quality: 80 };
        let buf: Buffer;
        let zone: string;
        if (args.selector) {
          const locator = page.locator(args.selector).first();
          await locator.waitFor({ state: "visible", timeout: 3_000 });
          buf = await locator.screenshot(jpeg);
          zone = `élément « ${args.selector} »`;
        } else if (args.box) {
          buf = await page.screenshot({ ...jpeg, clip: args.box });
          zone = `zone ${args.box.width}×${args.box.height} @ (${args.box.x}, ${args.box.y})`;
        } else {
          const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
          const height = args.fullPage
            ? Math.min(pageHeight, FULL_PAGE_MAX_HEIGHT)
            : VIEWPORT.height;
          buf = await page.screenshot({
            ...jpeg,
            clip: { x: 0, y: 0, width: VIEWPORT.width, height },
          });
          zone = args.fullPage ? `page entière (${height}px de haut)` : "aperçu (vue initiale)";
        }
        if (buf.length > MAX_IMAGE_BYTES) {
          return text(
            `Snapshot trop lourd (${Math.round(buf.length / 1024)} Ko) — capture une zone plus petite (selector/box) ou baisse le scale.`,
            true,
          );
        }

        // Kept on disk for debugging, purged at the start of the next turn.
        const dir = path.join(projectDir, SNAPSHOTS_DIR_NAME);
        fs.mkdirSync(dir, { recursive: true });
        const file = `snap-${++counter}.jpg`;
        fs.writeFileSync(path.join(dir, file), buf);

        return {
          content: [
            { type: "image" as const, data: buf.toString("base64"), mimeType: "image/jpeg" },
            {
              type: "text" as const,
              text:
                `Snapshot de ${zone} (scale ${effScale}) — budget restant : ${budget - used}/${budget}. ` +
                `Analyse l'image puis résume textuellement ce que tu constates.`,
            },
          ],
        };
      } finally {
        await context.close().catch(() => {});
        touchIdleTimer();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      return text(`Échec du snapshot : ${msg}`, true);
    }
  },
);

/** User-initiated zone capture (the chat's Snap button): renders the preview
 * at the exact viewport size the user sees (the iframe's CSS size) and crops
 * to the drawn box, so the capture matches the screen. PNG for crisp text
 * (the agent may OCR code/text from it). Does NOT consume the agent's vision
 * budget — this is the user's hand, not the agent's eyes. */
export async function snapZone(
  url: string,
  viewport: { width: number; height: number },
  box: { x: number; y: number; width: number; height: number },
): Promise<Buffer> {
  const b = await getBrowser();
  const context = await b.newContext({
    viewport: {
      width: Math.max(50, Math.round(viewport.width)),
      height: Math.max(50, Math.round(viewport.height)),
    },
    deviceScaleFactor: 2, // crisp text for OCR
  });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {});
    await page.waitForTimeout(300);
    return await page.screenshot({
      type: "png",
      clip: {
        x: Math.max(0, Math.round(box.x)),
        y: Math.max(0, Math.round(box.y)),
        width: Math.max(8, Math.round(box.width)),
        height: Math.max(8, Math.round(box.height)),
      },
    });
  } finally {
    await context.close().catch(() => {});
    touchIdleTimer();
  }
}

function text(message: string, isError = false) {
  return { content: [{ type: "text" as const, text: message }], ...(isError ? { isError: true } : {}) };
}

// ── Clone-from-URL (native alternative to Figma): screenshot a LIVE site so the
// agent can SEE its design and rebuild it. Reuses the same Playwright browser.
const CLONE_VIEWPORT = { width: 1280, height: 900 };
const CLONE_MAX_HEIGHT = 5000; // stay well under Anthropic's image limits

// Accepts only public http(s) URLs — blocks localhost/private ranges so the tool
// can't be turned against the user's own preview/backend (light SSRF hygiene).
// Pure → unit-testable.
export function isCloneableUrl(s: string): boolean {
  let u: URL;
  try {
    u = new URL((s ?? "").trim());
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h === "::1") return false;
  if (/^(127\.|10\.|0\.0\.0\.0|169\.254\.|192\.168\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

/** Full-page screenshot of an external website (JPEG). Reuses getBrowser(). */
export async function captureExternal(url: string): Promise<{ buf: Buffer; height: number }> {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: CLONE_VIEWPORT, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 20_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(600); // let fonts/hero images settle
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const height = Math.min(pageHeight || CLONE_VIEWPORT.height, CLONE_MAX_HEIGHT);
    const buf = await page.screenshot({
      type: "jpeg",
      quality: 80,
      clip: { x: 0, y: 0, width: CLONE_VIEWPORT.width, height },
    });
    return { buf, height };
  } finally {
    await context.close().catch(() => {});
    touchIdleTimer();
  }
}

const cloneTool = tool(
  "clone_url",
  "Captures a full-page screenshot of a LIVE website from its URL so you can SEE its design and rebuild it. " +
    "Call this FIRST when the user gives a website URL and asks to clone/reproduce it or build something 'like this site'. " +
    "Then recreate its structure, palette and typography in React + Tailwind v4 — never copy its text/content.",
  { url: z.string().describe("Public http(s) URL of the website to capture") },
  async (args) => {
    if (!isCloneableUrl(args.url)) {
      return text("URL invalide pour le clonage — fournis une adresse http(s) publique (pas localhost).", true);
    }
    try {
      const { buf, height } = await captureExternal(args.url);
      if (buf.length > MAX_IMAGE_BYTES) {
        return text(
          `Capture trop lourde (${Math.round(buf.length / 1024)} Ko) — réessaie ; si ça persiste, décris le design.`,
          true,
        );
      }
      return {
        content: [
          { type: "image" as const, data: buf.toString("base64"), mimeType: "image/jpeg" },
          {
            type: "text" as const,
            text:
              `Capture de ${args.url} (${height}px de haut). Reproduis fidèlement sa structure, sa palette et sa ` +
              "typographie en React + Tailwind v4 — recrée le DESIGN, ne copie pas le contenu textuel.",
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      return text(`Échec de la capture du site : ${msg}`, true);
    }
  },
);

// ── Scrape-from-URL : aspire l'INFORMATION d'une page publique (texte + liens),
// pas seulement ses pixels. Réutilise le même Chromium que captureExternal : un
// seul chargement de page rend le texte (pour répondre) ET, en option, l'image
// (pour le layout). Bien plus puissant qu'un screenshot pour « aspirer des infos
// et les retranscrire en local » → Claude synthétise ensuite la réponse.
const SCRAPE_MAX_TEXT = 16_000; // caractères — borne le coût en tokens
const SCRAPE_MAX_LINKS = 60;

export interface ScrapedPage {
  title: string;
  text: string;
  links: { href: string; label: string }[];
  truncated: boolean;
}

/** Charge une page publique et en extrait titre + texte visible + liens.
 * `withImage` ajoute une capture pleine page (layout). Réutilise getBrowser(). */
export async function scrapeExternal(
  url: string,
  withImage = false,
): Promise<ScrapedPage & { image?: Buffer }> {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: CLONE_VIEWPORT, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 20_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);

    const { title, rawText, rawLinks } = await page.evaluate(() => {
      // innerText respecte le rendu (ignore <script>/<style>, garde les sauts).
      const t = (document.body?.innerText ?? "").replace(/\n{3,}/g, "\n\n").trim();
      const links = [...document.querySelectorAll("a[href]")].map((a) => ({
        href: (a as HTMLAnchorElement).href,
        label: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      }));
      return { title: document.title ?? "", rawText: t, rawLinks: links };
    });

    const truncated = rawText.length > SCRAPE_MAX_TEXT;
    const text = truncated ? rawText.slice(0, SCRAPE_MAX_TEXT) : rawText;

    // Dédoublonne par href, garde ceux qui portent un libellé, borne le nombre.
    const seen = new Set<string>();
    const links: { href: string; label: string }[] = [];
    for (const l of rawLinks) {
      if (!l.href || l.href.startsWith("javascript:") || seen.has(l.href)) continue;
      seen.add(l.href);
      links.push(l);
      if (links.length >= SCRAPE_MAX_LINKS) break;
    }

    let image: Buffer | undefined;
    if (withImage) {
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const height = Math.min(pageHeight || CLONE_VIEWPORT.height, CLONE_MAX_HEIGHT);
      image = await page.screenshot({
        type: "jpeg",
        quality: 80,
        clip: { x: 0, y: 0, width: CLONE_VIEWPORT.width, height },
      });
    }
    return { title, text, links, truncated, image };
  } finally {
    await context.close().catch(() => {});
    touchIdleTimer();
  }
}

const scrapeTool = tool(
  "scrape_url",
  "Aspire l'INFORMATION d'une page web publique (titre + texte visible + liens) pour répondre à une demande de l'utilisateur. " +
    "Préfère-le à clone_url dès que tu veux le CONTENU/des données d'une page (pas son design). " +
    "Mets `withImage` à true seulement si la mise en page visuelle compte. Synthétise ensuite la réponse en local ; cite la source.",
  {
    url: z.string().describe("URL http(s) publique de la page à aspirer"),
    query: z
      .string()
      .optional()
      .describe("Ce que l'utilisateur cherche dans la page (focalise ta synthèse)"),
    withImage: z
      .boolean()
      .optional()
      .describe("Joindre aussi une capture pleine page (layout) — false par défaut"),
  },
  async (args) => {
    if (!isCloneableUrl(args.url)) {
      return text("URL invalide — fournis une adresse http(s) publique (pas localhost).", true);
    }
    try {
      const r = await scrapeExternal(args.url, args.withImage === true);
      const header =
        `Source : ${args.url}\nTitre : ${r.title || "(sans titre)"}` +
        (args.query ? `\nDemande : ${args.query}` : "") +
        (r.truncated ? `\n(texte tronqué à ${SCRAPE_MAX_TEXT} caractères)` : "");
      const linksBlock = r.links.length
        ? "\n\nLiens :\n" + r.links.map((l) => `- ${l.label || "(sans libellé)"} → ${l.href}`).join("\n")
        : "";
      const body =
        `${header}\n\n--- TEXTE DE LA PAGE ---\n${r.text}${linksBlock}\n\n` +
        "Réponds à la demande à partir de ces informations, en local. Cite la source ; n'invente rien d'absent du texte.";

      const content: ({ type: "text"; text: string } | { type: "image"; data: string; mimeType: string })[] = [];
      if (r.image && r.image.length <= MAX_IMAGE_BYTES) {
        content.push({ type: "image", data: r.image.toString("base64"), mimeType: "image/jpeg" });
      }
      content.push({ type: "text", text: body });
      return { content };
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      return text(`Échec de l'aspiration de la page : ${msg}`, true);
    }
  },
);

export const visionServer = createSdkMcpServer({
  name: "vision",
  version: "1.0.0",
  // Core mechanism: always in the prompt, never deferred behind ToolSearch
  // (saves one discovery round-trip per visual turn).
  alwaysLoad: true,
  tools: [snapshotTool, cloneTool, scrapeTool],
});
