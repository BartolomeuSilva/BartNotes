import { z } from 'zod'

export const tagSchema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().max(7).optional()
})
