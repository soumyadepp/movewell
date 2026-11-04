<script lang="ts" generics="T extends string | number">
  let {
    options,
    value,
    label,
    onChange,
  }: {
    options: readonly { id: T; label: string; lang?: string }[];
    value: T;
    label: string;
    onChange: (value: T) => void;
  } = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.id}
      lang={option.lang}
      onclick={() => onChange(option.id)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    padding: 4px;
    gap: 4px;
    border: 2px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  button {
    transition:
      background var(--duration-base) var(--ease),
      color var(--duration-base) var(--ease);
    min-height: calc(var(--control-height) - 12px);
    min-width: 88px;
    padding: 0 var(--space-5);
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--color-text);
    font: var(--weight-semibold) var(--type-small) / 1.2 var(--font-text);
    cursor: pointer;
  }

  button:hover {
    background: var(--color-muted-fill);
  }

  button[aria-checked="true"] {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  @media (max-width: 640px) {
    .segmented {
      display: flex;
      width: 100%;
    }

    button {
      flex: 1 1 0;
      min-width: 0;
      padding: 0 var(--space-2);
    }
  }
</style>
