<script lang="ts">
  import { dailyReps, weekSummary } from "../analysis/progress";
  import AboutPanel from "../components/AboutPanel.svelte";
  import BarChart from "../components/BarChart.svelte";
  import StatTile from "../components/StatTile.svelte";
  import type { CoachController } from "../controller.svelte";
  import { COUNTED_EXERCISES, type CountedExercise, isCounted } from "../domain/models";
  import { getExercise, POSTURE_LABEL } from "../exercises";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();
  let selected = $state<CountedExercise>(COUNTED_EXERCISES[0]);

  const today = new Date();
  const week = $derived(weekSummary(coach.history, today));
  const points = $derived(dailyReps(coach.history, selected, today, 14));
  const recent = $derived([...coach.history].reverse().slice(0, 8));
  const when = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const label = (exercise: string) =>
    COUNTED_EXERCISES.find((m) => m === exercise) ? getExercise(exercise as CountedExercise).copy.label : POSTURE_LABEL;
</script>

<div class="progress">
  <header>
    <h1>{msg.NAV_PROGRESS}</h1>
    <p class="lead">{msg.PROGRESS_LEAD}</p>
  </header>

  <section class="stats" aria-label={msg.NAV_PROGRESS}>
    <StatTile label={msg.STAT_STREAK} value={coach.streak} unit={msg.STAT_STREAK_UNIT(coach.streak)} />
    <StatTile label={msg.STAT_WEEK_DAYS} value={week.activeDays} unit="/ 7" />
    <StatTile label={msg.STAT_WEEK_REPS} value={week.reps} />
    <StatTile label={msg.STAT_WEEK_MINUTES} value={week.minutes} />
  </section>

  <section class="card chart-card">
    <div class="filters" role="group" aria-labelledby="chart-pick">
      <span id="chart-pick" class="eyebrow">{msg.CHART_PICK}</span>
      {#each COUNTED_EXERCISES as mode (mode)}
        <button class="chip" aria-pressed={selected === mode} onclick={() => (selected = mode)}>
          {getExercise(mode).copy.label}
        </button>
      {/each}
    </div>
    <BarChart title={msg.CHART_TITLE(getExercise(selected).copy.label)} {points} />
  </section>

  <section class="card" aria-labelledby="recent-title">
    <h2 id="recent-title">{msg.RECENT_TITLE}</h2>
    {#if recent.length === 0}
      <p class="empty">{msg.RECENT_EMPTY}</p>
    {:else}
      <ul class="recent">
        {#each recent as record, i (i)}
          <li>
            <span class="name">{label(record.exercise)}</span>
            <span class="reps">{isCounted(record.exercise as never) ? `${record.repetitions} ${msg.REPS_LABEL}` : ""}</span>
            <span class="when">{when(record.date_time)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <AboutPanel
    totalSessions={coach.history.length}
    onDownload={() => coach.downloadHistory()}
    onClear={() => coach.clearHistory()}
  />
</div>

<style>
  .progress {
    display: grid;
    gap: var(--space-6);
  }

  h1 {
    font-size: var(--font-size-4xl);
  }

  h2 {
    font-size: var(--font-size-xl);
  }

  .lead {
    margin: var(--space-2) 0 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-lg);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--space-4);
  }

  .chart-card {
    display: grid;
    gap: var(--space-5);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .filters .eyebrow {
    margin-right: var(--space-2);
  }

  .chip {
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-full);
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font: var(--button-font);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .chip[aria-pressed="true"] {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-on-primary);
  }

  .recent {
    margin: var(--space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  .recent li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .recent li:last-child {
    border-bottom: none;
  }

  .name {
    font-weight: var(--font-weight-semibold);
  }

  .reps {
    font-variant-numeric: tabular-nums;
  }

  .when {
    color: var(--color-text-muted);
    min-width: 12rem;
    text-align: right;
  }

  .empty {
    margin: var(--space-3) 0 0;
    color: var(--color-text-muted);
  }

  @media (max-width: 640px) {
    .recent li {
      grid-template-columns: 1fr auto;
    }

    .when {
      grid-column: 1 / -1;
      text-align: left;
    }
  }
</style>
