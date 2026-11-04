<script lang="ts">
  import { EXERCISES, GOAL_OPTIONS } from "../config";
  import { ExerciseMode, MovementPhase } from "../domain/models";
  import * as msg from "../messages";

  let {
    mode,
    reps,
    goal,
    phase,
    angle,
    celebrating,
    onGoal,
  }: {
    mode: ExerciseMode;
    reps: number;
    goal: number;
    phase: MovementPhase;
    angle: number | null;
    celebrating: boolean;
    onGoal: (goal: number) => void;
  } = $props();

  const counting = $derived(mode !== ExerciseMode.Posture);
  const percent = $derived(Math.min(100, Math.round((reps / goal) * 100)));
  const copy = $derived(mode === ExerciseMode.Posture ? null : msg.EXERCISE_COPY[mode]);
  const band = $derived(mode === ExerciseMode.Posture ? null : EXERCISES[mode]);
  const phaseLabel = $derived(
    !copy || phase === MovementPhase.Ready ? msg.PHASE_READY : phase === MovementPhase.Low ? copy.low : copy.high,
  );
</script>

<section class="card glass" class:celebrating aria-labelledby="counter-title">
  <div class="head">
    <h2 id="counter-title" class="eyebrow">{msg.MODE_LABELS[mode]}</h2>
    {#if counting}
      <span class="phase">{phaseLabel}</span>
    {/if}
  </div>

  {#if copy && band}
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

    <p class="view-hint">{msg.BEST_VIEW(copy.bestView)}</p>
    <p class="angle">
      {copy.angleLabel}:
      <strong>{angle === null ? msg.ANGLE_UNKNOWN : `${Math.round(angle)}°`}</strong>
      <span>({msg.ANGLE_THRESHOLDS(band.lowDeg, band.highDeg)})</span>
    </p>

    {#if celebrating}
      <p class="reached serif" role="status">{msg.TARGET_REACHED}</p>
    {:else}
      <div class="goals" role="group" aria-label={msg.TARGET_PICK}>
        <span class="eyebrow">{msg.TARGET_PICK}</span>
        {#each GOAL_OPTIONS as option (option)}
          <button class="goal" aria-pressed={goal === option} onclick={() => onGoal(option)}>{option}</button>
        {/each}
      </div>
    {/if}
  {:else}
    <p class="hint">{msg.POSTURE_COUNTER_HINT}</p>
  {/if}
</section>

<style>
  .card {
    padding: 1.25rem 1.5rem 1.5rem;
    transition: box-shadow 300ms ease;
  }

  .celebrating {
    box-shadow: 0 0 0 3px var(--accent-deep), var(--glow);
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .phase {
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .count {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin: 0.25rem 0 0.75rem;
  }

  .num {
    font-size: clamp(5rem, 10vw, 8.5rem);
    line-height: 0.9;
    color: var(--accent-deep);
  }

  .of {
    font-size: clamp(1.125rem, 2vw, 1.5rem);
    font-weight: 500;
    color: var(--muted);
  }

  .bar {
    height: 12px;
    border-radius: var(--radius-pill);
    background: var(--line);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--gloss);
    border-radius: inherit;
    transition: width 300ms ease;
  }

  .view-hint {
    margin: 0.75rem 0 0;
    font-weight: 600;
    color: var(--accent-deep);
  }

  .angle {
    margin: 0.25rem 0 0;
    font-size: 0.9375rem;
  }

  .angle strong {
    font-variant-numeric: tabular-nums;
  }

  .angle span {
    color: var(--muted);
    font-size: 0.8125rem;
  }

  .goals {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .goals .eyebrow {
    margin-right: 0.25rem;
  }

  .goal {
    flex: 1;
    min-height: 40px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    font: 600 0.9375rem/1 var(--font-sans);
    cursor: pointer;
  }

  .goal[aria-pressed="true"] {
    border-color: var(--accent-deep);
    background: color-mix(in srgb, var(--accent-deep) 14%, transparent);
  }

  .reached {
    margin: 1rem 0 0;
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    color: var(--accent-deep);
    animation: rise 400ms ease-out;
  }

  .hint {
    font-size: 1.0625rem;
    color: var(--muted);
    margin: 0.75rem 0 0;
  }

  @keyframes rise {
    from {
      transform: translateY(6px);
      opacity: 0;
    }
  }
</style>
