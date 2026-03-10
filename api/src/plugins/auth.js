import fp from 'fastify-plugin'

export default fp(async (fastify, opts) => {
    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.code(401).send({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token inválido ou expirado',
                    statusCode: 401
                }
            })
        }
    })
})
