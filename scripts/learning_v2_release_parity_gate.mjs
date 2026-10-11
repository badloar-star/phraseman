#!/usr/bin/env node

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE_ROOT = path.join(
  PROJECT_ROOT,
  "content",
  "learning-v2-course",
  "sessions",
  "en",
);
const DEFAULT_CANONICAL_ROOT = path.join(
  PROJECT_ROOT,
  "content",
  "learning-v2-course",
  "release",
  "en",
);
const DEFAULT_APP_COPY_ROOT = path.join(
  PROJECT_ROOT,
  "modules",
  "learning-v2",
  "content",
  "factory_native",
  "generated_release",
  "en",
);
const DEFAULT_SEMANTIC_CHECKER = path.join(
  PROJECT_ROOT,
  "content",
  "learning-v2-course",
  "pipeline",
  "build_release.mjs",
);
const DEFAULT_AUDIO_MANIFEST = path.join(
  PROJECT_ROOT,
  "assets",
  "audio",
  "learning-v2",
  "factory-production-v1",
  "manifest.json",
);
const REQUIRED_AUDIO_VOICES = Object.freeze(["ash", "onyx", "nova", "coral"]);
const SHA256_RE = /^[a-f0-9]{64}$/u;
const EXPECTED_ENGLISH_SESSIONS_BY_LESSON = Object.freeze({
  l01: 56,
  l02: 56,
  l03: 56,
  l04: 18,
});

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function inventory(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return null;
  const files = new Map();

  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const relative = path.relative(root, absolute).split(path.sep).join("/");
        files.set(relative, sha256(absolute));
      }
    }
  }

  visit(root);
  return files;
}

export function expectedEnglishSessionIdentities() {
  return Object.entries(EXPECTED_ENGLISH_SESSIONS_BY_LESSON).flatMap(([lesson, count]) => (
    Array.from({ length: count }, (_, index) => `en/${lesson}/s${String(index + 1).padStart(2, "0")}`)
  ));
}

export function sourceSessionScope(sourceRoot, language = "en") {
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) return [];
  const sessions = [];
  const lessons = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const lesson of lessons) {
    const lessonRoot = path.join(sourceRoot, lesson.name);
    const lessonSessions = fs.readdirSync(lessonRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const session of lessonSessions) {
      sessions.push(`${language}/${lesson.name}/${session.name}`);
    }
  }
  return sessions;
}

function identityDiffIssues(actual, expected, missingCode, extraCode) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return [
    ...expected.filter((identity) => !actualSet.has(identity)).map((identity) => ({ code: missingCode, identity })),
    ...actual.filter((identity) => !expectedSet.has(identity)).map((identity) => ({ code: extraCode, identity })),
  ];
}

export function validateEnglishReleaseScope({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  canonicalRoot = DEFAULT_CANONICAL_ROOT,
  appCopyRoot = DEFAULT_APP_COPY_ROOT,
} = {}) {
  const expected = expectedEnglishSessionIdentities();
  const source = sourceSessionScope(sourceRoot, "en");
  const canonical = sourceSessionScope(canonicalRoot, "en");
  const appCopy = sourceSessionScope(appCopyRoot, "en");
  const issues = [];

  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) {
    issues.push({ code: "SOURCE_ROOT_MISSING", path: sourceRoot });
  }
  if (!fs.existsSync(canonicalRoot) || !fs.statSync(canonicalRoot).isDirectory()) {
    issues.push({ code: "CANONICAL_ROOT_MISSING", path: canonicalRoot });
  }
  if (!fs.existsSync(appCopyRoot) || !fs.statSync(appCopyRoot).isDirectory()) {
    issues.push({ code: "APP_COPY_ROOT_MISSING", path: appCopyRoot });
  }
  issues.push(...identityDiffIssues(source, expected, "SOURCE_SESSION_MISSING", "SOURCE_SESSION_EXTRA"));
  issues.push(...identityDiffIssues(canonical, expected, "CANONICAL_SESSION_MISSING", "CANONICAL_SESSION_EXTRA"));
  issues.push(...identityDiffIssues(appCopy, expected, "APP_COPY_SESSION_MISSING", "APP_COPY_SESSION_EXTRA"));

  return {
    ready: issues.length === 0,
    issues,
    sourceSessions: source.length,
    canonicalSessions: canonical.length,
    appCopySessions: appCopy.length,
  };
}

