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

export const visionServer = createSdkMcpServer({
  name: "vision",
  version: "1.0.0",
  // Core mechanism: always in the prompt, never deferred behind ToolSearch
  // (saves one discovery round-trip per visual turn).
  alwaysLoad: true,
  tools: [snapshotTool],
});
