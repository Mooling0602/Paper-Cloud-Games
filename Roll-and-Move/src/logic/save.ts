/**
 * Temporary in-memory game save (resume feature).
 * Survives menu ↔ game navigation within the page session;
 * deliberately NOT persisted — a page refresh loses it.
 */
export interface SavedGame {
  positions: [number, number];
  current: number;
}

let save: SavedGame | null = null;

export function saveGame(s: SavedGame): void {
  save = s;
}

export function loadGame(): SavedGame | null {
  return save;
}

export function hasSave(): boolean {
  return save !== null;
}

export function clearGame(): void {
  save = null;
}
