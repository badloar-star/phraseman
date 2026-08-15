import {
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { V2ActivityFamily } from "./activity";
export type ServerVerifiableRequiredSessionFamily = Extract<
  V2ActivityFamily,
  | "phrase_builder"
  | "listen_choose"
  | "sound_contrast"
  | "listen_build_dictation"
  | "context_gap_grammar"
  | "speed_match"
>;

const FAMILIES = new Set<ServerVerifiableRequiredSessionFamily>([
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
]);
const MAX_RAW_ANSWER_BYTES = 1024;
const MAX_NORMALIZED_ANSWER_BYTES = 512;

export const isServerVerifiableRequiredSessionFamily = (
  input: unknown,
): input is ServerVerifiableRequiredSessionFamily =>
  typeof input === "string" &&
  FAMILIES.has(input as ServerVerifiableRequiredSessionFamily);

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
};

export const normalizeRequiredSessionShortAnswer = (input: unknown): string => {
  if (typeof input !== "string" || hasUnpairedSurrogate(input)) {
    throw new Error("required_session_answer_invalid");
  }
  let rawBytes: number;
  try { rawBytes = utf8ByteLengthV1(input); }
  catch { throw new Error("required_session_answer_invalid"); }
  if (rawBytes < 1 || rawBytes > MAX_RAW_ANSWER_BYTES) {
    throw new Error("required_session_answer_invalid");
  }
  const normalized = input
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘`´]/gu, "'")
    .match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)
    ?.join(" ") ?? "";
  if (!normalized || utf8ByteLengthV1(normalized) > MAX_NORMALIZED_ANSWER_BYTES) {
    throw new Error("required_session_answer_invalid");
  }
  return normalized;
};

/** Privacy-preserving proof persisted by the local post-session outbox. */
export const requiredSessionAnswerProofFingerprint = (input: unknown): string =>
  hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-normalized-answer.v1",
    normalizedAnswer: normalizeRequiredSessionShortAnswer(input),
  });
