const KEY = "mvp_sessions";

export function loadSessions() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function upsertSession(sess) {
  if (typeof window === "undefined") return;
  const list = loadSessions();
  const i = list.findIndex((x) => x.id === sess.id);
  if (i >= 0) list[i] = sess; else list.unshift(sess);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearSessions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
