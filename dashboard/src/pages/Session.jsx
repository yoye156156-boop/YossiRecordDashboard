import { useEffect } from "react";
import Recorder from "../components/Recorder.jsx";

export default function Session() {
  useEffect(() => {
    document.title = "Session — הקלטה";
  }, []);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">הקלטה חיה</h1>
      <p className="text-sm text-gray-600">
        בחר מיקרופון, בדוק שיש עוצמה (VU), הקלט 3–5 שניות ושלח לשרת.
      </p>
      <div className="rounded-2xl border bg-white p-4">
        <Recorder />
      </div>
    </section>
  );
}
