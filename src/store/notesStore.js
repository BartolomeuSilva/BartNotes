import { create } from 'zustand'
import { notesApi } from '../services/api'

export const useNotesStore = create((set, get) => ({
  notes: [],
  activeNote: null,
  loading: false,
  saving: false,
  saveStatus: 'saved', // 'saving' | 'saved' | 'error'
  filter: 'all', // 'all' | 'pinned' | 'archived' | 'deleted'
  activeTagId: null,
  searchQuery: '',
  selectedNoteIds: [],

  reset: () => set({ notes: [], activeNote: null, loading: false, saving: false, saveStatus: 'saved', filter: 'all', activeTagId: null, searchQuery: '', selectedNoteIds: [] }),

  setFilter: (filter) => set({ filter, activeTagId: null, activeNote: null, selectedNoteIds: [] }),
  setActiveTag: (tagId) => set({ activeTagId: tagId, filter: 'all', activeNote: null, selectedNoteIds: [] }),
  setSearch: (q) => set({ searchQuery: q }),

  fetchNotes: async (params = {}) => {
    if (get().loading) return
    set({ loading: true })
    try {
      const { filter, activeTagId, searchQuery } = get()
      const { data } = await notesApi.list({
        filter: params.filter ?? filter,
        tag: params.tagId ?? activeTagId,
        q: (params.q ?? searchQuery) || undefined,
        limit: 500,
        ...params,
      })
      set({ notes: data.data || [], loading: false })
    } catch {
      set({ notes: [], loading: false })
    }
  },

  setActiveNote: (note) => set({ activeNote: note }),

  createNote: async () => {
    const { data } = await notesApi.create({ title: '', content: '' })
    const note = data.data
    set(s => ({ notes: [note, ...s.notes], activeNote: note }))
    return note
  },

  updateNote: async (id, body) => {
    set({ saveStatus: 'saving' })
    try {
      const { data } = await notesApi.update(id, body)
      const updated = data.data
      set(s => ({
        notes: s.notes.map(n => n.id === id ? updated : n),
        activeNote: s.activeNote?.id === id ? updated : s.activeNote,
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'error' })
    }
  },

  deleteNote: async (id) => {
    await notesApi.delete(id)
    set(s => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }))
  },

  deletePermanentNote: async (id) => {
    await notesApi.deletePermanent(id)
    set(s => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }))
  },

  restoreNote: async (id) => {
    const { data } = await notesApi.restore(id)
    set(s => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }))
    return data.data
  },

  pinNote: async (id) => {
    const { data } = await notesApi.pin(id)
    set(s => ({
      notes: s.notes.map(n => n.id === id ? data.data : n),
      activeNote: s.activeNote?.id === id ? data.data : s.activeNote,
    }))
  },

  archiveNote: async (id) => {
    const { data } = await notesApi.archive(id)
    set(s => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }))
    return data.data
  },

  duplicateNote: async (id) => {
    const { data } = await notesApi.duplicate(id)
    const note = data.data
    set(s => ({ notes: [note, ...s.notes], activeNote: note }))
    return note
  },

  toggleSelectNote: (id) => set(s => ({
    selectedNoteIds: s.selectedNoteIds.includes(id)
      ? s.selectedNoteIds.filter(i => i !== id)
      : [...s.selectedNoteIds, id]
  })),

  clearSelection: () => set({ selectedNoteIds: [] }),

  selectAll: () => set(s => ({ selectedNoteIds: s.notes.map(n => n.id) })),

  emptyTrash: async () => {
    const { notes } = get()
    const deletedNotes = notes.filter(n => n.isDeleted)
    await Promise.all(deletedNotes.map(n => notesApi.deletePermanent(n.id)))
    set(s => ({
      notes: s.notes.filter(n => !n.isDeleted),
      selectedNoteIds: [],
      activeNote: s.activeNote?.isDeleted ? null : s.activeNote
    }))
  },

  deleteMultiplePermanent: async (ids) => {
    await Promise.all(ids.map(id => notesApi.deletePermanent(id)))
    set(s => ({
      notes: s.notes.filter(n => !ids.includes(n.id)),
      selectedNoteIds: [],
      activeNote: ids.includes(s.activeNote?.id) ? null : s.activeNote
    }))
  },

  restoreMultiple: async (ids) => {
    await Promise.all(ids.map(id => notesApi.restore(id)))
    set(s => ({
      notes: s.notes.filter(n => !ids.includes(n.id)),
      selectedNoteIds: [],
      activeNote: ids.includes(s.activeNote?.id) ? null : s.activeNote
    }))
  },
}))
