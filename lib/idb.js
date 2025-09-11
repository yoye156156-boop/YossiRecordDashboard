export async function openDB() {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open("mvp_audio", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("audio")) {
        db.createObjectStore("audio");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
