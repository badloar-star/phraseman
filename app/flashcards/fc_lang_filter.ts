// зачем (владелец 12.10, п.83, cards-027): кнопка языка на настройке тренировки Карточек ФИЛЬТРУЕТ наборы по языку,
// а сама тренировка идёт на языке выбранных наборов, не на языке изучения приложения (studyTarget приложения не меняется, D129/D130).
// Чистый модуль без react-native — вся логика выбора языка тестируется в node. План: docs/phraseman-2.0/R1_FC_LANG_FILTER.md.
import { LEARNING_LANGUAGE_TARGETS, type LearningLanguageTarget } from '../learning_language_contour';
import { isLearningSurfaceReady } from '../learning_language_surface_readiness';
import { PACK_LANGUAGES } from './pack_languages';

export const FC_LANG_FILTER_TAG = '[FC-LANG-FILTER]';

/** Имя параметра маршрута тренировки: язык выбранных наборов. */
export const TRAINING_TARGET_PARAM = 'target';

export type TrainingTargetRejectReason = 'not_a_language' | 'flashcards_not_ready';

export type TrainingTargetResolution = Readonly<{
  /** Язык, на котором идёт тренировка: язык наборов из маршрута или язык приложения. */
  target: LearningLanguageTarget;
  source: 'route' | 'app';
  /** Параметр был, но не принят — причина (для лога); при source='app' без параметра — undefined. */
  rejected?: TrainingTargetRejectReason;
  rawParam?: string;
}>;

// зачем: isLearningLanguageTarget() мягкий (приводит регистр/пробелы), а параметр из ссылки должен совпасть с кодом ТОЧНО:
// 'ES' или ' es' — не язык, откат на язык приложения.
function isExactLanguageCode(value: unknown): value is LearningLanguageTarget {
  return typeof value === 'string' && (LEARNING_LANGUAGE_TARGETS as readonly string[]).includes(value);
}

/** Языки, для которых раздел «Карточки» открыт владельцем (таблица готовности, D129/D130). Порядок — как в выборе языка наборов. */
export function flashcardsReadyLanguages(): readonly LearningLanguageTarget[] {
  return PACK_LANGUAGES.filter(
    (code): code is LearningLanguageTarget => isExactLanguageCode(code) && isLearningSurfaceReady(code, 'flashcards'),
  );
}

export function isFlashcardsReadyLanguage(value: unknown): value is LearningLanguageTarget {
  return isExactLanguageCode(value) && isLearningSurfaceReady(value, 'flashcards');
}

/** expo-router отдаёт параметр строкой или массивом; пустое → null. */
export function readTargetParam(raw: unknown): string | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== 'string') return null;
  const trimmed = first.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Язык тренировки. Параметр маршрута принимается ТОЛЬКО для языка, где «Карточки» готовы (условие координатора 12.10):
 * ссылкой нельзя запустить неподготовленный язык. Не принят → язык приложения + причина для лога.
 */
export function resolveTrainingTarget(rawParam: unknown, appTarget: LearningLanguageTarget): TrainingTargetResolution {
  const param = readTargetParam(rawParam);
  if (param === null) return { target: appTarget, source: 'app' };
  if (!isExactLanguageCode(param)) {
    return { target: appTarget, source: 'app', rejected: 'not_a_language', rawParam: param };
  }
  if (!isLearningSurfaceReady(param, 'flashcards')) {
    return { target: appTarget, source: 'app', rejected: 'flashcards_not_ready', rawParam: param };
  }
  return { target: param, source: 'route' };
}

const LOGGED_RESOLUTIONS = new Set<string>();

