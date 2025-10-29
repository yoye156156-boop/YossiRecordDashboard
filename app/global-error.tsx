'use client';
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>אופס — משהו השתבש</h1>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f6f6f6', padding: 12, borderRadius: 8 }}>
          {error.message}
        </pre>
        <button onClick={() => reset()} style={{ padding: '8px 14px', border: '1px solid #ccc', borderRadius: 10 }}>
          נסה שוב
        </button>
      </body>
    </html>
  );
}
