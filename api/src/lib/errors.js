export class ApiError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message)
        this.code = code
        this.statusCode = statusCode
    }
}

export function handleApiError(error, reply) {
    if (error instanceof ApiError) {
        return reply.code(error.statusCode).send({
            error: {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode
            }
        })
    }

    console.error(error)

    return reply.code(500).send({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno no servidor',
            statusCode: 500
        }
    })
}
