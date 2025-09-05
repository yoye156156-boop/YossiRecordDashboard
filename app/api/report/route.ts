import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { buildPdf } from "../../../lib/pdf.js";

export async function POST(req) {
  const body = await req.json();
  const id = body?.id ?? String(Date.now());
  const title = body?.title ?? `דוח פגישה #${id}`;
  const date = body?.date ?? new Date().toISOString();
  const lines = Array.isArray(body?.lines) ? body.lines : [];

  try {
    const pdf = await buildPdf({ id, title, date, lines });
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${id}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