export function runSourceReleaseSemanticParity({
  sourceRoot = DEFAULT_SOURCE_ROOT,
  language = "en",
  locales = ["ru", "uk"],
  checker = DEFAULT_SEMANTIC_CHECKER,
  cwd = PROJECT_ROOT,
} = {}) {
  const scope = sourceSessionScope(sourceRoot, language);
  const expected = expectedEnglishSessionIdentities();
  const sourceScopeIssues = identityDiffIssues(
    scope,
    expected,
    "SOURCE_SESSION_MISSING",
    "SOURCE_SESSION_EXTRA",
  );
  if (sourceScopeIssues.length > 0) {
    const detail = sourceScopeIssues.slice(0, 20)
      .map((issue) => `${issue.code}: ${issue.identity}`)
      .join("\n");
    return {
      ready: false,
      status: null,
      code: "SOURCE_SESSION_SCOPE_INVALID",
      scope,
      stdout: "",
      stderr: detail,
      output: detail,
    };
  }

  const result = spawnSync(process.execPath, [
    checker,
    "--check-source-release",
    "--session",
    scope.join(","),
    "--locales",
    locales.join(","),
  ], {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  const errorText = result.error ? `${result.error.name}: ${result.error.message}` : "";
  const output = [stdout, stderr, errorText].filter(Boolean).join("\n");
  return {
    ready: !result.error && result.status === 0,
    status: result.status,
    code: result.error ? "SEMANTIC_CHECKER_FAILED_TO_START" : undefined,
    scope,
    stdout,
    stderr,
    output,
  };
}

export function validateReleaseParity(canonicalRoot, appCopyRoot) {
  const canonical = inventory(canonicalRoot);
  const appCopy = inventory(appCopyRoot);
  const issues = [];

  if (!canonical) issues.push({ code: "CANONICAL_ROOT_MISSING", path: canonicalRoot });
  if (!appCopy) issues.push({ code: "APP_COPY_ROOT_MISSING", path: appCopyRoot });
  if (!canonical || !appCopy) {
    return {
      ready: false,
      issues,
      canonicalFiles: canonical?.size ?? 0,
      appCopyFiles: appCopy?.size ?? 0,
    };
  }

  const relativePaths = [...new Set([...canonical.keys(), ...appCopy.keys()])].sort();
  for (const relativePath of relativePaths) {
    const canonicalHash = canonical.get(relativePath);
    const appCopyHash = appCopy.get(relativePath);
    if (!canonicalHash) {
      issues.push({ code: "ONLY_APP_COPY", path: relativePath, appCopyHash });
    } else if (!appCopyHash) {
      issues.push({ code: "ONLY_CANONICAL", path: relativePath, canonicalHash });
    } else if (canonicalHash !== appCopyHash) {
      issues.push({
        code: "CONTENT_MISMATCH",
        path: relativePath,
        canonicalHash,
        appCopyHash,
      });
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    canonicalFiles: canonical.size,
    appCopyFiles: appCopy.size,
  };
}

function parseReleaseJson(file, issues) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    issues.push({
      code: "RELEASE_QUALITY_FILE_INVALID",
      path: file,
      detail: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function hasDedicatedCorrectFeedback(interaction, correctResponseId) {
  const feedback = interaction?.modePayload?.choiceFeedback;
  if (!Array.isArray(feedback)) return false;
  return feedback.some((entry) => (
    entry &&
    typeof entry === "object" &&
    entry.responseId === correctResponseId &&
    entry.correct === true &&
    entry.feedbackByLocale &&
    typeof entry.feedbackByLocale === "object" &&
    ["ru", "uk"].every((locale) => (
      typeof entry.feedbackByLocale[locale] === "string" &&
      entry.feedbackByLocale[locale].trim().length > 0
    ))
  ));
}

function runtimeAudioReferences(interaction) {
  const payload = interaction?.modePayload;
  if (!payload || typeof payload !== "object") return [];
  if (payload.family === "sound_contrast") return [payload.audioA, payload.audioB];
  if (
    payload.family === "listen_choose" ||
    payload.family === "listen_build_dictation" ||
    payload.family === "scripted_repeat_compare"
  ) {
    return [payload.referenceAudio, payload.slowReferenceAudio];
  }
  return [];
}

function audioEvidenceResolver(audioManifestPath, audioAssetRoot) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(audioManifestPath, "utf8"));
  } catch {
    return () => ({ verified: false, detail: "audio manifest missing or invalid" });
  }
  if (
    manifest?.schemaVersion !== "learning-v2-factory-production-audio-manifest.v1" ||
    !Array.isArray(manifest.voices) ||
    manifest.voices.length !== REQUIRED_AUDIO_VOICES.length ||
    manifest.voices.some((voice, index) => voice !== REQUIRED_AUDIO_VOICES[index]) ||
    !Array.isArray(manifest.entries) ||
    manifest.expectedEntryCount !== manifest.entries.length
  ) {
    return () => ({ verified: false, detail: "audio manifest contract invalid" });
  }

  const entriesByCoordinate = new Map();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.transcript !== "string" || typeof entry.voiceId !== "string") continue;
    const key = `${entry.transcript}\u0000${entry.voiceId}`;
    const entries = entriesByCoordinate.get(key) ?? [];
    entries.push(entry);
    entriesByCoordinate.set(key, entries);
  }
  const assetRoot = path.resolve(audioAssetRoot);
  const assetChecks = new Map();

  function assetMatches(entry) {
    const cacheKey = JSON.stringify([
      entry?.assetPath ?? null,
      entry?.contentHash ?? null,
      entry?.byteSize ?? null,
    ]);
    if (assetChecks.has(cacheKey)) return assetChecks.get(cacheKey);
    let matches = false;
    if (
      entry &&
      typeof entry.assetPath === "string" &&
      SHA256_RE.test(entry.contentHash) &&
      Number.isSafeInteger(entry.byteSize) &&
      entry.byteSize > 0
    ) {
      const assetPath = path.resolve(assetRoot, entry.assetPath);
      const relative = path.relative(assetRoot, assetPath);
      const isInsideRoot = relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
      if (isInsideRoot && fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        matches = fs.statSync(assetPath).size === entry.byteSize && sha256(assetPath) === entry.contentHash;
      }
    }
    assetChecks.set(cacheKey, matches);
    return matches;
  }

  return (interaction, audioTargetId) => {
    const transcripts = new Set(
      runtimeAudioReferences(interaction)
        .filter((reference) => (
          reference &&
          typeof reference === "object" &&
          reference.audioTargetId === audioTargetId &&
          typeof reference.transcript === "string" &&
          reference.transcript.length > 0
        ))
        .map((reference) => reference.transcript),
    );
    if (transcripts.size !== 1) {
      return { verified: false, detail: "audio target has no unique transcript binding" };
    }
    const [transcript] = transcripts;
    for (const voiceId of REQUIRED_AUDIO_VOICES) {
      const entries = entriesByCoordinate.get(`${transcript}\u0000${voiceId}`);
      if (!Array.isArray(entries) || entries.length !== 1) {
        return { verified: false, detail: `audio manifest coordinate missing or duplicate for voice ${voiceId}` };
      }
      if (!assetMatches(entries[0])) {
        return { verified: false, detail: `audio asset bytes/hash evidence invalid for voice ${voiceId}` };
      }
    }
    return { verified: true };
  };
}

