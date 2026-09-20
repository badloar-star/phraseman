import { HttpsError } from 'firebase-functions/v2/https';

import { rejectGeneratedLanguageText } from './ai_language_gate';

export const DIALOGUE_LANGUAGE_CONTRACT_VERSION = 'dialogue-ai-language-contract-v4';

export const DIALOGUE_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;

export type DialogueStudyTarget = (typeof DIALOGUE_STUDY_TARGETS)[number];

// Explicit owner-authorised production release set. Keeping this separate from
// registration means future registry additions still fail closed by default.
export const DIALOGUE_ACTIVATED_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const satisfies readonly DialogueStudyTarget[];

export type ActivatedDialogueStudyTarget = (typeof DIALOGUE_ACTIVATED_STUDY_TARGETS)[number];

export interface DialoguePackBindingRequest {
  studyTarget?: unknown;
  scenarioId?: unknown;
  packVersion?: unknown;
  packSha256?: unknown;
  sharedManifestSha256?: unknown;
  warmupPing?: unknown;
}

export type DialoguePackBindingPin = Readonly<{
  studyTarget: Exclude<DialogueStudyTarget, 'en'>;
  scenarioId: string;
  packVersion: string;
  packSha256: string;
  sharedManifestSha256: string;
}>;

export type DialogueNonEnglishPackBindingManifest = Readonly<
  Record<string, DialoguePackBindingPin>
>;

const DIALOGUE_BINDING_TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const DIALOGUE_BINDING_SHA256_RE = /^[a-f0-9]{64}$/;

function dialoguePackBindingKey(
  studyTarget: Exclude<DialogueStudyTarget, 'en'>,
  scenarioId: string,
): string {
  return `${studyTarget}:${scenarioId}`;
}

/** Optional strict pins for future clients that transmit reviewed pack hashes. */
export const DIALOGUE_NON_ENGLISH_PACK_BINDING_MANIFEST: DialogueNonEnglishPackBindingManifest =
  Object.freeze({});

export type DialogueLanguageFeature =
  | 'premium_dialog'
  | 'premium_dialog_translate'
  | 'premium_dialog_how_to_say'
  | 'premium_dialog_review'
  | 'tutor_text';

export type DialogueContractHttpError = Readonly<{
  status: 400 | 412;
  error:
    | 'premium_dialog_unsupported_study_target'
    | 'premium_dialog_pack_binding_required'
    | 'premium_dialog_pack_binding_mismatch'
    | 'premium_dialog_study_target_unavailable';
}>;

const DIALOGUE_STUDY_TARGET_NAMES: Record<DialogueStudyTarget, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

export function resolveDialogueStudyTarget(value: unknown): DialogueStudyTarget {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'premium_dialog_unsupported_study_target');
  }

  if ((DIALOGUE_STUDY_TARGETS as readonly string[]).includes(value)) {
    return value as DialogueStudyTarget;
  }

  throw new HttpsError('invalid-argument', 'premium_dialog_unsupported_study_target');
}

export function resolveActivatedDialogueStudyTarget(value: unknown): ActivatedDialogueStudyTarget {
  const target = resolveDialogueStudyTarget(value);
  if ((DIALOGUE_ACTIVATED_STUDY_TARGETS as readonly DialogueStudyTarget[]).includes(target)) {
    return target as ActivatedDialogueStudyTarget;
  }
  throw new HttpsError('failed-precondition', 'premium_dialog_study_target_unavailable');
}

export function dialogueContractHttpError(error: unknown): DialogueContractHttpError {
  const message = error instanceof Error ? error.message : '';
  if (message === 'premium_dialog_pack_binding_required') {
    return { status: 400, error: message };
  }
  if (message === 'premium_dialog_pack_binding_mismatch') {
    return { status: 412, error: message };
  }
  if (message === 'premium_dialog_study_target_unavailable') {
    return { status: 412, error: message };
  }
  return { status: 400, error: 'premium_dialog_unsupported_study_target' };
}

/**
 * Endpoint-level target check. It deliberately ignores warmupPing: warming an
 * inactive contour would conceal a direct-call bug and violate fail-closed.
 */
