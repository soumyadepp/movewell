<script lang="ts">
  import { tick } from "svelte";
  import { flip } from "svelte/animate";
  import ExerciseMedia from "../components/ExerciseMedia.svelte";
  import Segmented from "../components/Segmented.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import type { CountedExercise } from "../domain/models";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";
  import {
    addableExercises,
    addStep,
    estimatedMinutes,
    isPhysioPlan,
    moveStep,
    REST_CHOICES,
    removeStep,
    setRest,
    setTarget,
    targetChoices,
  } from "../routine";

  let { coach }: { coach: CoachController } = $props();

  const plan = $derived(coach.plan);
  const addable = $derived(addableExercises(plan));
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let announcement = $state("");

  async function move(index: number, by: -1 | 1, name: string) {
    const next = moveStep(plan, index, by);
    coach.updatePlan(next);
    const position = index + by;
    announcement = msg.PLAN_MOVED(name, position + 1, next.steps.length);
    await tick();
    const same = document.querySelector<HTMLButtonElement>(
      `[aria-label="${by < 0 ? msg.PLAN_MOVE_UP(name) : msg.PLAN_MOVE_DOWN(name)}"]`,
    );
    const other = document.querySelector<HTMLButtonElement>(
      `[aria-label="${by < 0 ? msg.PLAN_MOVE_DOWN(name) : msg.PLAN_MOVE_UP(name)}"]`,
    );
    (same && !same.disabled ? same : other)?.focus();
  }

  const restOptions = REST_CHOICES.map((s) => ({ id: s, label: msg.PLAN_SECONDS(s) }));
  const timesOptions = (mode: CountedExercise) => targetChoices(mode).map((n) => ({ id: n, label: String(n) }));
</script>

<div class="container page">
  <h1>{msg.PLAN_TITLE}</h1>
  <p class="lead secondary">{msg.PLAN_LEAD}</p>
  <p class="sr-only" aria-live="polite">{announcement}</p>
  <p class="summary" aria-live="polite">{msg.PLAN_SUMMARY(plan.steps.length, estimatedMinutes(plan))}</p>

  <ol class="steps">
    {#each plan.steps as step, i (step.mode)}
      {@const exercise = getExercise(step.mode)}
      <li animate:flip={{ duration: reducedMotion ? 0 : 260 }}>
        <span class="num" aria-hidden="true">{i + 1}</span>
        <div class="thumb"><ExerciseMedia {exercise} animate={false} /></div>
        <div class="main">
          <h2>{exercise.copy.label}</h2>
          <div class="times">
            <span class="secondary small">{msg.PLAN_TIMES}</span>
            <Segmented
              label="{msg.PLAN_TIMES}, {exercise.copy.label}"
              options={timesOptions(step.mode)}
              value={step.target}
              onChange={(n: number) => coach.updatePlan(setTarget(plan, i, n))}
            />
          </div>
        </div>
        <div class="order">
          <button
            class="icon"
            aria-label={msg.PLAN_MOVE_UP(exercise.copy.label)}
            disabled={i === 0}
            onclick={() => move(i, -1, exercise.copy.label)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
          </button>
          <button
            class="icon"
            aria-label={msg.PLAN_MOVE_DOWN(exercise.copy.label)}
            disabled={i === plan.steps.length - 1}
            onclick={() => move(i, 1, exercise.copy.label)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <button
            class="link remove"
            aria-label={msg.PLAN_REMOVE(exercise.copy.label)}
            disabled={plan.steps.length <= 1}
            onclick={() => coach.updatePlan(removeStep(plan, i))}>{msg.PLAN_REMOVE_SHORT}</button
          >
        </div>
      </li>
    {/each}
  </ol>

  <section class="block">
    <h2>{msg.PLAN_ADD}</h2>
    {#if addable.length}
      <div class="add">
        {#each addable as mode (mode)}
          <button class="btn btn-secondary" onclick={() => coach.updatePlan(addStep(plan, mode))}>
            + {getExercise(mode).copy.label}
          </button>
        {/each}
      </div>
    {:else}
      <p class="secondary">{msg.PLAN_ALL_ADDED}</p>
    {/if}
  </section>

  <section class="block rest">
    <h2>{msg.PLAN_REST}</h2>
    <Segmented
      label={msg.PLAN_REST}
      options={restOptions}
      value={plan.restS}
      onChange={(s: number) => coach.updatePlan(setRest(plan, s))}
    />
  </section>

  <div class="actions">
    {#if !isPhysioPlan(plan)}
      <button class="link" onclick={() => coach.resetPlan()}>{msg.PLAN_RESET}</button>
    {:else}
      <span></span>
    {/if}
    <a class="btn btn-primary" href={href.home}>{msg.PLAN_DONE}</a>
  </div>
</div>

<style>
  .page {
    max-width: 60rem;
    padding-top: var(--space-12);
    padding-bottom: var(--space-14);
  }

  .lead {
    margin-top: var(--space-3);
  }

  .summary {
    margin: var(--space-5) 0 var(--space-4);
    font-weight: var(--weight-semibold);
  }

  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--color-rule);
  }

  li {
    display: grid;
    grid-template-columns: auto 120px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-5);
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--color-rule);
    background: var(--color-bg);
  }

  .num {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
  }

  .thumb {
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: var(--radius-md);
  }

  .main {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  h2 {
    font-size: var(--type-subtitle);
  }

  .times {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  .order {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .icon {
    display: grid;
    place-items: center;
    width: var(--control-height);
    height: var(--control-height);
    border: 2px solid var(--color-rule);
    border-radius: var(--button-radius);
    background: var(--color-surface);
    color: var(--color-primary);
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--ease),
      border-color var(--duration-fast) var(--ease);
  }

  .icon:hover:not(:disabled) {
    border-color: var(--color-primary);
  }

  .icon:disabled,
  .remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .icon svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .remove {
    margin-left: var(--space-3);
  }

  .block {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-10);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-12);
  }

  .actions .btn {
    min-width: 14rem;
  }

  @media (max-width: 760px) {
    li {
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-areas:
        "num main"
        "order order";
      row-gap: var(--space-4);
    }

    .num {
      grid-area: num;
    }

    .thumb {
      display: none;
    }

    .main {
      grid-area: main;
    }

    .order {
      grid-area: order;
      justify-content: flex-start;
    }

    .actions .btn {
      width: 100%;
    }
  }
</style>
