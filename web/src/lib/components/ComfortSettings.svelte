<script lang="ts">
  import type { CoachController } from "../controller.svelte";
  import type { TextSize } from "../infrastructure/preferences";
  import { SPEECH_CATALOGS, VOICE_LANGUAGES, type VoiceLanguage } from "../i18n/speech";
  import * as msg from "../messages";
  import Notice from "./Notice.svelte";
  import Segmented from "./Segmented.svelte";
  import SettingRow from "./SettingRow.svelte";

  let { coach, sample = false }: { coach: CoachController; sample?: boolean } = $props();

  const languageOptions = VOICE_LANGUAGES.map((id) => ({
    id,
    label: SPEECH_CATALOGS[id].label,
    lang: SPEECH_CATALOGS[id].bcp47,
  }));
</script>

<div class="rows">
  <SettingRow label={msg.TEXT_SIZE} hint={msg.TEXT_SIZE_HINT}>
    <Segmented
      label={msg.TEXT_SIZE}
      options={msg.TEXT_SIZES}
      value={coach.textSize}
      onChange={(size: TextSize) => coach.setTextSize(size)}
    />
  </SettingRow>
  {#if sample}
    <p class="sample">{msg.TEXT_SAMPLE}</p>
  {/if}
  <SettingRow label={msg.VOICE_LABEL} hint={msg.VOICE_HINT}>
    <Segmented
      label={msg.VOICE_LABEL}
      options={msg.ON_OFF}
      value={coach.muted ? "off" : "on"}
      onChange={(v) => coach.setMuted(v === "off")}
    />
  </SettingRow>
  <SettingRow label={msg.SOUNDS_LABEL} hint={msg.SOUNDS_HINT}>
    <Segmented
      label={msg.SOUNDS_LABEL}
      options={msg.ON_OFF}
      value={coach.sounds ? "on" : "off"}
      onChange={(v) => coach.setSounds(v === "on")}
    />
  </SettingRow>
  <SettingRow label={msg.LANGUAGE_LABEL} hint={msg.LANGUAGE_HINT}>
    <Segmented
      label={msg.LANGUAGE_LABEL}
      options={languageOptions}
      value={coach.language}
      onChange={(l: VoiceLanguage) => coach.chooseLanguage(l)}
    />
  </SettingRow>
  {#if coach.voiceMissing}
    <Notice>{msg.VOICE_MISSING(SPEECH_CATALOGS[coach.language].label)}</Notice>
  {/if}
</div>

<style>
  .rows {
    display: grid;
  }

  .sample {
    padding: var(--space-5) 0;
    border-bottom: 1px solid var(--color-rule);
    font-size: var(--type-lead);
  }
</style>
