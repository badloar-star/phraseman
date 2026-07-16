import { canonicalJsonV1 } from "../policies/decision_registry";

export type LearningConstruct =
  | "semantic"
  | "listening"
  | "recall"
  | "spoken"
  | "interaction";

export type LearningEvidencePhase =
  | "encounter_build"
  | "near_transfer"
  | "independent_probe"
  | "delayed_probe";

export type LearningAssessmentTargetKind =
  | "objective"
  | "semantic_slot"
  | "critical_constraint";

/** The complete identity of one declared learning-evidence tuple. */
export interface LearningEvidenceTupleIdentity {
  readonly nodeId: string;
  readonly objectiveId: string;
  readonly skillId: string;
  readonly construct: LearningConstruct;
  readonly phase: LearningEvidencePhase;
  readonly targetKind: LearningAssessmentTargetKind;
  readonly targetId: string;
}

export type LearningEvidenceTupleKey = `letk1.${string}`;

const utf8Bytes = (value: string): number[] => {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) break;
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) index += 1;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return bytes;
};

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const base64url = (value: string): string => {
  const bytes = utf8Bytes(value);
  let encoded = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const packed = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    encoded += BASE64URL_ALPHABET[(packed >> 18) & 0x3f];
    encoded += BASE64URL_ALPHABET[(packed >> 12) & 0x3f];
    if (second !== undefined)
      encoded += BASE64URL_ALPHABET[(packed >> 6) & 0x3f];
    if (third !== undefined) encoded += BASE64URL_ALPHABET[packed & 0x3f];
  }

  return encoded;
};

/**
 * Builds the only allowed identity key for a learning-evidence tuple.
 *
 * The versioned key prevents delimiter collisions and pins field order through
 * canonical JSON before base64url encoding.
 */
export const buildLearningEvidenceTupleKey = (
  tuple: LearningEvidenceTupleIdentity,
): LearningEvidenceTupleKey =>
  `letk1.${base64url(
    canonicalJsonV1([
      tuple.nodeId,
      tuple.objectiveId,
      tuple.skillId,
      tuple.construct,
      tuple.phase,
      tuple.targetKind,
      tuple.targetId,
    ]),
  )}`;
