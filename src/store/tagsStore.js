import { create } from 'zustand'
import { tagsApi } from '../services/api'

export const useTagsStore = create((set, storeGet) => ({
  tags: [],
  loading: false,

  reset: () => set({ tags: [], loading: false }),

  fetchTags: async () => {
    console.log('[tagsStore] fetchTags called, loading:', storeGet().loading)
    if (storeGet().loading) return
    set({ loading: true })
    try {
      const { data } = await tagsApi.list()
      set({ tags: data.data || [], loading: false })
    } catch (err) {
      console.error('[tagsStore] fetchTags failed:', err)
      set({ tags: [], loading: false })
    }
  },

  createTag: async (name, color) => {
    const { data } = await tagsApi.create({ name, color })
    set(s => ({ tags: [...s.tags, data.data] }))
    return data.data
  },

  updateTag: async (id, body) => {
    const { data } = await tagsApi.update(id, body)
    set(s => ({ tags: s.tags.map(t => t.id === id ? data.data : t) }))
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    set(s => ({ tags: s.tags.filter(t => t.id !== id) }))
  },
}))
