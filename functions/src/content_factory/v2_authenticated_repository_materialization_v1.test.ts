import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateObjectPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryBundleEntryInputV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  assembleV2AuthenticatedRepositorySnapshotRowsV1,
  deriveV2AuthenticatedRepositoryMaterializationIdentityV1,
  deriveV2AuthenticatedRepositoryObjectReadRequestsV1,
  isV2AuthenticatedRepositoryMaterializationIdentityV1,
  materializeV2AuthenticatedRepositorySnapshotV1,
  verifyV2AuthenticatedRepositoryColdReplayHeadsV1,
} from "./v2_authenticated_repository_materialization_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import { isV2RepositoryCapabilityObservationReceiptV1 } from "./v2_repository_capability_observation_v1";
import type {
  V2FirebaseAdminRepositoryHeadSnapshotV1,
  V2FirebaseAdminRepositoryObjectReadV1,
} from "./v2_firebase_admin_repository_io_v1";

const fixture = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      "../../../tests/fixtures/learning-v2/episode-01.valid.json",
    ),
    "utf8",
  ),
) as { dependencies: { templates: { body: ModeTemplateArtifactBody }[] } };
const templateBody = fixture.dependencies.templates[0]!.body;
const languageBody = Object.freeze({
  schemaVersion: "v2-language-profile-body.v1" as const,
  profileId: "english-core",
  version: 1,
  targetLanguage: "en",
  script: Object.freeze({
    system: "latin" as const,
    direction: "ltr" as const,
    tokenization: "space_delimited" as const,
    joiningBehavior: "none" as const,
  }),
  grammar: Object.freeze({
    dominantWordOrders: Object.freeze(["SVO"]),
    morphology: "mixed" as const,
    grammaticalFeatures: Object.freeze(["tense"]),
    registerFeatures: Object.freeze(["neutral"]),
  }),
  speech: Object.freeze({
    lexicalTone: false,
    stressSystem: "lexical" as const,
    ttsLocales: Object.freeze(["en-US"]),
    sttLocales: Object.freeze(["en-US"]),
  }),
  scriptCurricula: Object.freeze([]),
  supportedActivityFamilies: Object.freeze([templateBody.family]),
});
const encoder = new TextEncoder();
const bytes = (value: unknown): Uint8Array =>
  encoder.encode(canonicalJsonV1(value));
const fingerprint = (value: string): string => sha256Utf8(value);
const bytesFingerprint = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

function plan(): V2CanonicalSeasonPlanV2 {
  const languageHash = hashCanonicalBody(languageBody);
  const templateHash = hashCanonicalBody(templateBody);
  return buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(
      canonicalJsonV1({
        schemaVersion: "v2-canonical-plan-request.v2",
        workspaceId: "workspace-01",
        jobId: "job-01",
        authoringRevision: 1,
        seasonId: "season-01",
        scope: "vertical_slice",
        episodeIds: ["episode-01"],
        recipes: [
          { episodeId: "episode-01", dialogue: true, speakingMission: true },
        ],
        languageProfileRef: {
          profileId: languageBody.profileId,
          targetLanguage: "en",
          version: 1,
          contentHash: languageHash,
        },
        speechProfileRef: {
          profileId: "english-speech",
          targetLanguage: "en",
          speechLocale: "en-US",
          version: 1,
          contentHash: fingerprint("speech"),
        },
        voiceGenerationProfileRef: {
          profileId: "voice-generation",
          version: 1,
          contentHash: fingerprint("voice"),
        },
        decisionRegistryRef: {
          decisionId: "HYP-V2-007",
          version: 1,
          contentHash: fingerprint("decision"),
        },
        templateBindings: [
          {
            episodeId: "episode-01",
            templateRefs: [
              {
                templateId: templateBody.templateId,
                version: templateBody.version,
                contentHash: templateHash,
              },
            ],
          },
        ],
      }),
    ),
  );
}

