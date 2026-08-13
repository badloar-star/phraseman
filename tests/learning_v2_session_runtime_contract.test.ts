import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildE1DemoProfile } from "../modules/learning-v2/content/e1_demo_bank";
import {
  buildLesson1LegacyActivityBindings,
  buildLesson1LegacyV2SourcePayload,
} from "../modules/learning-v2/content/legacy_lesson_payload";
import { compileV2RequiredSessions } from "../modules/learning-v2/content/session_compiler";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  getLesson1SessionRuntime,
  getLesson1SourcePayload,
  peekLesson1SessionRuntime,
  warmLesson1SessionRuntime,
} from "../modules/learning-v2/runtime/lesson1_session_runtime";

const source = (relative: string) =>
  readFileSync(join(__dirname, "..", relative), "utf8");

test("premium session route uses the real twelve-card compiler without the rejected lab player", () => {
  const runtime = source("app/learning-v2/session/[id].tsx");
  const map = source("app/learning-v2/lesson/[id].tsx");
  expect(runtime).not.toContain("ModeDemoPlayer");
  expect(runtime).not.toContain("LearningV2ModesLab");
  expect(map).toContain('pathname: "/learning-v2/session/[id]"');
  expect(runtime).toContain("useReducedMotion");
  expect(runtime).not.toContain("withRepeat(");
  expect(runtime).toContain('color: "#07110A"');
  expect(runtime).toContain("awarded: { xp: 0, shards: 0 }");
  expect(runtime).toContain("getLesson1SessionRuntime");
  expect(runtime).not.toContain("compileV2RequiredSessions(");
  expect(map).toContain(
    "InteractionManager.runAfterInteractions(\n      warmLesson1SessionRuntime,",
  );
  expect(runtime).not.toMatch(
    /@react-native-firebase|httpsCallable|fetch\(|XMLHttpRequest/,
  );
  expect(runtime).not.toContain("flushPendingRequiredSessionCompletions");
  expect(runtime).toContain("const choose = (answer: string) =>");
  expect(runtime).toContain("projectRequiredTaskStars({");
  expect(runtime).toContain("awardedCardIdsRef.current.has(cardId)");
  expect(runtime).toContain("setShowCompletionCeremony(true)");
  expect(runtime).toContain("copy.quality[latestStarAward]");
  expect(runtime).toContain("playWrongAnswerMotion();");
  expect(runtime).toContain("Math.max(520, windowHeight - insets.top - 210)");
  expect(runtime).toContain("copy.tier(completionStars)");
  expect(runtime).toContain("ceremonyProgress.value = withTiming(target");
  expect(runtime).toContain("copy.starsProgress(displayedStars)");
  expect(runtime).toContain("copy.improveBody(36 - completionStars)");
  expect(runtime).toContain("copy.stored");
  expect(runtime).toContain("copy.map");
  expect(runtime).not.toContain("Забрать звёзды");
  expect(runtime).toContain("LearningV2SessionIntro");
  expect(runtime).not.toContain("../../../app/lesson_intro_screens");
  expect(runtime).toContain("introScreens={[...payload.introScreens]}");
  expect(runtime).toContain("copy.introCheck(cardIndex + 1)");
  expect(runtime).toContain("const store = createLesson1LocalProgressStore(");
  expect(runtime).toContain("AsyncStorage,");
  expect(runtime).toContain("createRequiredSessionLocalCommitCoordinator(");
  expect(runtime).toContain(").commit(scope, envelope)");
  expect(runtime).toContain("withAccountTransitionLock(async () =>");
  expect(runtime).not.toContain("Promise.all([\n        outbox.enqueue");
  expect(map).not.toContain("flushPendingRequiredSessionCompletions");
  expect(map).toContain("await createRequiredSessionLocalCommitCoordinator(");
  expect(map).toContain(").recover(scope);");
  expect(map).toContain(
    "const state = await withAccountTransitionLock(async () =>",
  );
  expect(map).toContain("deriveLocalOfflineProgressAccountScopeHash(stableId)");
  expect(map).toContain("generation: LOCAL_OFFLINE_PROGRESS_GENERATION");
  expect(map).toContain("prepareLearningV2SessionNetworkIntent(node.id)");
  expect(map).toContain(
    "releaseLearningV2SessionNetworkIntentAfterResultFrame(resultTarget)",
  );
  expect(map).toContain('setLocalRecoveryOutcome("failure")');
  expect(map).toContain("secondFrame = requestAnimationFrame(() =>");
  expect(map).toContain(
    "releaseLearningV2SessionNetworkIntentAfterExitFrame(exitTarget)",
  );
  expect(
    map.indexOf("prepareLearningV2SessionNetworkIntent(node.id)"),
  ).toBeLessThan(map.indexOf("router.push({"));
  expect(runtime).toContain("claimLearningV2SessionNetworkIntent(sessionId)");
  expect(runtime).toContain("waitForLearningV2SessionNetworkIntent(intent)");
  expect(runtime).toContain("markLearningV2SessionResultPending(intent)");
  expect(map).toContain("useLayoutEffect(() =>");
  expect(runtime).toContain("useLayoutEffect(() =>");
  expect(runtime).toContain(
    "This wait is evidence/fencing only. It never gates local lesson controls.",
  );
  expect(runtime).not.toContain("disabled={!sessionReady}");
  expect(runtime).not.toMatch(/ActivityIndicator|загрузка|синхронизац/i);
});

test("background completion transport stays outside the active session route", () => {
  const runtime = source("app/learning-v2/session/[id].tsx");
  const sync = source("app/learning_v2_required_session_completion_sync.ts");
  expect(runtime).not.toContain("required_session_completion_sync");
  expect(sync).toContain("'submitLearningV2RequiredSessionCompletion'");
  expect(sync).toContain(
    "rebindRequiredSessionCompletionEnvelope(item.payload",
  );
  expect(sync).toContain("'getLearningV2AccountBinding'");
  expect(sync).toContain(".filter(isRequiredSessionCompletion)");
  expect(sync).toContain("persistAcknowledgementIdempotently");
  expect(sync).toContain("withBackgroundNetworkLease('completion.sync'");
  expect(sync).toContain("operationTimeoutMs: null");
  expect(sync).not.toContain("{ timeout: 15_000 }");
});

test("the twelve-card session is fully local and never waits on a server per answer", () => {
  const runtime = source("app/learning-v2/session/[id].tsx");
  const chooseBody = runtime.slice(
    runtime.indexOf("const choose = (answer: string) =>"),
    runtime.indexOf("const chooseTile ="),
  );
  expect(chooseBody).toContain(
    "normalize(answer) === normalize(correctAnswer)",
  );
  expect(chooseBody).toContain('setResult("correct")');
  expect(chooseBody).not.toMatch(
    /await|fetch\(|httpsCallable|firebase|AsyncStorage/i,
  );
});

test("released render drives the full task surface without switching transport mid-run", () => {
  const runtime = source("app/learning-v2/session/[id].tsx");
  expect(runtime).toContain("setReleasedRuntime(releasedSessionMount.runtime)");
  expect(runtime).toContain("releasedPackageTask?.learner.prompt");
  expect(runtime).toContain("releasedPackageTask.learner.responseOptions");
  expect(runtime).toContain("releasedPackageTask.hintsAllowed > 0");
  expect(runtime).toContain(
    "evaluateLearningV2ActivityReleasedSessionTaskV1({",
  );
  expect(runtime).toContain("let committedReleasedCompletion = false");
  expect(runtime).toContain("if (!committedReleasedCompletion)");
  expect(runtime).not.toContain("let committedReleasedSubmission = false");
  expect(runtime).toContain("copy.repeatWithoutGrade");
  expect(runtime).not.toContain(
    "releasedPackageTask?.learner.accessibilityLabel ??\n                  item?.target.text",
  );
});

test("the real session exposes an accessible zero-star skip without transport work", () => {
  const runtime = source("app/learning-v2/session/[id].tsx");
  const skipBody = runtime.slice(
    runtime.indexOf("const skip = () =>"),
    runtime.indexOf("if (!session || !item"),
  );
  expect(runtime).toContain("accessibilityLabel={copy.skipTask}");
  expect(runtime).toContain("accessibilityHint={copy.skipHint}");
  expect(skipBody).toContain('disposition: "skipped"');
  expect(skipBody).toContain("learnerAttempts: Math.max(0, attempts - 1)");
  expect(skipBody).not.toMatch(
    /await|fetch\(|httpsCallable|firebase|AsyncStorage/i,
  );
});

test("Lesson 1 runtime is a bounded frozen cache shared by map warm-up and session mounts", () => {
  const before = peekLesson1SessionRuntime();
  warmLesson1SessionRuntime();
  const first = getLesson1SessionRuntime();
  const second = getLesson1SessionRuntime();

  expect(first).toBe(second);
  expect(first.payload).toBe(getLesson1SourcePayload());
  expect(first.compiled.sessions).toHaveLength(12);
  expect(
    first.compiled.sessions.every((session) => session.cards.length === 12),
  ).toBe(true);
  expect(first.sessionSetId).toBe("session-set.ep-lesson-01.v1");
  expect(first.sessionSetHash).toBe(hashCanonicalBody(first.sessionSet));
  expect(first.sessionSet.sessions).toEqual(
    first.compiled.sessions.map(({ support: _support, ...session }) => session),
  );
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.sessionSet)).toBe(true);
  if (before) expect(before).toBe(first);
});

test("real Lesson 1 exposes all seven approved required-mode families with pinned activities", () => {
  const payload = buildLesson1LegacyV2SourcePayload();
  const compiled = compileV2RequiredSessions({
    episodeId: payload.episodeId,
    canDoOutcomeId: "obj-lesson-01-to-be-statements",
    profile: buildE1DemoProfile(),
    items: payload.contentItems,
    activityBindings: buildLesson1LegacyActivityBindings(payload.contentItems),
  });
  const cards = compiled.sessions.flatMap((session) => session.cards);
  expect(new Set(cards.map((card) => card.family))).toEqual(
    new Set([
      "phrase_builder",
      "listen_choose",
      "sound_contrast",
      "listen_build_dictation",
      "context_gap_grammar",
      "speed_match",
      "scripted_repeat_compare",
    ]),
  );
  expect(
    cards.every((card) =>
      card.activityId.startsWith(`lesson1-${card.family}-`),
    ),
  ).toBe(true);
});
