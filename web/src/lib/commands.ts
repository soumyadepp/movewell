/**
 * Spoken commands for hands-free sessions.
 *
 * Only short utterances (a few words) are considered, and a command phrase
 * must appear in them as whole words. The app's own spoken coaching is always
 * a longer sentence, so it can never trigger an action by being overheard.
 * Common mishearings and English words written in Devanagari are accepted.
 */
import type { VoiceLanguage } from "./i18n/speech";
import type { RoutinePhase } from "./routine";

export type Command = "next" | "pause" | "resume" | "end" | "yes" | "no";

/** Longest finished utterance, in words, that can still be a command. */
export const MAX_WORDS = 4;
/** Longest in-progress utterance acted on before the speaker has finished. */
export const MAX_INTERIM_WORDS = 2;

const PHRASES: Record<VoiceLanguage, Record<Command, readonly string[]>> = {
  en: {
    next: [
      "next",
      "next one",
      "next exercise",
      "skip",
      "skip it",
      "skip this",
      "start",
      "ready",
      "i'm ready",
      "go",
      "necks",
    ],
    pause: [
      "pause",
      "wait",
      "hold on",
      "stop",
      "paws",
      "pose",
      "pours",
      "pores",
    ],
    resume: [
      "carry on",
      "continue",
      "resume",
      "keep going",
      "start again",
      "go on",
      "kerry on",
      "carrie on",
    ],
    end: [
      "end session",
      "end",
      "end the session",
      "end now",
      "finish",
      "i'm done",
      "quit",
    ],
    yes: ["yes", "yeah", "okay", "ok"],
    no: ["no", "cancel", "nope"],
  },
  hi: {
    next: [
      "आगे",
      "अगला",
      "अगला व्यायाम",
      "छोड़ो",
      "शुरू",
      "शुरू करो",
      "तैयार",
      "नेक्स्ट",
      "स्किप",
      "स्टार्ट",
      "रेडी",
    ],
    pause: ["रुको", "रुकिए", "ठहरो", "रोको", "पॉज", "पोज", "स्टॉप", "वेट"],
    resume: [
      "चलो",
      "जारी रखो",
      "फिर से शुरू",
      "आगे बढ़ो",
      "कैरी ऑन",
      "कंटिन्यू",
    ],
    end: ["बस", "खत्म", "खत्म करो", "समाप्त", "एंड", "फिनिश"],
    yes: ["हाँ", "हां", "जी हाँ", "ठीक है", "यस", "ओके"],
    no: ["नहीं", "रहने दो", "नो"],
  },
};

/** Commands that move the session win over a bare yes or no in the same utterance. */
const PRIORITY: readonly Command[] = [
  "pause",
  "end",
  "resume",
  "next",
  "yes",
  "no",
];

const FILLERS = new Set([
  "please",
  "um",
  "uh",
  "hey",
  "the",
  "now",
  "just",
  "and",
  "oh",
]);

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFC")
    .replace(/\u093c/g, "")
    .replace(/[-.,!?।"“”]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const containsPhrase = (
  words: readonly string[],
  phrase: readonly string[],
): boolean => words.some((_, i) => phrase.every((p, j) => words[i + j] === p));

/**
 * Finds a command in a short spoken utterance.
 *
 * Args:
 *   transcript: What the speech recogniser heard.
 *   language: The voice language the session is using.
 *   maxWords: Longest utterance to consider.
 *
 * Returns:
 *   The command, or null if the utterance is too long or has no command in
 *   it. English phrases are always accepted, since many Hindi speakers use them.
 */
export function parseCommand(
  transcript: string,
  language: VoiceLanguage,
  maxWords = MAX_WORDS,
): Command | null {
  const heard = normalize(transcript);
  if (!heard) return null;
  const words = heard.split(" ");
  if (words.length > maxWords) return null;
  const meaningful = words.filter((w) => !FILLERS.has(w));
  const tables =
    language === "en" ? [PHRASES.en] : [PHRASES[language], PHRASES.en];
  for (const command of PRIORITY) {
    for (const table of tables) {
      for (const phrase of table[command]) {
        const phraseWords = normalize(phrase).split(" ");
        if (
          containsPhrase(words, phraseWords) ||
          containsPhrase(meaningful, phraseWords)
        )
          return command;
      }
    }
  }
  return null;
}

/** The main phrases to show on screen, one per command, in the given language. */
export function commandHints(language: VoiceLanguage): Record<Command, string> {
  const table = PHRASES[language];
  return {
    next: table.next[0],
    pause: table.pause[0],
    resume: table.resume[0],
    end: table.end[0],
    yes: table.yes[0],
    no: table.no[0],
  };
}

export type CommandAction =
  | "begin"
  | "skipExercise"
  | "skipRest"
  | "pause"
  | "resume"
  | "requestEnd"
  | "confirmEnd"
  | "cancelEnd"
  | "none";

/**
 * Decides what a spoken command does in the current state of a session.
 *
 * Args:
 *   command: The recognised command.
 *   phase: The routine's current phase.
 *   confirmingEnd: Whether "End the session now?" is on screen.
 *
 * Returns:
 *   The action to take, or "none" when the command does not apply.
 */
export function commandAction(
  command: Command,
  phase: RoutinePhase,
  confirmingEnd: boolean,
): CommandAction {
  if (confirmingEnd) {
    if (command === "yes" || command === "end") return "confirmEnd";
    if (command === "no" || command === "resume") return "cancelEnd";
    return "none";
  }
  if (phase === "done") return "none";
  if (command === "end") return "requestEnd";
  if (command === "pause")
    return phase === "exercise" || phase === "countdown" ? "pause" : "none";
  if (command === "resume")
    return phase === "paused" ? "resume" : phase === "intro" ? "begin" : "none";
  if (command === "next") {
    if (phase === "intro") return "begin";
    if (phase === "rest") return "skipRest";
    if (phase === "paused") return "resume";
    return "skipExercise";
  }
  return "none";
}
