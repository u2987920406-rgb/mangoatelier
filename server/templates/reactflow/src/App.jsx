// Starter React Flow v12 (@xyflow/react) — Éditeur de workflow n8n-like
// Nœuds draggables · Connexions · Types : Trigger / Processus / Condition / Sortie
// Décris ton pipeline dans le chat : Mango ajoute les nœuds, connexions et logique
import { useCallback, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  addEdge, Handle, Position,
  useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ── Styles partagés ──────────────────────────────────────
const node = (accent) => ({
  background: '#18181b',
  border: `1.5px solid ${accent}`,
  borderRadius: 10,
  padding: '10px 14px',
  minWidth: 160,
  fontFamily: 'system-ui, sans-serif',
  color: '#fafafa',
  boxShadow: `0 0 12px ${accent}22`,
});
const tag = (color) => ({
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 99,
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  background: `${color}22`,
  color,
  marginBottom: 5,
});
const handle = { background: '#6366f1', width: 10, height: 10, borderRadius: 5, border: '2px solid #09090b' };

// ── Types de nœuds personnalisés ─────────────────────────

function TriggerNode({ data }) {
  return (
    <div style={node('#22c55e')}>
      <div style={tag('#22c55e')}>Déclencheur</div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.icon} {data.label}</div>
      {data.desc && <div style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>{data.desc}</div>}
      <Handle type="source" position={Position.Bottom} style={handle} />
    </div>
  );
}

function ProcessNode({ data }) {
  return (
    <div style={node('#6366f1')}>
      <Handle type="target" position={Position.Top} style={handle} />
      <div style={tag('#6366f1')}>Processus</div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.icon} {data.label}</div>
      {data.desc && <div style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>{data.desc}</div>}
      <Handle type="source" position={Position.Bottom} style={handle} />
    </div>
  );
}

function ConditionNode({ data }) {
  return (
    <div style={node('#f59e0b')}>
      <Handle type="target" position={Position.Top} style={handle} />
      <div style={tag('#f59e0b')}>Condition</div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.icon} {data.label}</div>
      {data.desc && <div style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>{data.desc}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#71717a' }}>
        <span>✓ Vrai</span>
        <span>✗ Faux</span>
      </div>
      <Handle type="source" id="yes" position={Position.Bottom} style={{ ...handle, left: '30%', background: '#22c55e' }} />
      <Handle type="source" id="no"  position={Position.Bottom} style={{ ...handle, left: '70%', background: '#ef4444' }} />
    </div>
  );
}

function OutputNode({ data }) {
  return (
    <div style={node('#0891b2')}>
      <Handle type="target" position={Position.Top} style={handle} />
      <div style={tag('#0891b2')}>Sortie</div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{data.icon} {data.label}</div>
      {data.desc && <div style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>{data.desc}</div>}
    </div>
  );
}

const nodeTypes = { trigger: TriggerNode, process: ProcessNode, condition: ConditionNode, output: OutputNode };

// ── Workflow initial — pipeline IA ───────────────────────
const INIT_NODES = [
  { id: '1', type: 'trigger',   position: { x: 320, y: 40  }, data: { icon: '📨', label: 'Webhook entrant',     desc: 'POST /api/event' } },
  { id: '2', type: 'process',   position: { x: 320, y: 180 }, data: { icon: '🔍', label: 'Validation données',   desc: 'Schéma JSON + types' } },
  { id: '3', type: 'process',   position: { x: 320, y: 320 }, data: { icon: '🤖', label: 'Analyse IA',           desc: 'Claude — scoring' } },
  { id: '4', type: 'condition', position: { x: 320, y: 460 }, data: { icon: '⚖️', label: 'Score > 0.8 ?',        desc: 'Seuil de confiance' } },
  { id: '5', type: 'process',   position: { x: 120, y: 630 }, data: { icon: '✅', label: 'Approbation auto',     desc: 'Sans intervention' } },
  { id: '6', type: 'process',   position: { x: 520, y: 630 }, data: { icon: '👁️', label: 'Révision humaine',     desc: 'File d\'attente QA' } },
  { id: '7', type: 'output',    position: { x: 320, y: 790 }, data: { icon: '📤', label: 'Notification Slack',   desc: '#pipeline-results' } },
];

const INIT_EDGES = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true,  style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true,  style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', animated: true,  style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', sourceHandle: 'yes', type: 'smoothstep', style: { stroke: '#22c55e', strokeWidth: 2 } },
  { id: 'e4-6', source: '4', target: '6', sourceHandle: 'no',  type: 'smoothstep', style: { stroke: '#ef4444', strokeWidth: 2 } },
  { id: 'e5-7', source: '5', target: '7', type: 'smoothstep', style: { stroke: '#0891b2', strokeWidth: 2 } },
  { id: 'e6-7', source: '6', target: '7', type: 'smoothstep', style: { stroke: '#0891b2', strokeWidth: 2 } },
];

// ── App ──────────────────────────────────────────────────
let idCounter = INIT_NODES.length + 1;

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INIT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INIT_EDGES);

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  function addNode(type) {
    const id = String(++idCounter);
    const icons = { trigger: '⚡', process: '⚙️', condition: '❓', output: '📬' };
    const labels = { trigger: 'Nouveau déclencheur', process: 'Nouveau processus', condition: 'Nouvelle condition', output: 'Nouvelle sortie' };
    setNodes(ns => [...ns, {
      id, type,
      position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      data: { icon: icons[type], label: labels[type], desc: '' },
    }]);
  }

  const btnStyle = (color) => ({
    padding: '7px 14px', borderRadius: 7, border: `1px solid ${color}40`,
    background: `${color}18`, color, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'system-ui',
    display: 'flex', alignItems: 'center', gap: 5,
  });

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#09090b' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        colorMode="dark"
      >
        <Background color="#27272a" gap={20} />
        <Controls style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
        <MiniMap
          nodeColor={n => n.type === 'trigger' ? '#22c55e' : n.type === 'condition' ? '#f59e0b' : n.type === 'output' ? '#0891b2' : '#6366f1'}
          style={{ background: '#18181b', border: '1px solid #3f3f46' }}
        />

        {/* Toolbar */}
        <Panel position="top-left">
          <div style={{
            background: '#18181b', border: '1px solid #3f3f46',
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ color: '#71717a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Ajouter un nœud
            </span>
            <button style={btnStyle('#22c55e')} onClick={() => addNode('trigger')}>   ⚡ Déclencheur</button>
            <button style={btnStyle('#6366f1')} onClick={() => addNode('process')}>   ⚙️ Processus</button>
            <button style={btnStyle('#f59e0b')} onClick={() => addNode('condition')}> ⚖️ Condition</button>
            <button style={btnStyle('#0891b2')} onClick={() => addNode('output')}>    📬 Sortie</button>
          </div>
        </Panel>

        {/* Stats */}
        <Panel position="top-right">
          <div style={{
            background: '#18181b', border: '1px solid #3f3f46',
            borderRadius: 8, padding: '8px 12px', fontSize: 11,
            color: '#71717a', fontFamily: 'system-ui',
            display: 'flex', gap: 12,
          }}>
            <span>{nodes.length} nœuds</span>
            <span>{edges.length} connexions</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
