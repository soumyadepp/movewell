/** The person's settings and daily plan, saved in this browser. */
import type { VoiceLanguage } from "../i18n/speech";
import { DAILY_ROUTINE, planFrom, type RoutinePlan } from "../routine";

export type TextSize = "md" | "lg" | "xl";

export interface Preferences {
  textSize: TextSize;
  language: VoiceLanguage;
  muted: boolean;
  sounds: boolean;
  voiceCommands: boolean;
  name: string;
  onboarded: boolean;
  showSkeleton: boolean;
  recordSessions: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  textSize: "lg",
  language: "en",
  muted: false,
  sounds: true,
  voiceCommands: false,
  name: "",
  onboarded: false,
  showSkeleton: false,
  recordSessions: false,
};

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeLocalStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Reads and writes preferences, filling anything missing with defaults. */
export class PreferencesRepository {
  constructor(
    private readonly key: string,
    private readonly storage: KeyValueStore | null = safeLocalStorage(),
  ) {}

  /**
   * Loads saved preferences.
   *
   * Returns:
   *   The saved preferences over the defaults, or the defaults if none are saved or they cannot be read.
   */
  load(): Preferences {
    try {
      const raw = this.storage?.getItem(this.key);
      return { ...DEFAULT_PREFERENCES, ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Saves the preferences, ignoring storage that is full or blocked.
   *
   * Args:
   *   preferences: Everything the person has set.
   */
  save(preferences: Preferences): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify(preferences));
    } catch {
      return;
    }
  }
}

/** Reads and writes the person's own daily plan. */
export class PlanRepository {
  constructor(
    private readonly key: string,
    private readonly storage: KeyValueStore | null = safeLocalStorage(),
  ) {}

  /**
   * Loads the saved plan.
   *
   * Returns:
   *   The saved plan, validated, or the physiotherapist's plan if there is none.
   */
  load(): RoutinePlan {
    try {
      const raw = this.storage?.getItem(this.key);
      return raw ? planFrom(JSON.parse(raw)) : DAILY_ROUTINE;
    } catch {
      return DAILY_ROUTINE;
    }
  }

  /**
   * Saves the plan's steps and rest, ignoring storage that is full or blocked.
   *
   * Args:
   *   plan: The person's plan.
   */
  save(plan: RoutinePlan): void {
    try {
      this.storage?.setItem(this.key, JSON.stringify({ steps: plan.steps, restS: plan.restS }));
    } catch {
      return;
    }
  }

  /** Forgets the saved plan, so the physiotherapist's plan is used again. */
  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      return;
    }
  }
}
