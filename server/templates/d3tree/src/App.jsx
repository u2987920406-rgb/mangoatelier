// Starter D3-Hierarchy — Treemap (répartition proportionnelle)
// Données de démo : analyse d'un bundle web par catégorie + taille
// Survol = tooltip · Clic = zoom sur un groupe · Décris ta donnée dans le chat
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// ── Données de démo — bundle web (tailles en Ko) ─────────
const DATA = {
  name: 'Projet',
  children: [
    {
      name: 'node_modules',
      children: [
        { name: 'react-dom',    size: 130, cat: 'deps' },
        { name: 'tailwindcss',  size: 280, cat: 'deps' },
        { name: 'vite',         size: 180, cat: 'deps' },
        { name: 'react',        size: 42,  cat: 'deps' },
        { name: 'lucide-react', size: 95,  cat: 'deps' },
        { name: 'd3',           size: 310, cat: 'deps' },
        { name: '@radix-ui',    size: 88,  cat: 'deps' },
      ],
    },
    {
      name: 'src',
      children: [
        { name: 'components',  size: 45, cat: 'code' },
        { name: 'pages',       size: 32, cat: 'code' },
        { name: 'hooks',       size: 18, cat: 'code' },
        { name: 'utils',       size: 12, cat: 'code' },
        { name: 'styles',      size: 8,  cat: 'style' },
        { name: 'App.tsx',     size: 6,  cat: 'code' },
        { name: 'main.tsx',    size: 2,  cat: 'code' },
      ],
    },
    {
      name: 'dist',
      children: [
        { name: 'index.js',   size: 468, cat: 'build' },
        { name: 'vendor.js',  size: 520, cat: 'build' },
        { name: 'styles.css', size: 24,  cat: 'style' },
      ],
    },
    {
      name: 'public',
      children: [
        { name: 'images',  size: 180, cat: 'asset' },
        { name: 'fonts',   size: 85,  cat: 'asset' },
        { name: 'icons',   size: 12,  cat: 'asset' },
      ],
    },
  ],
};

// Palette par catégorie
const PALETTE = {
  deps:  '#6366f1',
  code:  '#0891b2',
  style: '#8b5cf6',
  build: '#f59e0b',
  asset: '#22c55e',
};

function formatKo(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} Mo` : `${v} Ko`;
}

export default function App() {
  const svgRef  = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [root,    setRoot]    = useState(null);   // nœud courant (zoom)
  const [allData, setAllData] = useState(null);   // hiérarchie D3

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const hierarchy = d3.hierarchy(DATA)
      .sum(d => d.size || 0)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([W, H])
      .paddingOuter(6)
      .paddingInner(2)
      .paddingTop(22)
      .round(true)(hierarchy);

    setAllData(hierarchy);
    setRoot(hierarchy);

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    function render(node) {
      svg.selectAll('*').remove();
      const leaves = node.leaves();

      // Rectangles feuilles
      svg.selectAll('rect.leaf')
        .data(leaves)
        .join('rect')
        .attr('class', 'leaf')
        .attr('x',      d => d.x0)
        .attr('y',      d => d.y0)
        .attr('width',  d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('fill',   d => PALETTE[d.data.cat] ?? '#3f3f46')
        .attr('opacity', 0.85)
        .attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mousemove', (evt, d) => {
          setTooltip({ x: evt.clientX + 14, y: evt.clientY - 32, d });
        })
        .on('mouseleave', () => setTooltip(null));

      // Labels feuilles (si assez large)
      svg.selectAll('text.leaf')
        .data(leaves.filter(d => d.x1 - d.x0 > 40 && d.y1 - d.y0 > 20))
        .join('text')
        .attr('class', 'leaf')
        .attr('x', d => d.x0 + 5)
        .attr('y', d => d.y0 + 15)
        .attr('fill', '#ffffffcc')
        .attr('font-size', d => Math.min(12, (d.x1 - d.x0) / 5))
        .attr('font-family', 'system-ui, sans-serif')
        .attr('pointer-events', 'none')
        .text(d => d.data.name)
        .each(function(d) {
          const w = d.x1 - d.x0 - 10;
          if (this.getComputedTextLength() > w) d3.select(this).text('…' + d.data.name.slice(-6));
        });

      // En-têtes groupes (nœuds internes)
      const nodes = node.descendants().filter(d => d.depth === node.depth + 1 && !d.data.size);
      svg.selectAll('rect.group')
        .data(nodes)
        .join('rect')
        .attr('class', 'group')
        .attr('x',      d => d.x0)
        .attr('y',      d => d.y0)
        .attr('width',  d => Math.max(0, d.x1 - d.x0))
        .attr('height', 22)
        .attr('fill', '#18181b')
        .attr('rx', 3)
        .style('cursor', 'pointer')
        .on('click', (_, d) => { setTooltip(null); setRoot(d); render(d); });

      svg.selectAll('text.group')
        .data(nodes)
        .join('text')
        .attr('class', 'group')
        .attr('x', d => d.x0 + 7)
        .attr('y', d => d.y0 + 15)
        .attr('fill', '#a1a1aa')
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('font-family', 'system-ui, sans-serif')
        .attr('pointer-events', 'none')
        .text(d => `${d.data.name}  ${formatKo(d.value)}`);
    }

    render(hierarchy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom sur un sous-nœud
  function zoomTo(node) {
    if (!node) return;
    d3.select(svgRef.current).selectAll('*').remove();
    setTooltip(null);
    setRoot(node);
    // Re-run treemap for the subtree
    const W = window.innerWidth, H = window.innerHeight;
    d3.treemap().size([W, H]).paddingOuter(6).paddingInner(2).paddingTop(22).round(true)(node);
    // re-trigger render via ref hack — simplest approach: reload page state
    window.location.reload();
  }

  return (
    <div style={{ background: '#09090b', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <svg ref={svgRef} style={{ display: 'block' }} />

      {/* Titre + breadcrumb */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        background: 'linear-gradient(to bottom, #09090bdd, transparent)',
        padding: '12px 16px', pointerEvents: 'none',
      }}>
        <span style={{ color: '#fafafa', fontSize: 14, fontWeight: 700, fontFamily: 'system-ui' }}>
          Bundle Analyse
        </span>
        {root && root.parent && (
          <button
            onClick={() => setRoot(root.parent)}
            style={{
              marginLeft: 12, color: '#6366f1', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13, fontFamily: 'system-ui', pointerEvents: 'all',
            }}
          >
            ← Retour
          </button>
        )}
      </div>

      {/* Légende catégories */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        {Object.entries(PALETTE).map(([k, c]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'system-ui' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ color: '#a1a1aa', fontSize: 11, textTransform: 'capitalize' }}>{k}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y, pointerEvents: 'none',
          background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8,
          padding: '8px 12px', fontFamily: 'system-ui', zIndex: 100,
        }}>
          <div style={{ color: '#fafafa', fontWeight: 600, fontSize: 13 }}>{tooltip.d.data.name}</div>
          <div style={{ color: '#a1a1aa', fontSize: 12, marginTop: 2 }}>{formatKo(tooltip.d.value)}</div>
          <div style={{ color: PALETTE[tooltip.d.data.cat] ?? '#71717a', fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>
            {tooltip.d.data.cat}
          </div>
        </div>
      )}
    </div>
  );
}
