import { openDB } from "./idb.js";

export async function saveAudio(id, blob) {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function getAudio(id) {
  const db = await openDB();
  const out = await new Promise((res, rej) => {
    const tx = db.transaction("audio", "readonly");
    const r = tx.objectStore("audio").get(id);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return out;
}

export async function hasAudio(id) {
  return (await getAudio(id)) != null;
}

export async function deleteAudio(id) {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function clearAllAudio() {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").clear();
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}
