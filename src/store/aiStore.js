import { create } from 'zustand'

export const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic (Claude)', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
  { id: 'google', name: 'Google (Gemini)', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'custom', name: 'API Personalizada', models: [] },
]

export const useAiStore = create((set, get) => ({
  apiKey: localStorage.getItem('ai-api-key') || '',
  provider: localStorage.getItem('ai-provider') || 'openai',
  model: localStorage.getItem('ai-model') || 'gpt-4o-mini',
  customEndpoint: localStorage.getItem('ai-custom-endpoint') || '',
  autoSummarize: localStorage.getItem('ai-auto-summarize') === 'true',
  autoTags: localStorage.getItem('ai-auto-tags') === 'true',

  setApiKey: (key) => {
    localStorage.setItem('ai-api-key', key)
    set({ apiKey: key })
  },

  setProvider: (provider) => {
    localStorage.setItem('ai-provider', provider)
    const providerInfo = AI_PROVIDERS.find(p => p.id === provider)
    const defaultModel = providerInfo?.models?.[0] || ''
    localStorage.setItem('ai-model', defaultModel)
    set({ provider, model: defaultModel })
  },

  setModel: (model) => {
    localStorage.setItem('ai-model', model)
    set({ model })
  },

  setCustomEndpoint: (endpoint) => {
    localStorage.setItem('ai-custom-endpoint', endpoint)
    set({ customEndpoint: endpoint })
  },

  setAutoSummarize: (enabled) => {
    localStorage.setItem('ai-auto-summarize', enabled)
    set({ autoSummarize: enabled })
  },

  setAutoTags: (enabled) => {
    localStorage.setItem('ai-auto-tags', enabled)
    set({ autoTags: enabled })
  },

  hasApiKey: () => !!get().apiKey,
}))
