import { WebSocket } from "ws";
const url = "ws://localhost:8787/realtime";
const ws = new WebSocket(url);
ws.on("open", () => {
  process.stdin.on("data", (chunk) => ws.send(chunk));
  process.stdin.on("end", () => ws.close());
});
ws.on("close", () => process.exit(0));
ws.on("error", (e) => {
  console.error("ws error:", e);
  process.exit(1);
});
