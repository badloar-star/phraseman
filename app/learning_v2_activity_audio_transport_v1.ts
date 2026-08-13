import { getApp } from "@react-native-firebase/app";
import { fetch as expoFetch } from "expo/fetch";

import type { LearningV2ActivityAudioRuntimeEntryV1 } from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import {
  isCapturedAccountGenerationToken,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from "./account_generation";
import { initFirebaseAppCheckIfAvailable } from "./app_check_init";
import {
  isCurrentBackgroundNetworkLease,
  type BackgroundNetworkLease,
} from "./interactive_network_quiet";

export const LEARNING_V2_ACTIVITY_AUDIO_STORAGE_BUCKET_V1 =
  "phraseman-ea0b3.firebasestorage.app" as const;
export const LEARNING_V2_ACTIVITY_AUDIO_TRANSPORT_MAX_BYTES_V1 = 64 * 1024;

const PROJECT_ID = "phraseman-ea0b3";
const TOKEN_RE = /^[A-Za-z0-9._~-]{40,8192}$/u;
const PATH_RE =
  /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const MAX_STREAM_CHUNKS = 1_024;

type CredentialPair = Readonly<{
  authUid: string;
  authToken: string;
  appCheckToken: string;
}>;

export interface LearningV2ActivityAudioTransportHandleV1 {
  readonly __opaqueLearningV2ActivityAudioTransportHandleV1: unique symbol;
}

const transportHandles = new WeakSet<object>();
const transportCredentials = new WeakMap<object, CredentialPair>();
const transportAccounts = new WeakMap<object, AccountGenerationToken>();
const transportLeases = new WeakMap<object, BackgroundNetworkLease>();

function fail(): never {
  throw new Error("learning_v2_activity_audio_transport_invalid");
}

function currentFence(
  account: AccountGenerationToken,
  lease: BackgroundNetworkLease,
  authUid?: string,
): boolean {
  lease.assertCurrent();
  if (
    !isCapturedAccountGenerationToken(account) ||
    account.phase !== "active" ||
    !account.stableId ||
    !isCurrentAccountGeneration(account, account.stableId) ||
    !isCurrentBackgroundNetworkLease(lease) ||
    getApp()?.options?.projectId !== PROJECT_ID ||
    getApp()?.options?.storageBucket !==
      LEARNING_V2_ACTIVITY_AUDIO_STORAGE_BUCKET_V1
  )
    return false;
  if (authUid === undefined) return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require("@react-native-firebase/auth").default;
    return auth()?.currentUser?.uid === authUid;
  } catch {
    return false;
  }
}

function ownValue(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

async function credentials(
  account: AccountGenerationToken,
  lease: BackgroundNetworkLease,
): Promise<CredentialPair> {
  if (!currentFence(account, lease)) fail();
  if (!(await initFirebaseAppCheckIfAvailable())) fail();
  if (!currentFence(account, lease)) fail();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authModule = require("@react-native-firebase/auth");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appCheck = require("@react-native-firebase/app-check").default;
    const user = authModule.default()?.currentUser;
    const authUid = user?.uid;
    if (
      !user ||
      typeof user !== "object" ||
      typeof authUid !== "string" ||
      authUid.length < 1 ||
      authUid.length > 256 ||
      typeof authModule.getIdTokenResult !== "function" ||
      typeof appCheck !== "function"
    )
      fail();
    lease.assertCurrent();
    const authResult = await authModule.getIdTokenResult(user, false);
    if (!currentFence(account, lease, authUid)) fail();
    const authToken = ownValue(authResult, "token");
    const expirationTime = ownValue(authResult, "expirationTime");
    if (
      typeof authToken !== "string" ||
      !TOKEN_RE.test(authToken) ||
      typeof expirationTime !== "string" ||
      !Number.isFinite(Date.parse(expirationTime)) ||
      Date.parse(expirationTime) - Date.now() < 120_000
    )
      fail();
    lease.assertCurrent();
    const appCheckResult = await appCheck().getToken(false);
    if (!currentFence(account, lease, authUid)) fail();
    const appCheckToken = ownValue(appCheckResult, "token");
    if (typeof appCheckToken !== "string" || !TOKEN_RE.test(appCheckToken))
      fail();
    return Object.freeze({ authUid, authToken, appCheckToken });
  } catch {
    fail();
  }
}

