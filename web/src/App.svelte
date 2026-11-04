<script lang="ts">
  import { onDestroy } from "svelte";
  import AboutPanel from "./lib/components/AboutPanel.svelte";
  import BodyCheck from "./lib/components/BodyCheck.svelte";
  import CameraStage from "./lib/components/CameraStage.svelte";
  import Guidance from "./lib/components/Guidance.svelte";
  import ModePicker from "./lib/components/ModePicker.svelte";
  import Onboarding from "./lib/components/Onboarding.svelte";
  import RepCounter from "./lib/components/RepCounter.svelte";
  import SessionBar from "./lib/components/SessionBar.svelte";
  import SettingsBar from "./lib/components/SettingsBar.svelte";
  import { CoachController } from "./lib/controller.svelte";
  import { COUNTED_EXERCISES, ExerciseMode } from "./lib/domain/models";
  import * as msg from "./lib/messages";

  const coach = new CoachController();
  let video = $state<HTMLVideoElement>();
  let canvas = $state<HTMLCanvasElement>();
  const s = $derived(coach.snapshot);
  const running = $derived(coach.stage === "running");

  $effect(() => {
    document.documentElement.dataset.textSize = coach.textSize;
  });

  const modeOrder: ExerciseMode[] = [...COUNTED_EXERCISES, ExerciseMode.Posture];
  const shortcuts: Record<string, () => void> = {
    ...Object.fromEntries(modeOrder.map((mode, i) => [String(i + 1), () => coach.selectMode(mode)])),
    v: () => coach.toggleView(),
    " ": () => coach.toggleTimer(),
    s: () => coach.save(),
  };

  function onKeydown(event: KeyboardEvent) {
    if (!running || event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.target as HTMLElement).closest("button, input, summary, select")) return;
    const action = shortcuts[event.key.toLowerCase()];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  function start() {
    if (video && canvas) coach.start(video, canvas);
  }

  onDestroy(() => coach.stop());
</script>

<svelte:window onkeydown={onKeydown} />

<a class="skip" href="#main">Skip to exercise</a>

<div class="page" inert={!running}>
  <header>
    <div class="title">
      <h1 class="brand">AI Physiotherapy <em>Assistant</em></h1>
      <p class="tagline">{msg.APP_TAGLINE}</p>
    </div>
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

  <main id="main">
    <div class="left">
      <ModePicker mode={s.mode} onSelect={(m) => coach.selectMode(m)} />
      <CameraStage
        bind:video
        bind:canvas
        view={s.view}
        bodyDetected={s.bodyDetected}
        {running}
        onToggleView={() => coach.toggleView()}
      />
      <p class="safety" role="note">{msg.SAFETY}</p>
    </div>

    <aside class="right" aria-label="Exercise feedback">
      <RepCounter
        mode={s.mode}
        reps={s.reps}
        goal={s.goal}
        phase={s.phase}
        angle={s.angle}
        celebrating={coach.celebrating}
        onGoal={(g) => coach.setGoal(g)}
      />
      <Guidance lines={s.guidance} />
      {#if s.mode === ExerciseMode.Posture}
        <BodyCheck findings={s.findings} />
      {/if}
      <SessionBar
        elapsedSeconds={s.elapsedSeconds}
        timerRunning={s.timerRunning}
        statusMessage={s.statusMessage}
        totalSessions={s.totalSessions}
        recentAverageReps={s.recentAverageReps}
        showAverage={s.mode !== ExerciseMode.Posture}
        onToggleTimer={() => coach.toggleTimer()}
        onSave={() => coach.save()}
      />
    </aside>
  </main>

  <AboutPanel
    totalSessions={s.totalSessions}
    onDownload={() => coach.downloadHistory()}
    onClear={() => coach.clearHistory()}
  />
</div>

{#if !running}
  <Onboarding stage={coach.stage} errorMessage={coach.errorMessage} onStart={start} />
{/if}

<style>
  .skip {
    position: absolute;
    left: 16px;
    top: -100px;
    z-index: 50;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-pill);
    background: var(--accent-deep);
    color: var(--accent-deep-ink);
    font-weight: 600;
  }

  .skip:focus {
    top: 16px;
  }

  .page {
    max-width: 1440px;
    margin: 0 auto;
    padding: 20px clamp(16px, 3vw, 32px) 32px;
    display: grid;
    gap: 1.25rem;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem 2rem;
  }

  .brand {
    font-size: clamp(1.625rem, 3vw, 2.25rem);
    font-weight: 700;
    letter-spacing: -0.035em;
  }

  .brand em {
    color: var(--accent-deep);
  }

  .tagline {
    margin: 0.25rem 0 0;
    color: var(--muted);
  }

  main {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(340px, 1fr);
    gap: 1.25rem;
    align-items: start;
  }

  .left,
  .right {
    display: grid;
    gap: 1rem;
  }

  .safety {
    margin: 0;
    padding: 0.875rem 1.25rem;
    border-radius: 18px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-left: 6px solid var(--accent);
    font-weight: 500;
  }

  @media (max-width: 1024px) {
    main {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