function relevantRequirements(
  value: V2CanonicalSeasonPlanV2,
): V2AuthenticatedRepositoryRequirementV1[] {
  const requirements: V2AuthenticatedRepositoryRequirementV1[] = [];
  for (const entry of value.externalRequirementCatalog) {
    const requirement = entry.requirement;
    if (requirement.dependencyType === "language_profile")
      requirements.push({ ...requirement });
    if (requirement.dependencyType === "published_template")
      requirements.push({ ...requirement });
  }
  return requirements;
}

function row(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): V2AuthenticatedRepositoryBundleEntryInputV1 {
  const body =
    requirement.dependencyType === "language_profile"
      ? languageBody
      : templateBody;
  const object = bytes(body);
  const idKey =
    requirement.dependencyType === "language_profile"
      ? "profileId"
      : "templateId";
  const id =
    requirement.dependencyType === "language_profile"
      ? requirement.profileId
      : requirement.templateId;
  const objectPath =
    requirement.dependencyType === "language_profile"
      ? v2LanguageProfileObjectPathV1(
          requirement.profileId,
          requirement.version,
          requirement.contentHash,
        )
      : v2ModeTemplateObjectPathV1(
          requirement.templateId,
          requirement.version,
          requirement.contentHash,
        );
  const record = bytes({
    schemaVersion:
      requirement.dependencyType === "language_profile"
        ? "v2-language-profile-record.v1"
        : "v2-mode-template-record.v1",
    [idKey]: id,
    version: requirement.version,
    contentHash: requirement.contentHash,
    object: {
      objectPath,
      contentHash: requirement.contentHash,
      objectGeneration: "1",
      byteSize: object.byteLength,
    },
    provenance: {
      createdAt: "2026-08-12T00:00:00.000Z",
      createdBy: "test-owner",
    },
    createdAt: "2026-08-12T00:00:00.000Z",
  });
  const lifecycle = bytes({
    schemaVersion:
      requirement.dependencyType === "language_profile"
        ? "v2-language-profile-lifecycle.v1"
        : "v2-mode-template-lifecycle.v1",
    [idKey]: id,
    version: requirement.version,
    contentHash: requirement.contentHash,
    status: "published",
    reason: "test_publish",
    changedBy: "test-owner",
    changedAt: "2026-08-12T00:00:00.000Z",
    lifecycleRevision: 1,
  });
  const updateTime = Object.freeze({ seconds: "1800000000", nanoseconds: 1 });
  const readTime = Object.freeze({ seconds: "1800000001", nanoseconds: 0 });
  return Object.freeze({
    requirement,
    evidence: Object.freeze({
      requirementKey:
        requirement.dependencyType === "language_profile"
          ? `language_profile:${requirement.profileId}:v${requirement.version}`
          : `published_template:${requirement.templateId}:v${requirement.version}`,
      versionDocumentPath:
        requirement.dependencyType === "language_profile"
          ? v2LanguageProfileVersionDocumentPathV1(
              requirement.profileId,
              requirement.version,
            )
          : v2ModeTemplateVersionDocumentPathV1(
              requirement.templateId,
              requirement.version,
            ),
      lifecycleDocumentPath:
        requirement.dependencyType === "language_profile"
          ? v2LanguageProfileLifecycleDocumentPathV1(
              requirement.profileId,
              requirement.version,
            )
          : v2ModeTemplateLifecycleDocumentPathV1(
              requirement.templateId,
              requirement.version,
            ),
      firestoreDocumentEncoding:
        "firestore_document_data_canonical_json_utf8.v1" as const,
      recordBeforeUpdateTime: updateTime,
      recordAfterUpdateTime: updateTime,
      lifecycleBeforeUpdateTime: updateTime,
      lifecycleAfterUpdateTime: updateTime,
      beforeReadTime: readTime,
      afterReadTime: readTime,
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
      objectPath,
      objectGeneration: "1",
      objectEncoding:
        "firebase_storage_object_raw_canonical_json_utf8.v1" as const,
    }),
    recordBefore: record,
    lifecycleBefore: lifecycle,
    object,
    recordAfter: record,
    lifecycleAfter: lifecycle,
  });
}

