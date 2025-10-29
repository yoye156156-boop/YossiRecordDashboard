export default function DashboardPage() {
  return (
    <main dir="rtl" style={{
      fontFamily: "system-ui, Arial, sans-serif",
      padding: "32px",
      maxWidth: 900,
      margin: "0 auto"
    }}>
      <h1 style={{ marginBottom: 16 }}>ברוך הבא ללוח הבקרה</h1>

      <button
        onClick={() => alert("פגישה חדשה נפתחה!")}
        style={{
          padding: "12px 20px",
          fontSize: "16px",
          borderRadius: "10px",
          border: "none",
          background: "#4caf50",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 24
        }}
      >
        התחל פגישה חדשה
      </button>

      <section>
        <h3 style={{ marginBottom: 8 }}>פגישות אחרונות</h3>
        <ul style={{ listStyle: "none", padding: 0, lineHeight: 1.8 }}>
          <li>🔹 פגישה עם ד"ר כהן – אתמול</li>
          <li>🔹 פגישה עם רוני – לפני יומיים</li>
          <li>🔹 פגישה עם נצחיה – לפני שבוע</li>
        </ul>
      </section>
    </main>
  );
}
