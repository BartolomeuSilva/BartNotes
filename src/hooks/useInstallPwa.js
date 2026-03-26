import { useState, useEffect } from 'react'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

export function useInstallPwa() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isInStandaloneMode())
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Previne o navegador de mostrar o prompt padrão
      e.preventDefault()
      // Guarda o evento para acionarmos no nosso botão
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Atualiza se entrar em standalone (ex: após instalar e reabrir)
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMqChange = (e) => { if (e.matches) setIsInstalled(true) }
    mq.addEventListener('change', onMqChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mq.removeEventListener('change', onMqChange)
    }
  }, [])

  const promptInstall = async () => {
    if (isIOS()) {
      setShowIOSHint(v => !v)
      return
    }

    if (!deferredPrompt) {
      if (!isInstalled) {
        // Fallback: instrução manual para Chrome/Linux se o evento não disparou
        alert('Para instalar:\nChrome → menu (⋮) → "Instalar BartNotes"\nBrave → menu → "Instalar site como app"')
      }
      return
    }
    
    // Chama a caixa de instalação real do Sistema Operacional
    deferredPrompt.prompt()
    
    // Espera o usuário clicar "Instalar" ou "Cancelar"
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
    }
  }

  return { 
    isInstallable, 
    isInstalled, 
    promptInstall, 
    install: promptInstall, // alias para LoginPage.jsx
    canInstall: isInstallable && !isInstalled, // alias para LoginPage.jsx
    ios: isIOS(), 
    showIOSHint, 
    setShowIOSHint 
  }
}
