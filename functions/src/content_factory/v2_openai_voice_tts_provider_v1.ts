import { createHash } from "node:crypto";
import {
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  resolveV2VoiceTtsWorkOrderMaterialV1,
  type V2VoiceTtsWorkItemV1,
  type V2VoiceTtsWorkOrderHandleV1,
} from "./v2_voice_tts_work_order_v1";
import { validateV2VoiceMp3CodecV1 } from "./v2_voice_mp3_codec_v1";

export const V2_OPENAI_VOICE_TTS_ENDPOINT_V1 =
  "https://api.openai.com/v1/audio/speech" as const;
export const V2_OPENAI_VOICE_TTS_TIMEOUT_MS_V1 = 60_000;
export const V2_OPENAI_VOICE_TTS_MAX_CONCURRENCY_V1 = 2;
export const V2_OPENAI_VOICE_TTS_BATCH_MAX_ITEMS_V1 = 32;
export const V2_OPENAI_VOICE_TTS_INPUT_MAX_UTF8_BYTES_V1 = 4_096;
export const V2_OPENAI_VOICE_TTS_RESULT_SCHEMA_V1 =
  "v2-openai-voice-tts-result.v1" as const;

export interface V2OpenAiVoiceTtsGeneratedAudioV1 {
  readonly generationTargetFingerprint: string;
  readonly itemFingerprint: string;
  readonly voiceId: V2VoiceTtsWorkItemV1["voiceId"];
  readonly inputKind: V2VoiceTtsWorkItemV1["inputKind"];
  readonly wordOrdinal: number | null;
  readonly contentType: "audio/mpeg";
  readonly byteSize: number;
  readonly rawSha256: string;
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly bytes: Uint8Array;
}

export interface V2OpenAiVoiceTtsExecutionResultV1 {
  readonly schemaVersion: typeof V2_OPENAI_VOICE_TTS_RESULT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly workOrderFingerprint: string;
  readonly requestedItemCount: number;
  readonly totalWorkItemCount: number;
  readonly batchStartIndex: number;
  readonly batchItemCount: number;
  readonly generatedItemCount: number;
  readonly generatedBytes: number;
  readonly provider: "openai";
  readonly endpointPolicy: "exact_audio_speech_only";
  readonly providerExecutionAuthority: "provider_response_observed_in_process";
  readonly audioByteAuthority: "unpersisted_provider_response_bytes";
  readonly storageAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly generated: readonly Readonly<{
    generationTargetFingerprint: string;
    itemFingerprint: string;
    voiceId: V2VoiceTtsWorkItemV1["voiceId"];
    inputKind: V2VoiceTtsWorkItemV1["inputKind"];
    wordOrdinal: number | null;
    contentType: "audio/mpeg";
    byteSize: number;
    rawSha256: string;
    codecRulesFingerprint: string;
    codecResultFingerprint: string;
  }>[];
  readonly resultFingerprint: string;
}

export interface V2OpenAiVoiceTtsExecutionHandleV1 {
  readonly __opaqueV2OpenAiVoiceTtsExecutionHandleV1: unique symbol;
}

export interface V2OpenAiVoiceTtsExecutionMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly summary: V2OpenAiVoiceTtsExecutionResultV1;
  readonly generated: readonly V2OpenAiVoiceTtsGeneratedAudioV1[];
}

export interface V2OpenAiVoiceTtsProviderV1 {
  execute(input: {
    readonly workOrderHandle: V2VoiceTtsWorkOrderHandleV1;
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly batchStartIndex: number;
    readonly batchItemCount: number;
  }): Promise<V2OpenAiVoiceTtsExecutionHandleV1>;
}

export interface V2OpenAiVoiceTtsTransportResponseV1 {
  readonly ok: boolean;
  readonly status: number;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
}

export interface V2OpenAiVoiceTtsTransportV1 {
  request(input: {
    readonly endpoint: typeof V2_OPENAI_VOICE_TTS_ENDPOINT_V1;
    readonly apiKey: string;
    readonly timeoutMs: typeof V2_OPENAI_VOICE_TTS_TIMEOUT_MS_V1;
    readonly maximumResponseBytes: number;
    readonly body: Readonly<{
      model: "gpt-4o-mini-tts";
      voice: V2VoiceTtsWorkItemV1["voiceId"];
      input: string;
      speed: 1;
      instructions: string;
      response_format: "mp3";
    }>;
  }): Promise<V2OpenAiVoiceTtsTransportResponseV1>;
}

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

