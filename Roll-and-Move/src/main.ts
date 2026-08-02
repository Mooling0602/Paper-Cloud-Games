import './style.css';
import { i18n } from '../../Core/i18n/LanguageManager';
import en from './i18n/en.json';
import zhCN from './i18n/zh-CN.json';
import { setupErrorReporting, reportDebug } from './debug';
import { createLoading } from './ui/loading';
import { createMenu, type MenuView } from './ui/menu';
import { createOnlineSetup, type OnlineSetupView } from './ui/onlineSetup';
import { createGame, type NetLink } from './ui/game';
import { OnlineSession, type NetRole } from './net/online';
import {
  loadLocalGame,
  hasLocalSave,
  loadOnlineGame,
  hasOnlineSave,
  type SavedGame,
} from './logic/save';

i18n.register({ code: 'en', dict: en });
i18n.register({ code: 'zh-CN', dict: zhCN });
i18n.setLang(i18n.detect());

setupErrorReporting();

const app = document.getElementById('app')!;

// small-screen blocking is temporarily disabled for testing
void boot();

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
        `dpr ${window.devicePixelRatio}`;
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

  // loading → menu
  const loading = createLoading((k) => i18n.t(k));
  app.append(loading.view);
  await loading.ready;
  loading.view.remove();

  let current: { view: HTMLElement; destroy: () => void } | null = null;
  let menuRef: MenuView | null = null;
  let setupRef: OnlineSetupView | null = null;
  let session: OnlineSession | null = null;

  const teardownNet = (): void => {
    session?.close();
    session = null;
  };

  const showMenu = () => {
    current?.destroy();
    teardownNet();
    setupRef = null;
    const menu = createMenu({
      onStart: () => showGame(),
      onResume: hasLocalSave() ? () => showGame(loadLocalGame() ?? undefined) : undefined,
      onResumeOnline: hasOnlineSave()
        ? () => showOnlineSetup(loadOnlineGame() ?? undefined, 'host')
        : undefined,
      onOnlinePlay: () => showOnlineSetup(),
    });
    app.append(menu.view);
    current = { view: menu.view, destroy: menu.destroy };
    menuRef = menu;
  };

  const showOnlineSetup = (initial?: SavedGame, autoRole?: NetRole) => {
    current?.destroy();
    teardownNet();
    menuRef = null;
    const setup = createOnlineSetup({
      onCreateRoom: (server) => startLobby(undefined, 'host', undefined, server),
      onJoinRoom: (server, code) => startLobby(undefined, 'guest', code, server),
      onCancelLobby: () => teardownNet(),
      onBack: () => showMenu(),
    });
    app.append(setup.view);
    current = { view: setup.view, destroy: setup.destroy };
    setupRef = setup;
    if (initial && autoRole) {
      startLobby(initial, autoRole);
    }
  };

  const showGame = (initial?: SavedGame, net?: NetLink) => {
    current?.destroy();
    // online: exit goes back to the menu (tear down the session); restart too
    const exit = () => {
      teardownNet();
      showMenu();
    };
    const game = createGame(net ? exit : () => showGame(), exit, initial, net);
    app.append(game.view);
    current = { view: game.view, destroy: game.destroy };
  };

  const startLobby = (initial: SavedGame | undefined, role: NetRole, code?: string, server?: string) => {
    teardownNet();
    const addr = server ?? 'localhost:8787';
    const url = `ws://${addr}/ws`;
    let msgCb: ((m: unknown) => void) | null = null;
    let discCb: (() => void) | null = null;
    const link: NetLink = {
      isHost: role === 'host',
      send: (m) => session?.send(m),
      onMessage: (cb) => {
        msgCb = cb;
      },
      onDisconnect: (cb) => {
        discCb = cb;
      },
    };
    session = new OnlineSession({
      url,
      role,
      code,
      onCreated: (c) => {
        reportDebug('ui', { ev: 'created-cb', code: c, hasSetup: !!setupRef });
        setupRef?.showLobby(c);
      },
      onOpen: () => showGame(initial, link),
      onMessage: (m) => msgCb?.(m),
      onDisconnect: () => {
        if (discCb) discCb();
        else {
          // lost before the game started — tell the user instead of going silent
          setupRef?.showError(i18n.t('game.onlineConnFailed'));
        }
      },
      onError: (msg) => {
        const friendly =
          msg === 'room not available' ? i18n.t('game.onlineRoomError') : msg;
        setupRef?.showError(i18n.t('game.onlineError', { msg: friendly }));
        reportDebug('online-error', { msg });
      },
    });
  };

  showMenu();
}


