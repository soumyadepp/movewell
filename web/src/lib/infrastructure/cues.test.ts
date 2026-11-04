import { describe, expect, it } from "vitest";
import { ExerciseMode } from "../domain/models";
import { EventBus } from "../events";
import { FakeClock } from "../testing/poses";
import {
  attachCues,
  CUE_COOLDOWN_S,
  CUES,
  type Cue,
  type CuePlayer,
} from "./cues";

class RecordingPlayer implements CuePlayer {
  enabled = true;
  played: Cue[] = [];
  play(cue: Cue) {
    this.played.push(cue);
  }
}

function setup() {
  const events = new EventBus();
  const clock = new FakeClock();
  const player = new RecordingPlayer();
  attachCues(events, player, clock.read);
  return { events, clock, player };
}

describe("sound cues", () => {
  it("plays a rising cue when the body appears and a falling cue when it leaves", () => {
    const { events, clock, player } = setup();
    events.publish("bodyFound", {});
    clock.advance(CUE_COOLDOWN_S + 0.1);
    events.publish("bodyLost", {});
    expect(player.played).toEqual(["ready", "attention"]);
  });

  it("warns once about a position problem and confirms when it is fixed", () => {
    const { events, clock, player } = setup();
    events.publish("positionBlocked", { reason: "turn_side" });
    clock.advance(CUE_COOLDOWN_S + 0.1);
    events.publish("positionReady", {});
    expect(player.played).toEqual(["attention", "ready"]);
  });

  it("does not chatter when tracking flickers", () => {
    const { events, clock, player } = setup();
    for (let i = 0; i < 6; i++) {
      events.publish(i % 2 ? "bodyLost" : "bodyFound", {});
      clock.advance(0.2);
    }
    expect(player.played).toEqual(["ready", "attention"]);
  });

  it("ticks on every repetition and celebrates the target", () => {
    const { events, player } = setup();
    events.publish("repCounted", { mode: ExerciseMode.ArmRaise, total: 1 });
    events.publish("repCounted", { mode: ExerciseMode.ArmRaise, total: 2 });
    events.publish("goalReached", { mode: ExerciseMode.ArmRaise, goal: 2 });
    expect(player.played).toEqual(["rep", "rep", "goal"]);
  });

  it("keeps every tone in the range older listeners hear best", () => {
    const pitches = Object.values(CUES).flatMap((notes) =>
      notes.map((n) => n.hz),
    );
    expect(Math.min(...pitches)).toBeGreaterThanOrEqual(400);
    expect(Math.max(...pitches)).toBeLessThanOrEqual(1100);
  });
});
