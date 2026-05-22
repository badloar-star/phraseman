// ═══════════════════════════════════════════════════════════════════════════
// coach_toast_trigger.ts — Определяет нужно ли показать тост точного диагноза
//
// После сессии повторения передаём список неверно отвеченных фраз.
// Если топ-категория имеет >= MIN_SESSION_MISTAKES ошибок — показываем тост.
// ═══════════════════════════════════════════════════════════════════════════

import { computePhraseAnalytics, getTopCategoryForPhrases, type PhraseMistakeInput, type WordCategory } from './phrase_analytics';
import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { isCategory, normalizeTokenKey, normalizeWordCategory } from './pos_taxonomy';
import {
  getMicroDiagnosisLabel,
  inferMicroDiagnosisForMistakes,
  type PosMicroDiagnosisId,
} from './pos_micro_diagnosis';
import { storageStudyTarget, type RuntimeSourceLocale, type RuntimeStudyTarget } from './target_storage_keys';

type CoachToastLabel = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

export interface CoachToastResult {
  show: true;
  category: WordCategory;
  labelRu: string;
  labelUk: string;
  labelEs: string;
  labelPtBr: string;
  labelVi: string;
  labelId: string;
  labelTr: string;
  labelPl: string;
  mistakeCount: number;
  weaknessScore: number;
  priorityScore?: number;
  recoveryScore?: number;
  focusWords?: string[];
  microDiagnosisId?: PosMicroDiagnosisId;
  microLabelRu?: string;
  microLabelUk?: string;
  microLabelEs?: string;
  microLabelPtBr?: string;
  microLabelVi?: string;
  microLabelId?: string;
  microLabelTr?: string;
  microLabelPl?: string;
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
  coachMicroLabelPtBr?: string;
  coachMicroLabelVi?: string;
  coachMicroLabelId?: string;
  coachMicroLabelTr?: string;
  coachMicroLabelPl?: string;
  coachDiagnosisEvidenceCount?: string;
}

const MIN_SESSION_MISTAKES = 3;
const MIN_SESSION_WEAKNESS_SCORE = 70;
const MIN_EXACT_CATEGORY_MISTAKES = 3;
const MIN_MIXED_CATEGORY_MISTAKES = 4;
const MIN_ANALYTICS_PRIORITY_SCORE = 72;
const MIN_ANALYTICS_EXACT_MISTAKES = 3;
const MIN_ANALYTICS_RECENT_MISTAKES = 1;

