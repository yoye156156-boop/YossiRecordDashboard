import { useEffect, useState } from "react";
import RenameButton from "../components/RenameButton.jsx";
import {
  recordingUrl,
  markdownUrl,
  pdfUrl,
  summaryJsonUrl,
  deleteRecording,
} from "../utils/api";

export default function Recordings() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function fetchList() {
    try {
      setLoading(true);
      setErr("");
      const base = import.meta.env.VITE_API_URL || "";
      const r = await fetch(`${base}/api/recordings?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const items = Array.isArray(data)
        ? data.map((x) => (typeof x === "string" ? { name: x } : x))
        : Array.isArray(data?.items)
        ? data.items.map((x) => (typeof x === "string" ? { name: x } : x))
        : [];
      setList(items);
    } catch (e) {
      setErr(e?.message || "load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  if (loading) return <div className="p-6">טוען…</div>;
  if (err) return <div className="p-6 text-red-600">שגיאה: {String(err)}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">ארכיון הקלטות</h1>
      {list.length === 0 ? (
        <div className="text-gray-500">אין עדיין הקלטות.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => {
            const name = item.name || String(item);
            const base = name.replace(/\.webm$/i, "");
            return (
              <li key={name} className="flex items-center justify-between rounded-xl border p-3 gap-3">
                <div className="truncate text-sm">{name}</div>
                <div className="flex items-center gap-2">
                  <a className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                     href={recordingUrl(name)}
                     target="_blank" rel="noreferrer">
                    האזנה
                  </a>

                  <a className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                     href={recordingUrl(name)}
                     download>
                    הורדה
                  </a>

                  <a className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                     href={markdownUrl(base)}
                     target="_blank" rel="noreferrer">
                    Markdown
                  </a>

                  <a className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                     href={pdfUrl(base)}
                     target="_blank" rel="noreferrer">
                    PDF
                  </a>

                  <a className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
                     href={summaryJsonUrl(base)}
                     target="_blank" rel="noreferrer">
                    כתב אחרי (JSON)
                  </a>

                  <RenameButton name={name} onDone={fetchList} />

                  <button
                    className="px-3 py-1 rounded-lg border text-sm hover:bg-red-50 text-red-600"
                    onClick={async () => {
                      if (!confirm("למחוק את ההקלטה?")) return;
                      try { await deleteRecording(name); await fetchList(); }
                      catch (e) { alert("מחיקה נכשלה: " + (e?.message || "unknown")); }
                    }}>
                    מחיקה
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
