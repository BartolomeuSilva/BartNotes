import React from 'react'
import { Command, Sparkles, Link as LinkIcon, Network, Target, Mic, Globe, CheckSquare, MonitorSmartphone, Zap } from 'lucide-react'
import '../styles/ManualPage.css'

export default function ManualPage() {
  const features = [
    {
      id: 'command',
      icon: <Command size={32} />,
      title: 'Navegação Ultrarrápida (Command Palette)',
      description: 'Diga adeus ao uso excessivo do mouse. O BartNotes foi construído para power users manipularem tudo em milissegundos.',
      tips: [
        'Pressione Ctrl + K (ou Cmd + K) de qualquer lugar.',
        'Digite / para ver atalhos de ações (Ex: /Nova Nota).',
        'Pesquise o nome da nota e aperte Enter para saltar até ela.'
      ]
    },
    {
      id: 'ai',
      icon: <Sparkles size={32} />,
      title: 'Segundo Cérebro (Chat da IA)',
      description: 'Converse com as suas ideias. O RAG embutido lê todo o seu repositório de notas para te dar respostas com contexto.',
      tips: [
        'Acesse pelo botão no menu lateral esquerdo ou Ctrl + K.',
        'Configure sua API Key (Groq / OpenAI) na catraca do chat.',
        'Exemplo: "Faça um resumo executivo da ata de ontem".'
      ]
    },
    {
      id: 'links',
      icon: <LinkIcon size={32} />,
      title: 'Backlinks (Wiki-Style)',
      description: 'Conecte ideias como se a sua mente estivesse bordando o pensamento, construindo uma Wiki pessoal orgânica.',
      tips: [
        'No editor, digite [[ seguido do título da nota.',
        'Clique na palavra roxa para ser teletransportado.',
        'Acesse a nota para ver as citações reversas no painel direito.'
      ]
    },
    {
      id: 'graph',
      icon: <Network size={32} />,
      title: 'Mapa Mental (Visão de Grafo)',
      description: 'Assista à sua constelação de pensamentos ganhar vida em Física 2D interativa gerada a partir dos seus Backlinks.',
      tips: [
        'Clique em "Mapa Mental" no Menu.',
        'Arraste as esferas, use o scroll para aplicar zoom.',
        'Clique em qualquer núcleo para abrir e editar a respectiva anotação.'
      ]
    },
    {
      id: 'focus',
      icon: <Target size={32} />,
      title: 'Modo Foco (Typewriter)',
      description: 'Mergulhe profundamente na escrita e silencie a ansiedade. Todos os painéis sumirão e o texto será centralizado.',
      tips: [
        'Clique no ícone de Alvo no topo direito do Editor.',
        'A tela ficará totalmente limpa (livre de distrações).',
        'Pressione a tecla ESC para sair e voltar à interface normal.'
      ]
    },
    {
      id: 'voice',
      icon: <Mic size={32} />,
      title: 'Ditado de Voz e Áudios',
      description: 'Fale e deixe a IA redigir perfeitamente pelo motor preditivo Whisper em vez de digitar longos textos.',
      tips: [
        'Clique no Microfone do editor, segure e fale.',
        'Você pode arrastar mp3 ou m4a de reuniões e ele converte para texto!'
      ]
    },
    {
      id: 'clipper',
      icon: <Globe size={32} />,
      title: 'Web Clipper',
      description: 'Sequestre a inteligência da internet. Puxe o conteúdo de matérias, documentações e blogs para sua biblioteca instantaneamente em puro Markdown.',
      tips: [
        'Clique em "Capturar URL" ou use o atalho da Command Palette.',
        'Cole o link e aperte Enter. A publicidade será removida.',
        'A notícia será arquivada como uma de suas anotações perfeitamente limpa.'
      ]
    },
    {
      id: 'tasks',
      icon: <CheckSquare size={32} />,
      title: 'Dashboard Central de Tarefas',
      description: 'Qualquer check-box escrito dentro do aplicativo será puxado invisivelmente para um funil de tarefas de prioridade.',
      tips: [
        'Escreva "- [ ] Comprar leite" em qualquer anotação.',
        'O item irá automaticamente para o menu lateral "Tarefas".',
        'Marcar ou desmarcar atualiza sua nota bidirecionalmente em tempo real!'
      ]
    },
    {
      id: 'pwa',
      icon: <MonitorSmartphone size={32} />,
      title: 'Offline e Aplicativo Nativo (PWA)',
      description: 'BartNotes nunca te deixa na mão num voo ou área sem Wi-Fi.',
      tips: [
        'Clique em "Instalar App" no Rodapé lateral para fixá-lo no Computador/Celular.',
        'Se desconectar da rede, um escudo vermelho alertará a proteção dos dados.',
        'O fechamento da aba não apagará caches locais. Trabalhe tranquilo.'
      ]
    }
  ]

  return (
    <div className="note-scroll-area" style={{ width: '100%', height: '100dvh', background: 'var(--bg-primary)' }}>
      <div className="manual-container">
        <div className="manual-header">
          <h1>BartNotes Premium</h1>
        <p>O seu Segundo Cérebro Digital e Central de Produtividade em Nível Máximo.</p>
      </div>

      <div className="feature-grid">
        {features.map(f => (
          <div className="feature-card" key={f.id}>
            <div className="icon-wrapper">
              {f.icon}
            </div>
            <div className="feature-content">
              <h2>{f.title}</h2>
              <p>{f.description}</p>
              
              <div className="feature-tips">
                <strong>Dicas de Ouro</strong>
                <ul>
                  {f.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="power-tips-section">
        <h2><Zap size={28} /> Supremacia de Uso</h2>
        <ul>
          <li><strong>Templates do Zero Mágico:</strong> Em uma nota recém-criada, em vez de encarar o branco assustador, clique num dos 3 cartões que aparecem no editor para injetar imediatamente Layouts de Reunião, Planejamento Diário ou Ata.</li>
          <li><strong>Escrita Focada Absoluta:</strong> Habilite o Modo Foco no alvo superior e logo em seguida aperte F11 no seu navegador. A sua experiência de mergulho mental em diários ou roteiros será imbatível.</li>
          <li><strong>Emojis como Âncoras:</strong> Tente começar os títulos das suas anotações com Emojis marcantes. Na construção do Mapa Mental (Grafo), o Emoji aparecerá ilustrando a bolinha no espaço!</li>
        </ul>
      </div>
    </div>
    </div>
  )
}
