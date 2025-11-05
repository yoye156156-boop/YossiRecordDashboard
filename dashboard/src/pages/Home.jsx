import { useNavigate, Link } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">דף פתיחה</h1>
        <span className="text-xs text-gray-500">
          API: {import.meta.env.VITE_API_URL || "http://localhost:3001"}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-2">התחל פגישה חדשה</h2>
          <p className="text-sm text-gray-600 mb-4">
            מעבר ל־/session לצורך הקלטה חיה ושליחה לשרת.
          </p>
          <button
            onClick={() => navigate("/session")}
            className="w-full rounded-xl bg-emerald-600 text-white py-2.5 font-medium hover:bg-emerald-700 active:scale-[0.99] transition"
          >
            התחל פגישה חדשה
          </button>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold mb-2">הקלטות</h2>
          <p className="text-sm text-gray-600 mb-4">
            פתיחת רשימת ההקלטות כולל חיפוש, נגן, הורדה ומחיקה.
          </p>
          <Link
            to="/recordings"
            className="inline-flex items-center justify-center w-full rounded-xl bg-gray-900 text-white py-2.5 font-medium hover:bg-black transition"
          >
            צפה בהקלטות
          </Link>
        </div>
      </div>
    </section>
  );
}
