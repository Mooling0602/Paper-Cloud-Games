import { el, paperButton, resolveVars } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { ZoomController } from '../../../Core/zoom/ZoomController';
import { toggleFullscreen } from '../../../Core/device/fullscreen';
import { cellPos, nextPos, LAST_CELL, GRID } from '../logic/board';
import { TurnManager, type TurnState } from '../logic/turn';
import { saveLocalGame, clearLocalGame, saveOnlineGame, type SavedGame } from '../logic/save';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export interface GameView {
  view: HTMLElement;
  destroy: () => void;
}

/** Online session bridge used by the game view. */
export interface NetLink {
  isHost: boolean;
  send(msg: unknown): void;
  onMessage(cb: (msg: unknown) => void): void;
  onDisconnect(cb: () => void): void;
}

export function createGame(
  onRestart: () => void,
  onBackToMenu: () => void,
  initial?: SavedGame,
  net?: NetLink,
): GameView {
  const t = (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars);
  const turn = new TurnManager();
  if (initial) {
    turn.players[0].pos = initial.positions[0];
    turn.players[1].pos = initial.positions[1];
    turn.current = initial.current;
  }
  const zoom = new ZoomController();
  let rolling = false;

  // ---------- skeleton ----------
  const view = el('div', 'game-shell');
  const gameView = el('div', 'game-view');
  view.append(el('div', 'paper-bg'), gameView);

  const topbar = el('header', 'topbar');
  const leftGroup = el('div', 'left');
  const leftBtns = el('div', 'btns');
  const restartBtn = paperButton(t('game.restart'), () => {
    clearLocalGame();
    onRestart();
  });
  if (net) restartBtn.hidden = true; // online: no rematch in v1
  const backBtn = paperButton(t('game.backMenu'), () => {
    saveNow();
    onBackToMenu();
  });
  leftBtns.append(restartBtn, backBtn);
  leftGroup.append(leftBtns);
  const banner = el('div', 'banner');
  const centerGroup = el('div', 'center');
  const right = el('div', 'right');
  const rightBtns = el('div', 'btns');
  const fsBtn = paperButton(t('game.fullscreen'), () => toggleFullscreen(), 'small');
  const refreshFsLabel = (): void => {
    fsBtn.textContent = document.fullscreenElement ? t('game.exitFullscreen') : t('game.fullscreen');
  };
  document.addEventListener('fullscreenchange', refreshFsLabel);
  const zoomOutBtn = paperButton('−', () => zoom.zoomOut(), 'small');
  const zoomInBtn = paperButton('+', () => zoom.zoomIn(), 'small');
  const pctBtn = paperButton('100%', () => zoom.reset(), 'small');
  rightBtns.append(fsBtn, zoomOutBtn, zoomInBtn, pctBtn);
  right.append(rightBtns, banner);
  topbar.append(leftGroup, centerGroup, right);

  // ---------- board ----------
  const board = el('div', 'board');
  const cells: HTMLElement[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const { row, col } = cellPos(i);
    const cell = el('div', 'cell');
    // explicit snake placement: grid auto-placement would lay cells out in
    // plain raster order, breaking the boustrophedon path
    cell.style.gridRow = String(row + 1);
    cell.style.gridColumn = String(col + 1);
    cell.append(el('span', 'num', String(i + 1)));
    if (i === 0) cell.append(el('span', 'badge start', t('game.start')));
    if (i === LAST_CELL) cell.append(el('span', 'badge finish', t('game.finish')));
    const next = nextPos(row, col);
    if (next) {
      const dir = next.col > col ? '→' : next.col < col ? '←' : '↓';
      cell.append(el('span', 'arrow', dir));
    }
    board.append(cell);
    cells.push(cell);
  }
  // tokens live INSIDE cells; left/top are % of the cell (exact regardless of grid math)
  const tokens = turn.players.map((p, i) => {
    const tk = el('div', `token p${i}`);
    tk.style.background = p.soft;
    tk.style.borderColor = p.color;
    cells[0].append(tk);
    return tk;
  });
  // constant pixel size derived from the board (independent of cell/state)
  const applyTokenSize = (): void => {
    const px = Math.round(board.clientWidth * 0.085);
    tokens.forEach((tk) => {
      tk.style.width = `${px}px`;
      tk.style.height = `${px}px`;
    });
  };
  // the view may not be in the DOM yet, so re-apply whenever the board size settles
  const tokenSizeObserver = new ResizeObserver(() => applyTokenSize());
  tokenSizeObserver.observe(board);
  const setTokenPos = (pi: number, cell: number, fx = 0.5, fy = 0.5): void => {
    const tk = tokens[pi];
    cells[cell].append(tk);
    tk.style.left = `${fx * 100}%`;
    tk.style.top = `${fy * 100}%`;
  };
  // single token → cell center; both on the same cell → anti-diagonal
  // (red NE, blue SW) so the start badge (NW) and cell number stay visible
  const updateTokens = (): void => {
    const [a, b] = turn.players;
    const same = a.pos === b.pos;
    setTokenPos(0, a.pos, same ? 0.73 : 0.5, same ? 0.27 : 0.5);
    setTokenPos(1, b.pos, same ? 0.27 : 0.5, same ? 0.73 : 0.5);
  };

  const boardArea = el('main', 'board-area');
  boardArea.append(board);

  // ---------- save / network state ----------
  const snapshot = (): SavedGame => ({
    positions: [turn.players[0].pos, turn.players[1].pos],
    current: turn.current,
  });
  const saveNow = (): void => {
    if (net) {
      if (net.isHost) saveOnlineGame(snapshot());
    } else {
      saveLocalGame(snapshot());
    }
  };

  // ---------- dice ----------
  const dice = el('div', 'dice');
  const pips = Array.from({ length: 9 }, () => {
    const pip = el('div', 'pip');
    dice.append(pip);
    return pip;
  });
  const setFace = (n: number): void => {
    pips.forEach((pip, idx) => pip.classList.toggle('on', PIPS[n].includes(idx)));
  };
  setFace(1);

  // deterministic square size in px (aspect-ratio proved unreliable after animations)
  const applyDiceSize = (): void => {
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const w = Math.round(Math.min(64, Math.max(50, vmin * 0.085)));
    dice.style.width = `${w}px`;
    dice.style.height = `${w}px`;
  };
  applyDiceSize();
  window.addEventListener('resize', applyDiceSize);

  // roll button (left of dice) + confirm button (right of dice), top center
  const rollBtn = paperButton('', () => {
    if (isLocalTurn()) roll();
  });
  const confirmBtn = paperButton('', () => {
    if (turn.state !== 'deciding') return;
    if (net && !net.isHost) {
      net.send({ t: 'confirm' });
      return;
    }
    if (net?.isHost && turn.current !== 0) return;
    turn.confirmMove();
    refresh();
    startMove();
  });
  centerGroup.append(rollBtn, dice, confirmBtn);

  // ---------- bottom bar ----------
  const bottombar = el('footer', 'bottombar');
  const panels = turn.players.map((p, i) => {
    const panel = el('div', `panel${i === 1 ? ' right' : ''}`);
    const name = el('div', 'name');
    name.style.color = p.color;
    const info = el('div', 'cell-info');
    panel.append(name, info);
    return { panel, name, info };
  });
  const centerStack = el('div', 'center-stack');
  const hint = el('div', 'hint');
  const result = el('div', 'result');
  centerStack.append(hint, result);
  bottombar.append(panels[0].panel, centerStack, panels[1].panel);

  // ---------- win overlay ----------
  const overlay = el('div', 'overlay hidden');
  const winTitle = el('div', 'win-title');
  // online: the win button starts a rematch over the same connection
  const resetGame = (): void => {
    turn.reset();
    setFace(1);
    overlay.classList.add('hidden');
    updateTokens();
    refresh();
  };
  let againAction = net ? () => {
    net.send({ t: 'restart' });
    resetGame();
  } : onRestart;
  const againBtn = paperButton(t('game.restart'), () => againAction());
  overlay.append(winTitle, againBtn);

  gameView.append(topbar, boardArea, bottombar, overlay);

  // ---------- flow ----------
  const setDiceEnabled = (on: boolean): void => {
    dice.classList.toggle('disabled', !on);
  };

  const refresh = (): void => {
    const p = turn.player;
    banner.textContent = t('game.turn', { player: t(p.nameKey) });
    banner.style.color = p.color;
    // player 0 (red) → banner under restart (left); player 1 (blue) → under zoom controls (right)
    banner.classList.toggle('right-side', turn.current === 1);
    if (turn.current === 0) leftGroup.append(banner);
    else right.append(banner);
    hint.textContent = turn.state === 'deciding' ? t('game.rerollsLeft', { n: turn.rollsLeft }) : t('game.roll');
    result.textContent = turn.lastRoll > 0 ? t('game.result', { n: turn.lastRoll }) : '';
    const idle = turn.state === 'idle';
    const deciding = turn.state === 'deciding';
    // online: only the player whose turn it is may operate
    const localTurn = isLocalTurn();
    rollBtn.hidden = !(localTurn && (idle || deciding));
    confirmBtn.hidden = !(localTurn && deciding);
    rollBtn.textContent = idle ? t('game.rollBtn') : deciding ? t('game.reroll', { n: turn.rollsLeft }) : '';
    confirmBtn.textContent = t('game.confirm');
    setDiceEnabled(localTurn && (idle || deciding));
    if (net?.isHost) {
      net.send({
        t: 'state',
        pos: [turn.players[0].pos, turn.players[1].pos],
        cur: turn.current,
        rolls: turn.rollsLeft,
        last: turn.lastRoll,
        state: turn.state,
      });
    }
    tokens.forEach((tk, i) => tk.classList.toggle('current', i === turn.current));
    panels.forEach((panel, i) => {
      const pl = turn.players[i];
      panel.name.textContent = t(pl.nameKey);
      panel.info.textContent = pl.pos >= LAST_CELL ? t('game.finish') : t('game.cell', { n: pl.pos + 1 });
    });
  // refresh tokens after every state change (also applies diagonal placement)
  updateTokens();
};

  // online: only the player whose turn it is may act locally
  const isLocalTurn = (): boolean =>
    !net || (net.isHost ? turn.current === 0 : turn.current === 1);

  const roll = (): void => {
    if (rolling) return;
    if (net && !net.isHost) {
      // guest: ask the host (authoritative)
      net.send({ t: 'roll' });
      return;
    }
    if (!turn.canRoll()) {
      // reroll path: only valid while deciding
      if (turn.state !== 'deciding') return;
      turn.reroll();
    }
    rolling = true;
    setDiceEnabled(false);
    rollBtn.hidden = true;
    confirmBtn.hidden = true;
    dice.classList.add('rolling');
  };

  dice.addEventListener('click', () => {
    if (isLocalTurn()) roll();
  });

  dice.addEventListener('animationend', () => {
    if (!rolling) return;
    rolling = false;
    dice.classList.remove('rolling');
    dice.style.transform = '';
    const n = 1 + Math.floor(Math.random() * 6);
    setFace(n);
    turn.onRolled(n);
    if (net && net.isHost) net.send({ t: 'rolled', face: n });
    refresh();
    if (turn.state === 'moving') setTimeout(startMove, 700);
  });

  const startMove = (): void => {
    setDiceEnabled(false);
    rollBtn.hidden = true;
    confirmBtn.hidden = true;
    const steps = turn.lastRoll;
    const start = turn.player.pos;
    const pi = turn.current;
    for (let k = 1; k <= steps; k++) {
      setTimeout(() => setTokenPos(pi, start + k), k * 210);
    }
    setTimeout(finishMove, (steps + 1) * 210 + 50);
  };

  const finishMove = (): void => {
    const won = turn.finishMove();
    if (won) {
      clearLocalGame();
      const p = turn.player;
      winTitle.textContent = t('game.win', { player: t(p.nameKey) });
      winTitle.style.color = p.color;
      overlay.classList.remove('hidden');
      if (net) net.send({ t: 'win', winner: turn.current });
    } else {
      saveNow();
    }
    refresh();
  };

  const onSpace = (e: KeyboardEvent): void => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (!isLocalTurn()) return;
    if (turn.canRoll()) roll();
    else if (turn.state === 'deciding') {
      if (net && !net.isHost) {
        net.send({ t: 'confirm' });
        return;
      }
      turn.confirmMove();
      refresh();
      startMove();
    }
  };
  window.addEventListener('keydown', onSpace);

  // ---------- zoom ----------
  const unsubZoom = zoom.onChanged((v) => {
    gameView.style.transform = `scale(${v})`;
    pctBtn.textContent = `${Math.round(v * 100)}%`;
  });

  // ---------- i18n ----------
  const unsubI18n = i18n.onChanged(() => {
    resolveVars(t, gameView);
    refresh();
  });

  // ---------- network wiring ----------
  let msgCb: ((msg: unknown) => void) | null = null;
  let discCb: (() => void) | null = null;
  if (net) {
    net.onMessage((m) => msgCb?.(m));
    net.onDisconnect(() => discCb?.());
    const handleMsg = (raw: unknown): void => {
      const msg = raw as {
        t?: string;
        pos?: [number, number];
        cur?: number;
        rolls?: number;
        last?: number;
        state?: TurnState;
        face?: number;
        winner?: number;
      };
      if (msg.t === 'rolled' && !net.isHost) {
        // visual-only: animate, then show the host's face
        dice.classList.add('rolling');
        const end = (): void => {
          dice.classList.remove('rolling');
          if (msg.face) setFace(msg.face);
          dice.removeEventListener('animationend', end);
        };
        dice.addEventListener('animationend', end);
      } else if (msg.t === 'state' && !net.isHost && msg.pos) {
        const pos = msg.pos;
        const prev = [turn.players[0].pos, turn.players[1].pos] as const;
        turn.players[0].pos = pos[0];
        turn.players[1].pos = pos[1];
        turn.current = msg.cur!;
        turn.rollsLeft = msg.rolls!;
        turn.lastRoll = msg.last!;
        turn.state = msg.state!;
        refresh();
        // replay the opponent's move step by step (no teleporting)
        const moved = prev[0] !== pos[0] ? 0 : prev[1] !== pos[1] ? 1 : -1;
        const steps = moved === 0 || moved === 1 ? pos[moved] - prev[moved] : 0;
        if ((moved === 0 || moved === 1) && steps > 0 && (msg.state === 'idle' || msg.state === 'finished')) {
          setTokenPos(moved, prev[moved]); // snap back in the same frame — invisible
          for (let k = 1; k <= steps; k++) {
            setTimeout(() => setTokenPos(moved, prev[moved] + k), k * 210);
          }
        }
      } else if (msg.t === 'win' && !net.isHost) {
        const winner = turn.players[msg.winner!];
        winTitle.textContent = t('game.win', { player: t(winner.nameKey) });
        winTitle.style.color = winner.color;
        overlay.classList.remove('hidden');
      } else if (msg.t === 'restart' && !net.isHost) {
        resetGame();
      } else if (msg.t === 'roll' && net.isHost) {
        // guest's turn only; host is authoritative
        if (turn.current !== 1) return;
        if (turn.canRoll()) roll();
        else if (turn.state === 'deciding') {
          turn.reroll();
          refresh();
          roll();
        }
      } else if (msg.t === 'confirm' && net.isHost) {
        if (turn.current !== 1 || turn.state !== 'deciding') return;
        turn.confirmMove();
        refresh();
        startMove();
      }
    };
    msgCb = handleMsg;
    discCb = () => {
      if (net.isHost) saveOnlineGame(snapshot());
      winTitle.textContent =
        t('game.onlineDisconnected') + (net.isHost ? ' ' + t('game.onlineSaved') : '');
      winTitle.style.color = '#3b372e';
      againAction = onBackToMenu;
      againBtn.textContent = t('game.backMenu');
      overlay.classList.remove('hidden');
    };
  }

  // start
  turn.beginTurn();
  updateTokens();
  refresh();

  return {
    view,
    destroy: () => {
      unsubZoom();
      unsubI18n();
      tokenSizeObserver.disconnect();
      window.removeEventListener('resize', applyDiceSize);
      document.removeEventListener('fullscreenchange', refreshFsLabel);
      window.removeEventListener('keydown', onSpace);
      view.remove();
    },
  };
}
