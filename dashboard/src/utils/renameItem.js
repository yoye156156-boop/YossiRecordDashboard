export async function renameItem(API, oldName, newName) {
  const url = `${API}/api/recordings/${encodeURIComponent(oldName)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newName })
  });

  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }

  // נחזיר פורמט אחיד
  return {
    ok: res.ok && data?.ok !== false,
    status: res.status,
    ...data
  };
}
