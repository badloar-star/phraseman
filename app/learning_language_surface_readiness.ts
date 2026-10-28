// ═══════════════════════════════════════════════════════════════════════════
// learning_language_surface_readiness.ts — ЕДИНСТВЕННАЯ таблица «язык × раздел».
//
// зачем D129 (владелец 2026-09-30): раздел показывается для языка обучения ТОЛЬКО
// если он для этого языка готов. Курс (Уроки / «Обучение») готов лишь для
// английского; D201 открывает также испанский Learning V2 по решению владельца.
// Ежедневные задания собираются только из видимых разделов.
// зачем D130: итальянский — только видео на Главной, задания и карточки.
//
// ⛔ Каждая клетка — решение ВЛАДЕЛЬЦА со ссылкой на строку 03_DECISIONS.md.
// Новый язык или раздел → СНАЧАЛА спросить владельца, включать ли раздел, записать
// решение в docs/phraseman-2.0/03_DECISIONS.md, потом менять клетку. Сторож:
// tests/learning_language_surface_readiness_guard.test.ts.
// ═══════════════════════════════════════════════════════════════════════════

import {
  LEARNING_LANGUAGE_SURFACES,
  LEARNING_LANGUAGE_TARGETS,
  type LearningLanguageSurface,
  type LearningLanguageTarget,
} from './learning_language_surface_matrix';

export type LearningSurfaceReadinessStatus = 'ready' | 'hidden';

export type LearningSurfaceReadinessCell = Readonly<{
  status: LearningSurfaceReadinessStatus;
  /** Номер решения владельца в docs/phraseman-2.0/03_DECISIONS.md, например 'D129'. */
  decidedBy: string;
}>;

const ready = (decidedBy: string): LearningSurfaceReadinessCell => Object.freeze({ status: 'ready', decidedBy });
const hidden = (decidedBy: string): LearningSurfaceReadinessCell => Object.freeze({ status: 'hidden', decidedBy });

/**
 * Факты из кода на 2026-09-30 (почему клетка такая):
 * - lessons / diagnostic_and_exam — английский (D129); learning_v2 — также испанский (D201).
 * - daily_phrase — банк фраз есть у en и fr (daily_phrase_target_gate.ts); у es/de/it — принятые пакеты в сборке
 *   (D163, владелец 12.10: «Фразы дня должны быть подключены для ВСЕХ языков», app/daily_phrase_bundled_packs.ts).
 * - dialogues — es/fr/de выпущены владельцем 2026-09-20 (dialogue_language_activation.ts);
 *   для it раздела нет (D130).
 * - arena — удалена в 2.0 (D83), скрыта у всех.
 * - videos — D132: лента Главной берёт канал на языке изучения из каталога YouTube,
 *   канала нет → лента скрыта (английский канал другим языкам не подставляем).
 * - flashcards — раздел открыт у всех по D129/D130; D160: встроенный английский банк
 *   системных карточек у es/de/it не показывается (родного банка нет), свои и маркетные
 *   наборы открыты; пустой/неизвестный язык = язык по умолчанию (app/flashcards_target_gate.ts).
 * - spire — D155: non-English contour is ready only when its generated
 *   release manifest carries both an independent PASS receipt and an approved
 *   publication receipt. BLOCK manifests stay hidden fail-closed.
 */
export const LEARNING_LANGUAGE_SURFACE_READINESS: Readonly<
  Record<LearningLanguageTarget, Readonly<Record<LearningLanguageSurface, LearningSurfaceReadinessCell>>>
> = Object.freeze({
  en: Object.freeze({
    lessons: ready('D129'),
    learning_v2: ready('D129'),
    daily_phrase: ready('D129'),
    dialogues: ready('D129'),
    arena: hidden('D83'),
    videos: ready('D132'),
    flashcards: ready('D129'),
    diagnostic_and_exam: ready('D129'),
    spire: ready('D133'),
  }),
  es: Object.freeze({
    lessons: hidden('D129'),
    learning_v2: ready('D201'),
    daily_phrase: ready('D163'),
    dialogues: ready('D129'),
    arena: hidden('D83'),
    videos: ready('D132'),
    flashcards: ready('D129'),
    diagnostic_and_exam: hidden('D129'),
    spire: ready('D155'),
  }),
  fr: Object.freeze({
    lessons: hidden('D129'),
    learning_v2: hidden('D129'),
    daily_phrase: ready('D129'),
    dialogues: ready('D129'),
    arena: hidden('D83'),
    videos: ready('D132'),
    flashcards: ready('D129'),
    diagnostic_and_exam: hidden('D129'),
    spire: ready('D156'),
  }),
  de: Object.freeze({
    lessons: hidden('D129'),
    learning_v2: hidden('D129'),
    daily_phrase: ready('D163'),
    dialogues: ready('D129'),
    arena: hidden('D83'),
    videos: ready('D132'),
    flashcards: ready('D129'),
    diagnostic_and_exam: hidden('D129'),
    spire: ready('D157'),
  }),
  it: Object.freeze({
    lessons: hidden('D130'),
    learning_v2: hidden('D130'),
    daily_phrase: ready('D163'),
    dialogues: hidden('D130'),
    arena: hidden('D83'),
    videos: ready('D130'),
    flashcards: ready('D130'),
    diagnostic_and_exam: hidden('D130'),
    spire: ready('D155'),
  }),
});

export function learningSurfaceReadiness(
  target: LearningLanguageTarget,
  surface: LearningLanguageSurface,
): LearningSurfaceReadinessCell {
  const cell = LEARNING_LANGUAGE_SURFACE_READINESS[target]?.[surface];
  if (!cell) {
    // зачем: клетки нет только если таблицу обошли (тип не даст, но данные могли прийти
    // как any). Fail-closed: раздел скрыт, причина в логе.
    console.warn('[LANG-SURFACE] readiness:missing_cell → hidden', { target, surface });
    return hidden('missing');
  }
  return cell;
}

export function isLearningSurfaceReady(
  target: LearningLanguageTarget,
  surface: LearningLanguageSurface,
): boolean {
  return learningSurfaceReadiness(target, surface).status === 'ready';
}

/** Вкладка «Обучение» и плитка «Уроки» — это курс: Уроки V1 + Learning V2. */
export function isLearnTabVisibleForTarget(target: LearningLanguageTarget): boolean {
  return isLearningSurfaceReady(target, 'lessons') || isLearningSurfaceReady(target, 'learning_v2');
}

/** Все клетки таблицы — для сторожа и отчётов. */
export function listLearningSurfaceReadinessCells(): readonly Readonly<{
  target: LearningLanguageTarget;
  surface: LearningLanguageSurface;
  cell: LearningSurfaceReadinessCell;
}>[] {
  return LEARNING_LANGUAGE_TARGETS.flatMap((target) => LEARNING_LANGUAGE_SURFACES.map((surface) => ({
    target,
    surface,
    cell: LEARNING_LANGUAGE_SURFACE_READINESS[target]?.[surface],
  })));
}

/* expo-router: не регистрировать файл как экран */
export default function __LearningLanguageSurfaceReadinessRouteShim() {
  return null;
}
