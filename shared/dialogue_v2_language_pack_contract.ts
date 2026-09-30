import {
  validateDialogueV2PackReference,
  type DialogueV2Cefr,
  type DialogueV2WorldId,
} from './dialogue_v2_contract';
import { getDialogueV2CatalogueEntry } from './dialogue_v2_catalogue_index';

export const DIALOGUE_V2_STUDY_TARGETS = ['en', 'es', 'fr', 'de'] as const;
export type DialogueV2StudyTarget = typeof DIALOGUE_V2_STUDY_TARGETS[number];

export const DIALOGUE_V2_REVIEW_ROLES = [
  'targetContractGuardian',
  'scenarioPackReviewer',
  'promptLanguageJudge',
  'voiceLocaleGate',
  'stateIsolationJudge',
  'surfaceMatrixGate',
] as const;

type DialogueV2ReviewRole = typeof DIALOGUE_V2_REVIEW_ROLES[number];
type DialogueV2ReviewVerdict = 'PASS' | 'REVISE' | 'BLOCK';
type DialogueV2PersonaReplyStyle = 'warm' | 'direct' | 'calm' | 'playful' | 'formal';
type DialogueV2VoiceMode = 'text_only' | 'optional_prepared_voice';
type DialogueV2PersonaMood = 'open' | 'focused' | 'helpful' | 'measured' | 'energetic';
type DialogueV2PersonaCorrectionStyle = 'none' | 'gentle' | 'playful_gentle';

export type DialogueV2LanguagePack = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  packVersion: string;
  packSha256: string;
  catalogueSha256: string;
  reviewReceiptSha256: string;
  scenario: Readonly<{
    id: string;
    worldId: DialogueV2WorldId;
    rankRequired: number;
    cefr: DialogueV2Cefr;
    personas: readonly Readonly<{
      id: string;
      replyStyle: DialogueV2PersonaReplyStyle;
      voiceMode: DialogueV2VoiceMode;
      /** Learner-visible name in the study language. */
      displayName: string;
      /** Learner-visible promise of this persona's reply style. */
      styleNote: string;
      /** Stable participant mood used by the group-turn planner. */
      mood: DialogueV2PersonaMood;
      /** An occasional correction must preserve this participant's voice. */
      correctionStyle: DialogueV2PersonaCorrectionStyle;
    }>[];
    objectives: readonly Readonly<{
      id: string;
      /** Learner-visible objective in the study language. */
      label: string;
    }>[];
    groupReplyPolicy: Readonly<{
      maxDirectReplies: 1;
      maxUsefulFollowUps: 0 | 1;
      silenceAllowed: true;
    }>;
  }>;
  /** Learner-facing copy; a purely structural packet is never release-ready. */
  content: Readonly<{
    title: string;
    briefing: string;
    completionTone: string;
  }>;
  review: Readonly<Record<DialogueV2ReviewRole, DialogueV2ReviewVerdict>>;
}>;

/** Server-owned release pins; never construct this manifest from a request. */
export type DialogueV2ApprovedLanguagePackPin = Readonly<{
  studyTarget: DialogueV2StudyTarget;
  scenarioId: string;
  packVersion: string;
  packSha256: string;
  catalogueSha256: string;
  reviewReceiptSha256: string;
}>;

export type DialogueV2ApprovedLanguagePackManifest = Readonly<
  Record<string, DialogueV2ApprovedLanguagePackPin>
>;

export type DialogueV2LanguagePackValidation =
  | Readonly<{ ok: true }>
  | Readonly<{
    ok: false;
    error: 'packet_invalid' | 'study_target' | 'reference_invalid' | 'catalogue_mismatch'
      | 'persona_invalid' | 'objective_count' | 'objective_id' | 'learner_content_invalid'
      | 'persona_behavior_invalid' | 'group_policy_invalid' | 'review_invalid';
  }>;

