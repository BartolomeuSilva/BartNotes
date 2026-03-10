import { test, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app.js'

let app

beforeAll(async () => {
    app = buildApp()
    await app.ready()
})

afterAll(async () => {
    // Clean up test data if possible, but for simple MVP we just close
    await app.prisma.user.deleteMany({ where: { email: 'test@example.com' } })
    await app.close()
})

test('Auth Flow: Register, Login and Me', async () => {
    // 1. Register
    const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123'
        }
    })
    expect(regRes.statusCode).toBe(201)

    // 2. Login
    const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
            email: 'test@example.com',
            password: 'password123'
        }
    })
    expect(loginRes.statusCode).toBe(200)
    const loginData = JSON.parse(loginRes.payload)
    expect(loginData.data.accessToken).toBeDefined()

    const token = loginData.data.accessToken

    // 3. Get Me
    const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
            authorization: `Bearer ${token}`
        }
    })
    expect(meRes.statusCode).toBe(200)
    const meData = JSON.parse(meRes.payload)
    expect(meData.data.email).toBe('test@example.com')
})
