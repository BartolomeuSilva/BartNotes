import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pin, Archive, Trash2, Tag, Eye, Edit3, Copy, RotateCcw, ChevronLeft, MoreHorizontal, Upload,
  X, ChevronDown, ChevronRight, LogOut, Download, Globe, Sparkles, ListTodo, Network, BookOpen, Calendar, Plus,
  Maximize, Clock, Mic, MicOff, Check, Loader2, MessageSquare, Heading1, Heading2, Heading3, List, Square, Code, FileText, Wand2
} from 'lucide-react'
import { useNotesStore } from '../../store/notesStore'
import { useTagsStore } from '../../store/tagsStore'
import { useUiStore } from '../../store/uiStore'
import { useAiStore } from '../../store/aiStore'
import { useVoiceStore } from '../../store/voiceStore'
import { notesApi } from '../../services/supabaseApi'
import { generateSummary, suggestTags, improveText, formatVoiceTranscript, transcribeAudio, generateCoverImage } from '../../services/aiApi'
import { debounce, markdownToHtml, countWords, countChars, extractTitle, TAG_COLORS } from '../../lib/utils'
import ConfirmModal from '../ui/ConfirmModal'

export default function NoteEditor({ noteId }) {
  const navigate = useNavigate()
  const { notes, createNote, activeNote, saveStatus, updateNote, deleteNote, deletePermanentNote, pinNote, archiveNote, duplicateNote, restoreNote, setActiveNote } = useNotesStore()
  const { tags, createTag } = useTagsStore()
  const { toast, setEditorOpen, isFocusMode, setFocusMode, setChatOpen } = useUiStore()
  const { hasApiKey } = useAiStore()
  const { isRecording, transcript, startRecording, stopRecording, reset, error, checkStoredTranscript, hasStoredTranscript } = useVoiceStore()

  useEffect(() => {
    const stored = checkStoredTranscript()
    if (stored && !isRecording) {
      setVoiceTranscript(stored)
    }
  }, [])

  useEffect(() => {
    if (!isRecording && transcript) {
      setVoiceTranscript(prev => {
        const newTranscript = prev ? `${prev} ${transcript}` : transcript
        return newTranscript
      })
    }
  }, [isRecording, transcript])

  const [titleLine, setTitleLine] = useState('')
  const [bodyContent, setBodyContent] = useState('')
  const [imageUrl, setImageUrl] = useState('') // Nova: Capa da nota
  const [viewMode, setViewMode] = useState('edit') // 'edit' | 'preview' | 'split'
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [versions, setVersions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)
  
  const handleAddTag = async (tagId) => {
    const currentTagIds = (activeNote.tags || []).map(t => t.id)
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId]
    await updateNote(activeNote.id, { tagIds: newTagIds })
    toast('Tags atualizadas')
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const tag = await createTag(newTagName.trim().toLowerCase(), selectedColor)
    await handleAddTag(tag.id)
    setNewTagName('')
    setShowTagPicker(false)
  }

  const insertBlock = (prefix, suffix = '') => {
    if (!textareaRef.current) return
    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const contentBefore = bodyContent.substring(0, start - 1)
    const contentAfter = bodyContent.substring(end)
    const newBody = contentBefore + prefix + suffix + contentAfter
    setBodyContent(newBody)
    if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, newBody))
    setSlashMenu({ ...slashMenu, isOpen: false })
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = start - 1 + prefix.length
        textareaRef.current.selectionStart = newPos
        textareaRef.current.selectionEnd = newPos
      }
    }, 0)
  }

  const handleAiSummarize = async () => {
    if (!hasApiKey()) { toast('Configure a API Key nas Configurações'); navigate('/settings'); return }
    setAiLoading(true)
    try {
      const summary = await generateSummary(getFullContent(titleLine, bodyContent))
      setAiSummary(summary)
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }

  const handleAiSuggestTags = async () => {
    if (!hasApiKey()) { toast('Configure a API Key nas Configurações'); navigate('/settings'); return }
    setAiLoading(true)
    try {
      const suggested = await suggestTags(getFullContent(titleLine, bodyContent))
      for (const tagName of suggested) {
        const existing = tags.find(t => t.name === tagName)
        if (existing) {
          await handleAddTag(existing.id)
        } else {
          const tag = await createTag(tagName, TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
          await handleAddTag(tag.id)
        }
      }
      toast('Tags sugeridas adicionadas')
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }

  const handleAiImprove = async () => {
    if (!hasApiKey()) { toast('Configure a API Key nas Configurações'); navigate('/settings'); return }
    setAiLoading(true)
    try {
      const improved = await improveText(bodyContent)
      setBodyContent(improved)
      if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, improved))
      toast('Texto melhorado')
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }

  const handleAiImproveSelection = async () => {
    if (!hasApiKey()) { toast('Configure a API Key'); return }
    if (!selectionMenu.text) return
    setAiLoading(true)
    try {
      const improved = await improveText(selectionMenu.text)
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const newBody = bodyContent.substring(0, start) + improved + bodyContent.substring(end)
      setBodyContent(newBody)
      if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, newBody))
      toast('Seleção melhorada')
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }

  const handleAiSummarizeSelection = async () => {
    if (!hasApiKey()) { toast('Configure a API Key'); return }
    if (!selectionMenu.text) return
    setAiLoading(true)
    try {
      const summary = await generateSummary(selectionMenu.text)
      setAiSummary(summary)
      setShowAiPanel(true)
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }

  const handleAiGenerateCover = async () => {
    if (!hasApiKey()) { toast('Configure a API Key'); return }
    setAiLoading(true)
    try {
      const url = await generateCoverImage(titleLine || 'Abstrato')
      setImageUrl(url)
      if (activeNote) await updateNote(activeNote.id, { imageUrl: url })
      toast('Capa gerada com sucesso!')
    } catch (e) { toast(e.message) }
    finally { setAiLoading(false) }
  }
  
  // Slash Commands State
  const [slashMenu, setSlashMenu] = useState({ isOpen: false, x: 0, y: 0, query: '' })
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)

  const slashCommands = [
    { id: 'h1', title: 'Título 1', icon: Heading1, action: () => insertBlock('# ') },
    { id: 'h2', title: 'Título 2', icon: Heading2, action: () => insertBlock('## ') },
    { id: 'h3', title: 'Título 3', icon: Heading3, action: () => insertBlock('### ') },
    { id: 'todo', title: 'Tarefa', icon: Square, action: () => insertBlock('- [ ] ') },
    { id: 'list', title: 'Lista', icon: List, action: () => insertBlock('- ') },
    { id: 'code', title: 'Bloco de Código', icon: Code, action: () => insertBlock('```\n', '\n```') },
    { id: 'ai-sum', title: 'IA: Resumir', icon: Wand2, action: handleAiSummarize },
    { id: 'ai-tags', title: 'IA: Sugerir Tags', icon: Wand2, action: handleAiSuggestTags },
    { id: 'ai-improve', title: 'IA: Melhorar Texto', icon: Wand2, action: handleAiImprove },
  ]

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFocusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFocusMode, setFocusMode])

  const titleRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const editorRef = useRef(null) // Para delegação de eventos

  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState({ isOpen: false, x: 0, y: 0, text: '' })
  
  // Link Preview State
  const [hoverPreview, setHoverPreview] = useState({ isOpen: false, x: 0, y: 0, note: null })

  // Event delegation para links no Preview
  useEffect(() => {
    const handleMouseOver = (e) => {
      const link = e.target.closest('.internal-link')
      if (link) {
        const title = link.getAttribute('data-notetitle')
        const found = notes.find(n => !n.isDeleted && n.title?.toLowerCase() === title?.toLowerCase())
        if (found) {
          const rect = link.getBoundingClientRect()
          setHoverPreview({
            isOpen: true,
            x: rect.left,
            y: rect.top - 10,
            note: found
          })
        }
      }
    }

    const handleMouseOut = (e) => {
      const link = e.target.closest('.internal-link')
      if (link) {
        setHoverPreview(prev => ({ ...prev, isOpen: false }))
      }
    }

    const container = editorRef.current
    if (container) {
      container.addEventListener('mouseover', handleMouseOver)
      container.addEventListener('mouseout', handleMouseOut)
    }
    return () => {
      if (container) {
        container.removeEventListener('mouseover', handleMouseOver)
        container.removeEventListener('mouseout', handleMouseOut)
      }
    }
  }, [notes, editorRef.current])

  const handleTextSelection = (e) => {
    const { selectionStart, selectionEnd, value } = e.target
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd).trim()
      if (selectedText.length > 2) {
        const { x, y } = getCursorXY(e.target, selectionEnd)
        setSelectionMenu({
          isOpen: true,
          x: Math.min(x, window.innerWidth - 300),
          y: Math.max(y - 50, 60), // Acima da seleção
          text: selectedText
        })
        return
      }
    }
    if (selectionMenu.isOpen) setSelectionMenu({ ...selectionMenu, isOpen: false })
  }

  const getFullContent = (title, body) => {
    const t = title.replace(/\n/g, ' ')
    return body ? `${t}\n\n${body}` : t
  }

  // Sync content when note changes
  useEffect(() => {
    if (activeNote) {
      setImageUrl(activeNote.imageUrl || '')
      const raw = activeNote.content || ''
      const newlineIdx = raw.indexOf('\n')
      if (newlineIdx === -1) {
        setTitleLine(raw)
        setBodyContent('')
      } else {
        setTitleLine(raw.slice(0, newlineIdx))
        setBodyContent(raw.slice(newlineIdx + 1).replace(/^\n+/, ''))
      }
    }
  }, [activeNote?.id])

  // Auto-focus title on open
  useEffect(() => {
    if (viewMode === 'edit' && titleRef.current) {
      titleRef.current.focus()
    }
  }, [activeNote?.id])

  const debouncedSave = useCallback(
    debounce((id, newContent) => {
      updateNote(id, { content: newContent })
    }, 1500),
    []
  )

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitleLine(val)
    if (activeNote) debouncedSave(activeNote.id, getFullContent(val, bodyContent))
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault()
      textareaRef.current?.focus()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, bodyContent))
    }
  }

  const handleChange = (e) => {
    const val = e.target.value
    const selection = e.target.selectionStart
    setBodyContent(val)
    if (activeNote) debouncedSave(activeNote.id, getFullContent(titleLine, val))

    // Detecção de Slash Command
    const lastChar = val[selection - 1]
    const beforeLast = val[selection - 2]
    
    if (lastChar === '/' && (!beforeLast || beforeLast === '\n' || beforeLast === ' ')) {
      const { x, y } = getCursorXY(e.target, selection)
      setSlashMenu({ isOpen: true, x, y, query: '' })
      setSlashSelectedIndex(0)
    } else if (slashMenu.isOpen) {
      if (lastChar === ' ' || lastChar === '\n') {
        setSlashMenu({ ...slashMenu, isOpen: false })
      } else {
        // Poderíamos filtrar por query aqui se quiséssemos busca no menu
        setSlashMenu({ ...slashMenu, query: '' }) 
      }
    }
  }

  const getCursorXY = (input, selectionPoint) => {
    const { offsetLeft, offsetTop } = input
    // Simples estimativa baseada na linha ocupada
    const lines = input.value.substr(0, selectionPoint).split('\n')
    const currentLine = lines.length
    const charInLine = lines[lines.length - 1].length
    
    // Valores aproximados para uma UX "boa o suficiente" sem bibliotecas pesadas
    const lineHeight = 28 // baseado no line-height 1.75 de 16px
    const charWidth = 9
    
    const x = Math.min(offsetLeft + 48 + (charInLine * charWidth), window.innerWidth - 260)
    const y = Math.min(offsetTop + 32 + (currentLine * lineHeight), window.innerHeight - 300)
    
    return { x, y }
  }


  const handleKeyDown = (e) => {
    if (slashMenu.isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashSelectedIndex(prev => (prev < slashCommands.length - 1 ? prev + 1 : prev))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        slashCommands[slashSelectedIndex].action()
        return
      }
      if (e.key === 'Escape') {
        setSlashMenu({ ...slashMenu, isOpen: false })
        return
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, bodyContent))
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newVal = bodyContent.slice(0, start) + '  ' + bodyContent.slice(end)
      setBodyContent(newVal)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2
          textareaRef.current.selectionEnd = start + 2
        }
      })
    }
  }

  const handlePreviewClick = async (e) => {
    const target = e.target.closest('.internal-link')
    if (target) {
      e.preventDefault()
      const title = target.getAttribute('data-notetitle')
      if (!title) return

      const existing = notes.find(n => !n.isDeleted && n.title === title)
      if (existing) {
        navigate(`/note/${existing.id}`)
      } else {
        const newNote = await createNote()
        await updateNote(newNote.id, { content: title + '\n\n' })
        navigate(`/note/${newNote.id}`)
      }
    }
  }

  const handlePin = async () => {
    await pinNote(activeNote.id)
    toast(activeNote.isPinned ? 'Nota desafixada' : 'Nota fixada')
  }

  const handleArchive = async () => {
    await archiveNote(activeNote.id)
    toast('Nota arquivada')
    navigate('/')
  }

  const handleDelete = async () => {
    setConfirmDelete(false)
    if (activeNote?.isDeleted) {
      await deletePermanentNote(activeNote.id)
      toast('Nota apagada permanentemente')
    } else {
      await deleteNote(activeNote.id)
      toast('Nota movida para a lixeira')
    }
    setEditorOpen(false)
    navigate('/')
  }

  const handleRestore = async () => {
    await restoreNote(activeNote.id)
    toast('Nota restaurada')
    navigate('/')
  }

  const handleDuplicate = async () => {
    const note = await duplicateNote(activeNote.id)
    toast('Nota duplicada')
    navigate(`/note/${note.id}`)
  }

  const handleLoadVersions = async () => {
    try {
      const { data } = await notesApi.versions(activeNote.id)
      setVersions(data.data)
      setShowVersions(true)
    } catch {
      toast('Erro ao carregar versões')
    }
  }

  const handleRestoreVersion = async (version) => {
    const raw = version.content || ''
    const newlineIdx = raw.indexOf('\n')
    if (newlineIdx === -1) { setTitleLine(raw); setBodyContent('') }
    else { setTitleLine(raw.slice(0, newlineIdx)); setBodyContent(raw.slice(newlineIdx + 1).replace(/^\n+/, '')) }
    await updateNote(activeNote.id, { content: version.content })
    setShowVersions(false)
    toast('Versão restaurada')
  }



  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleInsertTranscript = async () => {
    if (voiceTranscript) {
      let finalTranscript = voiceTranscript
      
      if (hasApiKey()) {
        setAiLoading(true)
        try {
          finalTranscript = await formatVoiceTranscript(voiceTranscript)
        } catch (e) {
          toast(e.message || 'Erro ao formatar voz com IA. Inserindo original.')
        } finally {
          setAiLoading(false)
        }
      }

      const newContent = bodyContent ? `${bodyContent}\n\n${finalTranscript}` : finalTranscript
      setBodyContent(newContent)
      if (activeNote) {
        await updateNote(activeNote.id, { content: getFullContent(titleLine, newContent) })
      }
      setVoiceTranscript('')
      reset()
      toast('Texto por voz inserido')
    }
  }

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!hasApiKey()) { 
      toast('Configure a API Key para usar a IA') 
      navigate('/settings') 
      return 
    }

    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      toast('Arquivo muito grande. Máximo 25MB.')
      e.target.value = ''
      return
    }
    
    setIsUploadingAudio(true)
    try {
      const text = await transcribeAudio(file)
      if (!text || !text.trim()) {
        throw new Error('Não foi possível extrair texto do áudio')
      }
      const newContent = bodyContent ? `${bodyContent}\n\n${text}` : text
      setBodyContent(newContent)
      if (activeNote) updateNote(activeNote.id, getFullContent(titleLine, newContent))
      toast('Áudio transcrito com sucesso!')
    } catch (err) {
      console.error('[NoteEditor] Erro ao transcrever áudio:', err)
      toast(err.message || 'Erro ao transcrever áudio. Tente novamente.')
    } finally {
      setIsUploadingAudio(false)
      e.target.value = ''
    }
  }

  if (!activeNote) {
    const TEMPLATES = [
      { id: 'blank', icon: '📝', title: 'Nota em Branco', desc: 'Comece do zero', content: '' },
      { id: 'meeting', icon: '📅', title: 'Ata de Reunião', desc: 'Pauta e decisões', content: `# Ata de Reunião\n**Data:** ${new Date().toLocaleDateString('pt-BR')}\n**Participantes:** \n\n## Pauta\n- \n\n## Decisões & Ações\n- [ ] ` },
      { id: 'daily', icon: '🌅', title: 'Diário Pessoal', desc: 'Reflexões do dia', content: `# Diário: ${new Date().toLocaleDateString('pt-BR')}\n\n**O que está na minha mente?**\n\n**Metas do Dia:**\n- [ ] \n- [ ] \n\n**Privilégios para agradecer hoje:**\n1. ` },
      { id: 'planning', icon: '🚀', title: 'Planejamento Semanal', desc: 'Foco e prioridades', content: `# 🎯 Foco da Semana\n\n## Top 3 Prioridades\n- [ ] \n- [ ] \n- [ ] \n\n## Backlog / Ideias\n- \n\n## Riscos ou Bloqueios\n- ` }
    ]

    const handleCreateFromTemplate = async (tpl) => {
      const newNote = await createNote()
      if (tpl.content) {
        await updateNote(newNote.id, { content: tpl.content })
      }
      navigate(`/note/${newNote.id}`)
    }

    return (
      <div className="note-editor-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 700 }}>Boa tarde.</h2>
            <p style={{ fontSize: 16, color: 'var(--text-muted)' }}>O que vamos escrever hoje?</p>
          </div>
          
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 
          }}>
            {TEMPLATES.map(tpl => (
              <div 
                key={tpl.id}
                onClick={() => handleCreateFromTemplate(tpl)}
                style={{
                  background: 'var(--bg-secondary)', padding: '24px 20px', borderRadius: 16,
                  border: '1px solid var(--border-subtle)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 16 }}>{tpl.icon}</div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{tpl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isDeleted = activeNote.isDeleted
  const fullContent = getFullContent(titleLine, bodyContent)
  const wordCount = countWords(fullContent)
  const charCount = countChars(fullContent)

  return (
    <div className="note-editor-container" style={{ position: 'relative' }}>

      {/* Focus Mode Exit Floating Button */}
      {isFocusMode && (
        <button 
          className="btn btn-ghost" 
          onClick={() => setFocusMode(false)}
          title="Sair do Modo Foco (ESC)"
          style={{ 
            position: 'absolute', top: 20, right: 20, zIndex: 100,
            opacity: 0.3, transition: 'all 0.2s', padding: '8px 12px',
            background: 'var(--bg-tertiary)', borderRadius: 20
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.3}
        >
          <X size={16} /> <span style={{fontSize: 12, marginLeft: 6, fontWeight: 600}}>Sair do Foco</span>
        </button>
      )}

      {/* Toolbar */}
      {!isFocusMode && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        height: 52, padding: '0 16px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)', flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Mobile back */}
        <button
          className="btn btn-ghost"
          style={{ padding: 6, marginRight: 4 }}
          onClick={() => { setEditorOpen(false); navigate('/') }}
          id="editor-back"
        >
          <ChevronLeft size={16} />
        </button>

        {/* View mode */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 6, padding: 2, gap: 1 }}>
          {[['edit', <Edit3 size={13} />, 'Editar'], ['preview', <Eye size={13} />, 'Preview'], ['split', <span style={{ fontSize: 11 }}>⊞</span>, 'Split']].map(([mode, icon, label]) => (
            <button
              key={mode}
              className="btn"
              title={label}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '4px 8px',
                background: viewMode === mode ? 'var(--bg-primary)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontSize: 12, gap: 4,
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ flex: 1 }} />

        {/* AI Button */}

        {/* Upload Audio Button */}
        <input 
          type="file" 
          accept="audio/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleAudioUpload} 
        />
        <button 
          className="btn btn-ghost" 
          title="Upload de Áudio (Transcrever)" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAudio}
          style={{ padding: 6, color: isUploadingAudio ? 'var(--accent)' : undefined }}
        >
          {isUploadingAudio ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        </button>

        {/* Voice Button */}
        <button 
          className="btn btn-ghost" 
          title={isRecording ? 'Parar gravação' : 'Gravar voz'} 
          onClick={handleVoiceToggle}
          style={{ padding: 6, color: isRecording ? '#dc2626' : undefined, animation: isRecording ? 'pulseSoft 1s ease-in-out infinite' : undefined }}
        >
          {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {/* Save status */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
          {saveStatus === 'saving' && <span style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>Salvando…</span>}
          {saveStatus === 'saved' && <span style={{ color: '#059669' }}>✓ Salvo</span>}
          {saveStatus === 'error' && <span style={{ color: '#dc2626' }}>Erro ao salvar</span>}
        </span>

        {!isDeleted && (
          <>
            <button
              className="btn btn-ghost toolbar-desktop-only"
              title="Modo Foco (Imersão)"
              onClick={() => setFocusMode(true)}
              style={{ padding: 6 }}
            >
              <Maximize size={15} />
            </button>
            <button className="btn btn-ghost" title={activeNote.isPinned ? 'Desafixar' : 'Fixar'} onClick={handlePin} style={{ padding: 6, color: activeNote.isPinned ? 'var(--accent)' : undefined }}>
              <Pin size={15} />
            </button>
            <button className="btn btn-ghost" title="Tags" onClick={() => setShowTagPicker(v => !v)} style={{ padding: 6 }}>
              <Tag size={15} />
            </button>
            <button className="btn btn-ghost toolbar-desktop-only" title="Histórico" onClick={handleLoadVersions} style={{ padding: 6 }}>
              <Clock size={15} />
            </button>
            <button className="btn btn-ghost toolbar-desktop-only" title="Duplicar" onClick={handleDuplicate} style={{ padding: 6 }}>
              <Copy size={15} />
            </button>
            <button className="btn btn-ghost toolbar-desktop-only" title="Arquivar" onClick={handleArchive} style={{ padding: 6 }}>
              <Archive size={15} />
            </button>
            <button className="btn btn-ghost" title="Apagar" onClick={() => setConfirmDelete(true)} style={{ padding: 6, color: '#b91c1c' }}>
              <Trash2 size={15} />
            </button>
            <button className="btn btn-ghost" title="Ações de IA" onClick={() => setShowAiPanel(v => !v)} style={{ padding: 6, color: 'var(--accent)' }}>
              <Wand2 size={15} />
            </button>
          </>
        )}

      </div>
      )}

      {/* Tags bar */}
      {!isFocusMode && activeNote.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '6px 16px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', background: 'var(--bg-primary)' }}>
          {activeNote.tags.map(tag => (
            <span key={tag.id} className="tag-chip" onClick={() => handleAddTag(tag.id)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color || 'var(--accent)', display: 'inline-block' }} />
              {tag.name}
              <X size={10} />
            </span>
          ))}
        </div>
      )}

      {/* Deleted banner */}
      {!isFocusMode && isDeleted && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#b91c1c' }}>⚠️ Esta nota está na lixeira</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ fontSize: 12, background: '#059669', color: '#fff', padding: '4px 10px' }} onClick={handleRestore}>
              <RotateCcw size={12} style={{ marginRight: 4 }} /> Restaurar
            </button>
            <button className="btn" style={{ fontSize: 12, background: '#b91c1c', color: '#fff', padding: '4px 10px' }} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={12} style={{ marginRight: 4 }} /> Apagar da lixeira
            </button>
          </div>
        </div>
      )}

      {/* Editor area - Focus Mode Layout */}
      <div 
        ref={editorRef}
        style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: 0,
          maxWidth: isFocusMode ? 850 : '100%',
          margin: isFocusMode ? '0 auto' : 0,
          width: '100%',
          paddingTop: isFocusMode ? 60 : 0,
          transition: 'all 0.3s ease-in-out',
          position: 'relative'
        }}
      >
        {/* Note Cover Image */}
        {imageUrl && (
          <div style={{ width: '100%', height: isFocusMode ? 300 : 220, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <img 
              src={imageUrl} 
              alt="Capa da nota" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, var(--bg-primary), transparent)' }} />
            <button 
              className="btn btn-ghost" 
              onClick={() => { setImageUrl(''); updateNote(activeNote.id, { imageUrl: null }) }}
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: '50%', padding: 6 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Edit pane */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: viewMode === 'split' ? '1px solid var(--border-subtle)' : 'none' }}>
            <textarea
              ref={titleRef}
              value={titleLine}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Título"
              disabled={isDeleted}
              rows={1}
              spellCheck
              style={{
                width: '100%',
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.6rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                padding: '20px 24px 8px',
                lineHeight: 1.3,
                overflowY: 'hidden',
              }}
            />
            <div style={{ height: 1, margin: '0 24px', background: 'var(--border-subtle)' }} />
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={bodyContent}
              onChange={handleChange}
            onKeyDown={handleKeyDown}
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
            onScroll={() => {
              if (slashMenu.isOpen) setSlashMenu({ ...slashMenu, isOpen: false })
              if (selectionMenu.isOpen) setSelectionMenu({ ...selectionMenu, isOpen: false })
            }}
            placeholder="Comece a escrever sua nota..."
              disabled={isDeleted}
              spellCheck
              autoComplete="off"
              style={{ paddingTop: 16 }}
            />
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="markdown-preview"
            style={{ flex: 1 }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(getFullContent(titleLine, bodyContent)) || '<p style="color:var(--text-muted)">Nenhum conteúdo para pré-visualizar</p>' }}
            onClick={handlePreviewClick}
          />
        )}
      </div>

      {/* Backlinks Panel (Linear Style) */}
      {!isFocusMode && (() => {
        if (isDeleted || !titleLine.trim()) return null
        const linkPattern = `[[${titleLine.trim()}]]`
        const backlinks = notes.filter(n => 
          !n.isDeleted && 
          n.id !== activeNote.id && 
          (n.content || '').includes(linkPattern)
        )
        if (backlinks.length === 0) return null
        
        return (
          <div style={{ 
            padding: '20px 24px', 
            background: 'var(--bg-secondary)', 
            borderTop: '1px solid var(--border)',
            flexShrink: 0 
          }}>
            <h4 style={{ 
              margin: '0 0 16px 0', 
              fontSize: 11, 
              fontWeight: 700,
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Network size={12} /> Mencionado em ({backlinks.length})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {backlinks.map(b => {
                const content = b.content || ''
                const idx = content.indexOf(linkPattern)
                const start = Math.max(0, idx - 40)
                const end = Math.min(content.length, idx + linkPattern.length + 40)
                const snippet = content.slice(start, end).replace(linkPattern, `**${linkPattern}**`)
                
                return (
                  <div 
                    key={b.id} 
                    onClick={() => navigate(`/note/${b.id}`)} 
                    style={{ 
                      padding: '12px 14px', 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: 10, 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.title || 'Sem título'}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      opacity: 0.8
                    }}>
                      ...{snippet}...
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
      </div>

      {/* Footer */}
      {!isFocusMode && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        padding: '5px 16px', borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wordCount} palavras</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{charCount} caracteres</span>
      </div>
      )}

      {/* Tag picker dropdown */}
      {!isFocusMode && showTagPicker && (
        <div style={{
          position: 'absolute', top: 48, right: 8, zIndex: 50,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 12, width: 240,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', animation: 'slideUp 0.15s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Tags</span>
            <button className="btn btn-ghost" style={{ padding: 2 }} onClick={() => setShowTagPicker(false)}><X size={14} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflow: 'auto', marginBottom: 10 }}>
            {tags.map(tag => {
              const active = activeNote.tags?.some(t => t.id === tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? 'var(--bg-tertiary)' : 'transparent',
                    color: 'var(--text-primary)', fontSize: 13,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: tag.color || 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{tag.name}</span>
                  {active && <Check size={12} style={{ color: 'var(--accent)' }} />}
                </button>
              )
            })}
          </div>

          {/* Create tag */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Nova tag</p>
            <input
              className="input"
              placeholder="Nome da tag"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
              style={{ fontSize: 12, marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: 18, height: 18, borderRadius: '50%', background: c,
                    border: selectedColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={handleCreateTag}>
              Criar tag
            </button>
          </div>
        </div>
      )}

      {/* Versions panel */}
      {!isFocusMode && showVersions && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 280,
          background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          animation: 'slideIn 0.2s ease-out',
        }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600 }}>Histórico</span>
            <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowVersions(false)}><X size={14} /></button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {versions.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12, textAlign: 'center' }}>
                Nenhuma versão anterior
              </p>
            )}
            {versions.map((v, i) => (
              <div
                key={v.id}
                style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                  cursor: 'pointer', border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-primary)', transition: 'all 0.1s',
                }}
                onClick={() => handleRestoreVersion(v)}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    Versão {versions.length - i}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {v.content?.slice(0, 80) || '(vazio)'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Panel */}
      {!isFocusMode && showAiPanel && (
        <div style={{
          position: 'absolute', top: 48, right: 8, zIndex: 50,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 16, width: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', animation: 'slideUp 0.15s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> Inteligência Artificial
            </span>
            <button className="btn btn-ghost" style={{ padding: 2 }} onClick={() => setShowAiPanel(false)}><X size={14} /></button>
          </div>

          {!hasApiKey() ? (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Configure sua API Key nas Configurações
              </p>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => navigate('/settings')}>
                Ir para Configurações
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                className="btn" 
                onClick={handleAiSummarize}
                disabled={aiLoading}
                style={{ justifyContent: 'flex-start', gap: 8, fontSize: 12 }}
              >
                <Sparkles size={12} /> {aiLoading ? 'A gerar...' : 'Gerar resumo'}
              </button>
              <button 
                className="btn" 
                onClick={handleAiSuggestTags}
                disabled={aiLoading}
                style={{ justifyContent: 'flex-start', gap: 8, fontSize: 12 }}
              >
                <Tag size={12} /> {aiLoading ? 'A sugerir...' : 'Sugerir tags'}
              </button>
              <button 
                className="btn" 
                onClick={handleAiImprove}
                disabled={aiLoading}
                style={{ justifyContent: 'flex-start', gap: 8, fontSize: 12 }}
              >
                <Edit3 size={12} /> {aiLoading ? 'A melhorar...' : 'Melhorar texto'}
              </button>
              <button 
                className="btn" 
                onClick={handleAiGenerateCover}
                disabled={aiLoading}
                style={{ justifyContent: 'flex-start', gap: 8, fontSize: 12 }}
              >
                <Globe size={12} /> {aiLoading ? 'A pintar...' : 'Gerar Capa com IA'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => { setChatOpen(true); setShowAiPanel(false) }}
                style={{ justifyContent: 'center', gap: 8, fontSize: 12, marginTop: 4 }}
              >
                <MessageSquare size={12} /> Conversar com IA
              </button>
            </div>
          )}

          {aiSummary && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Resumo:</p>
              <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, fontStyle: 'italic' }}>{aiSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Voice Recording Panel */}
      {!isFocusMode && (isRecording || voiceTranscript || transcript || error || hasStoredTranscript) && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 50,
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 16,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', animation: 'slideUp 0.15s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 10, height: 10, borderRadius: '50%', 
                background: isRecording ? '#dc2626' : '#059669',
                animation: isRecording ? 'pulseSoft 1s ease-in-out infinite' : undefined 
              }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {isRecording ? 'A gravar...' : hasStoredTranscript ? 'Transcript salvo encontrado' : 'Gravação concluída'}
              </span>
            </div>
            <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { reset(); setVoiceTranscript(''); }}>
              <X size={14} />
            </button>
          </div>

          {error && (
            <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, marginBottom: 12, color: '#b91c1c', fontSize: 13 }}>
              Erro: {error}
            </div>
          )}

          {(voiceTranscript || transcript) && (
            <div style={{ 
              maxHeight: 100, overflow: 'auto', padding: 12, 
              background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12,
              fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap'
            }}>
              {voiceTranscript}
              {voiceTranscript && transcript ? ' ' : ''}
              <span style={{ color: isRecording ? 'var(--accent)' : 'inherit' }}>
                {transcript}
              </span>
            </div>
          )}


          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn" 
              onClick={handleVoiceToggle}
              style={{ flex: 1, justifyContent: 'center', gap: 6 }}
            >
              {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              {isRecording ? 'Parar' : 'Continuar'}
            </button>
            {voiceTranscript && (
              <button 
                className="btn btn-primary" 
                onClick={handleInsertTranscript}
                disabled={aiLoading}
                style={{ flex: 1, justifyContent: 'center', gap: 6 }}
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {aiLoading ? 'A formatar...' : 'Inserir na nota'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmModal
          title={isDeleted ? 'Apagar permanentemente?' : 'Mover para a lixeira?'}
          message={isDeleted ? 'Esta ação não pode ser desfeita. A nota será removida para sempre.' : 'Pode restaurar a nota mais tarde na lixeira.'}
          confirmLabel={isDeleted ? 'Apagar' : 'Mover'}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {/* Selection AI Menu */}
      {selectionMenu.isOpen && (
        <div 
          className="selection-menu"
          style={{ top: selectionMenu.y, left: selectionMenu.x }}
        >
          <div className="selection-item" onClick={() => { handleAiImproveSelection(); setSelectionMenu({ ...selectionMenu, isOpen: false }); }}>
            <Sparkles size={14} color="var(--accent)" /> Melhorar
          </div>
          <div className="selection-divider" />
          <div className="selection-item" onClick={() => { handleAiSummarizeSelection(); setSelectionMenu({ ...selectionMenu, isOpen: false }); }}>
            <FileText size={14} /> Resumir
          </div>
          <div className="selection-divider" />
          <div className="selection-item" onClick={() => { setChatOpen(true); setSelectionMenu({ ...selectionMenu, isOpen: false }); }}>
            <MessageSquare size={14} /> Perguntar
          </div>
        </div>
      )}

      {slashMenu.isOpen && (
        <div 
          className="slash-menu"
          style={{ top: slashMenu.y, left: slashMenu.x }}
        >
          <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Comandos de Bloco
          </div>
          {slashCommands.map((cmd, idx) => {
            const Icon = cmd.icon
            const isActive = slashSelectedIndex === idx
            return (
              <div 
                key={cmd.id}
                className={`slash-item ${isActive ? 'active' : ''}`}
                onMouseEnter={() => setSlashSelectedIndex(idx)}
                onClick={cmd.action}
              >
                <div className="slash-item-icon">
                  <Icon size={14} />
                </div>
                <span>{cmd.title}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Link Preview Hover Card */}
      {hoverPreview.isOpen && (
        <div 
          className="link-preview-card"
          style={{ 
            position: 'fixed', 
            top: hoverPreview.y - 120, // Acima do link
            left: hoverPreview.x,
            zIndex: 9999,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            width: 280,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            backdropFilter: 'blur(10px)',
            animation: 'fadeInScale 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ padding: 6, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
              <FileText size={14} color="var(--accent)" />
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hoverPreview.note.title}
            </div>
          </div>
          <div style={{ 
            fontSize: 13, 
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {hoverPreview.note.content?.split('\n').slice(1).join(' ').substring(0, 150) || 'Sem conteúdo'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
            {(hoverPreview.note.tags || []).slice(0, 2).map(t => (
              <span key={t.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${t.color}20`, color: t.color, fontWeight: 600 }}>
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
