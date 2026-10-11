#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { splitAssessedSentences } from "./single_phrase_release.mjs";

const args = process.argv.slice(2);
const option = (name, fallback = "") => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const beforeAudit = path.resolve(option("before-audit"));
const releaseRoot = path.resolve(option("release"));
const output = option("output");
const CYRILLIC = /[\p{Script=Cyrillic}]/u;
const normalize = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();
const comparable = (value) => normalize(value).replace(/___(?:\s+___)+/gu, "___");
const pad = (value) => String(value).padStart(2, "0");

function gapTargetSegments(value) {
  const targets = [];
  for (const unit of splitAssessedSentences(value)) {
    if (!CYRILLIC.test(unit)) {
      targets.push(unit);
      continue;
    }
    const colon = unit.lastIndexOf(":");
    const tail = colon >= 0 ? normalize(unit.slice(colon + 1)) : "";
    if (tail && (/___/u.test(tail) || (!CYRILLIC.test(tail) && /[A-Za-z]/u.test(tail)))) targets.push(tail);
  }
  return targets;
}

function sourceSegments(hit) {
  return hit.family === "context_gap_grammar" ? gapTargetSegments(hit.text) : splitAssessedSentences(hit.text);
}

function oldInteractionId(hit) {
  const [lesson, session] = String(hit.session).split("/");
  const interaction = Number(hit.ordinal) - 3;
  if (!/^l\d+$/u.test(lesson) || !/^s\d+$/u.test(session) || !Number.isInteger(interaction) || interaction < 1) {
    throw new Error(`preservation_ledger_hold:invalid_hit_identity:${JSON.stringify(hit)}`);
  }
  return `en:lesson-${pad(Number(lesson.slice(1)))}:session-${pad(Number(session.slice(1)))}:i${pad(interaction)}`;
}

function candidateFields(interaction) {
  const payload = interaction?.modePayload ?? {};
  return [
    ["targetPhrase", payload.targetPhrase],
    ["hiddenTargetPhrase", payload.hiddenTargetPhrase],
    ["gappedTargetPhrase", payload.gappedTargetPhrase],
    ["referenceAudio.transcript", payload.referenceAudio?.transcript],
    ...(interaction?.responseOptions ?? []).map((item, index) => [`responseOptions[${index}]`, item.text]),
    ...(payload.localizedMeaningChoices ?? []).map((item, index) => [`localizedMeaningChoices[${index}].targetText`, item.targetText]),
  ].filter(([, value]) => normalize(value));
}

function preserveField(interaction, segment) {
  const expected = comparable(segment);
  return candidateFields(interaction).find(([, value]) => comparable(value) === expected)?.[0] ?? null;
}

function buildLedger() {
  if (!fs.existsSync(beforeAudit)) throw new Error(`preservation_ledger_hold:before_audit_missing:${beforeAudit}`);
  if (!fs.existsSync(releaseRoot)) throw new Error(`preservation_ledger_hold:release_missing:${releaseRoot}`);
  const audit = JSON.parse(fs.readFileSync(beforeAudit, "utf8"));
  const rows = [];
  const issues = [];
  const variants = new Map();
  for (const [auditIndex, hit] of (audit.hits ?? []).entries()) {
    const oldId = oldInteractionId(hit);
    const variantKey = `${oldId}\u0000${hit.key}`;
    const sourceVariantIndex = (variants.get(variantKey) ?? 0) + 1;
    variants.set(variantKey, sourceVariantIndex);
    const [lesson, session] = String(hit.session).split("/");
    const directory = path.join(releaseRoot, "en", lesson, session);
    const learnerFile = path.join(directory, "learner.json");
    const answerFile = path.join(directory, "answers.json");
    if (!fs.existsSync(learnerFile) || !fs.existsSync(answerFile)) {
      issues.push({ auditIndex, oldInteractionId: oldId, reason: "release_session_missing" });
      continue;
    }
    const learner = JSON.parse(fs.readFileSync(learnerFile, "utf8"));
    const answers = JSON.parse(fs.readFileSync(answerFile, "utf8"));
    const segments = sourceSegments(hit);
    if (!segments.length) {
      issues.push({ auditIndex, oldInteractionId: oldId, reason: "old_target_segments_missing" });
      continue;
    }
    for (const [segmentIndex, sourceSegment] of segments.entries()) {
      const newInteractionId = segments.length === 1 ? oldId : `${oldId}:s${pad(segmentIndex + 1)}`;
      const interaction = (learner.interactions ?? []).find((item) => item.interactionId === newInteractionId);
      const answer = answers.find((item) => item.interactionId === newInteractionId);
      const preservedInField = interaction ? preserveField(interaction, sourceSegment) : null;
      if (!interaction || !answer || !preservedInField) issues.push({
        auditIndex,
        oldInteractionId: oldId,
        sourceVariantIndex,
        segmentIndex: segmentIndex + 1,
        sourceSegment,
        newInteractionId,
        reason: !interaction ? "new_interaction_missing" : !answer ? "new_answer_missing" : "segment_not_preserved",
      });
      rows.push({
        auditIndex,
        session: hit.session,
        oldInteractionId: oldId,
        sourceFamily: hit.family,
        sourceField: hit.key,
        sourceVariantIndex,
        segmentIndex: segmentIndex + 1,
        sourceSegment: normalize(sourceSegment),
        newInteractionId,
        preservedInField,
        correctText: normalize(answer?.correctText),
        audioTranscript: normalize(interaction?.modePayload?.referenceAudio?.transcript) || null,
      });
    }
  }
  return {
    schemaVersion: "learning_v2_single_phrase_historical_preservation_ledger_v1",
    beforeAudit: beforeAudit.replace(/\\/gu, "/"),
    releaseRoot: releaseRoot.replace(/\\/gu, "/"),
    oldAssessedFieldCount: (audit.hits ?? []).length,
    preservedSegmentCount: rows.length,
    violationCount: issues.length,
    issues,
    rows,
  };
}

try {
  const ledger = buildLedger();
  if (output) {
    const target = path.resolve(output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(ledger, null, 2), "utf8");
  }
  console.log(JSON.stringify({
    oldAssessedFieldCount: ledger.oldAssessedFieldCount,
    preservedSegmentCount: ledger.preservedSegmentCount,
    violationCount: ledger.violationCount,
    issues: ledger.issues,
  }));
  if (ledger.violationCount) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
