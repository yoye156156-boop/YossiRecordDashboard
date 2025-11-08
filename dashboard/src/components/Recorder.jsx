import { useState } from "react";
import Toast from "./Toast";
import React, { useEffect, useRef, useState } from "react";

const pickMime = () => {
  const isFirefox =
    typeof navigator !== "undefined" &&
    /firefox/i.test(navigator.userAgent || "");
  // בפיירפוקס עדיף OGG/Opus קודם
  const candidates = isFirefox
    ? [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ]
    : [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/ogg",
      ];
  for (const t of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported?.(t)
    ) {
      return t;
    }
  }
  return ""; // יתן לדפדפן לבחור
};

export default function Recorder() {
  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3001"
  ).replace(/\/$/, "");
  const [mime, setMime] = useState(pickMime());
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [msg, setMsg] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState("");
  const [blob, setBlob] = useState(null);

  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {}
      const all = await navigator.mediaDevices.enumerateDevices();
      const ins = all.filter((d) => d.kind === "audioinput");
      setDevices(ins);
      if (!deviceId && ins[0]) setDeviceId(ins[0].deviceId);
    })();
  }, []);

  const start = async () => {
    try {
      setMsg("");
      setBlob(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl("");
      }
      chunksRef.current = [];

      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      recRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const parts = [...chunksRef.current];
        if (!parts.length) {
          setMsg(
            "⚠️ לא הגיעו נתונים—בדוק מקור ב-pavucontrol (לא 'Monitor of ...').",
          );
          return;
        }
        const finalBlob = new Blob(parts, {
          type: mime || rec.mimeType || "audio/webm",
        });
        if (finalBlob.size === 0) {
          setMsg("⚠️ Blob ריק—נסה מקור/עוצמה אחרים.");
          return;
        }
        setBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setBlobUrl(url);
        const ext = finalBlob.type.includes("ogg")
          ? "ogg"
          : finalBlob.type.includes("webm")
            ? "webm"
            : "weba";
        setMsg(`✅ הוקלט (${Math.round(finalBlob.size / 1024)}KB, ${ext})`);
      w};

      // timeslice קטן עוזר לפיירפוקס להוציא dataavailable בזמן אמת
      rec.start(250);
      setIsRecording(true);
      setMsg("🔴 מקליט…");
    } catch (err) {
      console.error(err);
      setMsg("❌ כשל בקבלת מיקרופון: " + (err?.message || err));
    }
  };

  const waitForStop = () =>
    new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec) return resolve();
      if (rec.state !== "inactive") {
        const h = () => {
          rec.removeEventListener("stop", h);
          resolve();
        };
        rec.addEventListener("stop", h, { once: true });
      } else resolve();
    });

  const stop = async () => {
    try {
      const rec = recRef.current;
      if (rec && rec.state === "recording") {
        rec.requestData?.(); // flush אחרון
        rec.stop();
        await waitForStop();
      }
    } finally {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
      streamRef.current = null;
      recRef.current = null;
      setIsRecording(false);
    }
  };

  const upload = async () => {
    try {
      if (!blob) {
        setMsg("אין הקלטה לשליחה.");
        return;
      }
      if (blob.size < 10240) {
        setMsg("⚠️ קצר/חלש מדי (<10KB). נסה 5–10 שניות.");
        return;
      }
      setMsg("📤 מעלה לשרת…");

      const chosenType = blob.type || mime || "audio/webm";
      const ext = chosenType.includes("ogg")
        ? "ogg"
        : chosenType.includes("webm")
          ? "webm"
          : "weba";
      const ts = new Date()
        .toISOString()
        .replaceAll(":", "")
        .replaceAll(".", "");
      const fd = new FormData();
      fd.append("file", blob, `rec-${ts}.${ext}`);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg(`✅ הועלה: ${data?.name || "OK"}`);
    setToastMsg("✨ נוצר כתב אחרי אוטומטי בצד השרת!");
     window.dispatchEvent(new CustomEvent('recording:uploaded', { detail: { name: data?.name } }));
    } catch (e) {
      console.error(e);
      setMsg("❌ כשל בהעלאה: " + (e?.message || e));
    }
  };

  const reset = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl("");
    setBlob(null);
    setMsg("נוקה.");
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center text-xs opacity-70 mb-2">
        API: <code>{API_URL}</code> · MIME: <code>{mime || "default"}</code>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
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
        <div className="mt-2 flex flex-col items-center gap-2">
          <audio
            controls
            src={blobUrl}
            className="w-full max-w-xl"
            preload="metadata"
          />
          <a
            href={blobUrl}
            download="recording.weba"
            className="text-sm underline text-blue-700"
          >
            הורדה
          </a>
        </div>
      )}

      <div className="mt-3 text-center text-sm">{msg}</div>

      <div className="mt-4 text-center text-xs opacity-60">
        טיפ: אם אין קול, פתח <code>pavucontrol</code> → Recording ובחר את המקור
        (לא “Monitor of …”).
      </div>
       <Toast message={toastMsg} onClose={() => setToastMsg("")} />   
 </div>
  );
}
