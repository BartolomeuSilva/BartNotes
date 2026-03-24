import { useState, useEffect } from 'react'

export function useInstallPwa() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verifica se já está rodando como App Independente (Standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e) => {
      // Previne o navegador de mostrar o prompt padrão chato
      e.preventDefault()
      // Guarda o evento para acionarmos no nosso botão verde maravilhoso
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    
    // Chama a caixa de instalação real do Sistema Operacional
    deferredPrompt.prompt()
    
    // Espera o usuário clicar "Instalar" ou "Cancelar"
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstallable(false)
    }
  }

  return { isInstallable, isInstalled, promptInstall }
}
