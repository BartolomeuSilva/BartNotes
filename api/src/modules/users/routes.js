import * as ctrl from './controller.js'
import { updateProfileSchema, changePasswordSchema } from './schema.js'

export default async function userRoutes(fastify, opts) {
    fastify.addHook('preValidation', fastify.authenticate)

    fastify.get('/stats', ctrl.statsHandler)
    fastify.put('/profile', { schema: { body: updateProfileSchema } }, ctrl.updateProfileHandler)
    fastify.put('/password', { schema: { body: changePasswordSchema } }, ctrl.changePasswordHandler)
    fastify.delete('/account', ctrl.deleteAccountHandler)
    fastify.get('/export', ctrl.exportHandler)
}
