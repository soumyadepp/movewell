<script lang="ts">
  import type { Stage } from "../controller.svelte";
  import * as msg from "../messages";

  let { stage, errorMessage, onStart }: { stage: Stage; errorMessage: string; onStart: () => void } = $props();
  const loading = $derived(stage === "loading");
</script>

<div class="backdrop">
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="setup-title">
    <p class="eyebrow">{msg.SETUP_EYEBROW}</p>
    <h1 id="setup-title">{msg.SETUP_TITLE_LEAD} <em>{msg.SETUP_TITLE_ACCENT}</em></h1>

    <ol class="steps">
      {#each msg.SETUP_STEPS as step, i (step.title)}
        <li>
          <span class="num" aria-hidden="true">{i + 1}</span>
          <div>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </div>
        </li>
      {/each}
    </ol>

    {#if stage === "error"}
      <p class="error" role="alert">{errorMessage}</p>
    {/if}

    <!-- svelte-ignore a11y_autofocus -->
    <button class="btn btn-primary start" disabled={loading} aria-busy={loading} onclick={onStart} autofocus>
      {#if loading}
        {msg.LOADING_MODEL}
      {:else if stage === "error"}
        {msg.TRY_AGAIN}
      {:else}
        {msg.SETUP_START}
      {/if}
    </button>
    <p class="privacy">{msg.SETUP_PRIVACY}</p>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: color-mix(in srgb, var(--bg) 85%, transparent);
    overflow-y: auto;
  }

  .card {
    width: min(640px, 100%);
    padding: clamp(1.5rem, 4vw, 2.5rem);
    background: var(--surface-strong);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    box-shadow: var(--glow);
  }

  h1 {
    font-size: clamp(2rem, 5vw, 2.75rem);
    font-weight: 700;
    margin: 0.5rem 0 1.5rem;
  }

  h1 em {
    color: var(--accent-deep);
  }

  .steps {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
    display: grid;
    gap: 0.75rem;
  }

  .steps li {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem 1.25rem;
    border-radius: 18px;
    background: var(--bg);
    border: 1px solid var(--line);
  }

  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--accent-deep);
    color: var(--accent-deep-ink);
    font-weight: 700;
    font-size: 1.25rem;
  }

  .steps h2 {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .steps p {
    margin: 0.25rem 0 0;
    color: var(--muted);
  }

  .start {
    width: 100%;
    min-height: 64px;
    font-size: 1.25rem;
  }

  .error {
    background: var(--warn-bg);
    color: var(--warn);
    padding: 1rem 1.25rem;
    border-radius: 16px;
    font-weight: 500;
  }

  .privacy {
    text-align: center;
    color: var(--muted);
    margin: 1rem 0 0;
  }
</style>
