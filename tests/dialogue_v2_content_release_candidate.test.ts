import fs from 'node:fs';
import path from 'node:path';

type CandidatePin = Readonly<{
  key: string;
  studyTarget: string;
  sourceScenarioId: string;
  worldId: string;
  rankRequired: number;
  cefr: string;
  objectiveCount: number;
  sourceDraftPath: string;
  sourceDraftSha256: string;
  targetPayloadSha256: string;
  candidatePacketSha256: string;
}>;

type CandidateManifest = Readonly<{
  schemaVersion: string;
  status: string;
  candidateId: string;
  source: Readonly<{
    ledgerPath: string;
    ledgerSha256: string;
    draftDirectory: string;
  }>;
  summary: Readonly<{
    sourceScenarioCount: number;
    targetPacketCount: number;
    studyTargets: readonly string[];
  }>;
  packets: readonly CandidatePin[];
  manifestSha256: string;
}>;

type PipelineModule = Readonly<{
  buildDialogueV2ContentCandidate(repoRoot: string): CandidateManifest;
  computeDialogueV2CandidateManifestSha256(manifest: CandidateManifest): string;
  hashDialogueV2CandidateValue(value: unknown): string;
  validateDialogueV2ContentCandidate(
    manifest: unknown,
    repoRoot: string,
  ): Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>;
  evaluateDialogueV2ContentPromotionGate(
    manifest: unknown,
    receipt: unknown,
    repoRoot: string,
  ): Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>;
  validateDialogueV2CandidateReplacement(
    existing: unknown,
    next: unknown,
  ): Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>;
}>;

const REPO_ROOT = path.join(__dirname, '..');
const PIPELINE_PATH = path.join(REPO_ROOT, 'scripts', 'dialogue_v2_content_release_candidate.ts');
const CANDIDATE_DIRECTORY = path.join(REPO_ROOT, 'content', 'dialogues-v2', 'release-candidate');
const MANIFEST_PATH = path.join(CANDIDATE_DIRECTORY, 'dialogue_v2_content_candidate.v1.json');
const RECEIPT_PATH = path.join(CANDIDATE_DIRECTORY, 'dialogue_v2_content_review_receipt.pending.v1.json');
const RECEIPT_SCHEMA_PATH = path.join(CANDIDATE_DIRECTORY, 'dialogue_v2_content_review_receipt.schema.v1.json');
const REQUIRED_REVIEW_ROLES = [
  'targetContractGuardian',
  'scenarioPackReviewer',
  'promptLanguageJudge',
  'voiceLocaleGate',
  'stateIsolationJudge',
  'surfaceMatrixGate',
] as const;

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function loadPipeline(): PipelineModule {
  expect(fs.existsSync(PIPELINE_PATH)).toBe(true);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pipeline = require(PIPELINE_PATH) as PipelineModule;
  expect(process.exitCode).toBeUndefined();
  return pipeline;
}

