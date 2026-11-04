<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import CameraStage from "../components/CameraStage.svelte";
  import DevPanel from "../components/DevPanel.svelte";
  import ExerciseMedia from "../components/ExerciseMedia.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import { isCounted } from "../domain/models";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";
  import Handwritten from "../components/Handwritten.svelte";

  let { coach }: { coach: CoachController } = $props();
  let video = $state<HTMLVideoElement>();
  let canvas = $state<HTMLCanvasElement>();

  const s = $derived(coach.snapshot);
  const r = $derived(coach.routine);
  const running = $derived(coach.stage === "running");
  const phase = $derived(running ? (r?.phase ?? "exercise") : "camera");
  const step = $derived(r ? r.steps[Math.min(r.index, r.steps.length - 1)] : null);
  const exercise = $derived(step ? getExercise(step.mode) : isCounted(s.mode) ? getExercise(s.mode) : null);
  const next = $derived(r?.next ? getExercise(r.next.mode) : null);
  const position = $derived(r && !r.isSingle ? msg.NEXT_POSITION(r.index + 1, r.steps.length) : "");
  const progress = $derived(r ? (r.index / r.steps.length) * 100 : 0);
  const panelKey = $derived(`${phase === "rest" ? "exercise" : phase}-${r?.index ?? 0}`);
  const coachLine = $derived(coach.celebrating ? msg.TARGET_REACHED : phase === "rest" ? msg.REST : (s.guidance[0] ?? ""));
  const percent = $derived(Math.min(100, Math.round((s.reps / Math.max(1, s.goal)) * 100)));

  function start() {
    if (video && canvas) coach.start(video, canvas);
  }

  onMount(() => {
    if (coach.canAutoStart) start();
  });

  onDestroy(() => coach.stop());
</script>

