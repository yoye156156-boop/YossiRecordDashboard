import { useEffect, useRef, useState } from "react";
import { API_URL } from "../lib/api";

function fmt(t) {
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(t / 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function Recorder() {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [mime, setMime] = useState("audio/webm"); // audio/webm or audio/wav (PCM)
  const [recState, setRecState] = useState("idle"); // idle|ready|recording|stopped|uploading
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState(null);

  const mediaStreamRef = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const rafIdRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const startedAtRef = useRef(null);

  // enumerate mics
  useEffect(() => {
    (async () => {
      try {
        // warm permission prompt
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
        tmp.getTracks().forEach((t) => t.stop());
        const list = await navigator.mediaDevices.enumerateDevices();
        const mics = list.filter((d) => d.kind === "audioinput");
        setDevices(mics);
        if (!deviceId && mics[0]?.deviceId) setDeviceId(mics[0].deviceId);
        setRecState("ready");
      } catch (e) {
        setError("אין הרשאה למיקרופון או שאין התקן זמין בדפדפן.");
      }
    })();
  }, []);

  // VU meter loop
  useEffect(() => {
    if (recState !== "recording") return;
    const loop = () => {
      if (!analyserRef.current) return;
      const arr = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(arr);
      // compute peak
      let peak = 0;
      for (let i = 0; i < arr.length; i++) {
        const v = (arr[i] - 128) / 128; // -1..1
        peak = Math.max(peak, Math.abs(v));
      }
      setLevel(Math.round(peak * 100));
      setTimer(Math.floor((performance.now() - startedAtRef.current) / 1000));
      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [recState]);

  async function start() {
    setError("");
    setBlob(null);
    try {
      // get selected mic
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : { audio: true },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // analyser
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      // recorder
      let recorder;
      if (
        mime === "audio/webm" &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 128000,
        });
      } else {
        // WAV fallback: record raw PCM using ScriptProcessor (simple approach)
        // For simplicity, we use MediaRecorder if available and let server keep .wav optional later.
        recorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        stopAudioGraph();
        setRecState("stopped");
      };

      mediaRecRef.current = recorder;
      recorder.start(250); // gather chunks
      startedAtRef.current = performance.now();
      setRecState("recording");
    } catch (e) {
      setError("תקלה בהפעלת המיקרופון. בדוק הרשאות ובחירת התקן.");
    }
  }

  function stopAudioGraph() {
    try {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    try {
      audioCtxRef.current?.close();
    } catch {}
    mediaStreamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  function stop() {
    try {
      mediaRecRef.current?.stop();
    } catch {}
  }

  async function upload() {
    if (!blob) {
      setError("אין הקלטה לשמירה.");
      return;
    }
    if (blob.size < 10 * 1024) {
      setError(
        "ההקלטה חלשה/קצרה מדי (פחות מ־10KB). נסה 3–5 שניות והגבר ווליום/מיקרופון.",
      );
      return;
    }
    setError("");
    setRecState("uploading");
    const ts = new Date();
    const stamp = ts
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const ext =
      mime === "audio/webm" ? "webm" : mime === "audio/wav" ? "wav" : "ogg";
    const filename = `rec-${stamp}.${ext}`;

    const fd = new FormData();
    fd.append("file", blob, filename);

    try {
      const r = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: fd,
      });
      if (!r.ok) throw new Error("upload failed");
      setRecState("idle");
      setBlob(null);
      alert("ההקלטה הועלתה בהצלחה!");
    } catch (e) {
      setError("העלאה נכשלה. ודא שה־API נגיש.");
      setRecState("stopped");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="font-medium">מיקרופון:</label>
        <select
          className="rounded-lg border px-2 py-1"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || "מיקרופון ללא שם"}
            </option>
          ))}
        </select>

        <label className="font-medium ms-4">פורמט:</label>
        <select
          className="rounded-lg border px-2 py-1"
          value={mime}
          onChange={(e) => setMime(e.target.value)}
        >
          <option value="audio/webm">WEBM (Opus)</option>
          <option value="audio/wav">WAV (PCM)</option>
        </select>

        <span className="ms-4 text-gray-500">API: {API_URL}</span>
      </div>

      {/* VU meter + timer */}
      <div className="flex items-center gap-3">
        <div className="w-56 h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-75 ${level < 35 ? "bg-emerald-500" : level < 70 ? "bg-amber-500" : "bg-rose-600"}`}
            style={{ width: `${Math.min(level, 100)}%` }}
          />
        </div>
        <code className="text-sm text-gray-600">{fmt(timer)}</code>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={recState === "recording"}
          onClick={start}
          className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
        >
          התחל הקלטה
        </button>
        <button
          disabled={recState !== "recording"}
          onClick={stop}
          className="rounded-xl bg-gray-900 text-white px-4 py-2 disabled:opacity-50"
        >
          עצור
        </button>
        <button
          disabled={!blob || recState === "uploading"}
          onClick={upload}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
        >
          שלח לשרת
        </button>

        {blob && (
          <audio className="ms-2" controls src={URL.createObjectURL(blob)} />
        )}
      </div>

      {error && <div className="text-rose-600 text-sm">{error}</div>}
    </div>
  );
}
