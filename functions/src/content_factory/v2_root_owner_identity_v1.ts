import { createHash } from "node:crypto";
import { defineString } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  requireAdminPlansOwner,
  type AdminPlansAuth,
} from "../admin_plans/auth";

export const V2_ROOT_OWNER_IDENTITY_POLICY_V1 = Object.freeze({
  policyId: "learning-v2-root-owner-identity",
  policyVersion: 1,
  parameterName: "LEARNING_V2_ROOT_OWNER_UID_SHA256",
});
export const V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1 = hashCanonicalBody(
  V2_ROOT_OWNER_IDENTITY_POLICY_V1,
);

const rootOwnerUidSha256 = defineString(
  V2_ROOT_OWNER_IDENTITY_POLICY_V1.parameterName,
  { default: "" },
);
const HASH_RE = /^[a-f0-9]{64}$/u;

export interface V2ConfiguredRootOwnerV1 {
  readonly actorUid: string;
  readonly role: "owner";
  readonly ownerIdentityFingerprint: string;
  readonly authenticationAuthority: "firebase_auth_explicit_owner_role_and_server_configured_uid_hash";
  readonly identityPolicyFingerprint: string;
}

export function requireV2ConfiguredRootOwnerV1(
  auth: AdminPlansAuth | null | undefined,
  configuredUidSha256 = rootOwnerUidSha256.value(),
): V2ConfiguredRootOwnerV1 {
  const owner = requireAdminPlansOwner(auth);
  if (
    typeof configuredUidSha256 !== "string" ||
    !HASH_RE.test(configuredUidSha256) ||
    createHash("sha256").update(owner.actorUid).digest("hex") !==
      configuredUidSha256
  )
    throw new HttpsError(
      "permission-denied",
      "Learning V2 configured root owner required",
    );
  return Object.freeze({
    actorUid: owner.actorUid,
    role: "owner" as const,
    ownerIdentityFingerprint: hashCanonicalBody({
      schemaVersion: "v2-root-owner-identity.v1",
      uidSha256: configuredUidSha256,
      identityPolicyFingerprint: V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
    }),
    authenticationAuthority:
      "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
    identityPolicyFingerprint: V2_ROOT_OWNER_IDENTITY_POLICY_FINGERPRINT_V1,
  });
}
