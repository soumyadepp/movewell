<script lang="ts">
  import AppHeader from "./lib/components/AppHeader.svelte";
  import { CoachController } from "./lib/controller.svelte";
  import { isCounted } from "./lib/domain/models";
  import { modeLabel } from "./lib/exercises";
  import * as msg from "./lib/messages";
  import ExerciseDetail from "./lib/screens/ExerciseDetail.svelte";
  import HomeScreen from "./lib/screens/HomeScreen.svelte";
  import LibraryScreen from "./lib/screens/LibraryScreen.svelte";
  import PlanScreen from "./lib/screens/PlanScreen.svelte";
  import SettingsScreen from "./lib/screens/SettingsScreen.svelte";
  import SetupComfort from "./lib/screens/SetupComfort.svelte";
  import SetupSpace from "./lib/screens/SetupSpace.svelte";
  import SetupWelcome from "./lib/screens/SetupWelcome.svelte";
  import SummaryScreen from "./lib/screens/SummaryScreen.svelte";
  import WeekScreen from "./lib/screens/WeekScreen.svelte";
  import WorkoutScreen from "./lib/screens/WorkoutScreen.svelte";

  const coach = new CoachController();
  if (import.meta.hot) import.meta.hot.dispose(() => coach.stop());
  const route = $derived(coach.route);
  const workoutKey = $derived(route.name === "workout" ? JSON.stringify(route) : "");
  const screenKey = $derived(route.name === "workout" ? "workout" : JSON.stringify(route));
  const setupStep = $derived(
    route.name === "setup" ? msg.STEP_OF(["welcome", "comfort", "space"].indexOf(route.step) + 1, 3) : null,
  );

  $effect(() => {
    document.documentElement.dataset.textSize = coach.textSize;
  });

  $effect(() => {
    const titles: Record<string, string> = {
      setup: msg.WELCOME_TITLE,
      home: msg.NAV_TODAY,
      library: msg.NAV_EXERCISES,
      detail: route.name === "detail" ? modeLabel(route.mode) : "",
      workout: msg.NAV_TODAY,
      summary: msg.DONE_TITLE(coach.displayName),
      week: msg.NAV_WEEK,
      settings: msg.NAV_SETTINGS,
      plan: msg.PLAN_TITLE,
    };
    document.title = `${titles[route.name] ?? ""} · ${msg.APP_NAME}`;
  });

  function skipToMain(event: MouseEvent) {
    event.preventDefault();
    document.getElementById("main")?.focus();
  }
</script>

<a class="skip" href="#main" onclick={skipToMain}>{msg.SKIP_LINK}</a>

{#if route.name !== "workout"}
  <AppHeader {route} step={setupStep} />
{/if}

<main id="main" tabindex="-1">
  {#key screenKey}
    <div class="screen enter">
      {#if route.name === "setup"}
        {#if route.step === "welcome"}
          <SetupWelcome {coach} />
        {:else if route.step === "comfort"}
          <SetupComfort {coach} />
        {:else}
          <SetupSpace {coach} />
        {/if}
      {:else if route.name === "library"}
        <LibraryScreen />
      {:else if route.name === "detail" && isCounted(route.mode)}
        <ExerciseDetail mode={route.mode} />
      {:else if route.name === "workout"}
        {#key workoutKey}
          <WorkoutScreen {coach} />
        {/key}
      {:else if route.name === "summary"}
        <SummaryScreen {coach} />
      {:else if route.name === "week"}
        <WeekScreen {coach} />
      {:else if route.name === "plan"}
        <PlanScreen {coach} />
      {:else if route.name === "settings"}
        <SettingsScreen {coach} />
      {:else}
        <HomeScreen {coach} />
      {/if}
    </div>
  {/key}
</main>

<style>
  .skip {
    position: absolute;
    left: var(--space-4);
    top: -100px;
    z-index: 50;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-on-primary);
    font-weight: var(--weight-semibold);
  }

  .skip:focus {
    top: var(--space-4);
  }

  main:focus {
    outline: none;
  }
</style>
