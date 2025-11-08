export function formatHe(dateInput) {
  try {
    const d =
      typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
    return d.toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function relativeHe(dateInput) {
  try {
    const d =
      typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((stripTime(now) - stripTime(d)) / msPerDay);

    if (diffDays === 0) return "היום";
    if (diffDays === 1) return "אתמול";
    return `לפני ${diffDays} ימים`;
  } catch {
    return "";
  }
}

function stripTime(dt) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
}
