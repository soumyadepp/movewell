<script lang="ts">
  import type { CoachController } from "../controller.svelte";
  import { href } from "../routing";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();
  let busy = $state(false);

  async function turnOn() {
    busy = true;
    const granted = await coach.requestCameraAccess();
    busy = false;
    if (granted) coach.finishSetup();
  }
</script>

<div class="container page">
  <h1>{msg.SPACE_TITLE}</h1>
  <div class="layout">
    <img class="photo" src="{import.meta.env.BASE_URL}img/setup-space.webp" alt="" />
    <div class="steps">
      <ol>
        {#each msg.SPACE_STEPS as step, i (i)}
          <li><span class="num" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
        {/each}
      </ol>
      <p class="privacy">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"
          ><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg
        >
        <span>{msg.SPACE_PRIVACY}</span>
      </p>
      {#if coach.errorMessage}
        <p class="warning" role="alert">{coach.errorMessage}</p>
      {/if}
      <div class="actions">
        <a class="link" href={href.setup("comfort")}>← {msg.BACK}</a>
        <button class="btn btn-primary" onclick={turnOn} disabled={busy} aria-busy={busy}>
          {coach.errorMessage ? msg.TRY_AGAIN : msg.SPACE_START}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .page {
    padding-top: var(--space-14);
    padding-bottom: var(--space-14);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: var(--space-12);
    align-items: center;
    margin-top: var(--space-8);
  }

  .photo {
    aspect-ratio: 4 / 3;
  }

  .steps {
    display: grid;
    gap: var(--space-6);
  }

  ol {
    display: grid;
    gap: var(--space-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    font-size: var(--type-body);
  }

  .num {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
  }

  .privacy {
    display: flex;
    gap: var(--space-3);
    align-items: flex-start;
    padding-top: var(--space-5);
    border-top: 1px solid var(--color-rule);
    color: var(--color-text-secondary);
    font-size: var(--type-small);
  }

  .privacy svg {
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }

  .warning {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-warning-surface);
    color: var(--color-warning);
    font-size: var(--type-small);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
