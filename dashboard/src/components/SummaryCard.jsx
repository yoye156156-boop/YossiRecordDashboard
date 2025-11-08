import { useEffect, useState } from 'react';
import { summarize, getSummary, notesDownloadLink } from '../utils/api';

export default function SummaryCard({ name }) {
  const base = name.replace(/\.[^.]+$/, '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(true); // collapse

  async function load() {
    try {
      setError('');
      const res = await getSummary(base);
      if (res?.ok) setData(res.summary);
      else if (res?.error) setError(res.error);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינת הסיכום');
    }
  }

  useEffect(() => { load(); }, [name]);

  // ⏱️ ריענון אוטומטי ~1.5ש׳ אחרי העלאה (הדפדפן יורה אירוע גלובלי)
  useEffect(() => {
    function onUploaded(ev) {
      const uploaded = ev?.detail?.name || '';
      const uploadedBase = uploaded.replace(/\.[^.]+$/, '');
      if (uploadedBase === base) {
        setTimeout(() => load(), 1500); // לתת זמן לכתיבה לדיסק
      }
    }
    window.addEventListener('recording:uploaded', onUploaded);
    return () => window.removeEventListener('recording:uploaded', onUploaded);
  }, [base]);

  async function handleCreate() {
    try {
      setLoading(true); setError('');
      const res = await summarize(name);
      if (res?.ok) setData(res.summary);
      else setError(res?.error || 'שגיאה ביצירת סיכום');
    } catch (e) {
      setError(e.message || 'שגיאה ביצירת סיכום');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border p-3 bg-white/60 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">כתב אחרי</h4>
          {/* Badge קטן: יש / אין סיכום */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${data ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {data ? 'יש סיכום' : 'אין סיכום'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(o => !o)}
            className="px-3 py-1 rounded-xl border hover:bg-gray-50"
            title={open ? 'סגור' : 'פתח'}
          >
            {open ? 'סגור' : 'פתח'}
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-3 py-1 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? 'יוצר…' : (data ? 'רענן' : 'צור סיכום')}
          </button>
          {data && (
            <>
              <a
                href={notesDownloadLink(base)}
                className="px-3 py-1 rounded-xl border hover:bg-gray-50"
                download
              >
                הורד Markdown
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001'}/api/notes/pdf/${encodeURIComponent(base)}`}
                className="px-3 py-1 rounded-xl border hover:bg-gray-50"
              >
                הורד PDF
              </a>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {open && (
        <>
          {!data && !error && (
            <p className="text-sm text-gray-500 mt-2">אין עדיין סיכום.</p>
          )}

          {data && (
            <div className="text-sm text-gray-700 mt-3 space-y-2">
              <p>
                <span className="font-medium">מצב רגשי:</span> {data.mood}
              </p>

              <div>
                <span className="font-medium">מחשבות אוטומטיות:</span>
                <ul className="list-disc pr-6">
                  {data.automaticThoughts?.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-medium">עיוותים קוגניטיביים:</span>
                <ul className="list-disc pr-6">
                  {data.cognitiveDistortions?.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-medium">תובנות:</span>
                <ul className="list-disc pr-6">
                  {data.insights?.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-medium">משימות בית:</span>
                <ul className="list-disc pr-6">
                  {data.homework?.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
