<script lang="ts">
  import type { Exercise } from "../exercises";
  import * as msg from "../messages";

  let { exercise, ratio = "4 / 3" }: { exercise: Exercise; ratio?: string } = $props();
  const src = $derived(`${import.meta.env.BASE_URL}img/${exercise.photo}`);
</script>

<div class="media" style:aspect-ratio={ratio}>
  <img class="photo" {src} alt={msg.DEMO_LABEL(exercise.copy.label)} loading="lazy" />
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
</style>