function orderedRows(
  value: V2CanonicalSeasonPlanV2,
): V2AuthenticatedRepositoryBundleEntryInputV1[] {
  return relevantRequirements(value)
    .map(row)
    .sort((left, right) =>
      left.requirement.dependencyType < right.requirement.dependencyType
        ? -1
        : left.requirement.dependencyType > right.requirement.dependencyType
          ? 1
          : 0,
    );
}

function headSnapshot(
  rows: readonly V2AuthenticatedRepositoryBundleEntryInputV1[],
  phase: "before" | "after",
): V2FirebaseAdminRepositoryHeadSnapshotV1 {
  return Object.freeze({
    readTime:
      phase === "before"
        ? rows[0]!.evidence.beforeReadTime
        : rows[0]!.evidence.afterReadTime,
    entries: Object.freeze(
      rows.map((value) =>
        Object.freeze({
          requirement: value.requirement,
          versionDocumentPath: value.evidence.versionDocumentPath,
          lifecycleDocumentPath: value.evidence.lifecycleDocumentPath,
          recordBytes:
            phase === "before" ? value.recordBefore : value.recordAfter,
          lifecycleBytes:
            phase === "before" ? value.lifecycleBefore : value.lifecycleAfter,
          recordUpdateTime:
            phase === "before"
              ? value.evidence.recordBeforeUpdateTime
              : value.evidence.recordAfterUpdateTime,
          lifecycleUpdateTime:
            phase === "before"
              ? value.evidence.lifecycleBeforeUpdateTime
              : value.evidence.lifecycleAfterUpdateTime,
        }),
      ),
    ),
  });
}

function objectReads(
  rows: readonly V2AuthenticatedRepositoryBundleEntryInputV1[],
): V2FirebaseAdminRepositoryObjectReadV1[] {
  return rows.map((value) => ({
    requirement: value.requirement,
    objectPath: value.evidence.objectPath,
    objectGeneration: value.evidence.objectGeneration,
    byteSize: value.object.byteLength,
    contentHash: value.requirement.contentHash,
    bytes: value.object,
  }));
}

