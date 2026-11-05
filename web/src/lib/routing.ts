/** Hash routes for every screen, and parsing a location hash back into one. */
import { DEFAULT_GOAL } from "./config";
import { type CountedExercise, type ExerciseMode, exerciseFromSlug, exerciseSlug, isCounted } from "./domain/models";

export type SetupStep = "welcome" | "comfort" | "space";

export type Route =
  | { name: "setup"; step: SetupStep }
  | { name: "home" }
  | { name: "library" }
  | { name: "detail"; mode: ExerciseMode }
  | { name: "workout"; kind: "routine" }
  | { name: "workout"; kind: "single"; mode: CountedExercise; target: number }
  | { name: "summary" }
  | { name: "week" }
  | { name: "settings" }
  | { name: "plan" };

export const href = {
  home: "#/",
  library: "#/exercises",
  detail: (mode: ExerciseMode) => `#/exercises/${exerciseSlug(mode)}`,
  routine: "#/workout/routine",
  single: (mode: ExerciseMode, target: number) => `#/workout/${exerciseSlug(mode)}?target=${target}`,
  summary: "#/summary",
  week: "#/week",
  settings: "#/settings",
  plan: "#/plan",
  setup: (step: SetupStep) => `#/setup/${step}`,
};

const SIMPLE: Record<string, Route> = {
  exercises: { name: "library" },
  week: { name: "week" },
  progress: { name: "week" },
  settings: { name: "settings" },
  plan: { name: "plan" },
  summary: { name: "summary" },
};

/**
 * Parses a location hash into a route.
 *
 * Args:
 *   hash: The location hash, such as "#/exercises/arm-raise".
 *
 * Returns:
 *   The matching route, or home when nothing matches.
 */
export function parseRoute(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const [first, second] = path.split("/").filter(Boolean);
  if (first === "exercises" && second) {
    const mode = exerciseFromSlug(second);
    return mode ? { name: "detail", mode } : { name: "library" };
  }
  if (first === "setup")
    return { name: "setup", step: second === "comfort" || second === "space" ? second : "welcome" };
  if (first === "workout") return workoutRoute(second, query);
  return SIMPLE[first ?? ""] ?? { name: "home" };
}

function workoutRoute(slug: string | undefined, query: string): Route {
  if (slug === "routine") return { name: "workout", kind: "routine" };
  const mode = slug ? exerciseFromSlug(slug) : null;
  if (!mode || !isCounted(mode)) return { name: "home" };
  const target = Number(new URLSearchParams(query).get("target")) || DEFAULT_GOAL;
  return { name: "workout", kind: "single", mode, target };
}
