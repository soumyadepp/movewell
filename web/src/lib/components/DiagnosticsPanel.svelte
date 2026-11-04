<script lang="ts">
  import type { CoachController } from "../controller.svelte";
  import { isCounted } from "../domain/models";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();

  const s = $derived(coach.snapshot);
  const angleLabel = $derived(isCounted(s.mode) ? getExercise(s.mode).copy.angleLabel : "");
</script>

<details class="panel">
  <summary>{msg.DIAGNOSTICS_TITLE}</summary>

  <label class="toggle">
    <input type="checkbox" checked={coach.showSkeleton} onchange={(e) => coach.setShowSkeleton(e.currentTarget.checked)} />
    <span>{msg.DIAGNOSTICS_SKELETON}</span>
  </label>

  <dl>
    <div>
      <dt>{msg.DIAGNOSTICS_FPS(coach.diagnostics.fps)}</dt>
    </div>
    {#if angleLabel}
      <div>
        <dt>{msg.DIAGNOSTICS_ANGLE(angleLabel, s.angle === null ? msg.ANGLE_UNKNOWN : `${Math.round(s.angle)}°`)}</dt>
      </div>
    {/if}
    <div>
      <dt>{msg.DIAGNOSTICS_GUIDANCE}:</dt>
      <dd>{s.guidance[0] ?? ""}</dd>
    </div>
  </dl>

  <div class="record">
    <button class="btn" class:recording={coach.recording} onclick={() => coach.toggleRecording()}>
      {coach.recording ? msg.DIAGNOSTICS_STOP(coach.diagnostics.framesRecorded) : msg.DIAGNOSTICS_RECORD}
    </button>
    <p>{msg.DIAGNOSTICS_RECORD_NOTE}</p>
  </div>
</details>

<style>
  .panel {
    padding: var(--space-3) var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    cursor: pointer;
  }

  .toggle input {
    width: 22px;
    height: 22px;
    accent-color: var(--color-primary);
  }

  dl {
    display: grid;
    gap: var(--space-1);
    margin: var(--space-2) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  dl div {
    display: flex;
    gap: var(--space-2);
  }

  dd {
    margin: 0;
    color: var(--color-text);
  }

  .record p {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .recording {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
