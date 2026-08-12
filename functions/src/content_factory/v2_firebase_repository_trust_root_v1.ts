import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export const V2_FIREBASE_REPOSITORY_TRUST_ROOT_SCHEMA_V1 =
  "v2-firebase-repository-trust-root.v1" as const;
export const V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1 =
  "v2-firebase-repository-structural-validation.v1" as const;

export const V2_FIREBASE_REPOSITORY_PROJECT_ID_V1 = "phraseman-ea0b3" as const;
export const V2_FIREBASE_REPOSITORY_DATABASE_ID_V1 = "(default)" as const;
export const V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1 =
  "phraseman-ea0b3.firebasestorage.app" as const;
export const V2_FIREBASE_REPOSITORY_APP_NAME_V1 = "[DEFAULT]" as const;

export const V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1 = Object.freeze({
  schemaVersion: V2_FIREBASE_REPOSITORY_TRUST_ROOT_SCHEMA_V1,
  projectId: V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
  databaseId: V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
  bucketName: V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
  appName: V2_FIREBASE_REPOSITORY_APP_NAME_V1,
  firestore: Object.freeze({
    languageProfileVersions: "content_language_profile_versions" as const,
    languageProfileLifecycle: "content_language_profile_lifecycle" as const,
    modeTemplateVersions: "content_mode_template_versions" as const,
    modeTemplateLifecycle: "content_mode_template_lifecycle" as const,
    repositoryAuthState: "content_v2_repository_auth" as const,
  }),
  storage: Object.freeze({
    languageProfilePrefix: "content-studio/language-profiles" as const,
    modeTemplatePrefix: "content-studio/mode-templates" as const,
    repositoryPrivateBundlePrefix:
      "learning-v2/repository-auth/private/bundles" as const,
    repositoryPrivateManifestPrefix:
      "learning-v2/repository-auth/private/manifests" as const,
    repositoryPrivateObservationPrefix:
      "learning-v2/repository-auth/private/observations" as const,
    repositoryOriginReceiptPrefix: "learning-v2/repository-auth" as const,
  }),
  documentIdPolicies: Object.freeze({
    languageProfileVersion:
      "sha256_profile_id__v_positive_safe_integer" as const,
    languageProfileLifecycle:
      "sha256_profile_id__v_positive_safe_integer" as const,
    modeTemplateVersion: "template_id__v_positive_safe_integer" as const,
    modeTemplateLifecycle: "template_id__v_positive_safe_integer" as const,
    repositoryAuthState: "plan_fingerprint_sha256_hex" as const,
  }),
  objectPathPolicies: Object.freeze({
    languageProfile:
      "content-studio/language-profiles/{sha256(profileId)}/v{version}/{contentHash}.json" as const,
    modeTemplate:
      "content-studio/mode-templates/{sha256(templateId)}/v{version}/{contentHash}.json" as const,
    repositoryPrivateBundle:
      "learning-v2/repository-auth/private/bundles/{planFingerprint}/{requestFingerprint}/{bundleHash}.bin" as const,
    repositoryPrivateManifest:
      "learning-v2/repository-auth/private/manifests/{planFingerprint}/{requestFingerprint}/{manifestFingerprint}.json" as const,
    repositoryPrivateObservation:
      "learning-v2/repository-auth/private/observations/{planFingerprint}/{requestFingerprint}/{structuralObservationFingerprint}.json" as const,
    repositoryOriginReceipt:
      "learning-v2/repository-auth/{planFingerprint}/{receiptFingerprint}.json" as const,
  }),
});

export const V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1);

const RUNTIME_KEYS = Object.freeze([
  "projectId",
  "databaseId",
  "bucketName",
  "appName",
  "emulatorEnvironment",
]);
const EMULATOR_KEYS = Object.freeze([
  "functionsEmulator",
  "firestoreEmulatorHost",
  "storageEmulatorHost",
  "firebaseStorageEmulatorHost",
  "firebaseEmulatorHub",
]);

