import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT,
  MANDATORY_AUTHORING_SOURCE_KEYS,
  buildAuthoringAdmission,
  captureMandatoryAuthoringSources,
  evaluateAcceptedPrefixPrerequisites,
  parseBlueprintAuthoringContract,
  validateAcceptedSessionAgainstBlueprintPacket,
} from "./authoring_admission.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const PIPELINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(PIPELINE_DIR, "../../..");

function fixture() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "learning-v2-authoring-admission-"));
  const repoRoot = path.join(root, "repo");
  const factoryRoot = path.join(repoRoot, "content", "learning-v2-course");
  const desktopCodexRoot = path.join(root, "DesktopCodex");
  const sessionsRoot = path.join(factoryRoot, "sessions");
  const pathForKey = (key) => key.startsWith("DesktopCodex/")
    ? path.join(desktopCodexRoot, key.slice("DesktopCodex/".length))
    : key.startsWith("factory/")
      ? path.join(factoryRoot, key.slice("factory/".length))
      : path.join(repoRoot, key.slice("repo/".length));
  for (const key of MANDATORY_AUTHORING_SOURCE_KEYS) {
    const file = pathForKey(key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `source:${key}\n`, "utf8");
  }
  const planPath = pathForKey("factory/curriculum/en/ПЛАН_КУРСА.md");
  fs.writeFileSync(planPath, "exact approved plan bytes\n", "utf8");
  fs.mkdirSync(path.join(sessionsRoot, "en", "l01", "s01"), { recursive: true });
  fs.writeFileSync(path.join(sessionsRoot, "en", "l01", "s01", "final.ru.md"), "prior ru\n", "utf8");
  fs.writeFileSync(path.join(sessionsRoot, "en", "l01", "s01", "final.uk.md"), "prior uk\n", "utf8");
  fs.writeFileSync(path.join(sessionsRoot, "en", "l01", "s01", "practice.atomic.json"), "{\"prior\":true}\n", "utf8");
  fs.writeFileSync(path.join(sessionsRoot, "en", "l01", "s01", "status.json"), JSON.stringify({
    converged: false,
    needsHumanReview: true,
    blockedBy: ["audio_evidence", "canonical_sync", "release_parity"],
  }), "utf8");
  // Publication artifacts deliberately exist but must not participate in the
  // next-session authoring admission.
  fs.mkdirSync(path.join(root, "release", "en", "l01", "s01"), { recursive: true });
  fs.writeFileSync(path.join(root, "release", "en", "l01", "s01", "learner.json"), "stale release", "utf8");
  return {
    root,
    repoRoot,
    factoryRoot,
    desktopCodexRoot,
    planPath,
    sessionsRoot,
    pathForKey,
    planSha256: sha256(fs.readFileSync(planPath)),
  };
}

const row = Object.freeze({
  n: 2,
  type: "применение",
  grammar: "I am + состояние",
  words: "tired, busy, late, sorry",
  moment: "день продолжается",
  scene: "первая неделя в офисе",
});

const blueprintContract = Object.freeze({
  schemaVersion: "learning_v2_blueprint_authoring_contract_v2",
  session: "en/l01/s02",
  sessionId: "lesson-01:session:02",
  blueprintFingerprint: APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT,
  sessionPacketSha256: "b".repeat(64),
  acceptedPrefixPackets: [],
  semantic: {
    role: "introduce_or_guided_extension",
    grammarOperationIds: [],
    reviewOperationIds: ["en.grammar.present_be_affirmative.i_am"],
    prerequisiteSessionIds: [],
    grammarOperations: [],
    newLexicalSenses: [
      { id: "en.sad.adjective.01", english: "sad", partOfSpeech: "adjective", evidenceExamples: ["I am sad."] },
      { id: "en.tired.adjective.01", english: "tired", partOfSpeech: "adjective", evidenceExamples: ["I am tired."] },
    ],
    retrievalLexicalSenses: [
      { id: "en.here.adverb.01", english: "here", partOfSpeech: "adverb", evidenceExamples: ["I am here."] },
      { id: "en.ready.adjective.01", english: "ready", partOfSpeech: "adjective", evidenceExamples: ["I am ready."] },
      { id: "en.fine.adjective.01", english: "fine", partOfSpeech: "adjective", evidenceExamples: ["I am fine."] },
      { id: "en.happy.adjective.01", english: "happy", partOfSpeech: "adjective", evidenceExamples: ["I am happy."] },
    ],
    reviewOperations: [{
      id: "en.grammar.present_be_affirmative.i_am",
      formBoundary: ["I + am + complement"],
      planEvidenceAlternatives: ["i am"],
      evidenceExamples: ["I am tired."],
    }],
    phraseFrames: ["I + am + complement"],
    modeFamilies: ["phrase_builder"],
    learningDeltaRu: "Применить I am с меньшей опорой.",
    chapterTitleRu: "Present be: утверждение",
    transferContextRu: "первый рабочий день",
  },
});

