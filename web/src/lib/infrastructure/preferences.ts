/** The person's settings and daily plan, saved in this browser. */
import type { VoiceLanguage } from "../i18n/speech";
import { DAILY_ROUTINE, planFrom, type RoutinePlan } from "../routine";
import { JsonStore, type KeyValueStore } from "./jsonStore";

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

/** Reads and writes preferences, filling anything missing with defaults. */
export class PreferencesRepository {
  private readonly store: JsonStore<Preferences>;

  /**
   * Args:
   *   key: The storage key.
   *   storage: Where to keep it; the browser's local storage by default.
   */
  constructor(key: string, storage?: KeyValueStore | null) {
    this.store = new JsonStore(
      key,
      (raw) => ({ ...DEFAULT_PREFERENCES, ...(raw && typeof raw === "object" ? (raw as Partial<Preferences>) : {}) }),
      () => ({ ...DEFAULT_PREFERENCES }),
      storage,
    );
  }

  /**
   * Loads saved preferences.
   *
   * Returns:
   *   The saved preferences over the defaults, or the defaults if none are saved or they cannot be read.
   */
  load(): Preferences {
    return this.store.load();
  }

  /**
   * Saves the preferences, ignoring storage that is full or blocked.
   *
   * Args:
   *   preferences: Everything the person has set.
   */
  save(preferences: Preferences): void {
    this.store.save(preferences);
  }
}

/** Reads and writes the person's own daily plan. */
export class PlanRepository {
  private readonly store: JsonStore<RoutinePlan>;

  /**
   * Args:
   *   key: The storage key.
   *   storage: Where to keep it; the browser's local storage by default.
   */
  constructor(key: string, storage?: KeyValueStore | null) {
    this.store = new JsonStore(key, planFrom, () => DAILY_ROUTINE, storage);
  }

  /**
   * Loads the saved plan.
   *
   * Returns:
   *   The saved plan, validated, or the physiotherapist's plan if there is none.
   */
  load(): RoutinePlan {
    return this.store.load();
  }

  /**
   * Saves the plan's steps and rest, ignoring storage that is full or blocked.
   *
   * Args:
   *   plan: The person's plan.
   */
  save(plan: RoutinePlan): void {
    this.store.save({ steps: plan.steps, restS: plan.restS });
  }

  /** Forgets the saved plan, so the physiotherapist's plan is used again. */
  clear(): void {
    this.store.clear();
  }
}
