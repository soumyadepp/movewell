<script lang="ts">
  import type { Stage } from "../controller.svelte";
  import * as msg from "../messages";

  let {
    stage,
    errorMessage,
    cancelHref,
    onStart,
  }: { stage: Stage; errorMessage: string; cancelHref: string; onStart: () => void } = $props();
  const loading = $derived(stage === "loading");
</script>

<div class="backdrop">
  <div class="sheet card" role="dialog" aria-modal="true" aria-labelledby="setup-title">
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

    <div class="actions">
      <a class="btn" href={cancelHref}>{msg.CANCEL}</a>
      <!-- svelte-ignore a11y_autofocus -->
      <button class="btn btn-primary btn-lg start" disabled={loading} aria-busy={loading} onclick={onStart} autofocus>
        {#if loading}
          {msg.LOADING_MODEL}
        {:else if stage === "error"}
          {msg.TRY_AGAIN}
        {:else}
          {msg.SETUP_START}
        {/if}
      </button>
    </div>
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
    padding: var(--space-4);
    background: color-mix(in srgb, var(--color-bg) 85%, transparent);
    overflow-y: auto;
  }

  .sheet {
    width: min(640px, 100%);
    padding: var(--space-10);
    box-shadow: var(--shadow-raised);
  }

  h1 {
    margin: var(--space-2) 0 var(--space-6);
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
  }

  h1 em {
    color: var(--color-primary);
  }

  .steps {
    display: grid;
    gap: var(--space-3);
    margin: 0 0 var(--space-6);
    padding: 0;
    list-style: none;
  }

  .steps li {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
  }

  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xl);
  }

  .steps h2 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .steps p {
    margin: var(--space-1) 0 0;
    color: var(--color-text-muted);
  }

  .actions {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
  }

  .start {
    width: 100%;
  }

  .error {
    background: var(--color-warning-surface);
    color: var(--color-warning);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
  }

  .privacy {
    margin: var(--space-4) 0 0;
    text-align: center;
    color: var(--color-text-muted);
  }

  @media (max-width: 560px) {
    .sheet {
      padding: var(--space-6);
    }

    .actions {
      grid-template-columns: 1fr;
    }
  }
</style>
