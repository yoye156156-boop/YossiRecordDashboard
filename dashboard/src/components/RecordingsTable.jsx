import React, { useMemo, useState } from "react";

const MEDIA_RE = /\.(wav|mp3|m4a|aac|oga|ogg|opus|flac|mp4|webm|mov|mkv|avi|ogv)$/i;

const formatBytes = (bytes) => {
  if (typeof bytes !== "number") return "-";
  const units = ["B","KB","MB","GB","TB"];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};
const formatDate = (ms) => (typeof ms !== "number" ? "-" : new Date(ms).toLocaleString("he-IL"));

export default function RecordingsTable({ recordings, onDelete }) {
  const normalized = useMemo(() => {
    return (recordings || []).map((item) =>
      typeof item === "string" ? { name: item, size: undefined, mtimeMs: undefined } : item
    );
  }, [recordings]);

  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [playing, setPlaying] = useState(null); // name של הקובץ המנוגן כרגע

  const sorted = useMemo(() => {
    const arr = [...normalized];
    arr.sort((a, b) => {
      const A = a?.[sortKey], B = b?.[sortKey];
      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      if (sortKey === "name") {
        const cmp = String(A).localeCompare(String(B), "he");
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = Number(A) - Number(B);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [normalized, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDownload = (name) => {
    const a = document.createElement("a");
    a.href = `http://localhost:3001/api/download/${encodeURIComponent(name)}`;
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const SortIcon = ({ active, dir }) => (
    <span className="inline-block ms-1 select-none" aria-hidden="true">
      {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
    </span>
  );

  return (
    <table className="w-full border-collapse text-right shadow-sm rounded-xl overflow-hidden">
      <thead className="bg-blue-600 text-white select-none">
        <tr>
          <th className="p-2 cursor-pointer" onClick={() => toggleSort("name")}>
            שם הקובץ <SortIcon active={sortKey === "name"} dir={sortDir} />
          </th>
          <th className="p-2 cursor-pointer w-28" onClick={() => toggleSort("size")}>
            גודל <SortIcon active={sortKey === "size"} dir={sortDir} />
          </th>
          <th className="p-2 cursor-pointer w-56" onClick={() => toggleSort("mtimeMs")}>
            תאריך שינוי <SortIcon active={sortKey === "mtimeMs"} dir={sortDir} />
          </th>
          <th className="p-2 w-56">פעולות</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((f) => {
          const name = f.name || "";
          const src = `http://localhost:3001/recordings/${encodeURIComponent(name)}`;
          const canPlay = MEDIA_RE.test(name);
          const isOpen = playing === name;

          return (
            <React.Fragment key={name}>
              <tr className="border-b hover:bg-gray-100 transition align-top">
                <td className="p-2 break-all">{name}</td>
                <td className="p-2">{formatBytes(f.size)}</td>
                <td className="p-2">{formatDate(f.mtimeMs)}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-2">
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg transition"
                      title="פתח/י לצפייה"
                    >▶️ פתח</a>

                    {canPlay && (
                      <button
                        onClick={() => setPlaying(isOpen ? null : name)}
                        className={`px-3 py-1 rounded-lg transition text-white ${isOpen ? "bg-gray-600 hover:bg-gray-700" : "bg-indigo-500 hover:bg-indigo-600"}`}
                        title={isOpen ? "עצור נגן" : "נגן כאן"}
                      >
                        {isOpen ? "⏹ עצור" : "🎧 נגן"}
                      </button>
                    )}

                    <button
                      onClick={() => handleDownload(name)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg transition"
                      title="הורדה"
                    >📥 הורד</button>

                    <button
                      onClick={() => onDelete?.(name)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition"
                      title="מחיקה"
                    >🗑 מחק</button>
                  </div>
                </td>
              </tr>

              {isOpen && (
                <tr className="border-b bg-gray-50">
                  <td colSpan={4} className="p-3">
                    {/* נגן: ננסה קודם <video>, ואם לא מתנגן—<audio> */}
                    <video src={src} controls className="w-full rounded-lg shadow" onError={(e)=>{ e.currentTarget.style.display='none'; const a=e.currentTarget.parentElement.querySelector('audio'); if(a) a.style.display='block'; }} />
                    <audio src={src} controls className="w-full" style={{display:'none'}} />
                    <div className="text-xs text-gray-500 mt-1 text-left">ניגון: {name}</div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
        {sorted.length === 0 && (
          <tr><td colSpan={4} className="p-6 text-gray-500">אין הקלטות להצגה כרגע.</td></tr>
        )}
      </tbody>
    </table>
  );
}
