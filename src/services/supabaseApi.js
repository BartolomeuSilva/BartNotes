import { supabase } from '../lib/supabase'
import { toCamelKeys, toSnakeKeys } from '../lib/caseTransform'

function handleError(error, throwErr = true) {
  if (throwErr && error) {
    const e = new Error(error.message || 'Supabase error')
    e.code = error.code
    e.details = error
    throw e
  }
  return error
}

async function getProfile(userId, userEmail = '') {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code === 'PGRST116') {
    const defaultUsername = (userEmail || '').split('@')[0] || 'user'
    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .insert({ id: userId, username: defaultUsername })
      .select()
      .single()
    handleError(insertErr)
    return toCamelKeys(inserted)
  }
  handleError(error)
  return toCamelKeys(data)
}

function extractTitle(content) {
  if (!content) return 'Nova Nota'
  const lines = content.split('\n')
  for (const line of lines) {
    const text = line.replace(/^[#\s]+/, '').trim()
    if (text) return text.substring(0, 200)
  }
  return 'Nova Nota'
}

// ── Auth ──
export const authApi = {
  async register(body) {
    const { email, username, password } = body
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: username } }
    })
    handleError(error)
    if (authData.user) {
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        { id: authData.user.id, username },
        { onConflict: 'id' }
      )
      if (upsertErr) console.warn('[register] profiles upsert:', upsertErr.message)
    }
    const hasSession = !!authData.session
    if (hasSession) {
      const u = authData.user
      return {
        user: {
          id: u.id,
          email: u.email,
          username,
          avatarUrl: null,
          createdAt: u.created_at
        },
        needsConfirm: false
      }
    }
    return { needsConfirm: true }
  },

  async login(body) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password
    })
    handleError(error)
    const u = data.user
    const userData = {
      id: u.id,
      email: u.email,
      username: u.email?.split('@')[0] || 'user',
      avatarUrl: null,
      createdAt: u.created_at
    }
    return { data: { accessToken: data.session.access_token, expiresIn: data.session.expires_in, user: userData } }
  },

  async logout() {
    await supabase.auth.signOut()
    return { data: { success: true } }
  },

  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    handleError(error)
    if (!user) throw new Error('Not authenticated')
    try {
      const profile = await getProfile(user.id, user.email)
      return {
        data: {
          id: user.id,
          email: user.email,
          username: profile?.username || user.email?.split('@')[0] || '',
          avatarUrl: profile?.avatarUrl,
          createdAt: user.created_at
        }
      }
    } catch {
      return {
        data: {
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0] || 'user',
          avatarUrl: null,
          createdAt: user.created_at
        }
      }
    }
  }
}

