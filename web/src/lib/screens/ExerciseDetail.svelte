<script lang="ts">
  import ExerciseMedia from "../components/ExerciseMedia.svelte";
  import Segmented from "../components/Segmented.svelte";
  import { DEFAULT_GOAL, GOAL_OPTIONS } from "../config";
  import { href } from "../routing";
  import type { ExerciseMode } from "../domain/models";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";

  let { mode }: { mode: ExerciseMode } = $props();
  let target = $state(String(DEFAULT_GOAL));
  const exercise = $derived(getExercise(mode));
  const copy = $derived(exercise.copy);
  const targets = GOAL_OPTIONS.map((n) => ({ id: String(n), label: String(n) }));
</script>

<div class="container page">
  <div class="layout">
    <ExerciseMedia {exercise} />
    <div class="info">
      <a class="link" href={href.library}>← {msg.ALL_EXERCISES}</a>
      <h1>{copy.label}</h1>
      <p class="secondary small">{msg.VIEW_HINT(exercise.bestView)}</p>
      <ol class="steps">
        {#each copy.steps as step, i (i)}
          <li><span class="num" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
        {/each}
      </ol>
      <div class="notes">
        <div>
          <h2 class="note-title">{msg.WHY_IT_HELPS}</h2>
          <p>{copy.benefit}</p>
        </div>
        <div>
          <h2 class="note-title">{msg.TAKE_CARE}</h2>
          <p>{copy.safety}</p>
        </div>
      </div>
      <div class="start">
        <div class="how-many">
          <span class="note-title" id="how-many">{msg.HOW_MANY}</span>
          <Segmented label={msg.HOW_MANY} options={targets} value={target} onChange={(v) => (target = v)} />
        </div>
        <a class="btn btn-primary" href={href.single(mode, Number(target))}>{msg.START_EXERCISE}</a>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    padding-top: var(--space-12);
    padding-bottom: var(--space-14);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: var(--space-12);
    align-items: start;
  }

  .info {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }

  h1 {
    font-size: calc(56px * var(--text-scale));
  }

  .steps {
    display: grid;
    gap: var(--space-4);
    margin: var(--space-4) 0 0;
    padding: var(--space-6) 0 0;
    border-top: 1px solid var(--color-rule);
    list-style: none;
    width: 100%;
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
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
    font-size: var(--type-small);
  }

  .notes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-8);
    width: 100%;
    padding: var(--space-6) 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
  }

  .note-title {
    font-family: var(--font-text);
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
    letter-spacing: 0;
    margin-bottom: var(--space-2);
    display: block;
  }

  .start {
    display: grid;
    gap: var(--space-6);
    width: 100%;
    margin-top: var(--space-2);
  }

  .how-many {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .how-many .note-title {
    margin: 0;
  }

  @media (max-width: 900px) {
    .layout,
    .notes {
      grid-template-columns: 1fr;
    }
  }
</style>
