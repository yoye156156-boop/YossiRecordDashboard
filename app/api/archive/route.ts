import { NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

// ייבוא דינאמי כדי ששגיאות ייתפסו יפה ב-try/catch
async function getPdf(bytes: { id: string, title: string, date: string, lines: string[] }) {
  const { buildPdf } = await import("../../../lib/pdf.js");
  return buildPdf(bytes);
}

// כתיבת כותרת TAR מינימלית (ustar) עבור קובץ יחיד
function tarHeader(name: string, size: number): Buffer {
  const buf = Buffer.alloc(512, 0);
  const write = (str: string, offset: number, length: number) => {
    Buffer.from(str).copy(buf, offset, 0, Math.min(length, Buffer.byteLength(str)));
  };

  write(name, 0, 100);                              // name
  write("0000777", 100, 8);                         // mode
  write("0000000", 108, 8);                         // uid
  write("0000000", 116, 8);                         // gid
  write(size.toString(8).padStart(11, "0") + "\0", 124, 12); // size (octal)
  const mtime = Math.floor(Date.now() / 1000);
  write(mtime.toString(8).padStart(11, "0") + "\0", 136, 12); // mtime
  // checksum placeholder (8 spaces)
  write("        ", 148, 8);
  write("ustar\0", 257, 6);                         // magic
  write("00", 263, 2);                              // version
  write("root", 265, 32);                           // uname
  write("root", 297, 32);                           // gname

  // compute checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);   // chksum

  return buf;
}

function tarPack(files: { name: string, content: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  for (const f of files) {
    const header = tarHeader(f.name, f.content.length);
    parts.push(header);
    parts.push(f.content);
    const pad = (512 - (f.content.length % 512)) % 512;
    if (pad) parts.push(Buffer.alloc(pad, 0));
  }
  // two empty 512B blocks to end tar
  parts.push(Buffer.alloc(1024, 0));
  return Buffer.concat(parts);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const id    = body?.id    ?? Date.now().toString();
    const title = body?.title ?? `דוח פגישה #${id}`;
    const date  = body?.date  ?? new Date().toISOString();
    const lines = Array.isArray(body?.lines) ? body.lines : [];

    // מייצרים PDF
    const pdf = await getPdf({ id, title, date, lines });

    // אם הגיע אודיו (base64) נוסיף אותו גם
    const files: { name: string, content: Buffer }[] = [
      { name: `report-${id}.pdf`, content: Buffer.from(pdf) },
    ];

    const audioB64: string | undefined = body?.audioBase64;
    const audioName: string = body?.audioName || `audio-${id}.webm`;

    if (audioB64 && typeof audioB64 === "string") {
      const audioBuf = Buffer.from(audioB64, "base64");
      files.push({ name: audioName, content: audioBuf });
    }

    const tar = tarPack(files);
    const gz = gzipSync(tar);

    return new NextResponse(gz, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="session-${id}.tar.gz"`,
      },
    });
  } catch (e: any) {
    console.error("archive route error:", e);
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
