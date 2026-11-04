<script lang="ts">
  import * as msg from "../messages";

  let {
    elapsedSeconds,
    timerRunning,
    statusMessage,
    totalSessions,
    recentAverageReps,
    showAverage,
    onToggleTimer,
    onSave,
  }: {
    elapsedSeconds: number;
    timerRunning: boolean;
    statusMessage: string;
    totalSessions: number;
    recentAverageReps: number;
    showAverage: boolean;
    onToggleTimer: () => void;
    onSave: () => void;
  } = $props();

  const clock = $derived(
    `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`,
  );
</script>

<section class="card glass" aria-labelledby="session-title">
  <div class="row">
    <div>
      <h2 id="session-title" class="eyebrow">{msg.TIMER_LABEL}</h2>
      <p class="clock serif" aria-live="off">{clock}</p>
    </div>
    <button class="btn" onclick={onToggleTimer} aria-pressed={timerRunning}>
      {timerRunning ? `${msg.TIMER_PAUSE}` : `${msg.TIMER_START}`}
    </button>
  </div>

  <button class="btn btn-accent save" onclick={onSave}>{msg.SAVE}</button>
  {#if statusMessage}
    <p class="status" role="status">{statusMessage}</p>
  {/if}

  <div class="progress">
    <h3 class="eyebrow">{msg.PROGRESS_TITLE}</h3>
    <p>{msg.SAVED_SESSIONS(totalSessions)}{#if showAverage}<br />{msg.RECENT_AVERAGE(recentAverageReps)}{/if}</p>
  </div>
</section>

<style>
  .card {
    padding: 1.25rem 1.5rem;
    display: grid;
    gap: 0.875rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .clock {
    margin: 0;
    font-size: 2.5rem;
    line-height: 1;
  }

  .save {
    width: 100%;
  }

  .status {
    margin: 0;
    font-weight: 600;
    color: var(--accent-deep);
  }

  .progress p {
    margin: 0.25rem 0 0;
    color: var(--muted);
  }
</style>
