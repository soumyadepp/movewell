<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import BodyCheck from "../components/BodyCheck.svelte";
  import CameraStage from "../components/CameraStage.svelte";
  import DiagnosticsPanel from "../components/DiagnosticsPanel.svelte";
  import Guidance from "../components/Guidance.svelte";
  import Onboarding from "../components/Onboarding.svelte";
  import RepCounter from "../components/RepCounter.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import { BEST_VIEW, ExerciseMode, isCounted, ViewMode } from "../domain/models";
  import * as msg from "../messages";
  import { DAILY_ROUTINE } from "../routine";

  let { coach }: { coach: CoachController } = $props();
  let video = $state<HTMLVideoElement>();
  let canvas = $state<HTMLCanvasElement>();

  const s = $derived(coach.snapshot);
  const r = $derived(coach.routine);
  const running = $derived(coach.stage === "running");
  const resting = $derived(r?.phase === "rest");
  const nextMode = $derived(r?.next?.mode ?? null);
  const cancelHref = $derived(coach.route.name === "workout" && coach.route.kind === "single" ? href.detail(coach.route.mode) : href.home);
  const routeMode = $derived.by(() => {
    const route = coach.route;
    if (route.name !== "workout") return s.mode;
    if (route.kind === "single") return route.mode;
    if (route.kind === "posture") return ExerciseMode.Posture;
    return r?.steps[r.index]?.mode ?? DAILY_ROUTINE.steps[0].mode;
  });

  function start() {
    if (video && canvas) coach.start(video, canvas);
  }

  onMount(() => {
    if (coach.canAutoStart) start();
  });

  onDestroy(() => coach.stop());
</script>

<div class="workout">
  <div class="topbar">
    {#if r && !r.isSingle}
      <div class="progress">
        <p class="eyebrow">{msg.WORKOUT_STEP(Math.min(r.index + 1, r.steps.length), r.steps.length)}</p>
        <ol class="pips" aria-hidden="true">
          {#each r.steps as step, i (i)}
            <li class:done={i < r.index} class:current={i === r.index}>
              <span>{msg.EXERCISE_COPY[step.mode].label}</span>
            </li>
          {/each}
        </ol>
      </div>
    {:else}
      <h1 class="title">{msg.MODE_LABELS[routeMode]}</h1>
    {/if}
    <div class="actions">
      {#if r && r.phase === "exercise" && !r.isSingle}
        <button class="btn" onclick={() => coach.skipExercise()} disabled={!running}>{msg.WORKOUT_SKIP}</button>
      {/if}
      <button class="btn btn-accent" onclick={() => coach.endSession()}>
        {r?.isSingle ? msg.WORKOUT_FINISH : msg.WORKOUT_END}
      </button>
    </div>
  </div>

  <div class="layout">
    <div class="stage-wrap">
      <CameraStage
        bind:video
        bind:canvas
        view={s.view}
        bodyDetected={s.bodyDetected || resting}
        {running}
        onToggleView={() => coach.toggleView()}
        canSwitchView={s.mode === ExerciseMode.Posture}
      />
      {#if resting && r}
        <div class="rest" role="status" aria-live="polite">
          <p class="eyebrow on-stage">{msg.REST_TITLE}</p>
          <p class="countdown serif">{r.restRemainingS}</p>
          {#if nextMode}
            <p class="next">{msg.REST_NEXT(msg.EXERCISE_COPY[nextMode].label)}</p>
            <p class="turn">{msg.REST_TURN(BEST_VIEW[nextMode] === ViewMode.Side)}</p>
          {/if}
          <button class="btn btn-primary" onclick={() => coach.skipRest()}>{msg.REST_SKIP}</button>
        </div>
      {/if}
    </div>

    <aside class="side" aria-label="Exercise feedback">
      {#if isCounted(s.mode)}
        <RepCounter
          mode={s.mode}
          reps={s.reps}
          goal={s.goal}
          phase={s.phase}
          angle={s.angle}
          celebrating={coach.celebrating}
        />
      {/if}
      <Guidance lines={resting ? [msg.REST_TITLE] : s.guidance} />
      {#if s.mode === ExerciseMode.Posture}
        <BodyCheck findings={s.findings} />
      {/if}
      {#if r?.next && !resting}
        <p class="up-next">{msg.WORKOUT_NEXT(msg.EXERCISE_COPY[r.next.mode].label)}</p>
      {/if}
      <DiagnosticsPanel {coach} />
    </aside>
  </div>

  <p class="safety" role="note">{msg.SAFETY}</p>
</div>

{#if !running}
  <Onboarding stage={coach.stage} errorMessage={coach.errorMessage} {cancelHref} onStart={start} />
{/if}

<style>
  .workout {
    display: grid;
    gap: var(--space-4);
  }

  .topbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .title {
    font-size: var(--font-size-3xl);
  }

  .progress {
    display: grid;
    gap: var(--space-2);
  }

  .pips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pips li {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .pips li.done {
    background: var(--color-primary-subtle);
    border-color: var(--color-primary-subtle);
    color: var(--color-primary);
  }

  .pips li.done span::before {
    content: "✓ ";
  }

  .pips li.current {
    border-color: var(--color-primary);
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(340px, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  .stage-wrap {
    position: relative;
  }

  .rest {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-2);
    padding: var(--space-6);
    border-radius: var(--stage-radius);
    background: color-mix(in srgb, var(--color-stage) 88%, transparent);
    color: var(--color-on-stage);
    text-align: center;
  }

  .on-stage {
    color: var(--color-on-stage);
    opacity: 0.85;
  }

  .countdown {
    margin: 0;
    font-size: var(--font-size-display);
    line-height: 1;
  }

  .next {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
  }

  .turn {
    margin: 0 0 var(--space-4);
    font-size: var(--font-size-lg);
    opacity: 0.9;
  }

  .side {
    display: grid;
    gap: var(--space-4);
  }

  .up-next {
    margin: 0;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-primary-subtle);
    color: var(--color-primary);
    font-weight: var(--font-weight-semibold);
  }

  .safety {
    margin: 0;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: 6px solid var(--color-accent);
    font-weight: var(--font-weight-medium);
  }

  @media (max-width: 1024px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
