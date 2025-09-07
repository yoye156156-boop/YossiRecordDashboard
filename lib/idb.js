const DB_NAME = 'mvp';
const DB_VER = 1;
const STORE = 'audio';

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function get(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const rq = tx.objectStore(STORE).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}

export async function del(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const rq = tx.objectStore(STORE).delete(key);
    rq.onsuccess = () => resolve();
    rq.onerror = () => reject(rq.error);
  });
}

export async function keys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    if ('getAllKeys' in store) {
      const rq = store.getAllKeys();
      rq.onsuccess = () => resolve(rq.result || []);
      rq.onerror = () => reject(rq.error);
    } else {
      const out = [];
      const rq = store.openKeyCursor();
      rq.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) return resolve(out);
        out.push(cur.key);
        cur.continue();
      };
      rq.onerror = () => reject(rq.error);
    }
  });
}

export async function clear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const rq = tx.objectStore(STORE).clear();
    rq.onsuccess = () => resolve();
    rq.onerror = () => reject(rq.error);
  });
}
