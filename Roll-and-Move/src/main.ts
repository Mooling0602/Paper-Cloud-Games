import Phaser from 'phaser';
import { i18n } from '../../Core/i18n/LanguageManager';
import { isSmallScreen, getViewport } from '../../Core/device/screen';
import { PAPER, DPR } from '../../Core/style/paper';
import en from './i18n/en.json';
import zhCN from './i18n/zh-CN.json';
import { LoadingScene } from './scenes/LoadingScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { setupErrorReporting } from './debug';

i18n.register({ code: 'en', dict: en });
i18n.register({ code: 'zh-CN', dict: zhCN });
i18n.setLang(i18n.detect());

setupErrorReporting();

if (isSmallScreen()) {
  showBlockedPage();
} else {
  // Phaser 4 has no devicePixelRatio support: the canvas backing buffer equals
  // the game size, so on hi-dpi screens the browser upscales it and everything
  // blurs. We therefore run the world in PHYSICAL pixels (window × DPR) and
  // display it back at the logical size with scale zoom = 1/DPR — 1:1 pixels.
  const size = { w: Math.round(window.innerWidth * DPR), h: Math.round(window.innerHeight * DPR) };
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: size.w,
    height: size.h,
    backgroundColor: PAPER.baseCss,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / DPR,
      autoCenter: Phaser.Scale.Center.NO_CENTER,
    },
    scene: [LoadingScene, MenuScene, GameScene],
  });

  const syncSize = (): void => {
    const w = Math.round(window.innerWidth * DPR);
    const h = Math.round(window.innerHeight * DPR);
    if (w !== size.w || h !== size.h) {
      size.w = w;
      size.h = h;
      game.scale.resize(w, h);
    }
  };
  window.addEventListener('resize', syncSize);
  window.addEventListener('orientationchange', syncSize);
}

/** Friendly full block page for small screens (phones etc.). */
function showBlockedPage(): void {
  const vp = getViewport();
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="blocked">
      <h1>${i18n.t('blocked.title')}</h1>
      <p>${i18n.t('blocked.msg')}</p>
      <p class="dim">${i18n.t('blocked.dim', { w: vp.width, h: vp.height })}</p>
    </div>`;
}
