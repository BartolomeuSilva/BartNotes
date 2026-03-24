import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { notesApi } from '../services/supabaseApi'

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
      set({ notes: data || [], loading: false })
    } catch (err) {
      console.error('[notesStore] fetchNotes failed:', err)
      set({ loading: false }) // Mantém as notas atuais no erro
    }
  },

  subscribeToNotes: () => {
    console.log('[Realtime] Iniciando conexão inteligente...')
    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, async (payload) => {
        console.log('[Realtime] Evento:', payload.eventType, payload.new?.id)
        
        const { notes, activeNote } = get()

        if (payload.eventType === 'INSERT') {
          // Busca a nota completa (com tags) para inserir na lista
          const { data: newNote } = await notesApi.get(payload.new.id)
          set({ notes: [newNote, ...notes] })
        } 
        else if (payload.eventType === 'UPDATE') {
          // Atualiza apenas a nota específica na lista sem disparar refresh total
          const { data: updatedNote } = await notesApi.get(payload.new.id)
          set({ 
            notes: notes.map(n => n.id === updatedNote.id ? updatedNote : n),
            // Se for a nota ativa, atualiza ela também
            activeNote: activeNote?.id === updatedNote.id ? updatedNote : activeNote
          })
        } 
        else if (payload.eventType === 'DELETE') {
          set({ 
            notes: notes.filter(n => n.id !== payload.old.id),
            activeNote: activeNote?.id === payload.old.id ? null : activeNote
          })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_tags' }, async (payload) => {
        // Quando mudam as tags, atualizamos apenas aquela nota
        const noteId = payload.new?.note_id || payload.old?.note_id
        if (noteId) {
          const { data: updatedNote } = await notesApi.get(noteId)
          const { notes, activeNote } = get()
          set({
            notes: notes.map(n => n.id === updatedNote.id ? updatedNote : n),
            activeNote: activeNote?.id === updatedNote.id ? updatedNote : activeNote
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  },

  setActiveNote: (note) => set({ activeNote: note }),

  createNote: async (data = {}) => {
    console.log('notesStore createNote called with:', data)
    const note = await notesApi.create({ 
      title: data.title || '', 
      content: data.content || '' 
    })
    console.log('notesStore createNote result:', note)
    set(s => ({ notes: [note, ...s.notes], activeNote: note }))
    return note
  },

  updateNote: async (id, body) => {
    set({ saveStatus: 'saving' })
    try {
      const { data: updated } = await notesApi.update(id, body)
      set(s => ({
        notes: s.notes.map(n => n.id === id ? updated : n),
        activeNote: s.activeNote?.id === id ? updated : s.activeNote,
        saveStatus: 'saved',
      }))
    } catch {
      set({ saveStatus: 'error' })
    }
  },

  toggleTaskInNote: async (noteId, taskLineIndex, currentLineText) => {
    const { notes, updateNote } = get()
    const note = notes.find(n => n.id === noteId)
    if (!note || !note.content) return false

    const lines = note.content.split('\n')
    let targetIdx = taskLineIndex
    
    // Fallback: se o índice mudou, procura a string exata
    if (lines[targetIdx] !== currentLineText) {
      targetIdx = lines.findIndex(l => l === currentLineText)
    }
    
    if (targetIdx !== -1) {
      const line = lines[targetIdx]
      const isChecked = line.match(/^\s*-\s*\[([xX])\]/)
      if (isChecked) {
        lines[targetIdx] = line.replace(/\[[xX]\]/, '[ ]')
      } else {
        lines[targetIdx] = line.replace(/\[\s\]/, '[x]')
      }
      
      const newContent = lines.join('\n')
      await updateNote(noteId, { content: newContent })
      return true
    }
    return false
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
    return data
  },

  pinNote: async (id) => {
    const { data } = await notesApi.pin(id)
    set(s => ({
      notes: s.notes.map(n => n.id === id ? data : n),
      activeNote: s.activeNote?.id === id ? data : s.activeNote,
    }))
  },

  archiveNote: async (id) => {
    const { data } = await notesApi.archive(id)
    set(s => ({
      notes: s.notes.filter(n => n.id !== id),
      activeNote: s.activeNote?.id === id ? null : s.activeNote,
    }))
    return data
  },

  duplicateNote: async (id) => {
    const note = await notesApi.duplicate(id)
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
