/** Time source shared by the core, so tests can drive it with a fake clock. */

/** Returns the current time in seconds. */
export type Clock = () => number;

/** Monotonic seconds since the page loaded. */
export const secondsClock: Clock = () => performance.now() / 1000;
