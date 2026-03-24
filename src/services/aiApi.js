import { useAiStore, AI_PROVIDERS } from '../store/aiStore'
import { normalizeText } from '../lib/utils'

function getProviderConfig(provider) {
  const configs = {
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      endpoint: '/chat/completions',
      headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
      body: (model, messages) => ({ model, messages, max_tokens: 1000 }),
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      endpoint: '/messages',
      headers: (key) => ({ 'x-api-key': key, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' }),
      body: (model, messages) => ({ model, messages, max_tokens: 1000 }),
    },
    google: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      endpoint: '/models',
      headers: (key) => ({ 'Content-Type': 'application/json' }),
      body: (model, messages) => {
        const systemMsg = messages.find(m => m.role === 'system')?.content || ''
        const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content).join('\n')
        return { contents: [{ parts: [{ text: `System: ${systemMsg}\n\nUser: ${userMsgs}` }] }], generationConfig: { maxOutputTokens: 1000 } }
      },
    },
    deepseek: {
      baseUrl: 'https://api.deepseek.com/v1',
      endpoint: '/chat/completions',
      headers: (key) => ({ 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }),
      body: (model, messages) => ({ model, messages, max_tokens: 1000 }),
    },
    custom: {
      baseUrl: '',
      endpoint: '',
      headers: (key) => ({ 'Content-Type': 'application/json' }),
      body: (model, messages) => ({ model, messages, max_tokens: 1000 }),
    },
  }
  return configs[provider] || configs.openai
}

async function callAI(messages, customPrompt) {
  const { apiKey, provider, model, customEndpoint } = useAiStore.getState()
  
  if (!apiKey) throw new Error('API key não configurada')
  
  const config = getProviderConfig(provider)
  let url, headers, body

  if (provider === 'custom') {
    url = customEndpoint || 'https://api.openai.com/v1/chat/completions'
    headers = { 'Content-Type': 'application/json' }
    body = { model: model || 'gpt-3.5-turbo', messages, max_tokens: 1000 }
  } else if (provider === 'anthropic') {
    url = `${config.baseUrl}${config.endpoint}`
    headers = config.headers(apiKey)
    body = config.body(model, messages)
  } else if (provider === 'google') {
    url = `${config.baseUrl}${config.endpoint}:generateContent?key=${apiKey}`
    headers = config.headers(apiKey)
    body = config.body(model, messages)
  } else {
    url = `${config.baseUrl}${config.endpoint}`
    headers = config.headers(apiKey)
    body = config.body(model, messages)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || err.message || `Erro na API (${response.status})`)
  }

  const data = await response.json()
  
  if (provider === 'anthropic') {
    return data.content?.[0]?.text || ''
  } else if (provider === 'google') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export async function generateSummary(content) {
  const { provider } = useAiStore.getState()
  const systemPrompt = provider === 'anthropic' 
    ? 'Você é um assistente que resume notas de forma clara e concisa. Crie um resumo de 1-2 linhas do conteúdo fornecido.'
    : 'Você é um assistente que resume notas de forma clara e concisa. Crie um resumo de 1-2 linhas do conteúdo fornecido.'

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Resuma esta nota:\n\n${content}` }
  ]

  return callAI(messages)
}

export async function suggestTags(content) {
  const { provider } = useAiStore.getState()
  const systemPrompt = provider === 'anthropic'
    ? 'Você é um assistente que sugere tags relevantes para notas. Retorne apenas uma lista de 3-5 tags separadas por vírgula, sem explicações. Exemplo: trabalho, urgente, ideias'
    : 'Você é um assistente que sugere tags relevantes para notas. Retorne apenas uma lista de 3-5 tags separadas por vírgula, sem explicações. Exemplo: trabalho, urgente, ideias, projeto'

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Sugira tags para esta nota:\n\n${content}` }
  ]

  const text = await callAI(messages)
  return text.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
}

export async function improveText(content) {
  const { provider } = useAiStore.getState()
  const systemPrompt = provider === 'anthropic'
    ? 'Você é um assistente que mejora textos em português, corrigindo erros, melhorando clareza e fluência. Mantenha o mesmo conteúdo mas melhore a escrita.'
    : 'Você é um assistente que mejora textos, corrigindo erros, melhorando clareza e fluência. Mantenha o mesmo conteúdo mas melhore a escrita.'

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content }
  ]

  return callAI(messages)
}

export async function completeWithAI(content, customPrompt) {
  const messages = [
    { role: 'system', content: customPrompt || 'Você é um assistente útil que continua ou expande o texto do usuário.' },
    { role: 'user', content }
  ]

  return callAI(messages)
}

