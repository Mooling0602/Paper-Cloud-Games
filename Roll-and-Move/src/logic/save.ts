/**
 * Persistent saves (localStorage).
 * - Local game save: survives page refresh (only dice state is lost, per spec).
 * - Online host save: written on disconnect so the game can be resumed later.
 */
export interface SavedGame {
  positions: [number, number];
  current: number;
}

const LOCAL_KEY = 'rm-local-save';
const ONLINE_KEY = 'rm-online-save';

function read(key: string): SavedGame | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedGame;
    if (!Array.isArray(s.positions) || typeof s.current !== 'number') return null;
    return s;
  } catch {
    return null;
  }
}

function write(key: string, s: SavedGame): void {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

/** A save only counts once someone has actually moved (not both at start). */
function isValid(s: SavedGame | null): boolean {
  return s !== null && (s.positions[0] !== 0 || s.positions[1] !== 0);
}

export function saveLocalGame(s: SavedGame): void {
  write(LOCAL_KEY, s);
}
export function loadLocalGame(): SavedGame | null {
  return read(LOCAL_KEY);
}
export function hasLocalSave(): boolean {
  return isValid(read(LOCAL_KEY));
}
export function clearLocalGame(): void {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

export function saveOnlineGame(s: SavedGame): void {
  write(ONLINE_KEY, s);
}
export function loadOnlineGame(): SavedGame | null {
  return read(ONLINE_KEY);
}
export function hasOnlineSave(): boolean {
  return isValid(read(ONLINE_KEY));
}
export function clearOnlineGame(): void {
  try {
    localStorage.removeItem(ONLINE_KEY);
  } catch {
    /* ignore */
  }
}
