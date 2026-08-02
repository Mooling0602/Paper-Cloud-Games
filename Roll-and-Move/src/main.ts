import Phaser from 'phaser';
import { i18n } from '../../Core/i18n/LanguageManager';
import { isSmallScreen, getViewport } from '../../Core/device/screen';
import { PAPER } from '../../Core/style/paper';
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

const vv = window.visualViewport;

if (isSmallScreen()) {
  showBlockedPage();
} else {
  // RESIZE mode: Phaser tracks window.innerWidth/innerHeight itself, which on
  // Android already excludes the URL bar (the bar overlays, it is not part of
  // the layout viewport). No visualViewport sync needed — fighting Phaser's
  // own resize handling caused the canvas to be vertically centered inside a
  // taller parent, leaving a blank strip at the top.
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: 1280,
    height: 800,
    backgroundColor: PAPER.baseCss,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [LoadingScene, MenuScene, GameScene],
  });

  // Phaser 4 renders at CSS resolution by default; on high-DPI screens the
  // browser upscales the canvas and everything looks blurry. Re-size the
  // backing buffer to the physical resolution (game coordinates unchanged).
  const applyHiDPI = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const { width, height } = game.scale.gameSize;
    game.canvas.width = Math.round(width * dpr);
    game.canvas.height = Math.round(height * dpr);
    (game.renderer as { resize: (w: number, h: number) => void }).resize(game.canvas.width, game.canvas.height);
  };
  game.events.once('ready', applyHiDPI);
  game.scale.on('resize', applyHiDPI);
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
