import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { useNotesStore } from '../../store/notesStore'
import { useAiStore } from '../../store/aiStore'
import { chatWithNotes } from '../../services/aiApi'

export default function AiChat() {
  const { isChatOpen, setChatOpen } = useUiStore()
  const { notes } = useNotesStore()
  const { hasApiKey } = useAiStore()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!isChatOpen) return null

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    if (!hasApiKey()) {
      setError('Configure sua API Key nas configurações primeiro.')
      return
    }

    setError(null)
    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const replyContent = await chatWithNotes(newMessages, notes)
      setMessages([...newMessages, { role: 'assistant', content: replyContent }])
    } catch (e) {
      setError(e.message || 'Erro ao comunicar com a IA.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 100,
      width: 380, height: 500, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', border: '1px solid var(--border)',
      borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      animation: 'slideUp 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)', borderTopLeftRadius: 12, borderTopRightRadius: 12
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--accent)" /> Segundo Cérebro (IA)
        </span>
        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setChatOpen(false)}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 'auto' }}>
            <Bot size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontSize: 13, margin: 0 }}>Pergunte qualquer coisa sobre suas notas!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              padding: '10px 14px', borderRadius: 12, maxWidth: '85%',
              borderBottomRightRadius: msg.role === 'user' ? 2 : 12,
              borderBottomLeftRadius: msg.role === 'assistant' ? 2 : 12,
              fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap'
            }}>
              {msg.content}
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 12, borderBottomLeftRadius: 2 }}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 16px', background: '#fef2f2', color: '#b91c1c', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte às suas notas..."
            disabled={isLoading}
            rows={2}
            style={{ width: '100%', paddingRight: 40, resize: 'none', fontFamily: 'inherit', fontSize: 13 }}
          />
          <button 
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ position: 'absolute', right: 4, bottom: 4, padding: 6, width: 32, height: 32, justifyContent: 'center' }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
