import { create } from 'zustand'
import { noteSingleCache } from '../lib/cache'

let recognition = null

const VOICE_STORAGE_KEY = 'bartnotes_voice_transcript'

function saveToStorage(transcript) {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify({
      transcript,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.warn('[voiceStore] Falha ao salvar no storage:', e)
  }
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(VOICE_STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed.transcript
      }
      localStorage.removeItem(VOICE_STORAGE_KEY)
    }
  } catch (e) {
    console.warn('[voiceStore] Falha ao carregar do storage:', e)
  }
  return ''
}

function clearStorage() {
  try {
    localStorage.removeItem(VOICE_STORAGE_KEY)
  } catch (e) {
    console.warn('[voiceStore] Falha ao limpar storage:', e)
  }
}

export const useVoiceStore = create((set, get) => ({
  isRecording: false,
  transcript: '',
  error: null,
  hasStoredTranscript: false,

  setRecording: (isRecording) => set({ isRecording }),
  setTranscript: (transcript) => {
    set({ transcript })
    if (transcript) {
      saveToStorage(transcript)
    }
  },
  setError: (error) => set({ error }),
  
  reset: () => {
    set({ isRecording: false, transcript: '', error: null, hasStoredTranscript: false })
    clearStorage()
  },

  checkStoredTranscript: () => {
    const stored = loadFromStorage()
    if (stored) {
      set({ transcript: stored, hasStoredTranscript: true })
      return stored
    }
    return ''
  },

  startRecording: () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      set({ error: 'Speech API não suportada. Use Chrome ou Edge.' })
      return
    }

    const currentTranscript = get().transcript
    set({ transcript: currentTranscript, error: null, hasStoredTranscript: false })
    clearStorage()

    if (recognition) {
      try {
        recognition.stop()
      } catch (e) {}
    }

    recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false

    let finalTranscript = currentTranscript

    recognition.onresult = (event) => {
      finalTranscript = event.results[0][0].transcript
      set({ transcript: finalTranscript })
      saveToStorage(finalTranscript)
    }

    recognition.onstart = () => {
      set({ isRecording: true, error: null })
    }

    recognition.onend = () => {
      set({ isRecording: false })
    }

    recognition.onerror = (event) => {
      console.error('[voiceStore] Erro no SpeechRecognition:', event.error)
      let errorMsg = event.error
      
      if (event.error === 'no-speech') {
        errorMsg = 'Nenhuma fala detectada. Tente falar mais alto.'
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Microfone não permitido. Verifique as permissões do navegador.'
      } else if (event.error === 'network') {
        errorMsg = 'Erro de rede. Verifique sua conexão.'
      }
      
      set({ error: errorMsg, isRecording: false })
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('[voiceStore] Erro ao iniciar reconhecimento:', e)
      set({ error: 'Erro ao iniciar gravação', isRecording: false })
    }
  },

  stopRecording: () => {
    if (recognition) {
      try {
        recognition.stop()
      } catch (e) {
        console.warn('[voiceStore] Erro ao parar reconhecimento:', e)
      }
      recognition = null
    }
    set({ isRecording: false })
  },
}))
