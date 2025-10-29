'use client';
import { useRef, useState } from 'react';

export default function Page() {
  const [status, setStatus] = useState<'idle'|'recording'|'stopped'>('idle');
  const [lines, setLines] = useState<string[]>([]);
  const partialIndexRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket|null>(null);
  const mrRef = useRef<MediaRecorder|null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // כאן הדפדפן יבקש הרשאה
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 });
    const ws = new WebSocket(`ws://${location.hostname}:8787/realtime?provider=deepgram`);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'partial') {
          setLines(prev => {
            const copy = [...prev];
            if (partialIndexRef.current == null) { copy.push(msg.text); partialIndexRef.current = copy.length - 1; }
            else { copy[partialIndexRef.current] = msg.text; }
            return copy;
          });
        } else if (msg.type === 'final') {
          setLines(prev => {
            const copy = [...prev];
            if (partialIndexRef.current == null) copy.push(msg.text);
            else copy[partialIndexRef.current] = msg.text;
            partialIndexRef.current = null;
            return copy;
          });
        }
      } catch {}
    };

    mr.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0 && ws.readyState === ws.OPEN) {
        ev.data.arrayBuffer().then(buf => ws.send(buf));
      }
    };

    mr.start(250);
    wsRef.current = ws;
    mrRef.current = mr;
    setStatus('recording');
  }

  function stop() {
    mrRef.current?.stop();
    wsRef.current?.send(JSON.stringify({ type: 'stop' }));
    wsRef.current?.close();
    setStatus('stopped');
  }

  return (
    <div dir="rtl" style={{padding:20, display:'grid', gap:12, maxWidth:800}}>
      <h1>תמלול בזמן אמת – Deepgram</h1>
      <div style={{display:'flex', gap:8}}>
        <button onClick={start} disabled={status==='recording'}>Start</button>
        <button onClick={stop}  disabled={status!=='recording'}>Stop</button>
      </div>
      <div style={{border:'1px solid #ddd', minHeight:220, padding:8, whiteSpace:'pre-wrap'}}>
        {lines.map((l,i)=><div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
