"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_studio_authoring_1 = require("../admin_content_studio_authoring");
const admin_content_studio_callables_1 = require("../admin_content_studio_callables");
describe("Season lifecycle callable contract", () => {
    it("parses the exact revision/CAS envelope", () => expect((0, admin_content_studio_authoring_1.parseV2SeasonLifecycleRequest)({ seasonRevisionId: "season-1__r1", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "reviewed and approved" })).toEqual({ seasonRevisionId: "season-1__r1", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "reviewed and approved" }));
    it("rejects unknown keys and invalid CAS", () => {
        expect(() => (0, admin_content_studio_authoring_1.parseV2SeasonLifecycleRequest)({ seasonRevisionId: "s", expectedLifecycleRevision: 0, idempotencyKey: "season-op-001", reason: "ok" })).toThrow(https_1.HttpsError);
        expect(() => (0, admin_content_studio_authoring_1.parseV2SeasonLifecycleRequest)({ seasonRevisionId: "s", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "ok", extra: true })).toThrow(https_1.HttpsError);
    });
    it("exports both authenticated callables", () => {
        expect(admin_content_studio_callables_1.adminApproveV2SeasonRevision).toBeDefined();
        expect(admin_content_studio_callables_1.adminArchiveV2SeasonRevision).toBeDefined();
    });
});
//# sourceMappingURL=season_lifecycle_callable_contract.test.js.map