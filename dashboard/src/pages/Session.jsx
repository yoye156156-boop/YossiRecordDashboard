import { useEffect, useRef, useState } from 'react';
import { saveMarkers } from '../utils/api';

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';
const QUICK_TAGS = ['מחשבה שלילית', 'תובנה', 'רגע קשה', 'מטרה', 'פתרון'];

export default function Session() {
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState('');
  const mediaRecorderRef = useRef(null);
  const startTimeRef = useRef(0);
  const [markers, setMarkers] = useState([]);

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const lf = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) lf.push(e.data); };
    mr.onstop = () => setChunks(lf);
    mr.start();
    mediaRecorderRef.current = mr;
    startTimeRef.current = performance.now();
    setMarkers([]);
    setRecording(true);
  }
  function stop() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function fmt(ms) {
    const sec = Math.floor(ms / 1000);
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  function addMarker(tag = '') {
    const t = performance.now() - startTimeRef.current;
    setMarkers((m) => [...m, { time: fmt(t), tag }]);
  }

  async function upload() {
    if (chunks.length === 0) return;
    setUploading(true);
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const fd = new FormData();
      const name = `rec-${Date.now()}.webm`;
      fd.append('file', blob, name);
      const r = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
      const js = await r.json();
      if (js?.ok) {
        setLastUploaded(js.name);
        if (markers.length) await saveMarkers(js.name, markers);
        alert('הועלה בהצלחה');
      } else {
        alert(js?.error || 'שגיאת העלאה');
      }
    } catch (e) {
      alert(`שגיאה: ${e.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">פגישת הקלטה</h2>
      <div className="flex gap-2 flex-wrap">
        {!recording && <button className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={start}>התחל</button>}
        {recording && <button className="px-4 py-2 rounded-2xl bg-amber-600 text-white hover:bg-amber-700" onClick={stop}>עצור</button>}
        <button className="px-4 py-2 rounded-2xl border hover:bg-gray-50" disabled={recording || chunks.length === 0 || uploading} onClick={upload}>העלה</button>
        <button className="px-4 py-2 rounded-2xl border hover:bg-gray-50" disabled={!recording} onClick={() => addMarker('')}>סמן רגע</button>
        {recording && QUICK_TAGS.map(t => (
          <button key={t} className="px-3 py-1 rounded-2xl border hover:bg-gray-50" onClick={() => addMarker(t)}>{t}</button>
        ))}
      </div>

      {recording && (
        <div className="text-sm text-gray-600">מקליט… הוסף סמנים ברגעי מפתח, ואז עצור והעלה.</div>
      )}

      {markers.length > 0 && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-1">סמנים ({markers.length})</div>
          <ul className="list-disc pr-6 text-sm">
            {markers.map((m, i) => <li key={i}>{m.time} – {m.tag || 'סמן'}</li>)}
          </ul>
        </div>
      )}

      {lastUploaded && (
        <div className="text-sm">הועלה כ: <span className="font-mono">{lastUploaded}</span></div>
      )}
    </div>
  );
}
