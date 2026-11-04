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
  readonly results: ArrayLike<{
    readonly isFinal: boolean;
    readonly 0: { readonly transcript: string };
  }>;
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
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

const RESTART_DELAY_MS = 250;
const NETWORK_RETRY_MS = 3000;
const MAX_NETWORK_RETRIES = 3;

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
 */
export type ListenerProblem =
  "blocked" | "no-microphone" | "network" | "unavailable";

/**
 * Called with each transcript, final or still in progress. Returns true when
 * it acted on it, so the same utterance is never acted on twice.
 */
export type HeardHandler = (transcript: string, final: boolean) => boolean;

export class CommandListener {
  private recognition: Recognition | null = null;
  private wanted = false;
  private restartTimer: ReturnType<typeof setTimeout> | undefined;
  private networkRetries = 0;
  private handled = new Set<number>();

  constructor(
    private readonly onHeard: HeardHandler,
    private readonly onProblem: (problem: ListenerProblem) => void,
    private readonly onStarted: () => void = () => undefined,
  ) {}

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
    const recognition = new Recognition();
    recognition.lang = bcp47;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      this.handled = new Set();
      this.onStarted();
    };
    recognition.onresult = (event) => {
      this.networkRetries = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (this.handled.has(i)) continue;
        const result = event.results[i];
        if (this.onHeard(result[0].transcript, result.isFinal))
          this.handled.add(i);
      }
    };
    recognition.onerror = (event) => this.onError(event.error);
    recognition.onend = () => {
      if (!this.wanted) return;
      const delay =
        this.networkRetries > 0 ? NETWORK_RETRY_MS : RESTART_DELAY_MS;
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
      this.recognition.onend = null;
      this.recognition.abort();
      this.recognition = null;
    }
  }

  private onError(error: string): void {
    if (error === "no-speech" || error === "aborted") return;
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