/**
 * Release-local quality evidence only. The current canonical release schema has
 * no authoritative target -> asset reference -> content hash join for audio.
 * A transcript/referenceAudio object therefore cannot prove a playable asset.
 * Keep audio fail-closed until an in-scope release-authoritative manifest exists.
 */
export function validateReleaseQuality(canonicalRoot = DEFAULT_CANONICAL_ROOT, {
  audioManifestPath = DEFAULT_AUDIO_MANIFEST,
  audioAssetRoot = PROJECT_ROOT,
} = {}) {
  const issues = [];
  if (!fs.existsSync(canonicalRoot) || !fs.statSync(canonicalRoot).isDirectory()) {
    return {
      ready: false,
      issues: [{ code: "RELEASE_QUALITY_ROOT_MISSING", path: canonicalRoot }],
      advisories: [],
      sessions: 0,
      scoredSingleChoiceInteractions: 0,
      missingCorrectFeedback: 0,
      audioTargets: 0,
      verifiedAudioTargets: 0,
      unverifiedAudioTargets: 0,
    };
  }

  const scope = sourceSessionScope(canonicalRoot, "en");
  const resolveAudioEvidence = audioEvidenceResolver(audioManifestPath, audioAssetRoot);
  let scoredSingleChoiceInteractions = 0;
  let missingCorrectFeedback = 0;
  // зачем (координатор 11.10, P4 вариант «а»): плеер отклик на ПРАВИЛЬНЫЙ ответ не показывает, а фабрика приложения
  // (factory_native_course_v1.ts) раскладывает choiceFeedback по порядку на НЕВЕРНЫЕ варианты — запись для правильного
  // сдвинула бы объяснения ошибок. Поэтому его отсутствие — справка (advisories), а не блок выпуска.
  const advisories = [];
  let audioTargets = 0;
  let verifiedAudioTargets = 0;
  let unverifiedAudioTargets = 0;

  for (const identity of scope) {
    const [, lesson, session] = identity.split("/");
    const sessionRoot = path.join(canonicalRoot, lesson, session);
    const learnerPath = path.join(sessionRoot, "learner.json");
    const answersPath = path.join(sessionRoot, "answers.json");
    const learner = parseReleaseJson(learnerPath, issues);
    const answers = parseReleaseJson(answersPath, issues);
    if (!learner || !answers || !Array.isArray(learner.interactions) || !Array.isArray(answers)) {
      if (learner && !Array.isArray(learner.interactions)) {
        issues.push({ code: "RELEASE_QUALITY_FILE_INVALID", path: learnerPath, detail: "interactions must be an array" });
      }
      if (answers && !Array.isArray(answers)) {
        issues.push({ code: "RELEASE_QUALITY_FILE_INVALID", path: answersPath, detail: "answers must be an array" });
      }
      continue;
    }

    const answersByInteractionId = new Map(
      answers
        .filter((answer) => answer && typeof answer.interactionId === "string")
        .map((answer) => [answer.interactionId, answer]),
    );

    for (const interaction of learner.interactions) {
      if (!interaction || typeof interaction !== "object" || typeof interaction.interactionId !== "string") continue;
      const relativePath = `${lesson}/${session}/learner.json`;
      const declaredAudioTargets = Array.isArray(interaction.audioTargetIds)
        ? interaction.audioTargetIds.filter((target) => typeof target === "string" && target.length > 0)
        : [];
      for (const audioTargetId of declaredAudioTargets) {
        audioTargets += 1;
        const evidence = resolveAudioEvidence(interaction, audioTargetId);
        if (evidence.verified) {
          verifiedAudioTargets += 1;
        } else {
          unverifiedAudioTargets += 1;
          issues.push({
            code: "AUDIO_EVIDENCE_UNVERIFIED",
            path: relativePath,
            interactionId: interaction.interactionId,
            audioTargetId,
            detail: evidence.detail,
          });
        }
      }

      const answer = answersByInteractionId.get(interaction.interactionId);
      const correctResponseId = answer?.correctResponseId;
      if (interaction.inputMode !== "single_choice" || typeof correctResponseId !== "string" || correctResponseId.length === 0) {
        continue;
      }
      scoredSingleChoiceInteractions += 1;
      if (!hasDedicatedCorrectFeedback(interaction, correctResponseId)) {
        missingCorrectFeedback += 1;
        advisories.push({
          code: "CORRECT_RESPONSE_FEEDBACK_MISSING",
          path: relativePath,
          interactionId: interaction.interactionId,
          responseId: correctResponseId,
        });
      }
    }
  }

  return {
    ready: issues.length === 0,
    issues,
    advisories,
    sessions: scope.length,
    scoredSingleChoiceInteractions,
    missingCorrectFeedback,
    audioTargets,
    verifiedAudioTargets,
    unverifiedAudioTargets,
  };
}