const encodedBlueprintGate = (contract = blueprintContract) => ({
  status: 0,
  stdout: [
    "LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS",
    `owner_approval=APPROVED fingerprint=${APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT}`,
    `authoring_contract_base64=${Buffer.from(JSON.stringify(contract), "utf8").toString("base64")}`,
  ].join("\n"),
  stderr: "",
});

const passingPrefixCoverage = Object.freeze({
  schemaVersion: "learning_v2_accepted_prefix_prerequisite_coverage_v1",
  session: "en/l01/s02",
  blueprintFingerprint: APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT,
  verdict: "PASS",
  missingRetrievalSenseIds: [],
  missingReviewOperationIds: [],
  provenRetrievalSenseIds: [],
  provenReviewOperationIds: [],
  issues: [],
});

function admissionInput(f, overrides = {}) {
  const mandatorySources = captureMandatoryAuthoringSources({
    repoRoot: f.repoRoot,
    factoryRoot: f.factoryRoot,
    desktopCodexRoot: f.desktopCodexRoot,
    language: "en",
  });
  return {
    session: "en/l01/s02",
    row,
    curriculumRow: "Урок 1, сессия 2 · тип: применение · грамматика: I am + состояние · новые слова: tired, busy, late, sorry · момент сцены: день продолжается",
    planPath: f.planPath,
    expectedPlanSha256: f.planSha256,
    sessionsRoot: f.sessionsRoot,
    mandatorySources,
    blueprintGate: encodedBlueprintGate(),
    acceptedPrefixCoverage: passingPrefixCoverage,
    ...overrides,
  };
}

