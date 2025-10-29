import React, { useEffect, useState } from "react";
import RecordingsTable from "../components/RecordingsTable.jsx";

export default function Archive() {
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/recordings");
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((x) => (typeof x === "string" ? { name: x } : x))
        : [];
      setItems(normalized);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (name) => {
    try {
      const res = await fetch(`http://localhost:3001/api/recordings/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((f) => f.name !== name));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 🔴 באנר דיבאג כדי לוודא שהעמוד הזה עודכן */}
      <div className="p-3 rounded-xl border-2 border-red-500 bg-red-50 text-red-700 text-lg font-bold text-right">
        דיבאג ARCHIVE: אם אתה רואה את זה — הקובץ src/pages/Archive.jsx נטען
      </div>

      <h1 className="text-2xl font-bold">ארכיון הקלטות</h1>
      <RecordingsTable recordings={items} onDelete={handleDelete} />
    </div>
  );
}
