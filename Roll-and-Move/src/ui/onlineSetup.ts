import { el, paperButton } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { reportDebug } from '../debug';

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
  // default: the signaling server runs on the device that serves this page
  const defaultServer = `${location.hostname}:8787`;
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

  // ---------- full-screen room code entry ----------
  const joinBtn = paperButton(t('menu.join'), () => openCodeOverlay(), 'menu-start');
  joinBtn.dataset.i18n = 'menu.join';
  const joinRow = el('div', 'row');
  joinRow.append(joinBtn);

  const codeOverlay = el('div', 'overlay hidden');
  const codeTitle = el('div', 'code-title', t('menu.code'));
  codeTitle.dataset.i18n = 'menu.code';
  const codeDigits = el('span', 'code-digits');
  const codeCursor = el('span', 'code-cursor', '_');
  const codeDisplay = el('div', 'code-display');
  codeDisplay.append(codeDigits, codeCursor);
  // hidden input that summons the soft keyboard; digits are shown by codeDisplay
  const hiddenInput = el('input', 'code-hidden-input');
  hiddenInput.type = 'tel';
  hiddenInput.inputMode = 'numeric';
  hiddenInput.maxLength = 4;
  const codeError = el('div', 'inline-error');
  codeError.hidden = true;
  const overlayBtns = el('div', 'row');
  const overlayJoinBtn = paperButton(t('menu.join'), () => submitCode());
  overlayJoinBtn.dataset.i18n = 'menu.join';
  const overlayCancelBtn = paperButton(t('menu.cancel'), () => closeCodeOverlay());
  overlayCancelBtn.dataset.i18n = 'menu.cancel';
  overlayBtns.append(overlayJoinBtn, overlayCancelBtn);
  codeOverlay.append(codeTitle, codeDisplay, hiddenInput, codeError, overlayBtns);

  // ---------- lobby overlay ----------
  const lobby = el('div', 'overlay hidden');
  const lobbyCode = el('div', 'lobby-code', '—');
  const lobbyText = el('div', 'lobby-text');
  const copyBtn = paperButton(t('menu.copy'), () => copyCode());
  copyBtn.dataset.i18n = 'menu.copy';
  const cancelBtn = paperButton(t('menu.cancel'), () => {
    lobby.classList.add('hidden');
    cb.onCancelLobby();
  });
  cancelBtn.dataset.i18n = 'menu.cancel';
  lobby.append(lobbyCode, lobbyText, copyBtn, cancelBtn);

  online.append(serverRow, createRow, joinRow);
  view.append(topBar, title, online, codeOverlay, lobby);

  function serverValue(): string {
    const v = serverInput.value.trim();
    try {
      localStorage.setItem(SERVER_KEY, v);
    } catch {
      /* ignore */
    }
    return v || defaultServer;
  }

  // ---------- code entry overlay ----------
  function openCodeOverlay(): void {
    hiddenInput.value = '';
    codeDigits.textContent = '';
    codeError.hidden = true;
    codeOverlay.classList.remove('hidden');
    hiddenInput.focus();
  }

  function closeCodeOverlay(): void {
    codeOverlay.classList.add('hidden');
    hiddenInput.blur();
  }

  hiddenInput.addEventListener('input', () => {
    hiddenInput.value = hiddenInput.value.replace(/\D/g, '').slice(0, 4);
    codeDigits.textContent = hiddenInput.value;
    codeError.hidden = true;
  });
  hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitCode();
    if (e.key === 'Escape') closeCodeOverlay();
  });

  function submitCode(): void {
    const code = hiddenInput.value.trim();
    if (!code) {
      codeError.textContent = t('game.onlineCodeEmpty');
      codeError.hidden = false;
      return;
    }
    closeCodeOverlay();
    showLobbyStatus(null);
    cb.onJoinRoom(serverValue(), code);
  }

  // ---------- lobby overlay ----------
  function showLobbyStatus(code: string | null): void {
    lobby.classList.remove('hidden');
    lobbyCode.textContent = code ?? '—';
    copyBtn.hidden = code === null;
    lobbyText.textContent = code !== null ? t('game.onlineWaiting', { code }) : t('game.onlineConnecting');
    reportDebug('ui', { ev: 'lobby', code });
  }

  function copyCode(): void {
    const code = lobbyCode.textContent ?? '';
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        lobbyText.textContent = t('game.onlineCopied');
      })
      .catch(() => {
        lobbyText.textContent = t('game.onlineCopyFail');
      });
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
