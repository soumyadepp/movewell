<script lang="ts">
  import type { Snippet } from "svelte";
  import * as msg from "../messages";

  let {
    video = $bindable(),
    canvas = $bindable(),
    showHint,
    children,
  }: { video?: HTMLVideoElement; canvas?: HTMLCanvasElement; showHint: boolean; children?: Snippet } = $props();
</script>

<figure class="stage" aria-label="Live camera">
  <div class="mirror">
    <video bind:this={video} playsinline muted></video>
    <canvas bind:this={canvas}></canvas>
  </div>
  {@render children?.()}
  {#if showHint}
    <p class="hint enter" role="status">{msg.STEP_BACK}</p>
  {/if}
</figure>

<style>
  .stage {
    position: relative;
    margin: 0;
    width: 100%;
    height: 100%;
    min-height: 320px;
    overflow: hidden;
    border-radius: var(--photo-radius);
    background: var(--forest-900);
  }

  .mirror {
    position: absolute;
    inset: 0;
    transform: scaleX(-1);
  }

  video,
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hint {
    position: absolute;
    inset: auto var(--space-4) var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-warning);
    color: var(--white);
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
  }
</style>