const executionHandles = new WeakSet<object>();
const executionMetadata = new WeakMap<
  object,
  V2OpenAiVoiceTtsExecutionMaterialV1
>();

function exactApiKey(value: string): string {
  if (
    typeof value !== "string" ||
    value.length < 20 ||
    value.length > 512 ||
    /[\u0000-\u0020\u007f]/u.test(value)
  )
    fail("v2_openai_voice_tts_api_key_invalid");
  return value;
}

function validateItem(item: V2VoiceTtsWorkItemV1): void {
  if (
    utf8ByteLengthV1(item.inputText) < 1 ||
    utf8ByteLengthV1(item.inputText) >
      V2_OPENAI_VOICE_TTS_INPUT_MAX_UTF8_BYTES_V1 ||
    item.model !== "gpt-4o-mini-tts" ||
    item.format !== "mp3" ||
    item.contentType !== "audio/mpeg" ||
    item.speed !== 1 ||
    item.maximumOutputBytes < 1
  )
    fail("v2_openai_voice_tts_item_invalid");
}

async function defaultTransport(
  input: Parameters<V2OpenAiVoiceTtsTransportV1["request"]>[0],
): Promise<V2OpenAiVoiceTtsTransportResponseV1> {
  const response = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input.body),
    signal: AbortSignal.timeout(input.timeoutMs),
  });
  const contentLength = response.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^(0|[1-9][0-9]{0,15})$/u.test(contentLength) ||
      Number(contentLength) > input.maximumResponseBytes)
  )
    fail("v2_openai_voice_tts_provider_response_oversize");
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (response.body === null)
    fail("v2_openai_voice_tts_provider_response_invalid");
  const reader = response.body.getReader();
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > input.maximumResponseBytes) {
      await reader.cancel();
      fail("v2_openai_voice_tts_provider_response_oversize");
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return Object.freeze({
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes,
  });
}

/**
 * Server-only effect boundary. The production wrapper supplies the Functions
 * secret; tests supply a fake transport and never call OpenAI.
 */
