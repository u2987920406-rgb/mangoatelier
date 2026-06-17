// Idée #80 — Capture avant/après en mode vision. Capture le rendu de la preview
// AVANT la 1ʳᵉ modification d'un tour et APRÈS (Vite HMR rafraîchi), pour un diff
// side-by-side dans le chat. S'ajoute à la boucle vision sans la modifier.
//
// Les snapshots vivent dans <projectDir>/.diffs/ (pas .snapshots, purgé à chaque
// tour par setVisionContext) ; un seul couple before/after conservé (purge au
// "before"). La capture (Playwright) est injectable → tests sans navigateur.
import path from "node:path";
import fs from "node:fs";
import { capturePreview } from "./vision.js";

export const DIFF_DIR_NAME = ".diffs";

// Modes où la boucle vision tourne déjà → le diff a du sens (et un destinataire
// chat live). MVP reste rapide/sans latence ; nocturne n'a pas de chat live.
const VISION_DIFF_MODES = new Set(["elite", "finition", "esthetique"]);

export function shouldCaptureDiff(mode: string): boolean {
  return VISION_DIFF_MODES.has(mode);
}

export interface DiffDeps {
  capture: (url: string) => Promise<Buffer>;
}
const defaultDeps: DiffDeps = { capture: capturePreview };

function diffDir(projectDir: string): string {
  return path.join(projectDir, DIFF_DIR_NAME);
}

/** Chemin absolu sûr d'un fichier diff (anti path-traversal : basename .jpg only,
 * sous .diffs). null si le nom est suspect. */
export function safeDiffPath(projectDir: string, file: string): string | null {
  if (!file || /[/\\]/.test(file)) return null;
  if (!/^[a-z0-9-]+\.jpg$/i.test(file)) return null;
  const base = path.resolve(diffDir(projectDir));
  const resolved = path.resolve(path.join(diffDir(projectDir), file));
  if (!resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

/** Capture l'URL → écrit <dir>/.diffs/<phase>-<ts>.jpg et renvoie le NOM du
 * fichier (servable), ou null en cas d'échec (best-effort, ne lève jamais).
 * "before" purge .diffs d'abord (un seul couple conservé) ; "after" non. */
export async function captureDiff(
  projectDir: string,
  url: string,
  phase: "before" | "after",
  ts: number,
  deps: DiffDeps = defaultDeps,
): Promise<string | null> {
  try {
    const dir = diffDir(projectDir);
    if (phase === "before") {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
    const buf = await deps.capture(url);
    const file = `${phase}-${ts}.jpg`;
    fs.writeFileSync(path.join(dir, file), buf);
    return file;
  } catch {
    return null;
  }
}
