"use client"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { loadSessions, clearSessions } from "../../lib/sessions.js"
import { getAudio, hasAudio, clearAllAudio } from "../../lib/audioStore.js"

type Sess = { id: string, at: string, lines: string[] }

export default function Dashboard() {
  const [items, setItems] = useState<Sess[]>([])
  const [audioAvail, setAudioAvail] = useState<Record<string, boolean>>({})
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const revokeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const list = loadSessions()
    setItems(list)
    ;(async () => {
      const map: Record<string, boolean> = {}
      for (const s of list) map[s.id] = await hasAudio(s.id)
      setAudioAvail(map)
    })()
  }, [])

  // ניקוי משאבים על עזיבת הדף
  useEffect(() => {
    return () => {
      try { audioRef.current?.pause() } catch {}
      audioRef.current = null
      revokeRef.current?.()
      revokeRef.current = null
    }
  }, [])

  const clear = () => { clearSessions(); setItems([]) }
  const clearAudio = async () => {
    await clearAllAudio()
    setAudioAvail({})
    alert("אודיו נמחק מהדפדפן")
  }

  const downloadPdf = async (s: Sess) => {
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, title: `דוח פגישה #${s.id}`, date: s.at, lines: s.lines }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${s.id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e:any) {
      alert("שגיאה ביצירת PDF: " + e.message)
    }
  }

  const downloadAudio = async (s: Sess) => {
    const blob = await getAudio(s.id)
    if (!blob) return alert("לא נמצא אודיו לסשן הזה")
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session-${s.id}.webm`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const togglePlay = async (s: Sess) => {
    // אם כבר מנגן את אותו סשן — עצור
    if (playingId === s.id) {
      try { audioRef.current?.pause() } catch {}
      audioRef.current = null
      revokeRef.current?.(); revokeRef.current = null
      setPlayingId(null)
      return
    }
    // עצור כל ניגון קודם
    if (audioRef.current) {
      try { audioRef.current.pause() } catch {}
      audioRef.current = null
    }
    revokeRef.current?.(); revokeRef.current = null

    // הבא Blob מה-IndexedDB
    const blob = await getAudio(s.id)
    if (!blob) { alert("לא נמצא אודיו לסשן הזה"); return }
    const url = URL.createObjectURL(blob)
    revokeRef.current = () => URL.revokeObjectURL(url)

    const a = new Audio(url)
    audioRef.current = a
    a.onended = () => {
      setPlayingId(null)
      audioRef.current = null
      revokeRef.current?.(); revokeRef.current = null
    }
    try {
      await a.play()
      setPlayingId(s.id)
    } catch (err:any) {
      revokeRef.current?.(); revokeRef.current = null
      audioRef.current = null
      alert("ניגון נכשל: " + err?.message)
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>דשבורד</h1>

      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Link href="/session"><button>התחל פגישה חדשה</button></Link>
        <button onClick={clear}>נקה היסטוריה</button>
        <button onClick={clearAudio}>נקה אודיו (IndexedDB)</button>
      </div>

      <h2 style={{ margin: "12px 0" }}>פגישות אחרונות</h2>
      {items.length === 0 ? (
        <div style={{ color:"#888" }}>אין נתונים עדיין.</div>
      ) : (
        <ul style={{ listStyle:"none", padding:0, margin:0, border:"1px solid #eee" }}>
          {items.map(s => (
            <li key={s.id} style={{ padding:"10px 12px", borderBottom:"1px solid #f5f5f5", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <div>
                <div><b>{new Date(s.at).toLocaleString("he-IL")}</b></div>
                <div style={{ color:"#555" }}>{s.lines[0]}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => downloadPdf(s)}>הורד PDF</button>
                <button onClick={() => downloadAudio(s)} disabled={!audioAvail[s.id]}>הורד אודיו</button>
                <button onClick={() => togglePlay(s)} disabled={!audioAvail[s.id]}>
                  {playingId === s.id ? "עצור" : "נגן"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
