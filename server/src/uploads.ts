// Multimodal inputs: user-attached screenshots and PDFs saved under
// workspace/<project>/.assets/. The agent's Read tool understands PNG/JPEG
// and PDF natively, so a file on disk + its path in the prompt is all the
// "vision input" plumbing needed — and the image enters the conversation as
// a tool result, which the proactive /compact can later evict (an image
// embedded in the user message could not be).
import path from "node:path";
import fs from "node:fs";

export const ASSETS_DIR_NAME = ".assets";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]);

/** Saves an uploaded file, returns its project-relative path (posix style). */
export function saveUpload(projectDir: string, filename: string, data: Buffer): string {
  if (data.length === 0) throw new Error("Fichier vide");
  if (data.length > MAX_UPLOAD_BYTES) throw new Error("Fichier trop lourd (25 Mo max)");
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Type de fichier non supporté « ${ext || filename} » (PNG, JPEG, WebP, GIF ou PDF)`);
  }
  const base =
    path
      .basename(filename, path.extname(filename))
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase()
      .slice(0, 60)
      .replace(/^-|-$/g, "") || "fichier";
  const dir = path.join(projectDir, ASSETS_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  let name = `${base}${ext}`;
  for (let n = 2; fs.existsSync(path.join(dir, name)); n++) name = `${base}-${n}${ext}`;
  fs.writeFileSync(path.join(dir, name), data);
  return `${ASSETS_DIR_NAME}/${name}`;
}
