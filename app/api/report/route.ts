import { NextResponse } from "next/server";
import { buildPdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

type ReportBody = Partial<{
  id: string;
  title: string;
  date: string;
  lines: string[];
}>;

function parseBody(body: unknown): {
  id: string;
  title: string;
  date: string;
  lines: string[];
} {
  const b = (body ?? {}) as Record<string, unknown>;
  const id =
    typeof b.id === "string" && b.id.trim() ? b.id : Date.now().toString();
  const title =
    typeof b.title === "string" && b.title.trim()
      ? b.title
      : `דוח פגישה #${id}`;
  const date =
    typeof b.date === "string" && !Number.isNaN(Date.parse(b.date))
      ? b.date
      : new Date().toISOString();
  const lines = Array.isArray(b.lines) ? b.lines.map((x) => `${x ?? ""}`) : [];
  return { id, title, date, lines };
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`report:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "rate limit" }, { status: 429 });
  }

  try {
    const raw = (await req.json().catch(() => ({}))) as ReportBody;
    const { id, title, date, lines } = parseBody(raw);
    console.log(
      `[API] /api/report → id=${id}, title="${title}", date=${date}, lines=${lines.length}`,
    );

    // מקבלים Uint8Array (עלול להיות עם SharedArrayBuffer מאחור)
    const pdfBytes = await buildPdf({ id, title, date, lines });

    // ✅ מקצים ArrayBuffer "טהור" ומעתיקים פנימה — ככה אין שום SharedArrayBuffer בטיפוסים
    const ab = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(ab).set(pdfBytes);

    // ויוצרים Blob תקני
    const blob = new Blob([ab], { type: "application/pdf" });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[API] /api/report error:", e);
    return NextResponse.json(
      { error: "failed to build report", detail: String(e) },
      { status: 500 },
    );
  }
}
