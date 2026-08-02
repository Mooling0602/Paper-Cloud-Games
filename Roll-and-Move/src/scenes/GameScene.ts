import Phaser from 'phaser';
import { i18n } from '../../../Core/i18n/LanguageManager';
import { ZoomController } from '../../../Core/zoom/ZoomController';
import { PAPER, FONTS } from '../../../Core/style/paper';
import { makePaperTexture } from '../style/draw';
import { BoardSpec, drawBoard, drawToken, cellCenter, LAST_CELL, Board } from '../game/board';
import { createDice, Dice } from '../game/dice';
import { TurnManager } from '../game/turn';
import { paperButton, PaperButton } from '../ui/paperButton';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  private spec: BoardSpec = { cx: 640, cy: 390, size: 96, gap: 8 };
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
    const unsubs = this.unsubs;

    this.add.graphics().fillStyle(PAPER.base, 1).fillRect(0, 0, width, height);
    const noise = makePaperTexture(this);
    this.add.tileSprite(width / 2, height / 2, width, height, noise.key).setAlpha(0.5);

    // board
    this.board = drawBoard(this, this.spec, (key) => i18n.t(key));

    // tokens
    for (const p of this.turn.players) {
      this.tokens.push(drawToken(this, 0, 0, p.color, p.soft, 22));
    }
    this.syncTokens();

    // dice (tap handled by its own zone; camera transform included)
    this.dice = createDice(this, 640, 688, 84, () => void this.onRoll());

    // texts
    this.banner = this.add
      .text(width / 2, 66, '', { fontFamily: FONTS.family, fontSize: '36px', color: PAPER.inkCss })
      .setOrigin(0.5);
    this.hint = this.add
      .text(width / 2, 622, '', { fontFamily: FONTS.family, fontSize: '22px', color: PAPER.inkSoftCss })
      .setOrigin(0.5);
    this.resultText = this.add
      .text(width / 2, 756, '', { fontFamily: FONTS.family, fontSize: '26px', color: PAPER.redCss })
      .setOrigin(0.5);

    // decision buttons (flanking the dice)
    this.rerollBtn = paperButton(this, {
      x: 480,
      y: 688,
      width: 150,
      height: 52,
      label: '',
      fontSize: 21,
      onClick: () => this.onReroll(),
    });
    this.confirmBtn = paperButton(this, {
      x: 800,
      y: 688,
      width: 130,
      height: 52,
      label: '',
      fontSize: 21,
      onClick: () => this.onConfirm(),
    });
    this.rerollBtn.setVisible(false);
    this.confirmBtn.setVisible(false);

    // player panels
    this.panels = this.turn.players.map((p, i) => {
      const px = i === 0 ? 90 : width - 90;
      const originX = i === 0 ? 0 : 1;
      const tok = drawToken(this, px, 712, p.color, p.soft, 17);
      tok.setDepth(1);
      const name = this.add
        .text(px + (i === 0 ? 26 : -26), 696, '', {
          fontFamily: FONTS.family,
          fontSize: '22px',
          color: PAPER.inkCss,
        })
        .setOrigin(originX, 0.5);
      const cell = this.add
        .text(px + (i === 0 ? 26 : -26), 726, '', {
          fontFamily: FONTS.family,
          fontSize: '17px',
          color: PAPER.inkSoftCss,
        })
        .setOrigin(originX, 0.5);
      return { name, cell, tok };
    });

    // top controls
    this.restartBtn = paperButton(this, {
      x: 92,
      y: 44,
      width: 140,
      height: 42,
      label: i18n.t('game.restart'),
      fontSize: 18,
      onClick: () => this.scene.restart(),
    });
    this.zoomControls();

    // win overlay
    this.winText = this.add
      .text(width / 2, 356, '', { fontFamily: FONTS.heading, fontSize: '64px' })
      .setOrigin(0.5)
      .setVisible(false);
    this.winRestartBtn = paperButton(this, {
      x: width / 2,
      y: 436,
      width: 220,
      height: 58,
      label: i18n.t('game.restart'),
      fontSize: 24,
      onClick: () => this.scene.restart(),
    });
    this.winRestartBtn.setVisible(false);

    // input: Space rolls or confirms
    const onSpace = () => this.onSpace();
    this.input.keyboard?.on('keydown-SPACE', onSpace);
    unsubs.push(() => this.input.keyboard?.off('keydown-SPACE', onSpace));

    // listeners
    unsubs.push(i18n.onChanged(() => this.refreshAll()));
    unsubs.push(
      this.zoom.onChanged((v) => {
        this.cameras.main.setZoom(v);
        this.cameras.main.centerOn(this.spec.cx, this.spec.cy);
        this.pctBtn.setLabel(`${Math.round(v * 100)}%`);
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubs.forEach((u) => u());
      this.unsubs.length = 0;
    });

    this.turn.beginTurn();
    this.refreshAll();
  }

  private zoomControls(): void {
    const y = 44;
    paperButton(this, { x: 1178, y, width: 40, height: 36, label: '−', fontSize: 20, onClick: () => this.zoom.zoomOut() });
    paperButton(this, { x: 1226, y, width: 40, height: 36, label: '+', fontSize: 20, onClick: () => this.zoom.zoomIn() });
    this.pctBtn = paperButton(this, { x: 1276, y, width: 64, height: 36, label: '100%', fontSize: 15, onClick: () => this.zoom.reset() });
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
      const p = this.turn.player;
      this.winText
        .setText(i18n.t('game.win', { player: i18n.t(p.nameKey) }))
        .setColor(p.color === PAPER.red ? PAPER.redCss : PAPER.blueCss)
        .setVisible(true);
      this.winRestartBtn.setVisible(true);
      this.winText.setScale(0.5).setAlpha(0);
      this.tweens.add({ targets: this.winText, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
      this.resultText.setText(i18n.t('game.result', { n: this.turn.lastRoll }));
      this.refreshAll();
    } else {
      this.refreshAll();
    }
    this.syncTokens();
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
    this.winRestartBtn.setLabel(i18n.t('game.restart'));

    this.dice.setEnabled(t.canRoll());

    this.panels.forEach((panel, i) => {
      const pl = t.players[i];
      panel.name.setText(i18n.t(pl.nameKey));
      panel.name.setColor(pl.color === PAPER.red ? PAPER.redCss : PAPER.blueCss);
      panel.cell.setText(pl.pos >= LAST_CELL ? i18n.t('game.finish') : i18n.t('game.cell', { n: pl.pos + 1 }));
      panel.tok.setScale(i === t.current ? 1.2 : 1);
    });

    // i18n-aware board labels (start/finish)
    this.board.labelTexts.forEach((txt) => {
      const key = txt.getData('i18nKey') as string | undefined;
      if (key) txt.setText(i18n.t(key));
    });
  }
}
