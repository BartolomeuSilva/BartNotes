import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FileText, Tag, Archive, Trash2, Search, Moon, Sun,
  Plus, Settings, X, ChevronDown, ChevronRight, LogOut, Download, Globe, Sparkles, ListTodo, Network, BookOpen, Calendar
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTagsStore } from '../../store/tagsStore'
import { useNotesStore } from '../../store/notesStore'
import { useUiStore } from '../../store/uiStore'
import { useClipperStore } from '../../store/clipperStore'
import { useInstallPwa } from '../../hooks/useInstallPwa'
import { TAG_COLORS } from '../../lib/utils'
import logoImg from '../../img/Bart Notes Logo.png'

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { tags } = useTagsStore()
  const { notes, filter, activeTagId, setFilter, setActiveTag, createNote, updateNote } = useNotesStore()
  const { theme, toggleTheme, toast, setChatOpen, setEditorOpen } = useUiStore()
  const { setOpen } = useClipperStore()
  const [tagsOpen, setTagsOpen] = useState(true)
  const { isInstallable, promptInstall } = useInstallPwa()

  const nav = (path, filterVal, tagId = null) => {
    if (filterVal) setFilter(filterVal)
    if (tagId) setActiveTag(tagId)
    
    // Abre o painel full-screen no mobile
    if (path === '/tasks' || path === '/graph' || path === '/manual' || path.includes('/note/')) {
      setEditorOpen(true)
    } else {
      // Volta pra lista de notas
      setEditorOpen(false)
    }
    
    navigate(path)
    onClose?.()
  }

  const handleNewNote = async () => {
    const note = await createNote()
    onClose?.()
    navigate(`/note/${note.id}`)
  }

  const handleDailyNote = async () => {
    const today = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-') // YYYY-MM-DD
    const displayDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    
    const existing = notes.find(n => !n.isDeleted && (n.title === today || n.title === displayDate))
    
    if (existing) {
      onClose?.()
      navigate(`/note/${existing.id}`)
    } else {
      const note = await createNote()
      await updateNote(note.id, { content: `# ${displayDate}\n\n` })
      onClose?.()
      navigate(`/note/${note.id}`)
    }
  }

  const actionItem = (label, icon, onClickAction, isAccent = false) => (
    <button
      key={label}
      onClick={onClickAction}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', borderRadius: 6, width: '100%',
        background: 'transparent',
        color: isAccent ? 'var(--accent)' : 'var(--text-secondary)',
        border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
        fontWeight: 400, textAlign: 'left',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = isAccent ? 'var(--accent)' : 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isAccent ? 'var(--accent)' : 'var(--text-secondary)' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )

  const navItem = (label, icon, path, filterVal, tagId = null) => {
    const isActive = filterVal ? filter === filterVal && !activeTagId
      : tagId ? activeTagId === tagId
        : location.pathname === path

    return (
      <button
        key={label}
        onClick={() => nav(path, filterVal, tagId)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 6, width: '100%',
          background: isActive ? 'var(--bg-tertiary)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
          fontWeight: isActive ? 500 : 400, textAlign: 'left',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
      >
        {icon}
        <span>{label}</span>
        {isActive && filterVal === 'all' && (
          <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
        )}
      </button>
    )
  }

  return (
    <nav className="sidebar-content" style={{ height: '100%' }}>
      {/* Logo */}
      <div style={{ height: 52, padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={logoImg} alt="BartNotes" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover' }} />
          <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            BartNotes
          </span>
        </div>
        {onClose && (
          <button className="btn btn-ghost sidebar-close-btn" style={{ padding: 4 }} onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div style={{ padding: '12px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {actionItem('Nova Nota', <Plus size={14} />, handleNewNote)}
        {actionItem('Nota de Hoje', <Calendar size={14} />, handleDailyNote)}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 0' }} />
        {navItem('Todas as Notas', <FileText size={14} />, '/', 'all')}
        {navItem('Arquivadas', <Archive size={14} />, '/archived', 'archived')}
        {navItem('Fixadas', <span style={{ fontSize: 12 }}>📌</span>, '/?filter=pinned', 'pinned')}
        {actionItem('Capturar URL', <Globe size={14} />, () => setOpen(true))}
        {actionItem('Segundo Cérebro', <Sparkles size={14} />, () => { setChatOpen(true); onClose?.() }, true)}
        {navItem('Mapa Mental', <Network size={14} />, '/graph')}
        {navItem('Tarefas', <ListTodo size={14} />, '/tasks')}
        {navItem('Lixeira', <Trash2 size={14} />, '/trash', 'deleted')}

        {isInstallable && (
          <button 
            className="nav-item"
            style={{ 
              marginTop: 16, background: 'var(--accent)', color: 'white',
              fontWeight: 600, justifyContent: 'center', borderRadius: 8,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
              border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
              width: '100%', transition: 'opacity 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            onClick={promptInstall}
          >
            <Download size={14} />
            <span>Instalar App 🚀</span>
          </button>
        )}

        {/* Tags */}
        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <button
            onClick={() => setTagsOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, width: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '4px 0', fontFamily: 'inherit',
            }}
          >
            {tagsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            Tags
          </button>
        </div>

        {tagsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {tags.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 12px' }}>
                Nenhuma tag ainda
              </p>
            )}
            {tags.map(tag => navItem(
              tag.name,
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color || 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />,
              `/tags/${tag.id}`,
              null,
              tag.id
            ))}
          </div>
        )}

        {/* Como Usar at the very end of nav */}
        <div style={{ marginTop: 16 }}>
          {navItem('Como Usar', <BookOpen size={14} style={{ color: '#f472b6' }} />, '/manual')}
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
        <button
          onClick={toggleTheme}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 12.5 }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          onClick={() => { navigate('/settings'); onClose?.() }}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 12.5 }}
        >
          <Settings size={14} />
          Configurações
        </button>
        <button
          onClick={logout}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          Sair
        </button>

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px 4px', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
