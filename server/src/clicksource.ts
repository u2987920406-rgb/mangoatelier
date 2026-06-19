// Relais clic → source (Phase Ultime, #5 de la feuille de route) — le pont
// DÉTERMINISTE pixel → code, NATIF (pas de SAM, pas de modèle externe).
//
// Linchpin vérifié empiriquement (exp-clicksource.ts) : en React 19, la fiber
// `_debugSource` a été RETIRÉE — le chemin « zéro-config » de l'analyse initiale
// est mort. La réponse native et insensible aux versions : un tampon Babel qui,
// EN DEV UNIQUEMENT, stampe chaque élément hôte JSX avec data-mango-src="fichier:ligne".
// Vite/Babel transforme déjà le JSX ; on ajoute juste un attribut. Ensuite,
// document.elementFromPoint(x,y).closest('[data-mango-src]') donne le fichier:ligne
// EXACT du code qui a produit l'élément cliqué — déterministe, gratuit.
//
// Ce module pose le tampon (injection idempotente dans vite.config.js, comme
// ensureErrorRelay pour index.html) et lit l'extrait de code pointé. Le clic
// vivant est capté côté aperçu par le script inspect-relay (relay.ts) qui
// postMessage le data-mango-src au builder. Le Maître/Élève édite ensuite via
// la Coque Rigide (#6).
import path from "node:path";
import fs from "node:fs";

export const CLICK_SOURCE_ATTR = "data-mango-src";

// Le plugin Babel, écrit EN LIGNE dans la config du projet généré (aucune
// dépendance npm à ajouter : un plugin Babel n'est qu'une fonction, et
// @vitejs/plugin-react fournit `babel.plugins`). Gardé DEV-ONLY via NODE_ENV
// (vite build met NODE_ENV=production → l'attribut ne fuit ni dans le build ni
// dans le déploiement). N'altère que les éléments hôtes (balises minuscules),
// jamais les composants React.
const PLUGIN_FACTORY = `function mangoClickSource() {
  // Stampe chaque élément hôte JSX avec data-mango-src="chemin/relatif:ligne"
  // (dev only) pour le relais clic->source de MangoOS. Inoffensif, idempotent.
  return function (babel) {
    var t = babel.types;
    return {
      name: "mango-click-source",
      visitor: {
        JSXOpeningElement: function (p, state) {
          var n = p.node.name;
          if (!n || n.type !== "JSXIdentifier" || !/^[a-z]/.test(n.name)) return;
          for (var i = 0; i < p.node.attributes.length; i++) {
            var a = p.node.attributes[i];
            if (a.type === "JSXAttribute" && a.name && a.name.name === "data-mango-src") return;
          }
          var loc = p.node.loc;
          if (!loc) return;
          var f = (state.file && state.file.opts && state.file.opts.filename) || "";
          var root = (state.file && state.file.opts && state.file.opts.root) || "";
          if (root && f.indexOf(root) === 0) f = f.slice(root.length);
          f = f.replace(/^[\\\\/]+/, "").replace(/\\\\/g, "/");
          p.node.attributes.push(
            t.jsxAttribute(t.jsxIdentifier("data-mango-src"), t.stringLiteral(f + ":" + loc.start.line))
          );
        }
      }
    };
  };
}`;

// La forme `react()` du template/des projets → `react({ babel:{ plugins:[…] }})`
// avec le plugin gardé hors production.
const REACT_WITH_PLUGIN =
  "react({ babel: { plugins: process.env.NODE_ENV === \"production\" ? [] : [mangoClickSource()] } })";

/** Pose le tampon de source dans la config Vite du projet (idempotent, comme
 * ensureErrorRelay). Ne touche QUE la forme `react()` connue de nos projets —
 * si la config a été personnalisée (react déjà paramétré), on s'abstient pour
 * ne rien casser. Sans effet en production (le plugin se neutralise via NODE_ENV). */
