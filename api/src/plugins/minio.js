import fp from 'fastify-plugin'
import * as Minio from 'minio'

export default fp(async (fastify, opts) => {
    const minioClient = new Minio.Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: false,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    })

    fastify.decorate('minio', minioClient)
})
