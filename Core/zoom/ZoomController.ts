/**
 * Built-in game-view zoom control (pure logic, no rendering).
 * Percentage steps around 100%, clamped to the level list.
 */
export class ZoomController {
  readonly levels = [0.75, 1, 1.25, 1.5, 2];
  private index = 1;
  private listeners = new Set<(value: number) => void>();

  get value(): number {
    return this.levels[this.index];
  }

  get canZoomIn(): boolean {
    return this.index < this.levels.length - 1;
  }

  get canZoomOut(): boolean {
    return this.index > 0;
  }

  zoomIn(): void {
    if (this.canZoomIn) {
      this.index++;
      this.emit();
    }
  }

  zoomOut(): void {
    if (this.canZoomOut) {
      this.index--;
      this.emit();
    }
  }

  reset(): void {
    this.index = 1;
    this.emit();
  }

  onChanged(fn: (value: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const v = this.value;
    this.listeners.forEach((fn) => fn(v));
  }
}
