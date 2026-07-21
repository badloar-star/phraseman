import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { adminArchiveV2ModeTemplate, adminDeprecateV2ModeTemplate, adminPublishV2ModeTemplate } from "../../admin_content_studio_callables";
import { sha256Utf8 } from "../../../../modules/learning-v2/policies/decision_registry";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
const hash = "a".repeat(64);
const subject = { entityType: "mode_template", entityId: "template-emulator", entityRevision: 1, entityFingerprint: hash };
const versionPath = "content_mode_template_versions/template-emulator__v1";
const lifecyclePath = "content_mode_template_lifecycle/template-emulator__v1";
const receiptDocs = {
  "content_studio_validation_receipts/validation-1": { receiptHash: "b".repeat(64), subject, status: "passed" },
  "content_studio_localization_receipts/localization-1": { receiptHash: "c".repeat(64), subject, status: "approved" },
  "content_studio_review_receipts/review-1": { receiptHash: "d".repeat(64), subject, status: "approved" },
  "content_studio_gate_receipts/gate-1": {
    schemaVersion: "content-gate-receipt-body.v1", gateKind: "approval", subject,
    validationReceiptHash: "b".repeat(64), localizationReceiptSetHash: "c".repeat(64), reviewReceiptHash: "d".repeat(64), waiverSetHash: "e".repeat(64), evaluatedBy: "publisher-1", evaluatedAt: "2026-07-16T00:00:00.000Z",
  },
};

describe("ModeTemplate lifecycle callables on Firestore emulator", () => {
  let environment: RulesTestEnvironment;
  let app: admin.app.App;
  const auth = { uid: "publisher-1", token: { admin: true, adminRole: "owner" } };

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Firestore emulator is required");
    app = admin.initializeApp({ projectId: PROJECT_ID });
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, "utf8") } });
  });
  afterAll(async () => { await environment?.cleanup(); await app?.delete(); });

  it("publishes once, appends audit, and rejects stale replay", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, versionPath), { schemaVersion: "v2-mode-template-record.v1", templateId: "template-emulator", version: 1, contentHash: hash, object: { objectPath: "content-studio/mode-templates/x/v1/x.json", contentHash: hash, objectGeneration: "g-1", byteSize: 1 }, provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" }, createdAt: "2026-07-16T00:00:00.000Z" });
      await setDoc(doc(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "approved", reason: "reviewed", changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
      for (const [key, value] of Object.entries(receiptDocs)) await setDoc(doc(db, key), value);
    });
    const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 1, idempotencyKey: "op-publish-1", reason: "publish", receiptIds: { validationReceiptId: "validation-1", localizationReceiptId: "localization-1", reviewReceiptId: "review-1", gateReceiptId: "gate-1" } };
    const result = await adminPublishV2ModeTemplate.run({ data, auth } as never);
    expect(result.ok).toBe(true);
    const snapshot = await admin.firestore().doc(lifecyclePath).get();
    expect(snapshot.data()?.status).toBe("published");
    expect((await admin.firestore().doc("content_mode_template_lifecycle_audit/template-emulator__v1__r2").get()).exists).toBe(true);
    await expect(adminPublishV2ModeTemplate.run({ data, auth } as never)).resolves.toMatchObject({ ok: true, lifecycle: { lifecycleRevision: 2 } });
    await expect(adminPublishV2ModeTemplate.run({ data: { ...data, reason: "changed" }, auth } as never)).rejects.toThrow();
  });

  it("deprecates with a resolved published replacement and writes audit", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "published", reason: "publish", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 2 });
      await setDoc(doc(db, "content_mode_template_versions/template-emulator-2__v1"), { schemaVersion: "v2-mode-template-record.v1", templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64), object: { objectPath: `content-studio/mode-templates/${sha256Utf8("template-emulator-2")}/v1/${"b".repeat(64)}.json`, contentHash: "b".repeat(64), objectGeneration: "g-2", byteSize: 1 }, provenance: { createdBy: "owner-1", createdAt: "2026-07-16T00:00:00.000Z" }, createdAt: "2026-07-16T00:00:00.000Z" });
      await setDoc(doc(db, "content_mode_template_lifecycle/template-emulator-2__v1"), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64), status: "published", reason: "replacement-ready", changedBy: "publisher-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 1 });
    });
    const result = await adminDeprecateV2ModeTemplate.run({ data: { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 2, idempotencyKey: "op-deprecate-1", reason: "replaced", replacementRef: { templateId: "template-emulator-2", version: 1, contentHash: "b".repeat(64) } }, auth } as never);
    expect(result.ok).toBe(true);
    expect((await admin.firestore().doc(lifecyclePath).get()).data()?.status).toBe("deprecated");
  });

  it("fails closed when an existing idempotency operation is malformed", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "approved", reason: "re-reviewed", changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 10 });
      await setDoc(doc(db, "content_mode_template_lifecycle_operations/malformed-op"), { requestFingerprint: "not-a-complete-operation" });
    });
    const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 10, idempotencyKey: "malformed-op", reason: "publish-again", receiptIds: { validationReceiptId: "validation-1", localizationReceiptId: "localization-1", reviewReceiptId: "review-1", gateReceiptId: "gate-1" } };
    await expect(adminPublishV2ModeTemplate.run({ data, auth } as never)).rejects.toThrow("mode_template_idempotency_operation_invalid");
  });

  it("blocks archive for an open Episode draft, then archives and replays after closure", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, lifecyclePath), { schemaVersion: "v2-mode-template-lifecycle.v1", templateId: "template-emulator", version: 1, contentHash: hash, status: "deprecated", reason: "retired", noReplacement: true, changedBy: "reviewer-1", changedAt: "2026-07-16T00:00:00.000Z", lifecycleRevision: 20 });
      await setDoc(doc(db, "content_episode_drafts/open-draft"), {
        body: { activities: [{ activityId: "a-1", templateRef: { templateId: "template-emulator", version: 1, contentHash: hash } }] },
        record: { status: "draft" },
      });
    });
    const data = { templateRef: { templateId: "template-emulator", version: 1, contentHash: hash }, expectedLifecycleRevision: 20, idempotencyKey: "op-archive-open", reason: "archive" };
    await expect(adminArchiveV2ModeTemplate.run({ data, auth } as never)).rejects.toThrow("mode_template_archive_open_episode_draft");
    await environment.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), "content_episode_drafts/open-draft"));
    });
    const closedData = { ...data, idempotencyKey: "op-archive-closed" };
    await expect(adminArchiveV2ModeTemplate.run({ data: closedData, auth } as never)).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived" } });
    await expect(adminArchiveV2ModeTemplate.run({ data: closedData, auth } as never)).resolves.toMatchObject({ ok: true, lifecycle: { status: "archived" } });
  });
});
