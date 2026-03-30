import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Trash2, Moon, Sun, User, Lock, Sparkles, Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { useAiStore, AI_PROVIDERS } from '../store/aiStore'
import { userApi } from '../services/supabaseApi'
import ConfirmModal from '../components/ui/ConfirmModal'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout, refreshUser } = useAuthStore()
  const { theme, toggleTheme, toast } = useUiStore()
  const { apiKey, provider, model, customEndpoint, autoSummarize, autoTags, setApiKey, setProvider, setModel, setCustomEndpoint, setAutoSummarize, setAutoTags } = useAiStore()
  const [section, setSection] = useState('profile')
  const [username, setUsername] = useState(user?.username || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiKeyInput, setAiKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [endpointInput, setEndpointInput] = useState(customEndpoint)

  const currentProvider = AI_PROVIDERS.find(p => p.id === provider)
  const providerModels = currentProvider?.models || []

  const handleSaveAI = () => {
    setApiKey(aiKeyInput)
    if (provider === 'custom') {
      setCustomEndpoint(endpointInput)
    }
    toast('Configurações de IA guardadas')
  }

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    setAiKeyInput('')
    setEndpointInput('')
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await userApi.updateProfile({ username })
      await refreshUser()
      toast('Perfil atualizado')
    } catch { toast('Erro ao atualizar') }
    finally { setLoading(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPw !== confirmPw) return toast('As senhas não coincidem')
    if (newPw.length < 8) return toast('Mínimo 8 caracteres')
    setLoading(true)
    try {
      await userApi.changePassword({ currentPassword: currentPw, newPassword: newPw })
      toast('Senha alterada')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch { toast('Senha atual incorreta') }
    finally { setLoading(false) }
  }

  const handleExport = async () => {
    try {
      const blob = await userApi.exportData()
      const url = URL.createObjectURL(blob.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'bartnotes-export.json'; a.click()
      URL.revokeObjectURL(url)
      toast('Exportação iniciada')
    } catch { toast('Erro ao exportar') }
  }

  const handleDeleteAccount = async () => {
    try {
      await userApi.deleteAccount()
      await logout()
      navigate('/login')
    } catch { toast('Erro ao excluir conta') }
  }

  const sections = [
    { id: 'profile', label: 'Perfil', icon: <User size={14} /> },
    { id: 'ai', label: 'Inteligência AI', icon: <Sparkles size={14} /> },
    { id: 'security', label: 'Segurança', icon: <Lock size={14} /> },
    { id: 'appearance', label: 'Aparência', icon: theme === 'dark' ? <Moon size={14} /> : <Sun size={14} /> },
    { id: 'data', label: 'Dados', icon: <Download size={14} /> },
  ]

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg-primary)' }}>
      {/* Left nav */}
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ justifyContent: 'flex-start', gap: 8, marginBottom: 16 }}>
          <ChevronLeft size={14} /> Voltar
        </button>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, padding: '0 12px', marginBottom: 8, color: 'var(--text-primary)' }}>
          Configurações
        </h2>
        {sections.map(s => (
          <button
            key={s.id}
            className="btn btn-ghost"
            onClick={() => setSection(s.id)}
            style={{ justifyContent: 'flex-start', gap: 8, fontWeight: section === s.id ? 500 : 400, background: section === s.id ? 'var(--bg-tertiary)' : 'transparent', color: section === s.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '40px 48px', maxWidth: 560 }}>
        {section === 'profile' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', marginBottom: 24 }}>Perfil</h3>
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
                <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>O email não pode ser alterado</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nome de usuário</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '8px 20px' }}>
                {loading ? 'Salvando…' : 'Salvar'}
              </button>
            </form>
          </div>
        )}

        {section === 'ai' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', marginBottom: 8 }}>Inteligência Artificial</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Configure um provedor de IA para usar recursos inteligente nas suas notas.
            </p>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-primary)' }}>Provedor de IA</h4>
              <select
                className="input"
                value={provider}
                onChange={e => handleProviderChange(e.target.value)}
                style={{ width: '100%', marginBottom: 12 }}
              >
                {AI_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {provider === 'custom' ? (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Endpoint da API</p>
                  <input
                    className="input"
                    value={endpointInput}
                    onChange={e => setEndpointInput(e.target.value)}
                    placeholder="https://api.exemplo.com/v1/chat/completions"
                  />
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {provider === 'openai' && 'Obtenha sua API key em '}
                    {provider === 'anthropic' && 'Obtenha sua API key em '}
                    {provider === 'google' && 'Obtenha sua API key em '}
                    {provider === 'deepseek' && 'Obtenha sua API key em '}
                    {provider === 'openai' && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>platform.openai.com</a>}
                    {provider === 'anthropic' && <a href="https://console.anthropic.com/" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>console.anthropic.com</a>}
                    {provider === 'google' && <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>aistudio.google.com</a>}
                    {provider === 'deepseek' && <a href="https://platform.deepseek.com/" target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>platform.deepseek.com</a>}
                  </p>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showKey ? 'text' : 'password'}
                      value={aiKeyInput}
                      onChange={e => setAiKeyInput(e.target.value)}
                      placeholder={provider === 'anthropic' ? 'sk-ant-...' : provider === 'google' ? 'AIza...' : 'sk-...'}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
                    >
                      {showKey ? <Check size={16} /> : <span style={{ fontSize: 14 }}>👁️</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-primary)' }}>Modelo</h4>
              {providerModels.length > 0 ? (
                <select
                  className="input"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {providerModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="Nome do modelo (ex: gpt-3.5-turbo)"
                />
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveAI}
              style={{ gap: 6 }}
              disabled={!aiKeyInput.trim() && provider !== 'custom'}
            >
              <Check size={14} /> Guardar Configurações
            </button>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-primary)' }}>Automação</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                <input type="checkbox" checked={autoSummarize} onChange={e => setAutoSummarize(e.target.checked)} style={{ width: 16, height: 16 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Resumo automático</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Gerar resumo ao salvar nota</p>
                </div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoTags} onChange={e => setAutoTags(e.target.checked)} style={{ width: 16, height: 16 }} />
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Tags automáticas</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Sugerir tags baseadas no conteúdo</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Branding Footer moved here */}
        <div style={{ padding: '60px 0 20px', borderTop: '1px solid var(--border-subtle)', marginTop: 80, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            BartNotes v1.0.0
          </p>
        </div>

        {section === 'security' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', marginBottom: 24 }}>Segurança</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['Senha atual', currentPw, setCurrentPw], ['Nova senha', newPw, setNewPw], ['Confirmar nova senha', confirmPw, setConfirmPw]].map(([label, val, setter]) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input className="input" type="password" value={val} onChange={e => setter(e.target.value)} placeholder="••••••••" />
                </div>
              ))}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', padding: '8px 20px' }}>
                {loading ? 'A alterar…' : 'Alterar senha'}
              </button>
            </form>
          </div>
        )}

        {section === 'appearance' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', marginBottom: 24 }}>Aparência</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {['light', 'dark'].map(t => (
                <button
                  key={t}
                  onClick={() => { if (theme !== t) toggleTheme() }}
                  style={{
                    padding: '16px 24px', borderRadius: 10, border: '2px solid',
                    borderColor: theme === t ? 'var(--accent)' : 'var(--border)',
                    background: t === 'dark' ? '#1a1714' : '#f7f6f3',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 100,
                  }}
                >
                  {t === 'dark' ? <Moon size={20} color={t === 'dark' ? '#f0ece4' : '#211e1a'} /> : <Sun size={20} color="#211e1a" />}
                  <span style={{ fontSize: 13, fontWeight: 500, color: t === 'dark' ? '#f0ece4' : '#211e1a' }}>
                    {t === 'light' ? 'Claro' : 'Escuro'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'data' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', marginBottom: 24 }}>Dados</h3>

            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-primary)' }}>Exportar notas</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Exporta todas as suas notas em formato ZIP com JSON e Markdown.
              </p>
              <button className="btn btn-ghost" onClick={handleExport} style={{ gap: 6, border: '1px solid var(--border)' }}>
                <Download size={14} /> Exportar ZIP
              </button>
            </div>

            <div style={{ border: '1px solid #fecaca', borderRadius: 10, padding: 20, background: '#fef2f2' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px', color: '#b91c1c' }}>Zona de perigo</h4>
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 16px' }}>
                Excluir a conta remove permanentemente todos os seus dados, incluindo notas e anexos.
              </p>
              <button className="btn" onClick={() => setConfirmDelete(true)} style={{ background: '#dc2626', color: '#fff', gap: 6 }}>
                <Trash2 size={14} /> Excluir conta
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Excluir conta?"
          message="Esta ação é irreversível. Todos os seus dados serão apagados permanentemente."
          confirmLabel="Excluir conta"
          danger
          onConfirm={handleDeleteAccount}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
