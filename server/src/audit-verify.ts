// Vérification d'EFFET pour l'Audit Scan (ferme le « trou de mesure », caveat n°7).
//
// Le problème : `vite build` ne juge que la COMPILATION. Un <edit> silencieusement
// raté (find qui ne matche pas → no-op) laisse le projet PRISTINE… qui build vert.
// Le « 100 % de réussite » devient alors un mensonge : le code compile mais le
// changement demandé n'a jamais atterri.
//
// La parade, NATIVE et déterministe : chaque tâche held-out (audit-tasks.ts) porte
// une ATTENTE D'EFFET — le ou les fichiers qui doivent exister APRÈS la tâche, et
// les marqueurs qui prouvent que le changement a bien atterri dans le source. On
// vérifie ces attentes sur le projet produit. Un build vert SANS effet est démasqué.
//
// Portée honnête : ceci vérifie que le changement a ATTERRI DANS LE SOURCE (tue le
// no-op silencieux), pas la correction COMPORTEMENTALE complète (slugify met-il
// vraiment en minuscules ?) — ça, c'est de la vérification runtime (idée 24, plus
// lourde, plus tard). On ferme ici le trou réel qu'on a heurté en vrai.
import path from "node:path";
import fs from "node:fs";

export interface FileExpect {
  /** Chemin relatif au projet, qui doit exister après la tâche. */
  file: string;
  /** Sous-chaînes qui doivent TOUTES être présentes (le changement a atterri). */
  includes?: string[];
  /** Au moins une de ces sous-chaînes doit être présente (tolère les variantes
   * de formulation, ex. différents styles d'export). */
  includesAny?: string[];
  /** Sous-chaînes qui ne doivent PAS être présentes (ex. l'ancien texte d'un edit
   * doit avoir disparu). */
  excludes?: string[];
}

/** L'effet attendu d'une tâche : une liste de fichiers + leurs marqueurs. */
export type EffectSpec = FileExpect[];

export interface EffectCheck {
  file: string;
  ok: boolean;
  reason: string;
}
export interface EffectResult {
  ok: boolean;
  checks: EffectCheck[];
  detail: string;
}

/** Vérifie qu'un projet porte bien l'effet attendu. Pur, déterministe, sans
 * réseau. Sensible à la casse (on matche des identifiants/chaînes de code). */
export function verifyEffect(projectDir: string, expect?: EffectSpec): EffectResult {
  // Pas d'attente déclarée → on ne PEUT pas juger l'effet. On le dit franchement
  // (ok=true neutre) plutôt que de prétendre l'avoir vérifié.
  if (!expect || expect.length === 0) {
    return { ok: true, checks: [], detail: "aucune attente d'effet déclarée" };
  }
  const checks: EffectCheck[] = [];
  for (const fe of expect) {
    // Défense en profondeur : on reste dans le projet.
    const abs = path.resolve(projectDir, fe.file);
    const rel = path.relative(projectDir, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      checks.push({ file: fe.file, ok: false, reason: "chemin hors projet" });
      continue;
    }
    let content: string;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      checks.push({ file: fe.file, ok: false, reason: "fichier absent" });
      continue;
    }
    const missing = (fe.includes ?? []).filter((s) => !content.includes(s));
    const anyOk =
      !fe.includesAny || fe.includesAny.length === 0 || fe.includesAny.some((s) => content.includes(s));
    const forbidden = (fe.excludes ?? []).filter((s) => content.includes(s));
    const ok = missing.length === 0 && anyOk && forbidden.length === 0;
    const reasons: string[] = [];
    if (missing.length) reasons.push(`manque « ${missing.join(" », « ")} »`);
    if (!anyOk) reasons.push(`aucun de [${fe.includesAny!.join(", ")}]`);
    if (forbidden.length) reasons.push(`interdit présent « ${forbidden.join(" », « ")} »`);
    checks.push({ file: fe.file, ok, reason: ok ? "ok" : reasons.join(" ; ") });
  }
  const ok = checks.every((c) => c.ok);
  const failed = checks.filter((c) => !c.ok);
  return {
    ok,
    checks,
    detail: ok ? "effet vérifié" : failed.map((c) => `${c.file} → ${c.reason}`).join(" | "),
  };
}
