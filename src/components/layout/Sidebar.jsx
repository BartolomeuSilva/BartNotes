import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FileText, Tag, Archive, Trash2, Search, Moon, Sun,
  Plus, Settings, X, ChevronDown, ChevronRight, LogOut, Download
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTagsStore } from '../../store/tagsStore'
import { useNotesStore } from '../../store/notesStore'
import { useUiStore } from '../../store/uiStore'
import { TAG_COLORS } from '../../lib/utils'
import { useInstallPWA } from '../../hooks/useInstallPWA'

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { tags } = useTagsStore()
  const { filter, activeTagId, setFilter, setActiveTag, createNote } = useNotesStore()
  const { theme, toggleTheme, toast } = useUiStore()
  const [tagsOpen, setTagsOpen] = useState(true)
  const { canInstall, install, ios, showIOSHint, setShowIOSHint } = useInstallPWA()

  const nav = (path, filterVal, tagId = null) => {
    if (filterVal) setFilter(filterVal)
    if (tagId) setActiveTag(tagId)
    navigate(path)
    onClose?.()
  }

  const handleNewNote = async () => {
    setFilter('all')
    const note = await createNote()
    navigate(`/note/${note.id}`)
    onClose?.()
  }

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
          border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
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
    <nav className="sidebar-content">
      {/* Logo */}
      <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="BartNotes" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
            BartNotes
          </span>
        </div>
        {onClose && (
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* New note */}
      <div style={{ padding: '12px 12px 8px' }}>
        <button
          onClick={handleNewNote}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '8px 12px', borderRadius: 6,
            background: 'var(--text-primary)', color: 'var(--bg-primary)',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={14} />
          Nova nota
        </button>
      </div>

      {/* Navigation */}
      <div style={{ padding: '4px 12px', flex: 1, overflow: 'auto' }}>
        {navItem('Todas as notas', <FileText size={14} />, '/', 'all')}
        {navItem('Fixadas', <span style={{ fontSize: 12 }}>📌</span>, '/?filter=pinned', 'pinned')}
        {navItem('Arquivadas', <Archive size={14} />, '/archived', 'archived')}
        {navItem('Lixeira', <Trash2 size={14} />, '/trash', 'deleted')}

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
      </div>

      {/* Install PWA */}
      {canInstall && (
        <div style={{ padding: '10px 12px 0', position: 'relative' }}>
          <button
            onClick={install}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--accent)',
              background: 'linear-gradient(135deg, var(--accent), #b45309)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(217,119,6,0.35)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Download size={15} />
            Instalar App
          </button>

          {/* iOS hint */}
          {ios && showIOSHint && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 12, right: 12,
              background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
              zIndex: 100,
            }}>
              <button
                onClick={() => setShowIOSHint(false)}
                style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}
              >×</button>
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>Instalar no iPhone / iPad</p>
              <p style={{ margin: 0 }}>
                1. Toque em <strong>Compartilhar</strong> <span style={{ fontSize: 14 }}>⎙</span> no Safari<br />
                2. Role e toque em <strong>"Adicionar à Tela Inicial"</strong> <span style={{ fontSize: 14 }}>＋</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom actions */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px', marginTop: canInstall ? 10 : 0 }}>
        <button
          onClick={toggleTheme}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13 }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          onClick={() => { navigate('/settings'); onClose?.() }}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13 }}
        >
          <Settings size={14} />
          Configurações
        </button>
        <button
          onClick={logout}
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}
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
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
