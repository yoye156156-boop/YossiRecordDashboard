export async function runYossi({ file, patient }) {
  const res = await fetch("http://localhost:3001/api/runYossi", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ file, patient })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("API error " + res.status + ": " + text);
  }
  return res.json().catch(() => ({}));
}
