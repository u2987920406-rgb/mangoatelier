// Manages the Vite dev server of the currently previewed generated project.
// One preview at a time, fixed port (PREVIEW_PORT, default 5174).
import { exec, spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const PREVIEW_PORT = Number(process.env.PREVIEW_PORT ?? 5174);

let current: { projectDir: string; proc: ChildProcess } | null = null;

export function previewStatus() {
  return {
    running: current !== null && current.proc.exitCode === null,
    projectDir: current?.projectDir ?? null,
    url: `http://localhost:${PREVIEW_PORT}`,
  };
}

export async function startPreview(projectDir: string): Promise<{ url: string }> {
  if (current && current.projectDir === projectDir && current.proc.exitCode === null) {
    return { url: `http://localhost:${PREVIEW_PORT}` };
  }
  await stopPreview();
  await freePort(PREVIEW_PORT);

  if (!fs.existsSync(path.join(projectDir, "package.json"))) {
    throw new Error(`No package.json in ${projectDir}`);
  }

  const proc = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev", "--", "--port", String(PREVIEW_PORT), "--strictPort"],
    { cwd: projectDir, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
  );
  current = { projectDir, proc };

  proc.stdout?.on("data", (d: Buffer) => process.stdout.write(`[preview] ${d}`));
  proc.stderr?.on("data", (d: Buffer) => process.stderr.write(`[preview] ${d}`));
  proc.on("exit", (code) => {
    console.log(`[preview] dev server exited (code ${code})`);
    if (current?.proc === proc) current = null;
  });

  await waitForServer(`http://localhost:${PREVIEW_PORT}`, 30_000);
  return { url: `http://localhost:${PREVIEW_PORT}` };
}

export async function stopPreview(): Promise<void> {
  if (!current) return;
  const { proc } = current;
  current = null;
  if (proc.exitCode === null) {
    if (process.platform === "win32" && proc.pid) {
      // Kill the whole tree on Windows (npm spawns vite as a child)
      spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      proc.kill("SIGTERM");
    }
  }
  await new Promise((r) => setTimeout(r, 500));
}

// Kills any orphaned process still bound to the preview port — e.g. a Vite
// left behind when a previous backend run was killed without its children.
// Without this, --strictPort makes every new preview fail, while the orphan
// keeps serving a stale project to the iframe.
async function freePort(port: number): Promise<void> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync("netstat -ano -p tcp");
      const pids = new Set<string>();
      for (const line of stdout.split(/\r?\n/)) {
        const m = line.match(/TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
        if (m && Number(m[1]) === port) pids.add(m[2]);
      }
      for (const pid of pids) {
        console.log(`[preview] killing orphan on port ${port} (pid ${pid})`);
        await execAsync(`taskkill /pid ${pid} /T /F`).catch(() => {});
      }
    } else {
      await execAsync(`lsof -ti tcp:${port} | xargs -r kill -9`).catch(() => {});
    }
  } catch {
    // best effort — spawn will fail loudly if the port is still taken
  }
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview server did not start within ${timeoutMs / 1000}s`);
}
