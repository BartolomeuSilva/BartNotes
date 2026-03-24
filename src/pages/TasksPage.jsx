import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, ListTodo, Search, ArrowRight, Loader2 } from 'lucide-react'
import { useNotesStore } from '../store/notesStore'
import { extractTitle } from '../lib/utils'

export default function TasksPage() {
  const navigate = useNavigate()
  const { notes, toggleTaskInNote, loading } = useNotesStore()
  const [search, setSearch] = useState('')
  const [togglingObj, setTogglingObj] = useState({})

  // Compute tasks
  const tasksByNote = useMemo(() => {
    const result = []
    
    notes.forEach(note => {
      if (note.isDeleted || note.isArchived || !note.content) return
      
      const lines = note.content.split('\n')
      const noteTasks = []
      
      lines.forEach((line, index) => {
        // aceita checkboxes no meio da linha e captura o texto antes (prefix) e depois (suffix)
        const match = line.match(/(.*?)-\s*\[([ xX])\]\s+(.*)/)
        if (match) {
          const prefix = match[1].trim()
          const isDone = match[2].toLowerCase() === 'x'
          const suffix = match[3].trim()
          
          const text = prefix ? `${prefix} ${suffix}` : suffix
          
          if (search && !text.toLowerCase().includes(search.toLowerCase())) return
          
          noteTasks.push({
            id: `${note.id}-${index}`,
            noteId: note.id,
            lineIndex: index,
            rawLine: line,
            text,
            isDone,
            indent: match[1]
          })
        }
      })
      
      if (noteTasks.length > 0) {
        result.push({
          note,
          title: extractTitle(note.content),
          tasks: noteTasks
        })
      }
    })
    
    // Sort by most recent notes first
    return result.sort((a, b) => new Date(b.note.updatedAt || b.note.createdAt).getTime() - new Date(a.note.updatedAt || a.note.createdAt).getTime())
  }, [notes, search])

  const handleToggle = async (task) => {
    setTogglingObj(prev => ({ ...prev, [task.id]: true }))
    await toggleTaskInNote(task.noteId, task.lineIndex, task.rawLine)
    setTogglingObj(prev => ({ ...prev, [task.id]: false }))
  }

  const totalTasks = tasksByNote.reduce((acc, group) => acc + group.tasks.length, 0)
  const completedTasks = tasksByNote.reduce((acc, group) => acc + group.tasks.filter(t => t.isDone).length, 0)
  const openTasks = totalTasks - completedTasks
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  if (loading) {
    return (
      <div className="empty-state">
        <Loader2 className="animate-spin text-muted" size={32} />
        <p>Buscando tarefas...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px max(24px, calc((100% - 800px) / 2))', height: '100vh', overflowY: 'auto' }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyItems: 'center', color: '#fff', justifyContent: 'center' }}>
            <ListTodo size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>Dashboard de Tarefas</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>Suas pendências extraídas de todas as notas</p>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pendentes</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--text-primary)' }}>{openTasks}</div>
          </div>
          <div style={{ flex: '1 1 200px', background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Concluídas</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--text-primary)' }}>{completedTasks}</div>
          </div>
          <div style={{ flex: '1 1 200px', background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Progresso</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--text-primary)' }}>{progress}%</div>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="input" 
          placeholder="Buscar tarefas..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 44, height: 48, borderRadius: 24, background: 'var(--bg-secondary)' }}
        />
      </div>

      {/* Task List */}
      {tasksByNote.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40, border: '2px dashed var(--border)', background: 'transparent' }}>
          <CheckCircle2 size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: 16 }} />
          <h3>Nada por aqui</h3>
          <p>Você não tem tarefas nas suas notas, ou elas não batem com a busca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
          {tasksByNote.map(group => (
            <div key={group.note.id} style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div 
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => navigate(`/note/${group.note.id}`)}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{group.title}</div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              
              <div style={{ padding: '8px 0' }}>
                {group.tasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', transition: 'background 0.2s', opacity: task.isDone ? 0.6 : 1, textDecoration: task.isDone ? 'line-through' : 'none' }}>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: 2, margin: 0, height: 'auto', color: task.isDone ? 'var(--accent)' : 'var(--text-muted)', cursor: togglingObj[task.id] ? 'wait' : 'pointer' }}
                      onClick={() => !togglingObj[task.id] && handleToggle(task)}
                      disabled={togglingObj[task.id]}
                    >
                      {togglingObj[task.id] ? <Loader2 size={20} className="animate-spin" /> : task.isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div style={{ flex: 1, paddingTop: 1, fontSize: 14 }}>
                      {task.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