export function ensureClickSourcePlugin(dir: string): void {
  const file = path.join(dir, "vite.config.js");
  if (!fs.existsSync(file)) return;
  let cfg = fs.readFileSync(file, "utf8");
  if (cfg.includes("mangoClickSource")) return; // déjà posé
  if (!/\breact\(\)/.test(cfg)) return; // forme inattendue → on ne touche pas
  cfg = cfg.replace(/\breact\(\)/, REACT_WITH_PLUGIN);
  // Insère la fabrique du plugin avant `export default`.
  cfg = cfg.includes("export default")
    ? cfg.replace("export default", `${PLUGIN_FACTORY}\n\nexport default`)
    : `${PLUGIN_FACTORY}\n\n${cfg}`;
  fs.writeFileSync(file, cfg);
}

export interface SourceRef {
  file: string; // chemin relatif au projet (ex. "src/App.jsx")
  line: number;
}

/** Parse un data-mango-src "src/App.jsx:42" → { file, line }. */
export function parseSrcRef(src: string): SourceRef | null {
  const m = /^(.*):(\d+)$/.exec((src ?? "").trim());
  if (!m) return null;
  const line = Number(m[2]);
  if (!m[1] || !Number.isFinite(line) || line < 1) return null;
  return { file: m[1].replace(/\\/g, "/"), line };
}

export interface SourceSnippet extends SourceRef {
  snippet: string; // quelques lignes autour de la cible, numérotées
  content: string; // contenu intégral du fichier (pour un <edit> exact via la Coque Rigide)
}

/** Cible d'une édition visuelle (#6) : ce que le clic en mode inspection a remonté. */
export interface EditTarget {
  src: string; // "src/App.jsx:96"
  tag?: string;
  text?: string;
}

/** Construit le prompt d'ÉDITION VISUELLE CIBLÉE (#6) : à partir du clic, on
 * donne à l'agent le fichier:ligne EXACT + l'extrait, et on impose un edit
 * CHIRURGICAL de cet élément. Marche pour Claude (runAgent) comme pour l'Élève
 * (runRelay : le chemin cité déclenche l'injection du contenu, piste n°1).
 * Renvoie null si la cible est invalide (on retombe alors sur un tour normal). */
export function buildVisualEditPrompt(
  projectDir: string,
  target: EditTarget,
  userText: string,
): { prompt: string; file: string; line: number } | null {
  const snip = readSourceSnippet(projectDir, target.src);
  if ("error" in snip) return null;
  const label = target.text ? `« ${target.text} »` : target.tag ? `<${target.tag}>` : "l'élément";
  const prompt = [
    "[ÉDITION VISUELLE CIBLÉE]",
    `L'utilisateur a cliqué un élément ${target.tag ? `<${target.tag}> ` : ""}${label} dans l'aperçu live.`,
    `Code source EXACT de cet élément : ${snip.file}, ligne ${snip.line}.`,
    "",
    "Extrait (→ marque la ligne cliquée) :",
    snip.snippet,
    "",
    `Consigne IMPÉRATIVE : applique un EDIT CHIRURGICAL de CET élément (autour de la ligne ${snip.line}) — modifie le strict nécessaire, ne réécris pas tout le fichier, ne touche pas au reste. Le contenu complet de ${snip.file} t'est accessible.`,
    "",
    "Demande de l'utilisateur :",
    userText,
  ].join("\n");
  return { prompt, file: snip.file, line: snip.line };
}

/** Lit le code pointé par un data-mango-src : l'extrait autour de la ligne
 * (pour montrer/raisonner) + le contenu intégral (pour un <edit> exact). */
export function readSourceSnippet(
  projectDir: string,
  src: string,
  ctx = 6,
): SourceSnippet | { error: string } {
  const ref = parseSrcRef(src);
  if (!ref) return { error: `référence de source invalide : ${src}` };
  // Défense en profondeur : on reste dans le projet.
  const abs = path.resolve(projectDir, ref.file);
  const rel = path.relative(projectDir, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return { error: "chemin hors projet" };
  let content: string;
  try {
    content = fs.readFileSync(abs, "utf8");
  } catch {
    return { error: `fichier introuvable : ${ref.file}` };
  }
  const lines = content.split(/\r?\n/);
  const from = Math.max(1, ref.line - ctx);
  const to = Math.min(lines.length, ref.line + ctx);
  const snippet = lines
    .slice(from - 1, to)
    .map((l, i) => {
      const n = from + i;
      return `${n === ref.line ? "→" : " "} ${String(n).padStart(4)} | ${l}`;
    })
    .join("\n");
  return { ...ref, snippet, content };
}
