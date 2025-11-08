// ניתוח טקסט חי: רגשות, מילות מפתח ועיוותים קוגניטיביים (היוריסטיקות קלות)
const EMOTIONS = [
  { key: 'חרדה',   words: ['לחץ', 'דאג', 'פחד', 'חרד', 'מתוח', 'עומס'], color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'עצב',    words: ['עצוב', 'בדידות', 'כואב', 'ייאוש', 'מאוכזב'], color: 'text-sky-800 bg-sky-50 border-sky-200' },
  { key: 'כעס',    words: ['כועס', 'מעצבן', 'עצבן', 'מתוסכל', 'תסכול'],   color: 'text-red-700 bg-red-50 border-red-200' },
  { key: 'תקווה',  words: ['מקווה', 'אשמח', 'אנסה', 'אפשר', 'פתרון'],     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

const KEYWORDS = [
  { tag: 'עבודה', words: ['עבודה','בוס','מנהל','עמית','ישיבה'] },
  { tag: 'זוגיות', words: ['בן זוג','בת זוג','זוגיות','נישואים','מריבה'] },
  { tag: 'הימנעות', words: ['נמנע','נדחה','לא התקשרתי','לא דיברתי','ברחתי'] },
  { tag: 'בטחון עצמי', words: ['אני לא מצליח','כישלון','אין לי סיכוי','פחות ממני'] },
];

const DISTORTIONS = [
  { key: 'הכל או כלום',   tests: [/תמיד|אף פעם|הכל|כלום/] },
  { key: 'קריאת מחשבות', tests: [/יחשבו|ישפטו|ברור שהם חושבים|הם בטוח/‏בטוחים ש/] },
  { key: 'הכללה מוגזמת', tests: [/כל פעם ש|זה תמיד קורה|כל הזמן/] },
  { key: 'קטסטרופיזציה', tests: [/אסון|נורא|הכי גרוע|יהרס/ ] },
];

export function parseLiveText(text) {
  const lower = text.toLowerCase();

  // רגשות
  const emoHits = [];
  for (const e of EMOTIONS) {
    if (e.words.some(w => lower.includes(w.toLowerCase()))) emoHits.push(e.key);
  }

  // מילות-מפתח
  const kwHits = [];
  for (const g of KEYWORDS) {
    if (g.words.some(w => lower.includes(w.toLowerCase()))) kwHits.push(g.tag);
  }

  // עיוותים
  const distHits = [];
  for (const d of DISTORTIONS) {
    if (d.tests.some(re => re.test(lower))) distHits.push(d.key);
  }

  // סנטימנט גס
  const pos = ['מקווה','אפשר','הצלח','פתרון'].some(w => lower.includes(w.toLowerCase()));
  const neg = ['כישלון','נורא','פחד','דאג','כועס','עצוב','תסכול'].some(w => lower.includes(w.toLowerCase()));
  const sentiment = pos && !neg ? 'חיובי' : (!pos && neg ? 'שלילי' : 'נייטרלי');

  return { sentiment, emotions: emoHits, keywords: kwHits, distortions: distHits };
}

// הדגשת מילות מפתח בסיסית — מחזיר מערך חלקים {text, hit}
export function highlightKeywords(text) {
  const terms = [...new Set(KEYWORDS.flatMap(k => k.words))];
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const out = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), hit: false });
    out.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hit: false });
  return out;
}

export const EMOTION_STYLES = Object.fromEntries(EMOTIONS.map(e => [e.key, e.color]));
