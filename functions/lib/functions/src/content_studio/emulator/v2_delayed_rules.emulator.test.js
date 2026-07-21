"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const firestore_1 = require("firebase/firestore");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const COLLECTIONS = [
    "learning_v2_assignments",
    "learning_v2_launches",
    "learning_v2_timing_receipts",
    "learning_v2_failure_receipts",
    "learning_v2_receipt_operations",
];
describe("Learning V2 delayed Firestore emulator rules", () => {
    let environment;
    beforeAll(async () => {
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") },
        });
    });
    afterAll(async () => environment?.cleanup());
    test.each(COLLECTIONS)("denies direct client access to %s", async (collectionName) => {
        const db = environment.authenticatedContext("uid-1").firestore();
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.getDoc)((0, firestore_1.doc)(db, collectionName, "doc-1")));
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.getDocs)((0, firestore_1.collection)(db, collectionName)));
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.setDoc)((0, firestore_1.doc)(db, collectionName, "doc-1"), { ownerUid: "uid-1" }));
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.updateDoc)((0, firestore_1.doc)(db, collectionName, "doc-1"), { touched: true }));
        await (0, rules_unit_testing_1.assertFails)((0, firestore_1.deleteDoc)((0, firestore_1.doc)(db, collectionName, "doc-1")));
    });
});
//# sourceMappingURL=v2_delayed_rules.emulator.test.js.map