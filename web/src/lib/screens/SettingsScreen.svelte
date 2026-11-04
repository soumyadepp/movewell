<script lang="ts">
  import { untrack } from "svelte";
  import ComfortSettings from "../components/ComfortSettings.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import * as msg from "../messages";
  import { estimatedMinutes } from "../routine";

  let { coach }: { coach: CoachController } = $props();
  let name = $state(untrack(() => coach.name));
  let confirming = $state(false);
</script>

<div class="container page">
  <h1>{msg.SETTINGS_TITLE}</h1>

  <div class="row name-row">
    <label for="name" class="label">{msg.YOUR_NAME}</label>
    <input id="name" bind:value={name} maxlength="40" onchange={() => coach.setName(name)} />
  </div>
  <div class="row plan-row">
    <div>
      <h2 class="label">{msg.PLAN_TITLE}</h2>
      <p class="secondary small">{msg.PLAN_SUMMARY(coach.plan.steps.length, estimatedMinutes(coach.plan))}</p>
    </div>
    <a class="btn btn-secondary" href={href.plan}>{msg.PLAN_EDIT}</a>
  </div>
  <ComfortSettings {coach} />

  <details class="advanced">
    <summary class="label">{msg.ADVANCED}</summary>
    <label class="toggle">
      <input type="checkbox" checked={coach.showSkeleton} onchange={(e) => coach.setShowSkeleton(e.currentTarget.checked)} />
      <span>{msg.SHOW_LINES}</span>
    </label>
    <label class="toggle">
      <input
        type="checkbox"
        checked={coach.recordSessions}
        onchange={(e) => coach.setRecordSessions(e.currentTarget.checked)}
      />
      <span>{msg.RECORD_DATA}<span class="secondary small hint">{msg.RECORD_HINT}</span></span>
    </label>
    <div class="buttons">
      <button class="link" onclick={() => coach.downloadHistory()} disabled={coach.history.length === 0}>
        {msg.DOWNLOAD_CSV}
      </button>
      {#if confirming}
        <span class="confirm" role="alert">
          {msg.CLEAR_CONFIRM}
          <button class="link danger" onclick={() => { coach.clearHistory(); confirming = false; }}>{msg.CLEAR_YES}</button>
          <button class="link" onclick={() => (confirming = false)}>{msg.CANCEL}</button>
        </span>
      {:else}
        <button class="link danger" onclick={() => (confirming = true)} disabled={coach.history.length === 0}>
          {msg.CLEAR_HISTORY}
        </button>
      {/if}
    </div>
  </details>

  <div class="actions">
    <a class="btn btn-primary" href={href.home} onclick={() => coach.setName(name)}>{msg.DONE}</a>
  </div>
  <p class="secondary small note">{msg.FOOTER_NOTE}</p>
</div>

<style>
  .page {
    max-width: 56rem;
    padding-top: var(--space-12);
    padding-bottom: var(--space-14);
  }

  h1 {
    margin-bottom: var(--space-6);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-6) 0;
    border-bottom: 1px solid var(--color-rule);
    border-top: 1px solid var(--color-rule);
  }

  .label {
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
  }

  input:not([type]) {
    min-height: var(--control-height);
    width: min(22rem, 100%);
    padding: 0 var(--space-5);
    border: 2px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font: var(--weight-medium) var(--type-body) / 1.2 var(--font-text);
  }

  .advanced {
    margin-top: var(--space-10);
    padding: var(--space-6) 0;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
  }

  summary {
    cursor: pointer;
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  .toggle {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4) 0;
    cursor: pointer;
  }

  .toggle input {
    flex: none;
    width: 28px;
    height: 28px;
    margin-top: 2px;
    accent-color: var(--color-primary);
  }

  .hint {
    display: block;
    margin-top: var(--space-1);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4) var(--space-8);
    align-items: center;
    padding-top: var(--space-2);
  }

  .danger {
    color: var(--color-warning);
  }

  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
    font-size: var(--type-small);
  }

  .actions {
    margin-top: var(--space-10);
    display: flex;
    justify-content: flex-end;
  }

  .actions .btn {
    min-width: 14rem;
  }

  .note {
    margin-top: var(--space-10);
  }
</style>
