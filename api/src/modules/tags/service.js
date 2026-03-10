import { ApiError } from '../../lib/errors.js'

export async function createTag(prisma, userId, data) {
    return prisma.tag.create({
        data: {
            user_id: userId,
            name: data.name.toLowerCase(),
            color: data.color
        }
    })
}

export async function listTags(prisma, userId) {
    return prisma.tag.findMany({
        where: { user_id: userId },
        orderBy: { name: 'asc' }
    })
}

export async function updateTag(prisma, userId, tagId, data) {
    const existing = await prisma.tag.findUnique({ where: { id: tagId } })

    if (!existing || existing.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Tag não encontrada', 404)
    }

    return prisma.tag.update({
        where: { id: tagId },
        data: {
            name: data.name ? data.name.toLowerCase() : existing.name,
            color: data.color !== undefined ? data.color : existing.color
        }
    })
}

export async function deleteTag(prisma, userId, tagId) {
    const existing = await prisma.tag.findUnique({ where: { id: tagId } })

    if (!existing || existing.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Tag não encontrada', 404)
    }

    return prisma.tag.delete({ where: { id: tagId } })
}
