import React, { useEffect, useRef, useState } from "react";

/**
 * Recorder.jsx — קומפוננטה עצמאית להקלטה/עצירה/ניגון/שליחה
 * עובדת עם MediaRecorder (WEBM/Opus כברירת מחדל)
 * ותומכת בבחירת התקן קלט (deviceId) מהדפדפן.
 */
export default function Recorder() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const [mime, setMime] = useState(() => {
    // נבחר MIME נתמך
    const preferred = "audio/webm;codecs=opus";
    return MediaRecorder && MediaRecorder.isTypeSupported?.(preferred)
      ? preferred
      : "audio/webm";
  });
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [msg, setMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const [blob, setBlob] = useState(null);

  // רפרנסים לזרם, רקורדר והצ'אנקים
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  // טען התקני קלט
  useEffect(() => {
    (async () => {
      try {
        // הרשאה חד־פעמית כדי שנוכל לקרוא enumerateDevices עם תוויות
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // לא חובה – נמשיך בכל מקרה
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const ins = all.filter((d) => d.kind === "audioinput");
      setDevices(ins);
      if (!deviceId && ins[0]) setDeviceId(ins[0].deviceId);
    })();
  }, []);

  // התחלת הקלטה
  const start = async () => {
    try {
      setMsg("מבקש הרשאת מיקרופון…");
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const rec = new MediaRecorder(stream, { mimeType: mime });
      recRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      rec.onstop = () => {
        const parts = [...chunksRef.current];
        if (!parts.length) {
          setMsg(
            "⚠️ לא התקבלו נתונים מהמיקרופון – בדוק את בחירת ההתקן ב-pavucontrol.",
          );
          setBlob(null);
          setBlobUrl("");
          return;
        }
        const finalBlob = new Blob(parts, { type: mime || "audio/webm" });
        if (finalBlob.size === 0) {
          setMsg("⚠️ נוצר Blob ריק (0KB) – נסה מקור קלט אחר.");
          setBlob(null);
          setBlobUrl("");
          return;
        }
        setBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setBlobUrl(url);
        setMsg(`✅ הוקלט בהצלחה (${Math.round(finalBlob.size / 1024)}KB)`);
      };

      rec.start(250); // איסוף בצ'אנקים
      setIsRecording(true);
      setMsg('🔴 מקליט… לחץ "עצור" כדי לסיים.');
    } catch (err) {
      console.error(err);
      setMsg("❌ נכשל לקבלת מיקרופון: " + (err?.message || err));
    }
  };

  // עצירת הקלטה
  const stop = () => {
    try {
      recRef.current?.state === "recording" && recRef.current.stop();
    } finally {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
      streamRef.current = null;
      setIsRecording(false);
    }
  };

  // שליחה לשרת
  const upload = async () => {
    if (!blob) {
      setMsg("אין הקלטה לשליחה.");
      return;
    }
    setMsg("⬆️ מעלה לשרת…");
    try {
      const fd = new FormData();
      const ts = new Date()
        .toISOString()
        .replaceAll(":", "")
        .replaceAll(".", "");
      fd.append("file", blob, `rec-${ts}.webm`);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("✅ הועלה בהצלחה!");
    } catch (e) {
      console.error(e);
      setMsg("❌ כשל בשליחה לשרת: " + (e?.message || e));
    }
  };

  // איפוס
  const reset = () => {
    setBlob(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl("");
    setMsg("נוקה.");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center text-sm opacity-70 mb-3">
        MIME in use: <code>{mime}</code>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        <select
          className="border rounded px-3 py-2"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          title="בחר מקור מיקרופון"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `Mic ${i + 1}`}
            </option>
          ))}
        </select>

        {!isRecording ? (
          <button
            className="bg-emerald-600 text-white rounded px-4 py-2 hover:opacity-90"
            onClick={start}
          >
            התחל הקלטה
          </button>
        ) : (
          <button
            className="bg-red-600 text-white rounded px-4 py-2 hover:opacity-90"
            onClick={stop}
          >
            עצור
          </button>
        )}

        <button
          className="bg-gray-200 rounded px-4 py-2"
          onClick={reset}
          disabled={isRecording}
          title="איפוס"
        >
          איפוס
        </button>

        <button
          className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-40"
          onClick={upload}
          disabled={!blob || isRecording}
        >
          שלח לשרת
        </button>
      </div>

      {!!blobUrl && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <audio controls src={blobUrl} className="w-full max-w-xl" />
          <a
            href={blobUrl}
            download="recording.webm"
            className="text-sm underline text-blue-700"
          >
            הורדה
          </a>
        </div>
      )}

      <div className="mt-4 text-center text-sm">{msg}</div>

      <div className="mt-6 text-center text-xs opacity-60">
        טיפ: אם אין קול, פתח <code>pavucontrol</code> ➜ Recording ובחר את
        המיקרופון (לא “Monitor of …”).
      </div>
    </div>
  );
}
