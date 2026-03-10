import * as ctrl from './controller.js'
import { createNoteSchema, updateNoteSchema, noteQuerySchema } from './schema.js'

export default async function notesRoutes(fastify, opts) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/', { schema: { querystring: noteQuerySchema } }, ctrl.listHandler)
    fastify.post('/', { schema: { body: createNoteSchema } }, ctrl.createHandler)
    fastify.get('/:id', ctrl.getHandler)
    fastify.put('/:id', { schema: { body: updateNoteSchema } }, ctrl.updateHandler)
    fastify.delete('/:id', ctrl.deleteHandler)
    fastify.delete('/:id/permanent', ctrl.deletePermanentHandler)
    fastify.post('/:id/restore', ctrl.restoreHandler)
    fastify.post('/:id/pin', ctrl.pinHandler)
    fastify.post('/:id/archive', ctrl.archiveHandler)
    fastify.get('/:id/versions', ctrl.versionsHandler)
    fastify.post('/:id/duplicate', ctrl.duplicateHandler)
}
