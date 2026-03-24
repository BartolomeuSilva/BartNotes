import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [],
      cache: {}, // { normalizedQuery: response }

      addMessage: (msg) => {
        set((state) => ({
          messages: [...state.messages, { ...msg, timestamp: new Date().toISOString() }]
        }))
      },

      setCache: (query, response) => {
        set((state) => ({
          cache: { ...state.cache, [query]: response }
        }))
      },

      getCache: (query) => {
        return get().cache[query] || null
      },

      clearHistory: () => {
        set({ messages: [] })
      },

      clearCache: () => {
        set({ cache: {} })
      },

      resetAll: () => {
        set({ messages: [], cache: {} })
      }
    }),
    {
      name: 'bartnotes-chat-storage',
    }
  )
)
