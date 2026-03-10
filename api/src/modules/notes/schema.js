import { z } from 'zod'

export const createNoteSchema = z.object({
    title: z.string().max(500).optional(),
    content: z.string().optional(),
    tagIds: z.array(z.string().uuid()).optional()
})

export const updateNoteSchema = z.object({
    title: z.string().max(500).optional(),
    content: z.string().optional(),
    tagIds: z.array(z.string().uuid()).optional()
})

export const noteQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(20),
    q: z.string().optional(),
    tag: z.string().uuid().optional(),
    filter: z.enum(['all', 'archived', 'deleted', 'pinned']).default('all'),
    sort: z.enum(['updated_at', 'created_at', 'title']).default('updated_at'),
    order: z.enum(['desc', 'asc']).default('desc')
})
