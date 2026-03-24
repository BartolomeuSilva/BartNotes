import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, RotateCcw, CheckSquare, Square, Search, X, Pin } from 'lucide-react'
import { useNotesStore } from '../../store/notesStore'
import { useUiStore } from '../../store/uiStore'
import { formatDate, extractTitle, extractPreview } from '../../lib/utils'
import ConfirmModal from '../ui/ConfirmModal'

const FILTER_LABELS = {
  all: 'Notas',
  pinned: 'Fixadas',
  archived: 'Arquivadas',
  deleted: 'Lixeira',
}

export default function NoteList() {
  const navigate = useNavigate()
  const { id: activeId } = useParams()
  const {
    notes, loading, filter, searchQuery, selectedNoteIds, activeTagId,
    setSearch, fetchNotes, setActiveNote, toggleSelectNote,
    clearSelection, selectAll, emptyTrash, deleteMultiplePermanent, restoreMultiple
  } = useNotesStore()
  const { setEditorOpen, toast } = useUiStore()
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false)
  const [showConfirmBatchDelete, setShowConfirmBatchDelete] = useState(false)
  const searchTimer = useRef(null)

  useEffect(() => { fetchNotes() }, [filter, activeTagId])

  const handleSearch = (v) => {
    setLocalSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(v)
      fetchNotes({ q: v })
    }, 300)
  }

  const handleSelect = (note, e) => {
    if (e) e.stopPropagation()

    // Se estiver em modo de seleção (ja existe algo selecionado) ou se clicou no checkbox
    // (o checkbox sera tratado separadamente se necessário, mas aqui lidamos com o clique na nota)
    if (selectedNoteIds.length > 0) {
      toggleSelectNote(note.id)
      return
    }

    setActiveNote(note)
    setEditorOpen(true)
    navigate(`/note/${note.id}`)
  }

  const handleEmptyTrash = async () => {
    await emptyTrash()
    setShowConfirmEmpty(false)
    toast('Lixeira limpa')
  }

  const handleBatchDelete = async () => {
    await deleteMultiplePermanent(selectedNoteIds)
    setShowConfirmBatchDelete(false)
    toast('Notas excluídas')
  }

  const handleBatchRestore = async () => {
    await restoreMultiple(selectedNoteIds)
    toast('Notas restauradas')
  }

  const pinned = (notes || []).filter(n => n.isPinned)
  const unpinned = (notes || []).filter(n => !n.isPinned)

  const renderNote = (note) => {
    const title = extractTitle(note.content || note.title)
    const preview = extractPreview(note.content || '', title)
    const isSelected = selectedNoteIds.includes(note.id)
    const isSelectionMode = selectedNoteIds.length > 0
    const isActive = note.id === activeId

    return (
      <div
        key={note.id}
        className={`note-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={(e) => handleSelect(note, e)}
        style={{
          animation: 'slideIn 0.15s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        {filter === 'deleted' && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleSelectNote(note.id) }}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center'
            }}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
            <p style={{
              fontSize: 15, fontWeight: 500, color: 'var(--text-primary)',
              margin: 0, lineHeight: 1.4, flex: 1,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            }}>
              {title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {note.isPinned && <Pin size={10} style={{ color: 'var(--accent)' }} />}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {formatDate(note.updatedAt)}
              </span>
            </div>
          </div>
          {preview && (
            <p style={{
              fontSize: 14, color: 'var(--text-muted)', margin: '3px 0 0',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5,
            }}>
              {preview}
            </p>
          )}
          {note.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {note.tags.map(tag => (
                <span key={tag.id} style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="note-list-panel">
      {/* Header */}
      <div style={{ 
        height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', 
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 
      }}>
        <h2 style={{
          fontSize: 14, fontWeight: 600, margin: 0, flex: 1,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em'
        }}>
          {FILTER_LABELS[filter] || 'Notas'}
        </h2>
          {filter === 'deleted' && notes.length > 0 && selectedNoteIds.length === 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => setShowConfirmEmpty(true)}
              style={{ fontSize: 11, padding: '2px 8px', color: '#b91c1c' }}
            >
              Limpar Lixeira
            </button>
          )}
          {filter === 'deleted' && selectedNoteIds.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-ghost"
                onClick={handleBatchRestore}
                title="Restaurar selecionadas"
                style={{ padding: 4 }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowConfirmBatchDelete(true)}
                title="Excluir selecionadas"
                style={{ padding: 4, color: '#b91c1c' }}
              >
                <Trash2 size={14} />
              </button>
              <button
                className="btn btn-ghost"
                onClick={clearSelection}
                title="Cancelar seleção"
                style={{ padding: 4 }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 7px', borderRadius: 10 }}>
          {selectedNoteIds.length > 0 ? `${selectedNoteIds.length}/${notes.length}` : notes?.length || 0}
        </span>
      </div>

      {/* Search - Agora com padding lateral fixo de 16px para alinhar com o Linear */}
      <div style={{ padding: '8px 16px 12px', background: 'var(--bg-secondary)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            placeholder="Buscar notas…"
            value={localSearch}
            onChange={e => handleSearch(e.target.value)}
            style={{ paddingLeft: 30, paddingRight: localSearch ? 28 : 12, fontSize: 12, minHeight: 32, borderRadius: 6 }}
          />
          {localSearch && (
            <button
              onClick={() => handleSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="note-scroll-area">
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>A carregar…</div>
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize: 32 }}>
              {filter === 'deleted' ? '🗑️' : filter === 'archived' ? '📦' : '✏️'}
            </span>
            <p style={{ fontSize: 13, margin: 0 }}>
              {filter === 'deleted' ? 'Lixeira vazia' :
                filter === 'archived' ? 'Nenhuma nota arquivada' :
                  localSearch ? 'Nenhum resultado encontrado' : 'Nenhuma nota ainda'}
            </p>
          </div>
        )}

        {!loading && pinned.length > 0 && filter === 'all' && (
          <>
            <div style={{ padding: '10px 14px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fixadas
            </div>
            {pinned.map(renderNote)}
            {unpinned.length > 0 && (
              <div style={{ padding: '10px 14px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Outras
              </div>
            )}
          </>
        )}

        {!loading && (filter === 'all' ? unpinned : notes).map(renderNote)}
      </div>

      {showConfirmEmpty && (
        <ConfirmModal
          title="Limpar Lixeira?"
          message="Esta ação não pode ser desfeita. Todas as notas na lixeira serão removidas para sempre."
          confirmLabel="Limpar"
          danger
          onConfirm={handleEmptyTrash}
          onCancel={() => setShowConfirmEmpty(false)}
        />
      )}

      {showConfirmBatchDelete && (
        <ConfirmModal
          title="Excluir selecionadas?"
          message={`Esta ação não pode ser desfeita. ${selectedNoteIds.length} notas serão removidas para sempre.`}
          confirmLabel="Excluir"
          danger
          onConfirm={handleBatchDelete}
          onCancel={() => setShowConfirmBatchDelete(false)}
        />
      )}
    </div>
  )
}
