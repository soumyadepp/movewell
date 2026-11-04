<script lang="ts">
  import { commandHints } from "../commands";
  import type { CoachController } from "../controller.svelte";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();

  const hints = $derived(commandHints(coach.language));
  const problemText = {
    blocked: msg.VOICE_COMMANDS_BLOCKED,
    "no-microphone": msg.VOICE_PROBLEM_MICROPHONE,
    network: msg.VOICE_PROBLEM_NETWORK,
    unavailable: msg.VOICE_COMMANDS_UNSUPPORTED,
    busy: msg.VOICE_PROBLEM_BUSY,
    "other-tab": msg.VOICE_PROBLEM_OTHER_TAB,
  } as const;

  const status = $derived(
    !coach.voiceCommands
      ? "off"
      : coach.listenerProblem
        ? "problem"
        : !coach.listening
          ? "starting"
          : coach.heard
            ? "heard"
            : coach.hearing
              ? "hearing"
              : "listening",
  );

  const title = $derived(
    status === "starting"
      ? msg.VOICE_STARTING
      : status === "heard" && coach.heard
        ? msg.HEARD(hints[coach.heard])
        : status === "hearing"
          ? msg.VOICE_HEARING
          : msg.VOICE_LISTENING,
  );

  const detail = $derived(
    status === "listening" && coach.heardText
      ? msg.HEARD_OTHER(coach.heardText, hints.next, hints.pause)
      : msg.VOICE_SAY(hints.next, hints.pause, hints.end),
  );
</script>

{#if coach.voiceCommandsSupported}
  {#if status === "off"}
    <button class="turn-on" onclick={() => coach.setVoiceCommands(true)}>
      <svg class="mic-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
        ><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg
      >
      {msg.VOICE_OFF_ACTION}
    </button>
  {:else if status === "problem" && coach.listenerProblem}
    <div class="status problem" role="alert">
      <span class="mic" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22"
          ><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" /></svg
        >
      </span>
      <p class="text">{problemText[coach.listenerProblem]}</p>
      <button class="retry" onclick={() => coach.setVoiceCommands(true)}>{msg.VOICE_TRY_AGAIN}</button>
    </div>
  {:else}
    <div class="status {status}" role="status" aria-live="polite">
      <span class="mic" aria-hidden="true">
        {#if status === "listening" || status === "hearing"}<span class="ring"></span>{/if}
        <svg viewBox="0 0 24 24" width="22" height="22"
          ><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg
        >
      </span>
      <span class="text">
        <strong>{title}</strong>
        {#if status !== "starting"}<span class="detail">{detail}</span>{/if}
      </span>
    </div>
  {/if}
{/if}

<style>
  .status,
  .turn-on {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 56px;
    padding: var(--space-2) var(--space-4) var(--space-2) var(--space-2);
    border-radius: var(--radius-md);
    color: var(--color-on-deep);
    font-size: var(--type-small);
  }

  .status {
    background: rgb(243 238 228 / 0.1);
  }

  .turn-on {
    border: 2px solid rgb(243 238 228 / 0.5);
    background: transparent;
    padding-left: var(--space-4);
    font: var(--weight-semibold) var(--type-small) / 1.2 var(--font-text);
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease);
  }

  .turn-on:hover {
    border-color: var(--color-on-deep);
  }

  .mic {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-on-deep);
    color: var(--color-deep);
  }

  .starting .mic {
    background: rgb(243 238 228 / 0.35);
  }

  .heard .mic,
  .hearing .mic {
    background: var(--color-celebrate-on-deep);
  }

  .problem {
    background: var(--color-warning-surface);
    color: var(--color-warning);
  }

  .problem .mic {
    background: var(--color-warning);
    color: var(--color-warning-surface);
  }

  svg {
    position: relative;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--color-on-deep);
    animation: pulse 1.8s var(--ease-out) infinite;
  }

  .hearing .ring {
    border-color: var(--color-celebrate-on-deep);
    animation-duration: 0.9s;
  }

  .text {
    display: grid;
    gap: 2px;
    line-height: 1.3;
  }

  strong {
    font-size: var(--type-body);
    font-weight: var(--weight-semibold);
  }

  .detail {
    opacity: 0.85;
  }

  .retry {
    flex: none;
    min-height: 44px;
    padding: 0 var(--space-4);
    border: 2px solid currentColor;
    border-radius: var(--radius-md);
    background: transparent;
    color: inherit;
    font: var(--weight-semibold) var(--type-small) / 1 var(--font-text);
    cursor: pointer;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
      opacity: 0.9;
    }
    to {
      transform: scale(1.7);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ring {
      animation: none;
      transform: scale(1.25);
      opacity: 0.6;
    }
  }
</style>