describe('Dialogue V2 deterministic content release candidate', () => {
  test('pins all 304 draft target packets while remaining explicitly non-releaseable', () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    expect(fs.existsSync(RECEIPT_PATH)).toBe(true);
    expect(fs.existsSync(RECEIPT_SCHEMA_PATH)).toBe(true);

    const pipeline = loadPipeline();
    const manifest = readJson(MANIFEST_PATH) as CandidateManifest;

    expect(manifest).toMatchObject({
      schemaVersion: 'dialogue-v2-content-candidate-manifest.v1',
      status: 'candidate_pending_authorized_review',
      candidateId: 'dialogue-v2-content-candidate-v1',
      summary: {
        sourceScenarioCount: 76,
        targetPacketCount: 304,
        studyTargets: ['en', 'es', 'fr', 'de'],
      },
    });
    expect(manifest.packets).toHaveLength(304);
    expect(new Set(manifest.packets.map((pin) => pin.key)).size).toBe(304);
    expect(manifest.packets.every((pin) => (
      pin.key === `${pin.studyTarget}:${pin.sourceScenarioId}`
      && /^[a-f0-9]{64}$/.test(pin.sourceDraftSha256)
      && /^[a-f0-9]{64}$/.test(pin.targetPayloadSha256)
      && /^[a-f0-9]{64}$/.test(pin.candidatePacketSha256)
      && pin.objectiveCount >= 6
      && pin.objectiveCount <= 12
    ))).toBe(true);

    for (const target of manifest.summary.studyTargets) {
      const targetPins = manifest.packets.filter((pin) => pin.studyTarget === target);
      expect(targetPins).toHaveLength(76);
      expect(targetPins.filter((pin) => pin.cefr === 'A1')).toHaveLength(20);
      expect(targetPins.filter((pin) => pin.cefr === 'A2')).toHaveLength(20);
      expect(targetPins.filter((pin) => pin.cefr === 'B1')).toHaveLength(12);
      expect(targetPins.filter((pin) => pin.cefr === 'B2')).toHaveLength(12);
      expect(targetPins.filter((pin) => pin.cefr === 'C1')).toHaveLength(8);
      expect(targetPins.filter((pin) => pin.cefr === 'C2')).toHaveLength(4);
      for (const worldId of ['social', 'work', 'travel', 'everyday']) {
        expect(targetPins.filter((pin) => pin.worldId === worldId).map((pin) => pin.rankRequired))
          .toEqual(Array.from({ length: 19 }, (_, index) => index + 1));
      }
    }

    expect(pipeline.validateDialogueV2ContentCandidate(manifest, REPO_ROOT)).toEqual({ ok: true });
  });

  test('rebuilds byte-stable pins and a stable manifest hash from the current authoring sources', () => {
    const pipeline = loadPipeline();
    const checkedIn = readJson(MANIFEST_PATH) as CandidateManifest;
    const rebuilt = pipeline.buildDialogueV2ContentCandidate(REPO_ROOT);

    expect(rebuilt).toEqual(checkedIn);
    expect(pipeline.computeDialogueV2CandidateManifestSha256(checkedIn))
      .toBe(checkedIn.manifestSha256);
    expect(pipeline.hashDialogueV2CandidateValue({ b: 2, a: 1 }))
      .toBe(pipeline.hashDialogueV2CandidateValue({ a: 1, b: 2 }));
  });

  test('never reuses a candidate id for different pinned content', () => {
    const pipeline = loadPipeline();
    const checkedIn = readJson(MANIFEST_PATH) as CandidateManifest;
    expect(pipeline.validateDialogueV2CandidateReplacement(checkedIn, checkedIn)).toEqual({ ok: true });

    const changed = JSON.parse(JSON.stringify(checkedIn)) as CandidateManifest & {
      packets: CandidatePin[];
      manifestSha256: string;
    };
    changed.packets[0] = {
      ...changed.packets[0],
      targetPayloadSha256: '0'.repeat(64),
    };
    changed.manifestSha256 = pipeline.computeDialogueV2CandidateManifestSha256(changed);

    expect(pipeline.validateDialogueV2CandidateReplacement(checkedIn, changed)).toEqual({
      ok: false,
      error: 'candidate_id_immutable_conflict',
    });
  });

  test('keeps the checked-in review receipt pending and blocks promotion', () => {
    const pipeline = loadPipeline();
    const manifest = readJson(MANIFEST_PATH);
    const receipt = readJson(RECEIPT_PATH) as Record<string, unknown>;

    expect(receipt).toMatchObject({
      schemaVersion: 'dialogue-v2-content-review-receipt.v1',
      status: 'pending_authorized_review',
      candidateId: 'dialogue-v2-content-candidate-v1',
      review: {
        decision: 'PENDING',
        reviewerId: null,
        authorityReference: null,
        reviewedAt: null,
        packetCountReviewed: 0,
        roleVerdicts: {},
      },
    });
    expect(pipeline.evaluateDialogueV2ContentPromotionGate(manifest, receipt, REPO_ROOT)).toEqual({
      ok: false,
      error: 'authorized_review_pending',
    });
  });

  test('opens the promotion gate only for an exact authorized receipt with every review role passing', () => {
    const pipeline = loadPipeline();
    const manifest = readJson(MANIFEST_PATH) as CandidateManifest;
    const approvedReceipt = {
      schemaVersion: 'dialogue-v2-content-review-receipt.v1',
      status: 'approved_for_promotion',
      candidateId: manifest.candidateId,
      candidateManifestSha256: manifest.manifestSha256,
      requiredReviewRoles: [...REQUIRED_REVIEW_ROLES],
      review: {
        decision: 'APPROVE',
        reviewerId: 'authorized-content-reviewer',
        authorityReference: 'owner-explicit-review-authorization:example-test-only',
        reviewedAt: '2026-09-27T12:00:00.000Z',
        packetCountReviewed: 304,
        roleVerdicts: Object.fromEntries(REQUIRED_REVIEW_ROLES.map((role) => [role, 'PASS'])),
      },
    };

    expect(pipeline.evaluateDialogueV2ContentPromotionGate(manifest, approvedReceipt, REPO_ROOT))
      .toEqual({ ok: true });

    const partialReceipt = structuredClone(approvedReceipt);
    delete partialReceipt.review.roleVerdicts.voiceLocaleGate;
    expect(pipeline.evaluateDialogueV2ContentPromotionGate(manifest, partialReceipt, REPO_ROOT))
      .toEqual({ ok: false, error: 'authorized_review_invalid' });

    const staleReceipt = { ...approvedReceipt, candidateManifestSha256: '0'.repeat(64) };
    expect(pipeline.evaluateDialogueV2ContentPromotionGate(manifest, staleReceipt, REPO_ROOT))
      .toEqual({ ok: false, error: 'review_candidate_mismatch' });
  });
});
