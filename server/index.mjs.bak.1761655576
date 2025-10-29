// server/index.mjs — WS :8787 → Deepgram Realtime (PCM16LE 16kHz mono) + save WAV & TXT
import 'dotenv/config';
import "dotenv/config";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
console.log('🔑 DG_KEY loaded?', !!process.env.DG_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- dirs ---
const recordingsDir = path.join(__dirname, "recordings");
fs.mkdirSync(recordingsDir, { recursive: true });
console.log("📁 recordingsDir:", recordingsDir);

// --- http + ws ---
const server = http.createServer((req, res) => { res.writeHead(200); res.end("OK\n"); });
const wss    = new WebSocketServer({ server, path: "/realtime" });
const PORT   = 8787;
server.listen(PORT, () => console.log(`WS server on :${PORT}`));

// --- WAV header helper ---
function writeWavHeader(stream, rate=16000, ch=1, bits=16, data=0) {
  const h = Buffer.alloc(44);
  h.write("RIFF",0);           h.writeUInt32LE(36+data,4);
  h.write("WAVE",8);           h.write("fmt ",12);
  h.writeUInt32LE(16,16);      h.writeUInt16LE(1,20);
  h.writeUInt16LE(ch,22);      h.writeUInt32LE(rate,24);
  h.writeUInt32LE(rate*ch*bits/8,28);
  h.writeUInt16LE(ch*bits/8,32);
  h.writeUInt16LE(bits,34);    h.write("data",36);
  h.writeUInt32LE(data,40);
  stream.write(h);
}

// --- utils ---
function newId(){ return "rec_" + Math.random().toString(36).slice(2,10); }

// --- WS connection ---
wss.on("connection", (ws) => {
  const id  = newId();
  const wav = path.join(recordingsDir, `${id}.wav`);
  const txt = path.join(recordingsDir, `${id}.txt`);
  const out = fs.createWriteStream(wav);
  writeWavHeader(out); // provisional
  let bytes = 0;

  console.log("🎧 new session:", id);

  // heartbeat
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
  const hb = setInterval(() => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; try { ws.ping(); } catch {}
  }, 30000);

  // ---- Deepgram Realtime ----
  const DG_KEY = process.env.DG_KEY;
  if (!DG_KEY) console.error("❌ Missing DG_KEY in server/.env");
  const dgUrl = "wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&language=he&interim_results=true&smart_format=true";
  const dg = new WebSocket(dgUrl, { headers: { Authorization: `Token ${DG_KEY}` } });

  dg.on("open",  () => console.log("🔗 DG connected for", id));
  dg.on("close", () => console.log("🔌 DG closed for", id));
  dg.on("error", (e) => console.error("DG error", e));
  dg.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const alt = msg?.channel?.alternatives?.[0];
      const t   = alt?.transcript || "";
      if (t && (msg.is_final || msg.speech_final)) {
        fs.appendFileSync(txt, t + "\n");
      }
    } catch (e) {
      console.error("DG parse error", e);
    }
  });

  // incoming audio chunks → write WAV + send to DG
  ws.on("message", (m) => {
    const b = Buffer.isBuffer(m) ? m : Buffer.from(m);
    out.write(b); bytes += b.length;
    if (dg.readyState === 1) dg.send(b);
  });

  ws.on("close", () => {
    clearInterval(hb);
    try { dg.close(); } catch {}
    out.end(() => {
      try {
        const fd = fs.openSync(wav, "r+");
        const p  = Buffer.alloc(4);
        p.writeUInt32LE(36 + bytes, 0); fs.writeSync(fd, p, 0, 4, 4);  // RIFF size
        p.writeUInt32LE(bytes, 0);      fs.writeSync(fd, p, 0, 4, 40); // data size
        fs.closeSync(fd);
      } catch (e) { console.error("WAV header patch error:", e); }
      console.log("🔚 session closed:", id, "files:", `${id}.wav`, `${id}.txt`);
    });
  });

  ws.on("error", (err) => {
    clearInterval(hb);
    console.error("WS error:", err);
    try { dg.close(); } catch {}
    try { out.end(); } catch {}
  });
});
