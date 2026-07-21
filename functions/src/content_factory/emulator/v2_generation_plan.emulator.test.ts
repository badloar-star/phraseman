import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from "../../../../modules/learning-v2/policies/decision_registry";
import { createFirestoreModeTemplateResolver, modeTemplateLifecycleDocumentPath, modeTemplateVersionDocumentPath } from "../../content_studio/firestore_authoring_store";
import { adminCreateV2GenerationPlan } from "../../admin_v2_generation";

const PROJECT_ID = "demo-phraseman-generation";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
const FIXTURE_PATH = path.resolve(__dirname, "../../../../tests/fixtures/learning-v2/episode-01.valid.json");
const JOBS = "content_v2_generation_jobs";
const STAGES = "content_v2_generation_stages";
const LOCALIZATIONS = "content_v2_generation_localizations";
const OPERATIONS = "content_v2_generation_operations";

type Fixture = {
  dependencies: { templates: Array<{ templateRef: { templateId: string; version: number; contentHash: string }; body: unknown }> };
};

describe("V2 generation plan callable on Firestore/Storage emulators", () => {
  let environment: RulesTestEnvironment;
  let app: admin.app.App;
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Fixture;
  const template = fixture.dependencies.templates[0];
  const auth = { uid: "generation-editor", token: { admin: true, adminRole: "content_editor" } };

  const request = (idempotencyKey: string) => ({
    schemaVersion: "v2-admin-generation-request.v1",
    seasonId: "season-emulator",
    scope: "vertical_slice",
    episodeIds: ["episode-01"],
    recipes: [{ episodeId: "episode-01", dialogue: true, speakingClub: true }],
    studyTarget: "en",
    sourceLocale: "ru",
    targetLocales: ["en"],
    templateBindings: [{ episodeId: "episode-01", templateRefs: [template.templateRef] }],
    idempotencyKey,
  });

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST)
      throw new Error("Firestore and Storage emulators are required");
    app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` });
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });

    const serialized = canonicalJsonV1(template.body);
    expect(hashCanonicalBody(template.body)).toBe(template.templateRef.contentHash);
    const objectPath = `content-studio/mode-templates/${sha256Utf8(template.templateRef.templateId)}/v${template.templateRef.version}/${template.templateRef.contentHash}.json`;
    const file = app.storage().bucket().file(objectPath);
    await file.save(Buffer.from(serialized, "utf8"), { resumable: false, metadata: { metadata: { contentHash: template.templateRef.contentHash } } });
    const [metadata] = await file.getMetadata();
    const now = "2026-07-17T00:00:00.000Z";
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, modeTemplateVersionDocumentPath(template.templateRef.templateId, template.templateRef.version)), {
        schemaVersion: "v2-mode-template-record.v1",
        templateId: template.templateRef.templateId,
        version: template.templateRef.version,
        contentHash: template.templateRef.contentHash,
        object: {
          objectPath,
          contentHash: template.templateRef.contentHash,
          objectGeneration: String(metadata.generation ?? ""),
          byteSize: Buffer.byteLength(serialized, "utf8"),
        },
        provenance: { createdBy: "fixture", createdAt: now },
        createdAt: now,
      });
      await setDoc(doc(db, modeTemplateLifecycleDocumentPath(template.templateRef.templateId, template.templateRef.version)), {
        schemaVersion: "v2-mode-template-lifecycle.v1",
        templateId: template.templateRef.templateId,
        version: template.templateRef.version,
        contentHash: template.templateRef.contentHash,
        status: "published",
        reason: "emulator fixture",
        changedBy: "fixture",
        changedAt: now,
        lifecycleRevision: 1,
      });
    });
  });

  afterAll(async () => {
    await environment?.cleanup();
    await app?.delete();
  });

  it("denies direct draft writes and rejects missing or stale template pins", async () => {
    await expect(
      setDoc(
        doc(environment.authenticatedContext("client-1").firestore(), `${JOBS}/forged-job`),
        { state: "queued" },
      ),
    ).rejects.toBeDefined();
    await expect(adminCreateV2GenerationPlan.run({ data: request("missing-pin"), auth: undefined } as never)).rejects.toThrow("Admin only");
    await expect(adminCreateV2GenerationPlan.run({ data: { ...request("missing-pin"), templateBindings: [{ episodeId: "episode-01", templateRefs: [{ ...template.templateRef, contentHash: "f".repeat(64) }] }] }, auth } as never)).rejects.toThrow("v2_generation_template_pin_stale");

    await app.firestore().doc(modeTemplateLifecycleDocumentPath(template.templateRef.templateId, template.templateRef.version)).set({
      schemaVersion: "v2-mode-template-lifecycle.v1",
      templateId: template.templateRef.templateId,
      version: template.templateRef.version,
      contentHash: template.templateRef.contentHash,
      status: "archived",
      reason: "retired",
      changedBy: "fixture",
      changedAt: "2026-07-17T00:00:01.000Z",
      lifecycleRevision: 2,
    });
    await expect(adminCreateV2GenerationPlan.run({ data: request("stale-pin"), auth } as never)).rejects.toThrow("v2_generation_template_pin_stale");
    await app.firestore().doc(modeTemplateLifecycleDocumentPath(template.templateRef.templateId, template.templateRef.version)).set({
      schemaVersion: "v2-mode-template-lifecycle.v1",
      templateId: template.templateRef.templateId,
      version: template.templateRef.version,
      contentHash: template.templateRef.contentHash,
      status: "published",
      reason: "restored",
      changedBy: "fixture",
      changedAt: "2026-07-17T00:00:02.000Z",
      lifecycleRevision: 3,
    });
  });

  it("queues one immutable plan, appends audit, and replays idempotently", async () => {
    const resolved = await createFirestoreModeTemplateResolver(app.firestore())(template.templateRef as never);
    expect(resolved).toBeDefined();
    const first = await adminCreateV2GenerationPlan.run({ data: request("queue-1"), auth } as never);
    expect(first).toMatchObject({ ok: true, jobId: "queue-1", state: "queued", replayed: false });
    const db = app.firestore();
    const job = await db.doc(`${JOBS}/queue-1`).get();
    expect(job.exists).toBe(true);
    expect(job.data()?.plan.stages).toHaveLength(13);
    expect(job.data()?.plan.localizationTasks).toHaveLength(1);
    const [stages, localizations, operations, audit] = await Promise.all([
      db.collection(STAGES).where("jobId", "==", "queue-1").get(),
      db.collection(LOCALIZATIONS).where("jobId", "==", "queue-1").get(),
      db.collection(OPERATIONS).where("jobId", "==", "queue-1").get(),
      db.collection("admin_log").where("operationId", "==", "queue-1").get(),
    ]);
    expect(stages.size).toBe(13);
    expect(stages.docs.find((item) => item.id === "v2_season_outline:season-emulator")?.data()).toMatchObject({ state: "queued", attempts: 0, maxAttempts: 3 });
    expect(new Set(stages.docs.map((item) => item.id)).size).toBe(13);
    expect(localizations.size).toBe(1);
    expect(operations.size).toBe(1);
    expect(audit.size).toBe(1);

    await expect(adminCreateV2GenerationPlan.run({ data: request("queue-1"), auth } as never)).resolves.toMatchObject({ ok: true, replayed: true, jobId: "queue-1" });
    const [jobsAfter, stagesAfter, operationsAfter, auditAfter] = await Promise.all([
      db.collection(JOBS).where("jobId", "==", "queue-1").get(),
      db.collection(STAGES).where("jobId", "==", "queue-1").get(),
      db.collection(OPERATIONS).where("jobId", "==", "queue-1").get(),
      db.collection("admin_log").where("operationId", "==", "queue-1").get(),
    ]);
    expect(jobsAfter.size).toBe(1);
    expect(stagesAfter.size).toBe(13);
    expect(operationsAfter.size).toBe(1);
    expect(auditAfter.size).toBe(1);
    await expect(getDoc(doc(environment.authenticatedContext("client-1").firestore(), `${JOBS}/queue-1`))).rejects.toBeDefined();
  });
});
