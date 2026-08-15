import { hashCanonicalBody } from '../../../modules/learning-v2/policies/decision_registry';

export const LEARNING_V2_E1_DEMO_FIXTURE_ID = 'learning-v2-e1-demo-v1';
export const LEARNING_V2_TEST_SOURCE_COLLECTION = 'content_v2_test_sources';
export const LEARNING_V2_TEST_COMPILED_COLLECTION = 'content_v2_test_compiled_units';
export const LEARNING_V2_TEST_JOB_COLLECTION = 'content_v2_test_generation_jobs';

export type LearningV2TestContentProvenance = Readonly<{
  schemaVersion: 'learning-v2-content-provenance.v1';
  contentClass: 'test_fixture';
  fixtureId: typeof LEARNING_V2_E1_DEMO_FIXTURE_ID;
  originKind: 'e1_demo_bank';
  environment: 'lab';
  releaseAuthority: 'none';
  sourceFingerprint: string;
}>;

const HASH_RE = /^[a-f0-9]{64}$/;

export function materializeLearningV2E1DemoProvenance(source: unknown): LearningV2TestContentProvenance {
  return Object.freeze({
    schemaVersion: 'learning-v2-content-provenance.v1',
    contentClass: 'test_fixture',
    fixtureId: LEARNING_V2_E1_DEMO_FIXTURE_ID,
    originKind: 'e1_demo_bank',
    environment: 'lab',
    releaseAuthority: 'none',
    sourceFingerprint: hashCanonicalBody(source),
  });
}

export function assertLearningV2E1DemoProvenance(value: unknown, source: unknown): LearningV2TestContentProvenance {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error('learning_v2_test_provenance_invalid');
  }
  const expected = ['schemaVersion', 'contentClass', 'fixtureId', 'originKind', 'environment', 'releaseAuthority', 'sourceFingerprint'];
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length || keys.some((key) => typeof key !== 'string' || !expected.includes(key))) {
    throw new Error('learning_v2_test_provenance_invalid');
  }
  const record: Record<string, unknown> = {};
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('learning_v2_test_provenance_invalid');
    record[key] = descriptor.value;
  }
  const expectedFingerprint = hashCanonicalBody(source);
  if (
    record.schemaVersion !== 'learning-v2-content-provenance.v1' ||
    record.contentClass !== 'test_fixture' ||
    record.fixtureId !== LEARNING_V2_E1_DEMO_FIXTURE_ID ||
    record.originKind !== 'e1_demo_bank' ||
    record.environment !== 'lab' ||
    record.releaseAuthority !== 'none' ||
    record.sourceFingerprint !== expectedFingerprint
  ) throw new Error('learning_v2_test_provenance_invalid');
  return value as LearningV2TestContentProvenance;
}

/**
 * Release selectors are fail-closed: only an exact, independently reviewed
 * Content Studio provenance may cross the production boundary. Demo, direct,
 * legacy-without-provenance and generic stage approval are never authority.
 */
export function assertLearningV2ProductionContentProvenance(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error('learning_v2_release_provenance_missing');
  }
  const keys = Reflect.ownKeys(value);
  const expected = ['schemaVersion', 'contentClass', 'originKind', 'releaseAuthority', 'sourceFingerprint'];
  if (keys.length !== expected.length || keys.some((key) => typeof key !== 'string' || !expected.includes(key))) {
    throw new Error('learning_v2_release_provenance_invalid');
  }
  const record: Record<string, unknown> = {};
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('learning_v2_release_provenance_invalid');
    record[key] = descriptor.value;
  }
  if (
    record.schemaVersion !== 'learning-v2-content-provenance.v1' ||
    record.contentClass !== 'reviewed_content' ||
    record.originKind !== 'content_studio' ||
    record.releaseAuthority !== 'content_studio_approved_bundle' ||
    typeof record.sourceFingerprint !== 'string' ||
    !HASH_RE.test(record.sourceFingerprint)
  ) throw new Error('learning_v2_release_provenance_blocked');
}
