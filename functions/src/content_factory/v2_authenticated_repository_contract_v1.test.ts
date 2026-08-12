import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1,
  V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1,
  V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1,
  V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_V1,
  V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1,
  encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  encodeV2AuthenticatedRepositoryReadBundleV1,
  parseV2AuthenticatedRepositoryOriginReceiptV1,
  parseV2AuthenticatedRepositoryReadBundleV1,
  v2AuthenticatedRepositoryBlobObjectPathV1,
  v2AuthenticatedRepositoryManifestObjectPathV1,
  v2AuthenticatedRepositoryObservationObjectPathV1,
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateObjectPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryBundleEntryInputV1,
  type V2AuthenticatedRepositoryOriginReceiptStructuralClaimInputV1,
  type V2AuthenticatedRepositoryReadEvidenceV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";

const encoder = new TextEncoder();
const bytes = (value: string): Uint8Array => encoder.encode(value);
const hash = (value: string): string => sha256Utf8(value);
const hashBytes = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

function languageObjectRaw(): string {
  return canonicalJsonV1({
    profileId: "english-core",
    schemaVersion: "test-language-profile.v1",
  });
}

function templateObjectRaw(id: string): string {
  return canonicalJsonV1({
    schemaVersion: "test-mode-template.v1",
    templateId: id,
  });
}

function languageRequirement(): V2AuthenticatedRepositoryRequirementV1 {
  return Object.freeze({
    dependencyType: "language_profile" as const,
    profileId: "english-core",
    version: 1,
    contentHash: hash(languageObjectRaw()),
  });
}

function templateRequirement(
  id: string,
): V2AuthenticatedRepositoryRequirementV1 {
  return Object.freeze({
    dependencyType: "published_template" as const,
    templateId: id,
    version: 1,
    contentHash: hash(templateObjectRaw(id)),
  });
}

function entry(
  requirement: V2AuthenticatedRepositoryRequirementV1,
  suffix: string,
  object = bytes(
    requirement.dependencyType === "language_profile"
      ? languageObjectRaw()
      : templateObjectRaw(requirement.templateId),
  ),
  evidenceOverrides: Partial<V2AuthenticatedRepositoryReadEvidenceV1> = {},
): V2AuthenticatedRepositoryBundleEntryInputV1 {
  const id =
    requirement.dependencyType === "language_profile"
      ? requirement.profileId
      : requirement.templateId;
  const updateTime = Object.freeze({ seconds: "1800000000", nanoseconds: 1 });
  const evidence: V2AuthenticatedRepositoryReadEvidenceV1 = {
    requirementKey: `${requirement.dependencyType}:${id}:v${requirement.version}`,
    versionDocumentPath:
      requirement.dependencyType === "language_profile"
        ? v2LanguageProfileVersionDocumentPathV1(id, requirement.version)
        : v2ModeTemplateVersionDocumentPathV1(id, requirement.version),
    lifecycleDocumentPath:
      requirement.dependencyType === "language_profile"
        ? v2LanguageProfileLifecycleDocumentPathV1(id, requirement.version)
        : v2ModeTemplateLifecycleDocumentPathV1(id, requirement.version),
    firestoreDocumentEncoding: "firestore_document_data_canonical_json_utf8.v1",
    recordBeforeUpdateTime: updateTime,
    recordAfterUpdateTime: updateTime,
    lifecycleBeforeUpdateTime: updateTime,
    lifecycleAfterUpdateTime: updateTime,
    beforeReadTime: { seconds: "1800000001", nanoseconds: 0 },
    afterReadTime: { seconds: "1800000002", nanoseconds: 0 },
    storageBucket: "phraseman-ea0b3.firebasestorage.app",
    objectPath:
      requirement.dependencyType === "language_profile"
        ? v2LanguageProfileObjectPathV1(
            id,
            requirement.version,
            requirement.contentHash,
          )
        : v2ModeTemplateObjectPathV1(
            id,
            requirement.version,
            requirement.contentHash,
          ),
    objectGeneration: "generation-1",
    objectEncoding: "firebase_storage_object_raw_canonical_json_utf8.v1",
    ...evidenceOverrides,
  };
  return {
    requirement,
    evidence,
    recordBefore: bytes(canonicalJsonV1({ record: suffix })),
    lifecycleBefore: bytes(canonicalJsonV1({ lifecycle: suffix })),
    object,
    recordAfter: bytes(canonicalJsonV1({ record: suffix })),
    lifecycleAfter: bytes(canonicalJsonV1({ lifecycle: suffix })),
  };
}

