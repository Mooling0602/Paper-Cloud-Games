import Phaser from 'phaser';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { PAPER, FONTS, TEXT_RES } from '../../../Core/style/paper';
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
    frame.lineStyle(2, PAPER.ink, 0.5);
    jitterRect(frame, 60, 60, width - 120, height - 120, 24, 2.5);

    const title = this.add
      .text(width / 2, 250, 'Roll-and-Move', {
        fontFamily: FONTS.heading,
        fontSize: '76px',
        color: PAPER.inkCss,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setAngle(-2);
    title.setShadow(3, 4, 'rgba(59,55,46,0.18)', 0, true, true);

    const subtitle = this.add
      .text(width / 2, 330, i18n.t('menu.subtitle'), {
        fontFamily: FONTS.family,
        fontSize: '30px',
        color: PAPER.inkSoftCss,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);

    const startBtn = paperButton(this, {
      x: width / 2,
      y: 470,
      width: 250,
      height: 66,
      label: i18n.t('menu.start'),
      fontSize: 30,
      onClick: () => {
        // user gesture: hide the browser chrome on tablets (URL bar)
        void enterFullscreen();
        this.scene.start('Game');
      },
    });

    const langBtn = paperButton(this, {
      x: width / 2,
      y: 575,
      width: 150,
      height: 48,
      label: i18n.t('menu.lang'),
      fontSize: 22,
      onClick: () => {
        i18n.setLang(i18n.current === 'zh-CN' ? 'en' : 'zh-CN');
      },
    });

    const credit = this.add
      .text(width / 2, height - 70, i18n.t('menu.credit'), {
        fontFamily: FONTS.family,
        fontSize: '17px',
        color: PAPER.inkSoftCss,
        resolution: TEXT_RES,
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
