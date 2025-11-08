const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

export async function summarize(name) {
  const r = await fetch(`${API}/api/summarize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return r.json();
}

export async function getSummary(base) {
  const r = await fetch(`${API}/api/notes/${encodeURIComponent(base)}`);
  return r.json();
}

export function notesDownloadLink(base) {
  return `${API}/notes/${encodeURIComponent(base)}.md`;
}

export async function saveMarkers(name, markers) {
  const r = await fetch(`${API}/api/recordings/${encodeURIComponent(name)}/markers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markers })
  });
  return r.json();
}
/** Rename a recording on the server */
export async function renameRecording(oldName, newName) {
  const base = (import.meta?.env?.VITE_API_URL) || '';
  const url = `${base}/api/recordings/${encodeURIComponent(oldName)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName })
  });
  if (!r.ok) {
    const txt = await r.text().catch(()=> '');
    throw new Error(`Rename failed: ${r.status} ${txt}`);
  }
  return r.json();
}

export function recordingUrl(name) {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/recordings/${encodeURIComponent(name)}`;
}

export function markdownUrl(baseName) {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/notes/${encodeURIComponent(baseName)}.md`;
}

export function pdfUrl(baseName) {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/api/notes/pdf/${encodeURIComponent(baseName)}`;
}

export function summaryJsonUrl(baseName) {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/api/notes/${encodeURIComponent(baseName)}`;
}

export async function deleteRecording(name) {
  const base = import.meta.env.VITE_API_URL || '';
  const r = await fetch(`${base}/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Delete failed: ${r.status}`);
  return r.json();
}
