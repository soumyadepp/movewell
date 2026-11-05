<script lang="ts">
  import { currentWeek } from "../analysis/progress";
  import WeekRow from "../components/WeekRow.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../routing";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";
  import Handwritten from "../components/Handwritten.svelte";
  import { estimatedMinutes, isPhysioPlan } from "../routine";

  let { coach }: { coach: CoachController } = $props();

  const week = $derived(currentWeek(coach.history, new Date()));
  const activeDays = $derived(week.filter((d) => d.done).length);
  const doneToday = $derived(week.some((d) => d.isToday && d.done));
  const exerciseList = $derived(coach.plan.steps.map((s) => getExercise(s.mode).copy.label).join(", "));
  const hero = $derived(getExercise(coach.plan.steps[0].mode));
</script>

<section class="band">
  <div class="container hero">
    <div class="hero-text">
      <h1>
        {msg.GREETING_HELLO(new Date().getHours())}
        <span class="accent"><Handwritten text={msg.GREETING_NAME(coach.displayName)} delayMs={300} /></span>
      </h1>
      <p class="lead">{doneToday ? msg.SESSION_DONE_TODAY : msg.SESSION_LENGTH(estimatedMinutes(coach.plan))}</p>
      <p class="list">{exerciseList}</p>
      <a class="btn btn-light start" href={href.routine}>{doneToday ? msg.START_AGAIN : msg.START_SESSION}</a>
    </div>
    <img class="photo hero-photo fade-in" src="{import.meta.env.BASE_URL}img/{hero.photo}" alt="" />
  </div>
</section>

<section class="container week">
  <h2>{msg.THIS_WEEK}</h2>
  <WeekRow days={week} />
  <p class="progress">{msg.WEEK_PROGRESS(activeDays)}</p>
  <div class="foot">
    <p class="secondary small">
      {isPhysioPlan(coach.plan) ? msg.PLAN_BY : msg.PLAN_CUSTOM}
      <a class="link" href={href.plan}>{msg.PLAN_EDIT}</a>
    </p>
    <a class="link" href={href.setup("space")}>{msg.SPACE_TITLE}</a>
  </div>
</section>

<style>
  .band {
    background: var(--color-primary);
    color: var(--color-on-deep);
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--space-12);
    align-items: center;
    padding-top: var(--space-14);
    padding-bottom: var(--space-14);
  }

  .hero-text {
    display: grid;
    gap: var(--space-4);
    justify-items: start;
  }

  h1 {
    color: var(--color-on-deep);
  }

  .list {
    opacity: 0.9;
    max-width: 34rem;
  }

  .start {
    margin-top: var(--space-6);
    min-width: 18rem;
  }

  .hero-photo {
    aspect-ratio: 4 / 3;
  }

  .week {
    display: grid;
    gap: var(--space-6);
    padding-top: var(--space-14);
    padding-bottom: var(--space-14);
  }

  .progress {
    font-size: var(--type-label);
    font-weight: var(--weight-semibold);
  }

  .foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-rule);
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }
</style>