<div class="session">
  {#if r && !r.isSingle}
    <div class="track" aria-hidden="true"><span style:width="{progress}%"></span></div>
  {/if}

  <div class="layout" class:intro={phase === "intro" || phase === "camera"}>
    <div class="left">
      <div class="stage-slot" class:hidden={phase === "intro" || phase === "camera"}>
        <CameraStage bind:video bind:canvas showHint={phase === "exercise" && !s.bodyDetected}>
          {#if coach.devMode && coach.inspection}
            <DevPanel inspection={coach.inspection} />
          {/if}
        </CameraStage>
        {#if phase === "rest" && r}
          <div class="rest fade-in" role="status" aria-live="polite">
            <p class="title">{msg.REST}</p>
            {#key r.restRemainingS}
              <p class="countdown"><Handwritten text={String(r.restRemainingS)} durationMs={600} scale={1.1} weight={36} /></p>
            {/key}
            {#if next}
              <p class="title">{msg.UP_NEXT(next.copy.label)}</p>
              <p>{msg.VIEW_HINT(next.bestView)}</p>
            {/if}
            <button class="btn btn-light" onclick={() => coach.skipRest()}>{msg.START_NOW}</button>
          </div>
        {/if}
      </div>
      {#if phase === "intro" && exercise}
        <ExerciseMedia {exercise} />
      {:else if phase === "camera"}
        <img class="photo" src="{import.meta.env.BASE_URL}img/setup-space.webp" alt="" />
      {/if}
    </div>

    {#key panelKey}
    <aside class="right enter">
      <p class="position">{position}</p>

      {#if phase === "camera"}
        <h1>{msg.CAMERA_OFF_TITLE}</h1>
        <p>{msg.CAMERA_OFF_BODY}</p>
        {#if coach.errorMessage}<p class="error" role="alert">{coach.errorMessage}</p>{/if}
        <button class="btn btn-light btn-block" onclick={start} disabled={coach.stage === "loading"} aria-busy={coach.stage === "loading"}>
          {coach.stage === "loading" ? msg.LOADING_MODEL : coach.stage === "error" ? msg.TRY_AGAIN : msg.SPACE_START}
        </button>
        <a class="btn btn-outline-light btn-block" href={href.home}>{msg.BACK}</a>
      {:else if phase === "intro" && exercise && step}
        <h1>{exercise.copy.label}</h1>
        <ol class="steps">
          {#each exercise.copy.steps as text, i (i)}
            <li class="enter" style:--i={i + 2}><span class="num" aria-hidden="true">{i + 1}</span><span>{text}</span></li>
          {/each}
        </ol>
        <p class="care">{msg.TAKE_CARE}: {exercise.copy.safety}</p>
        <p class="target">{msg.TIMES(step.target)}</p>
        <button class="btn btn-light btn-block" onclick={() => coach.beginExercise()}>{msg.READY}</button>
        <button class="btn btn-outline-light btn-block" onclick={() => coach.skipExercise()}>{msg.SKIP_THIS}</button>
      {:else if exercise}
        <h2 class="name">{exercise.copy.label}</h2>
        <p class="count" class:celebrating={coach.celebrating} aria-live="polite" aria-atomic="true">
          {#key s.reps}<span class="number"><Handwritten text={String(s.reps)} durationMs={450} scale={1.1} weight={36} /></span>{/key}<span class="of">{msg.OF(s.goal)}</span>
        </p>
        <div class="bar" class:celebrating={coach.celebrating} role="progressbar" aria-valuemin="0" aria-valuemax={s.goal} aria-valuenow={Math.min(s.reps, s.goal)}>
          <span style:width="{percent}%"></span>
        </div>
        {#key coachLine}<p class="coach fade-in">{coachLine}</p>{/key}
        <div class="end">
          {#if phase === "exercise" && r && !r.isSingle}
            <button class="link light" onclick={() => coach.skipExercise()}>{msg.SKIP_THIS}</button>
          {/if}
          <button class="btn btn-outline-light btn-block" onclick={() => coach.endSession()}>
            {r?.isSingle ? msg.FINISH : msg.END_SESSION}
          </button>
        </div>
      {/if}
    </aside>
    {/key}
  </div>
</div>

<style>
  .session {
    min-height: 100vh;
    background: var(--color-deep);
    color: var(--color-on-deep);
    display: flex;
    flex-direction: column;
  }

  .track {
    height: 6px;
    background: rgb(243 238 228 / 0.2);
  }

  .track span {
    display: block;
    height: 100%;
    background: var(--color-on-deep);
    transition: width var(--duration-bar) var(--ease-out);
  }

  .layout {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 65fr) minmax(0, 35fr);
    gap: var(--space-10);
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: var(--space-8) var(--gutter);
  }

  .layout.intro {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
  }

  .left {
    position: relative;
    min-height: 0;
    display: grid;
  }

  .stage-slot {
    position: relative;
    min-height: min(78vh, 760px);
  }

  .stage-slot.hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .left :global(.media),
  .left .photo {
    aspect-ratio: 4 / 3;
  }

  .rest {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    border-radius: var(--photo-radius);
    background: rgb(22 58 44 / 0.88);
    text-align: center;
  }

  .rest .title {
    font-family: var(--font-display);
    font-size: var(--type-title);
    font-weight: var(--weight-semibold);
  }

  .countdown {
    font-family: var(--font-accent);
    font-size: calc(var(--type-counter) * 1.4);
    font-style: italic;
    font-weight: 400;
    line-height: 0.9;
  }

  .rest .btn {
    margin-top: var(--space-4);
    min-width: 16rem;
  }

  .right {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    min-width: 0;
    justify-content: center;
  }

  .position {
    align-self: flex-end;
    min-height: 1.5em;
    font-size: var(--type-small);
    opacity: 0.85;
  }

  h1,
  .name {
    color: var(--color-on-deep);
  }

  h1 {
    font-size: calc(56px * var(--text-scale));
  }

  .name {
    font-size: var(--type-title);
  }

  .steps {
    display: grid;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .steps li {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
  }

  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-on-deep);
    color: var(--color-primary);
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--type-small);
  }

  .care {
    font-size: var(--type-small);
    opacity: 0.9;
  }

  .target {
    font-family: var(--font-display);
    font-size: calc(28px * var(--text-scale));
    font-weight: var(--weight-semibold);
  }

  .count {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .number {
    font-family: var(--font-accent);
    font-size: calc(var(--type-counter) * 1.25);
    font-style: italic;
    font-weight: 400;
    line-height: 0.85;
    letter-spacing: -0.01em;
  }

  .of {
    font-size: var(--type-title);
    font-weight: var(--weight-semibold);
  }

  .bar {
    height: 14px;
    border-radius: var(--radius-full);
    background: rgb(243 238 228 / 0.2);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--color-on-deep);
    transition:
      width var(--duration-bar) var(--ease-out),
      background var(--duration-slow) var(--ease);
  }

  .bar.celebrating span {
    background: var(--color-celebrate-on-deep);
  }

  .number {
    transition: color var(--duration-slow) var(--ease);
  }

  .celebrating .number {
    color: var(--color-celebrate-on-deep);
  }

  .coach {
    font-size: var(--type-lead);
    font-weight: var(--weight-medium);
    min-height: 3em;
  }

  .end {
    display: grid;
    gap: var(--space-3);
    margin-top: auto;
  }

  .light {
    color: var(--color-on-deep);
    justify-self: start;
  }

  .error {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-warning-surface);
    color: var(--color-warning);
    font-size: var(--type-small);
  }

  @media (max-width: 900px) {
    .layout,
    .layout.intro {
      grid-template-columns: 1fr;
    }

    .stage-slot {
      min-height: 52vh;
    }
  }
</style>
