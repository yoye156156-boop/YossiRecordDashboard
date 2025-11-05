export function fmtDate(value) {
  if (value === undefined || value === null) return "";
  const d = typeof value === "number" ? new Date(value) : new Date(String(value));
  if (isNaN(d)) return "";
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(d).replace(",", "");
}

export function dateHe(value) {
  const s = fmtDate(value);
  return s || "—";
}

export function relativeHe(value) {
  if (value === undefined || value === null) return "";
  const d = typeof value === "number" ? new Date(value) : new Date(String(value));
  if (isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "היום";
  if (diff < 2 * day) return "אתמול";
  const days = Math.floor(diff / day);
  return `לפני ${days} ימים`;
}
