// Starter Cytoscape.js — Mind Map / Organigramme / Arbre hiérarchique
// Layouts : Hiérarchique (dagre) · Arbre étalé (breadthfirst) · Cercle
// Clic sur un nœud = panneau détail · Décris ta carte dans le chat
import { useEffect, useRef, useState } from 'react';
import Cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

Cytoscape.use(dagre);

// ── Données de démo — carte mentale "Architecture Web" ───
const ELEMENTS = [
  // Racine
  { data: { id: 'root',    label: 'Architecture\nWeb',   lvl: 0, color: '#6366f1' } },
  // Niveau 1
  { data: { id: 'fe',      label: 'Frontend',             lvl: 1, color: '#0891b2' } },
  { data: { id: 'be',      label: 'Backend',              lvl: 1, color: '#0891b2' } },
  { data: { id: 'db',      label: 'Base de données',      lvl: 1, color: '#0891b2' } },
  { data: { id: 'infra',   label: 'Infrastructure',       lvl: 1, color: '#0891b2' } },
  // Niveau 2 — Frontend
  { data: { id: 'react',   label: 'React',                lvl: 2, color: '#27272a' } },
  { data: { id: 'tailwind',label: 'Tailwind',             lvl: 2, color: '#27272a' } },
  { data: { id: 'vite',    label: 'Vite',                 lvl: 2, color: '#27272a' } },
  // Niveau 2 — Backend
  { data: { id: 'express', label: 'Express',              lvl: 2, color: '#27272a' } },
  { data: { id: 'supabase',label: 'Supabase',             lvl: 2, color: '#27272a' } },
  // Niveau 2 — DB
  { data: { id: 'postgres',label: 'PostgreSQL',           lvl: 2, color: '#27272a' } },
  { data: { id: 'redis',   label: 'Redis',                lvl: 2, color: '#27272a' } },
  // Niveau 2 — Infra
  { data: { id: 'docker',  label: 'Docker',               lvl: 2, color: '#27272a' } },
  { data: { id: 'vercel',  label: 'Vercel',               lvl: 2, color: '#27272a' } },
  // Arêtes
  { data: { source: 'root',    target: 'fe' } },
  { data: { source: 'root',    target: 'be' } },
  { data: { source: 'root',    target: 'db' } },
  { data: { source: 'root',    target: 'infra' } },
  { data: { source: 'fe',      target: 'react' } },
  { data: { source: 'fe',      target: 'tailwind' } },
  { data: { source: 'fe',      target: 'vite' } },
  { data: { source: 'be',      target: 'express' } },
  { data: { source: 'be',      target: 'supabase' } },
  { data: { source: 'db',      target: 'postgres' } },
  { data: { source: 'db',      target: 'redis' } },
  { data: { source: 'infra',   target: 'docker' } },
  { data: { source: 'infra',   target: 'vercel' } },
];

const CY_STYLE = [
  {
    selector: 'node[lvl = 0]',
    style: { 'background-color': '#6366f1', width: 150, height: 52, 'font-size': 15, 'font-weight': 700 },
  },
  {
    selector: 'node[lvl = 1]',
    style: { 'background-color': '#0891b2', width: 130, height: 42, 'font-size': 13, 'font-weight': 600 },
  },
  {
    selector: 'node[lvl = 2]',
    style: {
      'background-color': '#27272a', width: 108, height: 36, 'font-size': 12,
      'border-width': 1, 'border-color': '#6366f155',
    },
  },
  {
    selector: 'node',
    style: {
      label: 'data(label)', color: '#fafafa',
      'text-valign': 'center', 'text-halign': 'center',
      shape: 'round-rectangle', 'text-wrap': 'wrap', 'text-max-width': 110,
      'transition-property': 'background-color, border-color',
      'transition-duration': '150ms',
    },
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#3f3f46', width: 1.5,
      'target-arrow-color': '#6366f1',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier', opacity: 0.6,
    },
  },
  {
    selector: ':selected',
    style: {
      'background-color': '#f59e0b', 'border-color': '#fbbf24',
      'border-width': 2, 'line-color': '#fbbf24',
      'target-arrow-color': '#fbbf24',
    },
  },
];

const LAYOUTS = {
  dagre:       { name: 'dagre', rankDir: 'TB', nodeSep: 40, rankSep: 70, padding: 50, animate: true, animationDuration: 400 },
  breadthfirst:{ name: 'breadthfirst', directed: true, spacingFactor: 1.6, padding: 50, animate: true, animationDuration: 400 },
  circle:      { name: 'circle', spacingFactor: 1.4, padding: 50, animate: true, animationDuration: 400 },
};

export default function App() {
  const containerRef = useRef(null);
  const cyRef        = useRef(null);
  const [activeLayout, setActiveLayout] = useState('dagre');
  const [selected,     setSelected]     = useState(null);

  useEffect(() => {
    const cy = Cytoscape({
      container: containerRef.current,
      elements: ELEMENTS,
      style: CY_STYLE,
      layout: LAYOUTS.dagre,
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });
    cy.on('tap', 'node', e => setSelected(e.target.data()));
    cy.on('tap', evt => { if (evt.target === cy) setSelected(null); });
    cyRef.current = cy;
    return () => cy.destroy();
  }, []);

  function switchLayout(key) {
    setActiveLayout(key);
    cyRef.current?.layout(LAYOUTS[key]).run();
  }

  const btnStyle = (active) => ({
    padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#6366f1' : '#27272a',
    color: '#fafafa',
    transition: 'background 120ms',
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#09090b', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Toolbar layouts */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: '#18181b', border: '1px solid #3f3f46',
        borderRadius: 10, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#71717a', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Layout</span>
        <button style={btnStyle(activeLayout === 'dagre')}        onClick={() => switchLayout('dagre')}>        Hiérarchique</button>
        <button style={btnStyle(activeLayout === 'breadthfirst')} onClick={() => switchLayout('breadthfirst')}>Arbre</button>
        <button style={btnStyle(activeLayout === 'circle')}       onClick={() => switchLayout('circle')}>       Cercle</button>
      </div>

      {/* Panneau nœud sélectionné */}
      {selected && (
        <div style={{
          position: 'absolute', top: 16, right: 16, minWidth: 190,
          background: '#18181b', border: '1px solid #3f3f46',
          borderRadius: 10, padding: '14px 18px',
        }}>
          <p style={{ color: '#71717a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Nœud sélectionné
          </p>
          <p style={{ color: '#fafafa', fontWeight: 600, fontSize: 15 }}>{selected.label?.replace('\n', ' ')}</p>
          <p style={{ color: '#6366f1', fontSize: 12, marginTop: 4 }}>
            {selected.lvl === 0 ? 'Racine' : `Niveau ${selected.lvl}`}
          </p>
          <button
            onClick={() => setSelected(null)}
            style={{ marginTop: 10, color: '#52525b', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Fermer ×
          </button>
        </div>
      )}

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        color: '#52525b', fontSize: 11,
      }}>
        Scroll = zoom · Glisser = déplacer · Clic nœud = détail
      </div>
    </div>
  );
}
