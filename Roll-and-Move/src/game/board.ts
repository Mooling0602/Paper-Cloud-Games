import Phaser from 'phaser';
import { PAPER } from '../../../Core/style/paper';
import { arrow, jitterLine, seedRng, rand } from '../style/draw';

export const GRID = 5;
export const LAST_CELL = GRID * GRID - 1; // 0-based index of the finish cell

export interface BoardSpec {
  /** Grid center. */
  cx: number;
  cy: number;
  /** Cell size in px. */
  size: number;
  /** Gap between cells in px. */
  gap: number;
}

/** Snake (boustrophedon) cell index → grid position. */
export function cellPos(i: number): { row: number; col: number } {
  const row = Math.floor(i / GRID);
  const col = row % 2 === 0 ? i % GRID : GRID - 1 - (i % GRID);
  return { row, col };
}

export function cellCenter(spec: BoardSpec, i: number): { x: number; y: number } {
  const { row, col } = cellPos(i);
  const step = spec.size + spec.gap;
  const half = (GRID - 1) / 2;
  return { x: spec.cx + (col - half) * step, y: spec.cy + (row - half) * step };
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

export interface Board {
  graphics: Phaser.GameObjects.Graphics;
  /** Text objects that need re-translation (start/finish labels). */
  labelTexts: Phaser.GameObjects.Text[];
  clear: () => void;
}

/** Draw the paper-style board. labelCb renders start/finish label text (i18n-aware). */
export function drawBoard(scene: Phaser.Scene, spec: BoardSpec, labelCb: (key: string) => string): Board {
  const g = scene.add.graphics();
  const labelTexts: Phaser.GameObjects.Text[] = [];

  for (let i = 0; i < GRID * GRID; i++) {
    const { row, col } = cellPos(i);
    const c = cellCenter(spec, i);
    const x = c.x - spec.size / 2;
    const y = c.y - spec.size / 2;

    seedRng(i + 1);
    g.fillStyle((row + col) % 2 === 0 ? PAPER.base : PAPER.alt, 1);
    g.fillRoundedRect(x, y, spec.size, spec.size, 6);
    g.lineStyle(1.6, PAPER.ink, 0.85);
    jitterLine(g, x + 3, y + 2, x + spec.size - 3, y + 2, 1.2, 4);
    jitterLine(g, x + spec.size - 2, y + 3, x + spec.size - 2, y + spec.size - 3, 1.2, 4);
    jitterLine(g, x + spec.size - 3, y + spec.size - 2, x + 3, y + spec.size - 2, 1.2, 4);
    jitterLine(g, x + 2, y + spec.size - 3, x + 2, y + 3, 1.2, 4);

    // cell number (top-left corner, faint pencil)
    const num = scene.add
      .text(x + 12, y + 10, String(i + 1), {
        fontFamily: 'Patrick Hand',
        fontSize: '15px',
        color: PAPER.inkSoftCss,
      })
      .setOrigin(0.5);
    labelTexts.push(num);

    // i18n-aware board labels (start/finish) carry their key in data
    if (i === 0) {
      g.fillStyle(PAPER.red, 1);
      g.fillTriangle(x + 2, y + 2, x + 26, y + 2, x + 2, y + 26);
      const t = scene.add
        .text(x + 14, y + 14, labelCb('game.start'), {
          fontFamily: 'Patrick Hand',
          fontSize: '11px',
          color: '#fff6ea',
        })
        .setOrigin(0.5)
        .setData('i18nKey', 'game.start');
      labelTexts.push(t);
    } else if (i === LAST_CELL) {
      g.fillStyle(PAPER.green, 1);
      g.fillTriangle(x + spec.size - 2, y + 2, x + spec.size - 26, y + 2, x + spec.size - 2, y + 26);
      const t = scene.add
        .text(x + spec.size - 14, y + 14, labelCb('game.finish'), {
          fontFamily: 'Patrick Hand',
          fontSize: '11px',
          color: '#fff6ea',
        })
        .setOrigin(0.5)
        .setData('i18nKey', 'game.finish');
      labelTexts.push(t);
    }

    // path arrow toward the next cell
    const next = nextPos(row, col);
    if (next) {
      const nc = cellCenter(spec, i + 1);
      g.fillStyle(PAPER.inkSoft, 0.55);
      arrow(g, c.x, c.y, nc.x, nc.y, 7);
    }
  }

  return {
    graphics: g,
    labelTexts,
    clear: () => {
      g.destroy();
      labelTexts.forEach((t) => t.destroy());
      labelTexts.length = 0;
    },
  };
}

/** Paper token for a player (wobbly circle + inner disc). */
export function drawToken(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  soft: number,
  r = 24,
): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  seedRng(Math.round(x + y + color));
  const rr = r + (rand() - 0.5) * 2;
  g.fillStyle(soft, 1);
  g.fillCircle(0, 0, rr);
  g.lineStyle(2.4, color, 1);
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const a1 = (i / steps) * Math.PI * 2;
    const a2 = ((i + 1) / steps) * Math.PI * 2;
    g.lineBetween(
      Math.cos(a1) * rr + (rand() - 0.5) * 1.6,
      Math.sin(a1) * rr + (rand() - 0.5) * 1.6,
      Math.cos(a2) * rr + (rand() - 0.5) * 1.6,
      Math.sin(a2) * rr + (rand() - 0.5) * 1.6,
    );
  }
  return scene.add.container(x, y, [g]);
}
