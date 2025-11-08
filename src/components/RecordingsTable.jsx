import React from "react";

export default function RecordingsTable({ recordings, onDelete }) {
  if (!recordings?.length) {
    return (
      <p className="text-gray-500 text-center mt-6">אין הקלטות להצגה כרגע.</p>
    );
  }

  // פונקציה להורדה
  const handleDownload = (name) => {
    const url = `${import.meta.env.VITE_API_URL || ""}/recordings/${name}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full text-sm text-right border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="px-4 py-2">שם קובץ</th>
            <th className="px-4 py-2">גודל</th>
            <th className="px-4 py-2">תאריך שינוי</th>
            <th className="px-4 py-2">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {recordings.map((rec) => (
            <tr key={rec.name} className="border-b hover:bg-gray-100">
              <td className="px-4 py-2">{rec.name}</td>
              <td className="px-4 py-2">{rec.size}</td>
              <td className="px-4 py-2">{rec.mtime}</td>
              <td className="px-4 py-2 flex gap-2 justify-end">
                {/* כפתור נגן */}
                {(rec.name.endsWith(".mp3") ||
                  rec.name.endsWith(".wav") ||
                  rec.name.endsWith(".mp4")) && (
                  <button
                    onClick={() =>
                      window.open(
                        `${import.meta.env.VITE_API_URL || ""}/recordings/${rec.name}`,
                        "_blank",
                      )
                    }
                    className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                  >
                    🎧 נגן
                  </button>
                )}

                {/* כפתור הורדה */}
                <button
                  onClick={() => handleDownload(rec.name)}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  📥 הורד
                </button>

                {/* כפתור מחיקה */}
                <button
                  onClick={() => onDelete(rec.name)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  🗑 מחק
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
