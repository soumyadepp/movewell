<script lang="ts">
  import type { ViewMode } from "../domain/models";
  import * as msg from "../messages";

  let {
    video = $bindable(),
    canvas = $bindable(),
    view,
    bodyDetected,
    running,
    onToggleView,
    canSwitchView = true,
  }: {
    video?: HTMLVideoElement;
    canvas?: HTMLCanvasElement;
    view: ViewMode;
    bodyDetected: boolean;
    running: boolean;
    onToggleView: () => void;
    canSwitchView?: boolean;
  } = $props();
</script>

<figure class="stage" aria-label="Live camera with body tracking">
  <div class="mirror">
    <video bind:this={video} playsinline muted></video>
    <canvas bind:this={canvas}></canvas>
  </div>

  <div class="top">
    <span class="badge">{msg.VIEW_LABELS[view]}</span>
    {#if canSwitchView}
      <button class="btn switch" onclick={onToggleView}>{msg.VIEW_SWITCH}</button>
    {/if}
  </div>

  {#if running && !bodyDetected}
    <div class="hint" role="status">
      <p>{msg.GUIDANCE_NO_BODY[1]}</p>
    </div>
  {/if}
</figure>

<style>
  .stage {
    position: relative;
    margin: 0;
    aspect-ratio: 4 / 3;
    border-radius: var(--stage-radius);
    overflow: hidden;
    background: var(--stage-bg);
    border: 1px solid var(--color-border);
    box-shadow: var(--card-shadow);
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

  .top {
    position: absolute;
    inset: 12px 12px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .badge {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    background: #1b2130e6;
    color: #ffffff;
    font-weight: 600;
  }

  .switch {
    min-height: 48px;
    background: #ffffff;
    color: #1b2130;
    border: none;
  }

  .hint {
    position: absolute;
    inset: auto 12px 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-radius: 20px;
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-weight: 600;
    font-size: clamp(1rem, 2.2vw, 1.375rem);
  }

  .hint p {
    margin: 0;
  }
</style>
