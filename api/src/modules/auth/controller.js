import { handleApiError } from '../../lib/errors.js'
import { registerUser, authenticateUser } from './service.js'

export async function registerHandler(request, reply) {
    try {
        const data = request.body
        const user = await registerUser(this.prisma, data)

        return reply.code(201).send({
            data: user,
            meta: { timestamp: new Date().toISOString(), version: "1" }
        })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function loginHandler(request, reply) {
    try {
        const data = request.body
        const user = await authenticateUser(this.prisma, data)

        // Generate tokens
        const accessToken = await reply.jwtSign({
            id: user.id, username: user.username
        }, { expiresIn: '15m' })

        const refreshToken = await reply.jwtSign({
            id: user.id, type: 'refresh'
        }, {
            expiresIn: '30d',
            secret: process.env.JWT_REFRESH_SECRET || 'super_secret2'
        })

        reply.setCookie('refreshToken', refreshToken, {
            path: '/api/v1/auth/refresh',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 // 30 days
        })

        return reply.send({
            data: {
                accessToken,
                expiresIn: 900
            },
            meta: { timestamp: new Date().toISOString(), version: "1" }
        })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function refreshHandler(request, reply) {
    try {
        const token = request.cookies.refreshToken

        if (!token) {
            return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } })
        }

        const decoded = await request.server.jwt.verify(token, {
            secret: process.env.JWT_REFRESH_SECRET || 'super_secret2'
        })

        if (decoded.type !== 'refresh') {
            return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token type' } })
        }

        // Check if user exists and is active
        const user = await this.prisma.user.findUnique({ where: { id: decoded.id } })
        if (!user || !user.is_active) {
            return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or disabled account' } })
        }

        const accessToken = await reply.jwtSign({
            id: user.id, username: user.username
        }, { expiresIn: '15m' })

        return reply.send({
            data: {
                accessToken,
                expiresIn: 900
            }
        })
    } catch (err) {
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } })
    }
}

export async function logoutHandler(request, reply) {
    reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })
    return reply.send({ data: { success: true } })
}

export async function meHandler(request, reply) {
    try {
        const user = await this.prisma.user.findUnique({
            where: { id: request.user.id },
            select: {
                id: true, email: true, username: true, avatar_url: true, created_at: true
            }
        })

        if (!user) {
            return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
        }

        return reply.send({ data: user })
    } catch (err) {
        return handleApiError(err, reply)
    }
}
