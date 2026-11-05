/**
 * Decides when an exercise should pause because nobody is in view, and when
 * it should carry on because the person is back.
 */
import type { PauseReason, RoutinePhase } from "./routine";

/** Seconds out of view before an exercise pauses itself. */
export const AUTO_PAUSE_S = 3;
/** Seconds back in view before an automatically paused exercise carries on. */
export const AUTO_RESUME_S = 1;

export type PresenceAction = "pause" | "resume" | null;

/** Tracks how long the person has been in or out of view. */
export class PresenceWatcher {
  private lastSeenAt = -Infinity;
  private seenSince: number | null = null;

  /**
   * Records whether a body was detected in a frame.
   *
   * Args:
   *   present: True if the frame had a body in it.
   *   now: Clock time of the frame, in seconds.
   *   phase: The routine's current phase.
   *   pauseReason: Why the routine is paused, if it is.
   *
   * Returns:
   *   "pause" when the person has been gone long enough during an exercise,
   *   "resume" when they have been back long enough after an automatic pause,
   *   otherwise null.
   */
  observe(present: boolean, now: number, phase: RoutinePhase, pauseReason: PauseReason | null): PresenceAction {
    if (present) {
      this.lastSeenAt = now;
      this.seenSince ??= now;
    } else {
      this.seenSince = null;
    }
    if (phase === "exercise" && now - this.lastSeenAt >= AUTO_PAUSE_S) return "pause";
    const back = this.seenSince !== null && now - this.seenSince >= AUTO_RESUME_S;
    if (phase === "paused" && pauseReason === "away" && back) return "resume";
    return null;
  }

  /** Forgets earlier frames, for example when a new session starts. */
  reset(): void {
    this.lastSeenAt = -Infinity;
    this.seenSince = null;
  }
}
