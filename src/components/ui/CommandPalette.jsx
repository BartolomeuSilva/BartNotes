import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Plus, Moon, Sun, Sparkles, Settings, ListTodo, Archive, Trash2 } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { useNotesStore } from '../../store/notesStore'

export default function CommandPalette() {
  const navigate = useNavigate()
  const { isCommandPaletteOpen, setCommandPaletteOpen, toggleTheme, theme, setChatOpen, setEditorOpen } = useUiStore()
  const { notes, createNote } = useNotesStore()
  
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Ouve Ctrl+K / Cmd+K globalmente
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!isCommandPaletteOpen)
      }
    }
    
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isCommandPaletteOpen, setCommandPaletteOpen])

  // Foca no input quando abre
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  // Ações globais
  const globalCommands = useMemo(() => [
    { id: 'new-note', title: 'Criar Nova Nota', icon: Plus, action: async () => {
        const note = await createNote()
        navigate(`/note/${note.id}`)
    }},
    { id: 'chat-ai', title: 'Segundo Cérebro (Chat com IA)', icon: Sparkles, action: () => setChatOpen(true) },
    { id: 'tasks', title: 'Dashboard de Tarefas', icon: ListTodo, action: () => { setEditorOpen(true); navigate('/tasks') } },
    { id: 'theme', title: `Mudar para Tema ${theme === 'dark' ? 'Claro' : 'Escuro'}`, icon: theme === 'dark' ? Sun : Moon, action: () => toggleTheme() },
    { id: 'settings', title: 'Configurações', icon: Settings, action: () => navigate('/settings') },
    { id: 'archive', title: 'Ver Arquivo', icon: Archive, action: () => navigate('/archived') },
    { id: 'trash', title: 'Ver Lixeira', icon: Trash2, action: () => navigate('/trash') },
  ], [theme, createNote, navigate, setChatOpen, toggleTheme, setEditorOpen])

  // Constrói resultados da pesquisa combinando comandos e notas do banco
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase()
    
    // Command filter
    const cmds = globalCommands.filter(c => c.title.toLowerCase().includes(q))
    
    // Notes filter
    const activeNotes = notes.filter(n => !n.isDeleted && !n.isArchived)
    const matchedNotes = activeNotes
      .filter(n => (n.title || 'Sem título').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
      .map(n => ({
        id: `note-${n.id}`,
        title: n.title || 'Sem título',
        subtitle: 'Viajar para a nota',
        icon: FileText,
        action: () => navigate(`/note/${n.id}`)
      }))
    
    return [...cmds, ...matchedNotes]
  }, [query, globalCommands, notes, navigate])

  // Scroll visibility
  useEffect(() => {
    const listEl = listRef.current
    if (listEl) {
      const activeEl = listEl.children[selectedIndex]
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Listener do input do Spotlight
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setCommandPaletteOpen(false)
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev))
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
    }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredItems[selectedIndex]
      if (item) {
        item.action()
        setCommandPaletteOpen(false)
      }
    }
  }

  if (!isCommandPaletteOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '10vh', background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
    }}
    onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        style={{
          width: '100%', maxWidth: 640,
          background: 'var(--bg-primary)',
          borderRadius: 16, border: '1px solid var(--border)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          overflow: 'hidden', animation: 'slideDown 0.15s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={22} color="var(--text-muted)" />
          <input 
            ref={inputRef}
            className="input"
            style={{ width: '100%', height: 64, border: 'none', background: 'transparent', fontSize: 18, boxShadow: 'none' }}
            placeholder="O que você precisa?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
          />
          <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            <span style={{ padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: 4 }}>ESC</span>
          </div>
        </div>

        <div ref={listRef} style={{ maxHeight: 350, overflowY: 'auto', padding: '8px 0' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Nenhum comando ou nota encontrada</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon
              const isSelected = selectedIndex === index
              return (
                <div 
                  key={item.id}
                  onClick={() => { item.action(); setCommandPaletteOpen(false); }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 20px', cursor: 'pointer',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-primary)',
                    transition: 'none'
                  }}
                >
                  <Icon size={18} color={isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 15, fontWeight: isSelected ? 600 : 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: 12, color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 2 }}>{item.subtitle}</div>
                    )}
                  </div>
                  {isSelected && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>ENTER</span>}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
