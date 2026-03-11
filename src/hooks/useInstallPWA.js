import { useState, useEffect } from 'react'

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstallPWA() {
  const [installed, setInstalled] = useState(isInStandaloneMode())
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)

    // Atualiza se entrar em standalone (ex: após instalar e reabrir)
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMqChange = (e) => { if (e.matches) setInstalled(true) }
    mq.addEventListener('change', onMqChange)

    return () => {
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener('change', onMqChange)
    }
  }, [])

  const install = async () => {
    if (isIOS()) {
      setShowIOSHint(v => !v)
      return
    }
    // Usa o prompt nativo se disponível
    if (window.__pwaInstallPrompt) {
      window.__pwaInstallPrompt.prompt()
      const { outcome } = await window.__pwaInstallPrompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        window.__pwaInstallPrompt = null
      }
      return
    }
    // Fallback: instrução manual para Chrome/Linux
    alert('Para instalar:\nChrome → menu (⋮) → "Instalar BartNotes"\nBrave → menu → "Instalar site como app"')
  }

  return {
    canInstall: !installed,
    install,
    ios: isIOS(),
    showIOSHint,
    setShowIOSHint,
  }
}
