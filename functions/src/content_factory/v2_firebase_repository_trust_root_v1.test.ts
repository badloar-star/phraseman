import { readFileSync } from "node:fs";
import {
  V2_FIREBASE_REPOSITORY_APP_NAME_V1,
  V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
  V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
  V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
  validateV2FirebaseRepositoryTrustRootV1,
} from "./v2_firebase_repository_trust_root_v1";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const exactObservation = () => ({
  projectId: V2_FIREBASE_REPOSITORY_PROJECT_ID_V1,
  databaseId: V2_FIREBASE_REPOSITORY_DATABASE_ID_V1,
  bucketName: V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1,
  appName: V2_FIREBASE_REPOSITORY_APP_NAME_V1,
  emulatorEnvironment: {
    functionsEmulator: null,
    firestoreEmulatorHost: null,
    storageEmulatorHost: null,
    firebaseStorageEmulatorHost: null,
    firebaseEmulatorHub: null,
  },
});

describe("V2 Firebase repository structural trust root", () => {
  it("exports one exact frozen namespace body and deterministic fingerprint", () => {
    expect(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1).toEqual({
      schemaVersion: "v2-firebase-repository-trust-root.v1",
      projectId: "phraseman-ea0b3",
      databaseId: "(default)",
      bucketName: "phraseman-ea0b3.firebasestorage.app",
      appName: "[DEFAULT]",
      firestore: {
        languageProfileVersions: "content_language_profile_versions",
        languageProfileLifecycle: "content_language_profile_lifecycle",
        modeTemplateVersions: "content_mode_template_versions",
        modeTemplateLifecycle: "content_mode_template_lifecycle",
        repositoryAuthState: "content_v2_repository_auth",
      },
      storage: {
        languageProfilePrefix: "content-studio/language-profiles",
        modeTemplatePrefix: "content-studio/mode-templates",
        repositoryPrivateBundlePrefix:
          "learning-v2/repository-auth/private/bundles",
        repositoryPrivateManifestPrefix:
          "learning-v2/repository-auth/private/manifests",
        repositoryPrivateObservationPrefix:
          "learning-v2/repository-auth/private/observations",
        repositoryOriginReceiptPrefix: "learning-v2/repository-auth",
      },
      documentIdPolicies: {
        languageProfileVersion: "sha256_profile_id__v_positive_safe_integer",
        languageProfileLifecycle: "sha256_profile_id__v_positive_safe_integer",
        modeTemplateVersion: "template_id__v_positive_safe_integer",
        modeTemplateLifecycle: "template_id__v_positive_safe_integer",
        repositoryAuthState: "plan_fingerprint_sha256_hex",
      },
      objectPathPolicies: {
        languageProfile:
          "content-studio/language-profiles/{sha256(profileId)}/v{version}/{contentHash}.json",
        modeTemplate:
          "content-studio/mode-templates/{sha256(templateId)}/v{version}/{contentHash}.json",
        repositoryPrivateBundle:
          "learning-v2/repository-auth/private/bundles/{planFingerprint}/{requestFingerprint}/{bundleHash}.bin",
        repositoryPrivateManifest:
          "learning-v2/repository-auth/private/manifests/{planFingerprint}/{requestFingerprint}/{manifestFingerprint}.json",
        repositoryPrivateObservation:
          "learning-v2/repository-auth/private/observations/{planFingerprint}/{requestFingerprint}/{structuralObservationFingerprint}.json",
        repositoryOriginReceipt:
          "learning-v2/repository-auth/{planFingerprint}/{receiptFingerprint}.json",
      },
    });
    expect(Object.isFrozen(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1)).toBe(
      true,
    );
    expect(
      Object.isFrozen(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore),
    ).toBe(true);
    expect(
      Object.isFrozen(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage),
    ).toBe(true);
    expect(
      Object.isFrozen(
        V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.documentIdPolicies,
      ),
    ).toBe(true);
    expect(
      Object.isFrozen(
        V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.objectPathPolicies,
      ),
    ).toBe(true);
    expect(V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1).toBe(
      hashCanonicalBody(V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1),
    );
  });

  it("returns only a frozen structural match with every authority disabled", () => {
    const first = validateV2FirebaseRepositoryTrustRootV1(exactObservation());
    const second = validateV2FirebaseRepositoryTrustRootV1(exactObservation());
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "v2-firebase-repository-structural-validation.v1",
      projectId: "phraseman-ea0b3",
      databaseId: "(default)",
      bucketName: "phraseman-ea0b3.firebasestorage.app",
      appName: "[DEFAULT]",
      namespaceFingerprint: V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
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
    expect(Object.isFrozen(first)).toBe(true);
  });

  it.each([
    "projectId",
    "databaseId",
    "bucketName",
    "appName",
    "emulatorEnvironment",
  ] as const)("rejects a missing %s field", (field) => {
    const input = exactObservation() as Record<string, unknown>;
    delete input[field];
    expect(() => validateV2FirebaseRepositoryTrustRootV1(input)).toThrow(
      "v2_firebase_repository_trust_root_invalid",
    );
  });

  it.each([
    ["projectId", "demo-phraseman"],
    ["projectId", "phraseman-other"],
    ["projectId", ""],
    ["databaseId", "named-database"],
    ["databaseId", ""],
    ["bucketName", "phraseman-ea0b3.appspot.com"],
    ["bucketName", "other.firebasestorage.app"],
    ["appName", "secondary"],
    ["appName", ""],
  ])("rejects hostile trust-root coordinate %s=%s", (field, value) => {
    expect(() =>
      validateV2FirebaseRepositoryTrustRootV1({
        ...exactObservation(),
        [field]: value,
      }),
    ).toThrow("v2_firebase_repository_trust_root_invalid");
  });

  it.each([
    "functionsEmulator",
    "firestoreEmulatorHost",
    "storageEmulatorHost",
    "firebaseStorageEmulatorHost",
    "firebaseEmulatorHub",
  ] as const)("rejects any declared %s value", (field) => {
    for (const value of ["true", "127.0.0.1:8080", ""]) {
      expect(() =>
        validateV2FirebaseRepositoryTrustRootV1({
          ...exactObservation(),
          emulatorEnvironment: {
            ...exactObservation().emulatorEnvironment,
            [field]: value,
          },
        }),
      ).toThrow("v2_firebase_repository_trust_root_invalid");
    }
  });

  it("rejects unknown, missing and malformed emulator fields", () => {
    const missing = exactObservation();
    const environment = missing.emulatorEnvironment as Record<string, unknown>;
    delete environment.firebaseEmulatorHub;
    expect(() => validateV2FirebaseRepositoryTrustRootV1(missing)).toThrow(
      "v2_firebase_repository_trust_root_invalid",
    );
    expect(() =>
      validateV2FirebaseRepositoryTrustRootV1({
        ...exactObservation(),
        emulatorEnvironment: {
          ...exactObservation().emulatorEnvironment,
          unexpected: null,
        },
      }),
    ).toThrow("v2_firebase_repository_trust_root_invalid");
    expect(() =>
      validateV2FirebaseRepositoryTrustRootV1({
        ...exactObservation(),
        emulatorEnvironment: [],
      }),
    ).toThrow("v2_firebase_repository_trust_root_invalid");
  });

  it("rejects unknown top-level fields, arrays, primitives and class instances", () => {
    expect(() =>
      validateV2FirebaseRepositoryTrustRootV1({
        ...exactObservation(),
        reader: {},
      }),
    ).toThrow("v2_firebase_repository_trust_root_invalid");
    for (const value of [null, [], "phraseman-ea0b3", 1, true]) {
      expect(() => validateV2FirebaseRepositoryTrustRootV1(value)).toThrow(
        "v2_firebase_repository_trust_root_invalid",
      );
    }
    class ForgedObservation {
      projectId = V2_FIREBASE_REPOSITORY_PROJECT_ID_V1;
      databaseId = V2_FIREBASE_REPOSITORY_DATABASE_ID_V1;
      bucketName = V2_FIREBASE_REPOSITORY_BUCKET_NAME_V1;
      appName = V2_FIREBASE_REPOSITORY_APP_NAME_V1;
      emulatorEnvironment = exactObservation().emulatorEnvironment;
    }
    expect(() =>
      validateV2FirebaseRepositoryTrustRootV1(new ForgedObservation()),
    ).toThrow("v2_firebase_repository_trust_root_invalid");
  });

  it("has no Firebase, reader, callable, queue, or live consumer wiring", () => {
    const source = readFileSync(
      require.resolve("./v2_firebase_repository_trust_root_v1"),
      "utf8",
    );
    expect(source).not.toMatch(
      /firebase-admin|firebase-functions|onCall|onRequest/,
    );
    expect(source).not.toMatch(/readRecord|readLifecycle|readObject|reader/);
    expect(source).not.toMatch(/queue|worker|index\.ts/);
    expect(source.match(/^import .* from /gm)).toHaveLength(1);
    expect(source).toContain(
      "../../../modules/learning-v2/policies/decision_registry",
    );
  });
});
