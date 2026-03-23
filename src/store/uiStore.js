import { create } from 'zustand'

export const useUiStore = create((set, get) => ({
  theme: localStorage.getItem('cn-theme') || 'light',
  sidebarOpen: false,
  editorOpen: false,
  toasts: [],

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('cn-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    set({ theme: next })
  },

  initTheme: () => {
    const stored = localStorage.getItem('cn-theme')
    if (stored) {
      document.documentElement.classList.toggle('dark', stored === 'dark')
      set({ theme: stored })
      return
    }
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', system === 'dark')
    set({ theme: system })
  },

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setEditorOpen: (v) => set({ editorOpen: v }),

  toast: (message, type = 'default') => {
    const id = Date.now()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 2500)
  },
}))
