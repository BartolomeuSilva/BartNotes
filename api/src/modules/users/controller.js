import { handleApiError } from '../../lib/errors.js'
import * as userService from './service.js'

export async function statsHandler(request, reply) {
    try {
        const stats = await userService.getUserStats(this.prisma, request.user.id)
        return reply.send({ data: stats })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function updateProfileHandler(request, reply) {
    try {
        const user = await userService.updateProfile(this.prisma, request.user.id, request.body)
        return reply.send({ data: user })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function changePasswordHandler(request, reply) {
    try {
        await userService.changePassword(
            this.prisma,
            request.user.id,
            request.body.currentPassword,
            request.body.newPassword
        )
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function deleteAccountHandler(request, reply) {
    try {
        await userService.deleteAccount(this.prisma, request.user.id)
        reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })
        return reply.send({ data: { success: true } })
    } catch (err) {
        return handleApiError(err, reply)
    }
}

export async function exportHandler(request, reply) {
    try {
        const data = await userService.exportData(this.prisma, request.user.id)
        reply.header('Content-Disposition', 'attachment; filename="export.json"')
        reply.type('application/json')
        return reply.send(data)
    } catch (err) {
        return handleApiError(err, reply)
    }
}
