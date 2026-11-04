<script lang="ts">
  import { EXERCISES } from "../config";
  import { type CountedExercise, MovementPhase } from "../domain/models";
  import * as msg from "../messages";

  let {
    mode,
    reps,
    goal,
    phase,
    angle,
    celebrating,
  }: {
    mode: CountedExercise;
    reps: number;
    goal: number;
    phase: MovementPhase;
    angle: number | null;
    celebrating: boolean;
  } = $props();

  const copy = $derived(msg.EXERCISE_COPY[mode]);
  const band = $derived(EXERCISES[mode]);
  const percent = $derived(Math.min(100, Math.round((reps / goal) * 100)));
  const phaseLabel = $derived(
    phase === MovementPhase.Ready ? msg.PHASE_READY : phase === MovementPhase.Low ? copy.low : copy.high,
  );
</script>

<section class="card counter" class:celebrating aria-labelledby="counter-title">
  <div class="head">
    <h2 id="counter-title" class="eyebrow">{copy.label}</h2>
    <span class="phase">{phaseLabel}</span>
  </div>

  <p class="count" aria-live="polite" aria-atomic="true">
    <span class="serif num">{reps}</span>
    <span class="of">/ {goal} {msg.REPS_LABEL}</span>
  </p>
  <div
    class="bar"
    role="progressbar"
    aria-label={msg.TARGET_LABEL(goal)}
    aria-valuemin="0"
    aria-valuemax={goal}
    aria-valuenow={Math.min(reps, goal)}
  >
    <span style:width="{percent}%"></span>
  </div>

  {#if celebrating}
    <p class="reached serif" role="status">{msg.TARGET_REACHED}</p>
  {:else}
    <p class="angle">
      {copy.angleLabel}:
      <strong>{angle === null ? msg.ANGLE_UNKNOWN : `${Math.round(angle)}°`}</strong>
      <span>({msg.ANGLE_THRESHOLDS(band.lowDeg, band.highDeg)})</span>
    </p>
  {/if}
</section>

<style>
  .counter {
    transition: box-shadow var(--duration-slow) var(--easing-standard);
  }

  .celebrating {
    box-shadow: 0 0 0 3px var(--color-primary), var(--card-shadow);
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }

  .phase {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--badge-bg);
    color: var(--badge-text);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
  }

  .count {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
    margin: var(--space-1) 0 var(--space-3);
  }

  .num {
    font-size: var(--font-size-display);
    line-height: 0.9;
    color: var(--color-primary);
  }

  .of {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .bar {
    height: var(--progress-height);
    border-radius: var(--radius-full);
    background: var(--progress-track);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--progress-fill);
    border-radius: inherit;
    transition: width var(--duration-slow) var(--easing-standard);
  }

  .angle {
    margin: var(--space-3) 0 0;
    font-size: var(--font-size-sm);
  }

  .angle strong {
    font-variant-numeric: tabular-nums;
  }

  .angle span {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  .reached {
    margin: var(--space-3) 0 0;
    font-size: var(--font-size-3xl);
    color: var(--color-primary);
    animation: rise var(--duration-slow) var(--easing-standard);
  }

  @keyframes rise {
    from {
      transform: translateY(6px);
      opacity: 0;
    }
  }
</style>
