import { useState, useEffect, useRef } from 'react'
import { X, Sliders, Type, Palette, MousePointer2, BookOpen } from 'lucide-react'

function getIframeDoc() {
  try { return document.querySelector('iframe')?.contentDocument ?? null }
  catch { return null }
}

function injectStyle(id, css) {
  const doc = getIframeDoc()
  if (!doc) return
  let el = doc.getElementById('mango-panel-' + id)
  if (!el) { el = doc.createElement('style'); el.id = 'mango-panel-' + id; doc.head.appendChild(el) }
  el.textContent = css
}

function removeStyle(id) {
  const doc = getIframeDoc()
  if (!doc) return
  const el = doc.getElementById('mango-panel-' + id)
  if (el) el.remove()
}

const TABS = [
  { id: 'typo', label: 'Typo', icon: Type },
  { id: 'couleurs', label: 'Couleurs', icon: Palette },
  { id: 'elements', label: 'Éléments', icon: MousePointer2 },
  { id: 'skills', label: 'Skills', icon: BookOpen },
]

const FONT_FAMILIES = [
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' },
]

const PALETTES = [
  { label: 'Mango', primary: '#FF6B2B', bg: '#1a0a00', text: '#fff8f3' },
  { label: 'Ocean', primary: '#0066cc', bg: '#001a33', text: '#e6f0ff' },
  { label: 'Forest', primary: '#2d8a4e', bg: '#0a1a0e', text: '#e8f5ed' },
  { label: 'Midnight', primary: '#7c3aed', bg: '#0c0a1a', text: '#ede9f8' },
]

