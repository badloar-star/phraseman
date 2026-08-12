import { createHash } from 'node:crypto';
import { LEARNING_V2_GENERATION_INTERFACE_LOCALES } from './learning_v2_generation_artifacts';
import { loadApprovedLearningV2Prerequisite, type LearningV2GroundingBucketLike } from './learning_v2_prerequisite_grounding';

const artifact = {
  stage: 'learning_v2_research',
  result: {
    packageId: 'course-en-v1',
    targetLanguage: 'en',
    approvalStage: 'research',
    interfaceLocales: [...LEARNING_V2_GENERATION_INTERFACE_LOCALES],
    localizedContent: Object.fromEntries(LEARNING_V2_GENERATION_INTERFACE_LOCALES.map((locale) => [locale, { title: `Research ${locale}` }])),
    evidence: [{ sourceId: 'evidence-1' }],
  },
} as const;

function fixture() {
  const bytes = Buffer.from(JSON.stringify(artifact), 'utf8');
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const bucket: LearningV2GroundingBucketLike = {
    file: () => ({
      getMetadata: async () => [{ generation: '7', size: bytes.byteLength }],
      download: async () => [bytes],
    }),
  };
  return {
    bucket,
    prerequisite: {
      stageId: 'research-stage', artifactId: 'artifact:research-stage', kind: 'learning_v2_research', state: 'approved',
      requestId: 'learning-v2-en-v1', studyTarget: 'en', sourceLocale: 'multi', scopeId: 'course-en',
      objectPath: 'content-factory-stages/research.json', contentHash, objectGeneration: '7', ownerApprovalTrail: [], reviewedBy: 'owner-uid', reviewReason: 'Исследование одобрено владельцем',
    },
    consumer: { kind: 'learning_v2_curriculum' as const, requestId: 'learning-v2-en-v1', studyTarget: 'en', sourceLocale: 'multi', scopeId: 'course-en', ownerApprovalTrail: [{ stageKind: 'learning_v2_research', stageId: 'research-stage', artifactId: 'artifact:research-stage', contentHash, reviewerUid: 'owner-uid', reason: 'Исследование одобрено владельцем' }] },
  };
}

describe('Learning V2 approved prerequisite grounding', () => {
  test('loads the exact immutable approved predecessor for the next owner-gated stage', async () => {
    const value = fixture();
    await expect(loadApprovedLearningV2Prerequisite(value.bucket, value.prerequisite, value.consumer)).resolves.toMatchObject({
      approvedStageId: 'research-stage', approvedKind: 'learning_v2_research', artifact,
    });
  });

  test.each([
    [{ state: 'needs_review' }, 'learning_v2_grounding_not_approved'],
    [{ kind: 'learning_v2_curriculum' }, 'learning_v2_grounding_not_approved'],
    [{ scopeId: 'course-fr' }, 'learning_v2_grounding_identity_mismatch'],
  ])('rejects an unapproved or foreign predecessor before reading Storage', async (change, expected) => {
    const value = fixture();
    const file = jest.fn(value.bucket.file);
    await expect(loadApprovedLearningV2Prerequisite({ file }, { ...value.prerequisite, ...change }, value.consumer)).rejects.toThrow(expected);
    expect(file).not.toHaveBeenCalled();
  });

  test('rejects bytes that do not match the immutable receipt', async () => {
    const value = fixture();
    await expect(loadApprovedLearningV2Prerequisite(value.bucket, { ...value.prerequisite, contentHash: 'a'.repeat(64) }, value.consumer)).rejects.toThrow('learning_v2_grounding_hash_mismatch');
  });
});
