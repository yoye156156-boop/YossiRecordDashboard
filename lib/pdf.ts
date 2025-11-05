import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs/promises";
import path from "node:path";

export type ReportInput = {
  id?: string;
  title: string;
  date?: string;
  lines?: string[];
};

function isLikelyTTForOTF(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 10240) return false;
  const a = bytes[0],
    b = bytes[1],
    c = bytes[2],
    d = bytes[3];
  const isTTF = a === 0x00 && b === 0x01 && c === 0x00 && d === 0x00;
  const isOTTO = a === 0x4f && b === 0x54 && c === 0x54 && d === 0x4f;
  const isTRUE = a === 0x74 && b === 0x72 && c === 0x75 && d === 0x65;
  const isTYP1 = a === 0x74 && b === 0x79 && c === 0x70 && d === 0x31;
  return isTTF || isOTTO || isTRUE || isTYP1;
}

async function loadHebrewFont(): Promise<Uint8Array | null> {
  const tryRead = async (p: string) => {
    try {
      const buf = await fs.readFile(p);
      const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      return isLikelyTTForOTF(bytes) ? bytes : null;
    } catch {
      return null;
    }
  };
  const base = path.resolve(process.cwd(), "public", "fonts");
  return (
    (await tryRead(path.join(base, "NotoSansHebrew-Regular.ttf"))) ||
    (await tryRead(path.join(base, "NotoSansHebrew-Regular.otf")))
  );
}

// Basic RTL: if a line is Hebrew-dominant, reverse only Hebrew runs; keep Latin/digits intact
function reorderRTL(text: string): string {
  const hasHeb = (s: string) => /[\u0590-\u05FF]/.test(s);
  return text
    .split("\n")
    .map((line) => {
      const hebCount = (line.match(/[\u0590-\u05FF]/g) || []).length;
      const latCount = (line.match(/[A-Za-z0-9]/g) || []).length;
      if (hebCount <= latCount) return line;
      const runs = line.match(
        /([\u0590-\u05FF]+|[A-Za-z0-9]+|[^\u0590-\u05FFA-Za-z0-9]+)/g,
      ) || [line];
      runs.reverse();
      return runs
        .map((r) => (hasHeb(r) ? r.split("").reverse().join("") : r))
        .join("");
    })
    .join("\n");
}

export async function buildPdf({
  title,
  date,
  lines,
}: ReportInput): Promise<Uint8Array> {
  const safeLines = Array.isArray(lines) ? lines : [];

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const hebrewFontBytes = await loadHebrewFont();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const font = hebrewFontBytes
    ? await pdfDoc.embedFont(hebrewFontBytes, { subset: true })
    : helvetica;

  const margin = 48;
  const titleSize = 20;
  const bodySize = 12;
  const lineGap = 6;

  const isHebTitle = /[\u0590-\u05FF]/.test(title);
  const renderTitle = isHebTitle ? reorderRTL(title) : title;
  const titleWidth = font.widthOfTextAtSize(renderTitle, titleSize);
  const titleX = isHebTitle ? width - margin - titleWidth : margin;

  page.drawText(renderTitle, {
    x: titleX,
    y: height - margin,
    size: titleSize,
    font,
    color: rgb(0, 0, 0),
  });

  if (date) {
    const isHebDate = /[\u0590-\u05FF]/.test(date);
    const renderDate = isHebDate ? reorderRTL(date) : date;
    const dw = font.widthOfTextAtSize(renderDate, bodySize);
    const dx = isHebDate ? width - margin - dw : margin;
    page.drawText(renderDate, {
      x: dx,
      y: height - margin - titleSize - 8,
      size: bodySize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  let cursorY = height - margin - titleSize - 8 - bodySize - 12;
  const maxWidth = width - margin * 2;

  const wrapText = (t: string, size: number) => {
    const words = t.split(" ");
    const linesOut: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      const isHeb = /[\u0590-\u05FF]/.test(test);
      const candidate = isHeb ? reorderRTL(test) : test;
      const wWidth = font.widthOfTextAtSize(candidate, size);
      if (wWidth > maxWidth && current) {
        linesOut.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) linesOut.push(current);
    return linesOut;
  };

  const drawLine = (txt: string) => {
    const isHeb = /[\u0590-\u05FF]/.test(txt);
    const render = isHeb ? reorderRTL(txt) : txt;
    const textWidth = font.widthOfTextAtSize(render, bodySize);
    const x = isHeb ? width - margin - textWidth : margin;

    if (cursorY < margin + bodySize) {
      page = pdfDoc.addPage([595.28, 841.89]);
      cursorY = page.getSize().height - margin;
    }

    page.drawText(render, {
      x,
      y: cursorY,
      size: bodySize,
      font,
      color: rgb(0, 0, 0),
    });
    cursorY -= bodySize + lineGap;
  };

  for (const raw of safeLines) {
    const segments = wrapText(raw, bodySize);
    for (const seg of segments) drawLine(seg);
    cursorY -= 2;
  }

  return await pdfDoc.save();
}
