export function startMockStream({ onLine, signal, intervalMs = 2000 }) {
  const lines = [
    "שלום מה שלומך היום",
    "בוא נדבר על מה שחשוב לך",
    "נשום עמוק ונספור עד חמש",
  ];
  let i = 0;
  const id = setInterval(() => {
    if (signal?.aborted) { clearInterval(id); return; }
    onLine(lines[i % lines.length]);
    i++;
  }, intervalMs);
  const stop = () => clearInterval(id);
  if (signal) signal.addEventListener("abort", stop, { once: true });
  return { stop };
}

export { startMockStream as startMockHebrewStream };
