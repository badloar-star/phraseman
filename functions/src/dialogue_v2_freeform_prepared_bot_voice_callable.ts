import { createHmac } from "node:crypto";
import { types as nodeTypes } from "node:util";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { ENFORCE_APP_CHECK_OPENAI } from "./callable_options";
import type { DialogueV2FreeformPreparedBotVoiceFirestoreRuntime } from "./dialogue_v2_freeform_prepared_bot_voice_firestore_repository";
import { createDialogueV2FreeformPreparedBotVoiceInternalResolver } from "./dialogue_v2_freeform_prepared_bot_voice_resolver";
import { DIALOGUE_V2_SESSION_HMAC_KEY } from "./dialogue_v2_session_production_runtime";

const buildInternalResolver =
  createDialogueV2FreeformPreparedBotVoiceInternalResolver;
const isProxyObject = nodeTypes.isProxy;
const CallableHttpsError = HttpsError;
const enforceAppCheck = ENFORCE_APP_CHECK_OPENAI;
const dialogueSessionHmacKey = DIALOGUE_V2_SESSION_HMAC_KEY;
const REGION = "us-central1";
const ELIGIBILITY_HMAC_NAMESPACE =
  "dialogue-v2-freeform-prepared-bot-voice-eligibility.v1";

type PublicRequest = Readonly<{
  auth?: Readonly<{ uid?: unknown }>;
  app?: Readonly<{ appId?: unknown }>;
  data?: unknown;
}>;

type PublicResult = Readonly<{
  selection: null;
}>;

export type DialogueV2FreeformPreparedBotVoicePublicDependencies = Readonly<{
  resolveInternal(request: PublicRequest): Promise<unknown>;
}>;

const SAFE_ERRORS = new Set([
  "unauthenticated:auth_required",
  "invalid-argument:dialogue_v2_freeform_bot_voice_request_invalid",
  "failed-precondition:dialogue_v2_freeform_bot_voice_app_check_required",
  "unavailable:dialogue_v2_freeform_bot_voice_unavailable",
]);

function unavailable(): HttpsError {
  return new CallableHttpsError(
    "unavailable",
    "dialogue_v2_freeform_bot_voice_unavailable",
  );
}

function safeBoundaryError(error: unknown): HttpsError {
  if (
    error instanceof CallableHttpsError &&
    SAFE_ERRORS.has(`${error.code}:${error.message}`)
  ) {
    return new CallableHttpsError(error.code, error.message);
  }
  return unavailable();
}

function isExactTextOnlyResult(value: unknown): boolean {
  try {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      isProxyObject(value)
    ) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.length !== 2 ||
      !keys.includes("ok") ||
      !keys.includes("selection")
    )
      return false;
    const ok = descriptors.ok;
    const selection = descriptors.selection;
    return Boolean(
      ok?.enumerable &&
      "value" in ok &&
      ok.value === true &&
      selection?.enumerable &&
      "value" in selection &&
      selection.value === null,
    );
  } catch {
    return false;
  }
}

/**
 * Public projection of the accepted internal resolver. While the reviewed
 * server catalog is null, the only successful response is the text-only
 * sentinel. Any future internal selection stays private until a separately
 * reviewed public contract is introduced.
 */
export function createDialogueV2FreeformPreparedBotVoicePublicHandler(
  dependencies: DialogueV2FreeformPreparedBotVoicePublicDependencies,
): (request: PublicRequest) => Promise<PublicResult> {
  const resolveInternal = dependencies.resolveInternal;
  return async (request) => {
    let result: unknown;
    try {
      result = await resolveInternal(request);
    } catch (error) {
      // зачем (PM-252 п.4): отказ подбора голоса бота был немым.
      console.warn('[DIALOGUE-V2-BOT-VOICE] refused', JSON.stringify({
        stage: 'resolve',
        error: String((error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error).slice(0, 160),
      }));
      throw safeBoundaryError(error);
    }
    if (!isExactTextOnlyResult(result)) {
      console.warn('[DIALOGUE-V2-BOT-VOICE] refused', JSON.stringify({ stage: 'result_not_text_only' }));
      throw unavailable();
    }
    return Object.freeze({ selection: null });
  };
}

export function createDialogueV2FreeformPreparedBotVoiceProductionHandler(
  runtime: Omit<
    DialogueV2FreeformPreparedBotVoiceFirestoreRuntime,
    "serverCatalog"
  >,
): ReturnType<typeof createDialogueV2FreeformPreparedBotVoicePublicHandler> {
  const resolveInternal = buildInternalResolver(runtime, enforceAppCheck);
  return createDialogueV2FreeformPreparedBotVoicePublicHandler(
    Object.freeze({
      resolveInternal,
    }),
  );
}

function secretKey(): string {
  const value = String(
    dialogueSessionHmacKey.value() ||
      process.env.DIALOGUE_V2_SESSION_HMAC_KEY ||
      "",
  );
  if (value.length < 32 || value.length > 512) {
    throw new Error("dialogue_v2_freeform_bot_voice_secret_unavailable");
  }
  return value;
}

function digest(namespace: string, fields: readonly string[]): string {
  const hmac = createHmac("sha256", secretKey());
  hmac.update(namespace);
  for (const field of fields) {
    hmac.update("\u0000");
    hmac.update(field);
  }
  return hmac.digest("hex");
}

function productionHandler(): ReturnType<
  typeof createDialogueV2FreeformPreparedBotVoicePublicHandler
> {
  return createDialogueV2FreeformPreparedBotVoiceProductionHandler({
    db: admin.firestore(),
    nowMs: Date.now,
    bindOwner: ({ namespace, actor }) =>
      digest(namespace, [actor.authUid, actor.stableAccountId]),
    computeEligibilityHmac: (material) =>
      digest(ELIGIBILITY_HMAC_NAMESPACE, [material]),
    timestampFromMillis: (millis) =>
      admin.firestore.Timestamp.fromMillis(millis),
  });
}

export const DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_RESOLVE_OPTIONS =
  Object.freeze({
    region: REGION,
    enforceAppCheck,
    timeoutSeconds: 20,
    memory: "256MiB" as const,
    minInstances: 0,
    maxInstances: 20,
    secrets: [dialogueSessionHmacKey],
  });

export const dialogueV2FreeformPreparedBotVoiceResolve = onCall(
  DIALOGUE_V2_FREEFORM_PREPARED_BOT_VOICE_RESOLVE_OPTIONS,
  async (request) => productionHandler()(request),
);
