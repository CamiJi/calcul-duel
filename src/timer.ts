/**
 * Minuteur indépendant par joueur, basé sur performance.now()
 * (pas d'accumulation d'erreurs de setTimeout).
 */
export class Countdown {
  private deadline = 0;
  private remaining = 0;
  private _running = false;

  start(ms: number): void {
    this.remaining = ms;
    this.deadline = performance.now() + ms;
    this._running = true;
  }

  pause(): void {
    if (!this._running) return;
    this.remaining = Math.max(0, this.deadline - performance.now());
    this._running = false;
  }

  resume(): void {
    if (this._running || this.remaining <= 0) return;
    this.deadline = performance.now() + this.remaining;
    this._running = true;
  }

  stop(): void {
    this._running = false;
    this.remaining = 0;
  }

  get running(): boolean {
    return this._running;
  }

  get remainingMs(): number {
    return this._running ? Math.max(0, this.deadline - performance.now()) : this.remaining;
  }
}
