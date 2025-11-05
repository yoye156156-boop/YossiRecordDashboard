export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { buildDocxBuffer } from "@/lib/docx";

type Payload = { title?: string; date?: string; lines?: string[] };

type ArchiveItem = {
  title: string;
  date: string;
  linesCount: number;
  filename: string;
  size: number;
  createdAt: string;
};

const ARCHIVE_DIR = path.resolve(process.cwd(), "var", "archive");

function safeName(s: string): string {
  return (
    (s || "report").replace(/[^\p{L}\p{N}\s._-]+/gu, "").trim() || "report"
  );
}

async function ensureDir() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const download = url.searchParams.get("download"); // ?download=<filename>
  await ensureDir();

  // הורדת קובץ
  if (download) {
    const filePath = path.join(ARCHIVE_DIR, path.basename(download));
    const buf = await fs.readFile(filePath);
    const ab = new Uint8Array(buf).buffer;
    const mime = download.toLowerCase().endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream";
    return new NextResponse(ab, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(download)}`,
        "Cache-Control": "no-store",
      },
    });
  }

  // רשימת פריטים (מה-JSONים)
  const files = await fs.readdir(ARCHIVE_DIR).catch(() => []);
  const items: ArchiveItem[] = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (meta) => {
        const raw = await fs.readFile(path.join(ARCHIVE_DIR, meta), "utf8");
        const m = JSON.parse(raw) as ArchiveItem;
        return m;
      }),
  );
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    await ensureDir();
    const body = (await req.json()) as Payload;
    const title = body.title ?? "דוח פגישה";
    const date = body.date ?? new Date().toLocaleString("he-IL");
    const lines = Array.isArray(body.lines) ? body.lines : [];

    const buf = await buildDocxBuffer(title, lines, date);

    const ts = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, ""); // 20251022T123456
    const base = `${ts}-${safeName(title)}`;
    const docxName = `${base}.docx`;
    const jsonName = `${base}.json`;

    // כתיבה לדיסק
    await fs.writeFile(path.join(ARCHIVE_DIR, docxName), buf);
    const meta: ArchiveItem = {
      title,
      date,
      linesCount: lines.length,
      filename: docxName,
      size: buf.byteLength,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(ARCHIVE_DIR, jsonName),
      JSON.stringify(meta, null, 2),
      "utf8",
    );

    return NextResponse.json({ ok: true, item: meta });
  } catch (err) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
