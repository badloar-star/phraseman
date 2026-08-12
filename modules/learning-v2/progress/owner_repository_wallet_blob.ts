import { detachBoundedWalletJson } from "../contracts/wallet";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import { parseWalletState, type WalletStateV1 } from "./wallet_reducer";

export interface OwnerRepositoryWalletStateBlobV1 {
  readonly ref: OwnerRepositoryBlobRefV1 & { readonly kind: "wallet_state" };
  readonly encoded: string;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 512 * 1024;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
const ENVELOPE_KEYS = ["schemaVersion", "accountScopeHash", "kind", "payload"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => { throw new Error("owner_repository_wallet_blob_invalid"); };
const readRecord = (input: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length || ownKeys.some((key) =>
    typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
    const descriptor = descriptors[key];
    return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
  })) return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;

export const materializeOwnerRepositoryWalletStateBlob = (
  input: unknown,
): Readonly<{ readonly state: WalletStateV1; readonly blob: OwnerRepositoryWalletStateBlobV1 }> => {
  let state: WalletStateV1;
  try { state = parseWalletState(input); }
  catch { return invalid(); }
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash: state.accountScopeHash,
    kind: "wallet_state" as const,
    payload: state,
  };
  let encoded: string;
  try { encoded = canonicalJsonV1(envelope); }
  catch { return invalid(); }
  if (utf8ByteLengthV1(encoded) > MAX_BYTES) throw new Error("owner_repository_wallet_blob_overflow");
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    state,
    blob: {
      encoded,
      ref: {
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
        kind: "wallet_state" as const,
        blobKey: blobKey(state.accountScopeHash, blobFingerprint),
        blobFingerprint,
      },
    },
  });
};

export const parseOwnerRepositoryWalletStateBlob = (input: unknown): Readonly<{
  state: WalletStateV1;
  blob: OwnerRepositoryWalletStateBlobV1;
}> => {
  let request: Readonly<Record<string, unknown>>;
  let refValue: Readonly<Record<string, unknown>>;
  try {
    request = readRecord(input, ["accountScopeHash", "ref", "raw"]);
    refValue = readRecord(request.ref, REF_KEYS);
  } catch { return invalid(); }
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.raw !== "string" ||
    refValue.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    refValue.kind !== "wallet_state" || typeof refValue.blobFingerprint !== "string" ||
    !HASH.test(refValue.blobFingerprint) ||
    refValue.blobKey !== blobKey(request.accountScopeHash, refValue.blobFingerprint)) return invalid();
  let detachedEnvelope: unknown;
  try {
    if (utf8ByteLengthV1(request.raw) > MAX_BYTES ||
      sha256Utf8(request.raw) !== refValue.blobFingerprint) return invalid();
    const parsed = JSON.parse(request.raw) as unknown;
    detachedEnvelope = detachBoundedWalletJson(parsed, "owner_repository_wallet_blob_invalid");
    if (canonicalJsonV1(detachedEnvelope) !== request.raw) return invalid();
  } catch { return invalid(); }
  if (!isRecord(detachedEnvelope) || !Reflect.ownKeys(detachedEnvelope).every(
    (key) => typeof key === "string" && (ENVELOPE_KEYS as readonly string[]).includes(key)) ||
    Reflect.ownKeys(detachedEnvelope).length !== ENVELOPE_KEYS.length ||
    detachedEnvelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    detachedEnvelope.accountScopeHash !== request.accountScopeHash ||
    detachedEnvelope.kind !== "wallet_state") return invalid();
  let rebuilt: ReturnType<typeof materializeOwnerRepositoryWalletStateBlob>;
  try { rebuilt = materializeOwnerRepositoryWalletStateBlob(detachedEnvelope.payload); }
  catch { return invalid(); }
  if (rebuilt.blob.encoded !== request.raw ||
    rebuilt.blob.ref.blobFingerprint !== refValue.blobFingerprint ||
    rebuilt.blob.ref.blobKey !== refValue.blobKey) return invalid();
  return rebuilt;
};
