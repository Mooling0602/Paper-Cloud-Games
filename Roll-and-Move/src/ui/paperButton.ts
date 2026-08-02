import Phaser from 'phaser';
import { PAPER, FONTS } from '../../../Core/style/paper';
import { jitterRect, seedRng } from '../style/draw';

export interface PaperButton {
  container: Phaser.GameObjects.Container;
  setLabel: (label: string) => void;
  setEnabled: (on: boolean) => void;
  setVisible: (on: boolean) => void;
}

export interface PaperButtonOpts {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  onClick: () => void;
  fontSize?: number;
  textColor?: string;
}

/** Paper-styled button (jittered ink outline, press flash). */
export function paperButton(scene: Phaser.Scene, opts: PaperButtonOpts): PaperButton {
  const { x, y, width, height, label, onClick } = opts;
  const fontSize = opts.fontSize ?? 22;
  const textColor = opts.textColor ?? PAPER.inkCss;

  const g = scene.add.graphics();
  const zone = scene.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y, label, { fontFamily: FONTS.family, fontSize, color: textColor })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [g, text]);
  container.setSize(width, height);

  let enabled = true;
  let pressed = false;

  const draw = () => {
    g.clear();
    seedRng(Math.round(x * 7 + y * 13 + (enabled ? 0 : 1000)));
    g.fillStyle(PAPER.base, enabled ? 1 : 0.45);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    g.lineStyle(2.2, PAPER.ink, enabled ? 1 : 0.4);
    jitterRect(g, -width / 2, -height / 2, width, height, 10);
    // soft pencil shadow
    g.lineStyle(1, PAPER.inkSoft, 0.35);
    jitterRect(g, -width / 2 + 1.5, -height / 2 + 2.5, width, height, 10, 0.8);
  };

  zone.on('pointerdown', () => {
    if (!enabled) return;
    pressed = true;
    container.setScale(0.97);
  });
  zone.on('pointerup', () => {
    if (!enabled || !pressed) return;
    pressed = false;
    container.setScale(1);
    onClick();
  });
  zone.on('pointerout', () => {
    pressed = false;
    container.setScale(1);
  });

  draw();

  return {
    container,
    setLabel: (l: string) => text.setText(l),
    setEnabled: (on: boolean) => {
      enabled = on;
      zone.setInteractive({ useHandCursor: on });
      draw();
    },
    setVisible: (on: boolean) => container.setVisible(on),
  };
}
