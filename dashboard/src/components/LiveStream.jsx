import { useEffect, useRef, useState } from 'react';
import { parseLiveText, highlightKeywords, EMOTION_STYLES } from '../utils/liveParser';

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export default function LiveStream({ sessionId, onEvent }) {
  const [lines, setLines] = useState([]);     // [{text, meta}]
  const [notes, setNotes] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    const url = `${API}/api/stream/${encodeURIComponent(sessionId)}`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);
    const onTranscript = (e) => {
      const data = JSON.parse(e.data);
      const meta = parseLiveText(data.text);
      setLines((arr) => [...arr.slice(-200), { text: data.text, meta }]);
      onEvent?.({ type: 'transcript', ...data, meta });
    };
    const onInsight = (e) => {
      const data = JSON.parse(e.data);
      setNotes((arr) => [...arr.slice(-50), data.text]);
      onEvent?.({ type: 'insight', ...data });
    };

    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);
    es.addEventListener('transcript', onTranscript);
    es.addEventListener('insight', onInsight);

    return () => {
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
      es.removeEventListener('transcript', onTranscript);
      es.removeEventListener('insight', onInsight);
      es.close();
    };
  }, [sessionId]);

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {/* תמלול חי */}
      <div className="rounded-2xl border p-3 bg-white/70">
        <div className="flex items-center justify-between">
          <div className="font-medium">תמלול חי</div>
          <div className={`text-xs ${connected ? 'text-emerald-600' : 'text-gray-500'}`}>
            {connected ? 'מחובר' : 'מנותק'}
          </div>
        </div>
        <div className="mt-2 text-sm h-44 overflow-auto leading-7 space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="rounded-xl border p-2 bg-white">
              {/* תגיות עליונות */}
              <div className="flex flex-wrap gap-2 text-xs mb-1">
                <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">סנטימנט: {l.meta.sentiment}</span>
                {l.meta.emotions.map((e) => (
                  <span key={e} className={`px-2 py-0.5 rounded-full border ${EMOTION_STYLES[e]}`}>{e}</span>
                ))}
                {l.meta.distortions.map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded-full border text-purple-700 bg-purple-50 border-purple-200">{d}</span>
                ))}
                {l.meta.keywords.map((k) => (
                  <span key={k} className="px-2 py-0.5 rounded-full border text-slate-700 bg-slate-50 border-slate-200">{k}</span>
                ))}
              </div>
              {/* טקסט עם הדגשת מילות מפתח */}
              <div>
                {highlightKeywords(l.text).map((p, idx) =>
                  p.hit
                    ? <mark key={idx} className="px-0.5 rounded bg-yellow-100">{p.text}</mark>
                    : <span key={idx}>{p.text}</span>
                )}
              </div>
            </div>
          ))}
          {lines.length === 0 && <div className="text-gray-500">ממתין לאירועים…</div>}
        </div>
      </div>

      {/* תובנות */}
      <div className="rounded-2xl border p-3 bg-white/70">
        <div className="font-medium">תובנות</div>
        <div className="mt-2 text-sm h-44 overflow-auto leading-7">
          {notes.map((n, i) => <div key={i}>• {n}</div>)}
          {notes.length === 0 && <div className="text-gray-500">טרם התקבלו תובנות…</div>}
        </div>
      </div>
    </div>
  );
}
