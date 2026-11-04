/**
 * Spoken feedback.
 *
 * Primary path: pre-recorded clips (reliable, offline, identical on every
 * device). Fallback: the browser's Web Speech API, used only when a clip is
 * missing, e.g. a count above the recorded range.
 */
import { VOICE } from "../config";
import type { EventBus } from "../events";
import {
  PhraseKey,
  phraseText,
  SPEECH_CATALOGS,
  type VoiceLanguage,
} from "../i18n/speech";
import type { Clock } from "../session";

const CANCEL_GAP_MS = 80;

export interface VoiceManifest {
  languages: Partial<Record<VoiceLanguage, string[]>>;
}

export class CooldownGate {
  private last = -Infinity;

  constructor(
    private readonly cooldownS: number,
    private readonly clock: Clock,
  ) {}

  allow(force: boolean): boolean {
    const now = this.clock();
    if (!force && now - this.last < this.cooldownS) return false;
    this.last = now;
    return true;
  }
}

/**
 * How a phrase competes with what is already playing.
 *
 * interrupt: user actions (mode, view, timer, save) cut in immediately.
 * queue: counts and the target announcement play in order, never cut off.
 * hint: posture tips only play when nothing else is speaking.
 */
export type Priority = "interrupt" | "queue" | "hint";

/** Port for anything that can speak a phrase key in a language. */
export interface Speaker {
  enabled: boolean;
  say(language: VoiceLanguage, key: string, priority?: Priority): void;
  stop(): void;
}

/**
 * Returns the best installed voice for a BCP-47 tag.
 *
 * Exact region matches beat language-only matches. Within those, enhanced or
 * premium system voices rank first, then Google network voices when online,
 * and basic compact voices last.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  bcp47: string,
  online = true,
): SpeechSynthesisVoice | null {
  const lang = bcp47.toLowerCase();
  const base = lang.split("-")[0];
  const norm = (v: SpeechSynthesisVoice) =>
    v.lang.toLowerCase().replace("_", "-");
  const score = (v: SpeechSynthesisVoice) => {
    const tag = norm(v);
    if (tag !== lang && !tag.startsWith(`${base}-`) && tag !== base) return -1;
    let points = tag === lang ? 100 : 50;
    if (/premium|enhanced|neural|natural/i.test(v.name)) points += 30;
    if (/google/i.test(v.name)) points += online ? 20 : -40;
    if (/compact/i.test(v.name)) points -= 10;
    return points;
  };
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const value = score(voice);
    if (value > bestScore) {
      best = voice;
      bestScore = value;
    }
  }
  return best;
}

const speechSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/** Web Speech fallback. Works around Chrome dropping utterances queued right after cancel(). */
export class WebSpeechSpeaker implements Speaker {
  enabled = true;
  private pending: SpeechSynthesisUtterance | null = null;

  say(
    language: VoiceLanguage,
    key: string,
    priority: Priority = "interrupt",
  ): void {
    const catalog = SPEECH_CATALOGS[language];
    const text = phraseText(catalog, key);
    if (!this.enabled || !text || !speechSupported()) return;
    const synth = window.speechSynthesis;
    const busy = synth.speaking || synth.pending;
    if (priority === "hint" && busy) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = catalog.bcp47;
    const voice = pickVoice(synth.getVoices(), catalog.bcp47, navigator.onLine);
    if (voice) utterance.voice = voice;
    utterance.rate = VOICE.rate;
    utterance.volume = VOICE.volume;
    this.pending = utterance;
    synth.resume();
    if (!busy || priority === "queue") {
      synth.speak(utterance);
      return;
    }
    synth.cancel();
    setTimeout(() => {
      if (this.pending === utterance) synth.speak(utterance);
    }, CANCEL_GAP_MS);
  }

  stop(): void {
    this.pending = null;
    if (speechSupported()) window.speechSynthesis.cancel();
  }
}

/**
 * Plays pre-recorded clips, falling back to another speaker when a clip is
 * missing or fails to play. Hints are rate-limited so they never nag.
 */
export class ClipSpeaker implements Speaker {
  enabled = true;
  private readonly hintGate: CooldownGate;
  private readonly cache = new Map<string, HTMLAudioElement>();
  private available: VoiceManifest["languages"] = {};
  private current: HTMLAudioElement | null = null;
  private queue: { language: VoiceLanguage; key: string }[] = [];

