import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  expectedEnglishSessionIdentities,
  runSourceReleaseSemanticParity,
  sourceSessionScope,
  validateEnglishReleaseScope,
  validateReleaseParity,
} from "../scripts/learning_v2_release_parity_gate.mjs";
import * as releaseParityGate from "../scripts/learning_v2_release_parity_gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.resolve(HERE, "../scripts/learning_v2_release_parity_gate.mjs");

function makeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phraseman-learning-v2-parity-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const canonicalRoot = path.join(root, "canonical");
  const appCopyRoot = path.join(root, "app-copy");
  for (const directory of [canonicalRoot, appCopyRoot]) {
    fs.mkdirSync(path.join(directory, "l01", "s01"), { recursive: true });
    fs.writeFileSync(
      path.join(directory, "l01", "s01", "learner.json"),
      '{"text":"I am ready."}\n',
    );
  }
  const sourceRoot = path.join(root, "source");
  fs.mkdirSync(path.join(sourceRoot, "l01", "s01"), { recursive: true });
  return { root, sourceRoot, canonicalRoot, appCopyRoot };
}

function makeFullScopeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phraseman-learning-v2-full-scope-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const sourceRoot = path.join(root, "sessions", "en");
  const canonicalRoot = path.join(root, "release", "en");
  const appCopyRoot = path.join(root, "generated_release", "en");
  for (const identity of expectedEnglishSessionIdentities()) {
    const [, lesson, session] = identity.split("/");
    fs.mkdirSync(path.join(sourceRoot, lesson, session), { recursive: true });
    for (const releaseRoot of [canonicalRoot, appCopyRoot]) {
      const directory = path.join(releaseRoot, lesson, session);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, "learner.json"), `${identity}\n`);
    }
  }
  return { root, sourceRoot, canonicalRoot, appCopyRoot };
}

