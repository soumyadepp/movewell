<script lang="ts">
  import type { Snippet } from "svelte";

  let { urgent = false, children }: { urgent?: boolean; children: Snippet } = $props();
</script>

<p class="notice" role={urgent ? "alert" : "status"}>{@render children()}</p>

<style>
  .notice {
    margin-top: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-warning-surface);
    color: var(--color-warning);
    font-size: var(--type-small);
  }
</style>