type JsonRecord = Record<string, unknown>;

export interface V2FirebaseRepositoryRuntimeObservationV1 {
  readonly projectId: string;
  readonly databaseId: string;
  readonly bucketName: string;
  readonly appName: string;
  readonly emulatorEnvironment: Readonly<{
    functionsEmulator: string | null;
    firestoreEmulatorHost: string | null;
    storageEmulatorHost: string | null;
    firebaseStorageEmulatorHost: string | null;
    firebaseEmulatorHub: string | null;
  }>;
}

export interface V2FirebaseRepositoryStructurallyValidatedTrustRootV1 {
  readonly schemaVersion: typeof V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1;
  readonly projectId: typeof V2_FIREBASE_REPOSITORY_PROJECT_ID_V1;
  readonly databaseId: typeof V2_FIREBASE_REPOSITORY_DATABASE_ID_V1;
  readonly bucketName: typeof V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1;
  readonly appName: typeof V2_FIREBASE_REPOSITORY_APP_NAME_V1;
  readonly namespaceFingerprint: typeof V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1;
  readonly runtimeObservationOrigin: "caller_supplied_structural_observation";
  readonly emulatorEnvironmentClaim: "none_declared_in_supplied_shape";
  readonly structuralValidationAuthority: "code_owned_configuration_match_only";
  readonly firebaseAdminConnectionAuthority: "none";
  readonly repositoryOriginAuthority: "none";
  readonly principalIdentityAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly validationFingerprint: string;
}

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const orderedExpected = [...expected].sort();
  return (
    keys.length === orderedExpected.length &&
    keys.every((key, index) => key === orderedExpected[index])
  );
}

function invalid(): never {
  throw new Error("v2_firebase_repository_trust_root_invalid");
}

/**
 * Compares a shallow runtime observation with code-owned coordinates only.
 * This value is intentionally forgeable and carries no authenticated Firebase,
 * repository-origin, execution, publication, runtime, or release authority.
 * A later private Firebase Admin factory must establish and brand that evidence.
 */
export function validateV2FirebaseRepositoryTrustRootV1(
  input: unknown,
): V2FirebaseRepositoryStructurallyValidatedTrustRootV1 {
  if (!isPlainRecord(input) || !hasExactKeys(input, RUNTIME_KEYS)) invalid();
  const emulatorEnvironment = input.emulatorEnvironment;
  if (
    !isPlainRecord(emulatorEnvironment) ||
    !hasExactKeys(emulatorEnvironment, EMULATOR_KEYS) ||
    EMULATOR_KEYS.some((key) => emulatorEnvironment[key] !== null)
  ) {
    invalid();
  }
  if (
    input.projectId !== V2_FIREBASE_REPOSITORY_PROJECT_ID_V1 ||
    (typeof input.projectId === "string" &&
      input.projectId.startsWith("demo-")) ||
    input.databaseId !== V2_FIREBASE_REPOSITORY_DATABASE_ID_V1 ||
    input.bucketName !== V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1 ||
    input.appName !== V2_FIREBASE_REPOSITORY_APP_NAME_V1
  ) {
    invalid();
  }

  const body = Object.freeze({
    schemaVersion: V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1,
    projectId: V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
    databaseId: V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
    bucketName: V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
    appName: V2_FIREBASE_REPOSITORY_APP_NAME_V1,
    namespaceFingerprint: V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    runtimeObservationOrigin: "caller_supplied_structural_observation" as const,
    emulatorEnvironmentClaim: "none_declared_in_supplied_shape" as const,
    structuralValidationAuthority:
      "code_owned_configuration_match_only" as const,
    firebaseAdminConnectionAuthority: "none" as const,
    repositoryOriginAuthority: "none" as const,
    principalIdentityAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    validationFingerprint: hashCanonicalBody(body),
  });
}
