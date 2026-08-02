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
/** visual viewport when available (mobile URL bars), window size otherwise */
function currentViewport(): { width: number; height: number } {
  return vv ? { width: vv.width, height: vv.height } : { width: window.innerWidth, height: window.innerHeight };
}

if (isSmallScreen(currentViewport())) {
  showBlockedPage();
} else {
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

  // Keep the canvas exactly on the visible area: on Android/iOS the URL bar
  // overlays the layout viewport, so window.innerHeight is too tall and the
  // top of the game would be hidden. visualViewport tracks the real visible
  // region (bar expanded/collapsed, browser zoom, etc.).
  const app = document.getElementById('app');
  if (vv && app) {
    const syncViewport = (): void => {
      app.style.position = 'fixed';
      app.style.top = `${vv.offsetTop}px`;
      app.style.left = `${vv.offsetLeft}px`;
      app.style.width = `${vv.width}px`;
      app.style.height = `${vv.height}px`;
      game.scale.resize(vv.width, vv.height);
    };
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
    // Phaser boots asynchronously and resets the canvas size on boot, so the
    // first sync must run after the game is ready, not before.
    game.events.once('ready', syncViewport);
  }
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
