/**
 * Guided routine state machine.
 *
 * A routine is an ordered list of exercise steps with targets. Each step runs
 * until its target is reached or the user skips it, followed by a timed rest,
 * then the next step. A single-exercise workout is simply a one-step routine.
 */
import { type CountedExercise, ExerciseMode } from "./domain/models";
import type { Clock } from "./session";

export interface RoutineStep {
  mode: CountedExercise;
  target: number;
}

export interface RoutinePlan {
  id: string;
  steps: RoutineStep[];
  restS: number;
}

export interface StepResult {
  mode: CountedExercise;
  target: number;
  reps: number;
  durationS: number;
  completed: boolean;
}

export type RoutinePhase = "exercise" | "rest" | "done";

/** Seconds per repetition used to estimate how long a routine takes. */
const SECONDS_PER_REP = 4;

export const DAILY_ROUTINE: RoutinePlan = {
  id: "daily",
  restS: 20,
  steps: [
    { mode: ExerciseMode.ArmRaise, target: 10 },
    { mode: ExerciseMode.ElbowCurl, target: 10 },
    { mode: ExerciseMode.SideBend, target: 6 },
    { mode: ExerciseMode.Marching, target: 10 },
    { mode: ExerciseMode.SitToStand, target: 5 },
  ],
};

export const singleExercise = (mode: CountedExercise, target: number): RoutinePlan => ({
  id: `single-${mode}`,
  restS: 0,
  steps: [{ mode, target }],
});

export function estimatedMinutes(plan: RoutinePlan): number {
  const reps = plan.steps.reduce((sum, step) => sum + step.target, 0);
  const rest = plan.restS * Math.max(0, plan.steps.length - 1);
  return Math.max(1, Math.round((reps * SECONDS_PER_REP + rest) / 60));
}

export class RoutineRun {
  index = 0;
  phase: RoutinePhase = "exercise";
  readonly results: StepResult[] = [];
  private stepStartedAt: number;
  private restEndsAt = 0;

  constructor(
    readonly plan: RoutinePlan,
    private readonly clock: Clock,
  ) {
    this.stepStartedAt = clock();
  }

  get current(): RoutineStep | null {
    return this.phase === "done" ? null : (this.plan.steps[this.index] ?? null);
  }

  get next(): RoutineStep | null {
    return this.plan.steps[this.index + 1] ?? null;
  }

  get isSingle(): boolean {
    return this.plan.steps.length === 1;
  }

  restRemainingS(): number {
    return this.phase === "rest" ? Math.max(0, Math.ceil(this.restEndsAt - this.clock())) : 0;
  }

  /**
   * Records the current step and moves to rest, the next step, or done.
   *
   * @returns The new phase.
   */
  completeStep(reps: number, completed: boolean): RoutinePhase {
    const step = this.current;
    if (!step || this.phase !== "exercise") return this.phase;
    this.results.push({
      mode: step.mode,
      target: step.target,
      reps,
      durationS: Math.round(this.clock() - this.stepStartedAt),
      completed,
    });
    if (!this.next) {
      this.phase = "done";
    } else if (this.plan.restS > 0) {
      this.phase = "rest";
      this.restEndsAt = this.clock() + this.plan.restS;
    } else {
      this.advance();
    }
    return this.phase;
  }

  /**
   * Advances out of rest once the countdown ends.
   *
   * @returns True if a new step started.
   */
  tick(): boolean {
    if (this.phase === "rest" && this.clock() >= this.restEndsAt) {
      this.advance();
      return true;
    }
    return false;
  }

  skipRest(): void {
    if (this.phase === "rest") this.advance();
  }

  /** Ends the routine early, keeping any partial progress on the current step. */
  finish(reps: number): void {
    if (this.phase === "exercise" && reps > 0) this.completeStep(reps, false);
    this.phase = "done";
  }

  private advance(): void {
    this.index += 1;
    this.phase = "exercise";
    this.stepStartedAt = this.clock();
  }
}
