import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, FileText, Plus, Archive, Trash2, Sparkles } from 'lucide-react'
import { useNotesStore } from '../../store/notesStore'
import { useUiStore } from '../../store/uiStore'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { filter, setFilter, createNote } = useNotesStore()
  const { setSidebarOpen, editorOpen, setChatOpen, setEditorOpen } = useUiStore()

  const handleNav = (filterVal, path) => {
    setFilter(filterVal)
    navigate(path)
  }

  const handleNewNote = async () => {
    setFilter('all')
    const note = await createNote()
    setEditorOpen(true)
    navigate(`/note/${note.id}`)
  }
  
  const isEditingNote = editorOpen && (location.pathname.startsWith('/note') || location.pathname === '/')

  return (
    <nav className={`bottom-nav${isEditingNote ? ' editor-open' : ''}`}>
      <button
        className="bottom-nav-item"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={22} />
        <span>Menu</span>
      </button>

      <button
        className={`bottom-nav-item${filter === 'all' ? ' active' : ''}`}
        onClick={() => handleNav('all', '/')}
      >
        <FileText size={22} />
        <span>Notas</span>
      </button>

      <button className="bottom-nav-fab" onClick={handleNewNote}>
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <button
        className={`bottom-nav-item${filter === 'archived' ? ' active' : ''}`}
        onClick={() => handleNav('archived', '/archived')}
      >
        <Archive size={22} />
        <span>Arquivo</span>
      </button>

      <button
        className="bottom-nav-item"
        onClick={() => setChatOpen(true)}
        style={{ color: 'var(--accent)' }}
      >
        <Sparkles size={22} />
        <span>Chat</span>
      </button>
    </nav>
  )
}
