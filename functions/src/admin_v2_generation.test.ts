import { handleAdminCreateV2GenerationPlan } from "./admin_v2_generation";

const hash = "a".repeat(64);
const data = {
  schemaVersion: "v2-admin-generation-request.v1",
  seasonId: "season-01",
  scope: "vertical_slice",
  episodeIds: ["episode-01"],
  studyTarget: "en",
  sourceLocale: "ru",
  targetLocales: ["de"],
  templateBindings: [
    {
      episodeId: "episode-01",
      templateRefs: [
        { templateId: "phrase-builder", version: 1, contentHash: hash },
      ],
    },
  ],
  idempotencyKey: "v2-generate-01",
  // зачем: с Task 6 языковой профиль — обязательное предусловие генерации.
  languageProfileRef: {
    profileId: "english-general-a1",
    version: 1,
    contentHash: "b".repeat(64),
  },
};

type Doc = { exists: boolean; data: () => Record<string, unknown> | undefined };
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (path: string) => ({ path });
  const db = {
    collection(name: string) {
      return {
        doc(id: string) {
          return ref(`${name}/${id}`);
        },
      };
    },
    runTransaction: async (
      work: (tx: {
        get: (doc: { path: string }) => Promise<Doc>;
        create: (doc: { path: string }, value: Record<string, unknown>) => void;
      }) => Promise<unknown>,
    ) =>
      work({
        async get(document) {
          const value = docs.get(document.path);
          return { exists: Boolean(value), data: () => value };
        },
        create(document, value) {
          if (docs.has(document.path)) throw new Error("already-exists");
          docs.set(document.path, value);
        },
      }),
    docs,
  };
  return db;
}

const auth = {
  uid: "admin-1",
  token: { admin: true, adminRole: "content_editor" },
};
const ownerAuth = {
  uid: "owner-1",
  token: { admin: true, adminRole: "owner" },
};
const authenticatedOwner = Object.freeze({
  actorUid: "owner-1",
  role: "owner" as const,
  ownerIdentityFingerprint: "1".repeat(64),
  authenticationAuthority:
    "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
  identityPolicyFingerprint: "2".repeat(64),
});

const canonicalBridge = {
  schemaVersion: "v2-admin-canonical-generation-bridge.v1" as const,
  workspaceId: "workspace-01",
  authoringRevision: 1,
  speechProfileRef: {
    profileId: "speech-en",
    targetLanguage: "en",
    speechLocale: "en-US",
    version: 1,
    contentHash: "c".repeat(64),
  },
  voiceGenerationProfileRef: {
    profileId: "voice-en",
    version: 1,
    contentHash: "d".repeat(64),
  },
  decisionRegistryRef: {
    decisionId: "HYP-V2-007" as const,
    version: 1,
    contentHash: "e".repeat(64),
  },
};

