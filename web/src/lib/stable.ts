/**
 * Temporal stabilizers. Pose estimates jitter frame to frame; these keep what
 * the user sees and hears steady until a change has persisted long enough.
 */

/** Switches to a new value only after it has been observed continuously for holdS seconds. */
export class Debounced<T> {
  private candidate: T;
  private since = 0;

  constructor(
    public value: T,
    private readonly holdS: number,
    private readonly equals: (a: T, b: T) => boolean = Object.is,
  ) {
    this.candidate = value;
  }

  /**
   * Offers a new value, which is accepted once it has held for the hold time.
   *
   * Args:
   *   next: The latest value.
   *   now: Clock time in seconds.
   *
   * Returns:
   *   The stable value.
   */
  update(next: T, now: number): T {
    if (this.equals(next, this.value)) {
      this.candidate = next;
      this.since = now;
      return this.value;
    }
    if (!this.equals(next, this.candidate)) {
      this.candidate = next;
      this.since = now;
    }
    if (now - this.since >= this.holdS) this.value = next;
    return this.value;
  }

  reset(value: T): void {
    this.value = value;
    this.candidate = value;
  }
}
