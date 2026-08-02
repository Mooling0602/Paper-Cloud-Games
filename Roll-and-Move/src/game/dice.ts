import Phaser from 'phaser';
import { PAPER } from '../../../Core/style/paper';
import { jitterRect, seedRng, rand } from '../style/draw';

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

export interface Dice {
  value: number;
  isRolling: boolean;
  setValue: (n: number) => void;
  /** Animated roll: jump up, spin, land; resolves with the random result. */
  roll: () => Promise<number>;
  setEnabled: (on: boolean) => void;
  destroy: () => void;
}

export function createDice(scene: Phaser.Scene, x: number, y: number, size = 84, onTap?: () => void): Dice {
  const g = scene.add.graphics();
  const shadow = scene.add.graphics();
  const zone = scene.add.zone(x, y, size + 16, size + 16).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [shadow, g]);
  container.setSize(size, size);

  let value = 1;
  let rolling = false;
  let enabled = true;

  const draw = () => {
    g.clear();
    const half = size / 2;
    seedRng(value * 31);
    // paper face
    g.fillStyle(PAPER.base, 1);
    g.fillRoundedRect(-half, -half, size, size, 12);
    g.lineStyle(2.4, PAPER.ink, 1);
    jitterRect(g, -half, -half, size, size, 12);
    g.lineStyle(1, PAPER.inkSoft, 0.5);
    jitterRect(g, -half + 2, -half + 3, size - 4, size - 4, 10, 0.8);
    // pips
    const pr = size * 0.075;
    const off = size * 0.24;
    g.fillStyle(PAPER.red, 0.92);
    for (const [dx, dy] of PIPS[value]) {
      g.fillCircle(dx * off, dy * off, pr);
    }
  };

  const drawShadow = () => {
    shadow.clear();
    shadow.fillStyle(PAPER.ink, 0.18);
    shadow.fillEllipse(0, size / 2 + 10, size * 0.8, 14);
  };

  zone.on('pointerdown', () => {
    if (enabled && !rolling && onTap) onTap();
  });
  draw();
  drawShadow();

  const jump = (): Promise<void> =>
    new Promise((resolve) => {
      scene.tweens.add({
        targets: container,
        y: y - 150,
        angle: 540,
        duration: 340,
        ease: 'Quad.easeOut',
        onComplete: () => {
          scene.tweens.add({
            targets: container,
            y,
            angle: 720,
            duration: 300,
            ease: 'Bounce.easeOut',
            onComplete: () => resolve(),
          });
        },
      });
    });

  return {
    get value() {
      return value;
    },
    get isRolling() {
      return rolling;
    },
    setValue: (n: number) => {
      value = Math.max(1, Math.min(6, n));
      draw();
    },
    roll: async () => {
      rolling = true;
      container.setAlpha(0.96);
      await jump();
      rolling = false;
      const n = 1 + Math.floor(rand() * 6);
      setValueSafe(n);
      return n;
    },
    setEnabled: (on: boolean) => {
      enabled = on;
      container.setAlpha(on ? 1 : 0.55);
    },
    destroy: () => {
      container.destroy();
      zone.destroy();
    },
  };

  function setValueSafe(n: number): void {
    value = n;
    draw();
  }
}
