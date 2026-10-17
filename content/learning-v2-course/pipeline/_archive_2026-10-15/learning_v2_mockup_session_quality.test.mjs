import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateReleaseQuality } from "../../../../scripts/learning_v2_release_parity_gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, "../../../..");
const MOCKUP = path.join(PROJECT_ROOT, "content", "learning-v2-course", "mockup", "index.html");
const RELEASE_ROOT = path.join(PROJECT_ROOT, "content", "learning-v2-course", "release", "en");

function embeddedJson(html, id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(`<script id="${escapedId}" type="application/json">([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing embedded JSON script #${id}`);
  return JSON.parse(match[1]);
}

function identityFromIssue(issue) {
  const [lesson, session] = String(issue.path).split("/");
  return `en/${lesson}/${session}`;
}

function hasDedicatedCorrectFeedback(interaction, correctResponseId) {
  const feedback = interaction?.modePayload?.choiceFeedback;
  return Array.isArray(feedback) && feedback.some((entry) => (
    entry &&
    entry.responseId === correctResponseId &&
    entry.correct === true &&
    ["ru", "uk"].every((locale) => typeof entry.feedbackByLocale?.[locale] === "string" && entry.feedbackByLocale[locale].trim())
  ));
}

function qualityFromMockupSession(session, unverifiedAudioTargets, override) {
  const answers = new Map(session.answers.map((answer) => [answer.interactionId, answer]));
  let missingCorrectFeedback = 0;
  let audioTargets = 0;
  for (const interaction of session.learner.interactions) {
    audioTargets += Array.isArray(interaction.audioTargetIds)
      ? interaction.audioTargetIds.filter((target) => typeof target === "string" && target.length > 0).length
      : 0;
    const correctResponseId = answers.get(interaction.interactionId)?.correctResponseId;
    if (interaction.inputMode === "single_choice" && typeof correctResponseId === "string" && correctResponseId.length > 0 && !hasDedicatedCorrectFeedback(interaction, correctResponseId)) {
      missingCorrectFeedback += 1;
    }
  }
  if (Array.isArray(override)) [missingCorrectFeedback, audioTargets] = override;
  return { missingCorrectFeedback, audioTargets, unverifiedAudioTargets };
}

function expectedBySession() {
  const quality = validateReleaseQuality(RELEASE_ROOT);
  const bySession = new Map();
  for (const lesson of fs.readdirSync(RELEASE_ROOT).sort()) {
    const lessonRoot = path.join(RELEASE_ROOT, lesson);
    if (!fs.statSync(lessonRoot).isDirectory()) continue;
    for (const session of fs.readdirSync(lessonRoot).sort()) {
      const sessionRoot = path.join(lessonRoot, session);
      if (!fs.statSync(sessionRoot).isDirectory()) continue;
      const learner = JSON.parse(fs.readFileSync(path.join(sessionRoot, "learner.json"), "utf8"));
      const audioTargets = learner.interactions.reduce((total, interaction) => (
        total + (Array.isArray(interaction.audioTargetIds)
          ? interaction.audioTargetIds.filter((target) => typeof target === "string" && target.length > 0).length
          : 0)
      ), 0);
      bySession.set(`en/${lesson}/${session}`, {
        missingCorrectFeedback: 0,
        audioTargets,
        unverifiedAudioTargets: 0,
      });
    }
  }
  // зачем (Ядро 11.10, P4 «а»): отклик на правильный ответ теперь справка ворот (advisories), а не блок — макет
  // по-прежнему показывает его счётчик, поэтому считаем из обоих списков.
  for (const issue of [...quality.issues, ...(quality.advisories ?? [])]) {
    if (issue.code !== "CORRECT_RESPONSE_FEEDBACK_MISSING" && issue.code !== "AUDIO_EVIDENCE_UNVERIFIED") continue;
    const entry = bySession.get(identityFromIssue(issue));
    assert.ok(entry, `quality issue points outside release scope: ${JSON.stringify(issue)}`);
    if (issue.code === "CORRECT_RESPONSE_FEEDBACK_MISSING") entry.missingCorrectFeedback += 1;
    if (issue.code === "AUDIO_EVIDENCE_UNVERIFIED") entry.unverifiedAudioTargets += 1;
  }
  return Object.fromEntries([...bySession].sort(([left], [right]) => left.localeCompare(right)));
}

test("every mockup session displays its own exact release-quality counts", () => {
  const html = fs.readFileSync(MOCKUP, "utf8");
  const sessions = embeddedJson(html, "data");
  const unverifiedBySession = embeddedJson(html, "session-audio-evidence");
  const overrides = embeddedJson(html, "session-quality-overrides");
  const actual = Object.fromEntries(sessions.map((session) => [
    session.key,
    qualityFromMockupSession(session, unverifiedBySession[session.key] ?? 0, overrides[session.key]),
  ]));
  const expected = expectedBySession();

  assert.deepEqual(Object.keys(actual).sort(), sessions.map(({ key }) => key).sort(), "quality data must cover every rendered card exactly once");
  assert.deepEqual(actual, expected, "each card must use current release-quality gate counts, not course-wide totals");
  assert.match(html, /const qualityForSession =/u, "rendered card must calculate its own quality text");
  assert.match(html, /SESSION_QUALITY_OVERRIDES\[s\.key\]/u, "rendered card must use the canonical-release correction where its embedded preview differs");
  assert.equal(
    Object.values(actual).reduce((total, entry) => total + entry.missingCorrectFeedback, 0),
    1254,
    "fixture must expose every missing correct-response explanation",
  );
  assert.equal(
    Object.values(actual).reduce((total, entry) => total + entry.unverifiedAudioTargets, 0),
    571,
    "fixture must expose every unverified audio target",
  );
});
