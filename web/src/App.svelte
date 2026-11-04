<script lang="ts">
  import AppHeader from "./lib/components/AppHeader.svelte";
  import { CoachController } from "./lib/controller.svelte";
  import { isCounted } from "./lib/domain/models";
  import * as msg from "./lib/messages";
  import ExerciseDetail from "./lib/screens/ExerciseDetail.svelte";
  import HomeScreen from "./lib/screens/HomeScreen.svelte";
  import LibraryScreen from "./lib/screens/LibraryScreen.svelte";
  import ProgressScreen from "./lib/screens/ProgressScreen.svelte";
  import SummaryScreen from "./lib/screens/SummaryScreen.svelte";
  import WorkoutScreen from "./lib/screens/WorkoutScreen.svelte";

  const coach = new CoachController();
  const route = $derived(coach.route);
  const workoutKey = $derived(route.name === "workout" ? JSON.stringify(route) : "");

  $effect(() => {
    document.documentElement.dataset.textSize = coach.textSize;
  });

  $effect(() => {
    const titles: Record<string, string> = {
      home: msg.NAV_HOME,
      library: msg.NAV_EXERCISES,
      progress: msg.NAV_PROGRESS,
      summary: `${msg.SUMMARY_TITLE_LEAD} ${msg.SUMMARY_TITLE_ACCENT}`,
      workout: msg.NAV_EXERCISES,
      detail: route.name === "detail" ? msg.MODE_LABELS[route.mode] : "",
    };
    document.title = `${titles[route.name] ?? ""} · ${msg.APP_NAME}`;
  });

  function skipToMain(event: MouseEvent) {
    event.preventDefault();
    document.getElementById("main")?.focus();
  }
</script>

<a class="skip" href="#main" onclick={skipToMain}>{msg.SKIP_LINK}</a>

<div class="page">
  <AppHeader {coach} />

  <main id="main" tabindex="-1">
    {#if route.name === "library"}
      <LibraryScreen />
    {:else if route.name === "detail" && isCounted(route.mode)}
      <ExerciseDetail mode={route.mode} />
    {:else if route.name === "workout"}
      {#key workoutKey}
        <WorkoutScreen {coach} />
      {/key}
    {:else if route.name === "summary"}
      <SummaryScreen summary={coach.summary} />
    {:else if route.name === "progress"}
      <ProgressScreen {coach} />
    {:else}
      <HomeScreen {coach} />
    {/if}
  </main>

  <footer>
    <p>{msg.FOOTER}</p>
  </footer>
</div>

<style>
  .skip {
    position: absolute;
    left: var(--space-4);
    top: -100px;
    z-index: 50;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-full);
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-weight: var(--font-weight-semibold);
  }

  .skip:focus {
    top: var(--space-4);
  }

  .page {
    max-width: 1320px;
    margin: 0 auto;
    padding: var(--space-5) clamp(16px, 3vw, 40px) var(--space-8);
    display: grid;
    gap: var(--space-8);
  }

  main:focus {
    outline: none;
  }

  footer {
    padding-top: var(--space-6);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  footer p {
    margin: 0;
    max-width: 60rem;
  }
</style>
