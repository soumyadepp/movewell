/**
 * Hands-free control during a session.
 *
 * Owns the speech listener and the echo filter, exposes what is being heard
 * as reactive state for the voice status, and passes recognised commands to
 * the session. Listens only while enabled by the person and a session is
 * running, and follows the page as it is hidden and shown again.
 */
import { type Command, EchoFilter, MAX_INTERIM_WORDS, MAX_WORDS, parseCommand } from "./commands";
import { SPEECH_CATALOGS, type VoiceLanguage } from "./i18n/speech";
import { CommandListener, type ListenerProblem } from "./infrastructure/listener";
import { secondsClock } from "./session";

/** How long a recognised command stays highlighted, in milliseconds. */
const HEARD_MS = 2500;

/** Problems that listening again will not fix without the person's help. */
const PERMANENT: readonly ListenerProblem[] = ["blocked", "no-microphone", "unavailable"];

export interface VoiceCommandOptions {
  /** The language to listen in. */
  language: () => VoiceLanguage;
  /** Applies a command; returns false if nothing could act on it. */
  onCommand: (command: Command) => boolean;
  /** Short description of the session state, for the console log. */
  describe?: () => string | undefined;
}

/** Spoken-command state and listening for one page. */
export class VoiceCommands {
  listening = $state(false);
  hearing = $state(false);
  heard = $state<Command | null>(null);
  heardText = $state("");
  problem = $state<ListenerProblem | null>(null);

  private enabled = false;
  private active = false;
  private heardTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly echo = new EchoFilter();
  private readonly listener = new CommandListener(
    (guesses, final) => this.onHeard(guesses, final),
    (problem) => {
      this.problem = problem;
      this.listening = false;
    },
    () => (this.listening = true),
    (speaking) => (this.hearing = speaking),
  );

  constructor(private readonly options: VoiceCommandOptions) {
    if (typeof window === "undefined") return;
    document.addEventListener("visibilitychange", () => this.onPageShown(document.visibilityState === "visible"));
    window.addEventListener("focus", () => this.onPageShown(true));
  }

  /** True when this browser can listen for spoken commands. */
  get supported(): boolean {
    return CommandListener.supported;
  }

  /** Follows the person's setting. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    this.problem = null;
    this.sync();
  }

  /** Starts listening, if enabled, because a session began. */
  activate(): void {
    this.active = true;
    this.sync();
  }

  /** Stops listening because the session ended. */
  deactivate(): void {
    this.active = false;
    this.sync();
  }

  /** Listens again in the current language, for example after it changed. */
  restart(): void {
    if (this.listening) this.start();
  }

  /**
   * Remembers something the app said, so hearing it back is not a command.
   *
   * Args:
   *   text: The sentence the app spoke.
   */
  recordSpoken(text: string): void {
    this.echo.record(text, secondsClock());
  }

  private sync(): void {
    if (this.enabled && this.active) this.start();
    else this.stop();
  }

  private start(): void {
    this.problem = null;
    this.listening = false;
    this.listener.start(SPEECH_CATALOGS[this.options.language()].bcp47);
  }

  private stop(): void {
    this.listener.stop();
    this.listening = false;
    this.hearing = false;
  }

  /**
   * Chrome takes speech recognition away from hidden or background pages.
   * Stop quietly when hidden, and listen again whenever the page is back in
   * front, unless the microphone itself is the problem.
   */
  private onPageShown(visible: boolean): void {
    if (!this.enabled || !this.active) return;
    if (!visible) {
      this.stop();
      return;
    }
    const permanent = this.problem !== null && PERMANENT.includes(this.problem);
    if (!permanent && (!this.listening || this.problem)) this.start();
  }

  /**
   * Looks for a command in the recogniser's guesses for a phrase.
   *
   * Returns:
   *   True if a command was acted on, so the phrase is not acted on twice.
   */
  private onHeard(guesses: readonly string[], final: boolean): boolean {
    const text = guesses[0]?.trim() ?? "";
    const now = secondsClock();
    if (!text || this.echo.isEcho(text, now)) return false;
    const command = this.findCommand(guesses, final, now);
    if (final || command) this.show(text, command, guesses, final);
    return command !== null && this.options.onCommand(command);
  }

  private findCommand(guesses: readonly string[], final: boolean, now: number): Command | null {
    const maxWords = final ? MAX_WORDS : MAX_INTERIM_WORDS;
    for (const guess of guesses) {
      if (this.echo.isEcho(guess, now)) continue;
      const command = parseCommand(guess, this.options.language(), maxWords);
      if (command) return command;
    }
    return null;
  }

  private show(text: string, command: Command | null, guesses: readonly string[], final: boolean): void {
    console.info("[MoveWell voice]", { heard: guesses, final, command, state: this.options.describe?.() });
    this.heardText = text;
    this.heard = command;
    clearTimeout(this.heardTimer);
    if (command) this.heardTimer = setTimeout(() => (this.heard = null), HEARD_MS);
  }
}
