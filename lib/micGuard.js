// lib/micGuard.js
export function mediaSupported() {
  return typeof navigator !== "undefined" &&
         !!navigator.mediaDevices &&
         !!navigator.mediaDevices.getUserMedia;
}

export function mapMediaError(err) {
  const n = err?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "אין הרשאה למיקרופון";
  if (n === "NotFoundError" || n === "DevicesNotFoundError") return "לא נמצא מיקרופון";
  if (n === "NotReadableError") return "המיקרופון תפוס על-ידי אפליקציה אחרת";
  if (n === "OverconstrainedError") return "הגדרות המכשיר לא נתמכות";
  return "שגיאת מיקרופון";
}
