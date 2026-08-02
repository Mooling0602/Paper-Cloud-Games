import './style.css';
import { i18n } from '../../Core/i18n/LanguageManager';
import { isSmallScreen, getViewport } from '../../Core/device/screen';
import { enterFullscreen } from '../../Core/device/fullscreen';
import en from './i18n/en.json';
import zhCN from './i18n/zh-CN.json';
import { setupErrorReporting, reportDebug } from './debug';
import { createLoading } from './ui/loading';
import { createMenu } from './ui/menu';
import { createGame } from './ui/game';

i18n.register({ code: 'en', dict: en });
i18n.register({ code: 'zh-CN', dict: zhCN });
i18n.setLang(i18n.detect());

setupErrorReporting();

const app = document.getElementById('app')!;

if (isSmallScreen()) {
  showBlockedPage();
} else {
  void boot();
}

async function boot(): Promise<void> {
  // debug info overlay (?debug=1)
  const debug = new URLSearchParams(location.search).has('debug');
  const debugEl = document.createElement('pre');
  if (debug) {
    debugEl.className = 'debug-info';
    app.append(debugEl);
    const sync = () => {
      const vv = window.visualViewport;
      debugEl.textContent =
        `win ${window.innerWidth}x${window.innerHeight}\n` +
        `vv ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}@${Math.round(vv.offsetTop)}` : 'n/a'}\n` +
        `safe ${cssSafeAreaTop()} dpr ${window.devicePixelRatio}`;
      reportDebug('layout', {
        win: `${window.innerWidth}x${window.innerHeight}`,
        vv: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}@${Math.round(vv.offsetTop)}` : 'n/a',
        dpr: window.devicePixelRatio,
        fs: !!document.fullscreenElement,
      });
    };
    window.addEventListener('resize', sync);
    window.addEventListener('fullscreenchange', sync);
    sync();
  }

  // loading → menu → game
  const loading = createLoading((k) => i18n.t(k));
  app.append(loading.view);
  await loading.ready;
  loading.view.remove();

  let current: { view: HTMLElement; destroy: () => void } | null = null;

  const showMenu = () => {
    current?.destroy();
    const menu = createMenu();
    menu.onStart = () => {
      // user gesture: enter immersive fullscreen (hides browser chrome)
      void enterFullscreen();
      showGame();
    };
    app.append(menu.view);
    current = { view: menu.view, destroy: menu.destroy };
  };

  const showGame = () => {
    current?.destroy();
    const game = createGame(showGame);
    app.append(game.view);
    current = { view: game.view, destroy: game.destroy };
  };

  showMenu();
}

function cssSafeAreaTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const v = probe.offsetHeight - probe.clientHeight;
  probe.remove();
  return v || 0;
}

function showBlockedPage(): void {
  const vp = getViewport();
  app.innerHTML = `
    <div class="blocked">
      <h1>${i18n.t('blocked.title')}</h1>
      <p>${i18n.t('blocked.msg')}</p>
      <p class="dim">${i18n.t('blocked.dim', { w: vp.width, h: vp.height })}</p>
    </div>`;
}
