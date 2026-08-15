import {
  createLearningV2ActivityCompactActionExecutorV1,
  isLearningV2ActivityCompactActionExecutorV1,
  type LearningV2ActivityCompactActionPortsV1,
} from "../modules/learning-v2/runtime/activity_compact_action_executor_v1";

const identity = Object.freeze({
  episodeId: "episode-1",
  sessionId: "session-1",
  sessionOrdinal: 1,
  taskId: "task-1",
  activityId: "activity-1",
  promptId: "prompt-1",
});

function harness() {
  const calls: unknown[] = [];
  let resolveSave: ((value: "added") => void) | null = null;
  const ports: LearningV2ActivityCompactActionPortsV1 = {
    openReport: async (input) => {
      calls.push({ kind: "report", input });
    },
    savePhrase: (input) => {
      calls.push({ kind: "save", input });
      return new Promise<"added">((resolve) => {
        resolveSave = resolve;
      });
    },
    voiceControl: async (input) => {
      calls.push({ kind: "voice", input });
      return input.command === "start" ? "started" : "stopped";
    },
  };
  const executor = createLearningV2ActivityCompactActionExecutorV1(ports);
  return {
    calls,
    executor,
    finishSave: () => {
      if (!resolveSave) throw new Error("save_not_started");
      resolveSave("added");
    },
  };
}

describe("Learning V2 compact activity action executor", () => {
  it("dispatches exact report and serializes a phrase save", async () => {
    const value = harness();
    expect(
      await value.executor.execute({
        kind: "open_report",
        reportContextRef: "report-context-1",
        identity,
      }),
    ).toEqual({ kind: "report_result", outcome: "opened" });
    const firstSave = value.executor.execute({
      kind: "save_phrase",
      savablePhraseRef: "phrase-1",
      identity,
    });
    expect(
      await value.executor.execute({
        kind: "save_phrase",
        savablePhraseRef: "phrase-1",
        identity,
      }),
    ).toEqual({ kind: "save_result", outcome: "in_progress" });
    value.finishSave();
    await expect(firstSave).resolves.toEqual({
      kind: "save_result",
      outcome: "added",
    });
    expect(value.calls).toHaveLength(2);
    expect(value.calls).toEqual([
      {
        kind: "report",
        input: { reportContextRef: "report-context-1", identity },
      },
      { kind: "save", input: { savablePhraseRef: "phrase-1", identity } },
    ]);
  });

  it("keeps recording exclusive and stops it on lifecycle disposal", async () => {
    const value = harness();
    await expect(
      value.executor.execute({
        kind: "voice_control",
        command: "start",
        interaction: "hold",
      }),
    ).resolves.toEqual({ kind: "voice_result", outcome: "started" });
    expect(value.executor.getSnapshot()).toMatchObject({
      voiceState: "recording",
      recordingArtifactAuthority: "none",
      transcriptAuthority: "none",
    });
    await expect(
      value.executor.execute({
        kind: "open_report",
        reportContextRef: "report-context-1",
        identity,
      }),
    ).resolves.toEqual({
      kind: "report_result",
      outcome: "busy_recording",
    });
    await value.executor.dispose();
    expect(value.executor.getSnapshot()).toMatchObject({
      voiceState: "idle",
      disposed: true,
    });
    expect(value.calls).toEqual([
      {
        kind: "voice",
        input: { command: "start", interaction: "hold" },
      },
      {
        kind: "voice",
        input: { command: "stop", interaction: "lifecycle" },
      },
    ]);
  });

  it("fails closed on invalid transitions, forged handles and reserved refs", async () => {
    const value = harness();
    expect(isLearningV2ActivityCompactActionExecutorV1(value.executor)).toBe(
      true,
    );
    expect(
      isLearningV2ActivityCompactActionExecutorV1({ ...value.executor }),
    ).toBe(false);
    await expect(
      value.executor.execute({
        kind: "voice_control",
        command: "stop",
        interaction: "tap",
      }),
    ).resolves.toEqual({
      kind: "voice_result",
      outcome: "invalid_transition",
    });
    await expect(
      value.executor.execute({
        kind: "save_phrase",
        savablePhraseRef: "__proto__",
        identity,
      }),
    ).rejects.toThrow("learning_v2_activity_compact_action_executor_invalid");
  });

  it("converts port failures to data-free typed outcomes", async () => {
    const executor = createLearningV2ActivityCompactActionExecutorV1({
      openReport: () => {
        throw new Error("private report detail");
      },
      savePhrase: async () => {
        throw new Error("private phrase detail");
      },
      voiceControl: async () => {
        throw new Error("private audio detail");
      },
    });
    await expect(
      executor.execute({
        kind: "open_report",
        reportContextRef: "report-context-1",
        identity,
      }),
    ).resolves.toEqual({ kind: "report_result", outcome: "failed" });
    await expect(
      executor.execute({
        kind: "save_phrase",
        savablePhraseRef: "phrase-1",
        identity,
      }),
    ).resolves.toEqual({ kind: "save_result", outcome: "failed" });
    await expect(
      executor.execute({
        kind: "voice_control",
        command: "start",
        interaction: "tap",
      }),
    ).resolves.toEqual({ kind: "voice_result", outcome: "failed" });
    expect(JSON.stringify(executor.getSnapshot())).not.toMatch(
      /private|phrase detail|audio detail|report detail/u,
    );
  });

  it("closes a voice start that resolves after lifecycle disposal", async () => {
    const calls: unknown[] = [];
    let finishStart: ((value: "started") => void) | null = null;
    const executor = createLearningV2ActivityCompactActionExecutorV1({
      openReport: () => undefined,
      savePhrase: async () => "added",
      voiceControl: async (input) => {
        calls.push(input);
        if (input.command === "stop") return "stopped";
        return new Promise<"started">((resolve) => {
          finishStart = resolve;
        });
      },
    });
    const start = executor.execute({
      kind: "voice_control",
      command: "start",
      interaction: "tap",
    });
    const dispose = executor.dispose();
    const resolveStart = finishStart as ((value: "started") => void) | null;
    if (!resolveStart) throw new Error("voice_start_not_pending");
    resolveStart("started");
    await expect(start).resolves.toEqual({
      kind: "voice_result",
      outcome: "disposed",
    });
    await dispose;
    expect(calls).toEqual([
      { command: "start", interaction: "tap" },
      { command: "stop", interaction: "lifecycle" },
    ]);
    expect(executor.getSnapshot()).toMatchObject({
      voiceState: "idle",
      disposed: true,
    });
  });
});
