'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { loadSessions, clearSessions } from '../../lib/sessions.js'

type Sess = { id: string, at: string, lines: string[] }

export default function Dashboard() {
  const [items, setItems] = useState<Sess[]>([])

  useEffect(() => { setItems(loadSessions()) }, [])

  const clear = () => { clearSessions(); setItems([]) }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>דשבורד</h1>

      <div style={{ display:'flex', gap:12, marginBottom:16 }}>
        <Link href='/session'><button>התחל פגישה חדשה</button></Link>
        <button onClick={clear}>נקה היסטוריה</button>
      </div>

      <h2 style={{ margin: '12px 0' }}>פגישות אחרונות</h2>
      {items.length === 0 ? (
        <div style={{ color:'#888' }}>אין נתונים עדיין.</div>
      ) : (
        <ul style={{ listStyle:'none', padding:0, margin:0, border:'1px solid #eee' }}>
          {items.map(s => (
            <li key={s.id} style={{ padding:'10px 12px', borderBottom:'1px solid #f5f5f5' }}>
              <div><b>{new Date(s.at).toLocaleString('he-IL')}</b></div>
              <div style={{ color:'#555' }}>{s.lines[0]}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
