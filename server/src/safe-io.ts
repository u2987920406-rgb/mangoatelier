// Crash-safe persistence for the small JSON stores the server and its
// background agents rewrite in full (sessions.json, .chat-history.json):
// write a sibling temp file then rename it over the target, so a crash or
// power cut mid-write can never leave a truncated file as the only copy.
import fs from "node:fs";

export function atomicWriteFileSync(file: string, data: string): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, data);
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows refuses the replace when the target is briefly held open
    // (editor, antivirus scan) — fall back to a direct write.
    fs.writeFileSync(file, data);
    fs.rmSync(tmp, { force: true });
  }
}
