<script lang="ts">
  import Pictogram from "../components/Pictogram.svelte";
  import { DEFAULT_GOAL, GOAL_OPTIONS } from "../config";
  import { href } from "../controller.svelte";
  import { type CountedExercise, ViewMode } from "../domain/models";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";

  let { mode }: { mode: CountedExercise } = $props();
  let target = $state<number>(DEFAULT_GOAL);
  const exercise = $derived(getExercise(mode));
  const copy = $derived(exercise.copy);
</script>

<article class="detail">
  <a class="back" href={href.library}>← {msg.BACK_TO_LIBRARY}</a>

  <div class="layout">
    <div class="demo card">
      <Pictogram illustration={exercise.illustration} label={msg.DEMO_LABEL(copy.label)} size={260} />
      <span class="view">{exercise.bestView === ViewMode.Side ? msg.VIEW_SIDE_LABEL : msg.VIEW_FRONT_LABEL}</span>
    </div>

    <div class="info">
      <h1>{copy.label}</h1>
      <p class="summary">{copy.summary}</p>

      <section class="card">
        <h2 class="eyebrow">{msg.DETAIL_STEPS}</h2>
        <ol class="how">
          {#each copy.steps as step, i (i)}
            <li><span class="num" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
          {/each}
        </ol>
      </section>

      <div class="pair">
        <section class="card">
          <h2 class="eyebrow">{msg.DETAIL_BENEFIT}</h2>
          <p>{copy.benefit}</p>
        </section>
        <section class="card safety">
          <h2 class="eyebrow">{msg.DETAIL_SAFETY}</h2>
          <p>{copy.safety}</p>
        </section>
      </div>

      <div class="start">
        <div class="targets" role="group" aria-labelledby="target-label">
          <span id="target-label" class="eyebrow">{msg.DETAIL_TARGET}</span>
          {#each GOAL_OPTIONS as option (option)}
            <button class="target" aria-pressed={target === option} onclick={() => (target = option)}>{option}</button>
          {/each}
        </div>
        <a class="btn btn-primary btn-lg" href={href.single(mode, target)}>{msg.DETAIL_START}</a>
      </div>
    </div>
  </div>
</article>

<style>
  .detail {
    display: grid;
    gap: var(--space-4);
  }

  .back {
    font-weight: var(--font-weight-semibold);
    text-decoration: none;
    width: fit-content;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
    gap: var(--space-8);
    align-items: start;
  }

  .demo {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
    background: var(--color-primary-subtle);
    position: sticky;
    top: var(--space-6);
  }

  .view {
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
  }

  .info {
    display: grid;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--font-size-4xl);
  }

  .summary {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
  }

  .how {
    display: grid;
    gap: var(--space-3);
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  .how li {
    display: flex;
    gap: var(--space-3);
    align-items: baseline;
    font-size: var(--font-size-lg);
  }

  .num {
    font-family: var(--font-family-display);
    font-style: italic;
    font-size: var(--font-size-2xl);
    color: var(--color-primary);
    min-width: 1.25rem;
  }

  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .pair p {
    margin: var(--space-2) 0 0;
  }

  .safety {
    border-left: 6px solid var(--color-accent);
  }

  .start {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-2);
  }

  .targets {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .target {
    min-width: 56px;
    min-height: 48px;
    border-radius: var(--radius-full);
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font: var(--button-font);
    cursor: pointer;
  }

  .target[aria-pressed="true"] {
    border-color: var(--color-primary);
    background: var(--color-primary-subtle);
  }

  @media (max-width: 860px) {
    .layout,
    .pair {
      grid-template-columns: 1fr;
    }

    .demo {
      position: static;
    }
  }
</style>
