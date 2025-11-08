export default function RecordingDateCell({ iso }) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const rel = diffDays === 0 ? "היום" : diffDays === 1 ? "אתמול" : `לפני ${diffDays} ימים`;
  const formatted = d.toLocaleString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div>
      <div>{formatted}</div>
      <div className="text-xs text-gray-500">{rel}</div>
    </div>
  );
}