const CATEGORY_LABELS: Record<string, CoachToastLabel> = {
  verb: {
    ru: 'Глаголы',
    uk: 'Дієслова',
    es: 'Verbos',
    'pt-BR': 'Verbos',
    vi: 'Động từ',
    id: 'Kata kerja',
    tr: 'Fiiller',
    pl: 'Czasowniki',
  },
  noun: {
    ru: 'Существительные',
    uk: 'Іменники',
    es: 'Sustantivos',
    'pt-BR': 'Substantivos',
    vi: 'Danh từ',
    id: 'Kata benda',
    tr: 'İsimler',
    pl: 'Rzeczowniki',
  },
  pronoun: {
    ru: 'Местоимения',
    uk: 'Займенники',
    es: 'Pronombres',
    'pt-BR': 'Pronomes',
    vi: 'Đại từ',
    id: 'Kata ganti',
    tr: 'Zamirler',
    pl: 'Zaimki',
  },
  adjective: {
    ru: 'Прилагательные',
    uk: 'Прикметники',
    es: 'Adjetivos',
    'pt-BR': 'Adjetivos',
    vi: 'Tính từ',
    id: 'Kata sifat',
    tr: 'Sıfatlar',
    pl: 'Przymiotniki',
  },
  adverb: {
    ru: 'Наречия',
    uk: 'Прислівники',
    es: 'Adverbios',
    'pt-BR': 'Advérbios',
    vi: 'Trạng từ',
    id: 'Kata keterangan',
    tr: 'Zarflar',
    pl: 'Przysłówki',
  },
  preposition: {
    ru: 'Предлоги',
    uk: 'Прийменники',
    es: 'Preposiciones',
    'pt-BR': 'Preposições',
    vi: 'Giới từ',
    id: 'Preposisi',
    tr: 'Edatlar',
    pl: 'Przyimki',
  },
  modifier: {
    ru: 'Modifiers',
    uk: 'Modifiers',
    es: 'Modificadores',
    'pt-BR': 'Modificadores',
    vi: 'Từ bổ nghĩa',
    id: 'Modifier',
    tr: 'Niteleyiciler',
    pl: 'Modyfikatory',
  },
  syntax: {
    ru: 'Syntax',
    uk: 'Syntax',
    es: 'Sintaxis',
    'pt-BR': 'Sintaxe',
    vi: 'Cú pháp',
    id: 'Sintaksis',
    tr: 'Sözdizimi',
    pl: 'Składnia',
  },
  article: {
    ru: 'Артикли',
    uk: 'Артиклі',
    es: 'Artículos',
    'pt-BR': 'Artigos',
    vi: 'Mạo từ',
    id: 'Artikel',
    tr: 'Artikeller',
    pl: 'Przedimki',
  },
  existential: {
    ru: 'There is / There are',
    uk: 'There is / There are',
    es: 'There is / There are',
    'pt-BR': 'There is / There are',
    vi: 'There is / There are',
    id: 'There is / There are',
    tr: 'There is / There are',
    pl: 'There is / There are',
  },
  'to-be': {
    ru: 'Глагол to be',
    uk: 'Дієслово to be',
    es: 'Verbo to be',
    'pt-BR': 'Verbo to be',
    vi: 'Động từ to be',
    id: 'Kata kerja to be',
    tr: 'to be fiili',
    pl: 'Czasownik to be',
  },
  conjunction: {
    ru: 'Союзы',
    uk: 'Сполучники',
    es: 'Conjunciones',
    'pt-BR': 'Conjunções',
    vi: 'Liên từ',
    id: 'Konjungsi',
    tr: 'Bağlaçlar',
    pl: 'Spójniki',
  },
  modal: {
    ru: 'Модальные глаголы',
    uk: 'Модальні дієслова',
    es: 'Verbos modales',
    'pt-BR': 'Verbos modais',
    vi: 'Động từ khuyết thiếu',
    id: 'Kata kerja modal',
    tr: 'Modal fiiller',
    pl: 'Czasowniki modalne',
  },
  phrasal_particle: {
    ru: 'Фразовые частицы',
    uk: 'Фразові частки',
    es: 'Partículas verbales',
    'pt-BR': 'Partículas de phrasal verbs',
    vi: 'Tiểu từ trong phrasal verb',
    id: 'Partikel phrasal verb',
    tr: 'Phrasal verb parçacıkları',
    pl: 'Partykuły phrasal verbs',
  },
  other: {
    ru: 'Другое',
    uk: 'Інше',
    es: 'Otro',
    'pt-BR': 'Outro',
    vi: 'Khác',
    id: 'Lainnya',
    tr: 'Diğer',
    pl: 'Inne',
  },
};

CATEGORY_LABELS.determiner = {
  ru: 'Determiners',
  uk: 'Determiners',
  es: 'Determinantes',
  'pt-BR': 'Determinantes',
  vi: 'Từ hạn định',
  id: 'Determiner',
  tr: 'Belirleyiciler',
  pl: 'Określniki',
};

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

