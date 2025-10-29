// app/api/report/docx/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
} from 'docx';

type ReportPayload = {
  title?: string;
  date?: string;
  lines?: string[];
};

function buildDocx(title: string, lines: string[], date?: string): Promise<Buffer> {
  const dateLine = date ?? new Date().toLocaleString('he-IL');

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT },
          ],
        },
      ],
    },
    sections: [
      {
        // paragraph-level bidi + right alignment (no section-level RTL flag in your docx typings)
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
            children: [new TextRun(`נוצר: ${dateLine}`)],
          }),
          ...lines.map(
            (l) =>
              new Paragraph({
                bidirectional: true,
                alignment: AlignmentType.RIGHT,
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(l)],
              }),
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc); // Node Buffer
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string; date?: string; lines?: string[] };
    const title = body.title ?? "דוח פגישה";
    const date = body.date;
    const lines = Array.isArray(body.lines) ? body.lines : [];

    const buf = await (await import("@/lib/docx")).buildDocxBuffer(title, lines, date);

    const filename = encodeURIComponent(`${title}.docx`);
    const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // המרה בטוחה: Buffer -> ArrayBuffer רגיל
    const u8copy = new Uint8Array(buf);
    const ab: ArrayBuffer = u8copy.buffer;

    return new NextResponse(ab, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename*=UTF-8${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = typeof err === "object" && err !== null && "message" in err
      ? String((err as { message?: unknown }).message)
      : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
