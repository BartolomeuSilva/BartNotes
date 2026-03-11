import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { authApi } from '../services/supabaseApi'
import { useNotesStore } from './notesStore'
import { useTagsStore } from './tagsStore'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    const syncFromSession = async (session) => {
      if (!session?.user) {
        set({ user: null, loading: false })
        return
      }
      try {
        const { data } = await authApi.me()
        set({ user: data, loading: false })
      } catch {
        const u = session.user
        const fallback = {
          id: u.id,
          email: u.email,
          username: u.email?.split('@')[0] || 'user',
          avatarUrl: null,
          createdAt: u.created_at
        }
        set({ user: fallback, loading: false })
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await syncFromSession(session)
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false })
        return
      }
      if (!session?.user) return
      await syncFromSession(session)
    })
  },

  refreshUser: async () => {
    try {
      const { data } = await authApi.me()
      set({ user: data })
    } catch {
      set({ user: null })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    const { data } = await authApi.login({ email, password })
    set({ user: data.user })
    window.location.href = '/'
    return data
  },

  register: async (email, username, password) => {
    set({ error: null })
    const result = await authApi.register({ email, username, password })
    if (result.needsConfirm) {
      return { needsConfirm: true }
    }
    set({ user: result.user })
    window.location.href = '/'
    return result
  },

  logout: async () => {
    try { await authApi.logout() } catch { }
    set({ user: null })
    useNotesStore.getState().reset()
    useTagsStore.getState().reset()
  },

  setError: (error) => set({ error }),
}))
