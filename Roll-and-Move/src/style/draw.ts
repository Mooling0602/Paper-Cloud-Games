import Phaser from 'phaser';

/** Deterministic pseudo-random (seeded) for stable hand-drawn strokes. */
let rngState = 1;

export function seedRng(n: number): void {
  rngState = (n * 2654435761) >>> 0;
}

export function rand(): number {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState / 4294967296;
}

/** Wobbly "hand-drawn" line made of short segments. */
export function jitterLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  jitter = 1.6,
  segs = 6,
): void {
  let px = x1;
  let py = y1;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const nx = x1 + (x2 - x1) * t + (rand() - 0.5) * jitter;
    const ny = y1 + (y2 - y1) * t + (rand() - 0.5) * jitter;
    g.lineBetween(px, py, nx, ny);
    px = nx;
    py = ny;
  }
}

/** Wobbly rounded-rect outline. */
export function jitterRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  jitter = 1.4,
): void {
  const j = () => (rand() - 0.5) * jitter;
  const p = [
    { x: x + r + j(), y: y + j() },
    { x: x + w - r + j(), y: y + j() },
    { x: x + w + j(), y: y + r + j() },
    { x: x + w + j(), y: y + h - r + j() },
    { x: x + w - r + j(), y: y + h + j() },
    { x: x + r + j(), y: y + h + j() },
    { x: x + j(), y: y + h - r + j() },
    { x: x + j(), y: y + r + j() },
  ];
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    g.lineBetween(a.x, a.y, b.x, b.y);
  }
}

/** Small filled arrow between two points (for path hints). */
export function arrow(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 9,
): void {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a1 = ang + 0.5;
  const a2 = ang - 0.5;
  g.fillTriangle(
    mx + Math.cos(ang) * size,
    my + Math.sin(ang) * size,
    mx + Math.cos(a1) * size,
    my + Math.sin(a1) * size,
    mx + Math.cos(a2) * size,
    my + Math.sin(a2) * size,
  );
}

/** One-time subtle paper grain texture. */
export function makePaperTexture(scene: Phaser.Scene): Phaser.Textures.CanvasTexture {
  const key = 'paperNoise';
  const existing = scene.textures.get(key);
  if (existing && existing.key !== '__MISSING') return existing as Phaser.Textures.CanvasTexture;
  const c = scene.textures.createCanvas(key, 256, 256)!;
  const ctx = c.getContext();
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = `rgba(80,70,50,${0.01 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
  }
  c.refresh();
  return c;
}
