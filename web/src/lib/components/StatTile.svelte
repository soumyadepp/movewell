<script lang="ts">
  let { label, value, unit = "" }: { label: string; value: string | number; unit?: string } = $props();
</script>

<div class="tile card">
  <p class="label">{label}</p>
  <p class="value"><span class="serif">{value}</span>{#if unit}<span class="unit">{unit}</span>{/if}</p>
</div>

<style>
  .tile {
    display: grid;
    gap: var(--space-1);
    align-content: start;
  }

  .label {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .value {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .serif {
    font-size: var(--font-size-4xl);
    line-height: 1;
    color: var(--color-primary);
  }

  .unit {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }
</style>
