import React, { useEffect, useRef, useState } from "react";

/**
 * נגן מוטמע לשורה בטבלה
 * props:
 *  - src: קישור לקובץ (URL מוחלט מ-API)
 *  - onEnded: נקרא כשהניגון מסתיים
 *  - onPlay: נקרא כשהניגון מתחיל
 */
export default function InlinePlayer({ src, onEnded, onPlay }) {
  const audioRef = useRef(null);
  const [time, setTime] = useState({ cur: 0, dur: 0 });

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () =>
      setTime({ cur: a.currentTime || 0, dur: a.duration || 0 });
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
    };
  }, []);

  // עוזר להצגת זמן 00:00
  const fmt = (s) => {
    if (!isFinite(s)) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
      <audio
        ref={audioRef}
        src={src}
        controls
        autoPlay
        className="w-full"
        onPlay={onPlay}
        onEnded={onEnded}
      />
      <div className="mt-1 text-xs text-gray-500 flex gap-2 justify-end">
        <span>{fmt(time.cur)}</span>
        <span>/</span>
        <span>{fmt(time.dur)}</span>
      </div>
    </div>
  );
}
