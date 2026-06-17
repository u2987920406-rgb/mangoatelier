// Starter Radix UI + Vanilla Extract — Design System Entreprise
// Tokens stricts dans tokens.css.ts · Styles dans styles.css.ts
// Décris ton app dans le chat : Mango construit les composants depuis les tokens
import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import { vars } from './tokens.css.js';
import * as S from './styles.css.js';

// ── Données de démo ──────────────────────────────────────
const TEAM = [
  { id: 1, nom: 'Alice Martin',  role: 'Admin',       initials: 'AM', status: 'Actif' },
  { id: 2, nom: 'Bob Nguyen',    role: 'Développeur', initials: 'BN', status: 'Actif' },
  { id: 3, nom: 'Clara Dupont',  role: 'Designer',    initials: 'CD', status: 'Actif' },
  { id: 4, nom: 'David Leroy',   role: 'Viewer',      initials: 'DL', status: 'Inactif' },
];

const ROLES = [
  { nom: 'Admin',       perms: ['Lecture', 'Écriture', 'Suppression', 'Gestion équipe'], count: 1 },
  { nom: 'Développeur', perms: ['Lecture', 'Écriture', 'Suppression'],                   count: 1 },
  { nom: 'Designer',    perms: ['Lecture', 'Écriture'],                                  count: 1 },
  { nom: 'Viewer',      perms: ['Lecture'],                                               count: 1 },
];

const COLORS = [
  { name: 'brand',   value: vars.color.brand },
  { name: 'bg',      value: vars.color.bg },
  { name: 'surface', value: vars.color.surface },
  { name: 'border',  value: vars.color.border },
  { name: 'text',    value: vars.color.text },
  { name: 'muted',   value: vars.color.muted },
  { name: 'success', value: vars.color.success },
  { name: 'danger',  value: vars.color.danger },
];

// ── Composant : card membre ──────────────────────────────
function MemberCard({ member, onRemove }) {
  return (
    <div className={S.card}>
      <div className={S.between} style={{ marginBottom: 12 }}>
        <div className={S.row}>
          <div className={S.avatar}>{member.initials}</div>
          <div>
            <div style={{ fontWeight: vars.font.weight.medium, fontSize: vars.font.size.sm }}>
              {member.nom}
            </div>
            <div className={S.mutedText}>{member.role}</div>
          </div>
        </div>
        <span className={S.badge[member.status === 'Actif' ? 'success' : 'muted']}>
          {member.status}
        </span>
      </div>
      <Separator.Root className={S.sep} style={{ margin: `${vars.space['3']} 0` }} />
      <div className={S.between}>
        <span className={S.badge.brand}>{member.role}</span>
        <button className={S.btn.danger} onClick={() => onRemove(member.id)}>
          Retirer
        </button>
      </div>
    </div>
  );
}

