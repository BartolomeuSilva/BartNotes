import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import NoteList from './NoteList'
import BottomNav from './BottomNav'
import { useUiStore } from '../../store/uiStore'
import { useNotesStore } from '../../store/notesStore'
import { useTagsStore } from '../../store/tagsStore'
import { notesApi } from '../../services/supabaseApi'
import { supabase } from '../../lib/supabase'

export default function AppLayout() {
  const { id } = useParams()
  const { sidebarOpen, editorOpen, setSidebarOpen, setEditorOpen, isFocusMode } = useUiStore()
  const { fetchNotes, setActiveNote, subscribeToNotes } = useNotesStore()
  const { fetchTags, subscribeToTags } = useTagsStore()
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    console.log('[AppLayout] Montando componentes e iniciando Realtime...')
    
    let unsubscribeNotes = null
    let unsubscribeTags = null

    const startSubscriptions = () => {
      // Limpa inscrições anteriores se existirem
      if (unsubscribeNotes) unsubscribeNotes()
      if (unsubscribeTags) unsubscribeTags()
      
      console.log('[Realtime] (Re)conectando canais...')
      
      try {
        unsubscribeNotes = subscribeToNotes()
        unsubscribeTags = subscribeToTags()
      } catch (err) {
        console.error('[AppLayout] Erro ao iniciar inscrições Realtime:', err)
      }
    }

    // Inicia na montagem
    startSubscriptions()

    // Reativa o app quando a aba volta do background
    const handleWakeUp = async () => {
      if (document.visibilityState === 'hidden') return
      console.log('[AppLayout] App voltou ao foco, reativando...')
      
      try {
        // 1. Refresca o token JWT (pode ter expirado em background)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) console.warn('[AppLayout] Erro ao refrescar sessão:', error.message)
        
        if (!session) {
          console.warn('[AppLayout] Sessão expirada, redirecionando para login...')
          return
        }

        // 2. Recarrega dados frescos do servidor
        fetchNotes()
        fetchTags()

        // 3. Reconecta canais Realtime
        startSubscriptions()
      } catch (err) {
        console.error('[AppLayout] Erro na reativação:', err)
      }
    }

    document.addEventListener('visibilitychange', handleWakeUp)
    window.addEventListener('focus', handleWakeUp)

    return () => {
      console.log('[AppLayout] Desmontando componente, limpando conexões...')
      document.removeEventListener('visibilitychange', handleWakeUp)
      window.removeEventListener('focus', handleWakeUp)
      if (unsubscribeNotes) unsubscribeNotes()
      if (unsubscribeTags) unsubscribeTags()
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (id) {
      console.log('[AppLayout] URL alterada para nota:', id)
      const { notes } = useNotesStore.getState()
      const existing = notes.find(n => n.id === id)
      
      // No mobile, se houver ID na URL, o editor DEVE estar aberto
      setEditorOpen(true)

      if (existing) {
        setActiveNote(existing)
      } else {
        notesApi.get(id)
          .then(({ data }) => setActiveNote(data))
          .catch(err => console.error('[AppLayout] Erro ao carregar nota individual:', err))
      }
    } else {
      setActiveNote(null)
      
      // Se voltamos para o root e não é uma página utilitária (tasks, graph, etc), fecha o editor
      const path = window.location.pathname
      if (path === '/' || path.startsWith('/tags/')) {
        setEditorOpen(false)
      }
    }
  }, [id, setEditorOpen])

  if (isFocusMode) {
    return (
      <div className="app-layout" style={{ background: 'var(--bg-primary)' }}>
        <div className="editor-panel open" style={{ position: 'relative', left: 0, width: '100%', height: '100%', border: 'none', zIndex: 999 }}>
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <>
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          background: '#ef4444', color: 'white', padding: '6px 12px',
          textAlign: 'center', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          ⚠️ Você está off-line (Modo Leitura). Todas as edições e salvamentos foram interrompidos temporariamente.
        </div>
      )}
      <div className="app-layout" style={{ paddingTop: isOffline ? 30 : 0 }}>
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
    </>
  )
}
