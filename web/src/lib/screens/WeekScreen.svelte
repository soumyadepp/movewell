<script lang="ts">
  import { currentWeek, dayKey, recentDays } from "../analysis/progress";
  import WeekRow from "../components/WeekRow.svelte";
  import type { CoachController } from "../controller.svelte";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();

  const today = new Date();
  const week = $derived(currentWeek(coach.history, today));
  const activeDays = $derived(week.filter((d) => d.done).length);
  const recent = $derived(recentDays(coach.history, 8));
  const label = (d: Date) =>
    dayKey(d) === dayKey(today)
      ? `${msg.TODAY_LABEL}, ${d.toLocaleDateString(undefined, { weekday: "long" })}`
      : d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
</script>

<div class="container head">
  <h1>{msg.WEEK_TITLE}</h1>
</div>
<section class="band">
  <div class="container">
    <WeekRow days={week} onBand showMinutes />
  </div>
</section>
<div class="container body">
  <p class="progress">{msg.WEEK_PROGRESS(activeDays)}</p>
  <h2>{msg.RECENT_SESSIONS}</h2>
  {#if recent.length === 0}
    <p class="secondary">{msg.NO_SESSIONS}</p>
  {:else}
    <ul class="list">
      {#each recent as day, i (day.key)}
        <li class="enter" style:--i={i + 2}>
          <span class="date">{label(day.date)}</span>
          <span>{msg.SESSION_MINUTES(day.minutes)}</span>
          <span class="secondary">{msg.SESSION_EXERCISES(day.exercises)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .head {
    padding-top: var(--space-12);
    padding-bottom: var(--space-8);
  }

  .band {
    background: var(--color-primary);
    padding: var(--space-10) 0;
  }

  .body {
    display: grid;
    gap: var(--space-6);
    padding-top: var(--space-10);
    padding-bottom: var(--space-14);
  }

  .progress {
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
  }

  h2 {
    margin-top: var(--space-4);
  }

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--color-rule);
  }

  .list li {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--space-4);
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--color-rule);
  }

  .date {
    font-weight: var(--weight-semibold);
  }

  @media (max-width: 700px) {
    .list li {
      grid-template-columns: 1fr 1fr;
    }

    .date {
      grid-column: 1 / -1;
    }
  }
</style>