// ── Dialogue : ajouter un membre ─────────────────────────
function AddMemberDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('Viewer');

  function handleAdd() {
    if (!nom.trim()) return;
    onAdd({ id: Date.now(), nom: nom.trim(), role, initials: nom.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), status: 'Actif' });
    setNom(''); setRole('Viewer'); setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className={S.btn.primary}>+ Ajouter</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={S.overlay} />
        <Dialog.Content className={S.dialogBox}>
          <Dialog.Title className={S.dialogTitle}>Ajouter un membre</Dialog.Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: vars.space['4'] }}>
            <div>
              <label className={S.label}>Nom complet</label>
              <input
                className={S.input}
                placeholder="Marie Curie"
                value={nom}
                onChange={e => setNom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <div>
              <label className={S.label}>Rôle</label>
              <select
                className={S.input}
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {ROLES.map(r => <option key={r.nom}>{r.nom}</option>)}
              </select>
            </div>
          </div>
          <div className={S.row} style={{ justifyContent: 'flex-end', marginTop: vars.space['5'], gap: vars.space['2'] }}>
            <Dialog.Close asChild>
              <button className={S.btn.ghost}>Annuler</button>
            </Dialog.Close>
            <button className={S.btn.primary} onClick={handleAdd}>Ajouter</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── App ──────────────────────────────────────────────────
export default function App() {
  const [team, setTeam] = useState(TEAM);

  return (
    <div className={S.wrap}>
      {/* En-tête */}
      <div className={S.between} style={{ marginBottom: vars.space['8'] }}>
        <div>
          <h1 className={S.pageTitle}>Design System</h1>
          <p className={S.pageSub}>Radix UI · Vanilla Extract — tokens stricts</p>
        </div>
        <span className={S.badge.brand}>Entreprise</span>
      </div>

      {/* Navigation par onglets */}
      <Tabs.Root defaultValue="team">

        <Tabs.List className={S.tabsList}>
          <Tabs.Trigger value="team"   className={S.tabTrigger}>Équipe</Tabs.Trigger>
          <Tabs.Trigger value="roles"  className={S.tabTrigger}>Rôles</Tabs.Trigger>
          <Tabs.Trigger value="tokens" className={S.tabTrigger}>Tokens</Tabs.Trigger>
        </Tabs.List>

        {/* Onglet Équipe */}
        <Tabs.Content value="team">
          <div className={S.between} style={{ marginBottom: vars.space['5'] }}>
            <p className={S.mutedText}>{team.length} membre{team.length > 1 ? 's' : ''}</p>
            <AddMemberDialog onAdd={m => setTeam(prev => [m, ...prev])} />
          </div>
          <div className={S.grid2}>
            {team.map(m => (
              <MemberCard key={m.id} member={m} onRemove={id => setTeam(prev => prev.filter(x => x.id !== id))} />
            ))}
          </div>
        </Tabs.Content>

        {/* Onglet Rôles */}
        <Tabs.Content value="roles">
          <div style={{ display: 'flex', flexDirection: 'column', gap: vars.space['3'] }}>
            {ROLES.map(r => (
              <div key={r.nom} className={S.card}>
                <div className={S.between} style={{ marginBottom: vars.space['3'] }}>
                  <div className={S.row}>
                    <span className={S.sectionTitle}>{r.nom}</span>
                    <span className={S.badge.muted}>{r.count} membre{r.count > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className={S.row} style={{ flexWrap: 'wrap' }}>
                  {r.perms.map(p => (
                    <span key={p} className={S.badge.brand}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Tabs.Content>

        {/* Onglet Tokens */}
        <Tabs.Content value="tokens">
          <div style={{ display: 'flex', flexDirection: 'column', gap: vars.space['6'] }}>
            <div>
              <h2 className={S.sectionTitle} style={{ marginBottom: vars.space['3'] }}>Couleurs</h2>
              <div className={S.swatchGrid}>
                {COLORS.map(({ name, value }) => (
                  <div key={name} className={S.swatch}>
                    <div className={S.swatchDot} style={{ background: value }} />
                    <div>
                      <div style={{ fontSize: vars.font.size.xs, fontWeight: vars.font.weight.medium }}>{name}</div>
                      <code className={S.codeToken}>{value}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator.Root className={S.sep} />
            <div>
              <h2 className={S.sectionTitle} style={{ marginBottom: vars.space['3'] }}>Boutons</h2>
              <div className={S.row} style={{ flexWrap: 'wrap', gap: vars.space['3'] }}>
                <button className={S.btn.primary}>Primary</button>
                <button className={S.btn.ghost}>Ghost</button>
                <button className={S.btn.danger}>Danger</button>
              </div>
            </div>
            <div>
              <h2 className={S.sectionTitle} style={{ marginBottom: vars.space['3'] }}>Badges</h2>
              <div className={S.row} style={{ flexWrap: 'wrap' }}>
                <span className={S.badge.brand}>Brand</span>
                <span className={S.badge.success}>Success</span>
                <span className={S.badge.muted}>Muted</span>
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
