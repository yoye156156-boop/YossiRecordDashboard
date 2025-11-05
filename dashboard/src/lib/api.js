export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiGet(path, opts = {}) {
  const r = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r;
}

export async function apiJson(path, opts = {}) {
  const r = await apiGet(path, opts);
  return r.json();
}
