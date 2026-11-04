<script lang="ts">
  import { COUNTED_EXERCISES, ExerciseMode } from "../domain/models";
  import * as msg from "../messages";

  let { mode, onSelect }: { mode: ExerciseMode; onSelect: (mode: ExerciseMode) => void } = $props();
  const MODE_ORDER: ExerciseMode[] = [...COUNTED_EXERCISES, ExerciseMode.Posture];
</script>

<div class="modes" role="group" aria-label={msg.MODES_GROUP}>
  {#each MODE_ORDER as option, i (option)}
    <button class="mode" aria-pressed={mode === option} onclick={() => onSelect(option)}>
      <kbd aria-hidden="true">{i + 1}</kbd>
      <span>{msg.MODE_LABELS[option]}</span>
    </button>
  {/each}
</div>

<style>
  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
    gap: 0.5rem;
  }

  .mode {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-height: 56px;
    padding: 0 1rem;
    border-radius: 16px;
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: 600 1rem/1.2 var(--font-sans);
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;
  }

  .mode:hover {
    border-color: var(--accent-deep);
  }

  .mode[aria-pressed="true"] {
    background: var(--accent-deep);
    border-color: var(--accent-deep);
    color: var(--accent-deep-ink);
  }

  kbd {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 1.625rem;
    height: 1.625rem;
    border-radius: 6px;
    border: 1px solid currentColor;
    font: 600 0.8125rem/1 var(--font-sans);
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    .modes {
      grid-template-columns: repeat(2, 1fr);
    }

    kbd {
      display: none;
    }
  }
</style>
