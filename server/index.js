require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8787;
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_KEY) {
  console.error('Missing DEEPGRAM_API_KEY in server/.env');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/realtime' });

app.get('/health', (_, res) => res.json({ ok: true }));

function webmToPcm16(buffer) {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'webm', '-i', 'pipe:0',
      '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1',
    ];
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    ff.stdout.on('data', d => out.push(Buffer.from(d)));
    ff.stderr.on('data', () => {});
    ff.on('close', code => {
      if (code === 0) return resolve(Buffer.concat(out));
      reject(new Error('ffmpeg failed'));
    });
    ff.stdin.end(buffer);
  });
}

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const provider = url.searchParams.get('provider') || 'deepgram';

  // חיבור ל-Deepgram Realtime (PCM16 16kHz)
  const dgUrl = 'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&smart_format=true&interim_results=true&language=he';
  const dg = new (require('ws'))(dgUrl, { headers: { Authorization: `Token ${DEEPGRAM_KEY}` } });

  dg.on('open', () => ws.send(JSON.stringify({ type: 'info', message: `provider=${provider} connected` })));

  dg.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const txt = msg?.channel?.alternatives?.[0]?.transcript || '';
      if (!txt) return;
      const isFinal = Boolean(msg?.is_final);
      ws.send(JSON.stringify({ type: isFinal ? 'final' : 'partial', text: txt }));
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: String(e) }));
    }
  });

  dg.on('error', (e) => ws.send(JSON.stringify({ type: 'error', message: 'Deepgram error: ' + e.message })));
  dg.on('close', () => ws.send(JSON.stringify({ type: 'info', message: 'Deepgram closed' })));

  ws.on('message', async (data) => {
    // טקסט = פקודות; בינארי = אודיו
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'stop') { dg.close(); ws.close(); }
      } catch {}
      return;
    }
    try {
      const pcm = await webmToPcm16(Buffer.from(data));
      if (dg.readyState === dg.OPEN) dg.send(pcm);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Transcode error: ' + e.message }));
    }
  });

  ws.on('close', () => { try { dg.close(); } catch {} });
});

server.listen(PORT, () => console.log('WS server on :' + PORT));
