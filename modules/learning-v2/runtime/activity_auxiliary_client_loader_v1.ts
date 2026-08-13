import {
  parseLearningV2ActivityAuxiliaryClientDescriptorV1,
  type LearningV2ActivityAuxiliaryClientDescriptorV1,
} from "./activity_auxiliary_client_descriptor_v1";

export interface LearningV2ActivityAuxiliaryClientCacheV1 {
  readonly get: (key: string) => Promise<string | null>;
  readonly set: (key: string, canonicalRaw: string) => Promise<void>;
  readonly remove: (key: string) => Promise<void>;
}

export interface LearningV2ActivityAuxiliaryClientExpectedV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly auxiliaryIndexFingerprint: string;
}

export type LearningV2ActivityAuxiliaryClientLoadResultV1 = Readonly<{
  source: "network" | "lkg";
  descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1;
  cacheAuthority: "availability_only_not_release_or_origin_authority";
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;

function fail(): never {
  throw new Error("learning_v2_activity_auxiliary_client_load_invalid");
}

function exactExpected(
  value: LearningV2ActivityAuxiliaryClientExpectedV1,
): LearningV2ActivityAuxiliaryClientExpectedV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "activeManifestHash|activityPackageFingerprint|auxiliaryIndexFingerprint|environment|episodeId|learnerSourceLocale|seasonId|sessionId|sessionOrdinal|studyTarget" ||
    !["lab", "staging", "production"].includes(value.environment) ||
    !CODE_RE.test(value.studyTarget) ||
    !CODE_RE.test(value.learnerSourceLocale) ||
    !ID_RE.test(value.seasonId) ||
    !ID_RE.test(value.episodeId) ||
    !ID_RE.test(value.sessionId) ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    value.sessionOrdinal < 1 ||
    value.sessionOrdinal > 12 ||
    !HASH_RE.test(value.activeManifestHash) ||
    !HASH_RE.test(value.activityPackageFingerprint) ||
    !HASH_RE.test(value.auxiliaryIndexFingerprint)
  )
    fail();
  return Object.freeze({ ...value });
}

function exactDescriptor(
  raw: string,
  expected: LearningV2ActivityAuxiliaryClientExpectedV1,
): LearningV2ActivityAuxiliaryClientDescriptorV1 {
  let descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1;
  try {
    descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(raw);
  } catch {
    fail();
  }
  if (
    descriptor.environment !== expected.environment ||
    descriptor.studyTarget !== expected.studyTarget ||
    descriptor.learnerSourceLocale !== expected.learnerSourceLocale ||
    descriptor.seasonId !== expected.seasonId ||
    descriptor.activeManifestHash !== expected.activeManifestHash ||
    descriptor.episodeId !== expected.episodeId ||
    descriptor.sessionId !== expected.sessionId ||
    descriptor.sessionOrdinal !== expected.sessionOrdinal ||
    descriptor.activityPackageFingerprint !==
      expected.activityPackageFingerprint ||
    descriptor.auxiliaryIndexFingerprint !== expected.auxiliaryIndexFingerprint
  )
    fail();
  return descriptor;
}

export function learningV2ActivityAuxiliaryClientCacheKeyV1(
  expectedInput: LearningV2ActivityAuxiliaryClientExpectedV1,
): string {
  const expected = exactExpected(expectedInput);
  return `learning-v2:activity-auxiliary:${expected.environment}:${expected.studyTarget}:${expected.learnerSourceLocale}:${expected.seasonId}:${expected.activeManifestHash}:${expected.episodeId}:${expected.sessionOrdinal}:${expected.sessionId}:${expected.activityPackageFingerprint}:${expected.auxiliaryIndexFingerprint}`;
}

export async function loadLearningV2ActivityAuxiliaryClientWithLkgV1(
  input: Readonly<{
    expected: LearningV2ActivityAuxiliaryClientExpectedV1;
    cache: LearningV2ActivityAuxiliaryClientCacheV1;
    fetchCanonicalRaw: () => Promise<string>;
  }>,
): Promise<LearningV2ActivityAuxiliaryClientLoadResultV1> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !==
      "cache|expected|fetchCanonicalRaw" ||
    typeof input.fetchCanonicalRaw !== "function" ||
    typeof input.cache !== "object" ||
    input.cache === null ||
    typeof input.cache.get !== "function" ||
    typeof input.cache.set !== "function" ||
    typeof input.cache.remove !== "function"
  )
    fail();
  const expected = exactExpected(input.expected);
  const key = learningV2ActivityAuxiliaryClientCacheKeyV1(expected);
  let raw: string;
  try {
    raw = await input.fetchCanonicalRaw();
  } catch (networkError) {
    const cached = await input.cache.get(key).catch(() => null);
    if (cached === null) throw networkError;
    try {
      return Object.freeze({
        source: "lkg" as const,
        descriptor: exactDescriptor(cached, expected),
        cacheAuthority:
          "availability_only_not_release_or_origin_authority" as const,
      });
    } catch {
      await input.cache.remove(key);
      throw networkError;
    }
  }
  // Only a transport failure may fall back to LKG. A response that arrived but
  // fails canonical or release identity validation is a protocol error and
  // must never be hidden by an older cached descriptor.
  const descriptor = exactDescriptor(raw, expected);
  await input.cache.set(key, raw).catch(() => undefined);
  return Object.freeze({
    source: "network" as const,
    descriptor,
    cacheAuthority:
      "availability_only_not_release_or_origin_authority" as const,
  });
}
