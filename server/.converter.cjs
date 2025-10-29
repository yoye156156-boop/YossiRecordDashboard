const fs = require('fs');

function pad(n,z=2){ return String(n).padStart(z,'0'); }
function ts(t){ // seconds -> HH:MM:SS.mmm
  const ms = Math.round((t%1)*1000);
  const s = Math.floor(t)%60, m = Math.floor(t/60)%60, h = Math.floor(t/3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3,'0')}`;
}

function buildFromWords(alt){
  const words = alt.words || [];
  if (!words.length) return null;
  // קיבוץ מילים לשורות (~8–12 מילים לשורה)
  const chunk = 10;
  let cues = [];
  for (let i=0; i<words.length; i+=chunk){
    const slice = words.slice(i, i+chunk);
    const start = slice[0].start ?? 0;
    const end   = slice[slice.length-1].end ?? (start+2);
    const text  = slice.map(w => w.punctuated_word || w.word).join(' ');
    cues.push({start, end, text: text.trim()});
  }
  return cues;
}

function buildFromParagraphs(alt){
  const paras = alt?.paragraphs?.paragraphs || alt?.paragraphs?.items || [];
  let cues = [];
  for (const p of paras){
    const sents = p.sentences || p.items || [];
    if (sents?.length){
      for (const s of sents){
        if (typeof s.start==='number' && typeof s.end==='number' && s.text){
          cues.push({start:s.start, end:s.end, text:s.text.trim()});
        }
      }
    } else if (typeof p.start==='number' && typeof p.end==='number' && p.text){
      cues.push({start:p.start, end:p.end, text:p.text.trim()});
    }
  }
  return cues.length ? cues : null;
}

function buildFromTranscript(alt, dur){
  const t = (alt.transcript||'').trim();
  if (!t) return null;
  const words = t.split(/\s+/);
  const chunk = 12;
  const total = Math.max(dur||0, Math.ceil(words.length/chunk)*3); // הערכת משך
  const step = total / Math.ceil(words.length/chunk);
  let cues=[], time=0;
  for (let i=0;i<words.length;i+=chunk){
    const text = words.slice(i, i+chunk).join(' ');
    cues.push({start: time, end: Math.min(time+step, total), text});
    time += step;
  }
  return cues;
}

function toVTT(cues){
  let out = 'WEBVTT\n\n';
  cues.forEach((c,i)=>{
    out += `${i+1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n\n`;
  });
  return out;
}

function toSRT(cues){
  let out = '';
  cues.forEach((c,i)=>{
    out += `${i+1}\n${ts(c.start).replace('.',',')} --> ${ts(c.end).replace('.',',')}\n${c.text}\n\n`;
  });
  return out;
}

function tryDeepgramCaptions(json, kind){
  try {
    const { webvtt, srt } = require('@deepgram/captions');
    if (kind==='vtt') return webvtt(json);
    if (kind==='srt') return srt(json);
  } catch(e) { /* not installed */ }
  return null;
}

// main
const jsonPath = process.argv[2];
const outVtt = process.argv[3];
const outSrt = process.argv[4];
const j = JSON.parse(fs.readFileSync(jsonPath,'utf8'));
const alt = j?.results?.channels?.[0]?.alternatives?.[0] || {};
const dur = j?.metadata?.duration;

let vtt = tryDeepgramCaptions(j, 'vtt');
let srt = tryDeepgramCaptions(j, 'srt');

if (!vtt || !srt){
  // manual fallback
  let cues = buildFromWords(alt) || buildFromParagraphs(alt) || buildFromTranscript(alt, dur);
  if (!cues || !cues.length) {
    throw new Error('No usable data to build captions.');
  }
  vtt = vtt || toVTT(cues);
  srt = srt || toSRT(cues);
}

fs.writeFileSync(outVtt, vtt);
fs.writeFileSync(outSrt, srt);
console.error(`Wrote ${outVtt} and ${outSrt}`);