export default function SidePanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('typo')

  // Typo state
  const [fontSize, setFontSize] = useState(16)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0].value)

  // Couleurs state
  const [colorPrimary, setColorPrimary] = useState('#6c47ff')
  const [colorBg, setColorBg] = useState('#0e0e11')
  const [colorText, setColorText] = useState('#f0f0f4')

  // Éléments state
  const [inspectActive, setInspectActive] = useState(false)
  const [inspectError, setInspectError] = useState(null)
  const [recentElements, setRecentElements] = useState([])
  const [hoveredInfo, setHoveredInfo] = useState(null)
  const cleanupRef = useRef(null)

  // Skills state
  const [skills, setSkills] = useState([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillsError, setSkillsError] = useState(null)
  const [skillName, setSkillName] = useState('')
  const [skillDescription, setSkillDescription] = useState('')
  const [skillContent, setSkillContent] = useState('')
  const [skillCreateError, setSkillCreateError] = useState(null)
  const [skillCreating, setSkillCreating] = useState(false)

  function loadSkills() {
    setSkillsLoading(true)
    setSkillsError(null)
    fetch('http://localhost:3000/api/skills')
      .then(r => r.json())
      .then(data => {
        setSkills(data.skills ?? [])
        setSkillsLoading(false)
      })
      .catch(err => {
        setSkillsError(err.message)
        setSkillsLoading(false)
      })
  }

  useEffect(() => {
    if (activeTab === 'skills') loadSkills()
  }, [activeTab])

  async function createSkill() {
    setSkillCreateError(null)
    if (!skillName.trim() || !skillContent.trim()) {
      setSkillCreateError('Le nom et le contenu sont obligatoires.')
      return
    }
    setSkillCreating(true)
    try {
      const res = await fetch('http://localhost:3000/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName.trim(), description: skillDescription.trim(), content: skillContent.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSkillCreateError(data.error ?? 'Erreur inconnue')
      } else {
        setSkillName('')
        setSkillDescription('')
        setSkillContent('')
        loadSkills()
      }
    } catch (err) {
      setSkillCreateError(err.message)
    } finally {
      setSkillCreating(false)
    }
  }

  async function deleteSkill(name) {
    try {
      await fetch(`http://localhost:3000/api/skills/${encodeURIComponent(name)}`, { method: 'DELETE' })
      loadSkills()
    } catch {
      // silently ignore
    }
  }

  // --- Typo handlers ---
  useEffect(() => {
    injectStyle('font-size', `html { font-size: ${fontSize}px }`)
  }, [fontSize])

  useEffect(() => {
    injectStyle('font-family', `body { font-family: ${fontFamily} }`)
  }, [fontFamily])

  function resetTypo() {
    removeStyle('font-size')
    removeStyle('font-family')
    setFontSize(16)
    setFontFamily(FONT_FAMILIES[0].value)
  }

  // --- Couleurs handlers ---
  useEffect(() => {
    injectStyle('colors', `:root { --color-primary: ${colorPrimary}; --bg: ${colorBg}; --ink: ${colorText} }`)
  }, [colorPrimary, colorBg, colorText])

  function applyPalette(p) {
    setColorPrimary(p.primary)
    setColorBg(p.bg)
    setColorText(p.text)
  }

  function resetColors() {
    removeStyle('colors')
    setColorPrimary('#6c47ff')
    setColorBg('#0e0e11')
    setColorText('#f0f0f4')
  }

  // --- Éléments handlers ---
  function startInspect() {
    setInspectError(null)
    const doc = getIframeDoc()
    if (!doc) {
      setInspectError("L'aperçu est sur un port différent — inspection limitée en cross-origin")
      return
    }

    let lastEl = null

    function onMouseOver(e) {
      if (lastEl) lastEl.style.outline = ''
      lastEl = e.target
      lastEl.style.outline = '2px solid orange'
      const tag = lastEl.tagName.toLowerCase()
      const cls = lastEl.classList[0] ?? ''
      setHoveredInfo(`<${tag}> ${cls}`)
      setRecentElements(prev => {
        const entry = `<${tag}>${cls ? ' .' + cls : ''}`
        const next = [entry, ...prev.filter(x => x !== entry)].slice(0, 5)
        return next
      })
    }

    function onMouseOut(e) {
      if (e.target.style) e.target.style.outline = ''
    }

    doc.addEventListener('mouseover', onMouseOver)
    doc.addEventListener('mouseout', onMouseOut)

    cleanupRef.current = () => {
      doc.removeEventListener('mouseover', onMouseOver)
      doc.removeEventListener('mouseout', onMouseOut)
      if (lastEl) lastEl.style.outline = ''
      setHoveredInfo(null)
    }
  }

  function stopInspect() {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
  }

  function toggleInspect() {
    if (inspectActive) {
      stopInspect()
      setInspectActive(false)
    } else {
      setInspectActive(true)
      startInspect()
    }
  }

  // Stop inspect when panel closes
  useEffect(() => {
    if (!isOpen) {
      stopInspect()
      setInspectActive(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        width: 288,
        top: '50%',
        transform: 'translateY(-50%)',
        right: 0,
        zIndex: 50,
      }}
      className="bg-panel shadow-2xl rounded-l-2xl border-l border-edge"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <span className="text-sm font-semibold text-ink flex items-center gap-2">
          <Sliders size={14} className="text-accent" />
          Éditeur visuel
        </span>
        <button
          onClick={onClose}
          className="text-dim hover:text-ink transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-colors ${
              activeTab === id
                ? 'bg-accent/15 text-accent'
                : 'text-dim hover:text-ink'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 space-y-4">

        {/* ─── Typo ─── */}
        {activeTab === 'typo' && (
          <>
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs text-dim">Taille de police</label>
                <span className="text-xs text-accent font-mono">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full accent-[var(--color-accent,#6c47ff)]"
              />
            </div>

            <div>
              <label className="text-xs text-dim block mb-1">Famille</label>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="w-full text-xs bg-bg border border-edge rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:border-accent"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={resetTypo}
              className="w-full text-xs py-1.5 rounded-lg border border-edge text-dim hover:text-ink hover:border-edge-soft transition-colors"
            >
              Réinitialiser
            </button>
          </>
        )}

        {/* ─── Couleurs ─── */}
        {activeTab === 'couleurs' && (
          <>
            {[
              { label: 'Couleur principale', value: colorPrimary, onChange: setColorPrimary },
              { label: 'Arrière-plan', value: colorBg, onChange: setColorBg },
              { label: 'Texte', value: colorText, onChange: setColorText },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="flex items-center justify-between">
                <label className="text-xs text-dim">{label}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-faint">{value}</span>
                  <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-edge bg-transparent"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="text-xs text-dim block mb-2">Palettes</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PALETTES.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPalette(p)}
                    className="text-xs py-1.5 px-2 rounded-lg border border-edge hover:border-accent transition-colors text-dim hover:text-ink"
                    style={{ borderLeftColor: p.primary, borderLeftWidth: 3 }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={resetColors}
              className="w-full text-xs py-1.5 rounded-lg border border-edge text-dim hover:text-ink hover:border-edge-soft transition-colors"
            >
              Réinitialiser
            </button>
          </>
        )}

        {/* ─── Éléments ─── */}
        {activeTab === 'elements' && (
          <>
            <button
              onClick={toggleInspect}
              className={`w-full text-xs py-2 rounded-lg border font-medium transition-colors ${
                inspectActive
                  ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                  : 'border-edge text-dim hover:text-ink'
              }`}
            >
              {inspectActive ? '🔍 Inspection active' : 'Activer l\'inspection'}
            </button>

            {inspectError && (
              <p className="text-xs text-err bg-err/10 border border-err/30 rounded-lg px-3 py-2 leading-relaxed">
                {inspectError}
              </p>
            )}

            {inspectActive && hoveredInfo && !inspectError && (
              <div className="text-xs bg-bg border border-edge rounded-lg px-3 py-2 font-mono text-accent">
                {hoveredInfo}
              </div>
            )}

            {recentElements.length > 0 && (
              <div>
                <label className="text-xs text-dim block mb-2">Éléments récents</label>
                <ul className="space-y-1">
                  {recentElements.map((el, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-xs bg-accent/10 text-accent-soft font-mono px-2 py-0.5 rounded">
                        {el}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!inspectActive && recentElements.length === 0 && !inspectError && (
              <p className="text-xs text-faint text-center py-2">
                Activez l'inspection puis survolez l'aperçu
              </p>
            )}
          </>
        )}
        {/* ─── Skills ─── */}
        {activeTab === 'skills' && (
          <>
            {/* Liste des skills */}
            {skillsLoading && (
              <p className="text-xs text-faint text-center py-2">Chargement…</p>
            )}
            {skillsError && (
              <p className="text-xs text-err bg-err/10 border border-err/30 rounded-lg px-3 py-2 leading-relaxed">
                {skillsError}
              </p>
            )}
            {!skillsLoading && !skillsError && skills.length === 0 && (
              <p className="text-xs text-faint text-center py-2">
                Aucun skill — crée le premier ci-dessous
              </p>
            )}
            {!skillsLoading && skills.length > 0 && (
              <ul className="space-y-1.5">
                {skills.map(skill => (
                  <li
                    key={skill.name}
                    className="flex items-start justify-between gap-2 bg-bg border border-edge rounded-lg px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{skill.name}</p>
                      {skill.description && (
                        <p className="text-xs text-dim truncate">{skill.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteSkill(skill.name)}
                      className="shrink-0 text-dim hover:text-err transition-colors text-xs leading-none mt-0.5"
                      aria-label={`Supprimer ${skill.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Séparateur */}
            <div className="border-t border-edge" />

            {/* Formulaire de création */}
            <div className="space-y-2">
              <label className="text-xs text-dim block font-medium">Nouveau skill</label>
              <input
                type="text"
                placeholder="Nom (ex: formatage-json)"
                value={skillName}
                onChange={e => setSkillName(e.target.value)}
                className="w-full text-xs bg-bg border border-edge rounded-lg px-2 py-1.5 text-ink placeholder:text-faint focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Description courte"
                value={skillDescription}
                onChange={e => setSkillDescription(e.target.value)}
                className="w-full text-xs bg-bg border border-edge rounded-lg px-2 py-1.5 text-ink placeholder:text-faint focus:outline-none focus:border-accent"
              />
              <textarea
                placeholder="Contenu du skill (ex: Quand l'utilisateur demande X, fais Y…)"
                value={skillContent}
                onChange={e => setSkillContent(e.target.value)}
                rows={4}
                className="w-full text-xs bg-bg border border-edge rounded-lg px-2 py-1.5 text-ink placeholder:text-faint focus:outline-none focus:border-accent resize-none"
              />
              {skillCreateError && (
                <p className="text-xs text-err bg-err/10 border border-err/30 rounded-lg px-3 py-2 leading-relaxed">
                  {skillCreateError}
                </p>
              )}
              <button
                onClick={createSkill}
                disabled={skillCreating}
                className="w-full text-xs py-1.5 rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 transition-colors font-medium disabled:opacity-50"
              >
                {skillCreating ? 'Création…' : 'Créer'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
