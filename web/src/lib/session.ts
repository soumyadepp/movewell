export type Clock = () => number;

export const secondsClock: Clock = () => performance.now() / 1000;

/** Stopwatch that accumulates active time across pauses. */
export class SessionTimer {
  private accumulated = 0;
  private startedAt: number | null = null;

  constructor(private readonly clock: Clock) {}

  get running(): boolean {
    return this.startedAt !== null;
  }

  toggle(): boolean {
    const now = this.clock();
    if (this.startedAt === null) {
      this.startedAt = now;
      return true;
    }
    this.accumulated += now - this.startedAt;
    this.startedAt = null;
    return false;
  }

  elapsedSeconds(): number {
    const live = this.startedAt !== null ? this.clock() - this.startedAt : 0;
    return Math.floor(this.accumulated + live);
  }
}