function printResult(result) {
  const prefix = "Learning V2 release parity";
  if (result.ready) {
    console.log(
      `${prefix}: PASS (${result.canonicalFiles} canonical files, ${result.appCopyFiles} app-copy files)`,
    );
    return;
  }

  console.error(
    `${prefix}: BLOCKED (${result.canonicalFiles} canonical files, ${result.appCopyFiles} app-copy files, ${result.issues.length} differences)`,
  );
  for (const issue of result.issues.slice(0, 20)) {
    console.error(`- ${issue.code}: ${issue.path}`);
  }
  if (result.issues.length > 20) {
    console.error(`- ... ${result.issues.length - 20} more differences`);
  }
}

function printScopeResult(result) {
  const prefix = "Learning V2 English release identity scope";
  if (result.ready) {
    console.log(`${prefix}: PASS (${result.sourceSessions}/${result.canonicalSessions}/${result.appCopySessions})`);
    return;
  }
  console.error(
    `${prefix}: BLOCKED (source=${result.sourceSessions}, canonical=${result.canonicalSessions}, app-copy=${result.appCopySessions}, ${result.issues.length} differences)`,
  );
  for (const issue of result.issues.slice(0, 20)) {
    console.error(`- ${issue.code}: ${issue.identity ?? issue.path}`);
  }
  if (result.issues.length > 20) console.error(`- ... ${result.issues.length - 20} more differences`);
}

