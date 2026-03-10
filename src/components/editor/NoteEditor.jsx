import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pin, Archive, Trash2, Tag, Eye, Edit3, Copy,
  RotateCcw, ChevronLeft, Clock, MoreHorizontal, X, Check
} from 'lucide-react'
import { useNotesStore } from '../../store/notesStore'
import { useTagsStore } from '../../store/tagsStore'
import { useUiStore } from '../../store/uiStore'
import { notesApi } from '../../services/api'
import { debounce, markdownToHtml, countWords, countChars, extractTitle, TAG_COLORS } from '../../lib/utils'
import ConfirmModal from '../ui/ConfirmModal'

export default function NoteEditor({ noteId }) {
  const navigate = useNavigate()
  const { activeNote, saveStatus, updateNote, deleteNote, deletePermanentNote, pinNote, archiveNote, duplicateNote, restoreNote, setActiveNote } = useNotesStore()
  const { tags, createTag } = useTagsStore()
  const { toast, setEditorOpen } = useUiStore()

  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState('edit') // 'edit' | 'preview' | 'split'
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])

  const textareaRef = useRef(null)
  const saveTimerRef = useRef(null)

  // Sync content when note changes
  useEffect(() => {
    if (activeNote) {
      setContent(activeNote.content || '')
    }
  }, [activeNote?.id])

  // Auto-focus editor
  useEffect(() => {
    if (viewMode === 'edit' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [viewMode, activeNote?.id])

  const debouncedSave = useCallback(
    debounce((id, newContent) => {
      updateNote(id, { content: newContent })
    }, 1500),
    []
  )

  const handleChange = (e) => {
    const val = e.target.value
    setContent(val)
    if (activeNote) debouncedSave(activeNote.id, val)
  }

  const handleKeyDown = (e) => {
    // Ctrl/Cmd+S → force save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (activeNote) updateNote(activeNote.id, { content })
    }
    // Tab → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newVal = content.slice(0, start) + '  ' + content.slice(end)
      setContent(newVal)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2
          textareaRef.current.selectionEnd = start + 2
        }
      })
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
    setContent(version.content)
    await updateNote(activeNote.id, { content: version.content })
    setShowVersions(false)
    toast('Versão restaurada')
  }

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

  if (!activeNote) {
    return (
      <div className="note-editor-container">
        <div className="empty-state">
          <span style={{ fontSize: 48, lineHeight: 1 }}>✏️</span>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, margin: 0, color: 'var(--text-secondary)' }}>
            Selecione uma nota ou crie uma nova
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Suas notas ficam sincronizadas em todos os dispositivos
          </p>
        </div>
      </div>
    )
  }

  const isDeleted = activeNote.isDeleted
  const title = extractTitle(content)
  const wordCount = countWords(content)
  const charCount = countChars(content)

  return (
    <div className="note-editor-container" style={{ position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)',
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

        {/* Save status */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>
          {saveStatus === 'saving' && <span style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>A guardar…</span>}
          {saveStatus === 'saved' && <span style={{ color: '#059669' }}>✓ Guardado</span>}
          {saveStatus === 'error' && <span style={{ color: '#dc2626' }}>Erro ao guardar</span>}
        </span>

        {!isDeleted && (
          <>
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
          </>
        )}

      </div>

      {/* Tags bar */}
      {activeNote.tags?.length > 0 && (
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
      {isDeleted && (
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

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Edit pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: viewMode === 'split' ? '1px solid var(--border-subtle)' : 'none' }}>
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Escreva aqui. Suporte a Markdown."
              disabled={isDeleted}
              spellCheck
              autoComplete="off"
            />
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className="markdown-preview"
            style={{ flex: 1 }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) || '<p style="color:var(--text-muted)">Nenhum conteúdo para pré-visualizar</p>' }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        padding: '5px 16px', borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-primary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wordCount} palavras</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{charCount} caracteres</span>
      </div>

      {/* Tag picker dropdown */}
      {showTagPicker && (
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
      {showVersions && (
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
    </div>
  )
}
