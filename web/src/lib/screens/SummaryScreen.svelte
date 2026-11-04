<script lang="ts">
  import { currentWeek } from "../analysis/progress";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";
  import Handwritten from "../components/Handwritten.svelte";

  let { coach }: { coach: CoachController } = $props();
  const summary = $derived(coach.summary);
  const days = $derived(currentWeek(coach.history, new Date()).filter((d) => d.done).length);
  const minutes = $derived(Math.max(1, Math.round((summary?.totalS ?? 0) / 60)));
</script>

<div class="split">
  <section class="panel">
    <h1 class="enter" style:--i={1}><span class="accent"><Handwritten text={msg.DONE_ACCENT} delayMs={250} /></span>{msg.DONE_REST(coach.displayName)}</h1>
    {#if summary && summary.totalReps > 0}
      <p class="stats enter" style:--i={3}>{msg.DONE_STATS(summary.totalReps, minutes)}</p>
      <p class="lead enter" style:--i={4}>{msg.DONE_WEEK(days)}</p>
    {:else}
      <p class="lead enter" style:--i={3}>{msg.DONE_EMPTY}</p>
    {/if}
  </section>

  <section class="details">
    {#if summary && summary.results.length}
      <h2>{msg.DONE_LIST}</h2>
      <ul class="list">
        {#each summary.results as result, i (i)}
          <li class="enter" style:--i={i + 3}>
            <span class="check" class:partial={!result.completed} aria-hidden="true">
              {#if result.completed}
                <svg class="draw" style:--i={i + 3} viewBox="0 0 24 24" width="24" height="24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {/if}
            </span>
            <span class="name">{getExercise(result.mode).copy.label}</span>
            <span class="result">
              {msg.RESULT(result.reps, result.target)}
              {#if !result.completed}<span class="secondary small">{msg.PARTLY_DONE}</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="secondary physio">{msg.PHYSIO_CAN_SEE}</p>
    <a class="btn btn-primary btn-block" href={href.home}>{msg.FINISH}</a>
  </section>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    min-height: calc(100vh - var(--header-height));
  }

  .panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-5);
    padding: var(--space-14) var(--gutter);
    background: var(--color-celebrate);
    color: var(--color-on-celebrate);
  }

  h1 {
    color: var(--color-on-celebrate);
  }

  .stats {
    font-size: calc(28px * var(--text-scale));
    font-weight: var(--weight-semibold);
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    justify-content: center;
    padding: var(--space-14) var(--gutter);
    max-width: 44rem;
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--color-rule);
  }

  .list li {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--color-rule);
  }

  .check {
    flex: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .check.partial {
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--color-rule);
  }

  .check path {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .name {
    flex: 1;
    font-weight: var(--weight-semibold);
  }

  .result {
    display: grid;
    justify-items: end;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 900px) {
    .split {
      grid-template-columns: 1fr;
    }
  }
</style>
