import { z } from 'zod'

export const updateProfileSchema = z.object({
    username: z.string().min(3).max(50).optional(),
    avatar_url: z.string().url().optional()
})

export const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8)
})
