import { el, paperButton, resolveVars } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { ZoomController } from '../../../Core/zoom/ZoomController';
import { toggleFullscreen } from '../../../Core/device/fullscreen';
import { cellPos, nextPos, LAST_CELL, GRID } from '../logic/board';
import { TurnManager } from '../logic/turn';

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

export function createGame(onRestart: () => void): GameView {
  const t = (key: string, vars?: Record<string, string | number>) => i18n.t(key, vars);
  const turn = new TurnManager();
  const zoom = new ZoomController();
  let rolling = false;

  // ---------- skeleton ----------
  const view = el('div', 'game-shell');
  const gameView = el('div', 'game-view');
  view.append(el('div', 'paper-bg'), gameView);

  const topbar = el('header', 'topbar');
  const leftGroup = el('div', 'left');
  const restartBtn = paperButton(t('game.restart'), onRestart);
  const banner = el('div', 'banner');
  leftGroup.append(restartBtn, banner);
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
  topbar.append(leftGroup, right);

  // ---------- board ----------
  const board = el('div', 'board');
  const cells: HTMLElement[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const { row, col } = cellPos(i);
    const cell = el('div', 'cell');
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
    const px = Math.round(board.clientWidth * 0.095);
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
  const decide = el('div', 'decide');
  decide.hidden = true;
  const rollBtn = paperButton('', () => roll());
  const confirmBtn = paperButton('', () => {
    if (turn.state !== 'deciding') return;
    turn.confirmMove();
    refresh();
    startMove();
  });
  decide.append(rollBtn, confirmBtn);
  const result = el('div', 'result');
  centerStack.append(hint, dice, decide, result);
  bottombar.append(panels[0].panel, centerStack, panels[1].panel);

  // ---------- win overlay ----------
  const overlay = el('div', 'overlay hidden');
  const winTitle = el('div', 'win-title');
  const againBtn = paperButton(t('game.restart'), onRestart);
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
    decide.hidden = !(idle || deciding);
    rollBtn.textContent = idle ? t('game.rollBtn') : deciding ? t('game.reroll', { n: turn.rollsLeft }) : '';
    confirmBtn.textContent = t('game.confirm');
    setDiceEnabled(idle || deciding);
    tokens.forEach((tk, i) => tk.classList.toggle('current', i === turn.current));
    panels.forEach((panel, i) => {
      const pl = turn.players[i];
      panel.name.textContent = t(pl.nameKey);
      panel.info.textContent = pl.pos >= LAST_CELL ? t('game.finish') : t('game.cell', { n: pl.pos + 1 });
    });
  // refresh tokens after every state change (also applies diagonal placement)
  updateTokens();
};

  const roll = (): void => {
    if (rolling) return;
    if (!turn.canRoll()) {
      // reroll path: only valid while deciding
      if (turn.state !== 'deciding') return;
      turn.reroll();
    }
    rolling = true;
    setDiceEnabled(false);
    decide.hidden = true;
    dice.classList.add('rolling');
  };

  dice.addEventListener('click', roll);

  dice.addEventListener('animationend', () => {
    if (!rolling) return;
    rolling = false;
    dice.classList.remove('rolling');
    const n = 1 + Math.floor(Math.random() * 6);
    setFace(n);
    turn.onRolled(n);
    refresh();
    if (turn.state === 'moving') setTimeout(startMove, 700);
  });

  const startMove = (): void => {
    setDiceEnabled(false);
    decide.hidden = true;
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
      const p = turn.player;
      winTitle.textContent = t('game.win', { player: t(p.nameKey) });
      winTitle.style.color = p.color;
      overlay.classList.remove('hidden');
    }
    refresh();
  };

  const onSpace = (e: KeyboardEvent): void => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (turn.canRoll()) roll();
    else if (turn.state === 'deciding') {
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
      document.removeEventListener('fullscreenchange', refreshFsLabel);
      window.removeEventListener('keydown', onSpace);
      view.remove();
    },
  };
}
