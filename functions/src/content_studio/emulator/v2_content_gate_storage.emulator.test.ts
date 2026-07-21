import { readFileSync } from "node:fs";
import path from "node:path";
import * as admin from "firebase-admin";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ContentGateReceiptRepository } from "../content_gate_repository";
import { createFirestoreContentGateIssueStore } from "../firestore_authoring_store";
import { canonicalJsonV1, hashCanonicalBody } from "../../../../modules/learning-v2/policies/decision_registry";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");

describe("ContentGate immutable Storage emulator", () => {
  let environment: RulesTestEnvironment;
  let app: admin.app.App;
  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.STORAGE_EMULATOR_HOST) throw new Error("Firestore and Storage emulators are required");
    app = admin.initializeApp({ projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.appspot.com` }, `gate-${Date.now()}`);
    environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, "utf8") } });
  });
  afterAll(async () => { await environment?.cleanup(); await app?.delete(); });

  it("writes canonical gate bytes, persists record metadata, and rejects tampered bytes on read-back", async () => {
    const subject = { entityType: "episode" as const, entityId: "gate-episode", entityRevision: 1, entityFingerprint: "a".repeat(64) };
    await environment.withSecurityRulesDisabled(async (context) => {
      for (const [collection, hash, status] of [["content_studio_validation_receipts", "b".repeat(64), "passed"], ["content_studio_localization_receipts", "c".repeat(64), "approved"], ["content_studio_review_receipts", "d".repeat(64), "approved"]] as const) {
        await setDoc(doc(context.firestore(), collection, `${collection}-1`), { receiptHash: hash, subject, status, ...(collection.includes("review") ? { reviewerId: "reviewer-1" } : {}) });
      }
    });
    const repository = new ContentGateReceiptRepository(createFirestoreContentGateIssueStore(app.firestore(), {
      write: async (path, gateBody) => {
        const bytes = Buffer.from(canonicalJsonV1(gateBody), "utf8");
        const file = app.storage().bucket().file(path);
        await file.save(bytes, { resumable: false });
        const [metadata] = await file.getMetadata();
        return { objectGeneration: String(metadata.generation ?? ""), byteSize: bytes.byteLength, contentHash: hashCanonicalBody(gateBody) };
      },
    }), { actorId: "publisher-1" });
    const body = await repository.issue(subject, { validationReceiptId: "content_studio_validation_receipts-1", localizationReceiptId: "content_studio_localization_receipts-1", reviewReceiptId: "content_studio_review_receipts-1" }, "approve", "gate-emulator-1");
    const gateId = `${subject.entityType}__${subject.entityId}__r${subject.entityRevision}__${subject.entityFingerprint}`;
    const gateSnapshot = await app.firestore().doc(`content_studio_gate_receipts/${gateId}`).get();
    const envelope = gateSnapshot.data() as { body: unknown; record: { object: { objectPath: string; objectGeneration: string; byteSize: number; contentHash: string }; receiptHash: string } };
    expect(envelope.record.receiptHash).toBe(hashCanonicalBody(body));
    const file = app.storage().bucket().file(envelope.record.object.objectPath);
    const [bytes] = await file.download();
    expect(hashCanonicalBody(JSON.parse(bytes.toString("utf8")))).toBe(envelope.record.object.contentHash);
    await file.save(Buffer.from(canonicalJsonV1({ tampered: true }), "utf8"), { resumable: false });
    const [tampered] = await file.download();
    expect(hashCanonicalBody(JSON.parse(tampered.toString("utf8")))).not.toBe(envelope.record.object.contentHash);
  });
});
