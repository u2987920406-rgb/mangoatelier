import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, Loader2, ExternalLink, Satellite } from "lucide-react";

// Category display config
const CATEGORY_META = {
  "modèle": { label: "Modèles", color: "text-accent border-accent/40 bg-accent/10" },
  "api":    { label: "API",     color: "text-ok border-ok/40 bg-ok/10" },
  "outil":  { label: "Outils",  color: "text-warn border-warn/40 bg-warn/10" },
  "prix":   { label: "Prix",    color: "text-err border-err/40 bg-err/10" },
  "autre":  { label: "Autre",   color: "text-faint border-edge" },
};

const CATEGORY_ORDER = ["modèle", "api", "outil", "prix", "autre"];

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function Badge({ category }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META["autre"];
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function SourceBadge({ source }) {
  return (
    <span className="inline-flex items-center rounded border border-edge px-1.5 py-0.5 text-[10px] text-faint">
      {source}
    </span>
  );
}

function RadarItemCard({ item }) {
  return (
    <div className="rounded-lg border border-edge bg-panel/60 p-4 hover:bg-panel transition-colors">
      <div className="flex items-start gap-2 mb-1.5">
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-sm font-medium text-text hover:text-accent transition-colors line-clamp-2 flex items-start gap-1 group"
        >
          {item.title}
          <ExternalLink size={12} className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
        </a>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <Badge category={item.category} />
        <SourceBadge source={item.source} />
      </div>
      {item.summary && (
        <p className="text-xs text-text/70 mb-1.5 leading-relaxed">{item.summary}</p>
      )}
      {item.whyMango && (
        <p className="text-xs text-accent-soft leading-relaxed">
          <span className="font-medium">→ MangoAI :</span> {item.whyMango}
        </p>
      )}
    </div>
  );
}

function CategorySection({ category, items }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META["autre"];
  return (
    <section className="mb-6">
      <h2 className={`text-xs font-semibold uppercase tracking-widest mb-3 ${meta.color.split(" ")[0]}`}>
        {meta.label} <span className="text-faint font-normal normal-case tracking-normal">({items.length})</span>
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <RadarItemCard key={idx} item={item} />
        ))}
      </div>
    </section>
  );
}

// Idea #60 — Weekly AI Radar: relevance-filtered brief of the latest AI news,
// grouped by category. Backed by /api/radar (GET) and /api/radar/refresh (POST).
export default function Radar({ onBack }) {
  const [data, setData] = useState(null); // { items, generatedAt, stale }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/radar");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (err) {
      setError(err.message ?? "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetch("/api/radar/refresh", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (err) {
      setError(err.message ?? "Erreur réseau");
    } finally {
      setRefreshing(false);
    }
  }

  // Group items by category in CATEGORY_ORDER
  const grouped = {};
  if (data?.items) {
    for (const cat of CATEGORY_ORDER) {
      const catItems = data.items.filter((it) => it.category === cat);
      if (catItems.length > 0) grouped[cat] = catItems;
    }
  }
  const hasItems = Object.keys(grouped).length > 0;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-edge bg-bg/95 backdrop-blur px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded border border-edge bg-panel hover:bg-panel/80 transition-colors"
          title="Retour"
        >
          <ArrowLeft size={15} className="text-accent-soft" />
        </button>
        <Satellite size={16} className="text-accent shrink-0" />
        <h1 className="flex-1 text-sm font-semibold text-text">Radar IA</h1>

        {data?.generatedAt && !loading && (
          <span className="text-[11px] text-faint hidden sm:block">
            {data.stale && <span className="text-warn mr-1">(périmé)</span>}
            Généré le {formatDate(data.generatedAt)}
          </span>
        )}

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 rounded border border-edge bg-panel px-3 py-1.5 text-xs text-accent-soft hover:bg-panel/80 transition-colors disabled:opacity-50"
          title="Rafraîchir le radar"
        >
          {refreshing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Rafraîchir
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-faint">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-sm">Analyse des actualités IA…</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-err/40 bg-err/10 p-4 text-sm text-err">
            Erreur : {error}
          </div>
        )}

        {!loading && !error && !hasItems && (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-faint">
            <Satellite size={32} className="opacity-30" />
            <p className="text-sm font-medium">Aucune actu pertinente cette semaine</p>
            <p className="text-xs">Lance un rafraîchissement pour analyser les derniers flux RSS.</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-2 flex items-center gap-1.5 rounded border border-edge bg-panel px-3 py-1.5 text-xs text-accent-soft hover:bg-panel/80 transition-colors disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Rafraîchir maintenant
            </button>
          </div>
        )}

        {!loading && !error && hasItems && (
          <>
            <p className="text-xs text-faint mb-6">
              {data.items.length} actu{data.items.length > 1 ? "s" : ""} pertinente{data.items.length > 1 ? "s" : ""} sélectionnée{data.items.length > 1 ? "s" : ""} pour MangoAI
              {data.stale && <span className="text-warn ml-2">(cache périmé — rafraîchissez)</span>}
            </p>
            {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => (
              <CategorySection key={cat} category={cat} items={grouped[cat]} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
