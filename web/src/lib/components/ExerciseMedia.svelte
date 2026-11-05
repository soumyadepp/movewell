<script lang="ts">
  import type { Exercise } from "../exercises";
  import * as msg from "../messages";
  import Pictogram from "./Pictogram.svelte";

  let {
    exercise,
    ratio = "4 / 3",
    animate = true,
  }: { exercise: Exercise; ratio?: string; animate?: boolean } = $props();
  const src = $derived(exercise.photo ? `${import.meta.env.BASE_URL}img/${exercise.photo}` : null);
</script>

<div class="media" style:aspect-ratio={ratio}>
  {#if src}
    <img class="photo" {src} alt={msg.DEMO_LABEL(exercise.copy.label)} loading="lazy" />
  {:else}
    <div class="figure">
      <Pictogram
        illustration={exercise.illustration}
        label={msg.DEMO_LABEL(exercise.copy.label)}
        {animate}
        size={220}
      />
    </div>
  {/if}
</div>

<style>
  .media {
    width: 100%;
    overflow: hidden;
    border-radius: var(--photo-radius);
    background: var(--color-muted-fill);
  }

  .photo {
    height: 100%;
    border-radius: 0;
  }

  .figure {
    height: 100%;
    display: grid;
    place-items: center;
    padding: var(--space-4);
  }
</style>
