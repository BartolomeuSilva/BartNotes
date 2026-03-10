import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

const api = axios.create({ baseURL: API_URL, withCredentials: true })

// In-memory access token
let accessToken = null

export function setAccessToken(token) { accessToken = token }
export function getAccessToken() { return accessToken }

// Attach token to every request
api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Auto-refresh on 401
let isRefreshing = false
let queue = []

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      console.warn('[api] 401 Unauthorized for:', original.url)
      if (isRefreshing) {
        console.log('[api] Already refreshing, queuing request...')
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      isRefreshing = true
      console.log('[api] Attempting token refresh...')
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        const token = data.data.accessToken
        console.log('[api] Refresh successful!')
        setAccessToken(token)
        queue.forEach(p => p.resolve(token))
        queue = []
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch (refreshErr) {
        console.error('[api] Refresh failed:', refreshErr.response?.status)
        queue.forEach(p => p.reject(refreshErr))
        queue = []
        setAccessToken(null)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──
export const authApi = {
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// ── Notes ──
export const notesApi = {
  list: (params) => api.get('/notes', { params }),
  get: (id) => api.get(`/notes/${id}`),
  create: (body) => api.post('/notes', body),
  update: (id, body) => api.put(`/notes/${id}`, body),
  delete: (id) => api.delete(`/notes/${id}`),
  deletePermanent: (id) => api.delete(`/notes/${id}/permanent`),
  restore: (id) => api.post(`/notes/${id}/restore`),
  pin: (id) => api.post(`/notes/${id}/pin`),
  archive: (id) => api.post(`/notes/${id}/archive`),
  versions: (id) => api.get(`/notes/${id}/versions`),
  duplicate: (id) => api.post(`/notes/${id}/duplicate`),
}

// ── Tags ──
export const tagsApi = {
  list: () => api.get('/tags'),
  create: (body) => api.post('/tags', body),
  update: (id, body) => api.put(`/tags/${id}`, body),
  delete: (id) => api.delete(`/tags/${id}`),
}

// ── Search ──
export const searchApi = {
  search: (q, params) => api.get('/search', { params: { q, ...params } }),
}

// ── User ──
export const userApi = {
  stats: () => api.get('/user/stats'),
  updateProfile: (body) => api.put('/user/profile', body),
  changePassword: (body) => api.put('/user/password', body),
  exportData: () => api.get('/user/export', { responseType: 'blob' }),
  deleteAccount: () => api.delete('/user/account'),
}

export default api