describe("V2 authenticated repository pure materialization", () => {
  it("derives a deterministic plan-global identity only from a branded plan", () => {
    const value = plan();
    const first = deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: value,
      resolverContractFingerprint: fingerprint("resolver-contract"),
    });
    const second = deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: value,
      resolverContractFingerprint: fingerprint("resolver-contract"),
    });
    expect(first).toEqual(second);
    expect(isV2AuthenticatedRepositoryMaterializationIdentityV1(first)).toBe(
      true,
    );
    expect(first.repositoryScopeFingerprint).toHaveLength(64);
    expect(first.requestFingerprint).toHaveLength(64);
    expect(() =>
      deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
        plan: JSON.parse(canonicalJsonV1(value)),
        resolverContractFingerprint: fingerprint("resolver-contract"),
      }),
    ).toThrow("v2_authenticated_repository_materialization_identity_invalid");
  });

  it("replays a coherent snapshot through the pure observer and canonical bundle codec", async () => {
    const value = plan();
    const identity = deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: value,
      resolverContractFingerprint: fingerprint("resolver-contract"),
    });
    const rows = relevantRequirements(value).map(row).reverse();
    const result = await materializeV2AuthenticatedRepositorySnapshotV1({
      plan: value,
      identity,
      rows,
    });
    expect(
      isV2RepositoryCapabilityObservationReceiptV1(result.observation),
    ).toBe(true);
    expect(result.bundleManifest.requirementCount).toBe(2);
    expect(result.observationBodyRawHash).toBe(
      result.observationLogicalFingerprint,
    );
    expect(result.bundleManifestBodyRawHash).toBe(
      result.bundleManifestLogicalFingerprint,
    );
    expect(result.observationFullRawHash).not.toBe(
      result.observationLogicalFingerprint,
    );
    expect(result.bundleManifestFullRawHash).not.toBe(
      result.bundleManifestLogicalFingerprint,
    );
    expect(result.bundleBlobHash).toBe(bytesFingerprint(result.bundleBlob));

    const repeated = await materializeV2AuthenticatedRepositorySnapshotV1({
      plan: value,
      identity,
      rows: [...rows].reverse(),
    });
    expect(repeated.bundleManifestFullRaw).toBe(result.bundleManifestFullRaw);
    expect([...repeated.bundleBlob]).toEqual([...result.bundleBlob]);
  });

  it("rejects a snapshot whose object bytes do not match the plan requirement", async () => {
    const value = plan();
    const identity = deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: value,
      resolverContractFingerprint: fingerprint("resolver-contract"),
    });
    const rows = relevantRequirements(value).map(row);
    rows[0] = { ...rows[0]!, object: bytes({ substituted: true }) };
    await expect(
      materializeV2AuthenticatedRepositorySnapshotV1({
        plan: value,
        identity,
        rows,
      }),
    ).rejects.toThrow();
  });

  it("derives exact ordered object requests before IO and rejects extra record keys", () => {
    const value = plan();
    const rows = orderedRows(value);
    const beforeSnapshot = headSnapshot(rows, "before");
    const requests = deriveV2AuthenticatedRepositoryObjectReadRequestsV1({
      plan: value,
      beforeSnapshot,
    });
    expect(requests).toHaveLength(2);
    expect(
      requests.map((request) => request.requirement.dependencyType),
    ).toEqual(["language_profile", "published_template"]);
    expect(requests.every((request) => request.declaredByteSize > 0)).toBe(
      true,
    );

    const malformed = JSON.parse(
      new TextDecoder().decode(beforeSnapshot.entries[0]!.recordBytes),
    ) as Record<string, unknown>;
    malformed.unexpected = true;
    const badSnapshot = {
      ...beforeSnapshot,
      entries: [
        {
          ...beforeSnapshot.entries[0]!,
          recordBytes: bytes(malformed),
        },
        beforeSnapshot.entries[1]!,
      ],
    };
    expect(() =>
      deriveV2AuthenticatedRepositoryObjectReadRequestsV1({
        plan: value,
        beforeSnapshot: badSnapshot,
      }),
    ).toThrow("v2_authenticated_repository_record_permit_invalid");
  });

  it("assembles only exact before-object-after rows and rejects swaps, drift and cardinality", () => {
    const value = plan();
    const source = orderedRows(value);
    const before = headSnapshot(source, "before");
    const after = headSnapshot(source, "after");
    const objects = objectReads(source);
    const assembled = assembleV2AuthenticatedRepositorySnapshotRowsV1({
      plan: value,
      beforeSnapshot: before,
      objects,
      afterSnapshot: after,
    });
    expect(assembled).toHaveLength(2);

    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects: [...objects].reverse(),
        afterSnapshot: after,
      }),
    ).toThrow("v2_authenticated_repository_snapshot_object_mismatch");
    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects,
        afterSnapshot: {
          ...after,
          entries: [...after.entries].reverse(),
        },
      }),
    ).toThrow("v2_authenticated_repository_head_snapshot_order_invalid");
    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects,
        afterSnapshot: {
          ...after,
          entries: [
            {
              ...after.entries[0]!,
              versionDocumentPath: "repository_versions/substituted",
            },
            after.entries[1]!,
          ],
        },
      }),
    ).toThrow("v2_authenticated_repository_head_snapshot_path_invalid");
    for (const changedObjects of [
      objects.slice(0, 1),
      [...objects, objects[0]!],
    ]) {
      expect(() =>
        assembleV2AuthenticatedRepositorySnapshotRowsV1({
          plan: value,
          beforeSnapshot: before,
          objects: changedObjects,
          afterSnapshot: after,
        }),
      ).toThrow("v2_authenticated_repository_snapshot_object_count_invalid");
    }
    const timeDrift = {
      ...after,
      entries: [
        {
          ...after.entries[0]!,
          recordUpdateTime: { seconds: "1800000000", nanoseconds: 2 },
        },
        after.entries[1]!,
      ],
    };
    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects,
        afterSnapshot: timeDrift,
      }),
    ).toThrow("v2_authenticated_repository_snapshot_head_drift");
    const bytesDrift = {
      ...after,
      entries: [
        {
          ...after.entries[0]!,
          recordBytes: bytes({ drift: true }),
        },
        after.entries[1]!,
      ],
    };
    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects,
        afterSnapshot: bytesDrift,
      }),
    ).toThrow("v2_authenticated_repository_snapshot_head_drift");
    const objectMismatch = [
      { ...objects[0]!, objectGeneration: "2" },
      objects[1]!,
    ];
    expect(() =>
      assembleV2AuthenticatedRepositorySnapshotRowsV1({
        plan: value,
        beforeSnapshot: before,
        objects: objectMismatch,
        afterSnapshot: after,
      }),
    ).toThrow("v2_authenticated_repository_snapshot_object_mismatch");
  });

  it("cold-verifies exact current heads and catches updateTime-only ABA and persisted drift", async () => {
    const value = plan();
    const source = orderedRows(value);
    const rows = assembleV2AuthenticatedRepositorySnapshotRowsV1({
      plan: value,
      beforeSnapshot: headSnapshot(source, "before"),
      objects: objectReads(source),
      afterSnapshot: headSnapshot(source, "after"),
    });
    const identity = deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: value,
      resolverContractFingerprint: fingerprint("resolver-contract"),
    });
    const materialized = await materializeV2AuthenticatedRepositorySnapshotV1({
      plan: value,
      identity,
      rows,
    });
    const current = headSnapshot(rows, "after");
    const verified = await verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
      plan: value,
      parsedRows: rows,
      currentSnapshot: current,
      expectedObservationRaw: materialized.observationFullRaw,
    });
    expect(verified.verificationFingerprint).toHaveLength(64);
    expect(
      isV2RepositoryCapabilityObservationReceiptV1(verified.observation),
    ).toBe(true);

    const updateTimeOnly = {
      ...current,
      entries: [
        {
          ...current.entries[0]!,
          recordUpdateTime: { seconds: "1800000000", nanoseconds: 2 },
        },
        current.entries[1]!,
      ],
    };
    await expect(
      verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
        plan: value,
        parsedRows: rows,
        currentSnapshot: updateTimeOnly,
        expectedObservationRaw: materialized.observationFullRaw,
      }),
    ).rejects.toThrow("v2_authenticated_repository_cold_replay_head_mismatch");
    await expect(
      verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
        plan: value,
        parsedRows: rows,
        currentSnapshot: { ...current, entries: current.entries.slice(0, 1) },
        expectedObservationRaw: materialized.observationFullRaw,
      }),
    ).rejects.toThrow(
      "v2_authenticated_repository_head_snapshot_count_invalid",
    );
    await expect(
      verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
        plan: value,
        parsedRows: rows,
        currentSnapshot: {
          ...current,
          entries: [...current.entries, current.entries[0]!],
        },
        expectedObservationRaw: materialized.observationFullRaw,
      }),
    ).rejects.toThrow(
      "v2_authenticated_repository_head_snapshot_count_invalid",
    );
    await expect(
      verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
        plan: value,
        parsedRows: rows,
        currentSnapshot: current,
        expectedObservationRaw: canonicalJsonV1({ wrong: true }),
      }),
    ).rejects.toThrow(
      "v2_authenticated_repository_cold_replay_observation_mismatch",
    );
    const objectDriftRows = [...rows];
    objectDriftRows[0] = {
      ...objectDriftRows[0]!,
      object: bytes({ substituted: true }),
    };
    await expect(
      verifyV2AuthenticatedRepositoryColdReplayHeadsV1({
        plan: value,
        parsedRows: objectDriftRows,
        currentSnapshot: current,
        expectedObservationRaw: materialized.observationFullRaw,
      }),
    ).rejects.toThrow("v2_authenticated_repository_object_hash_mismatch");
  });
});
