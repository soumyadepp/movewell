/**
 * Guided routine state machine.
 *
 * A routine is an ordered list of exercise steps with targets. Each step runs
 * until its target is reached or the user skips it, followed by a timed rest,
 * then the next step. A single-exercise workout is simply a one-step routine.
 */
import {
  COUNTED_EXERCISES,
  type CountedExercise,
  ExerciseMode,
} from "./domain/models";
import type { Clock } from "./session";

export interface RoutineStep {
  mode: CountedExercise;
  target: number;
}

export interface RoutinePlan {
  id: string;
  steps: RoutineStep[];
  restS: number;
  /** Show a "Next up" introduction before each exercise until the user is ready. */
  showIntro: boolean;
}

export interface StepResult {
  mode: CountedExercise;
  target: number;
  reps: number;
  durationS: number;
  completed: boolean;
}

export type RoutinePhase = "intro" | "exercise" | "rest" | "done";

/** Seconds per repetition used to estimate how long a routine takes. */
const SECONDS_PER_REP = 4;

export const DAILY_ROUTINE: RoutinePlan = {
  id: "daily",
  restS: 15,
  showIntro: true,
  steps: [
    { mode: ExerciseMode.ArmRaise, target: 10 },
    { mode: ExerciseMode.ElbowCurl, target: 10 },
    { mode: ExerciseMode.SideBend, target: 6 },
    { mode: ExerciseMode.Marching, target: 10 },
    { mode: ExerciseMode.SitToStand, target: 5 },
  ],
};

/** Repetition counts offered when editing a plan. */
export const TARGET_CHOICES = [5, 10, 15] as const;
/** Rest lengths, in seconds, offered when editing a plan. */
export const REST_CHOICES = [10, 15, 30] as const;

/** True when a plan has the same steps and rest as the physiotherapist's plan. */
export function isPhysioPlan(plan: RoutinePlan): boolean {
  return (
    plan.restS === DAILY_ROUTINE.restS &&
    plan.steps.length === DAILY_ROUTINE.steps.length &&
    plan.steps.every(
      (s, i) =>
        s.mode === DAILY_ROUTINE.steps[i].mode &&
        s.target === DAILY_ROUTINE.steps[i].target,
    )
  );
}

/** Repetition choices for one exercise, including the physiotherapist's own target for it. */
export function targetChoices(mode: CountedExercise): number[] {
  const physio = DAILY_ROUTINE.steps.find((s) => s.mode === mode)?.target;
  return [...new Set([...TARGET_CHOICES, ...(physio ? [physio] : [])])].sort(
    (a, b) => a - b,
  );
}

/**
 * Rebuilds a plan from stored data, dropping anything invalid.
 *
 * Args:
 *   raw: Parsed JSON from storage, of unknown shape.
 *
 * Returns:
 *   A valid daily plan, or the physiotherapist's plan when nothing usable remains.
 */
export function planFrom(raw: unknown): RoutinePlan {
  const data = (raw ?? {}) as { steps?: unknown; restS?: unknown };
  const seen = new Set<CountedExercise>();
  const steps: RoutineStep[] = [];
  for (const item of Array.isArray(data.steps) ? data.steps : []) {
    const { mode, target } = (item ?? {}) as {
      mode?: unknown;
      target?: unknown;
    };
    const counted = COUNTED_EXERCISES.find((m) => m === mode);
    if (!counted || seen.has(counted)) continue;
    if (typeof target !== "number" || !targetChoices(counted).includes(target))
      continue;
    seen.add(counted);
    steps.push({ mode: counted, target });
  }
  if (steps.length === 0) return DAILY_ROUTINE;
  const restS =
    REST_CHOICES.find((r) => r === data.restS) ?? DAILY_ROUTINE.restS;
  return { ...DAILY_ROUTINE, steps, restS };
}

const withSteps = (plan: RoutinePlan, steps: RoutineStep[]): RoutinePlan => ({
  ...plan,
  steps,
});

/** Moves a step one place earlier (-1) or later (+1), ignoring moves past either end. */
export function moveStep(
  plan: RoutinePlan,
  index: number,
  by: -1 | 1,
): RoutinePlan {
  const to = index + by;
  if (to < 0 || to >= plan.steps.length) return plan;
  const steps = [...plan.steps];
  [steps[index], steps[to]] = [steps[to], steps[index]];
  return withSteps(plan, steps);
}

/** Removes a step, always keeping at least one. */
export function removeStep(plan: RoutinePlan, index: number): RoutinePlan {
  if (plan.steps.length <= 1) return plan;
  return withSteps(
    plan,
    plan.steps.filter((_, i) => i !== index),
  );
}

/** Adds an exercise at the end with its usual target, unless it is already in the plan. */
export function addStep(plan: RoutinePlan, mode: CountedExercise): RoutinePlan {
  if (plan.steps.some((s) => s.mode === mode)) return plan;
  const target = DAILY_ROUTINE.steps.find((s) => s.mode === mode)?.target ?? 10;
  return withSteps(plan, [...plan.steps, { mode, target }]);
}

export function setTarget(
  plan: RoutinePlan,
  index: number,
  target: number,
): RoutinePlan {
  return withSteps(
    plan,
    plan.steps.map((s, i) => (i === index ? { ...s, target } : s)),
  );
}

export function setRest(plan: RoutinePlan, restS: number): RoutinePlan {
  return { ...plan, restS };
}

/** Counted exercises not yet in the plan, in library order. */
export function addableExercises(plan: RoutinePlan): CountedExercise[] {
  return COUNTED_EXERCISES.filter((m) => !plan.steps.some((s) => s.mode === m));
}

export const singleExercise = (
  mode: CountedExercise,
  target: number,
): RoutinePlan => ({
  id: `single-${mode}`,
  restS: 0,
  showIntro: false,
  steps: [{ mode, target }],
});

export function estimatedMinutes(plan: RoutinePlan): number {
  const reps = plan.steps.reduce((sum, step) => sum + step.target, 0);
  const rest = plan.restS * Math.max(0, plan.steps.length - 1);
  return Math.max(1, Math.round((reps * SECONDS_PER_REP + rest) / 60));
}

export class RoutineRun {
  index = 0;
  phase: RoutinePhase;
  readonly results: StepResult[] = [];
  private stepStartedAt: number;
  private restEndsAt = 0;

  constructor(
    readonly plan: RoutinePlan,
    private readonly clock: Clock,
  ) {
    this.stepStartedAt = clock();
    this.phase = plan.showIntro ? "intro" : "exercise";
  }

  /** Starts the current exercise after its introduction. */
  begin(): void {
    if (this.phase !== "intro") return;
    this.phase = "exercise";
    this.stepStartedAt = this.clock();
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
    return this.phase === "rest"
      ? Math.max(0, Math.ceil(this.restEndsAt - this.clock()))
      : 0;
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
    this.phase = this.plan.showIntro ? "intro" : "exercise";
    this.stepStartedAt = this.clock();
  }
}
