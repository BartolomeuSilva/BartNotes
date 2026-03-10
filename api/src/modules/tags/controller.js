import { handleApiError } from '../../lib/errors.js'
import * as tagService from './service.js'

export async function createHandler(request, reply) {
    try {
        const tag = await tagService.createTag(this.prisma, request.user.id, request.body)
        return reply.code(201).send({ data: tag })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function listHandler(request, reply) {
    try {
        const tags = await tagService.listTags(this.prisma, request.user.id)
        return reply.send({ data: tags })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function updateHandler(request, reply) {
    try {
        const tag = await tagService.updateTag(this.prisma, request.user.id, request.params.id, request.body)
        return reply.send({ data: tag })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function deleteHandler(request, reply) {
    try {
        await tagService.deleteTag(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}
