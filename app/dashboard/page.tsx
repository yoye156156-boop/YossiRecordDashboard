"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { loadSessions, clearSessions } from "../../lib/sessions.js"

type Sess = { id: string, at: string, lines: string[] }

export default function Dashboard() {
  const [items, setItems] = useState<Sess[]>([])
  useEffect(() => { setItems(loadSessions()) }, [])
  const clear = () => { clearSessions(); setItems([]) }

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

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>דשבורד</h1>

      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <Link href="/session"><button>התחל פגישה חדשה</button></Link>
        <button onClick={clear}>נקה היסטוריה</button>
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
              <div>
                <button onClick={() => downloadPdf(s)}>הורד PDF</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
