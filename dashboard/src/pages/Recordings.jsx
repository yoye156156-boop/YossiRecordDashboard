import React, { useEffect, useMemo, useRef, useState } from "react";
import ApiLink from "../components/ApiLink.jsx";
import ApiError from "../components/ApiError.jsx";
import { dateHe, relativeHe } from "../utils/dateHelpers.js";
import { renameItem } from "../utils/renameItem.js";

const API = (import.meta.env?.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

/** תאריך עברית + יחסי */
const fmtDate = (msOrIso) => {
  if (!msOrIso) return "";
  const d = new Date(msOrIso);
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(d);
};

const DateCell = ({ value }) => {
  const abs = dateHe(value);
  const rel = relativeHe(value);
  const label = fmtDate(value);
  return <span title={abs || label}>{label}{rel ? (" · " + rel) : ""}</span>;
};

export default function Recordings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [q, setQ] = useState("");
  const audioRef = useRef(null);

  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/api/recordings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // השרת שלך מחזיר לפעמים מערך ולפעמים {items:[]}, נתמוך בשניהם
      const list = Array.isArray(data) ? data : (data.items || []);
      setRows(list);
    } catch (e) {
      console.error(e);
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [refresh]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      (r.name || "").toLowerCase().includes(term) ||
      (r.ext || "").toLowerCase().includes(term) ||
      (r.mime || "").toLowerCase().includes(term) ||
      String(r.sizeKB || "").includes(term)
    );
  }, [rows, q]);

  const playItem = (name) => {
    const url = `${API}/recordings/${encodeURIComponent(name)}`;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(console.warn);
    }
  };

  const downloadItem = (name) => {
    const url = `${API}/recordings/${encodeURIComponent(name)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const deleteItem = async (name) => {
    if (!confirm(`למחוק את "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/api/recordings/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
      setRefresh(x => x + 1);
    } catch (e) {
      alert(`שגיאה במחיקה: ${e.message || e}`);
    }
  };

  const handleRename = async (oldName) => {
    const ext = (oldName.match(/\.[^.]+$/) || [""])[0];
    const baseDefault = oldName.replace(/\.[^.]+$/, "");
    const input = window.prompt("שם חדש (כולל סיומת אם תרצה):", baseDefault + ext);
    if (!input) return;
    const newName = input.trim();
    if (!newName) return;
    try {
      const res = await renameItem(API, oldName, newName);
      if (!res.ok) throw new Error(res.error || "RENAME_FAILED");
      setRefresh(x => x + 1);
    } catch (e) {
      alert("שגיאה בשינוי שם: " + (e.message || e));
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-xl font-bold">הקלטות</h1>
        <ApiLink api={API} />
      </div>

      {err && <ApiError message={`שגיאה בטעינה: ${err}`} />}

      <div className="mb-3 flex gap-2 items-center">
        <input
          dir="rtl"
          className="border rounded px-3 py-2 flex-1"
          placeholder="…חיפוש לפי שם/תאריך/סוג"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setRefresh(x => x + 1)}
          disabled={loading}
        >
          רענן
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:p-3 text-right">
              <th>שם</th>
              <th>גודל (KB)</th>
              <th>תאריך</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan="4">טוען…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-3" colSpan="4">אין פריטים</td></tr>
            ) : filtered.map((row) => {
              const key = row.name;
              const when = row.mtime ?? row.mtimeISO ?? null;
              return (
                <tr key={key} className="border-t [&>td]:p-3">
                  <td className="font-mono break-all">{row.name}</td>
                  <td>{row.sizeKB ?? ""}</td>
                  <td><DateCell value={when} /></td>
                  <td className="flex flex-wrap gap-2">
                    <button className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100" onClick={() => playItem(row.name)}>נגן</button>
                    <button className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100" onClick={() => downloadItem(row.name)}>הורדה</button>
                    <button className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100" onClick={() => handleRename(row.name)}>שינוי שם</button>
                    <button className="px-2 py-1 rounded bg-red-50 hover:bg-red-100" onClick={() => deleteItem(row.name)}>מחיקה</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <audio ref={audioRef} className="mt-4 w-full" controls />
    </div>
  );
}
