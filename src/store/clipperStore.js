import { create } from 'zustand'

export const useClipperStore = create((set) => ({
  isOpen: false,
  url: '',
  isLoading: false,
  extractedContent: null,
  error: null,
  saveToNote: true,

  setOpen: (isOpen) => set({ isOpen, url: '', extractedContent: null, error: null, isLoading: false }),
  setUrl: (url) => set({ url }),
  setLoading: (isLoading) => set({ isLoading }),
  setContent: (extractedContent) => set({ extractedContent, isLoading: false }),
  setError: (error) => set({ error, isLoading: false }),
  setSaveToNote: (saveToNote) => set({ saveToNote }),
  reset: () => set({ url: '', isLoading: false, extractedContent: null, error: null }),
}))
