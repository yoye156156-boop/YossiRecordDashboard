import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// עטיפת RTL מבלי להפוך מילים/אותיות (שומר את הסדר המקורי)
function rtlWrap(text) {
  const RLI = "\u2067"; // Right-to-Left Isolate
  const PDI = "\u2069"; // Pop Directional Isolate
  return `${RLI}${text}${PDI}`;
}

function loadHebrewFontBytes() {
  const projectFont = path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Regular.ttf");
  const winArialA = "C:\\\\Windows\\\\Fonts\\\\Arial.ttf";
  const winArialB = "C:\\\\Windows\\\\Fonts\\\\arial.ttf";
  for (const p of [projectFont, winArialA, winArialB]) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p); } catch {}
  }
  return undefined;
}

export async function buildPdf({ id, title, date, lines }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = loadHebrewFontBytes();
  if (!fontBytes) throw new Error("Missing Hebrew TTF font (put one in public/fonts or ensure Windows Arial exists)");

  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  // A4
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 50;

  const drawRightAligned = (text, y, size = 12) => {
    const s = rtlWrap(text);
    const tw = font.widthOfTextAtSize(s, size);
    const x = width - margin - tw;
    page.drawText(s, { x, y, size, font });
  };

  let y = height - margin - 24;
  drawRightAligned(title || `דוח פגישה #${id}`, y, 20);
  y -= 28;
  drawRightAligned(`נוצר: ${new Date(date || Date.now()).toLocaleString("he-IL")}`, y, 12);
  y -= 20;

  // עד 25 שורות לדוגמה
  const max = Math.min(Array.isArray(lines) ? lines.length : 0, 25);
  for (let i = 0; i < max; i++) {
    drawRightAligned(lines[i], y, 12);
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
