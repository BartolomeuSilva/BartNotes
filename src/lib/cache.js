const CACHE_TTL = 5 * 60 * 1000

class NoteCache {
  constructor() {
    this.cache = new Map()
    this.pending = new Map()
  }

  getKey(filter, tagId, searchQuery) {
    return `${filter}:${tagId || 'all'}:${searchQuery || ''}`
  }

  get(filter, tagId, searchQuery) {
    const key = this.getKey(filter, tagId, searchQuery)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(filter, tagId, searchQuery, data) {
    const key = this.getKey(filter, tagId, searchQuery)
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  invalidate() {
    this.cache.clear()
  }

  invalidateNote(noteId) {
    for (const [key, entry] of this.cache) {
      const notes = entry.data
      const filtered = notes.filter(n => n.id !== noteId)
      if (filtered.length !== notes.length) {
        this.cache.set(key, { ...entry, data: filtered })
      }
    }
  }

  updateNote(updatedNote) {
    for (const [key, entry] of this.cache) {
      const notes = entry.data
      const idx = notes.findIndex(n => n.id === updatedNote.id)
      if (idx !== -1) {
        const newNotes = [...notes]
        newNotes[idx] = updatedNote
        this.cache.set(key, { ...entry, data: newNotes })
      }
    }
  }

  addNote(newNote) {
    for (const [key, entry] of this.cache) {
      const notes = entry.data
      this.cache.set(key, { ...entry, data: [newNote, ...notes] })
    }
  }

  removeNote(noteId) {
    for (const [key, entry] of this.cache) {
      const notes = entry.data.filter(n => n.id !== noteId)
      this.cache.set(key, { ...entry, data: notes })
    }
  }

  isPending(key) {
    return this.pending.has(key)
  }

  addPending(key) {
    this.pending.set(key, Date.now())
  }

  removePending(key) {
    this.pending.delete(key)
  }
}

class TagCache {
  constructor() {
    this.cache = null
    this.timestamp = 0
  }

  get() {
    if (!this.cache) return null
    if (Date.now() - this.timestamp > CACHE_TTL) {
      this.cache = null
      return null
    }
    return this.cache
  }

  set(data) {
    this.cache = data
    this.timestamp = Date.now()
  }

  invalidate() {
    this.cache = null
  }

  updateTag(updatedTag) {
    if (!this.cache) return
    const idx = this.cache.findIndex(t => t.id === updatedTag.id)
    if (idx !== -1) {
      const newTags = [...this.cache]
      newTags[idx] = updatedTag
      this.cache = newTags
    }
  }

  addTag(newTag) {
    if (!this.cache) return
    this.cache = [newTag, ...this.cache]
  }

  removeTag(tagId) {
    if (!this.cache) return
    this.cache = this.cache.filter(t => t.id !== tagId)
  }
}

class NoteSingleCache {
  constructor() {
    this.cache = new Map()
  }

  get(noteId) {
    return this.cache.get(noteId) || null
  }

  set(noteId, data) {
    this.cache.set(noteId, data)
  }

  invalidate(noteId) {
    this.cache.delete(noteId)
  }
}

export const noteCache = new NoteCache()
export const tagCache = new TagCache()
export const noteSingleCache = new NoteSingleCache()
