<script lang="ts">
  import { formatValue, type FrameInspection } from "../analysis/inspection";
  import * as msg from "../messages";

  let { inspection }: { inspection: FrameInspection } = $props();
  let open = $state(true);

  const percent = (deg: number | null) => (deg === null ? 0 : Math.min(100, Math.max(0, (deg / 180) * 100)));
  const short = (joint: string) =>
    joint.replace("left_", "L ").replace("right_", "R ").replace("shoulder", "shldr").replace("ankle", "ankl");
</script>

<aside class="panel" aria-label={msg.DEV.title}>
  <header>
    <strong>{msg.DEV.title}</strong>
    <span>{inspection.fps} {msg.DEV.fps}</span>
    <button onclick={() => (open = !open)}>{open ? msg.DEV.hide : msg.DEV.show}</button>
  </header>
  {#if open}
    <p class="reading" class:bad={!inspection.reading.endsWith("°")}>{msg.DEV.reading}: {inspection.reading}</p>
    <div class="band" aria-hidden="true">
      <span class="zone-low" style:width="{percent(inspection.lowDeg)}%"></span>
      <span class="zone-high" style:left="{percent(inspection.highDeg)}%"></span>
      {#if inspection.smoothed !== null}
        <span class="needle" style:left="{percent(inspection.smoothed)}%"></span>
      {/if}
    </div>
    <dl class="state">
      <div><dt>{msg.DEV.smoothed}</dt><dd>{formatValue(inspection.smoothed)}°</dd></div>
      <div><dt>{msg.DEV.band}</dt><dd>{formatValue(inspection.lowDeg)} / {formatValue(inspection.highDeg)}</dd></div>
      <div><dt>{msg.DEV.range}</dt><dd>{inspection.rangeStatus}</dd></div>
      <div><dt>{msg.DEV.zone}</dt><dd>{inspection.zone}</dd></div>
      <div><dt>{msg.DEV.phase}</dt><dd>{inspection.phase}</dd></div>
      <div><dt>{msg.DEV.reps}</dt><dd>{inspection.reps} / {inspection.goal}</dd></div>
      <div><dt>{msg.DEV.blockedFor}</dt><dd>{formatValue(inspection.blockedForS)}s</dd></div>
    </dl>
    {#if inspection.details.length}
      <p class="heading">{msg.DEV.details}</p>
      <dl class="details">
        {#each inspection.details as [key, value] (key)}
          <div><dt>{key}</dt><dd>{value}</dd></div>
        {/each}
      </dl>
    {/if}
    <p class="heading">{msg.DEV.joints}</p>
    <ul class="joints">
      {#each inspection.joints as j (j.joint)}
        <li class:bad={!j.kept}>
          <span>{short(j.joint)}</span><span>{j.visibility === null ? "-" : Math.round(j.visibility * 100)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</aside>

<style>
  .panel {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    z-index: 2;
    width: min(340px, calc(100% - 2 * var(--space-3)));
    max-height: calc(100% - 2 * var(--space-3));
    overflow: auto;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--dev-surface);
    color: var(--dev-text);
    font: 12px / 1.4 var(--dev-font);
  }

  header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  header strong {
    flex: 1;
  }

  button {
    padding: 2px 8px;
    border: 1px solid currentColor;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .reading {
    margin: var(--space-2) 0 var(--space-1);
    color: var(--dev-ok);
    font-size: 15px;
    font-weight: 700;
  }

  .bad {
    color: var(--dev-bad);
  }

  .band {
    position: relative;
    height: 10px;
    margin-bottom: var(--space-2);
    border-radius: 2px;
    background: rgb(255 255 255 / 0.15);
  }

  .zone-low,
  .zone-high {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgb(159 216 181 / 0.35);
  }

  .zone-low {
    left: 0;
  }

  .zone-high {
    right: 0;
  }

  .needle {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 3px;
    margin-left: -1px;
    background: var(--dev-text);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px var(--space-3);
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }

  dt {
    opacity: 0.7;
  }

  dd {
    margin: 0;
    text-align: right;
  }

  .details {
    grid-template-columns: 1fr;
  }

  .heading {
    margin: var(--space-2) 0 var(--space-1);
    opacity: 0.7;
  }

  .joints {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2px var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .joints li {
    display: flex;
    justify-content: space-between;
  }
</style>