function exactEntry(entry: LearningV2ActivityAudioRuntimeEntryV1): void {
  if (
    !entry ||
    typeof entry !== "object" ||
    !PATH_RE.test(entry.objectPath) ||
    !HASH_RE.test(entry.contentHash) ||
    !entry.objectPath.endsWith(`/${entry.contentHash}.mp3`) ||
    !Number.isSafeInteger(entry.byteSize) ||
    entry.byteSize < 1 ||
    entry.byteSize > LEARNING_V2_ACTIVITY_AUDIO_TRANSPORT_MAX_BYTES_V1 ||
    entry.contentType !== "audio/mpeg"
  )
    fail();
}

async function readExactBytes(
  response: Awaited<ReturnType<typeof expoFetch>>,
  expectedByteSize: number,
): Promise<Uint8Array> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0];
  const contentLength = response.headers.get("content-length");
  if (
    !response.ok ||
    contentType !== "audio/mpeg" ||
    (contentLength !== null && Number(contentLength) !== expectedByteSize) ||
    !response.body
  )
    fail();
  const reader = response.body.getReader();
  const output = new Uint8Array(expectedByteSize);
  let offset = 0;
  let chunks = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      chunks += 1;
      if (
        !(next.value instanceof Uint8Array) ||
        chunks > MAX_STREAM_CHUNKS ||
        offset + next.value.byteLength > expectedByteSize
      )
        fail();
      output.set(next.value, offset);
      offset += next.value.byteLength;
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // The body may already be terminal.
    }
  }
  if (offset !== expectedByteSize) fail();
  return output;
}

export async function downloadLearningV2ActivityAudioBytesV1(input: {
  readonly entry: LearningV2ActivityAudioRuntimeEntryV1;
  readonly transport: LearningV2ActivityAudioTransportHandleV1;
}): Promise<Uint8Array> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "entry|transport" ||
    !transportHandles.has(input.transport as object)
  )
    fail();
  const account = transportAccounts.get(input.transport as object);
  const lease = transportLeases.get(input.transport as object);
  const pair = transportCredentials.get(input.transport as object);
  if (
    !account ||
    !lease ||
    !pair ||
    !currentFence(account, lease, pair.authUid)
  )
    fail();
  exactEntry(input.entry);
  const url =
    `https://firebasestorage.googleapis.com/v0/b/${LEARNING_V2_ACTIVITY_AUDIO_STORAGE_BUCKET_V1}/o/` +
    `${encodeURIComponent(input.entry.objectPath)}?alt=media`;
  const response = await expoFetch(url, {
    method: "GET",
    headers: {
      Authorization: `Firebase ${pair.authToken}`,
      "X-Firebase-AppCheck": pair.appCheckToken,
    },
    signal: lease.signal,
    redirect: "error",
    credentials: "omit",
  });
  if (!currentFence(account, lease, pair.authUid)) fail();
  const bytes = await readExactBytes(response, input.entry.byteSize);
  if (!currentFence(account, lease, pair.authUid)) fail();
  return bytes;
}

export async function createLearningV2ActivityAudioTransportV1(input: {
  readonly account: AccountGenerationToken;
  readonly lease: BackgroundNetworkLease;
}): Promise<LearningV2ActivityAudioTransportHandleV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "account|lease" ||
    !currentFence(input.account, input.lease)
  )
    fail();
  const pair = await credentials(input.account, input.lease);
  if (!currentFence(input.account, input.lease, pair.authUid)) fail();
  const handle = Object.freeze({}) as LearningV2ActivityAudioTransportHandleV1;
  transportHandles.add(handle);
  transportCredentials.set(handle, pair);
  transportAccounts.set(handle, input.account);
  transportLeases.set(handle, input.lease);
  return handle;
}
