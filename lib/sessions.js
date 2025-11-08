// lib/sessions.js — אחסון קבוע לקובץ (ESM)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const FILE = join(process.cwd(), ".data", "sessions.json");

function readAll() {
  try {
    if (!existsSync(FILE)) return [];
    const txt = readFileSync(FILE, "utf8");
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeAll(arr) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(arr, null, 2), "utf8");
}

/** קבלה של כל הסשנים */
export function loadSessions() {
  return readAll();
}
/** ניקוי כל הסשנים */
export function clearSessions() {
  writeAll([]);
}
/** שמירת סשן: { id, at(ISO), lines[string[]] } עם דה־דופליקט לפי id */
export function saveSession(s) {
  const id = String(s?.id ?? Date.now());
  const at =
    typeof s?.at === "string" && !Number.isNaN(Date.parse(s.at))
      ? s.at
      : new Date().toISOString();
  const lines = Array.isArray(s?.lines)
    ? s.lines.filter((x) => typeof x === "string")
    : [];

  const all = readAll();
  const rec = { id, at, lines };
  const idx = all.findIndex((x) => String(x.id) === id);
  if (idx >= 0) all[idx] = rec;
  else all.unshift(rec);
  writeAll(all);
  return rec;
}
/** מחיקה לפי id */
export function removeSession(id) {
  const all = readAll();
  const before = all.length;
  const next = all.filter((x) => String(x.id) !== String(id));
  writeAll(next);
  return { removed: before - next.length };
}
/** ייצוא מלא (מערך) */
export function exportSessions() {
  return readAll();
}
/** ייבוא/מיזוג: מקבל Array או אובייקט עם sessions */
export function importSessions(payload) {
  const incoming = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.sessions)
      ? payload.sessions
      : [];
  if (!incoming.length) return { imported: 0 };

  const now = readAll();
  const byId = new Map(now.map((r) => [String(r.id), r]));
  for (const raw of incoming) {
    if (!raw) continue;
    const id = String(raw.id ?? "");
    if (!id) continue;
    const at =
      typeof raw.at === "string" && !Number.isNaN(Date.parse(raw.at))
        ? raw.at
        : new Date().toISOString();
    const lines = Array.isArray(raw.lines)
      ? raw.lines.filter((x) => typeof x === "string")
      : [];
    byId.set(id, { id, at, lines });
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0),
  );
  writeAll(merged);
  return { imported: incoming.length, total: merged.length };
}
