<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { FigureJoint, FigurePose, Illustration } from "../illustrations";

  let {
    illustration,
    label,
    animate = true,
    size = 160,
  }: { illustration: Illustration; label: string; animate?: boolean; size?: number } = $props();

  const PERIOD_MS = 2600;
  let t = $state(0);
  let frame = 0;

  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  onMount(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduced) {
      t = 1;
      return;
    }
    const startedAt = performance.now();
    const step = (now: number) => {
      const phase = ((now - startedAt) % PERIOD_MS) / PERIOD_MS;
      t = ease(phase < 0.5 ? phase * 2 : 2 - phase * 2);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });

  onDestroy(() => cancelAnimationFrame(frame));

  const lerp = (a: FigurePose, b: FigurePose, k: number): FigurePose =>
    Object.fromEntries(
      (Object.keys(a) as FigureJoint[]).map((j) => [
        j,
        [a[j][0] + (b[j][0] - a[j][0]) * k, a[j][1] + (b[j][1] - a[j][1]) * k],
      ]),
    ) as FigurePose;

  const p = $derived(lerp(illustration.start, illustration.end, t));
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const neck = $derived(mid(p.lShoulder, p.rShoulder));
  const pelvis = $derived(mid(p.lHip, p.rHip));
  const limbs = $derived([
    [p.lShoulder, p.rShoulder],
    [neck, pelvis],
    [p.lHip, p.rHip],
    [p.lShoulder, p.lElbow, p.lWrist],
    [p.rShoulder, p.rElbow, p.rWrist],
    [p.lHip, p.lKnee, p.lAnkle],
    [p.rHip, p.rKnee, p.rAnkle],
  ]);
  const path = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
</script>

<svg viewBox="0 0 120 150" width={size} height={size * 1.25} role="img" aria-label={label}>
  {#if illustration.chair}
    <path class="chair" d="M40 106 H66 M40 106 V146 M64 106 V146 M40 106 V70" />
  {/if}
  <line class="ground" x1="8" y1="146" x2="112" y2="146" />
  {#each limbs as limb, i (i)}
    <path class="limb" d={path(limb as [number, number][])} />
  {/each}
  <circle class="head" cx={p.head[0]} cy={p.head[1]} r="10" />
</svg>

<style>
  svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .limb {
    fill: none;
    stroke: var(--figure-stroke);
    stroke-width: 6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .head {
    fill: var(--figure-stroke);
  }

  .ground,
  .chair {
    fill: none;
    stroke: var(--figure-ghost);
    stroke-width: 3;
    stroke-linecap: round;
  }
</style>
