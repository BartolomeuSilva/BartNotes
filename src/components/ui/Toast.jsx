import { useUiStore } from '../../store/uiStore'

export default function ToastContainer() {
  const toasts = useUiStore(s => s.toasts)
  return (
    <>
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.message}</div>
      ))}
    </>
  )
}