export function createV2OpenAiVoiceTtsProviderV1(input: {
  readonly apiKey: string;
  readonly transport?: V2OpenAiVoiceTtsTransportV1;
  readonly maximumConcurrency?: number;
}): V2OpenAiVoiceTtsProviderV1 {
  const apiKey = exactApiKey(input.apiKey);
  const transport =
    input.transport ?? Object.freeze({ request: defaultTransport });
  const maximumConcurrency = input.maximumConcurrency ?? 1;
  if (
    !Number.isSafeInteger(maximumConcurrency) ||
    maximumConcurrency < 1 ||
    maximumConcurrency > V2_OPENAI_VOICE_TTS_MAX_CONCURRENCY_V1
  )
    fail("v2_openai_voice_tts_concurrency_invalid");
  return Object.freeze({
    execute: async (request: {
      readonly workOrderHandle: V2VoiceTtsWorkOrderHandleV1;
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
      readonly batchStartIndex: number;
      readonly batchItemCount: number;
    }) => {
      const work = resolveV2VoiceTtsWorkOrderMaterialV1({
        handle: request.workOrderHandle,
        plan: request.plan,
        stageId: request.stageId,
      });
      if (
        work.summary.executionDisposition !==
          "eligible_for_guarded_tts_execution" ||
        work.summary.blockingIssueCodes.length !== 0
      )
        fail("v2_openai_voice_tts_work_order_blocked");
      if (
        !Number.isSafeInteger(request.batchStartIndex) ||
        request.batchStartIndex < 0 ||
        !Number.isSafeInteger(request.batchItemCount) ||
        request.batchItemCount < 1 ||
        request.batchItemCount > V2_OPENAI_VOICE_TTS_BATCH_MAX_ITEMS_V1 ||
        request.batchStartIndex + request.batchItemCount > work.items.length
      )
        fail("v2_openai_voice_tts_batch_invalid");
      const batchItems = work.items.slice(
        request.batchStartIndex,
        request.batchStartIndex + request.batchItemCount,
      );
      const generated: V2OpenAiVoiceTtsGeneratedAudioV1[] = new Array(
        batchItems.length,
      );
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(maximumConcurrency, batchItems.length) },
        async () => {
          while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= batchItems.length) return;
            const item = batchItems[index]!;
            validateItem(item);
            const response = await transport.request({
              endpoint: V2_OPENAI_VOICE_TTS_ENDPOINT_V1,
              apiKey,
              timeoutMs: V2_OPENAI_VOICE_TTS_TIMEOUT_MS_V1,
              maximumResponseBytes: item.maximumOutputBytes,
              body: Object.freeze({
                model: item.model,
                voice: item.voiceId,
                input: item.inputText,
                speed: item.speed,
                instructions: item.instructions,
                response_format: "mp3" as const,
              }),
            });
            if (
              !response.ok ||
              response.status < 200 ||
              response.status > 299 ||
              response.contentType?.split(";")[0]?.trim() !== "audio/mpeg" ||
              !(response.bytes instanceof Uint8Array) ||
              response.bytes.byteLength < 1 ||
              response.bytes.byteLength > item.maximumOutputBytes
            )
              fail("v2_openai_voice_tts_provider_response_invalid");
            const codec = validateV2VoiceMp3CodecV1(response.bytes);
            generated[index] = Object.freeze({
              generationTargetFingerprint: item.generationTargetFingerprint,
              itemFingerprint: item.itemFingerprint,
              voiceId: item.voiceId,
              inputKind: item.inputKind,
              wordOrdinal: item.wordOrdinal,
              contentType: "audio/mpeg" as const,
              byteSize: response.bytes.byteLength,
              rawSha256: sha256Bytes(response.bytes),
              codecRulesFingerprint: codec.rulesFingerprint,
              codecResultFingerprint: codec.resultFingerprint,
              bytes: new Uint8Array(response.bytes),
            });
          }
        },
      );
      await Promise.all(workers);
      const generatedBytes = generated.reduce(
        (sum, value) => sum + value.byteSize,
        0,
      );
      const generatedSummary = Object.freeze(
        generated.map((value) =>
          Object.freeze({
            generationTargetFingerprint: value.generationTargetFingerprint,
            itemFingerprint: value.itemFingerprint,
            voiceId: value.voiceId,
            inputKind: value.inputKind,
            wordOrdinal: value.wordOrdinal,
            contentType: value.contentType,
            byteSize: value.byteSize,
            rawSha256: value.rawSha256,
            codecRulesFingerprint: value.codecRulesFingerprint,
            codecResultFingerprint: value.codecResultFingerprint,
          }),
        ),
      );
      const body = {
        schemaVersion: V2_OPENAI_VOICE_TTS_RESULT_SCHEMA_V1,
        planFingerprint: request.plan.planFingerprint,
        stageId: request.stageId,
        workOrderFingerprint: work.summary.workOrderFingerprint,
        requestedItemCount: batchItems.length,
        totalWorkItemCount: work.items.length,
        batchStartIndex: request.batchStartIndex,
        batchItemCount: request.batchItemCount,
        generatedItemCount: generated.length,
        generatedBytes,
        provider: "openai" as const,
        endpointPolicy: "exact_audio_speech_only" as const,
        providerExecutionAuthority:
          "provider_response_observed_in_process" as const,
        audioByteAuthority: "unpersisted_provider_response_bytes" as const,
        storageAuthority: "none" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
        generated: generatedSummary,
      };
      const summary = Object.freeze({
        ...body,
        resultFingerprint: hashCanonicalBody(body),
      });
      const handle = Object.freeze({}) as V2OpenAiVoiceTtsExecutionHandleV1;
      executionHandles.add(handle);
      executionMetadata.set(
        handle,
        Object.freeze({
          plan: request.plan,
          stageId: request.stageId,
          summary,
          generated: Object.freeze(generated),
        }),
      );
      return handle;
    },
  });
}

export function isV2OpenAiVoiceTtsExecutionHandleV1(
  value: unknown,
): value is V2OpenAiVoiceTtsExecutionHandleV1 {
  return (
    typeof value === "object" && value !== null && executionHandles.has(value)
  );
}

export function getV2OpenAiVoiceTtsExecutionSummaryV1(
  handle: V2OpenAiVoiceTtsExecutionHandleV1,
): V2OpenAiVoiceTtsExecutionResultV1 {
  const value = executionMetadata.get(handle);
  if (!value) fail("v2_openai_voice_tts_execution_handle_invalid");
  return value.summary;
}

export function resolveV2OpenAiVoiceTtsExecutionMaterialV1(input: {
  readonly handle: V2OpenAiVoiceTtsExecutionHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2OpenAiVoiceTtsExecutionMaterialV1 {
  const value = executionMetadata.get(input.handle);
  if (!value || value.plan !== input.plan || value.stageId !== input.stageId)
    fail("v2_openai_voice_tts_execution_handle_invalid");
  return value;
}
