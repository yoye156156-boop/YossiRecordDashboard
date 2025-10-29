import React, { useEffect, useState } from "react";
import RecordingsTable from "../components/RecordingsTable.jsx";

export default function RecordingsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/recordings");
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((x) => (typeof x === "string" ? { name: x } : x))
        : [];
      setItems(normalized);
    } catch (e) { console.error("load() error:", e); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (name) => {
    console.log("[UI] delete clicked:", name);
    try {
      const res = await fetch(`http://localhost:3001/api/recordings/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("[UI] delete failed:", err);
        alert(`מחיקה נכשלה: ${err?.error || res.status}`);
        return;
      }
      // עדכון מיידי + רענון רשימה מהשרת
      setItems((prev) => prev.filter((f) => f.name !== name));
      setTimeout(load, 200);
    } catch (e) {
      console.error("[UI] delete exception:", e);
      alert("שגיאה במחיקה, בדוק שרת/הרשאות");
    }
  };

  const filtered = items.filter((f) => {
    if (!q.trim()) return true;
    const hay = `${f.name} ${new Date(f.mtimeMs || 0).toLocaleString("he-IL")}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold">ארכיון הקלטות</h1>
      </div>

      <div className="flex justify-end">
        <input
          className="border rounded-xl px-4 py-2 outline-none"
          placeholder="...חיפוש לפי שם/תאריך"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          dir="rtl"
        />
      </div>

      <RecordingsTable recordings={filtered} onDelete={handleDelete} />
    </div>
  );
}
