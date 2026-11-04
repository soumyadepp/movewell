<script lang="ts">
  import type { DailyPoint } from "../analysis/progress";
  import * as msg from "../messages";

  let { title, points }: { title: string; points: DailyPoint[] } = $props();

  const WIDTH = 640;
  const HEIGHT = 240;
  const PAD = { top: 16, right: 8, bottom: 32, left: 36 };
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  let active = $state<number | null>(null);
  let showTable = $state(false);

  const niceMax = (value: number) => {
    if (value <= 5) return 5;
    const step = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / step) * step;
  };
  const max = $derived(niceMax(Math.max(0, ...points.map((p) => p.reps))));
  const ticks = $derived([0, max / 2, max]);
  const slot = $derived(plotW / Math.max(1, points.length));
  const barW = $derived(Math.max(6, slot - 2 * Math.max(2, slot * 0.18)));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const label = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const weekday = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
  const empty = $derived(points.every((p) => p.reps === 0));

  function barPath(x: number, top: number, w: number, bottom: number) {
    const r = Math.min(4, w / 2, bottom - top);
    if (r <= 0) return "";
    return `M${x} ${bottom} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + w - r} Q${x + w} ${top} ${x + w} ${top + r} V${bottom} Z`;
  }
</script>

<figure class="chart">
  <figcaption class="title">{title}</figcaption>

  {#if empty}
    <p class="empty">{msg.CHART_EMPTY}</p>
  {:else}
    <div class="plot">
      <svg viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label={title}>
        {#each ticks as tick (tick)}
          <line class="grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text class="axis" x={PAD.left - 8} y={y(tick) + 4} text-anchor="end">{tick}</text>
        {/each}
        {#each points as point, i (point.day)}
          {@const x = PAD.left + i * slot + (slot - barW) / 2}
          <g
            class="bar-group"
            role="button"
            tabindex="0"
            aria-label={msg.CHART_TOOLTIP(label(point.day), point.reps)}
            onpointerenter={() => (active = i)}
            onpointerleave={() => (active = null)}
            onfocus={() => (active = i)}
            onblur={() => (active = null)}
          >
            <rect class="hit" x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} />
            {#if point.reps > 0}
              <path class="bar" class:dim={active !== null && active !== i} d={barPath(x, y(point.reps), barW, y(0))} />
            {/if}
          </g>
          <text class="axis" x={x + barW / 2} y={HEIGHT - 10} text-anchor="middle">{weekday(point.day)}</text>
        {/each}
        <line class="baseline" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>
      {#if active !== null}
        {@const point = points[active]}
        <div
          class="tooltip"
          role="status"
          style:left="{((PAD.left + active * slot + slot / 2) / WIDTH) * 100}%"
          style:top="{(y(point.reps) / HEIGHT) * 100}%"
        >
          <strong>{point.reps}</strong> {msg.REPS_LABEL}<br /><span>{label(point.day)}</span>
        </div>
      {/if}
    </div>

    <details class="table" bind:open={showTable}>
      <summary>{msg.CHART_TABLE}</summary>
      <table>
        <thead><tr><th scope="col">{msg.CHART_DAY}</th><th scope="col">{msg.SUMMARY_REPS}</th></tr></thead>
        <tbody>
          {#each points as point (point.day)}
            <tr><td>{label(point.day)}</td><td>{point.reps}</td></tr>
          {/each}
        </tbody>
      </table>
    </details>
  {/if}
</figure>

<style>
  .chart {
    margin: 0;
  }

  .title {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-3);
  }

  .plot {
    position: relative;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .grid {
    stroke: var(--chart-grid);
    stroke-width: 1;
    stroke-dasharray: 2 4;
  }

  .baseline {
    stroke: var(--color-text-muted);
    stroke-width: 1;
  }

  .axis {
    fill: var(--color-text-muted);
    font-size: 13px;
    font-family: var(--font-family-sans);
  }

  .hit {
    fill: transparent;
  }

  .bar-group {
    cursor: default;
    outline: none;
  }

  .bar-group:focus-visible .hit {
    stroke: var(--color-focus);
    stroke-width: 2;
  }

  .bar {
    fill: var(--chart-bar);
    transition: opacity var(--duration-fast) var(--easing-standard);
  }

  .bar.dim {
    opacity: 0.45;
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, calc(-100% - 10px));
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    background: var(--color-text);
    color: var(--color-bg);
    font-size: var(--font-size-sm);
    line-height: 1.3;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: var(--shadow-raised);
  }

  .tooltip span {
    opacity: 0.8;
  }

  .empty {
    margin: 0;
    padding: var(--space-8) 0;
    color: var(--color-text-muted);
    text-align: center;
  }

  .table {
    margin-top: var(--space-3);
  }

  .table summary {
    cursor: pointer;
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
  }

  table {
    margin-top: var(--space-2);
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  th,
  td {
    padding: var(--space-1) var(--space-4) var(--space-1) 0;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }
</style>
