import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(dateStr) {
  if (!dateStr) return 'Sem data'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Data inválida'

  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  if (isYesterday(date)) return 'Ontem'
  return format(date, 'd MMM yyyy', { locale: ptBR })
}

export function extractTitle(content) {
  if (!content) return 'Nota sem título'
  const lines = content.split('\n')
  for (const line of lines) {
    const t = line.replace(/^#{1,6}\s*/, '').trim()
    if (t) return t.length > 80 ? t.slice(0, 80) + '…' : t
  }
  return 'Nota sem título'
}

export function extractPreview(content, title) {
  if (!content) return ''
  const lines = content.split('\n').filter(l => l.trim())
  let found = false
  for (const line of lines) {
    const clean = line.replace(/^#{1,6}\s*/, '').trim()
    if (!found && clean === title.replace(/…$/, '')) { found = true; continue }
    const preview = clean.replace(/[*_`~\[\]]/g, '').trim()
    if (preview) return preview.length > 100 ? preview.slice(0, 100) + '…' : preview
  }
  return ''
}

export function countWords(content) {
  if (!content) return 0
  return content.trim().split(/\s+/).filter(Boolean).length
}

export function countChars(content) {
  return (content || '').length
}

// Simple markdown → HTML (no external deps)
export function markdownToHtml(md) {
  if (!md) return ''
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // HR
    .replace(/^---$/gm, '<hr>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered list
    .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
    // Ordered list
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, (m) => `<ul>${m}</ul>\n`)
    // Paragraphs (lines not already wrapped)
    .replace(/^(?!<[hupbldr]|<\/|<pre|<code|$)(.+)$/gm, '<p>$1</p>')

  return html
}

export function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

export const TAG_COLORS = [
  '#d97706', '#059669', '#2563eb', '#7c3aed',
  '#db2777', '#dc2626', '#0891b2', '#65a30d',
]
