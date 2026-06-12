// One-click deployment of a generated project to Cloudflare Pages:
// vite build → wrangler pages deploy → https://<project>.pages.dev
// Requires a one-time "npx wrangler login" in server/ (browser OAuth).
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SERVER_DIR = path.resolve(import.meta.dirname, "..");

// CI=true keeps wrangler from opening an interactive browser login from a
// spawned process (it fails fast instead, and we map that to a clear message).
async function run(cmd: string, args: string[], cwd: string, timeoutMs = 180_000): Promise<string> {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    cwd,
    timeout: timeoutMs,
    shell: process.platform === "win32",
    env: { ...process.env, CI: "true" },
    maxBuffer: 16 * 1024 * 1024,
  });
  return `${stdout}\n${stderr}`;
}

function sanitizePagesName(name: string): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 58);
  if (!safe) throw new Error("Invalid project name for deployment");
  return safe;
}

function friendly(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/not authenticated|in a non-interactive environment|wrangler login|api token|10000/i.test(msg)) {
    return new Error(
      "Cloudflare non connecté — ouvre un terminal, exécute une fois « npx wrangler login » dans le dossier server/, puis réessaie.",
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function deployProject(dir: string, name: string): Promise<{ url: string }> {
  const project = sanitizePagesName(name);

  await run("npm", ["run", "build"], dir);
  const dist = path.join(dir, "dist");
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    throw new Error("Le build n'a pas produit de dist/index.html");
  }

  try {
    await run(
      "npx",
      ["wrangler", "pages", "project", "create", project, "--production-branch=main"],
      SERVER_DIR,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already exists/i.test(msg)) throw friendly(err);
  }

  try {
    await run(
      "npx",
      ["wrangler", "pages", "deploy", dist, `--project-name=${project}`, "--branch=main", "--commit-dirty=true"],
      SERVER_DIR,
      300_000,
    );
  } catch (err) {
    throw friendly(err);
  }

  return { url: `https://${project}.pages.dev` };
}
