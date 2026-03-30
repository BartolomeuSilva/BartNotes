import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { tagsApi } from '../services/supabaseApi'
import { tagCache } from '../lib/cache'

export const useTagsStore = create((set, storeGet) => ({
  tags: [],
  loading: false,

  reset: () => {
    tagCache.invalidate()
    set({ tags: [], loading: false })
  },

  fetchTags: async (params = {}) => {
    const cachedTags = !params.silent ? tagCache.get() : null
    
    if (cachedTags) {
      set({ tags: cachedTags, loading: false })
      if (params.silent) return
    }
    
    if (storeGet().loading && !params.silent) {
      const stuckSince = storeGet()._loadingStartedAt
      if (stuckSince && Date.now() - stuckSince > 10000) {
        console.warn('[tagsStore] Loading travado detectado, resetando...')
        set({ loading: false, _loadingStartedAt: null })
      } else if (!cachedTags) {
        return
      }
    }
    
    if (!params.silent) {
      set({ loading: true, _loadingStartedAt: Date.now() })
    }
    try {
      const { data } = await tagsApi.list()
      tagCache.set(data || [])
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
        tagCache.invalidate()
        storeGet().fetchTags()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  createTag: async (name, color) => {
    const { data } = await tagsApi.create({ name, color })
    tagCache.addTag(data)
    set(s => ({ tags: [...s.tags, data] }))
    return data
  },

  updateTag: async (id, body) => {
    const { data } = await tagsApi.update(id, body)
    tagCache.updateTag(data)
    set(s => ({ tags: s.tags.map(t => t.id === id ? data : t) }))
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    tagCache.removeTag(id)
    set(s => ({ tags: s.tags.filter(t => t.id !== id) }))
  },
}))