function printSemanticResult(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.ready) {
    console.log(`Learning V2 source/release semantic parity: PASS (${result.scope.length} English sessions; ru,uk)`);
    return;
  }
  if (!result.stdout && !result.stderr && result.output) console.error(result.output);
  console.error(
    `Learning V2 source/release semantic parity: BLOCKED (${result.scope.length} English sessions; ru,uk${result.code ? `; ${result.code}` : ""})`,
  );
}

function printQualityResult(result) {
  const prefix = "Learning V2 release quality evidence";
  if (result.missingCorrectFeedback > 0) {
    console.log(
      `${prefix}: ADVISORY (${result.missingCorrectFeedback} scored single-choice interactions without dedicated correct-response feedback — not shown by the player, does not block release)`,
    );
  }
  if (result.ready) {
    console.log(
      `${prefix}: PASS (${result.sessions} sessions, ${result.scoredSingleChoiceInteractions} scored single-choice interactions, ${result.audioTargets} audio targets)`,
    );
    return;
  }
  console.error(
    `${prefix}: BLOCKED (${result.sessions} sessions, ${result.verifiedAudioTargets}/${result.audioTargets} audio targets verified, ${result.unverifiedAudioTargets} AUDIO_EVIDENCE_UNVERIFIED, ${result.issues.length} blocking issues)`,
  );
  for (const issue of result.issues.slice(0, 20)) {
    console.error(
      `- ${issue.code}: ${issue.interactionId ?? issue.path}${issue.responseId ? ` -> ${issue.responseId}` : ""}${issue.audioTargetId ? ` -> ${issue.audioTargetId}` : ""}`,
    );
  }
  if (result.issues.length > 20) console.error(`- ... ${result.issues.length - 20} more quality issues`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).length > 0) {
    console.error("Learning V2 release parity: BLOCKED (UNSUPPORTED_ARGUMENTS: production roots cannot be overridden)");
    process.exitCode = 1;
  } else {
    // зачем (Ядро, координатор 00:12): в стор-сборке Learning V2 вырезан router.ctx.js — паритет его выпуска сборку
    // не блокирует, но только при доказанном вырезании всех маршрутов (scripts/store_release_surface.mjs), как у
    // ворот озвучки V2. Без этого eas-build-post-install падал бы на сервере EAS на контенте, которого нет в сборке.
    const surface = await import("./store_release_surface.mjs").catch((error) => {
      console.warn(`[V2-RELEASE-PARITY] помощник поверхности стор-сборки не загрузился (${error instanceof Error ? error.message : String(error)}) — ворота строгие`);
      return null;
    });
    const buildServer = surface?.learningV2CourseSourcesAbsentOnBuildServer?.(PROJECT_ROOT) ?? { skip: false, reason: "surface_helper_missing" };
    if (surface && surface.announceLearningV2StoreSkip("[V2-RELEASE-PARITY]", PROJECT_ROOT)) {
      process.exitCode = 0;
    } else if (buildServer.skip) {
      // зачем (владелец 11.10, V2 входит в стор-сборку): на сервере EAS исходников курса нет (.easignore /content/) —
      // сверку здесь выполнить нельзя; строгий прогон — локально в release:precheck перед сборкой.
      console.warn(`[V2-RELEASE-PARITY] сервер EAS: исходников курса в архиве нет (${buildServer.reason}) — сверка выполняется только локально в npm run release:precheck`);
      process.exitCode = 0;
    } else {
    console.log(`[V2-RELEASE-PARITY] строгая сверка (${buildServer.reason})`);
    const scopeResult = validateEnglishReleaseScope();
    const semanticResult = runSourceReleaseSemanticParity();
    const qualityResult = validateReleaseQuality();
    const copyResult = validateReleaseParity(DEFAULT_CANONICAL_ROOT, DEFAULT_APP_COPY_ROOT);
    printScopeResult(scopeResult);
    printSemanticResult(semanticResult);
    printQualityResult(qualityResult);
    printResult(copyResult);
    process.exitCode = scopeResult.ready && semanticResult.ready && qualityResult.ready && copyResult.ready ? 0 : 1;
    }
  }
}
