import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createFirestoreEpisodeRevisionResolver,
  createFirestoreDecisionRegistryResolver,
  createFirestoreModeTemplateResolver,
  modeTemplateVersionDocumentPath,
  modeTemplateLifecycleDocumentPath,
  decisionRegistryDocumentPath,
  episodeDraftDocumentPath,
  episodeRevisionDocumentPath,
  seasonDraftDocumentPath,
} from "./firestore_authoring_store";
import {
  episodeRevisionFingerprint,
  episodeRevisionObjectPath,
} from "./episode_revision_resolver";
import {
  canonicalJsonV1,
  decisionRegistryObjectPath,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  validateModeTemplateArtifactBody,
  validateModeTemplateLifecycleHead,
} from "../../../modules/learning-v2/contracts/validation";

describe("Firestore V2 authoring storage paths", () => {
  it("pins draft and immutable revision namespaces", () => {
    expect(episodeDraftDocumentPath("draft-1")).toBe(
      "content_episode_drafts/draft-1",
    );
    expect(seasonDraftDocumentPath("season-draft-1")).toBe(
      "content_season_drafts/season-draft-1",
    );
    expect(episodeRevisionDocumentPath("draft-1", 3)).toBe(
      "content_episode_revisions/draft-1__r3",
    );
    expect(decisionRegistryDocumentPath("registry", 2)).toBe(
      "content_decision_registries/registry__v2",
    );
    expect(modeTemplateVersionDocumentPath("template-1", 3)).toBe(
      "content_mode_template_versions/template-1__v3",
    );
  });

  it.each(["published", "deprecated"])(
    "resolves a %s ModeTemplate and exposes only its override allowlist",
    async (status) => {
    const fixture = JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"),
        "utf8",
      ),
    ) as {
      dependencies: {
        templates: Array<{
          templateRef: { templateId: string; version: number; contentHash: string };
          body: Record<string, unknown>;
        }>;
      };
    };
    const template = fixture.dependencies.templates[0];
    const templateId = template.templateRef.templateId;
    const version = template.templateRef.version;
    const contentHash = template.templateRef.contentHash;
    const objectPath = `content-studio/mode-templates/${sha256Utf8(templateId)}/v${version}/${contentHash}.json`;
    const body = template.body;
    const byteSize = Buffer.byteLength(canonicalJsonV1(body), "utf8");
    const db = {
      doc: (path: string) => ({
        get: async () =>
          path === modeTemplateVersionDocumentPath(templateId, version)
            ? {
                exists: true,
                data: () => ({
                  schemaVersion: "v2-mode-template-record.v1",
                  templateId,
                  version,
                  contentHash,
                  object: {
                    objectPath,
                    contentHash,
                    objectGeneration: "g-1",
                    byteSize,
                  },
                  provenance: {
                    createdBy: "owner-1",
                    createdAt: "2026-07-16T00:00:00.000Z",
                    basedOn: {
                      entityType: "mode_template",
                      entityId: "template-source",
                      versionOrRevision: 1,
                      contentHash: "a".repeat(64),
                    },
                    generator: {
                      stageId: "stage-1",
                      artifactId: "artifact-1",
                      promptVersion: "prompt-v1",
                      schemaVersion: 1,
                    },
                  },
                  createdAt: "2026-07-16T00:00:00.000Z",
                }),
              }
            : path === modeTemplateLifecycleDocumentPath(templateId, version)
              ? {
                  exists: true,
                  data: () => ({
                    schemaVersion: "v2-mode-template-lifecycle.v1",
                    templateId,
                    version,
                    contentHash,
                    status,
                    reason: "initial_publish",
                    ...(status === "deprecated" ? { noReplacement: true } : {}),
                    changedBy: "owner-1",
                    changedAt: "2026-07-16T00:00:00.000Z",
                    lifecycleRevision: 1,
                  }),
                }
            : { exists: false, data: () => undefined },
      }),
    } as never;
    const resolver = createFirestoreModeTemplateResolver(db, {
      read: async () => ({
        body,
        contentHash,
        objectGeneration: "g-1",
        byteSize,
      }),
    }, status === "deprecated" ? { allowDeprecated: true } : undefined);
    await expect(
      resolver({ templateId, version, contentHash }),
    ).resolves.toEqual({
      templateRef: { templateId, version, contentHash },
      allowedOverridePaths: (body.authoring as { allowedOverridePaths: string[] })
        .allowedOverridePaths,
    });
    },
  );

  it("rejects a ModeTemplate with malformed authoring metadata", async () => {
    const templateId = "template-invalid";
    const version = 1;
    const contentHash = "b".repeat(64);
    const objectPath = `content-studio/mode-templates/${sha256Utf8(templateId)}/v${version}/${contentHash}.json`;
    const db = {
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({
            schemaVersion: "v2-mode-template-record.v1",
            templateId,
            version,
            contentHash,
            object: {
              objectPath,
              contentHash,
              objectGeneration: "g-1",
              byteSize: 2,
            },
          }),
        }),
      }),
    } as never;
    const resolver = createFirestoreModeTemplateResolver(db, {
      read: async () => ({
        body: {
          schemaVersion: "v2-mode-template-body.v1",
          templateId,
          version,
          kernel: {},
          authoring: { allowedOverridePaths: ["prompt.text"], extra: true },
        },
        contentHash,
        objectGeneration: "g-1",
        byteSize: 2,
      }),
    });
    await expect(resolver({ templateId, version, contentHash })).resolves.toBeUndefined();
  });

  it.each(["approved", "archived", "draft", "hidden", "deprecated"])(
    "rejects a ModeTemplate lifecycle status that is not published/deprecated (%s)",
    async (status) => {
      const fixture = JSON.parse(
        readFileSync(
          path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"),
          "utf8",
        ),
      ) as {
        dependencies: {
          templates: Array<{
            templateRef: { templateId: string; version: number; contentHash: string };
            body: Record<string, unknown>;
          }>;
        };
      };
      const template = fixture.dependencies.templates[0];
      const { templateId, version, contentHash } = template.templateRef;
      const objectPath = `content-studio/mode-templates/${sha256Utf8(templateId)}/v${version}/${contentHash}.json`;
      const byteSize = Buffer.byteLength(canonicalJsonV1(template.body), "utf8");
      const db = {
        doc: (requestedPath: string) => ({
          get: async () =>
            requestedPath === modeTemplateVersionDocumentPath(templateId, version)
              ? {
                  exists: true,
                  data: () => ({
                    schemaVersion: "v2-mode-template-record.v1",
                    templateId,
                    version,
                    contentHash,
                    object: { objectPath, contentHash, objectGeneration: "g-1", byteSize },
                    provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" },
                    createdAt: "2026-07-16T00:00:00.000Z",
                  }),
                }
              : {
                  exists: true,
                  data: () => ({
                    schemaVersion: "v2-mode-template-lifecycle.v1",
                    templateId,
                    version,
                    contentHash,
                    status,
                    reason: "test",
                    changedBy: "owner-1",
                    changedAt: "2026-07-16T00:00:00.000Z",
                    lifecycleRevision: 1,
                  }),
                },
        }),
      } as never;
      const resolver = createFirestoreModeTemplateResolver(db, {
        read: async () => ({ body: template.body, contentHash, objectGeneration: "g-1", byteSize }),
      });
      await expect(resolver({ templateId, version, contentHash })).resolves.toBeUndefined();
    },
  );

  it("rejects extra fields in the immutable ModeTemplate record or object envelope", async () => {
    const templateId = "template-extra";
    const version = 1;
    const contentHash = "c".repeat(64);
    const objectPath = `content-studio/mode-templates/${sha256Utf8(templateId)}/v${version}/${contentHash}.json`;
    const db = {
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({
            schemaVersion: "v2-mode-template-record.v1",
            templateId,
            version,
            contentHash,
            unexpected: true,
            object: {
              objectPath,
              contentHash,
              objectGeneration: "g-1",
              byteSize: 2,
              unexpected: true,
            },
          }),
        }),
      }),
    } as never;
    const resolver = createFirestoreModeTemplateResolver(db, {
      read: async () => ({
        body: {},
        contentHash,
        objectGeneration: "g-1",
        byteSize: 2,
      }),
    });
    await expect(resolver({ templateId, version, contentHash })).resolves.toBeUndefined();
  });

  it("exposes the canonical shared ModeTemplate semantic validator", () => {
    expect(
      validateModeTemplateArtifactBody({
        schemaVersion: "v2-mode-template-body.v1",
        templateId: "template-invalid",
        version: 1,
      }).ok,
    ).toBe(false);
  });

  it("shares strict lifecycle XOR semantics with the resolver", () => {
    const base = {
      schemaVersion: "v2-mode-template-lifecycle.v1",
      templateId: "template-1",
      version: 1,
      contentHash: "a".repeat(64),
      status: "published",
      reason: "initial_publish",
      changedBy: "owner-1",
      changedAt: "2026-07-16T00:00:00.000Z",
      lifecycleRevision: 1,
    };
    expect(validateModeTemplateLifecycleHead(base).ok).toBe(true);
    expect(
      validateModeTemplateLifecycleHead({ ...base, noReplacement: false }).ok,
    ).toBe(false);
    expect(
      validateModeTemplateLifecycleHead({
        ...base,
        status: "deprecated",
        noReplacement: true,
      }).ok,
    ).toBe(true);
    expect(
      validateModeTemplateLifecycleHead({
        ...base,
        status: "deprecated",
        noReplacement: true,
        replacementRef: {
          templateId: "template-2",
          version: 1,
          contentHash: "b".repeat(64),
        },
      }).ok,
    ).toBe(false);
  });

  it("accepts the repository's complete normative ModeTemplate corpus", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.resolve(__dirname, "../../../tests/fixtures/learning-v2/episode-01.valid.json"),
        "utf8",
      ),
    ) as { dependencies: { templates: Array<{ body: unknown }> } };
    expect(fixture.dependencies.templates.length).toBeGreaterThan(0);
    for (const template of fixture.dependencies.templates) {
      expect(validateModeTemplateArtifactBody(template.body).ok).toBe(true);
    }
  });

  it("reads and verifies the exact immutable Storage generation", async () => {
    const body = {};
    const ref = {
      draftId: "draft-1",
      episodeId: "ep-01",
      revision: 3,
      revisionFingerprint: episodeRevisionFingerprint(
        "draft-1",
        3,
        hashCanonicalBody(body),
      ),
      contentHash: hashCanonicalBody(body),
      ordinal: 1,
      chapterId: "chapter-1",
      approvalStatus: "approved" as const,
    };
    const path = episodeRevisionObjectPath(
      ref.draftId,
      ref.revision,
      ref.contentHash,
    );
    const db = {
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({
            record: {
              schemaVersion: "episode-authoring-record.v1",
              draftId: ref.draftId,
              episodeId: ref.episodeId,
              revision: ref.revision,
              contentHash: ref.contentHash,
              revisionFingerprint: ref.revisionFingerprint,
              object: {
                objectPath: path,
                contentHash: ref.contentHash,
                objectGeneration: "generation-7",
                byteSize: 2,
              },
              provenance: {
                createdBy: "owner-1",
                createdAt: "2026-07-16T00:00:00.000Z",
              },
              createdAt: "2026-07-16T00:00:00.000Z",
            },
            lifecycle: {
              schemaVersion: "episode-lifecycle.v1",
              draftId: ref.draftId,
              episodeId: ref.episodeId,
              revision: ref.revision,
              revisionFingerprint: ref.revisionFingerprint,
              status: "approved",
              changedBy: "owner-1",
              changedAt: "2026-07-16T00:00:00.000Z",
              lifecycleRevision: 1,
            },
          }),
        }),
      }),
    } as never;
    const resolver = createFirestoreEpisodeRevisionResolver(db, {
      read: async (
        requestedPath,
        expectedHash,
        expectedGeneration,
        expectedByteSize,
      ) => {
        expect(requestedPath).toBe(path);
        expect(expectedHash).toBe(ref.contentHash);
        expect(expectedGeneration).toBe("generation-7");
        expect(expectedByteSize).toBe(2);
        return {
          body,
          contentHash: ref.contentHash,
          objectGeneration: "generation-7",
          byteSize: 2,
        };
      },
    });
    await expect(resolver.resolve(ref)).resolves.toMatchObject({
      objectPath: path,
      objectGeneration: "generation-7",
    });
  });

  it.each([
    ["missing", new Error("immutable_storage_object_missing")],
    ["metadata", new Error("immutable_storage_metadata_mismatch")],
  ])("propagates resolver-level Storage %s failures", async (_label, failure) => {
    const body = {};
    const contentHash = hashCanonicalBody(body);
    const ref = {
      draftId: "draft-storage-failure",
      episodeId: "ep-storage-failure",
      revision: 1,
      revisionFingerprint: episodeRevisionFingerprint(
        "draft-storage-failure",
        1,
        contentHash,
      ),
      contentHash,
      ordinal: 1,
      chapterId: "chapter-1",
      approvalStatus: "approved" as const,
    };
    const objectPath = episodeRevisionObjectPath(
      ref.draftId,
      ref.revision,
      ref.contentHash,
    );
    const recordEnvelope = {
      record: {
        schemaVersion: "episode-authoring-record.v1",
        draftId: ref.draftId,
        episodeId: ref.episodeId,
        revision: ref.revision,
        contentHash: ref.contentHash,
        revisionFingerprint: ref.revisionFingerprint,
        object: {
          objectPath,
          contentHash: ref.contentHash,
          objectGeneration: "generation-failure",
          byteSize: 2,
        },
        provenance: {
          createdBy: "owner-1",
          createdAt: "2026-07-16T00:00:00.000Z",
        },
        createdAt: "2026-07-16T00:00:00.000Z",
      },
      lifecycle: {
        schemaVersion: "episode-lifecycle.v1",
        draftId: ref.draftId,
        episodeId: ref.episodeId,
        revision: ref.revision,
        revisionFingerprint: ref.revisionFingerprint,
        status: "approved",
        changedBy: "owner-1",
        changedAt: "2026-07-16T00:00:00.000Z",
        lifecycleRevision: 1,
      },
    };
    const db = {
      doc: () => ({
        get: async () => ({ exists: true, data: () => recordEnvelope }),
      }),
    } as never;
    const resolver = createFirestoreEpisodeRevisionResolver(db, {
      read: async () => {
        throw failure;
      },
    });
    await expect(resolver.resolve(ref)).rejects.toThrow(failure.message);
  });

  it("rejects a resolver reader result with mismatched pinned generation", async () => {
    const body = {};
    const contentHash = hashCanonicalBody(body);
    const ref = {
      draftId: "draft-generation-mismatch",
      episodeId: "ep-generation-mismatch",
      revision: 1,
      revisionFingerprint: episodeRevisionFingerprint(
        "draft-generation-mismatch",
        1,
        contentHash,
      ),
      contentHash,
      ordinal: 1,
      chapterId: "chapter-1",
      approvalStatus: "approved" as const,
    };
    const objectPath = episodeRevisionObjectPath(
      ref.draftId,
      ref.revision,
      ref.contentHash,
    );
    const record = {
      schemaVersion: "episode-authoring-record.v1",
      draftId: ref.draftId,
      episodeId: ref.episodeId,
      revision: ref.revision,
      contentHash: ref.contentHash,
      revisionFingerprint: ref.revisionFingerprint,
      object: {
        objectPath,
        contentHash: ref.contentHash,
        objectGeneration: "generation-pinned",
        byteSize: 2,
      },
      provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" },
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const lifecycle = {
      schemaVersion: "episode-lifecycle.v1",
      draftId: ref.draftId,
      episodeId: ref.episodeId,
      revision: ref.revision,
      revisionFingerprint: ref.revisionFingerprint,
      status: "approved",
      changedBy: "owner-1",
      changedAt: "2026-07-16T00:00:00.000Z",
      lifecycleRevision: 1,
    };
    const db = {
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ record, lifecycle }) }) }),
    } as never;
    await expect(
      createFirestoreEpisodeRevisionResolver(db, {
        read: async () => ({
          body,
          contentHash,
          objectGeneration: "generation-other",
          byteSize: 2,
        }),
      }).resolve(ref),
    ).rejects.toThrow("season_episode_object_generation_invalid");
  });

  it("rejects a malformed DecisionRegistry instead of raw-casting it", async () => {
    const db = {
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ forged: true }) }),
      }),
    } as never;
    await expect(
      createFirestoreDecisionRegistryResolver(db).resolve({
        id: "registry",
        version: 1,
        contentHash: "a".repeat(64),
      }),
    ).rejects.toThrow("season_decision_registry_invalid");
  });

  it("rejects DecisionRegistry Storage metadata that does not match the pinned object", async () => {
    const fixture = JSON.parse(
      readFileSync(
        path.resolve(
          __dirname,
          "../../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json",
        ),
        "utf8",
      ),
    ) as { baseline: { body: Record<string, unknown> } };
    const body = fixture.baseline.body;
    const id = String(body.registryId);
    const version = Number(body.version);
    const contentHash = hashCanonicalBody(body);
    const objectPath = decisionRegistryObjectPath(id, version, contentHash);
    const record = {
      schemaVersion: "v2-decision-registry-record.v1",
      ref: { id, version, contentHash },
      object: {
        objectPath,
        contentHash,
        objectGeneration: "g-1",
        byteSize: Buffer.byteLength(canonicalJsonV1(body), "utf8"),
      },
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const db = {
      doc: () => ({
        get: async () => ({ exists: true, data: () => record }),
      }),
    } as never;
    await expect(
      createFirestoreDecisionRegistryResolver(db, {
        read: async () => ({
          body,
          contentHash,
          objectGeneration: "forged-generation",
          byteSize: record.object.byteSize,
        }),
      }).resolve({ id, version, contentHash }),
    ).rejects.toThrow("season_decision_registry_object_metadata_invalid");
  });

  it("rejects DecisionRegistry Storage bytes whose canonical body hash differs", async () => {
    const fixture = JSON.parse(
      readFileSync(
        path.resolve(
          __dirname,
          "../../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json",
        ),
        "utf8",
      ),
    ) as { baseline: { body: Record<string, unknown> } };
    const body = fixture.baseline.body;
    const id = String(body.registryId);
    const version = Number(body.version);
    const contentHash = hashCanonicalBody(body);
    const objectPath = decisionRegistryObjectPath(id, version, contentHash);
    const record = {
      schemaVersion: "v2-decision-registry-record.v1",
      ref: { id, version, contentHash },
      object: {
        objectPath,
        contentHash,
        objectGeneration: "g-1",
        byteSize: Buffer.byteLength(canonicalJsonV1(body), "utf8"),
      },
      createdAt: "2026-07-16T00:00:00.000Z",
    };
    const db = {
      doc: () => ({
        get: async () => ({ exists: true, data: () => record }),
      }),
    } as never;
    await expect(
      createFirestoreDecisionRegistryResolver(db, {
        read: async () => ({
          body: { ...body, version: version + 1 },
          contentHash,
          objectGeneration: "g-1",
          byteSize: record.object.byteSize,
        }),
      }).resolve({ id, version, contentHash }),
    ).rejects.toThrow("season_decision_registry_object_invalid");
  });
});
