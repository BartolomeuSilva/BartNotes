import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useInstallPWA } from '../hooks/useInstallPWA'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { canInstall, install, ios, showIOSHint, setShowIOSHint } = useInstallPWA()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.message || err?.response?.data?.error?.message || 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 'calc(env(safe-area-inset-top, 0px) + 20px) calc(env(safe-area-inset-right, 0px) + 20px) calc(env(safe-area-inset-bottom, 0px) + 20px) calc(env(safe-area-inset-left, 0px) + 20px)',
    }}>
      {/* Decorative background */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 380, animation: 'slideUp 0.3s ease-out' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/logo.png" alt="BartNotes" style={{ display: 'block', width: 72, height: 72, borderRadius: 16, margin: '0 auto 16px', objectFit: 'contain' }} />
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: '1.8rem',
            fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px',
          }}>BartNotes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Suas notas, sempre consigo
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                Senha
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6,
                padding: '8px 12px', fontSize: 13, color: '#b91c1c',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', padding: '14px', marginTop: 4, fontSize: 15, opacity: loading ? 0.7 : 1, borderRadius: 10, minHeight: 52 }}
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Criar conta
          </Link>
        </p>

        {/* Install PWA */}
        {canInstall && (
          <div style={{ position: 'relative', marginTop: 16 }}>
            <button
              onClick={install}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: 'linear-gradient(135deg, var(--accent), #b45309)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 2px 12px rgba(217,119,6,0.35)',
                transition: 'opacity 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <Download size={16} />
              Instalar App
            </button>

            {/* iOS hint */}
            {ios && showIOSHint && (
              <div style={{
                marginTop: 10,
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
                fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                position: 'relative',
              }}>
                <button
                  onClick={() => setShowIOSHint(false)}
                  style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}
                >×</button>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-primary)' }}>Instalar no iPhone / iPad</p>
                <p style={{ margin: 0 }}>
                  1. Toque em <strong>Compartilhar ⎙</strong> no Safari<br />
                  2. Toque em <strong>"Adicionar à Tela Inicial" ＋</strong>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
