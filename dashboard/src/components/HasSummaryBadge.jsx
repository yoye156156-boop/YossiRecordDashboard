import React, { useEffect, useState } from "react";

const API = (import.meta.env.VITE_API_URL?.replace(/\/$/, "")) || "http://127.0.0.1:3001";

export default function HasSummaryBadge({ name }) {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const base = (name || "").replace(/\.[^.]+$/, "");
    if (!base) return;
    fetch(`${API}/api/notes/${encodeURIComponent(base)}`)
      .then(r => r.ok ? r.json() : null)
      .then(js => setHas(Boolean(js?.ok && js.summary)))
      .catch(() => setHas(false));
  }, [name]);

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full mr-2 align-middle ${has ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
      {has ? "יש סיכום" : "אין סיכום"}
    </span>
  );
}
