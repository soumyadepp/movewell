<script lang="ts">
  import type { WeekDay } from "../analysis/progress";
  import * as msg from "../messages";

  let {
    days,
    onBand = false,
    showMinutes = false,
  }: { days: WeekDay[]; onBand?: boolean; showMinutes?: boolean } = $props();

  const short = (d: Date) => d.toLocaleDateString(undefined, { weekday: "narrow" });
  const long = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long" });
  const medium = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short" });
</script>

<ol class="week" class:band={onBand} class:columns={showMinutes}>
  {#each days as day, i (day.key)}
    <li aria-label="{long(day.date)}: {day.done ? msg.DAY_DONE : msg.DAY_NOT_YET}">
      {#if showMinutes}<span class="name" aria-hidden="true">{medium(day.date)}</span>{/if}
      <span
        class="circle"
        class:done={day.done}
        class:today={day.isToday}
        class:grow-in={day.done}
        style:--i={i}
        aria-hidden="true"
      >
        {#if day.done && showMinutes}
          <svg class="draw" style:--i={i} viewBox="0 0 24 24" width="28" height="28"
            ><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
          >
        {:else if !showMinutes}
          {short(day.date)}
        {/if}
      </span>
      {#if showMinutes}
        <span class="minutes" aria-hidden="true"
          >{day.isFuture ? "" : msg.DAY_MINUTES(day.done ? day.minutes : 0)}</span
        >
      {/if}
    </li>
  {/each}
</ol>

<style>
  .week {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: var(--space-2);
  }

  li {
    display: grid;
    justify-items: center;
    gap: var(--space-2);
  }

  .circle {
    display: grid;
    place-items: center;
    width: var(--day-size);
    height: var(--day-size);
    border-radius: 50%;
    background: var(--color-muted-fill);
    color: var(--color-text);
    font-weight: var(--weight-semibold);
    font-size: var(--type-label);
  }

  .circle.done {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  .circle.today:not(.done) {
    box-shadow: inset 0 0 0 3px var(--color-primary);
  }

  .band .circle {
    background: transparent;
    box-shadow: inset 0 0 0 2px rgb(243 238 228 / 0.6);
    color: var(--color-on-deep);
  }

  .band .circle.done {
    background: var(--color-on-deep);
    color: var(--color-primary);
    box-shadow: none;
  }

  .band .circle.today:not(.done) {
    box-shadow: inset 0 0 0 3px var(--color-on-deep);
  }

  svg path {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .name,
  .minutes {
    font-size: var(--type-small);
    font-weight: var(--weight-semibold);
  }

  .band .name,
  .band .minutes {
    color: var(--color-on-deep);
  }

  @media (max-width: 640px) {
    .week {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: var(--space-2);
    }

    li {
      min-width: 0;
    }

    .circle {
      width: 100%;
      max-width: var(--day-size);
      height: auto;
      align-self: start;
      aspect-ratio: 1;
    }
  }
</style>
