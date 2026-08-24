"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 = exports.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1 = exports.V2_FIREBASE_REPOSITORY_APP_NAME_V1 = exports.V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1 = exports.V2_FIREBASE_REPOSITORY_DATABASE_ID_V1 = exports.V2_FIREBASE_REPOSITORY_PROJECT_ID_V1 = exports.V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1 = exports.V2_FIREBASE_REPOSITORY_TRUST_ROOT_SCHEMA_V1 = void 0;
exports.validateV2FirebaseRepositoryTrustRootV1 = validateV2FirebaseRepositoryTrustRootV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
exports.V2_FIREBASE_REPOSITORY_TRUST_ROOT_SCHEMA_V1 = "v2-firebase-repository-trust-root.v1";
exports.V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1 = "v2-firebase-repository-structural-validation.v1";
exports.V2_FIREBASE_REPOSITORY_PROJECT_ID_V1 = "phraseman-ea0b3";
exports.V2_FIREBASE_REPOSITORY_DATABASE_ID_V1 = "(default)";
exports.V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1 = "phraseman-ea0b3.firebasestorage.app";
exports.V2_FIREBASE_REPOSITORY_APP_NAME_V1 = "[DEFAULT]";
exports.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1 = Object.freeze({
    schemaVersion: exports.V2_FIREBASE_REPOSITORY_TRUST_ROOT_SCHEMA_V1,
    projectId: exports.V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
    databaseId: exports.V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
    bucketName: exports.V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
    appName: exports.V2_FIREBASE_REPOSITORY_APP_NAME_V1,
    firestore: Object.freeze({
        languageProfileVersions: "content_language_profile_versions",
        languageProfileLifecycle: "content_language_profile_lifecycle",
        modeTemplateVersions: "content_mode_template_versions",
        modeTemplateLifecycle: "content_mode_template_lifecycle",
        repositoryAuthState: "content_v2_repository_auth",
    }),
    storage: Object.freeze({
        languageProfilePrefix: "content-studio/language-profiles",
        modeTemplatePrefix: "content-studio/mode-templates",
        repositoryPrivateBundlePrefix: "learning-v2/repository-auth/private/bundles",
        repositoryPrivateManifestPrefix: "learning-v2/repository-auth/private/manifests",
        repositoryPrivateObservationPrefix: "learning-v2/repository-auth/private/observations",
        repositoryOriginReceiptPrefix: "learning-v2/repository-auth",
    }),
    documentIdPolicies: Object.freeze({
        languageProfileVersion: "sha256_profile_id__v_positive_safe_integer",
        languageProfileLifecycle: "sha256_profile_id__v_positive_safe_integer",
        modeTemplateVersion: "template_id__v_positive_safe_integer",
        modeTemplateLifecycle: "template_id__v_positive_safe_integer",
        repositoryAuthState: "plan_fingerprint_sha256_hex",
    }),
    objectPathPolicies: Object.freeze({
        languageProfile: "content-studio/language-profiles/{sha256(profileId)}/v{version}/{contentHash}.json",
        modeTemplate: "content-studio/mode-templates/{sha256(templateId)}/v{version}/{contentHash}.json",
        repositoryPrivateBundle: "learning-v2/repository-auth/private/bundles/{planFingerprint}/{requestFingerprint}/{bundleHash}.bin",
        repositoryPrivateManifest: "learning-v2/repository-auth/private/manifests/{planFingerprint}/{requestFingerprint}/{manifestFingerprint}.json",
        repositoryPrivateObservation: "learning-v2/repository-auth/private/observations/{planFingerprint}/{requestFingerprint}/{structuralObservationFingerprint}.json",
        repositoryOriginReceipt: "learning-v2/repository-auth/{planFingerprint}/{receiptFingerprint}.json",
    }),
});
exports.V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 = (0, decision_registry_1.hashCanonicalBody)(exports.V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1);
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
function isPlainRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function hasExactKeys(value, expected) {
    const keys = Object.keys(value).sort();
    const orderedExpected = [...expected].sort();
    return (keys.length === orderedExpected.length &&
        keys.every((key, index) => key === orderedExpected[index]));
}
function invalid() {
    throw new Error("v2_firebase_repository_trust_root_invalid");
}
/**
 * Compares a shallow runtime observation with code-owned coordinates only.
 * This value is intentionally forgeable and carries no authenticated Firebase,
 * repository-origin, execution, publication, runtime, or release authority.
 * A later private Firebase Admin factory must establish and brand that evidence.
 */
function validateV2FirebaseRepositoryTrustRootV1(input) {
    if (!isPlainRecord(input) || !hasExactKeys(input, RUNTIME_KEYS))
        invalid();
    const emulatorEnvironment = input.emulatorEnvironment;
    if (!isPlainRecord(emulatorEnvironment) ||
        !hasExactKeys(emulatorEnvironment, EMULATOR_KEYS) ||
        EMULATOR_KEYS.some((key) => emulatorEnvironment[key] !== null)) {
        invalid();
    }
    if (input.projectId !== exports.V2_FIREBASE_REPOSITORY_PROJECT_ID_V1 ||
        (typeof input.projectId === "string" &&
            input.projectId.startsWith("demo-")) ||
        input.databaseId !== exports.V2_FIREBASE_REPOSITORY_DATABASE_ID_V1 ||
        input.bucketName !== exports.V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1 ||
        input.appName !== exports.V2_FIREBASE_REPOSITORY_APP_NAME_V1) {
        invalid();
    }
    const body = Object.freeze({
        schemaVersion: exports.V2_FIREBASE_REPOSITORY_STRUCTURAL_VALIDATION_SCHEMA_V1,
        projectId: exports.V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
        databaseId: exports.V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
        bucketName: exports.V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
        appName: exports.V2_FIREBASE_REPOSITORY_APP_NAME_V1,
        namespaceFingerprint: exports.V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
        runtimeObservationOrigin: "caller_supplied_structural_observation",
        emulatorEnvironmentClaim: "none_declared_in_supplied_shape",
        structuralValidationAuthority: "code_owned_configuration_match_only",
        firebaseAdminConnectionAuthority: "none",
        repositoryOriginAuthority: "none",
        principalIdentityAuthority: "none",
        executionAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: false,
        releaseAuthority: false,
    });
    return Object.freeze({
        ...body,
        validationFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
}
//# sourceMappingURL=v2_firebase_repository_trust_root_v1.js.map