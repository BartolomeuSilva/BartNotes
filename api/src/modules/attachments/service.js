import { v4 as uuidv4 } from 'uuid'
import { ApiError } from '../../lib/errors.js'

export async function uploadAttachment(fastify, userId, noteId, file) {
    const ext = file.filename.split('.').pop()
    const fileUuid = uuidv4()
    const key = `${userId}/${noteId}/${fileUuid}.${ext}`
    const bucketName = process.env.MINIO_BUCKET_ATTACHMENTS || 'notes-attachments'

    const buffer = await file.toBuffer()

    // Verify if note exists and belongs to user
    const note = await fastify.prisma.note.findUnique({ where: { id: noteId } })
    if (!note || note.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Nota não encontrada', 404)
    }

    // Upload to MinIO
    await fastify.minio.putObject(
        bucketName,
        key,
        buffer,
        buffer.length,
        { 'Content-Type': file.mimetype }
    )

    // Save to DB
    const attachment = await fastify.prisma.attachment.create({
        data: {
            user_id: userId,
            note_id: noteId,
            filename: file.filename,
            minio_key: key,
            mime_type: file.mimetype,
            size_bytes: buffer.length
        }
    })

    // Prisma BigInt needs to be stringified for JSON
    return { ...attachment, size_bytes: attachment.size_bytes.toString() }
}

export async function listAttachments(fastify, userId, noteId) {
    const note = await fastify.prisma.note.findUnique({ where: { id: noteId } })
    if (!note || note.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Nota não encontrada', 404)
    }

    const attachments = await fastify.prisma.attachment.findMany({
        where: { note_id: noteId }
    })

    return attachments.map(a => ({ ...a, size_bytes: a.size_bytes.toString() }))
}

export async function deleteAttachment(fastify, userId, attachmentId) {
    const attachment = await fastify.prisma.attachment.findUnique({ where: { id: attachmentId } })
    if (!attachment || attachment.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Anexo não encontrado', 404)
    }

    const bucketName = process.env.MINIO_BUCKET_ATTACHMENTS || 'notes-attachments'

    // Remove from MinIO
    await fastify.minio.removeObject(bucketName, attachment.minio_key)

    // Remove from DB
    await fastify.prisma.attachment.delete({ where: { id: attachmentId } })
    return true
}

export async function getAttachmentUrl(fastify, userId, attachmentId) {
    const attachment = await fastify.prisma.attachment.findUnique({ where: { id: attachmentId } })
    if (!attachment || attachment.user_id !== userId) {
        throw new ApiError('NOT_FOUND', 'Anexo não encontrado', 404)
    }

    const bucketName = process.env.MINIO_BUCKET_ATTACHMENTS || 'notes-attachments'

    // Generate 1-hour presigned URL
    const url = await fastify.minio.presignedGetObject(bucketName, attachment.minio_key, 60 * 60)

    return url
}
