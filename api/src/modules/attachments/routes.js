import * as ctrl from './controller.js'

export default async function attachmentRoutes(fastify, opts) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.post('/notes/:noteId/attachments', ctrl.uploadHandler)
    fastify.get('/notes/:noteId/attachments', ctrl.listHandler)
    fastify.delete('/attachments/:id', ctrl.deleteHandler)
    fastify.get('/attachments/:id/url', ctrl.getUrlHandler)
}
