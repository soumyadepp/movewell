/**
 * Listens for spoken commands with the browser's speech recognition.
 *
 * Chrome and Edge provide this as webkitSpeechRecognition, which sends audio
 * to an online speech service. Recognition stops by itself after a silence,
 * so the listener restarts it while it should be running. Every failure is
 * reported, so the screen can say why commands are not being heard.
 */

interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<
    ArrayLike<{ readonly transcript: string }> & { readonly isFinal: boolean }
  >;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

const RESTART_DELAY_MS = 250;
/** Guesses asked for per phrase; a command in any of them counts, which absorbs mishearings. */
const ALTERNATIVES = 5;
const NETWORK_RETRY_MS = 3000;
const MAX_NETWORK_RETRIES = 3;
/** A session aborted sooner than this was taken over by another recogniser. */
const QUICK_ABORT_MS = 1500;
/** Quick aborts in a row before giving up and saying something else is listening. */
const MAX_QUICK_ABORTS = 5;
const MAX_BACKOFF_MS = 4000;
/** Sessions longer than this were healthy, so earlier aborts are forgiven. */
const HEALTHY_SESSION_MS = 3000;
const CHANNEL = "movewell-voice-commands";

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Why the listener is not hearing commands.
 * blocked: microphone permission was refused.
 * no-microphone: no working microphone was found.
 * network: the browser's online speech service could not be reached.
 * unavailable: this browser or language cannot recognise speech.
 * busy: something else in the browser keeps taking the speech recogniser.
 * other-tab: another MoveWell tab started listening, so this one stopped.
 */
export type ListenerProblem =
  | "busy"
  | "other-tab"
  | "blocked"
  | "no-microphone"
  | "network"
  | "unavailable";

/**
 * Called with the recogniser's guesses for each phrase, best first, final or
 * still in progress. Returns true when it acted on it, so the same utterance
 * is never acted on twice.
 */
export type HeardHandler = (
  guesses: readonly string[],
  final: boolean,
) => boolean;

export class CommandListener {
  private recognition: Recognition | null = null;
  private wanted = false;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private networkRetries = 0;
  private handled = new Set<number>();
  private startedAt = 0;
  private quickAborts = 0;
  private readonly id = Math.random().toString(36).slice(2);
  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(CHANNEL);

  constructor(
    private readonly onHeard: HeardHandler,
    private readonly onProblem: (problem: ListenerProblem) => void,
    private readonly onStarted: () => void = () => undefined,
    private readonly onSpeech: (speaking: boolean) => void = () => undefined,
  ) {
    this.channel?.addEventListener(
      "message",
      (event: MessageEvent<{ claim?: string }>) => {
        if (event.data?.claim && event.data.claim !== this.id && this.wanted) {
          this.stop();
          this.onProblem("other-tab");
        }
      },
    );
  }

  /** True when this browser can recognise speech at all. */
  static get supported(): boolean {
    return recognitionClass() !== null;
  }

  /**
   * Starts listening in a language, restarting after silences until stopped.
   *
   * Args:
   *   bcp47: Language tag such as "en-IN" or "hi-IN".
   */
  start(bcp47: string): void {
    const Recognition = recognitionClass();
    if (!Recognition) {
      this.onProblem("unavailable");
      return;
    }
    this.stop();
    this.wanted = true;
    this.networkRetries = 0;
    this.quickAborts = 0;
    this.channel?.postMessage({ claim: this.id });
    const recognition = new Recognition();
    recognition.lang = bcp47;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = ALTERNATIVES;
    recognition.onspeechstart = () => this.onSpeech(true);
    recognition.onspeechend = () => this.onSpeech(false);
    recognition.onstart = () => {
      this.startedAt = Date.now();
      this.handled = new Set();
      this.onStarted();
    };
    recognition.onresult = (event) => {
      this.networkRetries = 0;
      this.quickAborts = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (this.handled.has(i)) continue;
        const result = event.results[i];
        const guesses = Array.from(
          { length: result.length },
          (_, k) => result[k].transcript,
        );
        if (this.onHeard(guesses, result.isFinal)) this.handled.add(i);
      }
    };
    recognition.onerror = (event) => this.onError(event.error);
    recognition.onend = () => {
      this.onSpeech(false);
      if (!this.wanted) return;
      if (Date.now() - this.startedAt > HEALTHY_SESSION_MS)
        this.quickAborts = 0;
      const delay =
        this.networkRetries > 0
          ? NETWORK_RETRY_MS
          : Math.min(MAX_BACKOFF_MS, RESTART_DELAY_MS * 2 ** this.quickAborts);
      this.restartTimer = setTimeout(() => {
        try {
          if (this.wanted) recognition.start();
        } catch {
          return;
        }
      }, delay);
    };
    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.onProblem("unavailable");
    }
  }

  stop(): void {
    this.wanted = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      const old = this.recognition;
      old.onend = null;
      old.onerror = null;
      old.onresult = null;
      old.onstart = null;
      old.onspeechstart = null;
      old.onspeechend = null;
      old.abort();
      this.recognition = null;
    }
  }

  private onError(error: string): void {
    if (error === "no-speech") return;
    if (error === "aborted") {
      if (!this.wanted || Date.now() - this.startedAt > QUICK_ABORT_MS) return;
      this.quickAborts += 1;
      if (this.quickAborts < MAX_QUICK_ABORTS) return;
      this.wanted = false;
      this.onProblem("busy");
      return;
    }
    if (error === "network") {
      this.networkRetries += 1;
      if (this.networkRetries <= MAX_NETWORK_RETRIES) return;
      this.wanted = false;
      this.onProblem("network");
      return;
    }
    this.wanted = false;
    if (error === "not-allowed" || error === "service-not-allowed")
      this.onProblem("blocked");
    else if (error === "audio-capture") this.onProblem("no-microphone");
    else this.onProblem("unavailable");
  }
}
