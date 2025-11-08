// Simple mock stream that emits Hebrew lines periodically.
// Accepts onLine/onWord/onChunk aliases. Cleans up on AbortSignal.

export function startMockHebrewStream({
  intervalMs = 5,
  signal,
  onLine,
  onWord,
  onChunk,
} = {}) {
  const cb = onLine || onWord || onChunk || (() => {});

  const lines = [
    "שלום מה שלומך היום",
    "בוא נדבר על מה שחשוב לך",
    "נשום עמוק ונספור עד חמש",
  ];

  let i = 0;
  const tick = () => {
    if (signal?.aborted) return;
    const line = lines[i++ % lines.length];
    try {
      cb(line);
    } catch {
      /* ignore user callback errors */
    }
  };

  const t = setInterval(tick, intervalMs);

  const cleanup = () => clearInterval(t);
  if (signal) signal.addEventListener("abort", cleanup, { once: true });

  return cleanup; // manual cleanup if needed
}
