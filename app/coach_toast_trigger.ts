// ═══════════════════════════════════════════════════════════════════════════
// coach_toast_trigger.ts — Определяет нужно ли показать тост точного диагноза
//
// После сессии повторения передаём список неверно отвеченных фраз.
// Если топ-категория имеет >= MIN_SESSION_MISTAKES ошибок — показываем тост.
// ═══════════════════════════════════════════════════════════════════════════

import { computePhraseAnalytics, getTopCategoryForPhrases, type PhraseMistakeInput, type WordCategory } from './phrase_analytics';
import { isCategory, normalizeTokenKey, normalizeWordCategory } from './pos_taxonomy';
import {
  getMicroDiagnosisLabel,
  inferMicroDiagnosisForMistakes,
  type PosMicroDiagnosisId,
} from './pos_micro_diagnosis';

export interface CoachToastResult {
  show: true;
  category: WordCategory;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  mistakeCount: number;
  weaknessScore: number;
  priorityScore?: number;
  recoveryScore?: number;
  focusWords?: string[];
  microDiagnosisId?: PosMicroDiagnosisId;
  microLabelRu?: string;
  microLabelUk?: string;
  microLabelEs?: string;
  diagnosisEvidenceCount?: number;
}

export interface CoachToastNoShow {
  show: false;
}

export type CoachToastDecision = CoachToastResult | CoachToastNoShow;

export interface CoachToastRouteParams {
  coachCategory?: string;
  coachMistakeCount?: string;
  coachWeaknessScore?: string;
  coachPriorityScore?: string;
  coachRecoveryScore?: string;
  coachFocusWords?: string;
  coachMicroDiagnosis?: string;
  coachMicroLabelRu?: string;
  coachMicroLabelUk?: string;
  coachMicroLabelEs?: string;
  coachDiagnosisEvidenceCount?: string;
}

const MIN_SESSION_MISTAKES = 3;
const MIN_SESSION_WEAKNESS_SCORE = 70;
const MIN_EXACT_CATEGORY_MISTAKES = 3;
const MIN_MIXED_CATEGORY_MISTAKES = 4;
const MIN_ANALYTICS_PRIORITY_SCORE = 72;
const MIN_ANALYTICS_EXACT_MISTAKES = 3;
const MIN_ANALYTICS_RECENT_MISTAKES = 1;

const CATEGORY_LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  verb:             { ru: 'Глаголы',            uk: 'Дієслова',            es: 'Verbos' },
  noun:             { ru: 'Существительные',     uk: 'Іменники',            es: 'Sustantivos' },
  pronoun:          { ru: 'Местоимения',         uk: 'Займенники',          es: 'Pronombres' },
  adjective:        { ru: 'Прилагательные',      uk: 'Прикметники',         es: 'Adjetivos' },
  adverb:           { ru: 'Наречия',             uk: 'Прислівники',         es: 'Adverbios' },
  preposition:      { ru: 'Предлоги',            uk: 'Прийменники',         es: 'Preposiciones' },
  modifier:         { ru: 'Modifiers',           uk: 'Modifiers',           es: 'Modificadores' },
  syntax:           { ru: 'Syntax',              uk: 'Syntax',              es: 'Sintaxis' },
  article:          { ru: 'Артикли',             uk: 'Артиклі',             es: 'Artículos' },
  existential:      { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are' },
  'to-be':          { ru: 'Глагол to be',        uk: 'Дієслово to be',      es: 'Verbo to be' },
  conjunction:      { ru: 'Союзы',               uk: 'Сполучники',          es: 'Conjunciones' },
  modal:            { ru: 'Модальные глаголы',   uk: 'Модальні дієслова',   es: 'Verbos modales' },
  phrasal_particle: { ru: 'Фразовые частицы',    uk: 'Фразові частки',      es: 'Partículas verbales' },
  other:            { ru: 'Другое',              uk: 'Інше',                es: 'Otro' },
};

