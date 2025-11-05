import React from "react";

const fmtAbs = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "medium",
  timeStyle: "short",
});

const rtf = new Intl.RelativeTimeFormat("he-IL", { numeric: "auto" });

function relFrom(now, then) {
  const ms = then - now; // שלילי = עבר
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (Math.abs(day) >= 1) return rtf.format(day, "day");
  if (Math.abs(hr) >= 1) return rtf.format(hr, "hour");
  if (Math.abs(min) >= 1) return rtf.format(min, "minute");
  return "הרגע";
}

export default function DateHe({ iso }) {
  if (!iso) return <span>—</span>;
  const d = new Date(iso);
  return (
    <div className="leading-tight text-right">
      <div className="text-gray-900">{fmtAbs.format(d)}</div>
      <div className="text-xs text-gray-500">{relFrom(new Date(), d)}</div>
    </div>
  );
}
