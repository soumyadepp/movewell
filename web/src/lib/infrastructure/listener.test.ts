import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandListener, type ListenerProblem } from "./listener";

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  running = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    if (this.running) throw new Error("InvalidStateError");
    this.running = true;
    this.onstart?.();
  }

  stop() {
    this.end();
  }

  abort() {
    this.fail("aborted");
  }

  say(transcript: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript } }],
    });
  }

  fail(error: string) {
    if (!this.running) return;
    this.onerror?.({ error });
    this.end();
  }

  end() {
    if (!this.running) return;
    this.running = false;
    this.onend?.();
  }
}

function setup() {
  const heard: string[] = [];
  const problems: ListenerProblem[] = [];
  const listener = new CommandListener(
    (text) => {
      heard.push(text);
      return true;
    },
    (problem) => problems.push(problem),
  );
  const latest = () => FakeRecognition.instances.at(-1)!;
  return { listener, heard, problems, latest };
}

describe("command listener", () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    vi.useFakeTimers();
    vi.stubGlobal("window", { SpeechRecognition: FakeRecognition });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hears commands again after a session is stopped and started", () => {
    const { listener, heard, latest } = setup();
    listener.start("en-IN");
    latest().say("pause");
    listener.stop();
    listener.start("en-IN");
    latest().say("next");
    expect(heard).toEqual(["pause", "next"]);
  });

  it("keeps listening after Chrome ends a session on a silence", () => {
    const { listener, heard, latest } = setup();
    listener.start("en-IN");
    const recognition = latest();
    recognition.fail("no-speech");
    expect(recognition.running).toBe(false);
    vi.advanceTimersByTime(300);
    expect(recognition.running).toBe(true);
    recognition.say("carry on");
    expect(heard).toEqual(["carry on"]);
  });

  it("ignores the old session's late abort when starting again", () => {
    const { listener, problems, latest } = setup();
    for (let i = 0; i < 8; i++) {
      listener.start("en-IN");
      listener.stop();
    }
    listener.start("en-IN");
    expect(problems).toEqual([]);
    expect(latest().running).toBe(true);
  });

  it("backs off, then reports when something else keeps taking the recogniser", () => {
    const { listener, problems, latest } = setup();
    listener.start("en-IN");
    for (let i = 0; i < 6; i++) {
      latest().fail("aborted");
      vi.runOnlyPendingTimers();
    }
    expect(problems).toEqual(["busy"]);
  });

  it("reports a blocked microphone once and stops retrying", () => {
    const { listener, problems, latest } = setup();
    listener.start("en-IN");
    latest().fail("not-allowed");
    vi.advanceTimersByTime(5000);
    expect(problems).toEqual(["blocked"]);
    expect(latest().running).toBe(false);
  });
});
