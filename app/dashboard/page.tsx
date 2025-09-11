"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSessions, clearSessions } from "../../lib/sessions.js";

type Sess = { id: string; at: string; lines: string[] };

function bufToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
<div>
  <button onClick={() => downloadPdf(s)} style={{marginInlineEnd:8}}>הורד PDF</button>
  <button onClick={() => downloadArchive(s)}>הורד ארכיון</button>
</div>
<div>
  <button onClick={() => downloadPdf(s)} style={{ marginInlineEnd: 8 }}>הורד PDF</button>
  <button onClick={() => downloadArchive(s)}>הורד ארכיון</button>
</div>


export default function Dashboard() {
  const [items, setItems] = useState<Sess[]>([]);

  useEffect(() => {
    try { setItems(loadSessions()); } catch { setItems([]); }
  }, []);

  const clear = () => { clearSessions(); setItems([]); };

  const removeOne = async (id: string) => {
    // מוחק מ-localStorage
    const next = items.filter(x => x.id !== id);
    try {
      const raw = localStorage.getItem("sessions");
      const arr = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter((x: any) => x?.id !== id);
      localStorage.setItem("sessions", JSON.stringify(filtered));
    } catch {}
    setItems(next);

    // מוחק גם את האודיו מה-IndexedDB אם קיים
    try {
      const store = await import("../../lib/audioStore.js");
      if (typeof store.del === "function") await store.del(id);
    } catch {}
  };

  const downloadPdf = async (s: Sess) => {
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          title: `דוח פגישה #${s.id}`,
          date: s.at,
          lines: s.lines,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${s.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("שגיאה ביצירת PDF: " + (e?.message || e));
    }


const downloadArchive = async (s: Sess) => {
  try {
    const res = await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: s.id,
        title: `דוח פגישה #${s.id}`,
        date: s.at,
        lines: s.lines
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-${s.id}.tar.gz`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e:any) {
    alert("שגיאה ביצירת ארכיון: " + e.message);
  }
};


const downloadArchive = async (s: Sess) => {
  try {
    const res = await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: s.id,
        title: `דוח פגישה #${s.id}`,
        date: s.at,
        lines: s.lines
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `session-${s.id}.tar.gz`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e:any) {
    alert("שגיאה ביצירת ארכיון: " + e.message)
  }
}

  const downloadArchive = async (s: Sess) => {
    try {
      let audioBase64: string | undefined = undefined;
      try {
        const store = await import("../../lib/audioStore.js");
        if (typeof store.get === "function") {
          const blob: Blob | null = await store.get(s.id);
          if (blob) {
            const ab = await blob.arrayBuffer();
            audioBase64 = bufToBase64(ab);
          }
        }
      } catch {}

      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: s.id,
          title: `דוח פגישה #${s.id}`,
          date: s.at,
          lines: s.lines,
          audioBase64,
          audioName: `audio-${s.id}.webm`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${s.id}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("שגיאה ביצירת ארכיון: " + (e?.message || e));
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16, direction: "rtl" }}>
      <h1 style={{ marginBottom: 16 }}>דשבורד</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Link href="/session"><button>התחל פגישה חדשה</button></Link>
        <button onClick={clear}>נקה היסטוריה</button>
      </div>

      <h2 style={{ margin: "12px 0" }}>פגישות אחרונות</h2>

      {items.length === 0 ? (
        <div style={{ color: "#888" }}>
          אין נתונים עדיין. פתח/י <Link href="/session">סשן חדש</Link>, לחץ/י Start ואז Stop לשמירה.
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #eee" }}>
          {items.map((s) => (
            <li
              key={s.id}
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #f5f5f5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div><b>{new Date(s.at).toLocaleString("he-IL")}</b></div>
                <div style={{ color: "#555" }}>{s.lines?.[0] || "(ללא תוכן)"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => downloadPdf(s)}>הורד PDF</button>
                <button onClick={() => downloadArchive(s)}>הורד ארכיון (.tar.gz)</button>
                <button onClick={() => removeOne(s.id)}>מחק</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