  constructor(
    private readonly baseUrl: string,
    private readonly fallback: Speaker,
    clock: Clock,
  ) {
    this.hintGate = new CooldownGate(VOICE.cooldownS, clock);
  }

  async load(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}voice/manifest.json`, {
        cache: "no-cache",
      });
      if (response.ok)
        this.available = ((await response.json()) as VoiceManifest).languages;
    } catch {
      this.available = {};
    }
  }

  hasClips(language: VoiceLanguage): boolean {
    return (this.available[language]?.length ?? 0) > 0;
  }

  /** Warms the browser cache so the first phrase in a language plays instantly. */
  preload(language: VoiceLanguage): void {
    for (const key of this.available[language] ?? []) this.clip(language, key);
  }

  say(
    language: VoiceLanguage,
    key: string,
    priority: Priority = "interrupt",
  ): void {
    if (!this.enabled) return;
    const busy = this.current !== null;
    if (priority === "hint") {
      if (busy || !this.hintGate.allow(false)) return;
    } else if (priority === "queue" && busy) {
      this.queue.push({ language, key });
      return;
    } else if (priority === "interrupt") {
      this.stop();
    }
    this.play(language, key);
  }

  stop(): void {
    this.queue = [];
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
    this.fallback.stop();
  }

  private play(language: VoiceLanguage, key: string): void {
    if (!this.available[language]?.includes(key)) {
      this.fallback.say(language, key, "queue");
      this.next();
      return;
    }
    const audio = this.clip(language, key);
    audio.currentTime = 0;
    audio.volume = VOICE.volume;
    this.current = audio;
    audio.onended = () => {
      if (this.current === audio) this.next();
    };
    audio.play().catch(() => {
      if (this.current !== audio) return;
      this.fallback.say(language, key, "queue");
      this.next();
    });
  }

  private next(): void {
    this.current = null;
    const upcoming = this.queue.shift();
    if (upcoming) this.play(upcoming.language, upcoming.key);
  }

  private clip(language: VoiceLanguage, key: string): HTMLAudioElement {
    const id = `${language}/${key}`;
    let audio = this.cache.get(id);
    if (!audio) {
      audio = new Audio(`${this.baseUrl}voice/${id}.m4a`);
      audio.preload = "auto";
      this.cache.set(id, audio);
    }
    return audio;
  }
}

/** Observer that turns domain events into phrase keys in the active language. */
export function attachVoice(
  events: EventBus,
  speaker: Speaker,
  language: () => VoiceLanguage,
): void {
  const say = (key: string, priority: Priority) =>
    speaker.say(language(), key, priority);
  events.subscribe("repCounted", ({ total }) =>
    say(PhraseKey.count(total), "queue"),
  );
  events.subscribe("goalReached", () => say(PhraseKey.goalReached, "queue"));
  events.subscribe("findingChanged", ({ finding }) =>
    say(PhraseKey.correction(finding.id), "hint"),
  );
  events.subscribe("bodyLost", () => say(PhraseKey.moveIntoView, "hint"));
  events.subscribe("viewChanged", ({ view }) =>
    say(PhraseKey.view(view), "interrupt"),
  );
  events.subscribe("modeChanged", ({ mode }) =>
    say(PhraseKey.mode(mode), "interrupt"),
  );
  events.subscribe("timerToggled", ({ running }) =>
    say(running ? PhraseKey.timerStarted : PhraseKey.timerPaused, "interrupt"),
  );
  events.subscribe("sessionSaved", () => say(PhraseKey.saved, "interrupt"));
  events.subscribe("routineStarted", () =>
    say(PhraseKey.routineStart, "interrupt"),
  );
  events.subscribe("routineCompleted", () =>
    say(PhraseKey.routineComplete, "queue"),
  );
  events.subscribe("countdownTick", ({ remaining }) =>
    say(PhraseKey.count(remaining), "interrupt"),
  );
  events.subscribe("sessionPaused", ({ reason }) =>
    say(
      reason === "away" ? PhraseKey.pausedAway : PhraseKey.pausedUser,
      "interrupt",
    ),
  );
}
