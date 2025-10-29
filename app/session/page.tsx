'use client';
import { useEffect, useState } from 'react';

export default function SessionPage() {
  const [running, setRunning] = useState(false);
  const [title, setTitle] = useState('דוח פגישה');
  const [lines, setLines] = useState<string[]>(['']);

  // שליפה מ-localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sessionData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (typeof data?.title === 'string') setTitle(data.title);
        if (Array.isArray(data?.lines)) setLines(data.lines);
      } catch {}
    }
  }, []);

  // שמירה אוטומטית ל-localStorage
  useEffect(() => {
    localStorage.setItem('sessionData', JSON.stringify({ title, lines }));
  }, [title, lines]);

  const addLine = () => setLines((s) => [...s, '']);
  const updateLine = (i: number, val: string) =>
    setLines((s) => s.map((v, idx) => (idx === i ? val : v)));
  const removeLine = (i: number) => setLines((s) => s.filter((_, idx) => idx !== i));

  const exportFile = async (format: 'pdf' | 'docx') => {
    const url = format === 'pdf' ? '/api/report' : '/api/report/docx';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date: new Date().toLocaleString('he-IL'), lines }),
    });
    if (!res.ok) {
      alert(`נכשל ביצוא ${format.toUpperCase()}`);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveToArchive = async () => {
    const res = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date: new Date().toLocaleString('he-IL'), lines }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.ok) alert('נשמר בארכיון בהצלחה');
    else alert('שמירה לארכיון נכשלה');
  };

  return (
    <div dir="rtl" lang="he" className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ניהול סשן</h1>

      <div className="flex flex-wrap gap-2 justify-end space-x-reverse mb-6">
        <button
          className="px-3 py-2 rounded bg-gray-100 shadow-sm hover:bg-gray-200 active:scale-95 transition-transform"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? 'עצור' : 'התחל'}
        </button>
        <button
          className="px-3 py-2 rounded bg-gray-100 shadow-sm hover:bg-gray-200 active:scale-95 transition-transform"
          onClick={addLine}
        >
          הוסף שורה
        </button>
        <button
          className="px-3 py-2 rounded bg-gray-100 shadow-sm hover:bg-gray-200 active:scale-95 transition-transform"
          onClick={() => exportFile('pdf')}
        >
          ייצא ל־PDF
        </button>
        <button
          className="px-3 py-2 rounded bg-gray-100 shadow-sm hover:bg-gray-200 active:scale-95 transition-transform"
          onClick={() => exportFile('docx')}
        >
          ייצא ל־DOCX
        </button>
        <button
          className="px-3 py-2 rounded bg-green-100 shadow-sm hover:bg-green-200 active:scale-95 transition-transform"
          onClick={saveToArchive}
        >
          שמור לארכיון
        </button>
      </div>

      <label className="block mt-4">
        <span className="text-sm">כותרת הדוח</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border rounded p-2"
          inputMode="text"
          dir="rtl"
          lang="he"
        />
      </label>

      <div className="space-y-2 mt-2">
        {lines.map((val, i) => (
          <div key={i} className="flex items-center gap-2 mt-1">
            <input
              value={val}
              onChange={(e) => updateLine(i, e.target.value)}
              className="flex-1 border rounded p-2"
              placeholder={`שורה ${i + 1}`}
              dir="rtl"
              lang="he"
            />
            <button
              className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 transition"
              onClick={() => removeLine(i)}
            >
              מחק
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
