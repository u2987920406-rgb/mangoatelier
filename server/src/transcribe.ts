// Transcription audio via Whisper local (python -m whisper).
// Reçoit un fichier audio temporaire, retourne le texte transcrit.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes("webm") ? ".webm" : mimeType.includes("mp4") ? ".mp4" : ".wav";
  const tmpInput = path.join(os.tmpdir(), `mango-audio-${Date.now()}${ext}`);
  const tmpDir = path.join(os.tmpdir(), `mango-whisper-${Date.now()}`);

  fs.writeFileSync(tmpInput, audioBuffer);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const text = await new Promise<string>((resolve, reject) => {
      execFile(
        "python",
        [
          "-m", "whisper",
          tmpInput,
          "--model", "medium",
          "--language", "fr",
          "--output_format", "txt",
          "--output_dir", tmpDir,
          "--fp16", "False",
        ],
        { timeout: 120_000 },
        (err, _stdout, stderr) => {
          if (err) {
            reject(new Error(`Whisper échoué : ${stderr || err.message}`));
            return;
          }
          const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".txt"));
          if (files.length === 0) {
            reject(new Error("Whisper n'a produit aucun fichier txt"));
            return;
          }
          const raw = fs.readFileSync(path.join(tmpDir, files[0]), "utf-8").trim();
          resolve(raw);
        }
      );
    });
    return text;
  } finally {
    try { fs.unlinkSync(tmpInput); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
