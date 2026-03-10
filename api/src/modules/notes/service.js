import { ApiError } from '../../lib/errors.js'

function serializeNote(note) {
    if (!note) return null
    return {
        id: note.id,
        userId: note.user_id,
        title: note.title,
        content: note.content,
        isPinned: note.is_pinned,
        isArchived: note.is_archived,
        isDeleted: note.is_deleted,
        deletedAt: note.deleted_at,
        wordCount: note.word_count,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        tags: note.tags || [],
    }
}

function serializeVersion(v) {
    return {
        id: v.id,
        noteId: v.note_id,
        content: v.content,
        versionNumber: v.version_number,
        createdAt: v.created_at,
    }
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

export async function createNote(prisma, userId, data) {
    let title = data.title
    if (!title) {
        title = extractTitle(data.content)
    }

    const note = await prisma.note.create({
        data: {
            user_id: userId,
            title: title,
            content: data.content || '',
            word_count: data.content ? data.content.split(/\s+/).filter(w => w.length > 0).length : 0,
            tags: {
                connect: data.tagIds?.map(id => ({ id })) || []
            }
        },
        include: { tags: true }
    })

    // Salvar primeira versão
    await prisma.noteVersion.create({
        data: {
            note_id: note.id,
            content: note.content,
            version_number: 1
        }
    })

    return serializeNote(note)
}

export async function getNotes(prisma, userId, params) {
    const { page, limit, q, tag, filter, sort, order } = params
    const skip = (page - 1) * limit

    const where = { user_id: userId }

    if (filter === 'deleted') {
        where.is_deleted = true
    } else {
        where.is_deleted = false
        if (filter === 'archived') where.is_archived = true
        if (filter === 'pinned') where.is_pinned = true
    }

    if (tag) {
        where.tags = { some: { id: tag } }
    }

    if (q) {
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } }
        ]
    }

    const orderBy = { [sort]: order }

    const [total, notes] = await Promise.all([
        prisma.note.count({ where }),
        prisma.note.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: { tags: true }
        })
    ])

    return {
        data: notes.map(serializeNote),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

export async function getNoteById(prisma, userId, noteId) {
    const note = await prisma.note.findUnique({
        where: { id: noteId },
        include: { tags: true }
    })

    if (!note || note.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Nota não encontrada', 404)
    }

    return note
}

export async function getNoteByIdPublic(prisma, userId, noteId) {
    const note = await getNoteById(prisma, userId, noteId)
    return serializeNote(note)
}

export async function updateNote(prisma, userId, noteId, data) {
    const existing = await getNoteById(prisma, userId, noteId)

    let title = data.title !== undefined ? data.title : existing.title
    if (data.content !== undefined && !data.title) {
        title = extractTitle(data.content)
    }

    const updateData = {
        title,
        content: data.content !== undefined ? data.content : existing.content,
        word_count: data.content !== undefined ? data.content.split(/\s+/).filter(w => w.length > 0).length : existing.word_count
    }

    if (data.tagIds !== undefined) {
        updateData.tags = { set: data.tagIds.map(id => ({ id })) }
    }

    const note = await prisma.note.update({
        where: { id: noteId },
        data: updateData,
        include: { tags: true }
    })

    // Save new version if content changed
    if (data.content !== undefined && data.content !== existing.content) {
        const versionsCount = await prisma.noteVersion.count({ where: { note_id: noteId } })
        await prisma.noteVersion.create({
            data: {
                note_id: noteId,
                content: note.content,
                version_number: versionsCount + 1
            }
        })
    }

    return serializeNote(note)
}

export async function deleteNoteSoft(prisma, userId, noteId) {
    await getNoteById(prisma, userId, noteId)
    return prisma.note.update({
        where: { id: noteId },
        data: { is_deleted: true, deleted_at: new Date() }
    })
}

export async function deleteNotePermanent(prisma, userId, noteId) {
    await getNoteById(prisma, userId, noteId)
    return prisma.note.delete({ where: { id: noteId } })
}

export async function restoreNote(prisma, userId, noteId) {
    await getNoteById(prisma, userId, noteId)
    const note = await prisma.note.update({
        where: { id: noteId },
        data: { is_deleted: false, deleted_at: null },
        include: { tags: true }
    })
    return serializeNote(note)
}

export async function togglePinNote(prisma, userId, noteId) {
    const note = await getNoteById(prisma, userId, noteId)
    const updated = await prisma.note.update({
        where: { id: noteId },
        data: { is_pinned: !note.is_pinned },
        include: { tags: true }
    })
    return serializeNote(updated)
}

export async function toggleArchiveNote(prisma, userId, noteId) {
    const note = await getNoteById(prisma, userId, noteId)
    const updated = await prisma.note.update({
        where: { id: noteId },
        data: { is_archived: !note.is_archived, is_pinned: false },
        include: { tags: true }
    })
    return serializeNote(updated)
}

export async function getNoteVersions(prisma, userId, noteId) {
    await getNoteById(prisma, userId, noteId)
    const versions = await prisma.noteVersion.findMany({
        where: { note_id: noteId },
        orderBy: { version_number: 'desc' },
        take: 50
    })
    return versions.map(serializeVersion)
}

export async function duplicateNote(prisma, userId, noteId) {
    const existing = await getNoteById(prisma, userId, noteId)

    const duplicated = await prisma.note.create({
        data: {
            user_id: userId,
            title: `${existing.title} (Cópia)`,
            content: existing.content,
            word_count: existing.word_count,
            tags: {
                connect: existing.tags.map(t => ({ id: t.id }))
            }
        },
        include: { tags: true }
    })

    await prisma.noteVersion.create({
        data: {
            note_id: duplicated.id,
            content: duplicated.content,
            version_number: 1
        }
    })

    return serializeNote(duplicated)
}
