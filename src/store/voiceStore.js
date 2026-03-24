import { create } from 'zustand'

let recognition = null

export const useVoiceStore = create((set) => ({
  isRecording: false,
  transcript: '',
  error: null,

  setRecording: (isRecording) => set({ isRecording }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (error) => set({ error }),
  
  reset: () => set({ isRecording: false, transcript: '', error: null }),

  startRecording: () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      set({ error: 'Speech API não suportada. Use Chrome ou Edge.' })
      return
    }

    set({ transcript: '', error: null })

    // Create new instance
    recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false

    // Use a variable outside the closure to store transcript
    let finalTranscript = ''

    recognition.onresult = (event) => {
      finalTranscript = event.results[0][0].transcript
      set({ transcript: finalTranscript })
    }

    recognition.onstart = () => {
      set({ isRecording: true })
    }

    recognition.onend = () => {
      set({ isRecording: false })
    }

    recognition.onerror = (event) => {
      set({ error: event.error, isRecording: false })
    }

    recognition.start()
  },

  stopRecording: () => {
    if (recognition) {
      recognition.stop()
    }
  },
}))
