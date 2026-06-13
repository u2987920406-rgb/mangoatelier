// Coque Rigide (Phase Ultime, jalon C): the strict, standardized I/O contract
// by which ANY model (Claude today as a stand-in, a local "student" tomorrow)
// talks to MangoAI. The model does NOT touch the disk — it PROPOSES a list of
// actions in a parseable format; MangoAI parses → repairs → validates → (later,
// jalon D) executes. This module is the OUTPUT side: turning a model's raw
// response into a safe, structured ActionPlan, or a clean rejection.
//
// Why tags and not JSON: actions carry raw code (file contents). JSON would
// force escaping every quote/newline — which weak models break constantly.
// Tags tolerate arbitrary content between them. This is the robustness key.
//
// v1 is pure string logic — no model, no disk — so it is fully deterministic
// and unit-testable. The executor + live wiring come with jalon D (the student).

export type Action =
  | { kind: "write"; path: string; content: string }
  | { kind: "edit"; path: string; find: string; replace: string }
  | { kind: "run"; command: string };

export type ContractResult =
  | { ok: true; actions: Action[]; summary: string; axiom?: string; repaired: boolean }
  | { ok: false; error: string };

const ENVELOPE = /<mangoai>([\s\S]*?)<\/mangoai>/i;
// One regex, scanned in order, so write/edit/run keep their original sequence.
const ACTION = /<(write|edit|run)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const ATTR_PATH = /path\s*=\s*["']([^"']+)["']/i;
const FIND = /<find>([\s\S]*?)<\/find>/i;
const REPLACE = /<replace>([\s\S]*?)<\/replace>/i;
const SUMMARY = /<summary>([\s\S]*?)<\/summary>/i;
const AXIOM = /<axiom>([\s\S]*?)<\/axiom>/i;

/** A path is safe if it is project-relative: no absolute path, no drive letter,
 * no parent-directory escape. The model must never reach outside the project. */
function isSafePath(p: string): boolean {
  const t = p.trim().replace(/\\/g, "/");
  if (!t) return false;
  if (t.startsWith("/")) return false; // absolute (posix)
  if (/^[a-zA-Z]:/.test(t)) return false; // drive letter (windows)
  if (t.split("/").some((seg) => seg === "..")) return false; // traversal
  return true;
}

// Trim a single leading/trailing newline (models put the content on its own
// lines) without disturbing intentional internal whitespace.
function trimEdges(s: string): string {
  return s.replace(/^\r?\n/, "").replace(/\r?\n[ \t]*$/, "");
}

/** Parses a model's raw response into a validated ActionPlan, repairing common
 * formatting slips first. Returns {ok:false, error} when the response cannot be
 * salvaged — in the live system that is the signal to escalate to Claude. */
export function parseContract(raw: string): ContractResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "Réponse vide." };
  }
  let repaired = false;
  let text = raw.trim();

  // Repair 1: strip a wrapping markdown code fence (```xml … ``` / ``` … ```).
  const fence = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/.exec(text);
  if (fence) {
    text = fence[1].trim();
    repaired = true;
  }

  // Repair 2: extract the envelope from surrounding prose; if absent but action
  // tags are present, wrap them (the model forgot the envelope).
  let body: string;
  const env = ENVELOPE.exec(text);
  if (env) {
    if (env[0].length !== text.length) repaired = true; // there was extra text around it
    body = env[1];
  } else if (/<(write|edit|run)\b/i.test(text)) {
    body = text;
    repaired = true;
  } else {
    return { ok: false, error: "Aucune enveloppe <mangoai> ni action reconnaissable." };
  }

  const actions: Action[] = [];
  ACTION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ACTION.exec(body)) !== null) {
    const kind = m[1].toLowerCase();
    const attrs = m[2] ?? "";
    const inner = m[3] ?? "";
    if (kind === "write") {
      const path = ATTR_PATH.exec(attrs)?.[1];
      if (!path) return { ok: false, error: "Action <write> sans attribut path." };
      if (!isSafePath(path)) return { ok: false, error: `Chemin non autorisé : ${path}` };
      actions.push({ kind: "write", path: path.trim(), content: trimEdges(inner) });
    } else if (kind === "edit") {
      const path = ATTR_PATH.exec(attrs)?.[1];
      if (!path) return { ok: false, error: "Action <edit> sans attribut path." };
      if (!isSafePath(path)) return { ok: false, error: `Chemin non autorisé : ${path}` };
      const find = FIND.exec(inner)?.[1];
      const replace = REPLACE.exec(inner)?.[1];
      if (find === undefined || replace === undefined) {
        return { ok: false, error: `Action <edit ${path}> sans <find>/<replace>.` };
      }
      actions.push({ kind: "edit", path: path.trim(), find: trimEdges(find), replace: trimEdges(replace) });
    } else {
      const command = trimEdges(inner).trim();
      if (!command) return { ok: false, error: "Action <run> vide." };
      actions.push({ kind: "run", command });
    }
  }

  const summary = trimEdges(SUMMARY.exec(body)?.[1] ?? "").trim();
  const axiomText = trimEdges(AXIOM.exec(body)?.[1] ?? "").trim();

  if (actions.length === 0 && !summary) {
    return { ok: false, error: "Ni action exécutable ni résumé." };
  }
  return { ok: true, actions, summary, ...(axiomText ? { axiom: axiomText } : {}), repaired };
}
