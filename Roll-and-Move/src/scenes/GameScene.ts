import Phaser from 'phaser';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { ZoomController } from '../../../Core/zoom/ZoomController';
import { PAPER, FONTS } from '../../../Core/style/paper';
import { makePaperTexture } from '../style/draw';
import { BoardSpec, drawBoard, drawToken, cellCenter, LAST_CELL, GRID, Board } from '../game/board';
import { createDice, Dice } from '../game/dice';
import { TurnManager } from '../game/turn';
import { paperButton, PaperButton } from '../ui/paperButton';
import { toggleFullscreen, isFullscreen } from '../../../Core/device/fullscreen';
import { reportDebug } from '../debug';

const MARGIN = 16;
const TOP_BAR = 72;
const BOTTOM_ZONE = 200;
const GAP = 8;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  private spec!: BoardSpec;
  private board!: Board;
  private turn = new TurnManager();
  private dice!: Dice;
  private tokens: Phaser.GameObjects.Container[] = [];
  private tokenOffsets = [
    { x: -10, y: -10 },
    { x: 10, y: 10 },
  ];

  private banner!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private rerollBtn!: PaperButton;
  private confirmBtn!: PaperButton;
  private restartBtn!: PaperButton;
  private fsBtn!: PaperButton;
  private winText!: Phaser.GameObjects.Text;
  private winRestartBtn!: PaperButton;
  private pctBtn!: PaperButton;
  private zoom = new ZoomController();

  private panels: {
    name: Phaser.GameObjects.Text;
    cell: Phaser.GameObjects.Text;
    tok: Phaser.GameObjects.Container;
  }[] = [];
  private unsubs: Array<() => void> = [];

  create(): void {
    const { width, height } = this.scale.gameSize;

    this.add.graphics().fillStyle(PAPER.base, 1).fillRect(0, 0, width, height);
    const noise = makePaperTexture(this);
    this.add.tileSprite(width / 2, height / 2, width, height, noise.key).setAlpha(0.5);

    const onSpace = () => this.onSpace();
    this.input.keyboard?.on('keydown-SPACE', onSpace);
    this.unsubs.push(() => this.input.keyboard?.off('keydown-SPACE', onSpace));

    this.unsubs.push(i18n.onChanged(() => this.refreshAll()));
    this.unsubs.push(this.zoom.onChanged(() => this.applyZoom()));

    // keep layout glued to the (resized) page edges without losing game state
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.unsubs.push(() => this.scale.off('resize', onResize));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs.length = 0;
    });

    this.layout();
    this.turn.beginTurn();
    this.refreshAll();
  }

  /** (Re)build all UI from the current page size: controls hug the edges, the board takes the rest. */
  private layout(): void {
    this.board?.clear();
    this.dice?.destroy();
    for (const t of this.tokens) t.destroy();
    this.tokens = [];
    this.panels = [];

    const w = this.scale.gameSize.width;
    const h = this.scale.gameSize.height;

    // adaptive board
    const avail = Math.min(w - MARGIN * 2, h - TOP_BAR - BOTTOM_ZONE - MARGIN);
    const size = Math.floor((avail - (GRID - 1) * GAP) / GRID);
    const cy = TOP_BAR + (h - TOP_BAR - BOTTOM_ZONE) / 2;
    this.spec = { cx: w / 2, cy, size, gap: GAP };

    this.board = drawBoard(this, this.spec, (key) => i18n.t(key));
    for (const p of this.turn.players) {
      this.tokens.push(drawToken(this, 0, 0, p.color, p.soft, 22));
    }
    this.syncTokens();

    // bottom zone: dice + decision buttons + hints
    this.dice = createDice(this, w / 2, h - 110, 84, () => void this.onRoll());
    this.hint = this.add
      .text(w / 2, h - 186, '', { fontFamily: FONTS.family, fontSize: '22px', color: PAPER.inkSoftCss })
      .setOrigin(0.5);
    this.resultText = this.add
      .text(w / 2, h - 52, '', { fontFamily: FONTS.family, fontSize: '26px', color: PAPER.redCss })
      .setOrigin(0.5);
    this.rerollBtn = paperButton(this, {
      x: w / 2 - 160,
      y: h - 110,
      width: 150,
      height: 52,
      label: '',
      fontSize: 21,
      onClick: () => this.onReroll(),
    });
    this.confirmBtn = paperButton(this, {
      x: w / 2 + 80,
      y: h - 110,
      width: 130,
      height: 52,
      label: '',
      fontSize: 21,
      onClick: () => this.onConfirm(),
    });
    this.rerollBtn.setVisible(false);
    this.confirmBtn.setVisible(false);

    // top bar: restart (left), turn banner (center), zoom (right)
    this.banner = this.add
      .text(w / 2, 36, '', { fontFamily: FONTS.family, fontSize: '36px', color: PAPER.inkCss })
      .setOrigin(0.5);
    this.restartBtn = paperButton(this, {
      x: MARGIN + 90 + 8 + 70,
      y: 36,
      width: 140,
      height: 42,
      label: i18n.t('game.restart'),
      fontSize: 18,
      onClick: () => this.scene.restart(),
    });
    this.fsBtn = paperButton(this, {
      x: MARGIN + 45,
      y: 36,
      width: 90,
      height: 42,
      label: i18n.t('game.fullscreen'),
      fontSize: 18,
      onClick: () => toggleFullscreen(),
    });
    paperButton(this, {
      x: w - 156,
      y: 36,
      width: 40,
      height: 36,
      label: '−',
      fontSize: 20,
      onClick: () => this.zoom.zoomOut(),
    });
    paperButton(this, {
      x: w - 108,
      y: 36,
      width: 40,
      height: 36,
      label: '+',
      fontSize: 20,
      onClick: () => this.zoom.zoomIn(),
    });
    this.pctBtn = paperButton(this, {
      x: w - 48,
      y: 36,
      width: 64,
      height: 36,
      label: '100%',
      fontSize: 15,
      onClick: () => this.zoom.reset(),
    });

    // player panels at bottom corners
    this.panels = this.turn.players.map((p, i) => {
      const left = i === 0;
      const px = left ? 30 : w - 30;
      const tok = drawToken(this, px, h - 96, p.color, p.soft, 17);
      tok.setDepth(1);
      const name = this.add
        .text(left ? 56 : w - 56, h - 100, '', {
          fontFamily: FONTS.family,
          fontSize: '22px',
          color: PAPER.inkCss,
        })
        .setOrigin(left ? 0 : 1, 0.5);
      const cell = this.add
        .text(left ? 56 : w - 56, h - 72, '', {
          fontFamily: FONTS.family,
          fontSize: '17px',
          color: PAPER.inkSoftCss,
        })
        .setOrigin(left ? 0 : 1, 0.5);
      return { name, cell, tok };
    });

    // win overlay (relative to the board)
    this.winText = this.add
      .text(w / 2, this.spec.cy - 40, '', { fontFamily: FONTS.heading, fontSize: '64px' })
      .setOrigin(0.5)
      .setVisible(false);
    this.winRestartBtn = paperButton(this, {
      x: w / 2,
      y: this.spec.cy + 70,
      width: 220,
      height: 58,
      label: '',
      fontSize: 24,
      onClick: () => this.scene.restart(),
    });
    this.winRestartBtn.setVisible(false);

    this.applyZoom();
    if (this.turn.state === 'finished') this.showWin();

    // ?debug=1: on-screen ruler so the tester can read real pixel positions
    if (new URLSearchParams(location.search).has('debug')) {
      const g = this.add.graphics();
      g.lineStyle(2, PAPER.red, 0.9);
      g.lineBetween(0, 0.5, w, 0.5); // canvas top edge
      g.lineStyle(2, PAPER.blue, 0.9);
      g.lineBetween(0, 15.5, w, 15.5); // top bar buttons top edge
      for (let y = 0; y < h; y += 20) {
        const len = y % 100 === 0 ? 26 : y % 40 === 0 ? 16 : 8;
        g.lineStyle(1, PAPER.red, 0.6);
        g.lineBetween(2, y, 2 + len, y);
      }
      for (let y = 0; y < h; y += 100) {
        this.add
          .text(36, y, String(y), { fontFamily: FONTS.family, fontSize: '14px', color: PAPER.redCss })
          .setOrigin(0, 0.5);
      }
    }

    // report layout numbers to the dev log (readable by the developer)
    const vv = window.visualViewport;
    const canvasRect = this.game.canvas.getBoundingClientRect();
    reportDebug('layout', {
      win: `${window.innerWidth}x${window.innerHeight}`,
      vv: vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}@${Math.round(vv.offsetTop)}` : 'n/a',
      game: `${this.scale.gameSize.width}x${this.scale.gameSize.height}`,
      cellSize: this.spec.size,
      boardTop: Math.round(this.spec.cy - (5 * this.spec.size + 4 * this.spec.gap) / 2),
      boardBottom: Math.round(this.spec.cy + (5 * this.spec.size + 4 * this.spec.gap) / 2),
      topBar: TOP_BAR,
      bottomZone: BOTTOM_ZONE,
      fullscreen: isFullscreen(),
      dpr: window.devicePixelRatio,
      canvasTop: Math.round(canvasRect.top),
      canvasLeft: Math.round(canvasRect.left),
      canvasSize: `${Math.round(canvasRect.width)}x${Math.round(canvasRect.height)}`,
      avail: `${screen.availWidth}x${screen.availHeight}`,
      orient: screen.orientation?.type ?? 'n/a',
    });
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(this.zoom.value);
    this.cameras.main.centerOn(this.spec.cx, this.spec.cy);
    this.pctBtn?.setLabel(`${Math.round(this.zoom.value * 100)}%`);
  }

  private async onRoll(): Promise<void> {
    if (!this.turn.canRoll() || this.dice.isRolling) return;
    this.dice.setEnabled(false);
    this.rerollBtn.setVisible(false);
    this.confirmBtn.setVisible(false);
    const n = await this.dice.roll();
    this.turn.onRolled(n);
    this.refreshAll();
    if (this.turn.state === 'moving') {
      this.time.delayedCall(700, () => this.startMove());
    }
  }

  private onReroll(): void {
    if (this.turn.state !== 'deciding') return;
    this.turn.reroll();
    this.refreshAll();
  }

  private onConfirm(): void {
    if (this.turn.state !== 'deciding') return;
    this.turn.confirmMove();
    this.refreshAll();
    this.startMove();
  }

  private onSpace(): void {
    if (this.turn.canRoll()) {
      void this.onRoll();
    } else if (this.turn.state === 'deciding') {
      this.onConfirm();
    }
  }

  private startMove(): void {
    this.dice.setEnabled(false);
    this.rerollBtn.setVisible(false);
    this.confirmBtn.setVisible(false);
    this.hint.setText(i18n.t('game.result', { n: this.turn.lastRoll }));
    const steps = this.turn.lastRoll;
    const start = this.turn.player.pos;
    const token = this.tokens[this.turn.current];
    const off = this.tokenOffsets[this.turn.current];
    const moveStep = (k: number): void => {
      if (k > steps) {
        this.finishMove();
        return;
      }
      const c = cellCenter(this.spec, start + k);
      this.tweens.add({
        targets: token,
        x: c.x + off.x,
        y: c.y + off.y,
        duration: 200,
        ease: 'Sine.easeInOut',
        onComplete: () => moveStep(k + 1),
      });
    };
    moveStep(1);
  }

  private finishMove(): void {
    const won = this.turn.finishMove();
    if (won) {
      this.showWin();
      this.resultText.setText(i18n.t('game.result', { n: this.turn.lastRoll }));
      this.refreshAll();
    } else {
      this.refreshAll();
    }
    this.syncTokens();
  }

  private showWin(): void {
    const p = this.turn.player;
    this.winText
      .setText(i18n.t('game.win', { player: i18n.t(p.nameKey) }))
      .setColor(p.color === PAPER.red ? PAPER.redCss : PAPER.blueCss)
      .setVisible(true);
    this.winRestartBtn.setVisible(true);
    this.winText.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: this.winText, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
  }

  private syncTokens(): void {
    this.turn.players.forEach((p, i) => {
      const c = cellCenter(this.spec, p.pos);
      const off = this.tokenOffsets[i];
      this.tokens[i].setPosition(c.x + off.x, c.y + off.y);
    });
  }

  private refreshAll(): void {
    const t = this.turn;
    const p = t.player;
    this.banner.setText(i18n.t('game.turn', { player: i18n.t(p.nameKey) }));
    this.banner.setColor(p.color === PAPER.red ? PAPER.redCss : PAPER.blueCss);

    this.hint.setText(t.state === 'deciding' ? i18n.t('game.rerollsLeft', { n: t.rollsLeft }) : i18n.t('game.roll'));
    this.resultText.setText(t.lastRoll > 0 ? i18n.t('game.result', { n: t.lastRoll }) : '');

    const deciding = t.state === 'deciding';
    this.rerollBtn.setVisible(deciding);
    this.confirmBtn.setVisible(deciding);
    this.rerollBtn.setLabel(i18n.t('game.reroll', { n: t.rollsLeft }));
    this.confirmBtn.setLabel(i18n.t('game.confirm'));
    this.restartBtn.setLabel(i18n.t('game.restart'));
    this.fsBtn.setLabel(i18n.t('game.fullscreen'));
    this.winRestartBtn.setLabel(i18n.t('game.restart'));
    this.dice.setEnabled(t.canRoll());

    this.panels.forEach((panel, i) => {
      const pl = t.players[i];
      panel.name.setText(i18n.t(pl.nameKey));
      panel.name.setColor(pl.color === PAPER.red ? PAPER.redCss : PAPER.blueCss);
      panel.cell.setText(pl.pos >= LAST_CELL ? i18n.t('game.finish') : i18n.t('game.cell', { n: pl.pos + 1 }));
      panel.tok.setScale(i === t.current ? 1.2 : 1);
    });

    this.board.labelTexts.forEach((txt) => {
      const key = txt.getData('i18nKey') as string | undefined;
      if (key) txt.setText(i18n.t(key));
    });
  }
}
