export const SESSIONS_KEY = 'sessions'
export function loadSessions() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') } catch { return [] }
}
export function saveSession(s) {
  const arr = loadSessions()
  arr.unshift(s)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr.slice(0, 50)))
}
export function clearSessions() {
  localStorage.removeItem(SESSIONS_KEY)
}
