import { test, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/app.js'

let app

beforeAll(async () => {
    app = buildApp()
    await app.ready()
})

afterAll(async () => {
    await app.close()
})

test('GET /health returns status ok', async () => {
    const response = await app.inject({
        method: 'GET',
        url: '/health'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.status).toBe('ok')
    expect(payload.timestamp).toBeDefined()
})
