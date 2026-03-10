import bcrypt from 'bcrypt'
import { ApiError } from '../../lib/errors.js'

export async function registerUser(prisma, data) {
    const { email, username, password } = data

    const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] }
    })

    if (existingUser) {
        if (existingUser.email === email) {
            throw new ApiError('EMAIL_IN_USE', 'Email já está em uso', 409)
        }
        throw new ApiError('USERNAME_IN_USE', 'Nome de usuário já está em uso', 409)
    }

    const password_hash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password_hash
        }
    })

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at
    }
}

export async function authenticateUser(prisma, data) {
    const { email, password } = data

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new ApiError('INVALID_CREDENTIALS', 'Email ou senha inválidos', 401)
    }

    if (!user.is_active) {
        throw new ApiError('ACCOUNT_DISABLED', 'Esta conta foi desativada', 403)
    }

    return user
}
