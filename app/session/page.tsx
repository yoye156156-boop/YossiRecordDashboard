"use client";
import { useEffect, useRef, useState } from "react";
import { upsertSession } from "../../lib/sessions.js";
import { saveAudio } from "../../lib/audioStore.js";
import { computeRms, smoother } from "../../lib/audioLevel.js";
import { startMockStream } from "../../lib/mockStream.js";

type Sess = { id: string, at: string, lines: string[] };

const canUseMic = () =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  !!navigator.mediaDevices &&
  !!navigator.mediaDevices.getUserMedia;

export default function SessionPage() {
  const [sess, setSess] = useState<Sess | null>(null);
  const [vu, setVu] = useState(0);
  const [running, setRunning] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortMockRef = useRef<AbortController | null>(null);

  // יצירת סשן חדש
  const newSession = () => {
    const s: Sess = { id: Date.now().toString(), at: new Date().toISOString(), lines: [] };
    setSess(s);
    upsertSession(s);
    return s;
  };

  const appendLine = (line: string) => {
    setSess((prev) => {
      if (!prev) return prev;
      const next = { ...prev, lines: [...prev.lines, line] };
      upsertSession(next);
      return next;
    });
  };

  // הפעלת מוק (עברית כל 2 שניות)
  const startMock = () => {
    const ctrl = new AbortController();
    abortMockRef.current = ctrl;
    startMockStream({ onLine: appendLine, signal: ctrl.signal, intervalMs: 2000 });
  };

  const stopMock = () => {
    abortMockRef.current?.abort();
    abortMockRef.current = null;
  };

  const startMic = async () => {
    // אם אין הרשאות/localhost — אל תקרוס; הסבר + מוק
    if (!canUseMic()) {
      alert(
        "הדפדפן לא מאפשר מיקרופון ללא HTTPS/localhost.\n" +
        "פתח דרך http://localhost:3000 (למשל עם SSH Tunnel),\n" +
        "או גלוש מתוך קאלי ב-127.0.0.1. נמשיך במצב מדומה."
      );
      startMock();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MediaRecorder
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => ev.data && chunksRef.current.push(ev.data);
      mr.start();

      // WebAudio VU
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      analyserRef.current = an;

      const smooth = smoother(0.2);
      const buf = new Float32Array(an.frequencyBinCount);

      const tick = () => {
        an.getFloatTimeDomainData(buf);
        const rms = computeRms(buf);
        setVu(smooth(rms));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      alert("לא ניתן לפתוח מיקרופון: " + (err?.message ?? err));
      startMock();
    }
  };

  const stopAll = async () => {
    // עצירת מוק אם רץ
    stopMock();

    // עצירת הקלטה
    const mr = recRef.current;
    if (mr && mr.state !== "inactive") {
      const done = new Promise<void>((res) => (mr.onstop = () => res()));
      mr.stop();
      await done;
      // שמירת אודיו
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (sess) await saveAudio(sess.id, blob);
    }

    // עצירת סטראים
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // ניקוי VU
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const start = async () => {
    if (running) return;
    const s = newSession();
    appendLine("שלום מה שלומך היום");
    setRunning(true);
    await startMic();          // יפעיל מיקרופון או מוק
  };

  const stop = async () => {
    if (!running) return;
    await stopAll();
    setRunning(false);
    appendLine("סיום סשן");
  };

  useEffect(() => {
    return () => { stopAll().catch(() => {}); };
  }, []);

  const barWidth = Math.min(100, Math.round((vu || 0) * 300));

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 16 }}>
      <h1>סשן</h1>
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <button onClick={start} disabled={running}>התחל</button>
        <button onClick={stop} disabled={!running}>עצור</button>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>עוצמת קול (VU)</div>
        <div style={{ width: 300, height: 12, background: "#eee", borderRadius: 6 }}>
          <div style={{
            width: barWidth,
            height: 12,
            background: "#3b82f6",
            borderRadius: 6,
            transition: "width 80ms linear"
          }}/>
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>תמלול</h2>
      <ul>
        {(sess?.lines || []).map((ln, i) => <li key={i} style={{ textAlign: "right" }}>{ln}</li>)}
      </ul>
    </main>
  );
}