export function coachToastLabelsForCategory(category: WordCategory): CoachToastLabel {
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
    ...(decision.microLabelPtBr ? { coachMicroLabelPtBr: decision.microLabelPtBr } : {}),
    ...(decision.microLabelVi ? { coachMicroLabelVi: decision.microLabelVi } : {}),
    ...(decision.microLabelId ? { coachMicroLabelId: decision.microLabelId } : {}),
    ...(decision.microLabelTr ? { coachMicroLabelTr: decision.microLabelTr } : {}),
    ...(decision.microLabelPl ? { coachMicroLabelPl: decision.microLabelPl } : {}),
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
    labelPtBr: labels['pt-BR'],
    labelVi: labels.vi,
    labelId: labels.id,
    labelTr: labels.tr,
    labelPl: labels.pl,
    mistakeCount: numberParam(params.coachMistakeCount) ?? 1,
    weaknessScore: numberParam(params.coachWeaknessScore) ?? 0,
    priorityScore: numberParam(params.coachPriorityScore),
    recoveryScore: numberParam(params.coachRecoveryScore),
    focusWords: parseFocusWordsParam(params.coachFocusWords),
    microDiagnosisId: microId,
    microLabelRu: firstParam(params.coachMicroLabelRu) ?? microLabel?.ru,
    microLabelUk: firstParam(params.coachMicroLabelUk) ?? microLabel?.uk,
    microLabelEs: firstParam(params.coachMicroLabelEs) ?? microLabel?.es,
    microLabelPtBr: firstParam(params.coachMicroLabelPtBr) ?? microLabel?.['pt-BR'],
    microLabelVi: firstParam(params.coachMicroLabelVi) ?? microLabel?.vi,
    microLabelId: firstParam(params.coachMicroLabelId) ?? microLabel?.id,
    microLabelTr: firstParam(params.coachMicroLabelTr) ?? microLabel?.tr,
    microLabelPl: firstParam(params.coachMicroLabelPl) ?? microLabel?.pl,
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
export function checkCoachToastNeeded(
  wrongMistakes: PhraseMistakeInput[],
  studyTarget?: RuntimeStudyTarget,
): CoachToastDecision {
  if (!personalPracticeCoachEnabledForTarget(studyTarget)) return { show: false };
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
      labelPtBr: label['pt-BR'],
      labelVi: label.vi,
      labelId: label.id,
      labelTr: label.tr,
      labelPl: label.pl,
      mistakeCount: top.count,
      weaknessScore: top.weaknessScore,
      focusWords: micro?.focusWords.length ? micro.focusWords : focusWordsForCategory(wrongMistakes, top.category),
      microDiagnosisId: micro?.id,
      microLabelRu: micro?.label.ru,
      microLabelUk: micro?.label.uk,
      microLabelEs: micro?.label.es,
      microLabelPtBr: micro?.label['pt-BR'],
      microLabelVi: micro?.label.vi,
      microLabelId: micro?.label.id,
      microLabelTr: micro?.label.tr,
      microLabelPl: micro?.label.pl,
      diagnosisEvidenceCount: micro?.evidenceCount,
    };
  } catch {
    return { show: false };
  }
}

export async function checkCoachToastNeededWithAnalytics(
  wrongMistakes: PhraseMistakeInput[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<CoachToastDecision> {
  if (!personalPracticeCoachEnabledForTarget(studyTarget)) return { show: false };
  const sessionDecision = checkCoachToastNeeded(wrongMistakes, studyTarget);
  if (sessionDecision.show) return sessionDecision;
  if (wrongMistakes.length === 0) return { show: false };

  try {
    const top = getTopCategoryForPhrases(wrongMistakes, 1);
    if (!top || top.exactCount < 1) return { show: false };

    const analytics = storageStudyTarget(studyTarget) === 'fr'
      ? await computeFrenchPhraseAnalytics({ sourceLocale })
      : await computePhraseAnalytics();
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
      labelPtBr: label['pt-BR'],
      labelVi: label.vi,
      labelId: label.id,
      labelTr: label.tr,
      labelPl: label.pl,
      mistakeCount: Math.max(top.count, stat.recentMistakeCount || stat.exactMistakeCount || stat.mistakeCount),
      weaknessScore: stat.weaknessScore,
      priorityScore: stat.priorityScore,
      recoveryScore: stat.recoveryScore,
      focusWords: micro?.focusWords.length ? micro.focusWords : focusWordsForCategory(wrongMistakes, top.category, stat.topWords),
      microDiagnosisId: micro?.id,
      microLabelRu: micro?.label.ru,
      microLabelUk: micro?.label.uk,
      microLabelEs: micro?.label.es,
      microLabelPtBr: micro?.label['pt-BR'],
      microLabelVi: micro?.label.vi,
      microLabelId: micro?.label.id,
      microLabelTr: micro?.label.tr,
      microLabelPl: micro?.label.pl,
      diagnosisEvidenceCount: micro?.evidenceCount,
    };
  } catch {
    return { show: false };
  }
}
