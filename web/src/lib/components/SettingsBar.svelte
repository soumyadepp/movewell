<script lang="ts">
  import type { TextSize } from "../controller.svelte";
  import { SPEECH_CATALOGS, VOICE_LANGUAGES, type VoiceLanguage } from "../i18n/speech";
  import * as msg from "../messages";

  let {
    textSize,
    muted,
    language,
    voiceMissing,
    onTextSize,
    onMuted,
    onLanguage,
  }: {
    textSize: TextSize;
    muted: boolean;
    language: VoiceLanguage;
    voiceMissing: boolean;
    onTextSize: (size: TextSize) => void;
    onMuted: (muted: boolean) => void;
    onLanguage: (language: VoiceLanguage) => void;
  } = $props();
</script>

<div class="settings" role="group" aria-label={msg.SETTINGS_GROUP}>
  <div class="control">
    <span class="label" id="size-label">{msg.TEXT_SIZE_LABEL}</span>
    <div class="segmented" role="group" aria-labelledby="size-label">
      {#each msg.TEXT_SIZES as size (size.id)}
        <button
          class="size-{size.id}"
          aria-pressed={textSize === size.id}
          aria-label={size.name}
          onclick={() => onTextSize(size.id)}>{size.label}</button
        >
      {/each}
    </div>
  </div>

  <div class="control">
    <span class="label" id="voice-label">{msg.VOICE_LABEL}</span>
    <div class="segmented" role="group" aria-labelledby="voice-label">
      <button aria-pressed={!muted} onclick={() => onMuted(false)}>{msg.VOICE_ON}</button>
      <button aria-pressed={muted} onclick={() => onMuted(true)}>{msg.VOICE_OFF}</button>
    </div>
  </div>

  <div class="control">
    <span class="label" id="lang-label">{msg.LANGUAGE_LABEL}</span>
    <div class="segmented" role="group" aria-labelledby="lang-label">
      {#each VOICE_LANGUAGES as lang (lang)}
        <button
          lang={SPEECH_CATALOGS[lang].bcp47}
          aria-pressed={language === lang}
          onclick={() => onLanguage(lang)}>{SPEECH_CATALOGS[lang].label}</button
        >
      {/each}
    </div>
  </div>

  {#if voiceMissing}
    <p class="missing" role="status">{msg.VOICE_MISSING(SPEECH_CATALOGS[language].label)}</p>
  {/if}
</div>

<style>
  .settings {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem 1.25rem;
  }

  .control {
    display: grid;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--muted);
  }

  .segmented {
    display: inline-flex;
    padding: 4px;
    gap: 4px;
    border-radius: var(--radius-pill);
    background: var(--surface-strong);
    border: 1px solid var(--line);
  }

  .segmented button {
    min-height: 44px;
    min-width: 52px;
    padding: 0 1rem;
    border: none;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--ink);
    font: 600 1rem/1 var(--font-sans);
    cursor: pointer;
  }

  .segmented button[aria-pressed="true"] {
    background: var(--accent-deep);
    color: var(--accent-deep-ink);
  }

  .size-md {
    font-size: 0.9375rem !important;
  }

  .size-lg {
    font-size: 1.125rem !important;
  }

  .size-xl {
    font-size: 1.3125rem !important;
  }

  .missing {
    flex-basis: 100%;
    margin: 0;
    padding: 0.625rem 1rem;
    border-radius: 14px;
    background: var(--warn-bg);
    color: var(--warn);
    font-weight: 500;
  }
</style>
