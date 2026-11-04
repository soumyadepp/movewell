/**
 * Spoken phrases per language, addressed by stable keys.
 *
 * The app speaks keys, never raw sentences. Each key maps to a pre-recorded
 * clip (see scripts/generate-voice.ts) with browser speech as a fallback, so
 * adding a language means adding one catalog here and re-running the script.
 */
import { ExerciseMode, type FindingId, ViewMode } from "../domain/models";

export type VoiceLanguage = "en" | "hi";

export const MAX_RECORDED_COUNT = 30;

export interface SpeechCatalog {
  readonly bcp47: string;
  readonly label: string;
  readonly recordingVoice: string;
  readonly recordingRate: number;
  readonly selected: string;
  countWord(total: number): string;
  readonly goalReached: string;
  readonly moveIntoView: string;
  readonly view: Record<ViewMode, string>;
  readonly mode: Record<ExerciseMode, string>;
  readonly timerStarted: string;
  readonly timerPaused: string;
  readonly saved: string;
  readonly routineStart: string;
  readonly routineComplete: string;
  readonly corrections: Record<FindingId, string>;
}

const HINDI_NUMBERS = [
  "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
  "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
  "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस",
];

const en: SpeechCatalog = {
  bcp47: "en-IN",
  label: "English",
  recordingVoice: "Tara",
  recordingRate: 175,
  selected: "English voice selected.",
  countWord: (total) => `${total}.`,
  goalReached: "Great job! Target reached. Take a short rest.",
  moveIntoView: "Please move into the camera view.",
  view: {
    [ViewMode.Front]: "Front view. Face the camera.",
    [ViewMode.Side]: "Side view. Turn sideways to the camera.",
  },
  mode: {
    [ExerciseMode.Posture]: "Posture observation selected.",
    [ExerciseMode.ArmRaise]: "Shoulder raise selected. Raise your arms slowly.",
    [ExerciseMode.ElbowCurl]: "Elbow curl selected. Bend your elbows slowly towards your shoulders.",
    [ExerciseMode.Marching]: "Marching selected. Lift one knee at a time.",
    [ExerciseMode.SideLegRaise]: "Side leg raise selected. Hold a chair for support.",
    [ExerciseMode.SideBend]: "Side bend selected. Lean gently to one side, then return.",
    [ExerciseMode.SitToStand]: "Sit to stand selected. Use a sturdy chair for support.",
  },
  timerStarted: "Session timer started.",
  timerPaused: "Session timer paused.",
  saved: "Session saved.",
  routineStart: "Let's begin today's routine.",
  routineComplete: "Routine complete. Great work today!",
  corrections: {
    shoulder_height: "Stand comfortably; avoid deliberately forcing one shoulder down.",
    hip_height: "Stand naturally with weight shared comfortably across both feet.",
    trunk_shift: "Try standing comfortably without leaning to one side.",
    knee_alignment: "During a bend, keep each knee generally tracking in the direction of its foot.",
    head_forward: "Gently bring your head back over your shoulders; keep your gaze level.",
    trunk_incline: "Find a comfortable upright position without forcing your back.",
    knee_bent: "If you are standing for posture assessment, stand comfortably and avoid locking the knees.",
  },
};

