"use client";
import { useEffect, useState } from "react";

type Item = {
  title: string;
  date: string;
  linesCount: number;
  filename: string;
  size: number;
  createdAt: string;
};

export default function ArchivePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/archive", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div dir="rtl" lang="he" className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">ארכיון דוחות</h1>
      {loading ? (
        <div>טוען…</div>
      ) : items.length === 0 ? (
        <div>אין פריטים בארכיון</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-right">כותרת</th>
              <th className="p-2 text-right">תאריך</th>
              <th className="p-2 text-right">שורות</th>
              <th className="p-2 text-right">גודל</th>
              <th className="p-2 text-right">הורדה</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.filename} className="border-t">
                <td className="p-2">{it.title}</td>
                <td className="p-2 whitespace-nowrap">{it.date}</td>
                <td className="p-2">{it.linesCount}</td>
                <td className="p-2">{(it.size / 1024).toFixed(1)} KB</td>
                <td className="p-2">
                  <a
                    className="underline text-blue-600 hover:text-blue-800"
                    href={`/api/archive?download=${encodeURIComponent(it.filename)}`}
                  >
                    הורד DOCX
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
