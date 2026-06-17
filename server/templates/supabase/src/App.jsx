// Starter Supabase — Auth + CRUD + Realtime
//
// ── SETUP (à faire UNE FOIS dans le dashboard Supabase) ──────────────────────
//
//   1. Copie .env.example → .env et remplis VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
//
//   2. Dans Supabase → SQL Editor → exécute ce SQL :
//
//      create table tasks (
//        id         uuid    default gen_random_uuid() primary key,
//        user_id    uuid    references auth.users not null,
//        title      text    not null,
//        done       boolean default false,
//        created_at timestamptz default now()
//      );
//
//      -- ⚠️ OBLIGATOIRE : sans ces lignes, toute la table est publique
//      alter table tasks enable row level security;
//      create policy "Users manage own tasks" on tasks
//        using  (auth.uid() = user_id)
//        with check (auth.uid() = user_id);
//
//   3. Storage (optionnel) :
//      create bucket "uploads" (public = false);
//      -- Policy d'upload → Supabase dashboard > Storage > Policies
//
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase.js';

const S = {
  page: {
    minHeight: '100vh', background: '#09090b', color: '#fafafa',
    fontFamily: 'system-ui, sans-serif', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  box: {
    width: '100%', maxWidth: 440,
    background: '#18181b', border: '1px solid #3f3f46',
    borderRadius: 16, padding: 32,
  },
  input: {
    width: '100%', padding: '10px 14px',
    background: '#09090b', border: '1px solid #3f3f46',
    borderRadius: 8, color: '#fafafa', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  },
  btn: (variant = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    background:
      variant === 'primary' ? '#6366f1' :
      variant === 'ghost'   ? 'transparent' : '#ef444420',
    color:
      variant === 'danger' ? '#ef4444' : '#fff',
    border: variant === 'ghost' ? '1px solid #3f3f46' : 'none',
  }),
  tag: (done) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    background: done ? '#22c55e10' : '#27272a',
    border: `1px solid ${done ? '#22c55e30' : '#3f3f46'}`,
    borderRadius: 8, marginBottom: 8,
    transition: 'all 150ms ease',
  }),
};

// ── Formulaire d'authentification ────────────────────────
function AuthForm() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setMsg(error.message);
    else if (mode === 'signup') setMsg('Vérifie ta boîte mail pour confirmer.');
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={S.box}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h1>
        <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 24 }}>
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Inscription' : 'Connexion'}
          </button>
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={S.input} type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6} />
          {msg && <p style={{ fontSize: 13, color: msg.includes('mail') ? '#22c55e' : '#ef4444' }}>{msg}</p>}
          <button style={{ ...S.btn('primary'), justifyContent: 'center', marginTop: 4 }} disabled={loading}>
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Gestionnaire de tâches (connecté) ───────────────────
function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const inputRef = useRef();

  // Chargement initial
  useEffect(() => {
    supabase.from('tasks').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setTasks(data ?? []); setLoading(false); });
  }, []);

  // Realtime — écoute les INSERT / UPDATE / DELETE sur la table tasks
  useEffect(() => {
    const channel = supabase
      .channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
        if (payload.eventType === 'INSERT') setTasks(p => [payload.new, ...p]);
        if (payload.eventType === 'UPDATE') setTasks(p => p.map(t => t.id === payload.new.id ? payload.new : t));
        if (payload.eventType === 'DELETE') setTasks(p => p.filter(t => t.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await supabase.from('tasks').insert({ title: title.trim(), user_id: user.id });
    setTitle('');
    inputRef.current?.focus();
  }

  async function toggle(task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id);
  }

  async function remove(id) {
    await supabase.from('tasks').delete().eq('id', id);
  }

  const done = tasks.filter(t => t.done).length;

  return (
    <div style={S.page}>
      <div style={{ ...S.box, maxWidth: 520 }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Mes tâches</h1>
            <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{user.email}</p>
          </div>
          <button style={S.btn('ghost')} onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </div>

        {/* Formulaire d'ajout */}
        <form onSubmit={addTask} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            ref={inputRef}
            style={{ ...S.input, flex: 1 }}
            placeholder="Nouvelle tâche…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <button style={S.btn('primary')} type="submit">Ajouter</button>
        </form>

        {/* Liste */}
        {loading ? (
          <p style={{ color: '#71717a', fontSize: 13, textAlign: 'center' }}>Chargement…</p>
        ) : tasks.length === 0 ? (
          <p style={{ color: '#71717a', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            Aucune tâche — commence ci-dessus.
          </p>
        ) : (
          <div>
            {tasks.map(task => (
              <div key={task.id} style={S.tag(task.done)}>
                <input
                  type="checkbox" checked={task.done}
                  onChange={() => toggle(task)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{
                  flex: 1, fontSize: 14,
                  textDecoration: task.done ? 'line-through' : 'none',
                  color: task.done ? '#52525b' : '#fafafa',
                  transition: 'all 150ms',
                }}>
                  {task.title}
                </span>
                <button
                  style={{ ...S.btn('danger'), padding: '4px 8px', fontSize: 12 }}
                  onClick={() => remove(task.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {tasks.length > 0 && (
          <p style={{ fontSize: 12, color: '#52525b', marginTop: 16, textAlign: 'right' }}>
            {done}/{tasks.length} complétée{done > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ── App — gestion de l'état d'auth ──────────────────────
export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return <div style={{ ...S.page, color: '#71717a', fontSize: 13 }}>Chargement…</div>;
  }

  return user ? <Tasks user={user} /> : <AuthForm />;
}
