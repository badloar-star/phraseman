import { HttpsError } from "firebase-functions/v2/https";
import { parseV2SeasonLifecycleRequest } from "../admin_content_studio_authoring";
import { adminApproveV2SeasonRevision, adminArchiveV2SeasonRevision } from "../admin_content_studio_callables";

describe("Season lifecycle callable contract", () => {
  it("parses the exact revision/CAS envelope", () => expect(parseV2SeasonLifecycleRequest({ seasonRevisionId: "season-1__r1", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "reviewed and approved" })).toEqual({ seasonRevisionId: "season-1__r1", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "reviewed and approved" }));
  it("rejects unknown keys and invalid CAS", () => {
    expect(() => parseV2SeasonLifecycleRequest({ seasonRevisionId: "s", expectedLifecycleRevision: 0, idempotencyKey: "season-op-001", reason: "ok" })).toThrow(HttpsError);
    expect(() => parseV2SeasonLifecycleRequest({ seasonRevisionId: "s", expectedLifecycleRevision: 1, idempotencyKey: "season-op-001", reason: "ok", extra: true })).toThrow(HttpsError);
  });
  it("exports both authenticated callables", () => {
    expect(adminApproveV2SeasonRevision).toBeDefined();
    expect(adminArchiveV2SeasonRevision).toBeDefined();
  });
});