// зачем: хук зовётся на каждый рендер сессии — каждый исход пишем один раз, без флуда в консоли.
function logResolutionOnce(resolution: TrainingTargetResolution, appTarget: LearningLanguageTarget): void {
  const key = `${resolution.source}|${resolution.target}|${resolution.rejected ?? ''}|${resolution.rawParam ?? ''}|${appTarget}`;
  if (LOGGED_RESOLUTIONS.has(key)) return;
  LOGGED_RESOLUTIONS.add(key);
  if (resolution.rejected) {
    // откат на язык приложения: ссылкой нельзя запустить неподготовленный язык (условие координатора 12.10)
    console.warn(formatLangFilterLog('target_rejected', {
      reason: resolution.rejected,
      param: resolution.rawParam,
      fallback: appTarget,
    }));
    return;
  }
  if (resolution.source === 'route') {
    console.log(formatLangFilterLog('session_target', { target: resolution.target, appTarget, source: 'route' }));
  }
}

/** Язык сессии по параметру маршрута и языку приложения (с логом исхода). */
export function trainingTargetFromParams(rawParam: unknown, appTarget: LearningLanguageTarget): LearningLanguageTarget {
  const resolution = resolveTrainingTarget(rawParam, appTarget);
  logResolutionOnce(resolution, appTarget);
  return resolution.target;
}

/**
 * Параметр `target` для маршрута тренировки: только когда язык наборов ≠ язык приложения
 * (для языка приложения маршрут остаётся прежним — все ссылки и тесты живы).
 */
export function trainingTargetRouteParam(
  selected: LearningLanguageTarget,
  appTarget: LearningLanguageTarget,
): LearningLanguageTarget | undefined {
  if (selected === appTarget) return undefined;
  return isFlashcardsReadyLanguage(selected) ? selected : undefined;
}

export type LanguageCounts = Readonly<Partial<Record<LearningLanguageTarget, number>>>;

export type LanguageMenuEntry = Readonly<{ code: LearningLanguageTarget; count: number }>;

/** Пункты меню: ВСЕ готовые языки (владелец 15.10: «все языки должны быть и должны быть доступны»), в том числе без наборов (count 0 — экран покажет честное «пусто»); язык приложения первым, остальные — в порядке выбора языка наборов. */
export function languageMenuEntries(counts: LanguageCounts, appTarget: LearningLanguageTarget): readonly LanguageMenuEntry[] {
  const ready = flashcardsReadyLanguages();
  const ordered = [appTarget, ...ready.filter((code) => code !== appTarget)];
  const entries: LanguageMenuEntry[] = [];
  for (const code of ordered) {
    if (!ready.includes(code)) continue;
    entries.push({ code, count: counts[code] ?? 0 });
  }
  return entries;
}

/** Стрелка и нажатие нужны, если есть куда переключиться: другой готовый язык (с наборами или без). */
export function canSwitchLanguage(entries: readonly LanguageMenuEntry[], selected: LearningLanguageTarget): boolean {
  return entries.some((entry) => entry.code !== selected);
}

export type DecksByLanguage<T> = Readonly<Partial<Record<LearningLanguageTarget, readonly T[]>>>;

export function countByLanguage<T>(byLanguage: DecksByLanguage<T>): LanguageCounts {
  const counts: Partial<Record<LearningLanguageTarget, number>> = {};
  for (const code of flashcardsReadyLanguages()) {
    const list = byLanguage[code];
    if (list) counts[code] = list.length;
  }
  return counts;
}

/** Наборы выбранного языка; языка нет в карте → пустой список (экран покажет «пусто», а не чужие наборы). */
export function decksForLanguage<T>(byLanguage: DecksByLanguage<T>, language: LearningLanguageTarget): readonly T[] {
  return byLanguage[language] ?? [];
}

/** Выбранные id оставляем только среди видимых наборов (смена языка сбрасывает чужое хранилище). */
export function reconcileSelectedDeckIds<Id extends string>(selected: readonly Id[], visible: readonly Id[]): Id[] {
  const allowed = new Set<string>(visible);
  return selected.filter((id) => allowed.has(id));
}

export function formatLangFilterLog(event: string, details: Record<string, unknown>): string {
  return `${FC_LANG_FILTER_TAG} ${event} ${JSON.stringify(details)}`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
