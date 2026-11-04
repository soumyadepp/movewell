<script lang="ts">
  import type { CoachController, TextSize } from "../controller.svelte";
  import { SPEECH_CATALOGS, VOICE_LANGUAGES, type VoiceLanguage } from "../i18n/speech";
  import * as msg from "../messages";
  import Segmented from "./Segmented.svelte";

  let { coach, sample = false }: { coach: CoachController; sample?: boolean } = $props();

  const voiceOptions = [
    { id: "on", label: msg.VOICE_ON },
    { id: "off", label: msg.VOICE_OFF },
  ] as const;
  const languageOptions = VOICE_LANGUAGES.map((id) => ({
    id,
    label: SPEECH_CATALOGS[id].label,
    lang: SPEECH_CATALOGS[id].bcp47,
  }));
</script>

<div class="rows">
  <div class="row">
    <div class="text">
      <h2 class="label">{msg.TEXT_SIZE}</h2>
      <p class="secondary small">{msg.TEXT_SIZE_HINT}</p>
    </div>
    <Segmented
      label={msg.TEXT_SIZE}
      options={msg.TEXT_SIZES}
      value={coach.textSize}
      onChange={(size: TextSize) => coach.setTextSize(size)}
    />
  </div>
  {#if sample}
    <p class="sample">{msg.TEXT_SAMPLE}</p>
  {/if}
  <div class="row">
    <div class="text">
      <h2 class="label">{msg.VOICE_LABEL}</h2>
      <p class="secondary small">{msg.VOICE_HINT}</p>
    </div>
    <Segmented
      label={msg.VOICE_LABEL}
      options={voiceOptions}
      value={coach.muted ? "off" : "on"}
      onChange={(v) => coach.setMuted(v === "off")}
    />
  </div>
  <div class="row">
    <div class="text">
      <h2 class="label">{msg.SOUNDS_LABEL}</h2>
      <p class="secondary small">{msg.SOUNDS_HINT}</p>
    </div>
    <Segmented
      label={msg.SOUNDS_LABEL}
      options={voiceOptions}
      value={coach.sounds ? "on" : "off"}
      onChange={(v) => coach.setSounds(v === "on")}
    />
  </div>
  <div class="row">
    <div class="text">
      <h2 class="label">{msg.LANGUAGE_LABEL}</h2>
      <p class="secondary small">{msg.LANGUAGE_HINT}</p>
    </div>
    <Segmented
      label={msg.LANGUAGE_LABEL}
      options={languageOptions}
      value={coach.language}
      onChange={(l: VoiceLanguage) => coach.chooseLanguage(l)}
    />
  </div>
  {#if coach.voiceMissing}
    <p class="warning" role="status">{msg.VOICE_MISSING(SPEECH_CATALOGS[coach.language].label)}</p>
  {/if}
</div>

<style>
  .rows {
    display: grid;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4) var(--space-8);
    padding: var(--space-6) 0;
    border-bottom: 1px solid var(--color-rule);
  }

  .text {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .label {
    font-family: var(--font-text);
    font-size: var(--type-lead);
    font-weight: var(--weight-semibold);
    letter-spacing: 0;
  }

  .sample {
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--color-rule);
    font-size: var(--type-lead);
  }

  .warning {
    margin-top: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-md);
    background: var(--color-warning-surface);
    color: var(--color-warning);
    font-size: var(--type-small);
  }
</style>
