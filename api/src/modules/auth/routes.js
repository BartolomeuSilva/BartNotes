import { registerHandler, loginHandler, refreshHandler, logoutHandler, meHandler } from './controller.js'
import { registerSchema, loginSchema } from './schema.js'

export default async function authRoutes(fastify, opts) {
    fastify.post('/register', {
        schema: {
            body: registerSchema
        }
    }, registerHandler)

    fastify.post('/login', {
        schema: {
            body: loginSchema
        }
    }, loginHandler)

    fastify.post('/refresh', refreshHandler)

    fastify.post('/logout', {
        preValidation: [fastify.authenticate]
    }, logoutHandler)

    fastify.get('/me', {
        preValidation: [fastify.authenticate]
    }, meHandler)
}
