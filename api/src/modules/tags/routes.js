import * as ctrl from './controller.js'
import { tagSchema } from './schema.js'

export default async function tagsRoutes(fastify, opts) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/', ctrl.listHandler)
    fastify.post('/', { schema: { body: tagSchema } }, ctrl.createHandler)
    fastify.put('/:id', { schema: { body: tagSchema } }, ctrl.updateHandler)
    fastify.delete('/:id', ctrl.deleteHandler)
}
