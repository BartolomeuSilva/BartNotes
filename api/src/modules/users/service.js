import bcrypt from 'bcrypt'
import { ApiError } from '../../lib/errors.js'

export async function getUserStats(prisma, userId) {
    const [totalNotes, totalTags, totalWords] = await Promise.all([
        prisma.note.count({ where: { user_id: userId, is_deleted: false } }),
        prisma.tag.count({ where: { user_id: userId } }),
        prisma.note.aggregate({
            where: { user_id: userId, is_deleted: false },
            _sum: { word_count: true }
        })
    ])

    return {
        notes_count: totalNotes,
        tags_count: totalTags,
        total_words: totalWords._sum.word_count || 0
    }
}

export async function updateProfile(prisma, userId, data) {
    if (data.username) {
        const existing = await prisma.user.findFirst({
            where: { username: data.username, id: { not: userId } }
        })
        if (existing) throw new ApiError('ALREADY_EXISTS', 'Username já em uso', 409)
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(data.username && { username: data.username }),
            ...(data.avatar_url && { avatar_url: data.avatar_url })
        },
        select: { id: true, email: true, username: true, avatar_url: true }
    })

    return updated
}

export async function changePassword(prisma, userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
        throw new ApiError('INVALID_CREDENTIALS', 'Senha atual incorreta', 400)
    }

    const newHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newHash }
    })

    return true
}

export async function deleteAccount(prisma, userId) {
    // Cascota deletes on Prisma
    await prisma.user.delete({ where: { id: userId } })
    return true
}

export async function exportData(prisma, userId) {
    const notes = await prisma.note.findMany({
        where: { user_id: userId },
        include: { tags: true, versions: true }
    })
    // Simple JSON dump MVP
    return notes
}
