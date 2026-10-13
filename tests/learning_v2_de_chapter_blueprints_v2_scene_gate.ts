import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1,
  validateGermanOwnerDecisionsContractDeV1,
} from "../modules/learning-v2/curriculum/de/owner_decisions_contract_de_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

type JsonRecord = Record<string, unknown>;

const TASK5_V1_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json",
);
const TASK5_V2_PATH = resolve(
  process.cwd(),
  "modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json",
);
const TASK5_V1_SHA256 =
  "494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29";
const TASK5_V1_CANONICAL_SHA256 =
  "e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90";
const TASK5_V2_SHA256 =
  "18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23";
const TASK5_V2_CANONICAL_SHA256 =
  "3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3";
const EXPECTED_DIFFS = [
  "lessons[1].chapters[0].checkpoint.newSituation.contextSignature",
  "lessons[1].chapters[0].checkpoint.newSituation.setting",
  "lessons[1].chapters[0].checkpoint.plannedNewLexicalSenses[1].utilityProof.facetValue",
  "schemaVersion",
] as const;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parse(bytes: Buffer): JsonRecord {
  const value: unknown = JSON.parse(bytes.toString("utf8"));
  record(value, "root");
  return value;
}

function record(value: unknown, at: string): asserts value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`task5_v2_record_required:${at}`);
  }
}

function array(value: unknown, at: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`task5_v2_array_required:${at}`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function lesson(root: JsonRecord, lessonId: string): JsonRecord {
  array(root.lessons, "lessons");
  const value = root.lessons.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).lessonId === lessonId,
  );
  record(value, `lesson:${lessonId}`);
  return value;
}

function chapter(root: JsonRecord, chapterId: string): JsonRecord {
  const lessonId = chapterId.slice(0, 6);
  const owner = lesson(root, lessonId);
  array(owner.chapters, `${lessonId}.chapters`);
  const value = owner.chapters.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      (candidate as JsonRecord).id === chapterId,
  );
  record(value, `chapter:${chapterId}`);
  return value;
}

function l02c01(root: JsonRecord): {
  chapter: JsonRecord;
  newSituation: JsonRecord;
  kitchenUtility: JsonRecord;
} {
  const value = chapter(root, "de_l02_c01");
  record(value.checkpoint, "de_l02_c01.checkpoint");
  const checkpoint = value.checkpoint;
  record(checkpoint.newSituation, "de_l02_c01.checkpoint.newSituation");
  array(
    checkpoint.plannedNewLexicalSenses,
    "de_l02_c01.checkpoint.plannedNewLexicalSenses",
  );
  const kitchen = checkpoint.plannedNewLexicalSenses.find(
    (sense) =>
      sense !== null &&
      typeof sense === "object" &&
      !Array.isArray(sense) &&
      (sense as JsonRecord).id === "de_lex_plan_l02_c01_kueche_v1",
  );
  record(kitchen, "de_lex_plan_l02_c01_kueche_v1");
  record(kitchen.utilityProof, "de_lex_plan_l02_c01_kueche_v1.utilityProof");
  return {
    chapter: value,
    newSituation: checkpoint.newSituation,
    kitchenUtility: kitchen.utilityProof,
  };
}

function semanticTuple(value: JsonRecord): string {
  return [value.setting, value.participants, value.goal]
    .map((part) => String(part).trim().toLowerCase())
    .join("|");
}

function collectDiffs(
  before: unknown,
  after: unknown,
  path = "",
  output: string[] = [],
): string[] {
  if (Object.is(before, after)) return output;
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) {
      output.push(path || "<root>");
      return output;
    }
    for (let index = 0; index < before.length; index += 1) {
      collectDiffs(before[index], after[index], `${path}[${index}]`, output);
    }
    return output;
  }
  if (
    before !== null &&
    after !== null &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    const beforeRecord = before as JsonRecord;
    const afterRecord = after as JsonRecord;
    const keys = new Set([
      ...Object.keys(beforeRecord),
      ...Object.keys(afterRecord),
    ]);
    for (const key of [...keys].sort()) {
      const next = path ? `${path}.${key}` : key;
      if (
        !Object.hasOwn(beforeRecord, key) ||
        !Object.hasOwn(afterRecord, key)
      ) {
        output.push(next);
      } else {
        collectDiffs(beforeRecord[key], afterRecord[key], next, output);
      }
    }
    return output;
  }
  output.push(path || "<root>");
  return output;
}

