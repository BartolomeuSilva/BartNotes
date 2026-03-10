import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import { useNotesStore } from './store/notesStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NoteEditorPage from './pages/NoteEditorPage'
import EmptyEditorPage from './pages/EmptyEditorPage'
import SettingsPage from './pages/SettingsPage'
import ToastContainer from './components/ui/Toast'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: 'var(--text-muted)', fontSize: 14 }}>
      <div style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>A carregar…</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { init } = useAuthStore()
  const { initTheme } = useUiStore()
  const { setFilter } = useNotesStore()

  useEffect(() => {
    initTheme()
    init()
  }, [])

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<EmptyEditorPage />} />
          <Route path="note/new" element={<NoteEditorPage />} />
          <Route path="note/:id" element={<NoteEditorPage />} />
          <Route path="archived" element={<EmptyEditorPage />} />
          <Route path="trash" element={<EmptyEditorPage />} />
          <Route path="tags/:tagId" element={<EmptyEditorPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
