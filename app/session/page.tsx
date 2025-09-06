"use client"

import { useEffect, useRef, useState } from "react"
import { saveSession } from "../../lib/sessions.js"
import { startMockHebrewStream } from "../../lib/mockStream.js"
import { rms, smooth } from "../../lib/audioLevel.js"

type Sess = { id: string, at: string, lines: string[] }

export default function SessionPage() {
  const [running, setRunning] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const [vu, setVu] = useState(0) // 0..1

  // mic / audio refs
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const levelRef = useRef(0)

  // chunks & promise that resolves to final Blob when recorder stops
  const chunksRef = useRef<Blob[]>([])
  const audioBlobPromiseRef = useRef<Promise<Blob> | null>(null)

  // mock transcript stream
  const abortCtl = useRef<AbortController | null>(null)
  const stopMock = () => { if (abortCtl.current) abortCtl.current.abort(); abortCtl.current = null }

  const startMic = async () => {
    // הרשאת מיקרופון
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    // MediaRecorder לאיסוף אודיו (נוריד כ-WebM בסוף)
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.addEventListener("dataavailable", (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) })
    const stopped = new Promise<Blob>((resolve) => {
      mr.addEventListener("stop", () => {
        const type = mr.mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        chunksRef.current = []
        resolve(blob)
      }, { once: true })
    })
    audioBlobPromiseRef.current = stopped
    mr.start(1000)
    mediaRecorderRef.current = mr

    // WebAudio למד עוצמה (VU)
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
    const ac = new AC()
    audioCtxRef.current = ac
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 1024
    src.connect(analyser)
    analyserRef.current = analyser

    const buf = new Float32Array(analyser.fftSize)
    const loop = () => {
      analyser.getFloatTimeDomainData(buf)
      const r = rms(buf)
      levelRef.current = smooth(levelRef.current, r, 0.25)
      setVu(Math.min(1, Math.max(0, levelRef.current)))
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }

  const stopMic = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(()=>{}); audioCtxRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
    if (streamRef.current) {
      for (const tr of streamRef.current.getTracks()) tr.stop()
      streamRef.current = null
    }
    setVu(0)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const start = async () => {
    setLines([])
    await startMic()
    // מוק תמלול
    abortCtl.current = new AbortController()
    startMockHebrewStream({
      intervalMs: 2000,
      abortSignal: abortCtl.current.signal,
      onData: (s: string) => setLines(prev => [...prev, s])
    })
    setRunning(true)
  }

  const stop = async () => {
    stopMock()
    stopMic()
    setRunning(false)

    // שמירת סשן טקסטואלי
    const id = String(Date.now())
    const at = new Date().toISOString()
    saveSession({ id, at, lines: [...lines] })

    // יצירת הורדת אודיו (אם יש הקלטה)
    try {
      const audioBlob = await audioBlobPromiseRef.current?.catch(() => null)
      if (audioBlob && audioBlob.size > 0) downloadBlob(audioBlob, `session-${id}.webm`)
    } catch {}
  }

  useEffect(() => () => { // ניקוי על עזיבה
    stopMock()
    stopMic()
  }, [])

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>סשן חי</h1>

      {/* עוצמת מיקרופון */}
      <div style={{ margin: "12px 0" }}>
        <div style={{ marginBottom: 6 }}>עוצמה</div>
        <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.round(vu * 100)}%`,
            background: vu > 0.75 ? "#e53935" : vu > 0.5 ? "#fb8c00" : "#43a047",
            transition: "width 60ms linear"
          }} />
        </div>
      </div>

      {/* כפתור הפעלה/עצירה */}
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        {!running ? <button onClick={start}>Start</button> : <button onClick={stop}>Stop</button>}
      </div>

      {/* תמלול */}
      <h2 style={{ marginTop: 16 }}>תמלול</h2>
      <div style={{ border: "1px solid #eee", padding: 12, minHeight: 160, whiteSpace: "pre-wrap" }}>
        {lines.length === 0 ? <span style={{ color: "#888" }}>— ריק כרגע —</span> : lines.join("\n")}
      </div>
    </main>
  )
}
