"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
describe("DecisionRegistry body-only Firestore index envelope", () => {
    it("accepts the canonical record without body and rejects a valid record plus inline body", () => {
        const fixture = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, "../../../tests/fixtures/learning-v2/content-studio/decision-registry.v1.json"), "utf8"));
        expect((0, decision_registry_1.validateDecisionRegistryRecord)(fixture.baseline.record).ok).toBe(true);
        expect((0, decision_registry_1.validateDecisionRegistryRecord)({
            ...fixture.baseline.record,
            body: fixture.baseline.body,
        }).ok).toBe(false);
    });
});
//# sourceMappingURL=decision_registry_record_envelope.test.js.map