function makeReleaseQualityFixture(t, { interactions, answers }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phraseman-learning-v2-quality-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const sessionRoot = path.join(root, "l01", "s01");
  fs.mkdirSync(sessionRoot, { recursive: true });
  fs.writeFileSync(
    path.join(sessionRoot, "learner.json"),
    `${JSON.stringify({ interactions }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(sessionRoot, "answers.json"),
    `${JSON.stringify(answers, null, 2)}\n`,
  );
  return root;
}

function writeAudioEvidenceFixture(audioAssetRoot, {
  referenceTranscript,
  manifestTranscript = referenceTranscript,
} = {}) {
  const audioDirectory = path.join(audioAssetRoot, "audio");
  fs.mkdirSync(audioDirectory, { recursive: true });
  const voices = ["ash", "onyx", "nova", "coral"];
  const entries = voices.map((voiceId) => {
    const bytes = Buffer.from(`audio:${referenceTranscript}:${voiceId}`, "utf8");
    const assetPath = `audio/${voiceId}.mp3`;
    fs.writeFileSync(path.join(audioAssetRoot, assetPath), bytes);
    return {
      transcript: manifestTranscript,
      voiceId,
      assetPath,
      byteSize: bytes.length,
      contentHash: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  });
  const audioManifestPath = path.join(audioAssetRoot, "manifest.json");
  fs.writeFileSync(audioManifestPath, `${JSON.stringify({
    schemaVersion: "learning-v2-factory-production-audio-manifest.v1",
    voices,
    expectedEntryCount: entries.length,
    entries,
  }, null, 2)}\n`);
  return { audioManifestPath, entries, voices };
}

test("accepts byte-identical release trees", (t) => {
  const { canonicalRoot, appCopyRoot } = makeFixture(t);

  const result = validateReleaseParity(canonicalRoot, appCopyRoot);

  assert.equal(result.ready, true, JSON.stringify(result.issues));
  assert.equal(result.canonicalFiles, 1);
  assert.equal(result.appCopyFiles, 1);
});

test("rejects different bytes at the same relative path", (t) => {
  const { canonicalRoot, appCopyRoot } = makeFixture(t);
  fs.writeFileSync(
    path.join(appCopyRoot, "l01", "s01", "learner.json"),
    '{"text":"I am late."}\n',
  );

  const result = validateReleaseParity(canonicalRoot, appCopyRoot);

  assert.equal(result.ready, false);
  assert.deepEqual(
    result.issues.map(({ code, path: relativePath }) => ({ code, path: relativePath })),
    [{ code: "CONTENT_MISMATCH", path: "l01/s01/learner.json" }],
  );
});

test("rejects a canonical file missing from the app copy", (t) => {
  const { canonicalRoot, appCopyRoot } = makeFixture(t);
  fs.writeFileSync(path.join(canonicalRoot, "l01", "s01", "answers.json"), "{}\n");

  const result = validateReleaseParity(canonicalRoot, appCopyRoot);

  assert.equal(result.ready, false);
  assert.deepEqual(
    result.issues.map(({ code, path: relativePath }) => ({ code, path: relativePath })),
    [{ code: "ONLY_CANONICAL", path: "l01/s01/answers.json" }],
  );
});

test("rejects an app-copy file absent from the canonical release", (t) => {
  const { canonicalRoot, appCopyRoot } = makeFixture(t);
  fs.writeFileSync(path.join(appCopyRoot, "l01", "s01", "stale.json"), "{}\n");

  const result = validateReleaseParity(canonicalRoot, appCopyRoot);

  assert.equal(result.ready, false);
  assert.deepEqual(
    result.issues.map(({ code, path: relativePath }) => ({ code, path: relativePath })),
    [{ code: "ONLY_APP_COPY", path: "l01/s01/stale.json" }],
  );
});

test("fails closed when either release root is missing", (t) => {
  const { root, canonicalRoot, appCopyRoot } = makeFixture(t);

  const missingCanonical = validateReleaseParity(path.join(root, "missing-canonical"), appCopyRoot);
  const missingAppCopy = validateReleaseParity(canonicalRoot, path.join(root, "missing-app-copy"));

  assert.equal(missingCanonical.ready, false);
  assert.deepEqual(missingCanonical.issues.map(({ code }) => code), ["CANONICAL_ROOT_MISSING"]);
  assert.equal(missingAppCopy.ready, false);
  assert.deepEqual(missingAppCopy.issues.map(({ code }) => code), ["APP_COPY_ROOT_MISSING"]);
});

test("derives the exact 56×7 + 49 English scope from the authoritative source registry", (t) => {
  const { sourceRoot } = makeFullScopeFixture(t);
  fs.mkdirSync(path.join(sourceRoot, "l01", "notes"), { recursive: true });
  fs.mkdirSync(path.join(path.dirname(sourceRoot), "fr", "l01", "s01"), { recursive: true });

  const scope = sourceSessionScope(sourceRoot, "en");
  assert.deepEqual(scope, expectedEnglishSessionIdentities());
  assert.equal(scope.length, 441);
  assert.deepEqual(
    Object.fromEntries(["l01", "l02", "l03", "l04", "l05", "l06", "l07", "l08"].map((lesson) => [
      lesson,
      scope.filter((identity) => identity.includes(`/${lesson}/`)).length,
    ])),
    { l01: 56, l02: 56, l03: 56, l04: 56, l05: 56, l06: 56, l07: 56, l08: 49 },
  );
});

test("rejects byte-identical one-session trees instead of treating a shrunken course as complete", (t) => {
  const { sourceRoot, canonicalRoot, appCopyRoot } = makeFixture(t);

  const result = validateEnglishReleaseScope({ sourceRoot, canonicalRoot, appCopyRoot });

  assert.equal(result.ready, false);
  assert.ok(result.issues.some((issue) => issue.code === "SOURCE_SESSION_MISSING" && issue.identity === "en/l01/s02"));
  assert.equal(result.sourceSessions, 1);
});

test("rejects one identity deleted from both release copies while it remains in source", (t) => {
  const { sourceRoot, canonicalRoot, appCopyRoot } = makeFullScopeFixture(t);
  for (const root of [canonicalRoot, appCopyRoot]) {
    fs.rmSync(path.join(root, "l04", "s18"), { force: true, recursive: true });
  }

  const result = validateEnglishReleaseScope({ sourceRoot, canonicalRoot, appCopyRoot });

  assert.equal(result.ready, false);
  assert.ok(result.issues.some((issue) => issue.code === "CANONICAL_SESSION_MISSING" && issue.identity === "en/l04/s18"));
  assert.ok(result.issues.some((issue) => issue.code === "APP_COPY_SESSION_MISSING" && issue.identity === "en/l04/s18"));
});

test("semantic parity invokes the existing checker for all 186 source sessions and both authored locales", (t) => {
  const { root, sourceRoot } = makeFullScopeFixture(t);
  const checker = path.join(root, "checker.mjs");
  const receipt = path.join(root, "argv.json");
  fs.writeFileSync(checker, [
    'import fs from "node:fs";',
    `fs.writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(process.argv.slice(2)));`,
  ].join("\n"));

  const result = runSourceReleaseSemanticParity({
    sourceRoot,
    language: "en",
    locales: ["ru", "uk"],
    checker,
    cwd: root,
  });

  assert.equal(result.ready, true, result.output);
  const argv = JSON.parse(fs.readFileSync(receipt, "utf8"));
  assert.deepEqual(argv.slice(0, 2), ["--check-source-release", "--session"]);
  assert.deepEqual(argv[2].split(","), expectedEnglishSessionIdentities());
  assert.deepEqual(argv.slice(3), ["--locales", "ru,uk"]);
});

test("semantic parity fails closed and preserves the checker's actionable output", (t) => {
  const { root, sourceRoot } = makeFullScopeFixture(t);
  const checker = path.join(root, "checker.mjs");
  fs.writeFileSync(checker, [
    'console.error("source_release_parity:en/l01/s01:intro:ru:page=1:body");',
    "process.exitCode = 7;",
  ].join("\n"));

  const result = runSourceReleaseSemanticParity({
    sourceRoot,
    language: "en",
    locales: ["ru", "uk"],
    checker,
    cwd: root,
  });

  assert.equal(result.ready, false);
  assert.equal(result.status, 7);
  assert.match(result.output, /source_release_parity:en\/l01\/s01:intro:ru:page=1:body/u);
});

test("semantic parity fails closed when the authoritative English source scope is empty", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "phraseman-learning-v2-empty-scope-"));
  t.after(() => fs.rmSync(root, { force: true, recursive: true }));
  const sourceRoot = path.join(root, "sessions", "en");
  fs.mkdirSync(sourceRoot, { recursive: true });

  const result = runSourceReleaseSemanticParity({
    sourceRoot,
    language: "en",
    locales: ["ru", "uk"],
    checker: path.join(root, "missing-checker.mjs"),
    cwd: root,
  });

  assert.equal(result.ready, false);
  assert.equal(result.code, "SOURCE_SESSION_SCOPE_INVALID");
});

test("production CLI rejects positional root overrides before checking their one-session trees", (t) => {
  const { canonicalRoot, appCopyRoot } = makeFixture(t);

  const run = spawnSync(process.execPath, [GATE, canonicalRoot, appCopyRoot], { encoding: "utf8" });
  const output = `${run.stdout}\n${run.stderr}`;

  assert.equal(run.status, 1, output);
  assert.match(output, /UNSUPPORTED_ARGUMENTS/u);
});

// зачем (координатор 11.10, P4 «а»): отклик на правильный ответ плеер не показывает — его отсутствие справка, не блок.
test("release quality reports scored single_choice without correct-response feedback as an advisory, not a blocker", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const correctResponseId = `${interactionId}:r1`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "single_choice",
      responseOptions: [
        { responseId: correctResponseId, text: "ready" },
        { responseId: `${interactionId}:r2`, text: "late" },
      ],
      audioTargetIds: [],
      modePayload: {
        choiceFeedback: [{
          responseId: `${interactionId}:r2`,
          correct: false,
          feedbackByLocale: { ru: "Это другой ответ.", uk: "Це інша відповідь." },
        }],
        genericFeedbackByLocale: { ru: "Верно.", uk: "Правильно." },
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId }],
  });

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot);

  assert.deepEqual(result?.issues, []);
  assert.deepEqual(
    result?.advisories.map(({ code, interactionId: id, responseId }) => ({ code, interactionId: id, responseId })),
    [{ code: "CORRECT_RESPONSE_FEEDBACK_MISSING", interactionId, responseId: correctResponseId }],
  );
  assert.equal(result?.missingCorrectFeedback, 1);
  assert.equal(result?.ready, true);
});

test("release quality accepts a dedicated correct-response feedback record", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const correctResponseId = `${interactionId}:r1`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "single_choice",
      responseOptions: [{ responseId: correctResponseId, text: "ready" }],
      audioTargetIds: [],
      modePayload: {
        choiceFeedback: [{
          responseId: correctResponseId,
          correct: true,
          feedbackByLocale: {
            ru: "Ready означает «готов»: форма подходит к ситуации.",
            uk: "Ready означає «готовий»: форма пасує до ситуації.",
          },
        }],
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId }],
  });

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot);

  assert.equal(result?.ready, true, JSON.stringify(result?.issues));
  assert.deepEqual(result?.issues, []);
  assert.deepEqual(result?.advisories, []);
});

test("release quality blocks an audio target whose release has no target-to-asset-to-hash evidence", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const audioTargetId = `${interactionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "single_choice",
      responseOptions: [],
      audioTargetIds: [audioTargetId],
      modePayload: {
        family: "listen_choose",
        referenceAudio: { audioTargetId, transcript: "ready" },
        choiceFeedback: [],
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId: null }],
  });

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath: path.join(releaseRoot, "missing-audio-manifest.json"),
    audioAssetRoot: releaseRoot,
  });

  assert.deepEqual(
    result?.issues.map(({ code, interactionId: id, audioTargetId: target }) => ({ code, interactionId: id, audioTargetId: target })),
    [{ code: "AUDIO_EVIDENCE_UNVERIFIED", interactionId, audioTargetId }],
  );
  assert.equal(result?.ready, false);
});

