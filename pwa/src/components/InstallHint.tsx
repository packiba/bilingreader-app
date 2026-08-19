export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export default function InstallHint() {
  const standalone = isStandalone()
  if (standalone) return null
  return (
    <div className="hint" style={{ border: '1px dashed var(--divider)', borderRadius: 10, padding: 12, marginTop: 24 }}>
      <strong>Используйте в полноэкранном режиме:</strong>
      <br />
      1. Откройте Safari.
      <br />
      2. Нажмите «Поделиться» (квадрат со стрелкой).
      <br />
      3. Выберите «На главный экран».
      <br />
      Приложение установится как иконка и будет работать офлайн.
    </div>
  )
}