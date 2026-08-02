import { el, paperButton } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';

export interface MenuCallbacks {
  onStart: () => void;
  /** Local game save exists. */
  onResume?: () => void;
  /** Online host save exists. */
  onResumeOnline?: () => void;
  onCreateRoom: (server: string) => void;
  onJoinRoom: (server: string, code: string) => void;
  onCancelLobby: () => void;
}

export interface MenuView {
  view: HTMLElement;
  destroy: () => void;
  /** Show the lobby status (room code, or connecting). */
  showLobby: (code: string | null) => void;
  /** Show an error in the lobby area. */
  showError: (msg: string) => void;
  /** Clear the lobby status (error/back). */
  hideLobby: () => void;
}

const SERVER_KEY = 'rm-server-addr';

export function createMenu(cb: MenuCallbacks): MenuView {
  const t = (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars);

  const view = el('div', 'view');
  view.append(el('div', 'paper-bg'));
  const title = el('div', 'menu-title', 'Roll-and-Move');
  const subtitle = el('div', 'menu-subtitle', t('menu.subtitle'));
  subtitle.dataset.i18n = 'menu.subtitle';

  const actions = el('div', 'menu-actions');
  const startBtn = paperButton(t('menu.start'), cb.onStart, 'menu-start');
  startBtn.dataset.i18n = 'menu.start';
  const resumeBtn = paperButton(t('menu.resume'), () => cb.onResume?.(), 'menu-start');
  resumeBtn.dataset.i18n = 'menu.resume';
  if (!cb.onResume) resumeBtn.hidden = true;
  const resumeOnlineBtn = paperButton(t('menu.resumeOnline'), () => cb.onResumeOnline?.(), 'menu-start');
  resumeOnlineBtn.dataset.i18n = 'menu.resumeOnline';
  if (!cb.onResumeOnline) resumeOnlineBtn.hidden = true;
  const langBtn = paperButton(t('menu.lang'), () => {
    i18n.setLang(i18n.current === 'zh-CN' ? 'en' : 'zh-CN');
  });
  langBtn.dataset.i18n = 'menu.lang';
  const createBtn = paperButton(t('menu.create'), () => {
    showLobbyStatus(null);
    cb.onCreateRoom(serverValue());
  }, 'menu-start');
  createBtn.dataset.i18n = 'menu.create';
  actions.append(startBtn, resumeBtn, resumeOnlineBtn, createBtn, langBtn);

  // ---------- online section ----------
  const online = el('div', 'online');
  const onlineTitle = el('div', 'online-title', t('menu.online'));
  onlineTitle.dataset.i18n = 'menu.online';

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

  const codeInput = el('input', 'paper-input code');
  codeInput.type = 'text';
  codeInput.placeholder = '1234';
  codeInput.maxLength = 4;
  codeInput.inputMode = 'numeric';
  const joinBtn = paperButton(t('menu.join'), () => {
    showLobbyStatus(null);
    cb.onJoinRoom(serverValue(), codeInput.value.trim());
  }, 'small');
  joinBtn.dataset.i18n = 'menu.join';
  const joinRow = el('div', 'row');
  joinRow.append(codeInput, joinBtn);

  const lobby = el('div', 'lobby hidden');
  const lobbyText = el('div', 'lobby-text');
  const cancelBtn = paperButton(t('menu.cancel'), () => cb.onCancelLobby(), 'small');
  cancelBtn.dataset.i18n = 'menu.cancel';
  lobby.append(lobbyText, cancelBtn);

  online.append(onlineTitle, serverRow, joinRow, lobby);
  view.append(title, subtitle, actions, online);

  const credit = el('div', 'menu-credit', t('menu.credit'));
  credit.dataset.i18n = 'menu.credit';
  view.append(credit);

  function serverValue(): string {
    const v = serverInput.value.trim();
    try {
      localStorage.setItem(SERVER_KEY, v);
    } catch {
      /* ignore */
    }
    return v || 'localhost:8787';
  }

  const menu: MenuView = {
    view,
    destroy: () => unsub(),
    showLobby: (code: string | null) => showLobbyStatus(code),
    showError: (msg: string) => {
      lobby.classList.remove('hidden');
      lobbyText.textContent = msg;
    },
    hideLobby: () => lobby.classList.add('hidden'),
  };

  function showLobbyStatus(code: string | null): void {
    lobby.classList.remove('hidden');
    lobbyText.textContent =
      code !== null ? t('game.onlineWaiting', { code }) : t('game.onlineConnecting');
  }

  const refresh = () => {
    view.querySelectorAll<HTMLElement>('[data-i18n]').forEach((n) => {
      const key = n.dataset.i18n;
      if (key) n.textContent = t(key);
    });
  };
  const unsub = i18n.onChanged(refresh);

  return menu;
}
