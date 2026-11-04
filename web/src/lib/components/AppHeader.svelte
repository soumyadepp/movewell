<script lang="ts">
  import type { CoachController, Route } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import * as msg from "../messages";
  import SettingsBar from "./SettingsBar.svelte";

  let { coach }: { coach: CoachController } = $props();

  const section = (route: Route) =>
    route.name === "library" || route.name === "detail" ? "library" : route.name === "progress" ? "progress" : "home";
  const current = $derived(section(coach.route));
  const links = [
    { id: "home", label: msg.NAV_HOME, href: href.home },
    { id: "library", label: msg.NAV_EXERCISES, href: href.library },
    { id: "progress", label: msg.NAV_PROGRESS, href: href.progress },
  ];
</script>

<header class="header">
  <a class="brand" href={href.home} aria-label="{msg.APP_NAME}, {msg.NAV_HOME}">
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="36" height="36"
        ><circle cx="16" cy="16" r="16" class="mark-bg" /><path
          class="mark-fg"
          d="M8 21 L12.5 11 L16 18 L19.5 11 L24 21"
        /></svg
      >
    </span>
    <span class="wordmark">{msg.APP_NAME_LEAD}<em>{msg.APP_NAME_ACCENT}</em></span>
  </a>

  <nav aria-label={msg.NAV_LABEL}>
    <ul>
      {#each links as link (link.id)}
        <li>
          <a href={link.href} aria-current={current === link.id ? "page" : undefined}>{link.label}</a>
        </li>
      {/each}
    </ul>
  </nav>

  <SettingsBar
    textSize={coach.textSize}
    muted={coach.muted}
    language={coach.language}
    voiceMissing={coach.voiceMissing}
    onTextSize={(size) => coach.setTextSize(size)}
    onMuted={(m) => coach.setMuted(m)}
    onLanguage={(l) => coach.chooseLanguage(l)}
  />
</header>

<style>
  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4) var(--space-8);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-text);
    text-decoration: none;
  }

  .mark-bg {
    fill: var(--color-primary);
  }

  .mark-fg {
    fill: none;
    stroke: var(--color-on-primary);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .wordmark {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-tight);
  }

  .wordmark em {
    color: var(--color-primary);
    margin-left: 1px;
  }

  nav {
    flex: 1;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  nav a {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-full);
    color: var(--color-text);
    font-weight: var(--font-weight-semibold);
    text-decoration: none;
  }

  nav a:hover {
    background: var(--color-primary-subtle);
  }

  nav a[aria-current="page"] {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }

  @media (max-width: 900px) {
    nav {
      order: 3;
      flex-basis: 100%;
    }
  }
</style>