export function resolveDialoguePackBindingAgainstManifest(
  request: DialoguePackBindingRequest | null | undefined,
  manifest: DialogueNonEnglishPackBindingManifest = DIALOGUE_NON_ENGLISH_PACK_BINDING_MANIFEST,
): DialogueStudyTarget {
  const studyTarget = resolveDialogueStudyTarget(request?.studyTarget);
  if (studyTarget === 'en') return studyTarget;
  const scenarioId = request?.scenarioId;
  const packVersion = request?.packVersion;
  const packSha256 = request?.packSha256;
  const sharedManifestSha256 = request?.sharedManifestSha256;
  const hasPackBindingMetadata = packVersion !== undefined
    || packSha256 !== undefined
    || sharedManifestSha256 !== undefined;

  // The currently shipped clients preserve studyTarget but do not transmit a
  // reviewed pack hash. The owner-authorised release therefore uses the exact
  // activated target as its live contract. If a client does send binding
  // metadata, it must still pass the strict manifest comparison below.
  if (!hasPackBindingMetadata) return studyTarget;

  if (
    typeof scenarioId !== 'string'
    || !DIALOGUE_BINDING_TOKEN_RE.test(scenarioId)
    || typeof packVersion !== 'string'
    || !DIALOGUE_BINDING_TOKEN_RE.test(packVersion)
    || typeof packSha256 !== 'string'
    || !DIALOGUE_BINDING_SHA256_RE.test(packSha256)
    || typeof sharedManifestSha256 !== 'string'
    || !DIALOGUE_BINDING_SHA256_RE.test(sharedManifestSha256)
  ) {
    throw new HttpsError('invalid-argument', 'premium_dialog_pack_binding_required');
  }
  const key = dialoguePackBindingKey(studyTarget, scenarioId);
  const pin = Object.prototype.hasOwnProperty.call(manifest, key) ? manifest[key] : undefined;
  if (
    !pin
    || pin.studyTarget !== studyTarget
    || pin.scenarioId !== scenarioId
    || pin.packVersion !== packVersion
    || pin.packSha256 !== packSha256
    || pin.sharedManifestSha256 !== sharedManifestSha256
  ) {
    throw new HttpsError('failed-precondition', 'premium_dialog_pack_binding_mismatch');
  }
  return studyTarget;
}

export function resolveDialogueTargetBeforeWarmup(
  data: DialoguePackBindingRequest | null | undefined,
  manifest?: DialogueNonEnglishPackBindingManifest,
): ActivatedDialogueStudyTarget {
  return resolveActivatedDialogueStudyTarget(resolveDialoguePackBindingAgainstManifest(data, manifest));
}

export function dialogueStudyTargetName(target: DialogueStudyTarget): string {
  return DIALOGUE_STUDY_TARGET_NAMES[target];
}

const DIALOGUE_SHORT_LANGUAGE_MARKERS: Readonly<Record<DialogueStudyTarget, ReadonlySet<string>>> = {
  en: new Set(['i', 'you', 'we', 'can', 'could', 'would', 'like', 'please', 'pay', 'by', 'give', 'me', 'the', 'is', 'are', 'do', 'have', 'want', 'need', 'how', 'things', 'tell', 'about', 'your', 'family', 'good', 'morning', 'nice', 'meet']),
  es: new Set(['yo', 'quiero', 'quisiera', 'puedo', 'pagar', 'con', 'tarjeta', 'por', 'favor', 'una', 'un', 'el', 'la', 'gracias', 'necesito', 'puede']),
  fr: new Set(['je', 'voudrais', 'peux', 'payer', 'avec', 'carte', 'une', 'un', 'le', 'la', 'merci', 'besoin', 'vous', 'pouvez']),
  de: new Set(['ich', 'möchte', 'kann', 'mit', 'karte', 'bezahlen', 'bitte', 'einen', 'eine', 'der', 'die', 'das', 'mir', 'sie']),
};

const DIALOGUE_DISTINCTIVE_SHORT_PATTERNS: Readonly<Record<DialogueStudyTarget, RegExp>> = {
  en: /^(?:hello|hi|good\s+(?:morning|evening)|nice\s+to\s+meet\s+you)[!,.?\s]*$/iu,
  es: /^(?:hola|buenos\s+días|buenas\s+tardes|mucho\s+gusto)[!,.?\s]*$/iu,
  fr: /^(?:bonjour|bonsoir|enchant[ée])[!,.?\s]*$/iu,
  de: /^(?:hallo|guten\s+morgen|guten\s+abend|freut\s+mich)[!,.?\s]*$/iu,
};

function dialogueShortLanguageMismatch(text: string, expected: DialogueStudyTarget): boolean {
  const trimmed = text.trim();
  if (!DIALOGUE_DISTINCTIVE_SHORT_PATTERNS[expected].test(trimmed)
    && DIALOGUE_STUDY_TARGETS.some((candidate) => (
      candidate !== expected && DIALOGUE_DISTINCTIVE_SHORT_PATTERNS[candidate].test(trimmed)
    ))) return true;
  const words = text.toLocaleLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.length < 2) return false;
  const hits = (target: DialogueStudyTarget) => words.filter((word) => DIALOGUE_SHORT_LANGUAGE_MARKERS[target].has(word)).length;
  const expectedHits = hits(expected);
  return DIALOGUE_STUDY_TARGETS.some((candidate) => {
    if (candidate === expected) return false;
    const candidateHits = hits(candidate);
    return candidateHits >= 2 && candidateHits >= expectedHits + 2;
  });
}

export function assertDialogueStudyLanguage(params: {
  text: string;
  studyTarget: DialogueStudyTarget;
  feature: DialogueLanguageFeature;
}): void {
  const reason = rejectGeneratedLanguageText(params.text, params.studyTarget);
  if (reason || dialogueShortLanguageMismatch(params.text, params.studyTarget)) {
    throw new HttpsError('unavailable', `${params.feature}_wrong_language`);
  }
}
