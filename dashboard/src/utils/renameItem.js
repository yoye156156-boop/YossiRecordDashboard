export async function renameItem(API, oldName, newName) {
  const safe = (s) =>
    s &&
    typeof s === "string" &&
    !s.includes("..") &&
    !s.includes("/") &&
    !s.includes("\\") &&
    s.trim() !== "";

  if (!safe(newName)) {
    alert("⚠️ שם חדש לא תקין — ללא ../ או תווים מיוחדים");
    return { ok: false, error: "BAD_NAME" };
  }

  // שמור את הסיומת אם המשתמש שכח אותה
  const ext = (oldName.match(/\.[^.]+$/) || [""])[0];
  if (ext && !newName.endsWith(ext)) {
    newName += ext;
  }

  try {
    const res = await fetch(`${API}/api/recordings/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName }),
    });
    return await res.json();
  } catch (e) {
    console.error("renameItem error:", e);
    return { ok: false, error: "FETCH_FAILED" };
  }
}
