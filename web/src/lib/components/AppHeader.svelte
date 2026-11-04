<script lang="ts">
  import type { Route } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import * as msg from "../messages";
  import Handwritten from "./Handwritten.svelte";

  let { route, step = null }: { route: Route; step?: string | null } = $props();

  const section = $derived(
    route.name === "library" || route.name === "detail"
      ? "exercises"
      : route.name === "week"
        ? "week"
        : route.name === "settings"
          ? "settings"
          : "today",
  );
  const links = [
    { id: "today", label: msg.NAV_TODAY, href: href.home },
    { id: "exercises", label: msg.NAV_EXERCISES, href: href.library },
    { id: "week", label: msg.NAV_WEEK, href: href.week },
    { id: "settings", label: msg.NAV_SETTINGS, href: href.settings },
  ];
</script>

<header class="header">
  <div class="container bar">
    {#if step}
      <span class="wordmark" aria-label={msg.APP_NAME}
        >{msg.WORDMARK[0]}<span class="accent"><Handwritten text={msg.WORDMARK[1]} delayMs={150} unitsPerMs={9} weight={70} /></span><span class="dot" aria-hidden="true"></span></span
      >
      <span class="step">{step}</span>
    {:else}
      <a class="wordmark" href={href.home} aria-label="{msg.APP_NAME}, {msg.NAV_TODAY}"
        >{msg.WORDMARK[0]}<span class="accent"><Handwritten text={msg.WORDMARK[1]} delayMs={150} unitsPerMs={9} weight={70} /></span><span class="dot" aria-hidden="true"></span></a
      >
      <nav class="tabs" aria-label={msg.NAV_LABEL}>
        {#each links as link (link.id)}
          <a href={link.href} aria-current={section === link.id ? "page" : undefined}>{link.label}</a>
        {/each}
      </nav>
    {/if}
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-rule);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-8);
    min-height: var(--header-height);
  }

  .wordmark {
    display: inline-flex;
    align-items: baseline;
    font-family: var(--font-display);
    font-weight: var(--weight-black);
    font-size: 30px;
    letter-spacing: -0.03em;
    color: var(--color-primary);
    text-decoration: none;
  }

  .dot {
    margin-left: 4px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--color-celebrate);
  }

  nav {
    display: flex;
    align-self: stretch;
    gap: var(--space-8);
  }

  nav a {
    display: flex;
    align-items: center;
    padding: 0 var(--space-2);
    border-bottom: 3px solid transparent;
    color: var(--color-text-secondary);
    transition:
      color var(--duration-fast) var(--ease),
      border-color var(--duration-base) var(--ease);
    font-size: var(--type-label);
    font-weight: var(--weight-semibold);
    text-decoration: none;
  }

  nav a:hover {
    color: var(--color-text);
  }

  nav a[aria-current="page"] {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .step {
    font-size: var(--type-small);
    color: var(--color-text-secondary);
  }

  nav a {
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    nav {
      gap: var(--space-5);
    }

    nav a {
      font-size: var(--type-small);
    }
  }

  @media (max-width: 640px) {
    .bar {
      min-height: var(--header-height-compact);
    }

    nav {
      position: fixed;
      inset: auto 0 0;
      z-index: 10;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--color-bg);
      border-top: 1px solid var(--color-rule);
    }

    nav a {
      justify-content: center;
      min-height: var(--tabbar-height);
      padding: 0 var(--space-1);
      border-bottom: 0;
      border-top: 3px solid transparent;
      white-space: normal;
      text-align: center;
      line-height: 1.15;
    }

    nav a[aria-current="page"] {
      border-top-color: var(--color-primary);
    }
  }
</style>