test("release quality accepts audio only when target, asset path, and actual content hash are bound", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const audioTargetId = `${interactionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "single_choice",
      responseOptions: [],
      audioTargetIds: [audioTargetId],
      modePayload: {
        family: "listen_choose",
        referenceAudio: { audioTargetId, transcript: "ready" },
        choiceFeedback: [],
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId: null }],
  });
  const audioAssetRoot = path.dirname(releaseRoot);
  const audioDirectory = path.join(audioAssetRoot, "audio");
  fs.mkdirSync(audioDirectory, { recursive: true });
  const voices = ["ash", "onyx", "nova", "coral"];
  const entries = voices.map((voiceId) => {
    const bytes = Buffer.from(`audio:${voiceId}:ready`, "utf8");
    const assetPath = `audio/${voiceId}.mp3`;
    fs.writeFileSync(path.join(audioAssetRoot, assetPath), bytes);
    return {
      transcript: "ready",
      voiceId,
      assetPath,
      byteSize: bytes.length,
      contentHash: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  });
  const audioManifestPath = path.join(audioAssetRoot, "manifest.json");
  fs.writeFileSync(audioManifestPath, `${JSON.stringify({
    schemaVersion: "learning-v2-factory-production-audio-manifest.v1",
    voices,
    expectedEntryCount: entries.length,
    entries,
  }, null, 2)}\n`);

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });

  assert.equal(result?.ready, true, JSON.stringify(result?.issues));
  assert.equal(result?.verifiedAudioTargets, 1);
  assert.equal(result?.unverifiedAudioTargets, 0);

  fs.writeFileSync(path.join(audioAssetRoot, "audio", "ash.mp3"), Buffer.from("AUDIO:ash:ready", "utf8"));
  const corrupted = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });
  assert.equal(corrupted?.ready, false);
  assert.deepEqual(
    corrupted?.issues.map(({ code, audioTargetId: target }) => ({ code, audioTargetId: target })),
    [{ code: "AUDIO_EVIDENCE_UNVERIFIED", audioTargetId }],
  );
});

test("audio proof cache cannot reuse an asset/hash verdict across conflicting byte sizes", (t) => {
  const firstInteractionId = "en:lesson-01:session-01:i01";
  const secondInteractionId = "en:lesson-01:session-01:i02";
  const firstAudioTargetId = `${firstInteractionId}:audio`;
  const secondAudioTargetId = `${secondInteractionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [
      {
        interactionId: firstInteractionId,
        inputMode: "tap_record_compare",
        responseOptions: [],
        audioTargetIds: [firstAudioTargetId],
        modePayload: {
          family: "scripted_repeat_compare",
          referenceAudio: { audioTargetId: firstAudioTargetId, transcript: "ready" },
        },
      },
      {
        interactionId: secondInteractionId,
        inputMode: "tap_record_compare",
        responseOptions: [],
        audioTargetIds: [secondAudioTargetId],
        modePayload: {
          family: "scripted_repeat_compare",
          referenceAudio: { audioTargetId: secondAudioTargetId, transcript: "late" },
        },
      },
    ],
    answers: [
      { interactionId: firstInteractionId, correctText: "ready", correctResponseId: null },
      { interactionId: secondInteractionId, correctText: "late", correctResponseId: null },
    ],
  });
  const audioAssetRoot = path.dirname(releaseRoot);
  const { audioManifestPath, entries, voices } = writeAudioEvidenceFixture(audioAssetRoot, {
    referenceTranscript: "ready",
  });
  const conflictingEntries = entries.map((entry) => ({
    ...entry,
    transcript: "late",
    byteSize: entry.voiceId === "ash" ? entry.byteSize + 1 : entry.byteSize,
  }));
  fs.writeFileSync(audioManifestPath, `${JSON.stringify({
    schemaVersion: "learning-v2-factory-production-audio-manifest.v1",
    voices,
    expectedEntryCount: entries.length + conflictingEntries.length,
    entries: [...entries, ...conflictingEntries],
  }, null, 2)}\n`);

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });

  assert.equal(result?.verifiedAudioTargets, 1);
  assert.equal(result?.unverifiedAudioTargets, 1);
  assert.deepEqual(
    result?.issues.map(({ code, audioTargetId }) => ({ code, audioTargetId })),
    [{ code: "AUDIO_EVIDENCE_UNVERIFIED", audioTargetId: secondAudioTargetId }],
  );
});

