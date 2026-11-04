<script lang="ts">
  import StatTile from "../components/StatTile.svelte";
  import type { SessionSummary } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import { getExercise } from "../exercises";
  import * as msg from "../messages";

  let { summary }: { summary: SessionSummary | null } = $props();
</script>

<div class="summary">
  <header class="hero card">
    <p class="eyebrow">{msg.APP_NAME}</p>
    <h1>{msg.SUMMARY_TITLE_LEAD} <em>{msg.SUMMARY_TITLE_ACCENT}</em></h1>
    <p class="lead">{summary && summary.totalReps > 0 ? msg.SUMMARY_LEAD : msg.SUMMARY_EMPTY}</p>
  </header>

  {#if summary}
    <section class="stats" aria-label={msg.SUMMARY_LEAD}>
      <StatTile label={msg.SUMMARY_REPS} value={summary.totalReps} />
      <StatTile label={msg.SUMMARY_TIME} value={msg.DURATION(summary.totalS)} />
      <StatTile label={msg.SUMMARY_COMPLETED} value={summary.completed} unit="/ {summary.results.length}" />
      <StatTile label={msg.STAT_STREAK} value={summary.streak} unit={msg.STAT_STREAK_UNIT(summary.streak)} />
    </section>

    {#if summary.results.length}
      <section class="card">
        <table>
          <caption class="sr-only">{msg.SUMMARY_LEAD}</caption>
          <thead>
            <tr>
              <th scope="col">{msg.NAV_EXERCISES}</th>
              <th scope="col">{msg.SUMMARY_REPS}</th>
              <th scope="col">{msg.SUMMARY_TIME}</th>
              <th scope="col"><span class="sr-only">Status</span></th>
            </tr>
          </thead>
          <tbody>
            {#each summary.results as result, i (i)}
              <tr>
                <th scope="row">{getExercise(result.mode).copy.label}</th>
                <td>{result.reps} / {result.target}</td>
                <td>{msg.DURATION(result.durationS)}</td>
                <td>
                  <span class="status" class:done={result.completed}>
                    {result.completed ? `✓ ${msg.SUMMARY_DONE}` : msg.SUMMARY_PARTIAL}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  {/if}

  <div class="actions">
    <a class="btn btn-primary btn-lg" href={href.home}>{msg.SUMMARY_HOME}</a>
    <a class="btn btn-lg" href={href.progress}>{msg.SUMMARY_PROGRESS}</a>
  </div>
</div>

<style>
  .summary {
    display: grid;
    gap: var(--space-6);
    max-width: 960px;
    margin: 0 auto;
    width: 100%;
  }

  .hero {
    padding: var(--space-10);
    text-align: center;
    background: var(--color-primary-subtle);
  }

  h1 {
    margin: var(--space-2) 0;
    font-size: clamp(3rem, 8vw, 5rem);
    font-weight: var(--font-weight-bold);
  }

  h1 em {
    color: var(--color-primary);
  }

  .lead {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--color-text-muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--space-4);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--space-3) var(--space-2);
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  thead th {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caps);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  tbody th {
    font-weight: var(--font-weight-semibold);
  }

  tbody tr:last-child > * {
    border-bottom: none;
  }

  .status {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
  }

  .status.done {
    background: var(--color-primary-subtle);
    color: var(--color-primary);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-3);
  }
</style>
