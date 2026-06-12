// Per-project version history backed by git: auto-commit after each agent
// iteration, list versions, hard rollback to any of them.
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { HISTORY_FILE_NAME } from "./history.js";
import { MEMORY_FILE_NAME } from "./memory.js";

const execFileAsync = promisify(execFile);

export type Version = { hash: string; date: string; message: string };

// Commits are authored as MangoAI so they don't depend on the user's git config.
const IDENTITY = ["-c", "user.name=MangoAI", "-c", "user.email=mangoai@local"];

async function git(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: dir });
  return stdout;
}

function hasRepo(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".git"));
}

// Chat history and agent memory live in the project dir but must not be
// versioned: a rollback should restore the code, not erase the conversation
// or what the agent has learned.
const PRESERVED_FILES = [HISTORY_FILE_NAME, MEMORY_FILE_NAME];
// User-uploaded attachments and vision snapshots: inputs/artifacts, not code —
// never versioned, and a rollback's clean must not delete them.
const PRESERVED_DIRS = [".assets", ".snapshots"];
const IGNORED = ["node_modules/", "dist/", ...PRESERVED_FILES, ...PRESERVED_DIRS.map((d) => `${d}/`)];

function ensureGitignore(dir: string): void {
  const gitignore = path.join(dir, ".gitignore");
  const lines = fs.existsSync(gitignore)
    ? fs.readFileSync(gitignore, "utf8").split(/\r?\n/)
    : [];
  const missing = IGNORED.filter((entry) => !lines.includes(entry));
  if (missing.length === 0) return;
  const head = lines.filter(Boolean).join("\n");
  fs.writeFileSync(gitignore, `${head ? `${head}\n` : ""}${missing.join("\n")}\n`);
}

/** Initializes a repo with an initial commit if the project has none yet. */
export async function ensureRepo(dir: string): Promise<void> {
  ensureGitignore(dir);
  if (hasRepo(dir)) return;
  await git(dir, ["init"]);
  await git(dir, ["add", "-A"]);
  await git(dir, [...IDENTITY, "commit", "-m", "Version initiale"]);
}

/** Stages everything and commits. Returns the new version, or null if nothing changed. */
export async function commitVersion(dir: string, message: string): Promise<Version | null> {
  await ensureRepo(dir);
  await git(dir, ["add", "-A"]);
  const status = await git(dir, ["status", "--porcelain"]);
  if (!status.trim()) return null;
  await git(dir, [...IDENTITY, "commit", "-m", message]);
  const out = await git(dir, ["log", "-1", "--format=%h|%cI|%s"]);
  return parseLine(out.trim());
}

/** Newest first. Empty array if the project has no repo yet. */
export async function listVersions(dir: string): Promise<Version[]> {
  if (!hasRepo(dir)) return [];
  const out = await git(dir, ["log", "--format=%h|%cI|%s"]);
  return out.trim().split("\n").filter(Boolean).map(parseLine);
}

/** Hard-resets the project to the given version; versions after it are discarded. */
export async function rollbackTo(dir: string, hash: string): Promise<void> {
  if (!/^[0-9a-f]{4,40}$/i.test(hash)) throw new Error("Invalid version hash");
  // Chat history and memory must survive even when the target commit predates
  // these features (its .gitignore doesn't shield the files from git clean).
  const saved = new Map<string, Buffer>();
  for (const name of PRESERVED_FILES) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) saved.set(file, fs.readFileSync(file));
  }
  await git(dir, ["reset", "--hard", hash]);
  // respects .gitignore → node_modules untouched
  await git(dir, [
    "clean",
    "-fd",
    ...[...PRESERVED_FILES, ...PRESERVED_DIRS].flatMap((name) => ["-e", name]),
  ]);
  for (const [file, content] of saved) fs.writeFileSync(file, content);
}

function parseLine(line: string): Version {
  const [hash, date, ...rest] = line.split("|");
  return { hash, date, message: rest.join("|") };
}
