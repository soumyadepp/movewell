<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    hint,
    labelFor,
    details,
    children,
  }: {
    label: string;
    hint?: string;
    labelFor?: string;
    details?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="row">
  <div class="text">
    {#if labelFor}
      <label class="label" for={labelFor}>{label}</label>
    {:else}
      <h2 class="label">{label}</h2>
    {/if}
    {#if hint}<p class="secondary small">{hint}</p>{/if}
    {@render details?.()}
  </div>
  {@render children?.()}
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4) var(--space-8);
    padding: var(--space-6) 0;
    border-bottom: 1px solid var(--color-rule);
  }

  .text {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
    max-width: 34rem;
  }

  .label {
    font-family: var(--font-text);
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
    letter-spacing: 0;
  }
</style>