CATEGORY_LABELS.determiner = { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes' };

function firstParam(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function numberParam(value: unknown): number | undefined {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFocusWordsParam(value: unknown): string[] {
  const raw = firstParam(value);
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((word) => normalizeTokenKey(word))
    .filter((word) => {
      if (!word || seen.has(word)) return false;
      seen.add(word);
      return true;
    })
    .slice(0, 4);
}

export function coachToastLabelsForCategory(category: WordCategory): { ru: string; uk: string; es: string } {
  return CATEGORY_LABELS[category];
}

export function coachToastDecisionToRouteParams(decision: CoachToastDecision): CoachToastRouteParams {
  if (!decision.show) return {};
  return {
    coachCategory: decision.category,
    coachMistakeCount: String(decision.mistakeCount),
    coachWeaknessScore: String(decision.weaknessScore),
    ...(typeof decision.priorityScore === 'number' ? { coachPriorityScore: String(decision.priorityScore) } : {}),
    ...(typeof decision.recoveryScore === 'number' ? { coachRecoveryScore: String(decision.recoveryScore) } : {}),
    ...(decision.focusWords?.length ? { coachFocusWords: decision.focusWords.join(',') } : {}),
    ...(decision.microDiagnosisId ? { coachMicroDiagnosis: decision.microDiagnosisId } : {}),
    ...(decision.microLabelRu ? { coachMicroLabelRu: decision.microLabelRu } : {}),
    ...(decision.microLabelUk ? { coachMicroLabelUk: decision.microLabelUk } : {}),
    ...(decision.microLabelEs ? { coachMicroLabelEs: decision.microLabelEs } : {}),
    ...(typeof decision.diagnosisEvidenceCount === 'number'
      ? { coachDiagnosisEvidenceCount: String(decision.diagnosisEvidenceCount) }
      : {}),
  };
}

export function coachToastDecisionFromRouteParams(params: CoachToastRouteParams | Record<string, unknown>): CoachToastDecision {
  const categoryParam = firstParam(params.coachCategory);
  if (!isCategory(categoryParam) || categoryParam === 'other') return { show: false };

  const labels = coachToastLabelsForCategory(categoryParam);
  const microId = firstParam(params.coachMicroDiagnosis) as PosMicroDiagnosisId | undefined;
  const microLabel = getMicroDiagnosisLabel(microId);
  return {
    show: true,
    category: categoryParam,
    labelRu: labels.ru,
    labelUk: labels.uk,
    labelEs: labels.es,
    mistakeCount: numberParam(params.coachMistakeCount) ?? 1,
    weaknessScore: numberParam(params.coachWeaknessScore) ?? 0,
    priorityScore: numberParam(params.coachPriorityScore),
    recoveryScore: numberParam(params.coachRecoveryScore),
    focusWords: parseFocusWordsParam(params.coachFocusWords),
    microDiagnosisId: microId,
    microLabelRu: firstParam(params.coachMicroLabelRu) ?? microLabel?.ru,
    microLabelUk: firstParam(params.coachMicroLabelUk) ?? microLabel?.uk,
    microLabelEs: firstParam(params.coachMicroLabelEs) ?? microLabel?.es,
    diagnosisEvidenceCount: numberParam(params.coachDiagnosisEvidenceCount),
  };
}

function focusWordsForCategory(
  mistakes: PhraseMistakeInput[],
  category: WordCategory,
  extraWords: string[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const add = (word?: string) => {
    const clean = normalizeTokenKey(word);
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    result.push(clean);
  };

  for (const input of mistakes) {
    if (typeof input === 'string') continue;
    const token = input.tokenText || input.expected;
    const resolved = input.category
      ? { category: input.category }
      : normalizeWordCategory(input.rawCategory, token);
    if (resolved.category === category) add(token);
  }

  extraWords.forEach(add);
  return result.slice(0, 4);
}

/**
 * Анализирует фразы-ошибки сессии.
 * wrongPhrases — английские фразы, в которых пользователь ошибся.
 */
export function checkCoachToastNeeded(wrongMistakes: PhraseMistakeInput[]): CoachToastDecision {
  if (wrongMistakes.length < MIN_SESSION_MISTAKES) return { show: false };

  try {
    const top = getTopCategoryForPhrases(wrongMistakes, MIN_SESSION_MISTAKES);
    if (!top) return { show: false };
    if (top.weaknessScore < MIN_SESSION_WEAKNESS_SCORE) return { show: false };
    const hasExactRepeatedSignal = top.exactCount >= MIN_EXACT_CATEGORY_MISTAKES;
    const hasMixedSignal = top.exactCount >= 1 && top.count >= MIN_MIXED_CATEGORY_MISTAKES;
    if (!hasExactRepeatedSignal && !hasMixedSignal) return { show: false };

    const label = CATEGORY_LABELS[top.category];
    const micro = inferMicroDiagnosisForMistakes(wrongMistakes, top.category);
    return {
      show: true,
      category: top.category,
      labelRu: label.ru,
      labelUk: label.uk,
      labelEs: label.es,
      mistakeCount: top.count,
      weaknessScore: top.weaknessScore,
      focusWords: micro?.focusWords.length ? micro.focusWords : focusWordsForCategory(wrongMistakes, top.category),
      microDiagnosisId: micro?.id,
      microLabelRu: micro?.label.ru,
      microLabelUk: micro?.label.uk,
      microLabelEs: micro?.label.es,
      diagnosisEvidenceCount: micro?.evidenceCount,
    };
  } catch {
    return { show: false };
  }
}

export async function checkCoachToastNeededWithAnalytics(
  wrongMistakes: PhraseMistakeInput[],
): Promise<CoachToastDecision> {
  const sessionDecision = checkCoachToastNeeded(wrongMistakes);
  if (sessionDecision.show) return sessionDecision;
  if (wrongMistakes.length === 0) return { show: false };

  try {
    const top = getTopCategoryForPhrases(wrongMistakes, 1);
    if (!top || top.exactCount < 1) return { show: false };

    const analytics = await computePhraseAnalytics();
    const stat = analytics.categoryStats.find((item) => item.category === top.category);
    if (!stat || stat.priorityScore < MIN_ANALYTICS_PRIORITY_SCORE) return { show: false };
    if (stat.exactMistakeCount < MIN_ANALYTICS_EXACT_MISTAKES) return { show: false };
    if (stat.recentMistakeCount < MIN_ANALYTICS_RECENT_MISTAKES) return { show: false };

    const label = CATEGORY_LABELS[top.category];
    const micro = inferMicroDiagnosisForMistakes(wrongMistakes, top.category, stat.topWords);
    return {
      show: true,
      category: top.category,
      labelRu: label.ru,
      labelUk: label.uk,
      labelEs: label.es,
      mistakeCount: Math.max(top.count, stat.recentMistakeCount || stat.exactMistakeCount || stat.mistakeCount),
      weaknessScore: stat.weaknessScore,
      priorityScore: stat.priorityScore,
      recoveryScore: stat.recoveryScore,
      focusWords: micro?.focusWords.length ? micro.focusWords : focusWordsForCategory(wrongMistakes, top.category, stat.topWords),
      microDiagnosisId: micro?.id,
      microLabelRu: micro?.label.ru,
      microLabelUk: micro?.label.uk,
      microLabelEs: micro?.label.es,
      diagnosisEvidenceCount: micro?.evidenceCount,
    };
  } catch {
    return { show: false };
  }
}
