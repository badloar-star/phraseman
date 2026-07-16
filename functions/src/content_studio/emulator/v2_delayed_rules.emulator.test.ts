import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
const COLLECTIONS = [
  "learning_v2_assignments",
  "learning_v2_launches",
  "learning_v2_timing_receipts",
  "learning_v2_failure_receipts",
  "learning_v2_receipt_operations",
] as const;

describe("Learning V2 delayed Firestore emulator rules", () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });
  afterAll(async () => environment?.cleanup());

  test.each(COLLECTIONS)(
    "denies direct client access to %s",
    async (collectionName) => {
      const db = environment.authenticatedContext("uid-1").firestore();
      await assertFails(getDoc(doc(db, collectionName, "doc-1")));
      await assertFails(getDocs(collection(db, collectionName)));
      await assertFails(
        setDoc(doc(db, collectionName, "doc-1"), { ownerUid: "uid-1" }),
      );
      await assertFails(
        updateDoc(doc(db, collectionName, "doc-1"), { touched: true }),
      );
      await assertFails(deleteDoc(doc(db, collectionName, "doc-1")));
    },
  );
});
