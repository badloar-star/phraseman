// зачем: владелец требует, чтобы каждая карточка урока трассировалась к живому
// языковому объекту (фраза + принятые/отклонённые варианты с причинами + цели).
// Fail-closed: непроверяемый или противоречивый айтем не должен дойти до компилятора.
import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from '../contracts/activity';
import type { V2LanguageProfileBody } from './language_profile';

export interface V2ContentItemTarget {
  readonly locale: string;
  readonly text: string;
  readonly register: string;
  readonly region: string;
}

export interface V2ContentItemMeaning {
  readonly locale: string;
  readonly value: string;
  readonly sourceHash: string;
}

export interface V2RejectedAnswer {
  readonly value: string;
  readonly reasonCode: string;
}

export interface V2ContentItem {
  readonly schemaVersion: 'v2-content-item.v1';
  readonly contentItemId: string;
  readonly episodeId: string;
  readonly intentId: string;
  readonly target: V2ContentItemTarget;
  readonly learnerMeanings: readonly V2ContentItemMeaning[];
  readonly acceptedAnswers: readonly string[];
  readonly rejectedAnswers: readonly V2RejectedAnswer[];
  readonly linguisticFeatures: readonly string[];
  readonly pronunciationTargets: readonly string[];
  readonly prerequisiteContentItemIds: readonly string[];
  readonly objectiveIds: readonly string[];
  readonly compatibleFamilies: readonly V2ActivityFamily[];
}

export type V2ContentItemValidation =
  | { readonly ok: true; readonly value: Readonly<V2ContentItem> }
  | { readonly ok: false; readonly issues: readonly string[] };

const TOP_LEVEL_KEYS = Object.freeze([
  'schemaVersion',
  'contentItemId',
  'episodeId',
  'intentId',
  'target',
  'learnerMeanings',
  'acceptedAnswers',
  'rejectedAnswers',
  'linguisticFeatures',
  'pronunciationTargets',
  'prerequisiteContentItemIds',
  'objectiveIds',
  'compatibleFamilies',
] as const);

const TARGET_KEYS = Object.freeze(['locale', 'text', 'register', 'region'] as const);
const MEANING_KEYS = Object.freeze(['locale', 'value', 'sourceHash'] as const);
const REJECTED_KEYS = Object.freeze(['value', 'reasonCode'] as const);
const SHA256_HEX = /^[0-9a-f]{64}$/;

// зачем: владелец снял ситуативно-картиночные активности с этого направления —
// describe_scene не может быть заявлен как совместимая семья контента.
const OWNER_REMOVED_FAMILIES: readonly V2ActivityFamily[] = Object.freeze(['describe_scene']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => isFilledString(entry));
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

// зачем: сравниваем варианты ответов без регистра/краевых пробелов, но показываем
// оригинал — так дубль «I am Anna.» ≠ « i am anna. » ловится до генерации.
function normalizeAnswer(value: string, locale: string): string {
  try {
    return value.trim().toLocaleLowerCase(locale);
  } catch {
    return value.trim().toLowerCase();
  }
}

