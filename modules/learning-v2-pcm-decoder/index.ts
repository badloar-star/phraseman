import { requireOptionalNativeModule } from "expo-modules-core";

import {
  observeLearningV2NativePcmSignalMetricsV1,
  parseLearningV2PcmSignalIdentityV1,
  LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1,
  type LearningV2PcmSignalIdentityV1,
  type LearningV2PcmSignalObservationV1,
} from "../learning-v2/runtime/voice_pcm_signal_observer_v1";
import type {
  LearningV2NativePcmDecodeMetrics,
  LearningV2PcmDecoderNativeModule,
} from "./types";

export const LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1 =
  LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1;

const nativeModule =
  requireOptionalNativeModule<LearningV2PcmDecoderNativeModule>(
    "LearningV2PcmDecoder",
  );

function fail(): never {
  throw new Error("learning_v2_native_pcm_decoder_invalid");
}

export function isLearningV2NativePcmDecoderAvailableV1(): boolean {
  return nativeModule !== null;
}

export async function decodeLearningV2NativePcmSignalV1(input: {
  readonly fileUri: string;
  readonly identity: LearningV2PcmSignalIdentityV1;
}): Promise<LearningV2PcmSignalObservationV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "fileUri|identity" ||
    typeof input.fileUri !== "string" ||
    !input.fileUri.startsWith("file://") ||
    input.fileUri.length > 2_048 ||
    input.fileUri.includes("\0") ||
    input.fileUri.split("/").some((part) => part === "..") ||
    nativeModule === null
  )
    fail();
  let identity: Readonly<LearningV2PcmSignalIdentityV1>;
  try {
    identity = parseLearningV2PcmSignalIdentityV1(input.identity);
  } catch {
    fail();
  }
  if (identity.byteSize > LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1) fail();
  try {
    const metrics: LearningV2NativePcmDecodeMetrics =
      await nativeModule.decodeFile(
        input.fileUri,
        identity.contentHash,
        identity.byteSize,
        LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1,
      );
    return observeLearningV2NativePcmSignalMetricsV1({ identity, metrics });
  } catch {
    fail();
  }
}

export type { LearningV2NativePcmDecodeMetrics };
