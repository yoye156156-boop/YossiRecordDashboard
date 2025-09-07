import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/** הופך שורה להצגה RTL עבור pdf-lib (פשוט ופרקטי):
 * - הופך רצפים בעברית (א-ת + ניקוד) כדי שייצאו נכונים
 * - משאיר מספרים/אנגלית/סימנים בסדרם
 * - מרכיב מחדש את הרצפים כך שסדר הקריאה יהיה “ימין-לשמאל”
 */
export function rtlVisual(line = "") {
  if (!line) return "";
  const isHeb = (ch) => /[\u0590-\u05FF]/.test(ch);
  const tokens = [];
  let cur = "";
  let curHeb = isHeb(line[0] || "");
  for (const ch of line) {
    const h = isHeb(ch);
    if (h === curHeb) {
      cur += ch;
    } else {
      tokens.push({ text: cur, heb: curHeb });
      cur = ch;
      curHeb = h;
    }
  }
  if (cur) tokens.push({ text: cur, heb: curHeb });

  // היפוך תווים בתוך טוקנים עבריים + היפוך סדר הטוקנים (בידי בסיסי)
  const reversedTokens = tokens
    .map(t => t.heb ? { ...t, text: [...t.text].reverse().join("") } : t)
    .reverse();

  return reversedTokens.map(t => t.text).join("");
}

export async function buildPdf({ id, title, date, lines = [] }) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // נסה גופן עברי, נפל? fallback להלבטיקה (לא מומלץ לעברית)
  let font;
  try {
    const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Regular.ttf");
    const fontBytes = fs.readFileSync(fontPath);
    font = await pdfDoc.embedFont(fontBytes, { subset: true });
  } catch {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const A4 = [595.28, 841.89]; // pt
  const margin = 50;
  const sizeTitle = 20;
  const sizeBody = 12;
  const sizeFoot = 10;

  const safeDate = new Date(date || Date.now());
  const dateStr = safeDate.toLocaleString("he-IL");

  const pages = [];
  let page = pdfDoc.addPage(A4);
  let y = A4[1] - margin;
  pages.push(page);

  const drawRTL = (p, txt, yPos, size) => {
    const s = rtlVisual(txt);
    const w = font.widthOfTextAtSize(s, size);
    const x = A4[0] - margin - w;
    p.drawText(s, { x, y: yPos, size, font, color: rgb(0, 0, 0) });
  };

  // כותרת + תאריך
  y -= sizeTitle;
  drawRTL(page, title || `דוח פגישה #${id}`, y, sizeTitle);
  y -= 24;
  drawRTL(page, `נוצר: ${dateStr}`, y, sizeBody);
  y -= 18;

  const newPage = () => {
    page = pdfDoc.addPage(A4);
    pages.push(page);
    y = A4[1] - margin;
  };

  for (const line of lines) {
    const lineHeight = 16;
    if (y - lineHeight < margin + 20) newPage();
    y -= lineHeight;
    drawRTL(page, line, y, sizeBody);
  }

  // מספור עמודים "עמוד X מתוך Y"
  const total = pages.length;
  pages.forEach((p, i) => {
    const label = rtlVisual(`עמוד ${i + 1} מתוך ${total}`);
    const w = font.widthOfTextAtSize(label, sizeFoot);
    const x = A4[0] - margin - w;
    const yFoot = margin - 12;
    p.drawText(label, { x, y: yFoot, size: sizeFoot, font, color: rgb(0.3,0.3,0.3) });
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
