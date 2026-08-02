import { el, paperButton } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';

export interface OnlineSetupCallbacks {
  onCreateRoom: (server: string) => void;
  onJoinRoom: (server: string, code: string) => void;
  onCancelLobby: () => void;
  onBack: () => void;
}

export interface OnlineSetupView {
  view: HTMLElement;
  destroy: () => void;
  /** Lobby status: room code (host) or connecting (null). */
  showLobby: (code: string | null) => void;
  /** Show an error in the lobby area. */
  showError: (msg: string) => void;
  hideLobby: () => void;
}

const SERVER_KEY = 'rm-server-addr';

export function createOnlineSetup(cb: OnlineSetupCallbacks): OnlineSetupView {
  const t = (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars);

  const view = el('div', 'view');
  view.append(el('div', 'paper-bg'));

  const backBtn = paperButton(t('game.backMenu'), cb.onBack, 'small');
  backBtn.dataset.i18n = 'game.backMenu';
  const topBar = el('div', 'setup-top');
  topBar.append(backBtn);

  const title = el('div', 'online-title', t('menu.online'));
  title.dataset.i18n = 'menu.online';

  const online = el('div', 'online');

  const serverInput = el('input', 'paper-input');
  serverInput.type = 'text';
  serverInput.placeholder = 'localhost:8787';
  try {
    serverInput.value = localStorage.getItem(SERVER_KEY) ?? '';
  } catch {
    /* ignore */
  }
  const serverRow = el('div', 'row');
  const serverLabel = el('label', 'label', t('menu.server'));
  serverLabel.dataset.i18n = 'menu.server';
  serverRow.append(serverLabel, serverInput);

  const createBtn = paperButton(t('menu.create'), () => {
    showLobbyStatus(null);
    cb.onCreateRoom(serverValue());
  }, 'menu-start');
  createBtn.dataset.i18n = 'menu.create';
  const createRow = el('div', 'row');
  createRow.append(createBtn);

  const codeInput = el('input', 'paper-input code');
  codeInput.type = 'text';
  codeInput.placeholder = '1234';
  codeInput.maxLength = 4;
  codeInput.inputMode = 'numeric';
  const joinBtn = paperButton(t('menu.join'), () => {
    const code = codeInput.value.trim();
    if (!code) {
      lobby.classList.remove('hidden');
      lobbyText.textContent = t('game.onlineCodeEmpty');
      return;
    }
    showLobbyStatus(null);
    cb.onJoinRoom(serverValue(), code);
  }, 'menu-start');
  joinBtn.dataset.i18n = 'menu.join';
  const codeRow = el('div', 'row');
  codeRow.append(codeInput);
  const joinRow = el('div', 'row');
  joinRow.append(joinBtn);

  const lobby = el('div', 'lobby hidden');
  const lobbyText = el('div', 'lobby-text');
  const cancelBtn = paperButton(t('menu.cancel'), () => cb.onCancelLobby(), 'small');
  cancelBtn.dataset.i18n = 'menu.cancel';
  lobby.append(lobbyText, cancelBtn);

  online.append(serverRow, createRow, codeRow, joinRow, lobby);
  view.append(topBar, title, online);

  function serverValue(): string {
    const v = serverInput.value.trim();
    try {
      localStorage.setItem(SERVER_KEY, v);
    } catch {
      /* ignore */
    }
    return v || 'localhost:8787';
  }

  function showLobbyStatus(code: string | null): void {
    lobby.classList.remove('hidden');
    lobbyText.textContent =
      code !== null ? t('game.onlineWaiting', { code }) : t('game.onlineConnecting');
  }

  const setup: OnlineSetupView = {
    view,
    destroy: () => unsub(),
    showLobby: (code) => showLobbyStatus(code),
    showError: (msg) => {
      lobby.classList.remove('hidden');
      lobbyText.textContent = msg;
    },
    hideLobby: () => lobby.classList.add('hidden'),
  };

  const refresh = () => {
    view.querySelectorAll<HTMLElement>('[data-i18n]').forEach((n) => {
      const key = n.dataset.i18n;
      if (key) n.textContent = t(key);
    });
  };
  const unsub = i18n.onChanged(refresh);

  return setup;
}
