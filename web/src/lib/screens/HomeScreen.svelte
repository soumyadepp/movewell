<script lang="ts">
  import { weekSummary } from "../analysis/progress";
  import Pictogram from "../components/Pictogram.svelte";
  import StatTile from "../components/StatTile.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import { COUNTED_EXERCISES } from "../domain/models";
  import { ILLUSTRATIONS, POSTURE_ILLUSTRATION } from "../illustrations";
  import * as msg from "../messages";
  import { DAILY_ROUTINE, estimatedMinutes } from "../routine";

  let { coach }: { coach: CoachController } = $props();

  const week = $derived(weekSummary(coach.history, new Date()));
  const streak = $derived(coach.streak);
  const greeting = msg.GREETING(new Date().getHours());
</script>

<div class="home">
  <section class="hero card" aria-labelledby="routine-title">
    <div class="hero-text">
      <p class="eyebrow">{greeting}</p>
      <h1>{msg.HOME_LEAD}</h1>
      <h2 id="routine-title" class="routine-title">{msg.ROUTINE_TITLE}</h2>
      <p class="meta">{msg.ROUTINE_META(DAILY_ROUTINE.steps.length, estimatedMinutes(DAILY_ROUTINE))}</p>
      <ol class="steps">
        {#each DAILY_ROUTINE.steps as step, i (step.mode)}
          <li>
            <span class="num" aria-hidden="true">{i + 1}</span>
            <span class="name">{msg.EXERCISE_COPY[step.mode].label}</span>
            <span class="target">{msg.ROUTINE_TARGET(step.target)}</span>
          </li>
        {/each}
      </ol>
      <a class="btn btn-primary btn-lg" href={href.routine}>{msg.ROUTINE_START}</a>
    </div>
    <div class="hero-figure" aria-hidden="true">
      <Pictogram illustration={ILLUSTRATIONS[DAILY_ROUTINE.steps[0].mode]} label="" size={220} />
    </div>
  </section>

  <section class="stats" aria-label={msg.NAV_PROGRESS}>
    <StatTile label={msg.STAT_STREAK} value={streak} unit={msg.STAT_STREAK_UNIT(streak)} />
    <StatTile label={msg.STAT_WEEK_DAYS} value={week.activeDays} unit="/ 7" />
    <StatTile label={msg.STAT_WEEK_REPS} value={week.reps} />
  </section>

  <section aria-labelledby="explore-title">
    <div class="section-head">
      <h2 id="explore-title">{msg.EXPLORE_TITLE}</h2>
      <a href={href.library}>{msg.EXPLORE_ALL}</a>
    </div>
    <ul class="grid">
      {#each COUNTED_EXERCISES as mode (mode)}
        <li>
          <a class="tile card" href={href.detail(mode)}>
            <Pictogram illustration={ILLUSTRATIONS[mode]} label="" animate={false} size={72} />
            <span class="tile-name">{msg.EXERCISE_COPY[mode].label}</span>
          </a>
        </li>
      {/each}
      <li>
        <a class="tile card" href={href.posture}>
          <Pictogram illustration={POSTURE_ILLUSTRATION} label="" animate={false} size={72} />
          <span class="tile-name">{msg.POSTURE_LABEL}</span>
        </a>
      </li>
    </ul>
  </section>
</div>

<style>
  .home {
    display: grid;
    gap: var(--space-8);
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-8) var(--space-10);
  }

  h1 {
    margin-top: var(--space-2);
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
  }

  .routine-title {
    margin-top: var(--space-6);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
  }

  .meta {
    margin: var(--space-1) 0 var(--space-4);
    color: var(--color-text-muted);
  }

  .steps {
    display: grid;
    gap: var(--space-2);
    margin: 0 0 var(--space-6);
    padding: 0;
    list-style: none;
    max-width: 30rem;
  }

  .steps li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
  }

  .num {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--color-primary-subtle);
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
  }

  .name {
    flex: 1;
    font-weight: var(--font-weight-medium);
  }

  .target {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .hero-figure {
    display: grid;
    place-items: center;
    width: 280px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--color-primary-subtle);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--space-4);
  }

  .section-head h2 {
    font-size: var(--font-size-2xl);
  }

  .section-head a {
    font-weight: var(--font-weight-semibold);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr));
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    height: 100%;
    padding: var(--space-4);
    color: var(--color-text);
    text-decoration: none;
    text-align: center;
    transition: border-color var(--duration-fast) var(--easing-standard);
  }

  .tile:hover {
    border-color: var(--color-primary);
  }

  .tile-name {
    font-weight: var(--font-weight-semibold);
  }

  @media (max-width: 760px) {
    .hero {
      grid-template-columns: 1fr;
      padding: var(--space-6);
    }

    .hero-figure {
      display: none;
    }

    .stats {
      grid-template-columns: 1fr;
    }
  }
</style>