test("audio proof cache cannot reuse a valid numeric byte size for an invalid string size", (t) => {
  const firstInteractionId = "en:lesson-01:session-01:i01";
  const secondInteractionId = "en:lesson-01:session-01:i02";
  const firstAudioTargetId = `${firstInteractionId}:audio`;
  const secondAudioTargetId = `${secondInteractionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [
      {
        interactionId: firstInteractionId,
        inputMode: "tap_record_compare",
        responseOptions: [],
        audioTargetIds: [firstAudioTargetId],
        modePayload: {
          family: "scripted_repeat_compare",
          referenceAudio: { audioTargetId: firstAudioTargetId, transcript: "ready" },
        },
      },
      {
        interactionId: secondInteractionId,
        inputMode: "tap_record_compare",
        responseOptions: [],
        audioTargetIds: [secondAudioTargetId],
        modePayload: {
          family: "scripted_repeat_compare",
          referenceAudio: { audioTargetId: secondAudioTargetId, transcript: "late" },
        },
      },
    ],
    answers: [
      { interactionId: firstInteractionId, correctText: "ready", correctResponseId: null },
      { interactionId: secondInteractionId, correctText: "late", correctResponseId: null },
    ],
  });
  const audioAssetRoot = path.dirname(releaseRoot);
  const { audioManifestPath, entries, voices } = writeAudioEvidenceFixture(audioAssetRoot, {
    referenceTranscript: "ready",
  });
  const invalidEntries = entries.map((entry) => ({
    ...entry,
    transcript: "late",
    byteSize: String(entry.byteSize),
  }));
  fs.writeFileSync(audioManifestPath, `${JSON.stringify({
    schemaVersion: "learning-v2-factory-production-audio-manifest.v1",
    voices,
    expectedEntryCount: entries.length + invalidEntries.length,
    entries: [...entries, ...invalidEntries],
  }, null, 2)}\n`);

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });

  assert.equal(result?.verifiedAudioTargets, 1);
  assert.equal(result?.unverifiedAudioTargets, 1);
  assert.deepEqual(
    result?.issues.map(({ code, audioTargetId }) => ({ code, audioTargetId })),
    [{ code: "AUDIO_EVIDENCE_UNVERIFIED", audioTargetId: secondAudioTargetId }],
  );
});

test("audio evidence rejects a matching target hidden in a runtime-unsupported nested field", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const audioTargetId = `${interactionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "single_choice",
      responseOptions: [],
      audioTargetIds: [audioTargetId],
      modePayload: {
        family: "context_gap_grammar",
        decoy: { audioTargetId, transcript: "ready" },
        choiceFeedback: [],
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId: null }],
  });
  const audioAssetRoot = path.dirname(releaseRoot);
  const { audioManifestPath } = writeAudioEvidenceFixture(audioAssetRoot, {
    referenceTranscript: "ready",
  });

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });

  assert.equal(result?.verifiedAudioTargets, 0);
  assert.equal(result?.unverifiedAudioTargets, 1);
  assert.equal(result?.issues[0]?.code, "AUDIO_EVIDENCE_UNVERIFIED");
});

test("audio evidence uses the runtime's exact transcript index and rejects manifest whitespace drift", (t) => {
  const interactionId = "en:lesson-01:session-01:i01";
  const audioTargetId = `${interactionId}:audio`;
  const releaseRoot = makeReleaseQualityFixture(t, {
    interactions: [{
      interactionId,
      inputMode: "tap_record_compare",
      responseOptions: [],
      audioTargetIds: [audioTargetId],
      modePayload: {
        family: "scripted_repeat_compare",
        referenceAudio: { audioTargetId, transcript: "ready" },
      },
    }],
    answers: [{ interactionId, correctText: "ready", correctResponseId: null }],
  });
  const audioAssetRoot = path.dirname(releaseRoot);
  const { audioManifestPath } = writeAudioEvidenceFixture(audioAssetRoot, {
    referenceTranscript: "ready",
    manifestTranscript: " ready ",
  });

  const result = releaseParityGate.validateReleaseQuality?.(releaseRoot, {
    audioManifestPath,
    audioAssetRoot,
  });

  assert.equal(result?.verifiedAudioTargets, 0);
  assert.equal(result?.unverifiedAudioTargets, 1);
  assert.equal(result?.issues[0]?.code, "AUDIO_EVIDENCE_UNVERIFIED");
});
