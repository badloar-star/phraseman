import {
  assertLearningV2E1DemoProvenance,
  assertLearningV2ProductionContentProvenance,
  materializeLearningV2E1DemoProvenance,
} from './learning_v2_test_content_policy';

describe('Learning V2 test-content quarantine', () => {
  it('binds the demo fixture to exact bytes and never grants release authority', () => {
    const source = { episodeId: 'ep-01', items: ['hello'] };
    const provenance = materializeLearningV2E1DemoProvenance(source);
    expect(provenance).toMatchObject({
      contentClass: 'test_fixture',
      environment: 'lab',
      releaseAuthority: 'none',
    });
    expect(assertLearningV2E1DemoProvenance(provenance, source)).toBe(provenance);
    expect(() => assertLearningV2E1DemoProvenance(provenance, { ...source, items: ['changed'] }))
      .toThrow('learning_v2_test_provenance_invalid');
    expect(() => assertLearningV2ProductionContentProvenance(provenance))
      .toThrow('learning_v2_release_provenance');
  });

  it('rejects legacy/direct/unknown provenance and accepts only exact Content Studio authority', () => {
    for (const value of [undefined, {}, {
      schemaVersion: 'learning-v2-content-provenance.v1',
      contentClass: 'reviewed_content',
      originKind: 'direct_compilation',
      releaseAuthority: 'content_studio_approved_bundle',
      sourceFingerprint: 'a'.repeat(64),
    }]) expect(() => assertLearningV2ProductionContentProvenance(value)).toThrow();

    expect(() => assertLearningV2ProductionContentProvenance({
      schemaVersion: 'learning-v2-content-provenance.v1',
      contentClass: 'reviewed_content',
      originKind: 'content_studio',
      releaseAuthority: 'content_studio_approved_bundle',
      sourceFingerprint: 'a'.repeat(64),
    })).not.toThrow();
  });

  it('does not execute accessor fields while rejecting hostile provenance', () => {
    let getterCalled = false;
    const value = Object.create(Object.prototype, {
      schemaVersion: { enumerable: true, get() { getterCalled = true; return 'learning-v2-content-provenance.v1'; } },
      contentClass: { enumerable: true, value: 'reviewed_content' },
      originKind: { enumerable: true, value: 'content_studio' },
      releaseAuthority: { enumerable: true, value: 'content_studio_approved_bundle' },
      sourceFingerprint: { enumerable: true, value: 'a'.repeat(64) },
    });
    expect(() => assertLearningV2ProductionContentProvenance(value)).toThrow('learning_v2_release_provenance_invalid');
    expect(getterCalled).toBe(false);
  });
});
