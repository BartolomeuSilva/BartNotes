import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod'

import prismaPlugin from './plugins/prisma.js'
import minioPlugin from './plugins/minio.js'
import authPlugin from './plugins/auth.js'

import authRoutes from './modules/auth/routes.js'
import notesRoutes from './modules/notes/routes.js'
import tagsRoutes from './modules/tags/routes.js'
import attachmentsRoutes from './modules/attachments/routes.js'
import usersRoutes from './modules/users/routes.js'

// Initialize Fastify app
export function buildApp() {
    const app = Fastify({
        logger: true
    })

    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)

    // Middleware & Security
    app.register(cors, {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })

    app.register(helmet)

    app.register(rateLimit, {
        max: 10000,
        timeWindow: '1 minute'
    })

    // Auth Plugins
    app.register(jwt, {
        secret: process.env.JWT_SECRET || 'super_secret'
    })

    app.register(cookie)

    // Multipart for attachments
    app.register(multipart, {
        limits: {
            fileSize: parseInt(process.env.MAX_ATTACHMENT_SIZE_MB || '10') * 1024 * 1024
        }
    })

    // Custom DB and logic Plugins
    app.register(prismaPlugin)
    app.register(minioPlugin)
    app.register(authPlugin)

    // Register Routes
    app.register(authRoutes, { prefix: '/api/v1/auth' })
    app.register(notesRoutes, { prefix: '/api/v1/notes' })
    app.register(tagsRoutes, { prefix: '/api/v1/tags' })
    app.register(attachmentsRoutes, { prefix: '/api/v1' })
    app.register(usersRoutes, { prefix: '/api/v1/user' })

    // Simple search route plugin
    app.register(async (instance) => {
        instance.addHook('preValidation', instance.authenticate)

        instance.get('/api/v1/search', async (request, reply) => {
            const { q, limit = 10, highlight = 'true' } = request.query
            const where = {
                user_id: request.user.id,
                is_deleted: false,
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { content: { contains: q, mode: 'insensitive' } }
                ]
            }

            const results = await instance.prisma.note.findMany({
                where,
                take: parseInt(limit),
                orderBy: { updated_at: 'desc' }
            })

            const data = results.map(n => {
                let snippet = n.content.substring(0, 100)
                if (highlight === 'true' && q) {
                    snippet = snippet.replace(new RegExp(`(${q})`, 'gi'), '<mark>$1</mark>')
                }
                return {
                    id: n.id,
                    title: n.title,
                    snippet: snippet + '...',
                    updated_at: n.updated_at
                }
            })

            return reply.send({ data })
        })
    })

    // Basic healthcheck route
    app.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() }
    })

    return app
}
