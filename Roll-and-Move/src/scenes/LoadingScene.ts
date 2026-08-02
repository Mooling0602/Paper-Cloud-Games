import Phaser from 'phaser';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { PAPER, FONTS, DPR } from '../../../Core/style/paper';
import { makePaperTexture } from '../style/draw';

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super('Loading');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;

    this.add.graphics().fillStyle(PAPER.base, 1).fillRect(0, 0, width, height);
    const noise = makePaperTexture(this);
    this.add.tileSprite(width / 2, height / 2, width, height, noise.key).setAlpha(0.5);

    const title = this.add
      .text(width / 2, height / 2 - 60 * DPR, 'Roll-and-Move', {
        fontFamily: FONTS.heading,
        fontSize: 52 * DPR,
        color: PAPER.inkCss,
      })
      .setOrigin(0.5);

    const barW = 360 * DPR;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 + 20 * DPR;
    const barBg = this.add.graphics();
    barBg.fillStyle(PAPER.alt, 1).fillRoundedRect(barX, barY, barW, 18 * DPR, 9 * DPR);
    barBg.lineStyle(1.6 * DPR, PAPER.ink, 0.8);
    barBg.strokeRoundedRect(barX, barY, barW, 18 * DPR, 9 * DPR);
    const fill = this.add.graphics();
    const bar = { w: 0 };

    const label = this.add
      .text(width / 2, barY + 48 * DPR, i18n.t('loading.text'), {
        fontFamily: FONTS.family,
        fontSize: 18 * DPR,
        color: PAPER.inkSoftCss,
      })
      .setOrigin(0.5);

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      this.tweens.add({
        targets: bar,
        w: barW - 6,
        duration: 520,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          fill.clear();
          fill.fillStyle(PAPER.red, 1).fillRoundedRect(barX + 3 * DPR, barY + 3 * DPR, bar.w, 12 * DPR, 6 * DPR);
        },
        onComplete: () => this.scene.start('Menu'),
      });
    };

    // Chinese webfonts are split into unicode-range subsets; loading with a
    // sample text forces the chinese-simplified subset to download, otherwise
    // canvas text silently falls back to the system font.
    const ZH_SAMPLE =
      '加载中…开始游戏纸面风格桌游纸云游戏·木泠工作室的回合点击骰子掷骰重投（剩次）走棋掷出点剩余重投次数获胜！再来一局第格起点终点屏幕尺寸过小需要更大的屏幕（平板或电脑）。请在平板或电脑上打开本游戏。当前尺寸：×';
    const loading = Promise.all([
      document.fonts.load('16px "LXGW WenKai"', ZH_SAMPLE),
      document.fonts.load('16px "Patrick Hand"', 'Roll-and-Move Loading... Start Game EN'),
      document.fonts.load('28px "LXGW WenKai"', ZH_SAMPLE),
    ])
      .catch(() => undefined)
      .then(go);

    this.time.delayedCall(4000, go); // hard fallback

    title.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: [title, label], alpha: 1, scale: 1, duration: 400, ease: 'Sine.easeOut' });
  }
}
