<script lang="ts">
  import { write } from "../handwriting";

  let {
    text,
    delayMs = 0,
    unitsPerMs = 14,
    durationMs,
    scale = 1.35,
    weight = 42,
  }: {
    text: string;
    delayMs?: number;
    unitsPerMs?: number;
    durationMs?: number;
    scale?: number;
    weight?: number;
  } = $props();

  const writing = $derived(write(text));
  const speed = $derived(writing && durationMs ? writing.length / durationMs : unitsPerMs);
</script>

{#if writing}
  <span class="handwritten" style:vertical-align="-{writing.descentEm * scale}em">
    <svg
      viewBox={writing.viewBox}
      style:height="{writing.heightEm * scale}em"
      style:width="{writing.heightEm * scale * writing.aspect}em"
      aria-hidden="true"
    >
      {#each writing.strokes as stroke, i (i)}
        <g
          style:--len={Math.ceil(stroke.length) + 2}
          style:--duration="{stroke.length / speed}ms"
          style:--delay="{delayMs + stroke.start / speed}ms"
        >
          <path class="line" d={stroke.d} stroke-width={weight} />
          <circle class="tip" r={weight * 0.9} style:offset-path={`path("${stroke.d}")`} />
        </g>
      {/each}
    </svg>
    <span class="sr-only">{text}</span>
  </span>
{:else}
  <span class="fallback">{text}</span>
{/if}

<style>
  .handwritten {
    display: inline-block;
    margin-inline: -0.15em;
    line-height: 0;
  }

  svg {
    overflow: visible;
  }

  .line {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: var(--len);
    stroke-dashoffset: var(--len);
    animation: pencil var(--duration) linear var(--delay) forwards;
  }

  .tip {
    fill: currentColor;
    opacity: 0;
    offset-rotate: 0deg;
    animation: tip var(--duration) linear var(--delay) forwards;
  }

  @keyframes pencil {
    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes tip {
    0% {
      offset-distance: 0%;
      opacity: 0.55;
    }
    99% {
      opacity: 0.55;
    }
    100% {
      offset-distance: 100%;
      opacity: 0;
    }
  }
</style>
