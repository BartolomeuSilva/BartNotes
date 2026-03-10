import { handleApiError } from '../../lib/errors.js'
import * as noteService from './service.js'
// noteService functions now return serialized (camelCase) objects

export async function createHandler(request, reply) {
    try {
        const note = await noteService.createNote(this.prisma, request.user.id, request.body)
        return reply.code(201).send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function listHandler(request, reply) {
    try {
        const result = await noteService.getNotes(this.prisma, request.user.id, request.query)
        return reply.send({ data: result.data, meta: result.meta })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function getHandler(request, reply) {
    try {
        const note = await noteService.getNoteByIdPublic(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function updateHandler(request, reply) {
    try {
        const note = await noteService.updateNote(this.prisma, request.user.id, request.params.id, request.body)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function deleteHandler(request, reply) {
    try {
        await noteService.deleteNoteSoft(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function deletePermanentHandler(request, reply) {
    try {
        await noteService.deleteNotePermanent(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function restoreHandler(request, reply) {
    try {
        const note = await noteService.restoreNote(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function pinHandler(request, reply) {
    try {
        const note = await noteService.togglePinNote(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function archiveHandler(request, reply) {
    try {
        const note = await noteService.toggleArchiveNote(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function versionsHandler(request, reply) {
    try {
        const versions = await noteService.getNoteVersions(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: versions })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function duplicateHandler(request, reply) {
    try {
        const note = await noteService.duplicateNote(this.prisma, request.user.id, request.params.id)
        return reply.send({ data: note })
    } catch (err) {
        return handleApiError(err, reply)
    }
}
