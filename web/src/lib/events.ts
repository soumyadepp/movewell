/**
 * Typed publish/subscribe. Events are semantic (what happened), never
 * sentences, so each listener can render them in its own language.
 */
import type { ExerciseMode, Finding, ViewMode } from "./domain/models";

export interface EventMap {
  repCounted: { mode: ExerciseMode; total: number };
  goalReached: { mode: ExerciseMode; goal: number };
  findingChanged: { finding: Finding };
  bodyLost: Record<string, never>;
  viewChanged: { view: ViewMode };
  modeChanged: { mode: ExerciseMode };
  timerToggled: { running: boolean };
  sessionSaved: Record<string, never>;
  routineStarted: { steps: number };
  routineCompleted: Record<string, never>;
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

export class EventBus {
  private handlers: { [K in keyof EventMap]?: Handler<K>[] } = {};

  subscribe<K extends keyof EventMap>(type: K, handler: Handler<K>): () => void {
    const list = (this.handlers[type] ?? []) as Handler<K>[];
    list.push(handler);
    this.handlers[type] = list as (typeof this.handlers)[K];
    return () => list.splice(list.indexOf(handler), 1);
  }

  publish<K extends keyof EventMap>(type: K, payload: EventMap[K]): void {
    for (const handler of (this.handlers[type] ?? []) as Handler<K>[]) handler(payload);
  }
}