test("S02 authoring admission uses exact row and prior source digests without prior release/audio readiness", () => {
  const f = fixture();
  try {
    const result = buildAuthoringAdmission(admissionInput(f));
    assert.equal(result.ready, true, result.issues.join("\n"));
    assert.deepEqual(result.issues, []);
    assert.equal(result.packet.blueprintFingerprint, APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT);
    assert.equal(result.packet.blueprintSessionPacketSha256, blueprintContract.sessionPacketSha256);
    assert.deepEqual(result.packet.admitted.grammarOperationIds, blueprintContract.semantic.grammarOperationIds);
    assert.deepEqual(result.packet.admitted.newLexicalSenseIds, blueprintContract.semantic.newLexicalSenses.map(({ id }) => id));
    assert.equal(result.packet.admitted.scene, blueprintContract.semantic.transferContextRu);
    assert.equal(result.packet.admitted.mode, blueprintContract.semantic.role);
    assert.equal(result.packet.legacyPlanReference.curriculumRow, admissionInput(f).curriculumRow);
    assert.deepEqual(result.packet.legacyPlanReference.diagnostics, [
      "legacy_plan_new_lexical_senses_mismatch:plan=busy,late,sorry,tired:blueprint=sad,tired",
    ]);
    assert.deepEqual(
      Object.keys(result.packet.priorSourceDigests),
      [
        "en/l01/s01/final.ru.md",
        "en/l01/s01/final.uk.md",
        "en/l01/s01/practice.atomic.json",
      ],
    );
    assert.equal(JSON.stringify(result.packet).includes("learner.json"), false);
    assert.equal(JSON.stringify(result.packet).includes("status.json"), false);
    assert.equal(result.packet.semanticReview.requiredAfterDraft, true);
    assert.equal(result.packet.semanticReview.identityAuthentication, "NOT_CRYPTOGRAPHICALLY_AUTHENTICATED");
    assert.deepEqual(result.packet.priorQualityEvidence["en/l01/s01"].releaseOnlyBlockers, [
      "audio_evidence",
      "canonical_sync",
      "release_parity",
    ]);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("the code-owned mandatory manifest fails closed on a missing or changed source", () => {
  const f = fixture();
  try {
    const missingKey = "DesktopCodex/00_ПРОЧТИ_ПЕРВЫМ.txt";
    fs.rmSync(f.pathForKey(missingKey));
    const missing = captureMandatoryAuthoringSources({
      repoRoot: f.repoRoot,
      factoryRoot: f.factoryRoot,
      desktopCodexRoot: f.desktopCodexRoot,
      language: "en",
    });
    assert.match(missing.issues.join("\n"), new RegExp(`mandatory_source_missing:${missingKey}`, "u"));

    fs.writeFileSync(f.pathForKey(missingKey), "restored\n", "utf8");
    const input = admissionInput(f);
    const changedKey = "factory/КОНСТИТУЦИЯ.md";
    fs.appendFileSync(f.pathForKey(changedKey), "changed during admission\n", "utf8");
    const changed = buildAuthoringAdmission(input);
    assert.equal(changed.ready, false);
    assert.match(changed.issues.join("\n"), new RegExp(`mandatory_source_changed:${changedKey}`, "u"));

    const inventoryInput = admissionInput(f);
    const addedOwner = path.join(f.factoryRoot, "judgements", "owner", "unexpected-new-owner-rule.md");
    fs.writeFileSync(addedOwner, "new authority after capture\n", "utf8");
    const inventoryChanged = buildAuthoringAdmission(inventoryInput);
    assert.equal(inventoryChanged.ready, false);
    assert.match(inventoryChanged.issues.join("\n"), /mandatory_source_inventory_changed:factory\/judgements\/owner/u);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("prior quality HOLD blocks S02 while release-only audio canonical and parity HOLD do not", () => {
  const f = fixture();
  try {
    const releaseOnly = buildAuthoringAdmission(admissionInput(f));
    assert.equal(releaseOnly.ready, true, releaseOnly.issues.join("\n"));

    fs.writeFileSync(path.join(f.sessionsRoot, "en", "l01", "s01", "status.json"), JSON.stringify({
      converged: false,
      needsHumanReview: true,
      blockedBy: ["judge_reader"],
    }), "utf8");
    const qualityHold = buildAuthoringAdmission(admissionInput(f));
    assert.equal(qualityHold.ready, false);
    assert.match(qualityHold.issues.join("\n"), /prior_quality_hold:en\/l01\/s01:judge_reader/u);

    fs.writeFileSync(path.join(f.sessionsRoot, "en", "l01", "s01", "status.json"), JSON.stringify({
      converged: false,
      needsHumanReview: true,
      blockedBy: ["audio_evidence", "canonical_sync"],
      judges: {
        judge_reader: { verdict: "BLOCK", verdict_reason: "meaning is unclear" },
        judge_pedagogy: { verdict: "PASS" },
      },
    }), "utf8");
    const mixedHold = buildAuthoringAdmission(admissionInput(f));
    assert.equal(mixedHold.ready, false);
    assert.match(mixedHold.issues.join("\n"), /prior_quality_hold:en\/l01\/s01:judges:judge_reader:BLOCK/u);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("blueprint drift remains HOLD", () => {
  const f = fixture();
  try {
    const result = buildAuthoringAdmission(admissionInput(f, {
      blueprintGate: {
        status: 0,
        stdout: `owner_approval=APPROVED fingerprint=${"a".repeat(64)}\n`,
        stderr: "",
      },
    }));
    assert.equal(result.ready, false);
    assert.match(result.issues.join("\n"), /blueprint_fingerprint_drift/u);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("approved blueprint packet is mandatory and old plan semantic conflicts remain non-fatal diagnostics", () => {
  const f = fixture();
  try {
    const missingPacket = buildAuthoringAdmission(admissionInput(f, {
      blueprintGate: {
        status: 0,
        stdout: `LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS\nowner_approval=APPROVED fingerprint=${APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT}\n`,
        stderr: "",
      },
    }));
    assert.equal(missingPacket.ready, false);
    assert.match(missingPacket.issues.join("\n"), /blueprint_authoring_contract_missing/u);

    const stalePlan = buildAuthoringAdmission(admissionInput(f, {
      row: { ...row, grammar: "You are + оценка", words: "welcome, kind, funny" },
      curriculumRow: "Урок 1, сессия 2 · тип: применение · грамматика: You are + оценка · новые слова: welcome, kind, funny · момент сцены: день продолжается",
    }));
    assert.equal(stalePlan.ready, true, stalePlan.issues.join("\n"));
    assert.deepEqual(stalePlan.issues, []);
    assert.match(stalePlan.packet.legacyPlanReference.diagnostics.join("\n"), /legacy_plan_operation_missing:en\.grammar\.present_be_affirmative\.i_am/u);
    assert.match(stalePlan.packet.legacyPlanReference.diagnostics.join("\n"), /legacy_plan_new_lexical_senses_mismatch/u);
    assert.deepEqual(stalePlan.packet.admitted.grammarOperationIds, blueprintContract.semantic.grammarOperationIds);
    assert.deepEqual(stalePlan.packet.admitted.reviewOperationIds, blueprintContract.semantic.reviewOperationIds);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});

test("actual S02 preflight passes when the pinned legacy plan only differs semantically", () => {
  const runPath = path.join(PIPELINE_DIR, "run.mjs");
  const result = spawnSync(process.execPath, [runPath, "preflight", "--session", "en/l01/s02"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /AUTHORING ADMISSION PASS: en\/l01\/s02/u);
  assert.match(output, /legacy_plan_new_lexical_senses_mismatch/u);
});

test("accepted-prefix prerequisite coverage reports each missing retrieval sense and review operation", () => {
  const contract = {
    ...blueprintContract,
    session: "en/l01/s16",
    sessionId: "lesson-01:session:16",
    semantic: {
      ...blueprintContract.semantic,
      retrievalLexicalSenses: [
        { id: "en.tall.adjective.01", english: "tall", partOfSpeech: "adjective", evidenceExamples: ["He is tall."] },
        { id: "en.short.adjective.01", english: "short", partOfSpeech: "adjective", evidenceExamples: ["He is short."] },
      ],
      reviewOperations: [
        { id: "en.grammar.present_be_affirmative.i_am", planEvidenceAlternatives: ["i am"], evidenceExamples: ["I am tall."] },
        { id: "en.grammar.present_be_affirmative.he_she_it_is", planEvidenceAlternatives: ["he is", "she is", "it is"], evidenceExamples: ["He is tall."] },
      ],
    },
  };
  const result = evaluateAcceptedPrefixPrerequisites({
    session: contract.session,
    blueprintContract: contract,
    acceptedSessions: [{
      session: "en/l01/s01",
      acceptedTargets: ["I am tall."],
      provenLexicalSenseIds: ["en.tall.adjective.01"],
      provenOperationIds: ["en.grammar.present_be_affirmative.i_am"],
      acceptanceReceiptPath: "accepted/s01/acceptance-receipt.json",
      acceptanceReceiptSha256: "a".repeat(64),
    }],
  });
  assert.equal(result.verdict, "HOLD");
  assert.deepEqual(result.missingRetrievalSenseIds, ["en.short.adjective.01"]);
  assert.deepEqual(result.missingReviewOperationIds, ["en.grammar.present_be_affirmative.he_she_it_is"]);
  assert.match(result.issues.join("\n"), /accepted_prefix_retrieval_sense_missing:en\.short\.adjective\.01/u);
  assert.match(result.issues.join("\n"), /accepted_prefix_review_operation_missing:en\.grammar\.present_be_affirmative\.he_she_it_is/u);
});

test("exact prerequisite IDs reject homographs and operation evidence from the wrong packet", () => {
  const targetContract = {
    ...blueprintContract,
    session: "en/l01/s16",
    sessionId: "lesson-01:session:16",
    semantic: {
      ...blueprintContract.semantic,
      retrievalLexicalSenses: [{
        id: "en.clean.adjective.01",
        english: "clean",
        partOfSpeech: "adjective",
        evidenceExamples: ["It is clean."],
      }],
      reviewOperations: [{
        id: "en.grammar.present_be_affirmative.he_she_it_is",
        planEvidenceAlternatives: ["he is", "she is", "it is"],
        evidenceExamples: ["It is clean."],
      }],
    },
  };
  const homographOnly = evaluateAcceptedPrefixPrerequisites({
    session: targetContract.session,
    blueprintContract: targetContract,
    acceptedSessions: [{
      session: "en/l01/s01",
      acceptedTargets: ["I clean rooms."],
      provenLexicalSenseIds: ["en.clean.verb.01"],
      provenOperationIds: ["en.grammar.present_simple_affirmative.lexical_frame"],
    }],
  });
  assert.deepEqual(homographOnly.missingRetrievalSenseIds, ["en.clean.adjective.01"]);
  assert.deepEqual(homographOnly.missingReviewOperationIds, ["en.grammar.present_be_affirmative.he_she_it_is"]);

  const wrongPacket = validateAcceptedSessionAgainstBlueprintPacket({
    packetContract: {
      session: "en/l01/s09",
      sessionPacketSha256: "c".repeat(64),
      grammarOperations: [{
        id: "en.grammar.present_be_affirmative.he_she_it_is",
        evidenceExamples: ["He is tall.", "She is short."],
      }],
      reviewOperations: [],
      newLexicalSenses: [{
        id: "en.tall.adjective.01",
        english: "tall",
        partOfSpeech: "adjective",
        evidenceExamples: ["He is tall."],
      }],
    },
    acceptedTargets: ["You are tall."],
  });
  assert.equal(wrongPacket.verdict, "HOLD");
  assert.deepEqual(wrongPacket.provenOperationIds, []);
  assert.deepEqual(wrongPacket.provenLexicalSenseIds, []);
  assert.match(wrongPacket.issues.join("\n"), /accepted_packet_operation_missing:en\.grammar\.present_be_affirmative\.he_she_it_is/u);

  const wrongSession = validateAcceptedSessionAgainstBlueprintPacket({
    session: "en/l01/s08",
    packetContract: {
      session: "en/l01/s09",
      sessionPacketSha256: "d".repeat(64),
      grammarOperations: [{
        id: "en.grammar.present_be_affirmative.he_she_it_is",
        evidenceExamples: ["He is tall."],
      }],
      reviewOperations: [],
      newLexicalSenses: [],
    },
    acceptedTargets: ["He is tall."],
  });
  assert.equal(wrongSession.verdict, "HOLD");
  assert.deepEqual(wrongSession.provenOperationIds, []);
  assert.match(wrongSession.issues.join("\n"), /accepted_packet_session_mismatch:en\/l01\/s08/u);
});

test("blueprint contract parser rejects session substitution", () => {
  const gate = encodedBlueprintGate({ ...blueprintContract, session: "en/l01/s03" });
  assert.throws(
    () => parseBlueprintAuthoringContract(gate, "en/l01/s02"),
    /blueprint_authoring_contract_session_mismatch/u,
  );

  const incompleteSemantic = {
    ...blueprintContract,
    semantic: {
      ...blueprintContract.semantic,
      reviewOperationIds: ["en.grammar.present_be_affirmative.he_she_it_is"],
      reviewOperations: [],
    },
  };
  assert.throws(
    () => parseBlueprintAuthoringContract(encodedBlueprintGate(incompleteSemantic), "en/l01/s02"),
    /blueprint_authoring_contract_semantic_binding_invalid/u,
  );

  const evidenceFreeSemantic = {
    ...blueprintContract,
    semantic: {
      ...blueprintContract.semantic,
      reviewOperations: blueprintContract.semantic.reviewOperations.map((operation) => ({
        ...operation,
        evidenceExamples: [],
      })),
    },
  };
  assert.throws(
    () => parseBlueprintAuthoringContract(encodedBlueprintGate(evidenceFreeSemantic), "en/l01/s02"),
    /blueprint_authoring_contract_semantic_binding_invalid/u,
  );
});

test("the exact pinned curriculum plan and complete row are fail-closed", () => {
  const f = fixture();
  try {
    fs.appendFileSync(f.planPath, "drift\n", "utf8");
    const drift = buildAuthoringAdmission(admissionInput(f));
    assert.equal(drift.ready, false);
    assert.match(drift.issues.join("\n"), /curriculum_plan_digest_drift/u);

    const incomplete = buildAuthoringAdmission(admissionInput(f, {
      expectedPlanSha256: sha256(fs.readFileSync(f.planPath)),
      row: { ...row, scene: "" },
    }));
    assert.equal(incomplete.ready, false);
    assert.match(incomplete.issues.join("\n"), /curriculum_row_scene_missing/u);
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true });
  }
});
