import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'node:fs/promises'
import path from 'node:path'

// מסירים תווי bidi/בקרה + ממירים כל סוגי הרווחים לרווח רגיל,
// ואז מוחקים כל תו שלא ברשימת-לבנה (אותיות עבריות/לטיניות, ספרות וסימני פיסוק שכיחים)
const CTRL_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C\uFEFF\u200B-\u200D\u2060\u00AD]/g
const SPACE_VARIANTS_RE = /[\u00A0\u202F\u2000-\u200A\u205F\u3000]/g
const ALLOWED_CHARS_RE = /[^\p{Script=Hebrew}A-Za-z0-9 \-–—_,.:;\/\\#(){}\[\]"'!?@+*=<>%&₪$€£|~]/gu
const sanitize = (s) =>
  String(s ?? '')
    .replace(CTRL_RE, '')
    .replace(SPACE_VARIANTS_RE, ' ')
    .replace(ALLOWED_CHARS_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

async function readFirstExisting(paths) {
  for (const p of paths) {
    try { return { path: p, bytes: await fs.readFile(p) } } catch {}
  }
  return null
}

export async function buildPdf({ id, title, date, lines }) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const root = process.cwd()

  // עברית תחילה (פרויקט → מערכת)
  const heCandidates = [
    path.join(root, 'public/fonts/NotoSansHebrew-Regular.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ]
  // לטיני/ספרות
  const latCandidates = [
    path.join(root, 'public/fonts/NotoSans-Regular.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ]

  const heFound  = await readFirstExisting(heCandidates)
  const latFound = await readFirstExisting(latCandidates)
  if (!heFound && !latFound) {
    throw new Error('No usable TTF fonts found. Install a Hebrew-capable TTF or place fonts in public/fonts/')
  }

  console.log('PDF fonts → HE:', heFound?.path, '| LAT:', latFound?.path)

  const heFont  = await pdfDoc.embedFont((heFound ?? latFound).bytes, { subset: true })
  const latFont = await pdfDoc.embedFont((latFound ?? heFound).bytes, { subset: true })

  const PAGE_W = 595.28, PAGE_H = 841.89
  let page = pdfDoc.addPage([PAGE_W, PAGE_H])
  const margin = 50

  // פיצול השורה ל״ריצות״: עברית/לא-עברית, ואז חישוב רוחב וציור במיקס גופנים מיושר לימין
  function chunkRuns(text) {
    const s = sanitize(text)
    const runs = []
    let cur = ''
    let curHeb = null
    for (const ch of s) {
      const isHeb = /\p{Script=Hebrew}/u.test(ch)
      if (curHeb === null) { cur = ch; curHeb = isHeb }
      else if (isHeb === curHeb) { cur += ch }
      else { runs.push({ text: cur, heb: curHeb }); cur = ch; curHeb = isHeb }
    }
    if (cur) runs.push({ text: cur, heb: curHeb })
    return runs
  }

  function widthOfRuns(runs, size) {
    return runs.reduce((acc, r) => {
      const f = r.heb ? heFont : latFont
      return acc + f.widthOfTextAtSize(r.text, size)
    }, 0)
  }

  function drawRightAlignedMixed(text, y, size = 12) {
    const runs = chunkRuns(text)
    const total = widthOfRuns(runs, size)
    let x = PAGE_W - margin - total
    for (const r of runs) {
      const f = r.heb ? heFont : latFont
      page.drawText(r.text, { x, y, size, font: f })
      x += f.widthOfTextAtSize(r.text, size)
    }
  }

  function drawDateLine(y, size = 12, createdStr) {
    const label = sanitize('נוצר:')
    const tail  = sanitize(createdStr)
    const runsLabel = chunkRuns(label) // בדרך כלל עברית נטו, אבל לשמירה על אחידות
    const wLabel = widthOfRuns(runsLabel, size)
    const wSpace = heFont.widthOfTextAtSize(' ', size)
    const wTail  = latFont.widthOfTextAtSize(tail, size)
    const total  = wLabel + wSpace + wTail

    let x = PAGE_W - margin - total
    // label (מיקס, אבל יהיה עברית)
    for (const r of runsLabel) {
      const f = r.heb ? heFont : latFont
      page.drawText(r.text, { x, y, size, font: f })
      x += f.widthOfTextAtSize(r.text, size)
    }
    // space
    page.drawText(' ', { x, y, size, font: heFont }); x += wSpace
    // date (לטיני)
    page.drawText(tail, { x, y, size, font: latFont })
  }

  const created = formatHeDate(date || Date.now())

  // כותרת + תאריך
  let y = PAGE_H - margin - 24
  drawRightAlignedMixed(title || `דוח פגישה #${id}`, y, 20); y -= 28
  drawDateLine(y, 12, created); y -= 20

  // שורות התמלול (גם במיקס — אם נכנסו מספרים/אנגלית)
  for (const line of (lines || [])) {
    drawRightAlignedMixed(line, y, 12)
    y -= 16
    if (y < margin + 40) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - margin - 24
    }
  }

  return await pdfDoc.save()
}

function formatHeDate(input) {
  try {
    const dt = new Date(input)
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(dt)
  } catch {
    return new Date().toLocaleString('he-IL')
  }
}
