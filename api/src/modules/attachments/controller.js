import { handleApiError } from '../../lib/errors.js'
import * as attService from './service.js'

export async function uploadHandler(request, reply) {
    try {
        const file = await request.file()
        if (!file) {
            return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Nenhum arquivo enviado' } })
        }

        const result = await attService.uploadAttachment(this, request.user.id, request.params.noteId, file)
        return reply.code(201).send({ data: result })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function listHandler(request, reply) {
    try {
        const data = await attService.listAttachments(this, request.user.id, request.params.noteId)
        return reply.send({ data })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function deleteHandler(request, reply) {
    try {
        await attService.deleteAttachment(this, request.user.id, request.params.id)
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function getUrlHandler(request, reply) {
    try {
        const url = await attService.getAttachmentUrl(this, request.user.id, request.params.id)
        return reply.send({ data: { url } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}
