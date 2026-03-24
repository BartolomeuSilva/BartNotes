import { useRef, useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { useNotesStore } from '../store/notesStore'
import { useUiStore } from '../store/uiStore'

export default function GraphPage() {
  const { notes } = useNotesStore()
  const { theme } = useUiStore()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    
    window.addEventListener('resize', updateDimensions)
    // Pequeno delay para garantir que o layout final (Sidebar aberta) se acomodou
    setTimeout(updateDimensions, 50)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const graphData = useMemo(() => {
    const nodes = []
    const links = []
    
    const activeNotes = notes.filter(n => !n.isDeleted)
    const titleToId = {}
    
    // 1. Criar nós (Nodes)
    activeNotes.forEach(n => {
      const title = n.title.trim()
      if (title) {
        titleToId[title.toLowerCase()] = n.id
      }
      nodes.push({
        id: n.id,
        name: title || 'Sem Título',
        val: 1, // volume da bolinha base
        color: n.tags?.[0]?.color || (theme === 'dark' ? '#818cf8' : '#4f46e5')
      })
    })

    // 2. Criar links (Arestas) parseando Backlinks
    activeNotes.forEach(n => {
      if (!n.body) return
      
      const regex = /\[\[(.*?)\]\]/g
      let match
      while ((match = regex.exec(n.body)) !== null) {
        const targetTitle = match[1].trim().toLowerCase()
        const targetId = titleToId[targetTitle]
        
        if (targetId) {
          links.push({ source: n.id, target: targetId })
          
          // Aumenta a gravidade e o volume do nó citado
          const targetNode = nodes.find(nd => nd.id === targetId)
          if (targetNode) targetNode.val += 0.8
        }
      }
    })

    return { nodes, links }
  }, [notes, theme])

  const backgroundColor = theme === 'dark' ? 'var(--bg-primary)' : 'var(--bg-secondary)'
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a'
  const linkColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.4)'

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', background: backgroundColor, position: 'relative' }}
    >
      {/* Overlay com informações rápidas */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>Mapa Mental</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
          {graphData.nodes.length} notas orbitando | {graphData.links.length} conexões
        </p>
      </div>

      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel=""
          nodeColor="color"
          nodeRelSize={4}
          linkColor={() => linkColor}
          linkWidth={1.5}
          backgroundColor={backgroundColor}
          onNodeClick={node => navigate(`/note/${node.id}`)}
          // Estilização profunda direto no Canvas 2D
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name
            const fontSize = Math.max(12 / globalScale, 2)
            const padding = fontSize * 0.4
            const r = Math.min(Math.max(node.val, 1.5), 8) * 2 // Raio do nó
            
            ctx.font = `600 ${fontSize}px Inter, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // Desenhar o Círculo (Nó)
            ctx.beginPath()
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false)
            ctx.fillStyle = node.color
            ctx.fill()
            
            // Halo de brilho se for muito popular
            if (node.val > 2) {
              ctx.beginPath()
              ctx.arc(node.x, node.y, r * 1.5, 0, 2 * Math.PI, false)
              ctx.fillStyle = `${node.color}33` // 20% opacity
              ctx.fill()
            }

            // Apenas renderiza nomes se houver zoom suficiente ou se o nó for importante
            if (globalScale >= 1.5 || node.val > 3) {
              const textY = node.y + r + fontSize + padding
              
              // Texto Shadow / Background
              ctx.fillStyle = backgroundColor
              const textWidth = ctx.measureText(label).width
              ctx.fillRect(
                node.x - textWidth / 2 - padding, 
                textY - fontSize / 2 - padding, 
                textWidth + padding * 2, 
                fontSize + padding * 2
              )
              
              // Texto Real
              ctx.fillStyle = textColor
              ctx.fillText(label, node.x, textY)
            }
          }}
        />
      )}
    </div>
  )
}
