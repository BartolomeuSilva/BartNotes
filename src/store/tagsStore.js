import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { tagsApi } from '../services/supabaseApi'

export const useTagsStore = create((set, storeGet) => ({
  tags: [],
  loading: false,

  reset: () => set({ tags: [], loading: false }),

  fetchTags: async () => {
    if (storeGet().loading) return
    set({ loading: true })
    try {
      const { data } = await tagsApi.list()
      set({ tags: data || [], loading: false })
    } catch (err) {
      console.error('[tagsStore] fetchTags failed:', err)
      set({ tags: [], loading: false })
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
