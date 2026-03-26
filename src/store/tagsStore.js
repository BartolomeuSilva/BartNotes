import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { tagsApi } from '../services/supabaseApi'

export const useTagsStore = create((set, storeGet) => ({
  tags: [],
  loading: false,

  reset: () => set({ tags: [], loading: false }),

  fetchTags: async (params = {}) => {
    // Safety: se loading ficou travado por mais de 10s, reseta
    if (storeGet().loading && !params.silent) {
      const stuckSince = storeGet()._loadingStartedAt
      if (stuckSince && Date.now() - stuckSince > 10000) {
        console.warn('[tagsStore] Loading travado detectado, resetando...')
        set({ loading: false, _loadingStartedAt: null })
      } else {
        return
      }
    }
    
    if (!params.silent) {
      set({ loading: true, _loadingStartedAt: Date.now() })
    }
    try {
      const { data } = await tagsApi.list()
      set({ tags: data || [], loading: false, _loadingStartedAt: null })
    } catch (err) {
      console.error('[tagsStore] fetchTags failed:', err)
      set({ tags: [], loading: false, _loadingStartedAt: null })
    }
  },

  subscribeToTags: () => {
    const channel = supabase
      .channel('tags-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
        storeGet().fetchTags()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  createTag: async (name, color) => {
    const { data } = await tagsApi.create({ name, color })
    set(s => ({ tags: [...s.tags, data] }))
    return data
  },

  updateTag: async (id, body) => {
    const { data } = await tagsApi.update(id, body)
    set(s => ({ tags: s.tags.map(t => t.id === id ? data : t) }))
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    set(s => ({ tags: s.tags.filter(t => t.id !== id) }))
  },
}))
