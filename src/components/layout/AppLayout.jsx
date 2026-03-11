import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import NoteList from './NoteList'
import BottomNav from './BottomNav'
import { useUiStore } from '../../store/uiStore'
import { useNotesStore } from '../../store/notesStore'
import { useTagsStore } from '../../store/tagsStore'
import { notesApi } from '../../services/supabaseApi'

export default function AppLayout() {
  const { id } = useParams()
  const { sidebarOpen, editorOpen, setSidebarOpen } = useUiStore()
  const { fetchNotes, setActiveNote } = useNotesStore()
  const { fetchTags } = useTagsStore()

  useEffect(() => {
    fetchNotes()
    fetchTags()
  }, [])

  useEffect(() => {
    if (id) {
      notesApi.get(id).then(({ data }) => setActiveNote(data)).catch(() => {})
    }
  }, [id])

  return (
    <div className="app-layout">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 99,
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <NoteList />

      <div className={`editor-panel${editorOpen ? ' open' : ''}`}>
        <Outlet />
      </div>

      <BottomNav />
    </div>
  )
}
