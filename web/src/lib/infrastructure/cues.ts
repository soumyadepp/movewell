/**
 * Short sound cues that confirm what the camera sees, without words.
 *
 * Tones are synthesised with the Web Audio API, so there are no files to load
 * and they play instantly. Pitches stay between roughly 440 and 1050 Hz, where
 * age-related hearing loss has the least effect, and every note fades in and
 * out to avoid harsh clicks. Rising tones mean "ready", falling tones mean
 * "check your position". The goal cue starts a beat late so it follows the
 * tick of the final repetition instead of clashing with it.
 */
import type { EventBus } from "../events";
import type { Clock } from "../session";
import { CooldownGate } from "./voice";

export type Cue = "ready" | "attention" | "rep" | "goal";

export interface Note {
  readonly hz: number;
  readonly startS: number;
  readonly durationS: number;
  readonly wave: OscillatorType;
}

export const CUES: Record<Cue, readonly Note[]> = {
  ready: [
    { hz: 523.25, startS: 0, durationS: 0.14, wave: "sine" },
    { hz: 783.99, startS: 0.13, durationS: 0.2, wave: "sine" },
  ],
  attention: [
    { hz: 659.25, startS: 0, durationS: 0.18, wave: "triangle" },
    { hz: 440, startS: 0.17, durationS: 0.26, wave: "triangle" },
  ],
  rep: [{ hz: 587.33, startS: 0, durationS: 0.1, wave: "sine" }],
  goal: [
    { hz: 523.25, startS: 0.18, durationS: 0.16, wave: "sine" },
    { hz: 659.25, startS: 0.32, durationS: 0.16, wave: "sine" },
    { hz: 783.99, startS: 0.46, durationS: 0.16, wave: "sine" },
    { hz: 1046.5, startS: 0.6, durationS: 0.4, wave: "sine" },
  ],
};

/** Seconds before the same cue may play again, so flickering tracking never chatters. */
export const CUE_COOLDOWN_S = 1.5;

const PEAK_GAIN = 0.28;
const ATTACK_S = 0.015;
const RELEASE_S = 0.06;

/** Port for anything that can play a cue. */
export interface CuePlayer {
  enabled: boolean;
  play(cue: Cue): void;
}

/** Plays cues through a lazily created AudioContext. */
export class WebAudioCuePlayer implements CuePlayer {
  enabled = true;
  private context: AudioContext | null = null;

  /**
   * Creates or resumes the audio context. Call from a click handler, since
   * browsers only allow audio to start after a user gesture.
   */
  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === "suspended") void context.resume();
  }

  play(cue: Cue): void {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime + 0.01;
    for (const note of CUES[cue]) this.scheduleNote(context, note, start);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (
      typeof window === "undefined" ||
      typeof window.AudioContext === "undefined"
    )
      return null;
    this.context = new window.AudioContext();
    return this.context;
  }

  private scheduleNote(context: AudioContext, note: Note, base: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = base + note.startS;
    const end = at + note.durationS;
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.hz, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, at + ATTACK_S);
    gain.gain.setValueAtTime(
      PEAK_GAIN,
      Math.max(at + ATTACK_S, end - RELEASE_S),
    );
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(end + 0.02);
  }
}

/**
 * Maps session events to cues.
 *
 * Body found and position fixed share the "ready" cue; body lost and a
 * position problem share the "attention" cue. Each cue has its own cooldown,
 * so a body that is found and then immediately confirmed in position plays
 * one tone, not two.
 *
 * Args:
 *   events: The session event bus.
 *   player: Where cues are played.
 *   clock: Seconds clock used for the cooldowns.
 */
export function attachCues(
  events: EventBus,
  player: CuePlayer,
  clock: Clock,
): void {
  const gates: Record<Cue, CooldownGate> = {
    ready: new CooldownGate(CUE_COOLDOWN_S, clock),
    attention: new CooldownGate(CUE_COOLDOWN_S, clock),
    rep: new CooldownGate(0, clock),
    goal: new CooldownGate(0, clock),
  };
  const play = (cue: Cue) => {
    if (gates[cue].allow(false)) player.play(cue);
  };
  events.subscribe("bodyFound", () => play("ready"));
  events.subscribe("positionReady", () => play("ready"));
  events.subscribe("bodyLost", () => play("attention"));
  events.subscribe("positionBlocked", () => play("attention"));
  events.subscribe("repCounted", () => play("rep"));
  events.subscribe("goalReached", () => play("goal"));
  events.subscribe("countdownFinished", () => play("ready"));
  events.subscribe("rangeLearned", () => player.play("ready"));
  events.subscribe("countdownTick", () => player.play("rep"));
}
