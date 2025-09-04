'use client'
import { useEffect, useRef, useState } from 'react'
import { saveSession } from '../../lib/sessions.js'

export default function SessionPage() {
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const timerRef = useRef<NodeJS.Timer | null>(null)

  const sentences = [
    'שלום, מה שלומך היום?',
    'נשום עמוק ונספור עד חמש.',
    'אני כאן כדי להקשיב.',
    'בוא נדבר על מה שחשוב לך.'
  ]

  const start = () => {
    if (timerRef.current) return
    let i = 0
    timerRef.current = setInterval(() => {
      setLines(prev => [...prev, sentences[i++ % sentences.length]])
    }, 2000)
    setRunning(true)
  }

  const hardStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setRunning(false)
  }

  const stopAndSave = () => {
    hardStop()
    if (lines.length > 0) {
      const session = { id: String(Date.now()), at: new Date().toISOString(), lines }
      saveSession(session)
    }
  }

  useEffect(() => () => hardStop(), [])

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>פגישה בזמן אמת</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {!running ? (
          <button onClick={start}>התחל</button>
        ) : (
          <>
            <button onClick={stopAndSave}>עצור ושמור</button>
            <button onClick={hardStop}>עצור בלי לשמור</button>
          </>
        )}
        <button onClick={() => setLines([])}>נקה תמלול</button>
      </div>
      <div style={{ border: '1px solid #ddd', padding: 12, minHeight: 200 }}>
        {lines.length === 0 ? (
          <div style={{ color: '#888' }}>אין עדיין תמלול…</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lines.map((s, idx) => (
              <li key={idx} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
