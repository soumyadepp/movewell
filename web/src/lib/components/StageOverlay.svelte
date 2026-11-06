<script lang="ts">
  import Handwritten from "./Handwritten.svelte";

  let {
    title,
    countdown,
    countdownMs = 600,
    subtitle,
    detail,
    action,
    seeThrough = false,
    urgent = false,
  }: {
    title: string;
    countdown?: number;
    countdownMs?: number;
    subtitle?: string;
    detail?: string;
    action?: { label: string; onClick: () => void };
    seeThrough?: boolean;
    urgent?: boolean;
  } = $props();
</script>

<div class="overlay fade-in" class:see-through={seeThrough} role="status" aria-live={urgent ? "assertive" : "polite"}>
  <p class="title">{title}</p>
  {#if countdown !== undefined}
    {#key countdown}
      <p class="countdown">
        <Handwritten text={String(countdown)} durationMs={countdownMs} scale={1.1} weight={36} />
      </p>
    {/key}
  {/if}
  {#if subtitle}<p class="title">{subtitle}</p>{/if}
  {#if detail}<p class="detail">{detail}</p>{/if}
  {#if action}
    <button class="btn btn-light" onclick={action.onClick}>{action.label}</button>
  {/if}
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    border-radius: var(--photo-radius);
    background: rgb(22 58 44 / 0.88);
    color: var(--color-on-deep);
    text-align: center;
  }

  .see-through {
    background: rgb(22 58 44 / 0.45);
  }

  .title {
    font-family: var(--font-display);
    font-size: var(--type-title);
    font-weight: var(--weight-semibold);
  }

  .detail {
    max-width: 24rem;
    font-size: var(--type-lead);
  }

  .countdown {
    font-family: var(--font-accent);
    font-size: calc(var(--type-counter) * 1.4);
    font-style: italic;
    font-weight: 400;
    line-height: 0.9;
  }

  .btn {
    margin-top: var(--space-4);
    min-width: 16rem;
  }
</style>