const minimalEntries = (): V2AuthenticatedRepositoryBundleEntryInputV1[] => [
  entry(languageRequirement(), "language"),
  entry(templateRequirement("template-a"), "template-a"),
];

function canonicalManifest(value: Record<string, unknown>): string {
  const body = { ...value };
  delete body.manifestFingerprint;
  return canonicalJsonV1({
    ...body,
    manifestFingerprint: hashCanonicalBody(body),
  });
}

function canonicalReceipt(value: Record<string, unknown>): string {
  const body = { ...value };
  delete body.receiptFingerprint;
  return canonicalJsonV1({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
}

const pin = (suffix: string, byteSize: number) => ({
  objectPath: `learning-v2/authenticated-repository/${suffix}`,
  contentHash: hash(suffix),
  objectGeneration: "generation-1",
  byteSize,
});

function originReceiptRaw(overrides: Record<string, unknown> = {}): string {
  const planFingerprint = hash("plan");
  const requestFingerprint = hash("request");
  const manifestFingerprint = hash("manifest");
  const manifestRawHash = hash("manifest-raw");
  const blobHash = hash("blob");
  const observationFingerprint = hash("observation");
  const observationRawHash = hash("observation-raw");
  const body = {
    schemaVersion: V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1,
    adapterProfile: {
      adapterId: "learning-v2-firebase-admin-repository-v1",
      adapterVersion: 1,
      namespaceFingerprint:
        V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1,
    },
    planFingerprint,
    courseContractFingerprint: hash("course"),
    repositoryScopeFingerprint: hash("plan-global-repository-scope"),
    resolverContractFingerprint: hash("resolver"),
    requestFingerprint,
    workspaceId: "workspace-1",
    authoringRevision: 3,
    targetLanguage: "en",
    requirementCount: 2,
    templateCount: 1,
    requirementAggregateFingerprint: hash("requirements"),
    headAggregateFingerprint: hash("heads"),
    bundleManifestFingerprint: manifestFingerprint,
    bundleManifestRawHash: manifestRawHash,
    bundleBlobHash: blobHash,
    bundleManifestByteSize: 500,
    bundleBlobByteSize: 2_000,
    bundleManifestPin: {
      ...pin("unused", 500),
      objectPath: v2AuthenticatedRepositoryManifestObjectPathV1(
        planFingerprint,
        requestFingerprint,
        manifestFingerprint,
      ),
      contentHash: manifestRawHash,
    },
    bundleBlobPin: {
      ...pin("unused", 2_000),
      objectPath: v2AuthenticatedRepositoryBlobObjectPathV1(
        planFingerprint,
        requestFingerprint,
        blobHash,
      ),
      contentHash: blobHash,
    },
    structuralObservationPin: {
      ...pin("unused", 1_000),
      objectPath: v2AuthenticatedRepositoryObservationObjectPathV1(
        planFingerprint,
        requestFingerprint,
        observationFingerprint,
      ),
      contentHash: observationRawHash,
    },
    structuralObservationFingerprint: observationFingerprint,
    structuralObservationRawHash: observationRawHash,
    repositoryOriginAuthenticity: "not_established_by_audit_parser",
    claimedRepositoryOriginAuthenticity:
      "server_admin_sdk_authenticated_readback",
    claimedRecordOriginEvidence:
      "firestore_admin_sdk_exact_paths_and_update_times",
    claimedObjectOriginEvidence: "storage_generation_matched_readback",
    claimedStorageExistenceEvidence: "exact_generation_readback",
    recordOriginAuthority: "none",
    objectOriginAuthority: "none",
    storageExistenceAuthority: "none",
    lifecycleAuthority: "none",
    candidateOriginAuthority: "none",
    contentValidationAuthority: "none",
    humanReviewAuthority: "none",
    specialistEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    listeningEvidenceAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
    trustBoundary: "audit_only_claim_requires_private_admin_adapter_brand",
    ...overrides,
  };
  return canonicalJsonV1({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
}

describe("Learning V2 authenticated repository D1-A pure contract", () => {
  it("pins the exact checked-in production namespace", () => {
    expect(V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_V1).toEqual({
      schemaVersion: "v2-firebase-repository-trust-root.v1",
      projectId: "phraseman-ea0b3",
      databaseId: "(default)",
      bucketName: "phraseman-ea0b3.firebasestorage.app",
      appName: "[DEFAULT]",
      firestore: expect.any(Object),
      storage: expect.any(Object),
      documentIdPolicies: expect.any(Object),
      objectPathPolicies: expect.any(Object),
    });
    expect(
      V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1,
    ).toBe(
      hashCanonicalBody(V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_V1),
    );
  });

  it("derives exact language and template document/object paths", () => {
    expect(v2LanguageProfileVersionDocumentPathV1("english-core", 2)).toBe(
      `content_language_profile_versions/${sha256Utf8("english-core")}__v2`,
    );
    expect(v2LanguageProfileLifecycleDocumentPathV1("english-core", 2)).toBe(
      `content_language_profile_lifecycle/${sha256Utf8("english-core")}__v2`,
    );
    expect(
      v2LanguageProfileObjectPathV1("english-core", 2, hash("profile")),
    ).toBe(
      `content-studio/language-profiles/${sha256Utf8("english-core")}/v2/${hash("profile")}.json`,
    );
    expect(v2ModeTemplateVersionDocumentPathV1("phrase-builder", 3)).toBe(
      "content_mode_template_versions/phrase-builder__v3",
    );
    expect(v2ModeTemplateLifecycleDocumentPathV1("phrase-builder", 3)).toBe(
      "content_mode_template_lifecycle/phrase-builder__v3",
    );
    expect(
      v2ModeTemplateObjectPathV1("phrase-builder", 3, hash("template")),
    ).toBe(
      `content-studio/mode-templates/${sha256Utf8("phrase-builder")}/v3/${hash("template")}.json`,
    );
    expect(() => v2LanguageProfileVersionDocumentPathV1("../bad", 1)).toThrow(
      "v2_authenticated_repository_profile_path_invalid",
    );
    expect(() =>
      v2ModeTemplateObjectPathV1("template", 0, hash("template")),
    ).toThrow("v2_authenticated_repository_template_path_invalid");
  });

  it("round-trips a deterministic bounded binary bundle", () => {
    const first = encodeV2AuthenticatedRepositoryReadBundleV1(minimalEntries());
    const second =
      encodeV2AuthenticatedRepositoryReadBundleV1(minimalEntries());
    expect(first.manifest.schemaVersion).toBe(
      V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1,
    );
    expect(first.manifestRaw).toBe(second.manifestRaw);
    expect([...first.blob]).toEqual([...second.blob]);
    const parsed = parseV2AuthenticatedRepositoryReadBundleV1(
      first.manifestRaw,
      first.blob,
    );
    expect(parsed.entries).toHaveLength(2);
    expect(new TextDecoder().decode(parsed.entries[1]!.object)).toBe(
      templateObjectRaw("template-a"),
    );
    expect(parsed.manifest.blobHash).toBe(first.manifest.blobHash);
    expect(parsed.manifest.requirements[0]!.evidenceFingerprint).toBe(
      hashCanonicalBody(parsed.manifest.requirements[0]!.evidence),
    );
  });

  it("rejects path substitution, ABA updateTime drift and incoherent read pairs", () => {
    const language = languageRequirement();
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        entry(language, "language", undefined, {
          versionDocumentPath: "content_language_profile_versions/wrong",
        }),
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_read_evidence_invalid");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        entry(language, "language", undefined, {
          recordAfterUpdateTime: {
            seconds: "1800000000",
            nanoseconds: 2,
          },
        }),
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_read_evidence_incoherent");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        entry(language, "language", undefined, {
          afterReadTime: { seconds: "1799999999", nanoseconds: 0 },
        }),
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_read_evidence_incoherent");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        {
          ...minimalEntries()[0]!,
          recordAfter: bytes(canonicalJsonV1({ record: "different" })),
        },
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_read_evidence_incoherent");
  });

  it("rejects one coordinate reused with a substituted content hash", () => {
    const first = templateRequirement("template-a");
    const substitutedRaw = canonicalJsonV1({
      schemaVersion: "test-mode-template.v1",
      substituted: true,
      templateId: "template-a",
    });
    const substituted = Object.freeze({
      ...first,
      contentHash: hash(substitutedRaw),
    });
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        entry(languageRequirement(), "language"),
        entry(first, "template-a"),
        entry(substituted, "template-a-substituted", bytes(substitutedRaw)),
      ]),
    ).toThrow("v2_authenticated_repository_requirement_hash_conflict");
  });

  it("enforces one language plus one to twenty-eight unique ordered templates", () => {
    const maximum = [
      entry(languageRequirement(), "language"),
      ...Array.from({ length: 28 }, (_, index) => {
        const id = `template-${String(index + 1).padStart(2, "0")}`;
        return entry(templateRequirement(id), id);
      }),
    ];
    expect(
      encodeV2AuthenticatedRepositoryReadBundleV1(maximum).manifest
        .templateCount,
    ).toBe(28);
    const tooMany = [
      ...maximum,
      entry(templateRequirement("template-29"), "template-29"),
    ];
    expect(() => encodeV2AuthenticatedRepositoryReadBundleV1(tooMany)).toThrow(
      "v2_authenticated_repository_requirement_count_invalid",
    );
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        minimalEntries()[1]!,
        minimalEntries()[0]!,
      ]),
    ).toThrow("v2_authenticated_repository_requirement_order_invalid");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        ...minimalEntries(),
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_requirement_order_invalid");
  });

  it("rejects every segment cap before allocating a bundle", () => {
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        entry(
          languageRequirement(),
          "language",
          new Uint8Array(V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1 + 1),
        ),
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_segment_size_invalid");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        minimalEntries()[0]!,
        entry(
          templateRequirement("template-a"),
          "template-a",
          new Uint8Array(V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1 + 1),
        ),
      ]),
    ).toThrow("v2_authenticated_repository_segment_size_invalid");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        {
          ...minimalEntries()[0]!,
          recordBefore: new Uint8Array(64 * 1024 + 1),
        },
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_segment_size_invalid");
  });

  it("rejects noncanonical JSON, invalid UTF-8 and object hash substitution", () => {
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        {
          ...minimalEntries()[0]!,
          recordBefore: bytes('{"record": "language"}'),
          recordAfter: bytes('{"record": "language"}'),
        },
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_segment_noncanonical");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        {
          ...minimalEntries()[0]!,
          object: new Uint8Array([0xff]),
        },
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_segment_utf8_invalid");
    expect(() =>
      encodeV2AuthenticatedRepositoryReadBundleV1([
        {
          ...minimalEntries()[0]!,
          object: bytes(canonicalJsonV1({ substituted: true })),
        },
        minimalEntries()[1]!,
      ]),
    ).toThrow("v2_authenticated_repository_object_hash_mismatch");
  });

  it("rejects manifest hash, offset overlap, blob hash and truncation", () => {
    const encoded =
      encodeV2AuthenticatedRepositoryReadBundleV1(minimalEntries());
    const coordinatedManifest = JSON.parse(encoded.manifestRaw) as Record<
      string,
      any
    >;
    const coordinatedBlob = new Uint8Array(encoded.blob);
    const originalLanguageRaw = languageObjectRaw();
    const substitutedLanguageRaw = originalLanguageRaw.replace(
      "english-core",
      "english-corf",
    );
    expect(substitutedLanguageRaw).toHaveLength(originalLanguageRaw.length);
    const objectDescriptor =
      coordinatedManifest.requirements[0].segments.object;
    coordinatedBlob.set(bytes(substitutedLanguageRaw), objectDescriptor.offset);
    objectDescriptor.contentHash = hash(substitutedLanguageRaw);
    coordinatedManifest.blobHash = hashBytes(coordinatedBlob);
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        canonicalManifest(coordinatedManifest),
        coordinatedBlob,
      ),
    ).toThrow("v2_authenticated_repository_object_hash_mismatch");

    const evidenceDrift = JSON.parse(encoded.manifestRaw) as Record<
      string,
      any
    >;
    evidenceDrift.requirements[0].evidence.versionDocumentPath =
      "content_language_profile_versions/wrong";
    evidenceDrift.requirements[0].evidenceFingerprint = hashCanonicalBody(
      evidenceDrift.requirements[0].evidence,
    );
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        canonicalManifest(evidenceDrift),
        encoded.blob,
      ),
    ).toThrow("v2_authenticated_repository_read_evidence_invalid");

    const hashDrift = JSON.parse(encoded.manifestRaw) as Record<string, any>;
    hashDrift.requirements[0].segments.object.contentHash = hash("wrong");
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        canonicalManifest(hashDrift),
        encoded.blob,
      ),
    ).toThrow("v2_authenticated_repository_blob_hash_invalid");

    const overlap = JSON.parse(encoded.manifestRaw) as Record<string, any>;
    overlap.requirements[0].segments.lifecycleBefore.offset =
      overlap.requirements[0].segments.recordBefore.offset;
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        canonicalManifest(overlap),
        encoded.blob,
      ),
    ).toThrow("v2_authenticated_repository_blob_layout_invalid");

    const changedBlob = new Uint8Array(encoded.blob);
    changedBlob[changedBlob.length - 1] ^= 1;
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        encoded.manifestRaw,
        changedBlob,
      ),
    ).toThrow("v2_authenticated_repository_manifest_invalid");
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        encoded.manifestRaw,
        encoded.blob.slice(0, -1),
      ),
    ).toThrow("v2_authenticated_repository_manifest_invalid");
    expect(encoded.blob.byteLength).toBeLessThan(
      V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
    );
  });

  it("rejects excessive manifest/receipt depth and requirement count before canonical work", () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let index = 0; index < 30; index += 1) deep = { nested: deep };
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        JSON.stringify(deep),
        new Uint8Array(12),
      ),
    ).toThrow("v2_authenticated_repository_manifest_complexity_invalid");
    expect(() =>
      parseV2AuthenticatedRepositoryOriginReceiptV1(JSON.stringify(deep)),
    ).toThrow("v2_authenticated_repository_origin_receipt_complexity_invalid");

    const encoded =
      encodeV2AuthenticatedRepositoryReadBundleV1(minimalEntries());
    const excessive = JSON.parse(encoded.manifestRaw) as Record<string, any>;
    excessive.requirements = Array.from(
      { length: 30 },
      () => excessive.requirements[0],
    );
    excessive.requirementCount = 30;
    expect(() =>
      parseV2AuthenticatedRepositoryReadBundleV1(
        canonicalManifest(excessive),
        encoded.blob,
      ),
    ).toThrow("v2_authenticated_repository_manifest_invalid");
  });

  it("audit-parses an exact authority-limited origin receipt without minting a brand", () => {
    const receipt =
      parseV2AuthenticatedRepositoryOriginReceiptV1(originReceiptRaw());
    expect(receipt).toMatchObject({
      repositoryOriginAuthenticity: "not_established_by_audit_parser",
      claimedRepositoryOriginAuthenticity:
        "server_admin_sdk_authenticated_readback",
      recordOriginAuthority: "none",
      objectOriginAuthority: "none",
      storageExistenceAuthority: "none",
      lifecycleAuthority: "none",
      candidateOriginAuthority: "none",
      contentValidationAuthority: "none",
      humanReviewAuthority: "none",
      executionAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
      trustBoundary: "audit_only_claim_requires_private_admin_adapter_brand",
    });
    expect(receipt.bundleManifestRawHash).not.toBe(
      receipt.bundleManifestFingerprint,
    );
    expect(receipt.structuralObservationRawHash).not.toBe(
      receipt.structuralObservationFingerprint,
    );
    expect(
      parseV2AuthenticatedRepositoryOriginReceiptV1(canonicalJsonV1(receipt)),
    ).toEqual(receipt);

    expect(() =>
      parseV2AuthenticatedRepositoryOriginReceiptV1(
        originReceiptRaw({ contentValidationAuthority: "validator_installed" }),
      ),
    ).toThrow("v2_authenticated_repository_origin_receipt_invalid");
    expect(() =>
      parseV2AuthenticatedRepositoryOriginReceiptV1(
        originReceiptRaw({ requirementCount: 3 }),
      ),
    ).toThrow("v2_authenticated_repository_origin_receipt_invalid");

    const pinDrift = JSON.parse(originReceiptRaw()) as Record<string, any>;
    pinDrift.structuralObservationPin.contentHash = hash("wrong-observation");
    expect(() =>
      parseV2AuthenticatedRepositoryOriginReceiptV1(canonicalReceipt(pinDrift)),
    ).toThrow("v2_authenticated_repository_origin_receipt_pin_invalid");

    const logicalPathDrift = JSON.parse(originReceiptRaw()) as Record<
      string,
      any
    >;
    logicalPathDrift.bundleManifestPin.objectPath =
      v2AuthenticatedRepositoryManifestObjectPathV1(
        logicalPathDrift.planFingerprint,
        logicalPathDrift.requestFingerprint,
        logicalPathDrift.bundleManifestRawHash,
      );
    expect(() =>
      parseV2AuthenticatedRepositoryOriginReceiptV1(
        canonicalReceipt(logicalPathDrift),
      ),
    ).toThrow("v2_authenticated_repository_origin_receipt_pin_invalid");
  });

  it("encodes a bounded audit-only claim while fixing every authority literal", () => {
    const decoded = JSON.parse(originReceiptRaw()) as Record<string, unknown>;
    const fixedKeys = new Set([
      "schemaVersion",
      "adapterProfile",
      "repositoryOriginAuthenticity",
      "claimedRepositoryOriginAuthenticity",
      "claimedRecordOriginEvidence",
      "claimedObjectOriginEvidence",
      "claimedStorageExistenceEvidence",
      "recordOriginAuthority",
      "objectOriginAuthority",
      "storageExistenceAuthority",
      "lifecycleAuthority",
      "candidateOriginAuthority",
      "contentValidationAuthority",
      "humanReviewAuthority",
      "specialistEvidenceAuthority",
      "deviceEvidenceAuthority",
      "listeningEvidenceAuthority",
      "executionAuthority",
      "publicationPolicy",
      "runtimeConsumer",
      "releaseEligible",
      "releaseAuthority",
      "trustBoundary",
      "receiptFingerprint",
    ]);
    const input = Object.fromEntries(
      Object.entries(decoded).filter(([key]) => !fixedKeys.has(key)),
    ) as unknown as V2AuthenticatedRepositoryOriginReceiptStructuralClaimInputV1;
    const encoded =
      encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1(input);
    expect(encoded.raw).toBe(originReceiptRaw());
    expect(encoded.claim).toMatchObject({
      repositoryOriginAuthenticity: "not_established_by_audit_parser",
      recordOriginAuthority: "none",
      objectOriginAuthority: "none",
      humanReviewAuthority: "none",
      executionAuthority: "none",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(() =>
      encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1({
        ...input,
        injectedAuthority: "authenticated",
      } as unknown as V2AuthenticatedRepositoryOriginReceiptStructuralClaimInputV1),
    ).toThrow("v2_authenticated_repository_origin_receipt_invalid");
  });
});
