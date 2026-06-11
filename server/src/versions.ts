// Per-project version history backed by git: auto-commit after each agent
// iteration, list versions, hard rollback to any of them.
import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

/** Initializes a repo with an initial commit if the project has none yet. */
export async function ensureRepo(dir: string): Promise<void> {
  if (hasRepo(dir)) return;
  await git(dir, ["init"]);
  const gitignore = path.join(dir, ".gitignore");
  if (!fs.existsSync(gitignore)) fs.writeFileSync(gitignore, "node_modules/\ndist/\n");
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
  await git(dir, ["reset", "--hard", hash]);
  await git(dir, ["clean", "-fd"]); // respects .gitignore → node_modules untouched
}

function parseLine(line: string): Version {
  const [hash, date, ...rest] = line.split("|");
  return { hash, date, message: rest.join("|") };
}