function rejectEnglishContour(value: unknown, at = "root"): void {
  if (typeof value === "string") {
    if (
      /(?:^|[\\/])en(?:[\\/]|$)/u.test(value) ||
      /chapter_blueprints_en/u.test(value) ||
      value === "en"
    ) {
      throw new Error(`task5_v2_english_contour_forbidden:${at}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectEnglishContour(item, `${at}[${index}]`),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value as JsonRecord)) {
      rejectEnglishContour(item, `${at}.${key}`);
    }
  }
}

function validateTopology(root: JsonRecord): void {
  array(root.lessons, "lessons");
  const chapters: JsonRecord[] = [];
  const packetIds: string[] = [];
  for (const [lessonIndex, rawLesson] of root.lessons.entries()) {
    record(rawLesson, `lessons[${lessonIndex}]`);
    array(rawLesson.chapters, `lessons[${lessonIndex}].chapters`);
    for (const [chapterIndex, rawChapter] of rawLesson.chapters.entries()) {
      record(rawChapter, `lessons[${lessonIndex}].chapters[${chapterIndex}]`);
      chapters.push(rawChapter);
      array(
        rawChapter.packetIds,
        `lessons[${lessonIndex}].chapters[${chapterIndex}].packetIds`,
      );
      packetIds.push(...rawChapter.packetIds.map(String));
    }
  }
  record(root.topology, "topology");
  if (
    root.lessons.length !== 32 ||
    chapters.length !== 224 ||
    packetIds.length !== 1792 ||
    new Set(packetIds).size !== 1792 ||
    root.topology.lessons !== 32 ||
    root.topology.chaptersPerLesson !== 7 ||
    root.topology.sessionsPerChapter !== 8 ||
    root.topology.sessionPackets !== 1792
  ) {
    throw new Error("task5_v2_topology_invalid");
  }
}

export function validateGermanTask5V1SourceForV2(
  bytes: Buffer,
  value: JsonRecord,
): void {
  if (sha256(bytes) !== TASK5_V1_SHA256) {
    throw new Error("task5_v1_source_hash_mismatch");
  }
  if (value.schemaVersion !== "learning-v2-german-chapter-blueprints.v1") {
    throw new Error("task5_v1_source_version_mismatch");
  }
  if (hashCanonicalBody(value) !== TASK5_V1_CANONICAL_SHA256) {
    throw new Error("task5_v1_source_canonical_hash_mismatch");
  }
}

export function validateGermanTask5V2SceneSuccessor(
  source: JsonRecord,
  candidate: JsonRecord,
  ownerDecisions: unknown,
): void {
  validateGermanOwnerDecisionsContractDeV1(ownerDecisions);
  rejectEnglishContour(candidate);

  const target = l02c01(candidate);
  if (target.newSituation.setting !== "shared-kitchen-after-arrival") {
    throw new Error("task5_v2_scene_setting_invalid");
  }
  if (
    target.newSituation.contextSignature !==
    "shared-kitchen-housemates-person-number-action-match"
  ) {
    throw new Error("task5_v2_scene_context_signature_invalid");
  }
  if (target.kitchenUtility.facetValue !== "shared-kitchen-after-arrival") {
    throw new Error("task5_v2_kueche_utility_setting_invalid");
  }
  record(target.chapter.situation, "de_l02_c01.situation");
  if (
    semanticTuple(target.chapter.situation) ===
    semanticTuple(target.newSituation)
  ) {
    throw new Error("task5_v2_checkpoint_semantic_tuple_not_distinct");
  }
  if (
    target.newSituation.participants !== "two-new-housemates" ||
    target.newSituation.goal !== "match-a-person-cue-to-a-present-action-form"
  ) {
    throw new Error("task5_v2_checkpoint_preserved_fields_invalid");
  }
  if (candidate.schemaVersion !== "learning-v2-german-chapter-blueprints.v2") {
    throw new Error("task5_v2_schema_version_invalid");
  }
  if (candidate.targetLanguage !== "de") {
    throw new Error("task5_v2_target_language_invalid");
  }
  validateTopology(candidate);
  const actualDiffs = collectDiffs(source, candidate).sort();
  if (JSON.stringify(actualDiffs) !== JSON.stringify([...EXPECTED_DIFFS])) {
    throw new Error(`task5_v2_unexpected_diff:${actualDiffs.join(",")}`);
  }
}

function expectDiagnostic(
  diagnostic: RegExp,
  mutate: (
    source: JsonRecord,
    candidate: JsonRecord,
    ownerDecisions: JsonRecord,
  ) => void,
  sourceValue: JsonRecord,
  candidateValue: JsonRecord,
): void {
  const source = clone(sourceValue);
  const candidate = clone(candidateValue);
  const ownerDecisions = clone(
    GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1,
  ) as unknown as JsonRecord;
  mutate(source, candidate, ownerDecisions);
  assert.throws(
    () =>
      validateGermanTask5V2SceneSuccessor(source, candidate, ownerDecisions),
    diagnostic,
  );
}

const candidateArgumentIndex = process.argv.indexOf("--candidate");
const candidatePath =
  candidateArgumentIndex >= 0
    ? resolve(process.cwd(), process.argv[candidateArgumentIndex + 1] ?? "")
    : TASK5_V2_PATH;
const sourceBytes = readFileSync(TASK5_V1_PATH);
const source = parse(sourceBytes);
validateGermanTask5V1SourceForV2(sourceBytes, source);
const candidateBytes = readFileSync(candidatePath);
const candidate = parse(candidateBytes);
validateGermanTask5V2SceneSuccessor(
  source,
  candidate,
  GERMAN_OWNER_DECISIONS_CONTRACT_DE_V1,
);
if (
  candidatePath === TASK5_V2_PATH &&
  sha256(candidateBytes) !== TASK5_V2_SHA256
) {
  throw new Error("task5_v2_candidate_hash_mismatch");
}
if (
  candidatePath === TASK5_V2_PATH &&
  hashCanonicalBody(candidate) !== TASK5_V2_CANONICAL_SHA256
) {
  throw new Error("task5_v2_candidate_canonical_hash_mismatch");
}

assert.throws(
  () =>
    validateGermanTask5V1SourceForV2(
      Buffer.from(sourceBytes.toString("utf8") + " "),
      source,
    ),
  /task5_v1_source_hash_mismatch/u,
);
expectDiagnostic(
  /task5_v2_scene_setting_invalid/u,
  (_source, hostile) => {
    l02c01(hostile).newSituation.setting = "shared-hallway-name-labels";
  },
  source,
  candidate,
);
expectDiagnostic(
  /task5_v2_checkpoint_semantic_tuple_not_distinct/u,
  (_source, hostile) => {
    const target = l02c01(hostile);
    record(target.chapter.situation, "hostile.situation");
    target.newSituation.participants = target.chapter.situation.participants;
    target.newSituation.goal = target.chapter.situation.goal;
  },
  source,
  candidate,
);
expectDiagnostic(
  /task5_v2_unexpected_diff/u,
  (_source, hostile) => {
    delete chapter(hostile, "de_l01_c01").lessonOutcome;
  },
  source,
  candidate,
);
expectDiagnostic(
  /task5_v2_unexpected_diff/u,
  (_source, hostile) => {
    hostile.unreviewed = true;
  },
  source,
  candidate,
);
expectDiagnostic(
  /task5_v2_unexpected_diff/u,
  (_source, hostile) => {
    chapter(hostile, "de_l01_c01").lessonOutcome = "changed outside scope";
  },
  source,
  candidate,
);
expectDiagnostic(
  /blueprint_approval_must_remain_pending/u,
  (_source, _hostile, ownerDecisions) => {
    ownerDecisions.blueprintApproval = "APPROVED";
  },
  source,
  candidate,
);
expectDiagnostic(
  /task5_v2_english_contour_forbidden/u,
  (_source, hostile) => {
    hostile.targetLanguage = "en";
  },
  source,
  candidate,
);

process.stdout.write(
  "LEARNING V2 GERMAN TASK5 V2 KUECHE SCENE GATE: PASS " +
    `(v1=${TASK5_V1_SHA256}; v2=${TASK5_V2_SHA256}; owner=PENDING; 32/224/1792)\n`,
);