export function validateV2ContentItem(value: unknown): V2ContentItemValidation {
  if (!isPlainObject(value)) return { ok: false, issues: Object.freeze(['content_item_invalid']) };
  const input = value;
  const issues: string[] = Object.keys(input).some((key) => !TOP_LEVEL_KEYS.includes(key as (typeof TOP_LEVEL_KEYS)[number]))
    ? ['content_item_unknown_field']
    : [];

  if (input.schemaVersion !== 'v2-content-item.v1') issues.push('content_item_schema_invalid');
  if (!isFilledString(input.contentItemId)) issues.push('content_item_id_required');
  if (!isFilledString(input.episodeId)) issues.push('content_item_episode_required');
  if (!isFilledString(input.intentId)) issues.push('content_item_intent_required');

  let targetLocale = '';
  if (!isPlainObject(input.target) || Object.keys(input.target).some((key) => !TARGET_KEYS.includes(key as (typeof TARGET_KEYS)[number]))) {
    issues.push('content_item_target_invalid');
  } else {
    const target = input.target;
    if (!isFilledString(target.locale)) issues.push('content_item_target_locale_required');
    else targetLocale = target.locale;
    if (!isFilledString(target.text)) issues.push('content_item_target_text_required');
    if (!isFilledString(target.register)) issues.push('content_item_target_register_required');
    if (!isFilledString(target.region)) issues.push('content_item_target_region_required');
  }

  const meanings = Array.isArray(input.learnerMeanings) ? input.learnerMeanings : null;
  if (!meanings || meanings.length === 0) {
    issues.push('content_item_meaning_required');
  } else {
    for (const meaning of meanings) {
      if (!isPlainObject(meaning) || Object.keys(meaning).some((key) => !MEANING_KEYS.includes(key as (typeof MEANING_KEYS)[number]))) {
        issues.push('content_item_meaning_invalid');
        continue;
      }
      if (!isFilledString(meaning.locale) || !isFilledString(meaning.value)) issues.push('content_item_meaning_invalid');
      if (typeof meaning.sourceHash !== 'string' || !SHA256_HEX.test(meaning.sourceHash)) issues.push('content_item_meaning_hash_invalid');
    }
  }

  const accepted = Array.isArray(input.acceptedAnswers) ? input.acceptedAnswers : null;
  const acceptedNormalized = new Set<string>();
  if (!accepted || accepted.length === 0 || !accepted.every((entry) => isFilledString(entry))) {
    issues.push('content_item_accepted_answer_required');
  } else {
    for (const answer of accepted) {
      const normalized = normalizeAnswer(answer, targetLocale || 'en');
      if (acceptedNormalized.has(normalized)) issues.push('accepted_answer_duplicate');
      acceptedNormalized.add(normalized);
    }
  }

  const rejected = Array.isArray(input.rejectedAnswers) ? input.rejectedAnswers : null;
  if (!rejected) {
    issues.push('content_item_rejected_invalid');
  } else {
    for (const entry of rejected) {
      if (!isPlainObject(entry) || Object.keys(entry).some((key) => !REJECTED_KEYS.includes(key as (typeof REJECTED_KEYS)[number]))) {
        issues.push('content_item_rejected_invalid');
        continue;
      }
      if (!isFilledString(entry.value)) issues.push('content_item_rejected_invalid');
      if (!isFilledString(entry.reasonCode)) issues.push('rejected_answer_reason_required');
      // зачем: один и тот же вариант не может быть одновременно принятым и отклонённым —
      // такое противоречие ломает проверку ответов ученика молча.
      const reasonParts = isFilledString(entry.reasonCode)
        ? entry.reasonCode.split(':')
        : [];
      const explicitCaseTrap =
        reasonParts[0] === 'orthographic' &&
        reasonParts.length >= 4 &&
        accepted?.some(
          (answer) =>
            normalizeAnswer(answer, targetLocale || 'en') ===
              normalizeAnswer(entry.value as string, targetLocale || 'en') &&
            answer.normalize('NFKC').trim() !==
              (entry.value as string).normalize('NFKC').trim(),
        );
      if (
        isFilledString(entry.value) &&
        acceptedNormalized.has(normalizeAnswer(entry.value, targetLocale || 'en')) &&
        !explicitCaseTrap
      ) {
        issues.push('rejected_answer_conflicts_accepted');
      }
    }
  }

  if (!isStringArray(input.linguisticFeatures)) issues.push('content_item_features_invalid');
  if (!Array.isArray(input.pronunciationTargets) || input.pronunciationTargets.some((entry) => !isFilledString(entry))) {
    issues.push('content_item_pronunciation_invalid');
  }

  const prerequisites = Array.isArray(input.prerequisiteContentItemIds) ? input.prerequisiteContentItemIds : null;
  if (!prerequisites || prerequisites.some((entry) => !isFilledString(entry))) {
    if (!prerequisites || prerequisites.length > 0) issues.push('content_item_prerequisites_invalid');
  }
  if (prerequisites && isFilledString(input.contentItemId) && prerequisites.includes(input.contentItemId)) {
    issues.push('content_item_prerequisite_self_reference');
  }

  const objectives = Array.isArray(input.objectiveIds) ? input.objectiveIds : null;
  if (!objectives || objectives.length === 0 || !objectives.every((entry) => isFilledString(entry))) {
    issues.push('content_item_objective_required');
  }

  const families = Array.isArray(input.compatibleFamilies) ? input.compatibleFamilies : null;
  if (!families || families.length === 0) {
    issues.push('content_item_family_required');
  } else {
    if (families.some((family) => !V2_ACTIVITY_FAMILIES.includes(family as V2ActivityFamily)
      || OWNER_REMOVED_FAMILIES.includes(family as V2ActivityFamily))) {
      issues.push('content_item_family_unsupported');
    }
    if (new Set(families).size !== families.length) issues.push('content_item_family_duplicate');
  }

  if (issues.length) return { ok: false, issues: Object.freeze([...new Set(issues)]) };

  const target = input.target as V2ContentItemTarget;
  const normalized: V2ContentItem = deepFreeze({
    schemaVersion: 'v2-content-item.v1',
    contentItemId: (input.contentItemId as string).trim(),
    episodeId: (input.episodeId as string).trim(),
    intentId: (input.intentId as string).trim(),
    target: { locale: target.locale, text: target.text, register: target.register, region: target.region },
    learnerMeanings: (input.learnerMeanings as readonly V2ContentItemMeaning[]).map((meaning) => ({
      locale: meaning.locale,
      value: meaning.value,
      sourceHash: meaning.sourceHash,
    })),
    acceptedAnswers: [...(input.acceptedAnswers as readonly string[])],
    rejectedAnswers: (input.rejectedAnswers as readonly V2RejectedAnswer[]).map((entry) => ({
      value: entry.value,
      reasonCode: entry.reasonCode,
    })),
    linguisticFeatures: [...(input.linguisticFeatures as readonly string[])],
    pronunciationTargets: [...(input.pronunciationTargets as readonly string[])],
    prerequisiteContentItemIds: [...(input.prerequisiteContentItemIds as readonly string[])],
    objectiveIds: [...(input.objectiveIds as readonly string[])],
    compatibleFamilies: [...(input.compatibleFamilies as readonly V2ActivityFamily[])],
  });
  return { ok: true, value: normalized };
}

// зачем: компилятор не имеет права собирать юнит из айтема чужого языка или из
// семей, которые профиль не поддерживает, — бросаем, а не фильтруем молча.
export function assertContentItemCompatibleWithProfile(
  item: V2ContentItem,
  profile: V2LanguageProfileBody,
): void {
  if (item.target.locale !== profile.targetLanguage) throw new Error('content_item_language_mismatch');
  const supported = new Set(profile.supportedActivityFamilies);
  if (item.compatibleFamilies.some((family) => !supported.has(family))) {
    throw new Error('content_item_family_unsupported');
  }
}
