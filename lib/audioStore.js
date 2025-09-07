import { put, get, del, keys, clear } from './idb.js';

export const saveAudio = (id, blob) => put(id, blob);
export const getAudio  = (id) => get(id);
export const deleteAudio = (id) => del(id);
export const hasAudio = async (id) => !!(await get(id));
export const listAudioIds = () => keys();
export const clearAllAudio = () => clear();
