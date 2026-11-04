<script lang="ts">
  import type { Finding } from "../domain/models";
  import * as msg from "../messages";

  let { findings }: { findings: Finding[] } = $props();
</script>

<section class="card" aria-labelledby="observations-title">
  <h2 id="observations-title" class="eyebrow">{msg.OBSERVATIONS_TITLE}</h2>
  {#if findings.length === 0}
    <p class="ok">{msg.OBSERVATIONS_EMPTY}</p>
  {:else}
    <ul>
      {#each findings.slice(0, 3) as finding (finding.title)}
        <li>
          <strong>{finding.title}</strong>
          <span><em>{msg.CORRECTION_LABEL}</em> {finding.correction}</span>
          <span class="ex"><em>{msg.EXERCISE_LABEL}</em> {finding.exercise}</span>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="caveat">{msg.OBSERVATIONS_CAVEAT}</p>
</section>

<style>
  .card {
    padding: 1.25rem 1.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: grid;
    gap: 0.625rem;
  }

  li {
    display: grid;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border-radius: 16px;
    background: var(--color-warning-surface);
    border-left: 4px solid var(--color-warning);
    font-size: 0.9375rem;
  }

  strong {
    font-weight: 600;
  }

  em {
    font-size: 1.125em;
    margin-right: 0.25rem;
    color: var(--color-warning);
  }

  .ex em {
    color: var(--color-primary);
  }

  .ok {
    font-weight: 500;
    margin: 0.5rem 0 0;
  }

  .caveat {
    margin: 0.75rem 0 0;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
</style>
