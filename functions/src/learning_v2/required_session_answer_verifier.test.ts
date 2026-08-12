import {
  createPublishedRequiredSessionAnswerManifest,
  isVerifiedRequiredSessionTaskOutcome,
  materializeRequiredSessionTaskAnswerKey,
  normalizeRequiredSessionShortAnswer,
  parseRequiredSessionTaskAnswerKey,
  parsePublishedRequiredSessionAnswerManifest,
  verifyRequiredSessionTaskAnswer,
} from "./required_session_answer_verifier";

const key = () => materializeRequiredSessionTaskAnswerKey({
  taskId: "task-1",
  activityId: "activity-1",
  family: "phrase_builder",
  expectedAnswer: "I'm ready for class!",
});
const response = (submittedAnswer: string) => ({
  schemaVersion: "learning-v2-required-session-task-answer-response.v1",
  taskId: "task-1",
  activityId: "activity-1",
  family: "phrase_builder",
  submittedAnswer,
});

describe("required-session server answer verifier", () => {
  it("normalizes Unicode short answers deterministically without retaining raw text", () => {
    expect(normalizeRequiredSessionShortAnswer("  Ｉ’ｍ   READY—for class!!! "))
      .toBe("i'm ready for class");
    const materialized = key();
    expect(JSON.stringify(materialized)).not.toContain("ready for class");
    expect(parseRequiredSessionTaskAnswerKey(materialized)).toEqual(materialized);
    expect(Object.isFrozen(materialized)).toBe(true);
  });

  it("derives a branded correct or wrong outcome from the exact task coordinate", () => {
    const correct = verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: response("i’m ready for class"),
    });
    expect(correct).toMatchObject({
      authority: "server_answer_verifier",
      resultCode: "CORRECT",
      taskId: "task-1",
    });
    expect(isVerifiedRequiredSessionTaskOutcome(correct)).toBe(true);
    expect(isVerifiedRequiredSessionTaskOutcome({ ...correct })).toBe(false);
    expect(Object.isFrozen(correct)).toBe(true);

    expect(verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: response("I'm late for class"),
    }).resultCode).toBe("WRONG");
  });

  it.each([
    ["listen_choose", "Да, я готов"],
    ["sound_contrast", "ship"],
    ["listen_build_dictation", "I am ready"],
    ["context_gap_grammar", "am"],
    ["speed_match", "I am ready"],
  ] as const)("supports the non-voice family %s", (family, expectedAnswer) => {
    const answerKey = materializeRequiredSessionTaskAnswerKey({
      taskId: `task-${family}`,
      activityId: `activity-${family}`,
      family,
      expectedAnswer,
    });
    expect(verifyRequiredSessionTaskAnswer({
      answerKey,
      response: {
        schemaVersion: "learning-v2-required-session-task-answer-response.v1",
        taskId: `task-${family}`,
        activityId: `activity-${family}`,
        family,
        submittedAnswer: expectedAnswer,
      },
    }).resultCode).toBe("CORRECT");
  });

  it("rejects voice practice and coordinate substitution", () => {
    expect(() => materializeRequiredSessionTaskAnswerKey({
      taskId: "task-voice",
      activityId: "activity-voice",
      family: "scripted_repeat_compare",
      expectedAnswer: "I am ready",
    })).toThrow("required_session_answer_invalid");
    expect(() => verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: { ...response("I'm ready for class"), taskId: "task-2" },
    })).toThrow("required_session_answer_invalid");
    expect(() => verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: { ...response("I'm ready for class"), family: "speed_match" },
    })).toThrow("required_session_answer_invalid");
  });

  it("rejects tampered keys, hostile accessors, extra fields and invalid text bounds", () => {
    expect(() => parseRequiredSessionTaskAnswerKey({
      ...key(),
      expectedAnswerFingerprint: "f".repeat(64),
    })).toThrow("required_session_answer_invalid");
    expect(() => verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: { ...response("ok"), extra: true },
    })).toThrow("required_session_answer_invalid");
    expect(() => verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: response("x".repeat(1025)),
    })).toThrow("required_session_answer_invalid");
    expect(() => verifyRequiredSessionTaskAnswer({
      answerKey: key(),
      response: response("\ud800"),
    })).toThrow("required_session_answer_invalid");

    let getterRuns = 0;
    const hostile = {
      schemaVersion: "learning-v2-required-session-task-answer-response.v1",
      taskId: "task-1",
      activityId: "activity-1",
      family: "phrase_builder",
      get submittedAnswer() {
        getterRuns += 1;
        return "I'm ready for class";
      },
    };
    expect(() => verifyRequiredSessionTaskAnswer({ answerKey: key(), response: hostile }))
      .toThrow("required_session_answer_invalid");
    expect(getterRuns).toBe(0);
  });

  it("materializes a sorted, hash-bound server-only answer manifest", () => {
    const other = materializeRequiredSessionTaskAnswerKey({
      taskId: "task-2",
      activityId: "activity-2",
      family: "listen_choose",
      expectedAnswer: "Я готов",
    });
    const manifest = createPublishedRequiredSessionAnswerManifest({
      schemaVersion: "learning-v2-published-required-session-answer-manifest.v1",
      courseId: "english-core",
      studyTarget: "en",
      courseReleaseId: "english-core-r1",
      seasonRevisionId: "season-e1-r1",
      episodeRevisionFingerprint: "a".repeat(64),
      episodeContentHash: "b".repeat(64),
      sessionSetId: "session-set.ep-01.v1",
      sessionSetHash: "c".repeat(64),
      answerKeys: [other, key()],
    });
    expect(manifest.answerKeys.map((entry) => entry.taskId)).toEqual(["task-1", "task-2"]);
    expect(parsePublishedRequiredSessionAnswerManifest(JSON.parse(JSON.stringify(manifest))))
      .toEqual(manifest);
    expect(() => parsePublishedRequiredSessionAnswerManifest({
      ...manifest,
      sessionSetHash: "d".repeat(64),
    })).toThrow("required_session_answer_invalid");
    expect(() => createPublishedRequiredSessionAnswerManifest({
      ...manifest,
      answerKeys: [key(), key()],
      manifestFingerprint: undefined,
    })).toThrow("required_session_answer_invalid");
  });
});
