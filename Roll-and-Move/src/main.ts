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
  new Phaser.Game({
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
