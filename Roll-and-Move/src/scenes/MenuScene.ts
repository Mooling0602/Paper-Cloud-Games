import Phaser from 'phaser';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { PAPER, FONTS, DPR } from '../../../Core/style/paper';
import { makePaperTexture, seedRng, jitterRect } from '../style/draw';
import { paperButton } from '../ui/paperButton';
import { enterFullscreen } from '../../../Core/device/fullscreen';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale.gameSize;
    const unsubs: Array<() => void> = [];

    const bg = this.add.graphics().fillStyle(PAPER.base, 1).fillRect(0, 0, width, height);
    const noise = makePaperTexture(this);
    this.add.tileSprite(width / 2, height / 2, width, height, noise.key).setAlpha(0.5);

    // decorative hand-drawn frame
    const frame = this.add.graphics();
    seedRng(7);
    frame.lineStyle(2 * DPR, PAPER.ink, 0.5);
    jitterRect(frame, 60 * DPR, 60 * DPR, width - 120 * DPR, height - 120 * DPR, 24 * DPR, 2.5 * DPR);

    const title = this.add
      .text(width / 2, 250 * DPR, 'Roll-and-Move', {
        fontFamily: FONTS.heading,
        fontSize: 76 * DPR,
        color: PAPER.inkCss,
      })
      .setOrigin(0.5)
      .setAngle(-2);
    title.setShadow(3 * DPR, 4 * DPR, 'rgba(59,55,46,0.18)', 0, true, true);

    const subtitle = this.add
      .text(width / 2, 330 * DPR, i18n.t('menu.subtitle'), {
        fontFamily: FONTS.family,
        fontSize: 30 * DPR,
        color: PAPER.inkSoftCss,
      })
      .setOrigin(0.5);

    const startBtn = paperButton(this, {
      x: width / 2,
      y: 470 * DPR,
      width: 250 * DPR,
      height: 66 * DPR,
      label: i18n.t('menu.start'),
      fontSize: 30 * DPR,
      onClick: () => {
        // user gesture: hide the browser chrome on tablets (URL bar)
        void enterFullscreen();
        this.scene.start('Game');
      },
    });

    const langBtn = paperButton(this, {
      x: width / 2,
      y: 575 * DPR,
      width: 150 * DPR,
      height: 48 * DPR,
      label: i18n.t('menu.lang'),
      fontSize: 22 * DPR,
      onClick: () => {
        i18n.setLang(i18n.current === 'zh-CN' ? 'en' : 'zh-CN');
      },
    });

    const credit = this.add
      .text(width / 2, height - 70 * DPR, i18n.t('menu.credit'), {
        fontFamily: FONTS.family,
        fontSize: 17 * DPR,
        color: PAPER.inkSoftCss,
      })
      .setOrigin(0.5);

    const refresh = () => {
      subtitle.setText(i18n.t('menu.subtitle'));
      startBtn.setLabel(i18n.t('menu.start'));
      langBtn.setLabel(i18n.t('menu.lang'));
      credit.setText(i18n.t('menu.credit'));
    };
    unsubs.push(i18n.onChanged(refresh));

    // menu has no state to keep; re-layout by restarting on resize
    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    unsubs.push(() => this.scale.off('resize', onResize));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubs.forEach((u) => u());
      bg.destroy();
    });
  }
}
