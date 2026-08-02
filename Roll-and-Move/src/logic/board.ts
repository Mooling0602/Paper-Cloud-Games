export const GRID = 5;
export const LAST_CELL = GRID * GRID - 1; // 0-based index of the finish cell

/** Snake (boustrophedon) cell index → grid position. */
export function cellPos(i: number): { row: number; col: number } {
  const row = Math.floor(i / GRID);
  const col = row % 2 === 0 ? i % GRID : GRID - 1 - (i % GRID);
  return { row, col };
}

/** Grid position of the next cell in path order (snake), or null for the last cell. */
export function nextPos(row: number, col: number): { row: number; col: number } | null {
  const edge = GRID - 1;
  if (row % 2 === 0) {
    if (col < edge) return { row, col: col + 1 };
    return row < edge ? { row: row + 1, col } : null;
  }
  if (col > 0) return { row, col: col - 1 };
  return row < edge ? { row: row + 1, col } : null;
}
