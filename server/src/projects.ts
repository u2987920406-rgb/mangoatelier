// Project lifecycle: create from template, list, resolve paths.
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const WORKSPACE_DIR = path.join(ROOT, "workspace");
const TEMPLATE_DIR = path.join(ROOT, "server", "template");
const TEMPLATES_DIR = path.join(ROOT, "server", "templates");

export function listProjects(): string[] {
  if (!fs.existsSync(WORKSPACE_DIR)) return [];
  return fs
    .readdirSync(WORKSPACE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function projectDir(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  if (!safe) throw new Error("Invalid project name");
  return path.join(WORKSPACE_DIR, safe);
}

export function projectExists(name: string): boolean {
  return fs.existsSync(path.join(projectDir(name), "package.json"));
}

/** Starter templates: each dir under server/templates/ overlays the base template. */
export function listTemplates(): string[] {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/** Copies the base template (+ optional starter overlay) and installs dependencies. */
export async function createProject(name: string, template?: string): Promise<string> {
  const dir = projectDir(name);
  if (fs.existsSync(dir)) throw new Error(`Project "${name}" already exists`);
  if (template && !listTemplates().includes(template)) {
    throw new Error(`Unknown template "${template}"`);
  }
  fs.cpSync(TEMPLATE_DIR, dir, { recursive: true });
  if (template) {
    fs.cpSync(path.join(TEMPLATES_DIR, template), dir, { recursive: true, force: true });
  }
  await run("npm", ["install"], dir);
  return dir;
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`)),
    );
    proc.on("error", reject);
  });
}