export async function formatVoiceTranscript(content) {
  const systemPrompt = `Você é um especialista em transcrição e edição de textos. 
Sua tarefa é receber um texto bruto ditado por voz e formatá-lo da forma mais natural e humana possível. 
Regras:
1. Identifique as quebras de pensamento lógico e pausas implícitas como o fim de uma oração, adicionando o ponto final (.).
2. Toda frase ou oração deve sempre começar com letra maiúscula. 
3. Adicione vírgulas, pontos de interrogação ou afirmações quando o contexto exigir. 
4. Não invente ou adicione informações; mantenha as palavras originais o máximo possível, apenas arrumando a capitalização e separação de orações. 
Retorne apenas o texto formatado. Não inclua conversação, apenas o texto bruto formatado.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content }
  ]

  return callAI(messages)
}

export async function chatWithNotes(chatHistory, allNotes) {
  // Pega a última pergunta do usuário para usar como termo de busca
  const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user')?.content || ''
  
  // Stopwords comuns em português que não agregam valor à busca semântica léxica
  const stopwords = new Set(['como', 'onde', 'esta', 'estao', 'que', 'para', 'com', 'nesta', 'neste', 'pelo', 'pela', 'mais', 'sobre', 'quem', 'qual', 'quais', 'esse', 'essa', 'este', 'esta', 'tudo'])
  
  const searchTerms = normalizeText(lastUserMsg)
    .split(/[\W_]+/)
    .filter(w => w.length >= 2 && !stopwords.has(w))

  const activeNotes = allNotes.filter(n => !n.isDeleted)
  
  // Pontua as notas com base na relevância (Pesos: Título > Tags > Conteúdo)
  const scoredNotes = activeNotes.map(n => {
    const title = normalizeText(n.title || '')
    const content = normalizeText(n.content || '')
    const tags = (n.tags || []).map(t => normalizeText(t)).join(' ')
    
    let score = 0
    searchTerms.forEach(term => {
      // Peso altíssimo para Título
      if (title.includes(term)) score += 20
      // Peso alto para Tags
      if (tags.includes(term)) score += 15
      // Peso moderado para Conteúdo
      if (content.includes(term)) score += 5
    })
    
    // Desempate: notas mais recentes ganham frações de ponto
    const timeScore = new Date(n.updatedAt || n.createdAt || 0).getTime() / 1e15
    return { ...n, score: score + timeScore }
  })

  // Ordena pelas mais relevantes primeiro. Filtra quem tem score 0 (opcional, mas bom se houver mt nota)
  scoredNotes.sort((a, b) => b.score - a.score)
  
  // Se não encontrou nada relevante, talvez queira pegar as últimas modificadas de qualquer forma? 
  // Por enquanto, confiamos no scoring.

  // Limita o contexto a aprox 250.000 caracteres (~60-70k tokens)
  const MAX_CHARS = 250000
  let currentChars = 0
  const selectedNotesStr = []

  for (const n of scoredNotes) {
    const noteStr = `Data: ${new Date(n.createdAt).toLocaleDateString('pt-BR')}\nTítulo: ${n.title || 'Sem título'}\nConteúdo: ${n.content || ''}\n---`
    if (currentChars + noteStr.length > MAX_CHARS) {
      break
    }
    selectedNotesStr.push(noteStr)
    currentChars += noteStr.length
  }

  const notesContext = selectedNotesStr.join('\n\n')

  const systemPrompt = `Você é o assistente inteligente do BartNotes, um "Segundo Cérebro" do usuário.
Responda às perguntas do usuário preferencialmente com base nas anotações fornecidas abaixo (que foram filtradas por relevância do sistema).
Sempre que citar uma nota específica que faça parte do contexto fornecido, use o formato [[Título da Nota]] para criar um link clicável.
Seja conciso, direto e amigável. Se a resposta requerer conhecimento externo ou a nota não contiver a resposta, mencione isso.

NOTAS DO USUÁRIO SELECIONADAS:
${notesContext}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory
  ]

  return callAI(messages)
}

export async function transcribeAudio(file) {
  const { apiKey, provider, customEndpoint } = useAiStore.getState()
  
  if (!apiKey) throw new Error('API key não configurada')

  let url = ''
  let modelName = 'whisper-1'
  
  if (provider === 'custom') {
    url = customEndpoint ? customEndpoint.replace('/chat/completions', '/audio/transcriptions') : 'https://api.openai.com/v1/audio/transcriptions'
    modelName = 'whisper-large-v3'
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/audio/transcriptions'
    modelName = 'whisper-1'
  } else {
    throw new Error('Upload de áudio suportado apenas para OpenAI ou Groq (Custom). Tente alterar seu provedor nas configurações.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', modelName)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || err.message || `Erro na API de Áudio (${response.status})`)
  }

  const data = await response.json()
  return data.text || ''
}
