"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1 = exports.V2_ROOT_OWNER_IDENTITY_POLICY_V1 = void 0;
exports.requireV2ConfiguredRootOwnerV1 = requireV2ConfiguredRootOwnerV1;
const node_crypto_1 = require("node:crypto");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const auth_1 = require("../admin_plans/auth");
exports.V2_ROOT_OWNER_IDENTITY_POLICY_V1 = Object.freeze({
    policyId: "learning-v2-root-owner-identity",
    policyVersion: 1,
    parameterName: "LEARNING_V2_ROOT_OWNER_UID_SHA256",
});
exports.V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1 = (0, decision_registry_1.hashCanonicalBody)(exports.V2_ROOT_OWNER_IDENTITY_POLICY_V1);
const rootOwnerUidSha256 = (0, params_1.defineString)(exports.V2_ROOT_OWNER_IDENTITY_POLICY_V1.parameterName, { default: "" });
const HASH_RE = /^[a-f0-9]{64}$/u;
function requireV2ConfiguredRootOwnerV1(auth, configuredUidSha256 = rootOwnerUidSha256.value()) {
    const owner = (0, auth_1.requireAdminPlansOwner)(auth);
    if (typeof configuredUidSha256 !== "string" ||
        !HASH_RE.test(configuredUidSha256) ||
        (0, node_crypto_1.createHash)("sha256").update(owner.actorUid).digest("hex") !==
            configuredUidSha256)
        throw new https_1.HttpsError("permission-denied", "Learning V2 configured root owner required");
    return Object.freeze({
        actorUid: owner.actorUid,
        role: "owner",
        ownerIdentityFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            schemaVersion: "v2-root-owner-identity.v1",
            uidSha256: configuredUidSha256,
            identityPolicyFingerprint: exports.V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
        }),
        authenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash",
        identityPolicyFingerprint: exports.V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
    });
}
//# sourceMappingURL=v2_root_owner_identity_v1.js.map