import axios from 'axios'
import { create } from 'zustand'
import { authApi, setAccessToken } from '../services/api'
import { useNotesStore } from './notesStore'
import { useTagsStore } from './tagsStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      // Try to get a fresh access token via the refresh cookie first,
      // avoiding a guaranteed 401 on /me when accessToken is not in memory.
      const { data: refreshData } = await axios.post(
        `${API_URL}/auth/refresh`, {}, { withCredentials: true }
      )
      setAccessToken(refreshData.data.accessToken)
      const { data } = await authApi.me()
      set({ user: data.data })
    } catch {
      console.warn('[authStore] init failed (user not logged in)')
      setAccessToken(null)
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    const { data } = await authApi.login({ email, password })
    setAccessToken(data.data.accessToken)
    const me = await authApi.me()
    set({ user: me.data.data })
    return data.data
  },

  register: async (email, username, password) => {
    set({ error: null })
    await authApi.register({ email, username, password })
    return get().login(email, password)
  },

  logout: async () => {
    try { await authApi.logout() } catch { }
    setAccessToken(null)
    set({ user: null })
    useNotesStore.getState().reset()
    useTagsStore.getState().reset()
  },

  setError: (error) => set({ error }),
}))
