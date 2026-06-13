// Inspection objective (Phase Ultime, Jalon D).
//
// Après que l'Élève a proposé un plan et que executeContract l'a appliqué, il
// faut décider — sans jugement subjectif — si le travail tient debout. Le seul
// verdict admis ici est FACTUEL : le projet compile-t-il ?
//
// Garde-fou acté (corrections du pré-test) : on escalade vers le Maître sur des
// signaux OBJECTIFS (build cassé, délai), JAMAIS sur « le rendu a l'air correct ».
// Pour un projet Vite, `vite build` est ce signal : il échoue sur erreur de
// syntaxe, import manquant, référence indéfinie, JSX invalide.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export type InspectionSignal =
  | "ok" // le projet compile
  | "build-failed" // build en erreur → escalade
  | "timeout" // build trop long → escalade
  | "no-build-script" // pas de script build dans package.json
  | "no-deps" // node_modules absent : npm install requis d'abord
  | "no-package"; // pas de package.json

export interface Inspection {
  ok: boolean; // true uniquement si signal === "ok"
  signal: InspectionSignal;
  detail: string; // fin de la sortie du build / message
  durationMs: number;
}

function npmBin(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runBuild(
  projectDir: string,
  timeoutMs: number,
): Promise<{ code: number; out: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    // Commande en chaîne unique + shell:true (pas d'args séparés) pour éviter
    // l'avertissement DEP0190 ; npm.cmd sous Windows nécessite le shell.
    const proc = spawn(`${npmBin()} run build`, {
      cwd: projectDir,
      shell: true,
      windowsHide: true,
    });
    let out = "";
    const cap = (d: Buffer) => {
      out += d.toString();
      if (out.length > 12_000) out = out.slice(-12_000);
    };
    proc.stdout?.on("data", cap);
    proc.stderr?.on("data", cap);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (proc.pid) {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" });
        } else {
          proc.kill("SIGKILL");
        }
      }
    }, timeoutMs);

    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, out: `${out}\n${e.message}`, timedOut });
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, out, timedOut });
    });
  });
}

/** Vérifie objectivement qu'un projet généré compile. */
export async function inspectProject(
  projectDir: string,
  opts: { timeoutMs?: number } = {},
): Promise<Inspection> {
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const t0 = Date.now();
  const done = (signal: InspectionSignal, detail: string): Inspection => ({
    ok: signal === "ok",
    signal,
    detail: detail.trim(),
    durationMs: Date.now() - t0,
  });

  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) return done("no-package", "package.json absent");

  let hasBuild = false;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    hasBuild = typeof pkg.scripts?.build === "string";
  } catch {
    return done("no-package", "package.json illisible");
  }
  if (!hasBuild) return done("no-build-script", "aucun script `build`");

  // Le build a besoin des dépendances ; sans elles, le verdict serait un faux
  // négatif. On le signale distinctement (l'orchestrateur lancera npm install).
  if (!fs.existsSync(path.join(projectDir, "node_modules"))) {
    return done("no-deps", "node_modules absent");
  }

  const { code, out, timedOut } = await runBuild(projectDir, timeoutMs);
  if (timedOut) return done("timeout", out.slice(-800));
  if (code === 0) return done("ok", out.slice(-400));
  return done("build-failed", out.slice(-1500));
}
