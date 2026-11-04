<script lang="ts">
  import * as msg from "../messages";

  let { lines }: { lines: string[] } = $props();
  const [main, ...rest] = $derived(lines);
</script>

<section class="card glass" aria-labelledby="guidance-title">
  <h2 id="guidance-title" class="eyebrow">{msg.GUIDANCE_TITLE}</h2>
  <p class="main" aria-live="polite">{main}</p>
  {#each rest.slice(0, 2) as line (line)}
    <p class="sub">{line}</p>
  {/each}
</section>

<style>
  .card {
    padding: 1.25rem 1.5rem;
    min-height: 11rem;
  }

  .main {
    margin: 0.375rem 0 0;
    font-size: clamp(1.25rem, 2.4vw, 1.625rem);
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .sub {
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 1rem;
  }
</style>