describe("admin V2 generation callable seam", () => {
  it("requires content.draft.write and rejects stale template pins", async () => {
    const db = fakeDb();
    await expect(
      handleAdminCreateV2GenerationPlan(
        {
          auth: {
            uid: "u",
            token: { admin: true, adminRole: "content_reviewer" },
          },
          data,
        },
        { db: db as never, resolveTemplate: async () => undefined },
      ),
    ).rejects.toThrow("Role cannot edit V2 drafts");
    await expect(
      handleAdminCreateV2GenerationPlan(
        { auth, data },
        { db: db as never, resolveTemplate: async () => undefined },
      ),
    ).rejects.toThrow("v2_generation_template_pin_stale");
  });

  it("queues one deterministic plan and replays the same idempotency key", async () => {
    const db = fakeDb();
    const deps = {
      db: db as never,
      resolveTemplate: async (ref: unknown) => ref,
      now: () => "2026-07-17T00:00:00.000Z",
    };
    const first = await handleAdminCreateV2GenerationPlan({ auth, data }, deps);
    const replay = await handleAdminCreateV2GenerationPlan(
      { auth, data },
      deps,
    );
    expect(first).toMatchObject({
      ok: true,
      jobId: "v2-generate-01",
      state: "queued",
      replayed: false,
    });
    expect(replay).toMatchObject({
      ok: true,
      jobId: "v2-generate-01",
      state: "queued",
      replayed: true,
      requestFingerprint: first.requestFingerprint,
    });
    expect(db.docs.has("content_v2_generation_jobs/v2-generate-01")).toBe(true);
    expect(
      [...db.docs.keys()].filter((key) =>
        key.startsWith("content_factory_stages/"),
      ),
    ).toHaveLength(11);
    expect(
      [...db.docs.keys()].filter((key) =>
        key.startsWith("content_v2_generation_localizations/"),
      ),
    ).toHaveLength(1);
    expect(
      [...db.docs.keys()].filter((key) => key.startsWith("admin_log/")),
    ).toHaveLength(1);
  });

  it("does not allow a second payload to reuse the idempotency key", async () => {
    const db = fakeDb();
    const deps = {
      db: db as never,
      resolveTemplate: async (ref: unknown) => ref,
    };
    await handleAdminCreateV2GenerationPlan({ auth, data }, deps);
    await expect(
      handleAdminCreateV2GenerationPlan(
        { auth, data: { ...data, targetLocales: ["fr"] } },
        deps,
      ),
    ).rejects.toThrow("idempotencyKey belongs to another V2 generation plan");
  });

  it("optionally queues the exact canonical V2 stage graph when all missing refs are supplied", async () => {
    const db = fakeDb();
    await handleAdminCreateV2GenerationPlan(
      { auth: ownerAuth, data },
      {
        db: db as never,
        resolveTemplate: async (ref: unknown) => ref,
        now: () => "2026-08-13T12:00:00.000Z",
        canonicalBridge,
        authenticateRootOwner: () => authenticatedOwner,
      },
    );
    const job = db.docs.get("content_v2_generation_jobs/v2-generate-01")!;
    expect(job).toMatchObject({
      canonicalV2Authority: "none_draft_plan_only",
      canonicalPlanFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      canonicalPlanRequestRaw: expect.stringContaining(
        "v2-canonical-plan-request.v2",
      ),
      canonicalBridgeFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(String(job.canonicalPlanRaw)).toContain(
      "v2-canonical-season-plan.v2",
    );
    expect(String(job.canonicalPlanRequestRaw)).toContain(
      "v2-canonical-plan-request.v2",
    );
    const stages = [...db.docs.entries()].filter(([path]) =>
      path.startsWith("content_factory_stages/"),
    );
    expect(stages.length).toBeGreaterThan(11);
    expect(
      stages.every(
        ([, stage]) => stage.schemaVersion === "v2-generation-stage.v2",
      ),
    ).toBe(true);
    expect(
      [...db.docs.keys()].some((path) =>
        path.startsWith("content_v2_generation_localizations/"),
      ),
    ).toBe(false);
    expect(
      stages.find(([, stage]) => stage.kind === "v2_activity_instances")?.[1],
    ).toMatchObject({
      requestId: "workspace-01",
      sourceLocale: "owner-authored",
      studyTarget: "en",
      revision: 1,
      executionMode: "owner_authored_manual_import_only",
      state: "queued",
    });
  });

  it("accepts the additive callable command and binds its exact canonical bridge to replay", async () => {
    const db = fakeDb();
    const command = {
      schemaVersion: "v2-admin-canonical-generation-command.v2",
      generationRequest: data,
      canonicalBridge,
    };
    const deps = {
      db: db as never,
      resolveTemplate: async (ref: unknown) => ref,
      now: () => "2026-08-13T13:00:00.000Z",
      authenticateRootOwner: () => authenticatedOwner,
    };
    const first = await handleAdminCreateV2GenerationPlan(
      { auth: ownerAuth, data: command },
      deps,
    );
    const replay = await handleAdminCreateV2GenerationPlan(
      { auth: ownerAuth, data: command },
      deps,
    );
    expect(first).toMatchObject({
      canonicalPlanFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      canonicalV2Authority: "none_draft_plan_only",
      replayed: false,
    });
    expect(replay).toMatchObject({
      canonicalPlanFingerprint: first.canonicalPlanFingerprint,
      canonicalPlanRequestRaw: first.canonicalPlanRequestRaw,
      canonicalV2Authority: "none_draft_plan_only",
      replayed: true,
    });
    await expect(
      handleAdminCreateV2GenerationPlan(
        {
          auth: ownerAuth,
          data: {
            ...command,
            canonicalBridge: {
              ...canonicalBridge,
              decisionRegistryRef: {
                ...canonicalBridge.decisionRegistryRef,
                contentHash: "f".repeat(64),
              },
            },
          },
        },
        deps,
      ),
    ).rejects.toThrow("idempotencyKey belongs to another V2 generation plan");
  });
});