const TOKEN_RE = /^(?=.{1,128}$)[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const PERSONA_STYLES = new Set<DialogueV2PersonaReplyStyle>(['warm', 'direct', 'calm', 'playful', 'formal']);
const VOICE_MODES = new Set<DialogueV2VoiceMode>(['text_only', 'optional_prepared_voice']);
const PERSONA_MOODS = new Set<DialogueV2PersonaMood>(['open', 'focused', 'helpful', 'measured', 'energetic']);
const PERSONA_CORRECTION_STYLES = new Set<DialogueV2PersonaCorrectionStyle>(['none', 'gentle', 'playful_gentle']);
const REVIEW_VERDICTS = new Set<DialogueV2ReviewVerdict>(['PASS', 'REVISE', 'BLOCK']);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonicalToken(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && TOKEN_RE.test(value);
}

function learnerText(value: unknown, minLength: number, maxLength: number): value is string {
  return typeof value === 'string'
    && value === value.trim()
    && value.length >= minLength
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function sha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_RE.test(value);
}

function manifestKey(studyTarget: DialogueV2StudyTarget, scenarioId: string): string {
  return `${studyTarget}:${scenarioId}`;
}

export function validateDialogueV2LanguagePack(value: unknown): DialogueV2LanguagePackValidation {
  const packet = record(value);
  if (!packet) return { ok: false, error: 'packet_invalid' };
  if (!DIALOGUE_V2_STUDY_TARGETS.includes(packet.studyTarget as DialogueV2StudyTarget)) {
    return { ok: false, error: 'study_target' };
  }
  const scenario = record(packet.scenario);
  if (!scenario || !validateDialogueV2PackReference({
    scenarioId: scenario.id,
    packVersion: packet.packVersion,
    packSha256: packet.packSha256,
    catalogueSha256: packet.catalogueSha256,
  }).ok || !sha256(packet.reviewReceiptSha256)) return { ok: false, error: 'reference_invalid' };
  const entry = getDialogueV2CatalogueEntry(scenario.id);
  if (!entry || scenario.worldId !== entry.worldId || scenario.rankRequired !== entry.rankRequired || scenario.cefr !== entry.cefr) {
    return { ok: false, error: 'catalogue_mismatch' };
  }
  if (!Array.isArray(scenario.personas) || scenario.personas.length < 1 || scenario.personas.length > 6) {
    return { ok: false, error: 'persona_invalid' };
  }
  const personaIds = new Set<string>();
  for (const rawPersona of scenario.personas) {
    const persona = record(rawPersona);
    if (!persona || !canonicalToken(persona.id) || personaIds.has(persona.id)
      || !PERSONA_STYLES.has(persona.replyStyle as DialogueV2PersonaReplyStyle)
      || !VOICE_MODES.has(persona.voiceMode as DialogueV2VoiceMode)) return { ok: false, error: 'persona_invalid' };
    if (!learnerText(persona.displayName, 1, 64) || !learnerText(persona.styleNote, 3, 240)) {
      return { ok: false, error: 'learner_content_invalid' };
    }
    if (!PERSONA_MOODS.has(persona.mood as DialogueV2PersonaMood)
      || !PERSONA_CORRECTION_STYLES.has(persona.correctionStyle as DialogueV2PersonaCorrectionStyle)) {
      return { ok: false, error: 'persona_behavior_invalid' };
    }
    personaIds.add(persona.id);
  }
  if (!Array.isArray(scenario.objectives) || scenario.objectives.length < 6 || scenario.objectives.length > 12) {
    return { ok: false, error: 'objective_count' };
  }
  const objectiveIds = new Set<string>();
  for (const rawObjective of scenario.objectives) {
    const objective = record(rawObjective);
    if (!objective || !canonicalToken(objective.id) || objectiveIds.has(objective.id)) {
      return { ok: false, error: 'objective_id' };
    }
    if (!learnerText(objective.label, 3, 240)) return { ok: false, error: 'learner_content_invalid' };
    objectiveIds.add(objective.id);
  }
  const policy = record(scenario.groupReplyPolicy);
  if (!policy || policy.maxDirectReplies !== 1 || (policy.maxUsefulFollowUps !== 0 && policy.maxUsefulFollowUps !== 1)
    || policy.silenceAllowed !== true) return { ok: false, error: 'group_policy_invalid' };
  const content = record(packet.content);
  if (!content
    || !learnerText(content.title, 3, 120)
    || !learnerText(content.briefing, 8, 480)
    || !learnerText(content.completionTone, 3, 96)) {
    return { ok: false, error: 'learner_content_invalid' };
  }
  const review = record(packet.review);
  if (!review || DIALOGUE_V2_REVIEW_ROLES.some((role) => !REVIEW_VERDICTS.has(review[role] as DialogueV2ReviewVerdict))) {
    return { ok: false, error: 'review_invalid' };
  }
  return { ok: true };
}

/**
 * Pure manifest-matching helper. It is NOT an authorization boundary: only a
 * server wrapper that owns its manifest may use this result to activate a pack.
 */
export function matchesDialogueV2ApprovedLanguagePackManifest(
  value: unknown,
  manifest: DialogueV2ApprovedLanguagePackManifest,
): boolean {
  if (!validateDialogueV2LanguagePack(value).ok) return false;
  const packet = value as DialogueV2LanguagePack;
  const review = packet.review;
  if (!DIALOGUE_V2_REVIEW_ROLES.every((role) => review[role] === 'PASS')) return false;
  const pin = manifest[manifestKey(packet.studyTarget, packet.scenario.id)];
  return Boolean(pin
    && pin.studyTarget === packet.studyTarget
    && pin.scenarioId === packet.scenario.id
    && pin.packVersion === packet.packVersion
    && pin.packSha256 === packet.packSha256
    && pin.catalogueSha256 === packet.catalogueSha256
    && pin.reviewReceiptSha256 === packet.reviewReceiptSha256);
}
