// lib/pdf.js — ESM רגיל, עובד ב-Node runtime של Next
import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const A4 = [595.28, 841.89]; // נקודות
const MARGIN = 40;

// עוטף RTL ודואג שמספרים יוצגו LTR כדי שלא יתהפכו
function rtlWrap(s) {
  const RLE = "\u202B"; // Right-to-Left Embedding
  const LRE = "\u202A"; // Left-to-Right Embedding
  const PDF = "\u202C"; // Pop Directional Formatting
  const withDigits = String(s).replace(/\d[\d:/\-.]*/g, (m) => `${LRE}${m}${PDF}`);
  return `${RLE}${withDigits}${PDF}`;
}

// מנסה למצוא פונט עברי מותקן/מקומי
async function pickFont() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "public", "fonts", "NotoSansHebrew-Regular.ttf"), // אם הורד לפרויקט
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      return { buf, path: p };
    } catch {
      // ננסה את הבא
    }
  }
  throw new Error("לא נמצאה פונט עברית מותקנת (Noto/DejaVu/FreeSans).");
}

export async function buildPdf({ id, title, date, lines = [] }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const { buf: heFontBytes, path: heFontPath } = await pickFont();
  const heFont = await pdfDoc.embedFont(heFontBytes, { subset: true });

  let page = pdfDoc.addPage(A4);
  let { width: w, height: h } = page.getSize();

  // נסיר סימני bidi למדידה בלבד (כדי שלא יֵימדדו כריבועים)
  const STRIP_BIDI = /[\u202A-\u202E\u2066-\u2069]/g;

  // מצייר מיושר לימין – טקסט עברי “טהור” ללא bidi
  const drawRightPlain = (text, y, size = 14) => {
    const width = heFont.widthOfTextAtSize(text, size);
    page.drawText(text, { x: w - MARGIN - width, y, size, font: heFont });
  };

  // מצייר מיושר לימין עם עטיפת RTL – לשורות עם ספרות/תאריך/שעה
  const drawRightRTL = (text, y, size = 14) => {
    const t = rtlWrap(text);
    const width = heFont.widthOfTextAtSize(t.replace(STRIP_BIDI, ""), size);
    page.drawText(t, { x: w - MARGIN - width, y, size, font: heFont });
  };

  // כותרת
  let y = h - MARGIN - 40;
  drawRightPlain(title || `דוח פגישה #${id}`, y, 32);
  y -= 28;

  // תאריך he-IL (תמיד קיים ערך) — עם RTL כי יש ספרות
  const dt = new Date(date ?? Date.now());
  const digits = dt
    .toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
  drawRightRTL(`נוצר: ${digits}`, y, 12);
  y -= 18;

  // שורות תמלול
  for (const line of (Array.isArray(lines) ? lines : [])) {
    if (y < MARGIN + 40) {
      // עמוד חדש
      page = pdfDoc.addPage(A4);
      ({ width: w, height: h } = page.getSize());
      y = h - MARGIN - 24;
    }
    const text = `- ${line}`;              // מקף במקום • כדי למנוע ריבועים
    const needsRTL = /[0-9]/.test(line);   // אם יש ספרות – נעטוף ב-RTL
    (needsRTL ? drawRightRTL : drawRightPlain)(text, y, 16);
    y -= 20;
  }

  const bytes = await pdfDoc.save();
  console.log(`PDF fonts → HE: ${heFontPath}`);
  return bytes;
}
