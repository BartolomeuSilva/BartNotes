import { useState } from 'react'
import { X, Globe, Loader2, Check, Sparkles, AlertCircle } from 'lucide-react'
import { useClipperStore } from '../../store/clipperStore'
import { useUiStore } from '../../store/uiStore'
import { useNotesStore } from '../../store/notesStore'
import { useAiStore } from '../../store/aiStore'
import { clipUrl } from '../../services/clipperApi'

const TIMEOUT_MS = 15000

export default function WebClipper() {
  const { isOpen, url, isLoading, extractedContent, error, setOpen, setUrl, setLoading, setContent, setError, reset } = useClipperStore()
  const { toast } = useUiStore()
  const { createNote } = useNotesStore()
  const { hasApiKey } = useAiStore()

  const [includeSummary, setIncludeSummary] = useState(false)

  const handleClip = async (e) => {
    if (e) e.preventDefault()
    
    if (!url.trim()) {
      setError('Digite uma URL')
      return
    }

    if (isLoading) return

    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl
    }

    setLoading(true)
    setError(null)

    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Tempo esgotado (15s). Tente outra URL.')), TIMEOUT_MS)
    })

    try {
      const result = await Promise.race([clipUrl(validUrl), timeoutPromise])
      clearTimeout(timeoutId)
      setContent(result)
    } catch (e) {
      clearTimeout(timeoutId)
      setError(e.message || 'Erro ao capturar página')
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    if (!extractedContent || isLoading) return

    setLoading(true)

    try {
      await createNote({
        title: extractedContent.title || 'Nota capturada',
        content: extractedContent.content,
      })

      toast('Página capturada como nota')
      reset()
      setOpen(false)
    } catch (e) {
      toast(e.message || 'Erro ao salvar nota')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: 12, width: '90%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={16} /> Capturar Página Web
          </span>
          <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { reset(); setOpen(false) }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!extractedContent ? (
            <>
              <input
                className="input"
                placeholder="Cole a URL (ex: https://exemplo.com)"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleClip()
                  }
                }}
                disabled={isLoading}
                style={{ width: '100%', marginBottom: 12 }}
              />

              {error && (
                <div style={{
                  padding: 12, background: '#fef2f2', borderRadius: 8,
                  color: '#b91c1c', fontSize: 13, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleClip}
                disabled={isLoading}
                style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                {isLoading ? 'Capturando...' : 'Capturar'}
              </button>
            </>
          ) : (
            <>
              <div style={{
                padding: 12, background: 'var(--bg-secondary)', borderRadius: 8,
                maxHeight: 200, overflow: 'auto', fontSize: 13,
                whiteSpace: 'pre-wrap', marginBottom: 12,
              }}>
                <strong>{extractedContent.title}</strong>
                {'\n\n'}
                {extractedContent.content.slice(0, 300)}...
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => setContent(null)}
                  disabled={isLoading}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Capturar outro
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={isLoading}
                  style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
