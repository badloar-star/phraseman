const HEX_64 = /^[a-f0-9]{64}$/u;
const SESSION_RE = /^en\/l01\/s\d{2}$/u;
const SOURCE_INTERACTION_RE = /^en:lesson-01:session-\d{2}:i\d{2}(?::s\d{2})?$/u;
const RUNTIME_INTERACTION_RE = /^lesson-01:session:\d{2}:i\d{2}(?::s\d{2})?$/u;

type RuntimeAudioOmissionPolicyV1 = Readonly<{
  session: string;
  courseSessionId: string;
  runtimeCourseSessionId: string;
  candidateBundleSha256: string;
  factorySourceFingerprint: string;
  disabledInteractionIds: readonly string[];
  runtimeDisabledInteractionIds: readonly string[];
}>;

type RawRuntimeAudioOmissionManifestV1 = Readonly<{
  schemaVersion?: unknown;
  sessions?: unknown;
}>;

const rawManifest = require("../content/learning-v2-course/activation/en/runtime-audio-omissions.v1.json") as RawRuntimeAudioOmissionManifestV1;

function parsePolicy(value: unknown): RuntimeAudioOmissionPolicyV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("learning_v2_runtime_audio_omission_policy_invalid");
  }
  const row = value as Record<string, unknown>;
  const disabledInteractionIds = row.disabledInteractionIds;
  const runtimeDisabledInteractionIds = row.runtimeDisabledInteractionIds;
  if (
    typeof row.session !== "string" || !SESSION_RE.test(row.session) ||
    typeof row.courseSessionId !== "string" ||
    typeof row.runtimeCourseSessionId !== "string" ||
    typeof row.candidateBundleSha256 !== "string" || !HEX_64.test(row.candidateBundleSha256) ||
    typeof row.factorySourceFingerprint !== "string" || !HEX_64.test(row.factorySourceFingerprint) ||
    !Array.isArray(disabledInteractionIds) || disabledInteractionIds.length === 0 ||
    disabledInteractionIds.some((id) => typeof id !== "string" || !SOURCE_INTERACTION_RE.test(id)) ||
    new Set(disabledInteractionIds).size !== disabledInteractionIds.length ||
    !Array.isArray(runtimeDisabledInteractionIds) ||
    runtimeDisabledInteractionIds.length !== disabledInteractionIds.length ||
    runtimeDisabledInteractionIds.some((id) => typeof id !== "string" || !RUNTIME_INTERACTION_RE.test(id)) ||
    new Set(runtimeDisabledInteractionIds).size !== runtimeDisabledInteractionIds.length
  ) {
    throw new Error("learning_v2_runtime_audio_omission_policy_invalid");
  }
  return Object.freeze({
    session: row.session,
    courseSessionId: row.courseSessionId,
    runtimeCourseSessionId: row.runtimeCourseSessionId,
    candidateBundleSha256: row.candidateBundleSha256,
    factorySourceFingerprint: row.factorySourceFingerprint,
    disabledInteractionIds: Object.freeze([...disabledInteractionIds] as string[]),
    runtimeDisabledInteractionIds: Object.freeze([...runtimeDisabledInteractionIds] as string[]),
  });
}

if (
  rawManifest.schemaVersion !== "learning_v2_runtime_audio_omissions_v1" ||
  !Array.isArray(rawManifest.sessions)
) {
  throw new Error("learning_v2_runtime_audio_omission_manifest_invalid");
}

const POLICIES = Object.freeze(rawManifest.sessions.map(parsePolicy));
if (new Set(POLICIES.map((policy) => policy.session)).size !== POLICIES.length) {
  throw new Error("learning_v2_runtime_audio_omission_policy_duplicate");
}

export function resolveLearningV2FactoryRuntimeAudioOmissionsV1(input: Readonly<{
  session: string;
  courseSessionId: string;
  factorySourceFingerprint: string;
  missingInteractionIds: readonly string[];
}>): readonly string[] | null {
  if (input.missingInteractionIds.length === 0) return Object.freeze([]);
  const policy = POLICIES.find((candidate) => candidate.session === input.session);
  if (
    !policy ||
    policy.runtimeCourseSessionId !== input.courseSessionId ||
    policy.factorySourceFingerprint !== input.factorySourceFingerprint
  ) return null;
  const expected = [...policy.runtimeDisabledInteractionIds].sort();
  const actual = [...input.missingInteractionIds].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) return null;
  return policy.disabledInteractionIds;
}
