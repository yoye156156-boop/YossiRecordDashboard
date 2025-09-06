export function startMockHebrewStream({ onData, intervalMs = 2000, abortSignal } = {}) {
  const sentences = [
    'שלום מה שלומך היום',
    'בוא נדבר על מה שחשוב לך',
    'נשום עמוק ונספור עד חמש',
  ];
  let i = 0;
  const timer = setInterval(() => {
    if (abortSignal?.aborted) return;
    onData?.(sentences[i++ % sentences.length]);
  }, intervalMs);

  const stop = () => clearInterval(timer);
  if (abortSignal) abortSignal.addEventListener('abort', stop, { once: true });
  return { stop };
}