const hi: SpeechCatalog = {
  bcp47: "hi-IN",
  label: "हिन्दी",
  recordingVoice: "Lekha",
  recordingRate: 160,
  selected: "हिन्दी आवाज़ चुनी गई।",
  countWord: (total) => HINDI_NUMBERS[total - 1] ?? String(total),
  goalReached: "लक्ष्य पूरा हुआ। बहुत बढ़िया। अब थोड़ा आराम कीजिए।",
  moveIntoView: "कृपया कैमरे के सामने आइए।",
  view: {
    [ViewMode.Front]: "सामने का व्यू। कैमरे की ओर मुँह कीजिए।",
    [ViewMode.Side]: "साइड व्यू। कैमरे की ओर बगल से खड़े होइए।",
  },
  mode: {
    [ExerciseMode.Posture]: "पोस्चर जाँच चुनी गई।",
    [ExerciseMode.ArmRaise]: "कंधा उठाने का व्यायाम चुना गया। बाँहें धीरे-धीरे उठाइए।",
    [ExerciseMode.ElbowCurl]: "कोहनी मोड़ने का व्यायाम चुना गया। हाथ धीरे-धीरे कंधे की ओर लाइए।",
    [ExerciseMode.Marching]: "कदमताल चुना गया। एक-एक करके घुटने उठाइए।",
    [ExerciseMode.SideLegRaise]: "पैर बगल में उठाने का व्यायाम चुना गया। सहारे के लिए कुर्सी पकड़िए।",
    [ExerciseMode.SideBend]: "बगल में झुकने का व्यायाम चुना गया। धीरे से एक ओर झुकिए, फिर सीधे होइए।",
    [ExerciseMode.SitToStand]: "बैठकर खड़े होने का व्यायाम चुना गया। सहारे के लिए मज़बूत कुर्सी रखिए।",
  },
  timerStarted: "सत्र टाइमर शुरू हुआ।",
  timerPaused: "सत्र टाइमर रुका।",
  saved: "सत्र सहेजा गया।",
  routineStart: "चलिए, आज का व्यायाम शुरू करते हैं।",
  routineComplete: "आज का व्यायाम पूरा हुआ। बहुत बढ़िया!",
  corrections: {
    shoulder_height: "आराम से खड़े रहिए; एक कंधे को जानबूझकर नीचे मत दबाइए।",
    hip_height: "दोनों पैरों पर बराबर वज़न रखकर सहज रूप से खड़े रहिए।",
    trunk_shift: "किसी एक तरफ़ झुके बिना आराम से सीधे खड़े होइए।",
    knee_alignment: "झुकते समय हर घुटने को उसके पैर की दिशा में रखिए।",
    head_forward: "धीरे से सिर को कंधों के ऊपर पीछे लाइए; नज़र सीधी रखिए।",
    trunk_incline: "पीठ पर ज़ोर डाले बिना आराम से सीधे खड़े होइए।",
    knee_bent: "पोस्चर जाँच के लिए आराम से खड़े रहिए और घुटनों को लॉक मत कीजिए।",
  },
};

export const SPEECH_CATALOGS: Record<VoiceLanguage, SpeechCatalog> = { en, hi };
export const VOICE_LANGUAGES = Object.keys(SPEECH_CATALOGS) as VoiceLanguage[];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_");

/** Builders for stable phrase keys, which double as clip file names. */
export const PhraseKey = {
  selected: "selected",
  goalReached: "goal_reached",
  moveIntoView: "move_into_view",
  timerStarted: "timer_started",
  timerPaused: "timer_paused",
  saved: "saved",
  routineStart: "routine_start",
  routineComplete: "routine_complete",
  count: (total: number) => `count_${total}`,
  view: (view: ViewMode) => `view_${slug(view)}`,
  mode: (mode: ExerciseMode) => `mode_${slug(mode)}`,
  correction: (id: FindingId) => `correction_${id}`,
} as const;

/** Returns every key and text a catalog can speak, including recorded counts. */
export function phraseTable(catalog: SpeechCatalog): Map<string, string> {
  const table = new Map<string, string>([
    [PhraseKey.selected, catalog.selected],
    [PhraseKey.goalReached, catalog.goalReached],
    [PhraseKey.moveIntoView, catalog.moveIntoView],
    [PhraseKey.timerStarted, catalog.timerStarted],
    [PhraseKey.timerPaused, catalog.timerPaused],
    [PhraseKey.saved, catalog.saved],
    [PhraseKey.routineStart, catalog.routineStart],
    [PhraseKey.routineComplete, catalog.routineComplete],
  ]);
  for (const view of Object.values(ViewMode)) table.set(PhraseKey.view(view), catalog.view[view]);
  for (const mode of Object.values(ExerciseMode)) table.set(PhraseKey.mode(mode), catalog.mode[mode]);
  for (const [id, text] of Object.entries(catalog.corrections)) {
    table.set(PhraseKey.correction(id as FindingId), text);
  }
  for (let n = 1; n <= MAX_RECORDED_COUNT; n++) table.set(PhraseKey.count(n), catalog.countWord(n));
  return table;
}

/** Resolves a key to text, covering counts beyond the recorded range. */
export function phraseText(catalog: SpeechCatalog, key: string): string | null {
  const count = /^count_(\d+)$/.exec(key);
  if (count) return catalog.countWord(Number(count[1]));
  return phraseTable(catalog).get(key) ?? null;
}
