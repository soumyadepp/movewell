/**
 * Typed publish/subscribe. Events are semantic (what happened), never
 * sentences, so each listener can render them in its own language.
 */
import type { ExerciseMode, Finding, ViewMode } from "./domain/models";
import type { BlockReason } from "./exercises/types";

export interface EventMap {
  repCounted: { mode: ExerciseMode; total: number };
  goalReached: { mode: ExerciseMode; goal: number };
  findingChanged: { finding: Finding };
  bodyFound: Record<string, never>;
  bodyLost: Record<string, never>;
  positionBlocked: { reason: Exclude<BlockReason, "form"> };
  positionReady: Record<string, never>;
  viewChanged: { view: ViewMode };
  modeChanged: { mode: ExerciseMode };
  timerToggled: { running: boolean };
  sessionSaved: Record<string, never>;
  routineStarted: { steps: number };
  routineCompleted: Record<string, never>;
  countdownTick: { remaining: number };
  rangeLearned: { mode: ExerciseMode };
  countdownFinished: Record<string, never>;
  sessionPaused: { reason: "away" | "user" };
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private handlers: { [K in keyof EventMap]?: Handler<K>[] } = {};

  subscribe<K extends keyof EventMap>(
    type: K,
    handler: Handler<K>,
  ): () => void {
    const list = (this.handlers[type] ?? []) as Handler<K>[];
    list.push(handler);
    this.handlers[type] = list as (typeof this.handlers)[K];
    return () => list.splice(list.indexOf(handler), 1);
  }

  publish<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    for (const handler of (this.handlers[type] ?? []) as Handler<K>[])
      handler(payload);
  }
}
