import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { buildPdf } = await import("../../../lib/pdf.js");

    const id    = body?.id ?? Date.now().toString();
    const title = body?.title ?? `דוח פגישה #${id}`;
    const date  = body?.date ?? new Date().toISOString();
    const lines = Array.isArray(body?.lines) ? body.lines : [];

    const pdf = await buildPdf({ id, title, date, lines });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${id}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("PDF route error:", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
