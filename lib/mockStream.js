export function createMockHebrewStream({ intervalMs = 2000 } = {}) {
  const sentences = ['שלום, מה שלומך היום?','נשום עמוק ונספור עד חמש.','אני כאן כדי להקשיב.']
  return ({ signal, onData }) => {
    let i = 0
    const id = setInterval(() => {
      if (signal?.aborted) { clearInterval(id); return }
      onData?.(sentences[i++ % sentences.length])
    }, intervalMs)
    const stop = () => clearInterval(id)
    signal?.addEventListener?.('abort', stop)
    return stop
  }
}
