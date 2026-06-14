import { BarChart3, BrainCircuit, MousePointerClick, Rocket, Sparkles, Wand2 } from "lucide-react";

// In-app user guide (idea 5): what MangoAI can do, and WHEN to use each thing.
// Static content rendered in a header dropdown (like Mémoire/Métriques) — no
// backend, no dependency. The reference newcomers (and Phase B beta-testers)
// read to get productive fast.
const GROUPS = [
  {
    icon: Sparkles,
    title: "Démarrer",
    items: [
      ["Créer un projet", "Sur l'accueil, donne un nom + décris ce que tu veux. MangoAI échafaude un projet React/Vite et construit au fil du chat."],
      ["Discuter pour itérer", "Chaque message = une itération. Demande une section, un changement, une correction — l'aperçu se met à jour en direct."],
      ["Pièce jointe 📎", "Glisse une image (maquette, capture) ou un PDF : MangoAI la lit et reproduit la structure/palette, ou en extrait l'info."],
    ],
  },
  {
    icon: BrainCircuit,
    title: "Choisir le cerveau & le mode",
    items: [
      ["Modèle", "Haiku = rapide/simple · Sonnet = équilibré (défaut) · Opus = puissant/cher · 🎓 Élève local = gratuit (Qwen), Claude en secours."],
      ["Mode ⚡ MVP / 💎 Élite", "MVP = droit au but, rapide, économe. Élite = analyse, plan, vérif visuelle, tests auto, recherche web. Bascule selon l'enjeu."],
    ],
  },
  {
    icon: MousePointerClick,
    title: "Travailler le visuel",
    items: [
      ["Snap 📸", "Bouton de capture dans le chat : entoure une zone de l'aperçu (un bug, un détail) → MangoAI la voit et agit dessus."],
      ["Inspecter ⌖", "Active l'inspecteur puis clique un élément de l'aperçu : le composer se pré-remplit avec la source exacte pour une édition chirurgicale."],
      ["Cloner un site 🌐", "Colle l'URL d'un site live + demande de le reproduire : MangoAI le capture (screenshot) et recrée son design en code. Aucun compte externe."],
      ["Figma", "Colle un lien figma.com d'une frame : MangoAI lit le design (image + palette/typo) et génère le React correspondant. (Token Figma requis, optionnel.)"],
    ],
  },
  {
    icon: Wand2,
    title: "Itérer en sécurité",
    items: [
      ["Versions / rollback", "Chaque tour est versionné automatiquement. Le menu Versions permet de revenir à n'importe quel état en un clic."],
      ["Mémoire 🧠", "Ce que MangoAI a appris du projet (conventions, design) et tes préférences. S'enrichit tout seul après chaque tour réussi."],
    ],
  },
  {
    icon: Rocket,
    title: "Livrer",
    items: [
      ["Publier 🚀", "Met le site en ligne en 1 clic : choisis Cloudflare, Vercel ou Netlify (connexion CLI unique la 1ʳᵉ fois)."],
      ["GitHub", "Pousse le projet vers un dépôt privé GitHub (création auto). (Token GitHub requis.)"],
      ["Exporter", "Télécharge tout le code source en .zip (sans les secrets ni node_modules)."],
    ],
  },
  {
    icon: BarChart3,
    title: "Suivre",
    items: [
      ["Métriques 📊", "Coût, tours, taux d'erreur, tendance par semaine, drivers de coût par type, et l'émancipation de l'Élève local."],
    ],
  },
];

export default function Guide() {
  return (
    <div className="space-y-3 px-2 py-2">
      <p className="px-1 text-[11px] leading-relaxed text-dim">
        MangoAI construit ton app au fil de la conversation. Voici tout ce que tu peux
        faire — et <em>quand</em> t'en servir.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            <g.icon size={13} className="text-accent-soft" />
            {g.title}
          </h3>
          <ul className="space-y-1.5">
            {g.items.map(([label, desc]) => (
              <li key={label} className="rounded-lg border border-edge bg-bg px-2.5 py-1.5">
                <div className="text-[12px] font-medium text-ink">{label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-dim">{desc}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="px-1 text-[10px] leading-snug text-faint">
        Astuce : commence en MVP pour dégrossir vite, passe en Élite pour soigner. Tu
        peux tout annuler via Versions — n'hésite pas à expérimenter.
      </p>
    </div>
  );
}
