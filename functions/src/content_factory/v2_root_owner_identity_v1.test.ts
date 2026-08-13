import { createHash } from "node:crypto";
import {
  V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
  requireV2ConfiguredRootOwnerV1,
} from "./v2_root_owner_identity_v1";

const uid = "owner-uid";
const uidHash = createHash("sha256").update(uid).digest("hex");

describe("Learning V2 configured root owner identity", () => {
  it("requires explicit owner role and the exact server-configured UID hash", () => {
    expect(
      requireV2ConfiguredRootOwnerV1(
        { uid, token: { admin: true, adminRole: "owner" } },
        uidHash,
      ),
    ).toMatchObject({
      actorUid: uid,
      role: "owner",
      authenticationAuthority:
        "firebase_auth_explicit_owner_role_and_server_configured_uid_hash",
      identityPolicyFingerprint: V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
      ownerIdentityFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it.each([
    ["empty configuration", ""],
    ["wrong owner", createHash("sha256").update("other").digest("hex")],
    ["malformed configuration", "a".repeat(63)],
  ])("fails closed for %s", (_label, configured) => {
    expect(() =>
      requireV2ConfiguredRootOwnerV1(
        { uid, token: { admin: true, adminRole: "owner" } },
        configured,
      ),
    ).toThrow("Learning V2 configured root owner required");
  });

  it("does not accept admin or reviewer roles", () => {
    expect(() =>
      requireV2ConfiguredRootOwnerV1(
        { uid, token: { admin: true, adminRole: "admin" } },
        uidHash,
      ),
    ).toThrow("Owner admin claim required");
  });
});
