import { PAPER } from '../../../Core/style/paper';
import { LAST_CELL } from './board';

export type TurnState = 'idle' | 'deciding' | 'moving' | 'finished';

export interface PlayerState {
  /** i18n key for the player name. */
  nameKey: string;
  color: number;
  soft: number;
  /** 0-based cell index; LAST_CELL = finish. */
  pos: number;
}

export const MAX_ROLLS = 3;

export class TurnManager {
  readonly players: PlayerState[] = [
    { nameKey: 'game.playerRed', color: PAPER.red, soft: PAPER.redSoft, pos: 0 },
    { nameKey: 'game.playerBlue', color: PAPER.blue, soft: PAPER.blueSoft, pos: 0 },
  ];
  current = 0;
  rollsLeft = MAX_ROLLS;
  lastRoll = 0;
  state: TurnState = 'idle';

  get player(): PlayerState {
    return this.players[this.current];
  }

  beginTurn(): void {
    this.rollsLeft = MAX_ROLLS;
    this.lastRoll = 0;
    this.state = 'idle';
  }

  canRoll(): boolean {
    return this.state === 'idle' && this.rollsLeft > 0;
  }

  /** A roll just landed; rollsLeft>0 → player decides, else auto-move. */
  onRolled(n: number): void {
    this.lastRoll = n;
    this.rollsLeft--;
    this.state = this.rollsLeft > 0 ? 'deciding' : 'moving';
  }

  reroll(): void {
    if (this.state === 'deciding') this.state = 'idle';
  }

  confirmMove(): void {
    if (this.state === 'deciding') this.state = 'moving';
  }

  /**
   * Apply the move. Returns true when the game is finished.
   * Overflow steps are ignored (arrival is enough to win).
   */
  finishMove(): boolean {
    const p = this.player;
    p.pos = Math.min(p.pos + this.lastRoll, LAST_CELL);
    if (p.pos >= LAST_CELL) {
      this.state = 'finished';
      return true;
    }
    this.current = (this.current + 1) % this.players.length;
    this.beginTurn();
    return false;
  }

  reset(): void {
    for (const p of this.players) p.pos = 0;
    this.current = 0;
    this.beginTurn();
  }
}