// ── Notes ──
export const notesApi = {
  async list(params = {}) {
    const { filter = 'all', tag: tagId, q, limit = 500, page = 1, sort = 'updated_at', order = 'desc' } = params
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
      .from('notes')
      .select(`
        *,
        note_tags(tags(id, name, color))
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    if (filter === 'deleted') {
      query = query.eq('is_deleted', true)
    } else {
      query = query.eq('is_deleted', false)
      if (filter === 'archived') query = query.eq('is_archived', true)
      if (filter === 'pinned') query = query.eq('is_pinned', true)
    }

    if (tagId) {
      const { data: noteIds } = await supabase
        .from('note_tags')
        .select('note_id')
        .eq('tag_id', tagId)
      const ids = (noteIds || []).map(r => r.note_id)
      if (ids.length) query = query.in('id', ids)
      else query = query.eq('id', '00000000-0000-0000-0000-000000000000') // no results
    }

    if (q) {
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    }

    const { data: rows, error, count } = await query
    handleError(error)

    const notes = (rows || []).map(n => {
      const tags = (n.note_tags || []).map(nt => nt.tags).filter(Boolean)
      const { note_tags: _, ...note } = n
      return toCamelKeys({ ...note, tags })
    })

    return {
      data: notes,
      meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) }
    }
  },

  async get(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        note_tags(tags(id, name, color))
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    handleError(error)
    if (!data) throw new Error('Not found')
    const tags = (data.note_tags || []).map(nt => nt.tags).filter(Boolean)
    const { note_tags: _, ...note } = data
    return { data: toCamelKeys({ ...note, tags }) }
  },

  async create(body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const title = body.title || extractTitle(body.content)
    const content = body.content || ''
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content,
        word_count: wordCount
      })
      .select()
      .single()
    handleError(error)

    if (body.tagIds?.length) {
      await supabase.from('note_tags').insert(
        body.tagIds.map(tagId => ({ note_id: note.id, tag_id: tagId }))
      )
    }

    await supabase.from('note_versions').insert({
      note_id: note.id,
      content: note.content,
      version_number: 1
    })

    const { data: updated } = await notesApi.get(note.id)
    return updated
  },

  async update(id, body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const existing = (await notesApi.get(id)).data

    let title = body.title !== undefined ? body.title : existing.title
    if (body.content !== undefined && body.title === undefined) {
      title = extractTitle(body.content)
    }
    const content = body.content !== undefined ? body.content : existing.content
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length

    const updateData = {
      title,
      content,
      word_count: wordCount,
      ...(body.isPinned !== undefined && { is_pinned: body.isPinned }),
      ...(body.isArchived !== undefined && { is_archived: body.isArchived })
    }

    const { error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
    handleError(error)

    if (body.tagIds !== undefined) {
      await supabase.from('note_tags').delete().eq('note_id', id)
      if (body.tagIds.length) {
        await supabase.from('note_tags').insert(
          body.tagIds.map(tagId => ({ note_id: id, tag_id: tagId }))
        )
      }
    }

    if (body.content !== undefined && body.content !== existing.content) {
      const { count } = await supabase
        .from('note_versions')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', id)
      await supabase.from('note_versions').insert({
        note_id: id,
        content,
        version_number: (count || 0) + 1
      })
    }

    return notesApi.get(id)
  },

  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('notes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    handleError(error)
    return { data: { success: true } }
  },

  async deletePermanent(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    handleError(error)
    return { data: { success: true } }
  },

  async restore(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('notes')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    handleError(error)
    const note = (await notesApi.get(id)).data
    return { data: note }
  },

  async pin(id) {
    const { data: existing } = await notesApi.get(id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !existing.isPinned })
      .eq('id', id)
      .eq('user_id', user.id)
    handleError(error)
    return notesApi.get(id)
  },

  async archive(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase
      .from('notes')
      .update({ is_archived: true, is_pinned: false })
      .eq('id', id)
      .eq('user_id', user.id)
    return notesApi.get(id)
  },

  async versions(id) {
    await notesApi.get(id) // ensure access
    const { data, error } = await supabase
      .from('note_versions')
      .select('*')
      .eq('note_id', id)
      .order('version_number', { ascending: false })
      .limit(50)
    handleError(error)
    return { data: (data || []).map(toCamelKeys) }
  },

  async duplicate(id) {
    const { data: existing } = await notesApi.get(id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const tagIds = (existing.tags || []).map(t => t.id)
    return notesApi.create({
      title: `${existing.title} (Cópia)`,
      content: existing.content,
      tagIds
    })
  }
}

// ── Tags ──
export const tagsApi = {
  async list() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    handleError(error)
    return { data: (data || []).map(toCamelKeys) }
  },

  async create(body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name: (body.name || '').toLowerCase(),
        color: body.color
      })
      .select()
      .single()
    handleError(error)
    return { data: toCamelKeys(data) }
  },

  async update(id, body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const updateData = {}
    if (body.name !== undefined) updateData.name = body.name.toLowerCase()
    if (body.color !== undefined) updateData.color = body.color
    const { data, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    handleError(error)
    return { data: toCamelKeys(data) }
  },

  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    handleError(error)
    return { data: { success: true } }
  }
}

// ── Search ──
export const searchApi = {
  async search(q, params = {}) {
    const { limit = 10 } = params
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, content, updated_at')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(limit)
    handleError(error)
    const results = (data || []).map(n => ({
      id: n.id,
      title: n.title,
      snippet: (n.content?.substring(0, 100) || '') + '...',
      updated_at: n.updated_at
    }))
    return { data: results }
  }
}

// ── User ──
export const userApi = {
  async stats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const [notesRes, tagsRes, wordsRes] = await Promise.all([
      supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_deleted', false),
      supabase.from('tags').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('notes').select('word_count').eq('user_id', user.id).eq('is_deleted', false)
    ])
    let totalWords = 0
    if (wordsRes.data) {
      totalWords = wordsRes.data.reduce((s, n) => s + (n.word_count || 0), 0)
    }
    return {
      data: {
        notes_count: notesRes.count ?? 0,
        tags_count: tagsRes.count ?? 0,
        total_words: totalWords
      }
    }
  },

  async updateProfile(body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: body.username, avatar_url: body.avatar_url })
      .eq('id', user.id)
      .select()
      .single()
    handleError(error)
    return { data: toCamelKeys(data) }
  },

  async changePassword(body) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) throw new Error('Not authenticated')
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword
    })
    const { error } = await supabase.auth.updateUser({
      password: body.newPassword
    })
    handleError(error)
    return { data: { success: true } }
  },

  async exportData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: notes } = await supabase
      .from('notes')
      .select(`
        *,
        tags:note_tags(tag:tags(*)),
        versions:note_versions(*)
      `)
      .eq('user_id', user.id)
    const exportJson = JSON.stringify(notes || [], null, 2)
    const blob = new Blob([exportJson], { type: 'application/json' })
    return { data: blob }
  },

  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    // Delete user - cascade will remove notes, tags, etc.
    // Supabase doesn't allow user to delete self via client; needs Edge Function with service role
    // For now we delete all user data - user can't access anyway
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    return { data: { success: true } }
  }
}
