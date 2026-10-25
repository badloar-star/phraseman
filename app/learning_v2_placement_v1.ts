// learning_v2_placement_v1.ts — данные входного теста «Не хочу с начала» (реестр владельца №10) для экрана 2 · ДИЗАЙН.
// зачем (владелец 21.10, docs/work/OWNER_DECISIONS_2026-10-21.md стр. 85–91; координатор 24.10): один механизм с экзаменом
// главы — вопросы из готовых заданий курса, проверка ответа без сети; итог — уроки до N ПРОСТО ОТКРЫТЫ (прогресс v2 «open»,
// не засчитаны, без звёзд). Решает телефон, облако только хранит (маски прогресса и флаг кнопки синхронизируются как есть).
// Запас вопросов — правило 12 · ТЕОРИИ (933301947, 9aa35c831): задание «вставь слово» урока, сначала без подсказки; исключения
// у3 i14 занятий 1–8 и у9 «просьба не открывать / не трогать»; у15 — фразу «Передайте … через …» отрезаем ТОЛЬКО в тесте;
// у14 — годных на -ing / when / while нет, берём что есть и логируем нехватку. Журнал [PLACEMENT].
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEARNING_V2_OWNER_EN_TITLES_RU } from '../components/learning-v2/learningV2OwnerLayout';
import { learningV2CourseSessionIdV1, LEARNING_V2_COURSE_LESSON_COUNT_V1, LEARNING_V2_LESSON_SESSION_COUNT_V1 } from '../modules/learning-v2/content/course_topology_v1';
import type { ChapterExamQuestionV1 } from '../modules/learning-v2/exam/chapter_exam_v1';
import type { PlacementTestResultV1 } from '../modules/learning-v2/exam/placement_test_v1';
import { createLearningV2CourseLocalProgressStoreV1, type LearningV2CourseProgressViewV2 } from '../modules/learning-v2/progress/course_local_progress_v1';
import { deriveLocalOfflineProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import { isLearningV2SessionReleasedV1 } from './learning_v2_session_availability_v1';
import { markLearningV2NotFromStartUsedV1 } from './learning_v2_not_from_start_once_v1';
import { getStableId } from './stable_id';

const LOG = '[PLACEMENT]';
/** Уроки, на которых Теория проверила запас вопросов (933301947). Дальше — только после её проверки. */
export const LEARNING_V2_PLACEMENT_MAX_LESSON_V1 = 22;

/** Вопрос теста: тот же вопрос, что у экзамена главы (рисуется тем же роутером), + урок и, для у15, условие без подсказки. */
export type LearningV2PlacementQuestionV1 = ChapterExamQuestionV1 & Readonly<{
  lessonOrdinal: number;
  /** У15: условие без последней фразы «Передайте … через …» — показывать вместо interaction.prompt. Иначе null. */
  promptOverride: string | null;
}>;

/** Уроки теста по порядку: материалы урока выпущены целиком и запас вопросов проверен Теорией. */
export function learningV2PlacementLessonsV1(): readonly number[] {
  const out: number[] = [];
  for (let lesson = 1; lesson <= LEARNING_V2_PLACEMENT_MAX_LESSON_V1; lesson += 1) {
    if (!isLearningV2SessionReleasedV1(lesson, LEARNING_V2_LESSON_SESSION_COUNT_V1)) break;
    out.push(lesson);
  }
  console.log(LOG, 'lessons', JSON.stringify({ count: out.length, last: out[out.length - 1] ?? null, cap: LEARNING_V2_PLACEMENT_MAX_LESSON_V1 })); // guard-ok: какие уроки в тесте
  return Object.freeze(out);
}

/** Тема урока для карточки вопроса и итога (названия уроков курса). */
export function learningV2PlacementLessonTitleV1(lessonOrdinal: number): string {
  return LEARNING_V2_OWNER_EN_TITLES_RU[lessonOrdinal - 1] ?? '';
}

type Interaction = Readonly<{ interactionId: string; family: string; purpose?: string; prompt?: string; modePayload?: unknown }>;
const sessionInteractions = new Map<string, readonly Interaction[] | null>();

function lessonSessionInteractions(lessonOrdinal: number, sessionOrdinal: number, locale: 'ru' | 'uk'): readonly Interaction[] | null {
  const key = `${lessonOrdinal}:${sessionOrdinal}:${locale}`;
  if (sessionInteractions.has(key)) return sessionInteractions.get(key) ?? null;
  let out: readonly Interaction[] | null = null;
  try {
    // зачем: модуль курса тяжёлый — грузим лениво и собираем одно занятие на вопрос, а не все 56 занятий урока
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { materializeFactoryNativeLearningV2SessionV1 } = require('../modules/learning-v2/content/factory_native/factory_native_course_v1') as typeof import('../modules/learning-v2/content/factory_native/factory_native_course_v1');
    const factory = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal, sessionOrdinal, interfaceLocale: locale });
    out = factory ? (factory.learnerChild.interactions as readonly Interaction[]) : null;
    if (!out) console.warn(LOG, 'session:not_materialized', JSON.stringify({ lessonOrdinal, sessionOrdinal, locale })); // guard-ok: ранний выход пишет причину
  } catch (error) {
    console.warn(LOG, 'session:materialize_failed', JSON.stringify({ lessonOrdinal, sessionOrdinal, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
  sessionInteractions.set(key, out);
  return out;
}

const L15_HINT_RE = /\s*Передайте\s[^.]*?через\s[^.]*\.?\s*$/u;

/** Подходит ли задание как вопрос «на тему урока» (правило Теории); для у15 — только задания с подсказкой формы. */
function eligible(lessonOrdinal: number, sessionOrdinal: number, interaction: Interaction): boolean {
  if (interaction.family !== 'context_gap_grammar') return false;
  const prompt = interaction.prompt ?? '';
  // у3: «без подсказки» в занятиях 1–8 (i14) проверяет Is / Am / Are — тему урока 2
  if (lessonOrdinal === 3 && sessionOrdinal <= 8 && /:i14$/u.test(interaction.interactionId)) return false;
  // у9: «Завершите просьбу не открывать / не трогать» — ответ «Don't …», тема урока 8
  if (lessonOrdinal === 9 && /не открывать|не трогать|не відкривати|не чіпати/iu.test(prompt)) return false;
  // у15: годятся задания «Передайте … через …» — они проверяют главное (решил сам / договорился); подсказку отрежем
  if (lessonOrdinal === 15 && !L15_HINT_RE.test(prompt)) return false;
  return true;
}

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1_000_000) / 1_000_000; };
}

/**
 * Вопрос на тему урока: attemptIndex 0 — первый, 1–2 — «ещё 2 вопроса по этой теме». Без подсказки — первыми; уже заданные
 * (usedInteractionIds) не повторяются. Занятия перебираются в перемешанном порядке, собирается только нужное. null — нет годных.
 */
export function learningV2PlacementQuestionV1(input: Readonly<{
  lessonOrdinal: number;
  attemptIndex: number;
  usedInteractionIds: readonly string[];
  locale?: 'ru' | 'uk';
}>): LearningV2PlacementQuestionV1 | null {
  const locale = input.locale ?? 'ru';
  const used = new Set(input.usedInteractionIds);
  const random = seeded(`placement:${input.lessonOrdinal}:${input.attemptIndex}:${used.size}`);
  const order = Array.from({ length: LEARNING_V2_LESSON_SESSION_COUNT_V1 }, (_x, i) => i + 1).sort(() => random() - 0.5);
  let fallback: { sessionOrdinal: number; interaction: Interaction } | null = null;
  let scanned = 0;
  for (const sessionOrdinal of order) {
    const interactions = lessonSessionInteractions(input.lessonOrdinal, sessionOrdinal, locale);
    if (!interactions) continue;
    scanned += 1;
    for (const interaction of interactions) {
      if (used.has(interaction.interactionId) || !eligible(input.lessonOrdinal, sessionOrdinal, interaction)) continue;
      const noHint = interaction.purpose === 'independent_check' || interaction.purpose === 'retrieval_practice';
      if (noHint) return build(input.lessonOrdinal, sessionOrdinal, interaction, scanned, 'no_hint');
      fallback ??= { sessionOrdinal, interaction };
    }
    // запасной вариант найден, а сборка следующих занятий стоит времени — после 6 занятий берём его
    if (fallback && scanned >= 6) break;
  }
  if (fallback) return build(input.lessonOrdinal, fallback.sessionOrdinal, fallback.interaction, scanned, 'with_hint');
  console.warn(LOG, 'question:none', JSON.stringify({ lessonOrdinal: input.lessonOrdinal, attemptIndex: input.attemptIndex, used: used.size, scanned })); // guard-ok: ранний выход пишет причину
  return null;
}

function build(lessonOrdinal: number, sessionOrdinal: number, interaction: Interaction, scanned: number, kind: string): LearningV2PlacementQuestionV1 {
  const promptOverride = lessonOrdinal === 15 ? (interaction.prompt ?? '').replace(L15_HINT_RE, '').trim() || null : null;
  if (lessonOrdinal === 14) {
    // зачем (Теория 933301947): в у14 нет заданий на -ing / when / while — берём was / were и честно пишем о нехватке
    console.warn(LOG, 'l14:topic_gap', JSON.stringify({ interactionId: interaction.interactionId, note: 'нет заданий на was/were + -ing, when/while — 6 новых ждут слова владельца' })); // guard-ok: нехватка запаса
  }
  console.log(LOG, 'question', JSON.stringify({ lessonOrdinal, sessionOrdinal, interactionId: interaction.interactionId, kind, scanned, promptCut: promptOverride !== null })); // guard-ok: какой вопрос выбран и откуда
  return Object.freeze({
    ordinal: 0,
    interactionId: interaction.interactionId,
    courseSessionId: learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal),
    sessionOrdinal,
    family: interaction.family as ChapterExamQuestionV1['family'],
    lessonOrdinal,
    promptOverride,
  });
}

/**
 * Итог теста: в уроках до N открыт только первый эпизод (прогресс v2 «open» — не засчитан, без звёзд), урок N эпизод 1 —
 * точка старта «начнём здесь» (замок владельца 25.10, вариант A). Флаг «Не хочу с начала» ставится —
 * ТОЛЬКО здесь, на итоге (замок владельца 21.10/22.10). Всё на телефоне, сразу; облако подхватит обычным синком.
 */
export async function applyLearningV2PlacementResultV1(result: PlacementTestResultV1): Promise<LearningV2CourseProgressViewV2 | null> {
  console.log(LOG, 'apply:enter', JSON.stringify(result)); // guard-ok: вход
  void markLearningV2NotFromStartUsedV1('placement_result');
  if (result.openedLessonOrdinals.length === 0) {
    console.log(LOG, 'apply:nothing_to_open', JSON.stringify({ startLessonOrdinal: result.startLessonOrdinal })); // guard-ok: ранний выход с причиной
    return null;
  }
  try {
    // зачем: тот же ключ прогресса, что у экзамена главы (app/learning-v2/chapter-exam.tsx)
    const scope = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
    // зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10: «они должны быть закрыты, открывается после теста только 1 урок каждого урока, а не все уроки
    // сразу»; вариант A координатора): в уроках 1…N−1 открыт ТОЛЬКО первый эпизод, ничего не засчитано; урок N, эпизод 1 —
    // точка старта «начнём здесь» (туда ведёт «Продолжить»). Все темы знакомы — точка старта на уроке после последнего.
    const ids = result.openedLessonOrdinals.map((lesson) => learningV2CourseSessionIdV1(lesson, 1));
    const lastOpened = result.openedLessonOrdinals.length > 0 ? Math.max(...result.openedLessonOrdinals) : null;
    const startLesson = result.startLessonOrdinal ?? (lastOpened !== null && lastOpened < LEARNING_V2_COURSE_LESSON_COUNT_V1 ? lastOpened + 1 : null);
    let startId: string | null = null;
    try {
      startId = startLesson === null ? null : learningV2CourseSessionIdV1(startLesson, 1);
    } catch (error) {
      console.warn(LOG, 'apply:start_outside_course', JSON.stringify({ startLesson, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: урок за пределом курса — без точки старта
    }
    const view = await createLearningV2CourseLocalProgressStoreV1(AsyncStorage).placeStart(scope, { openIds: ids, startId, source: 'placement_test' });
    console.log(LOG, 'apply:opened', JSON.stringify({ lessons: result.openedLessonOrdinals, firstEpisodesOpened: ids.length, startId, current: view.currentSessionId })); // guard-ok: итог
    return view;
  } catch (error) {
    console.warn(LOG, 'apply:failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return null;
  }
}

export default function __RouteShim() { return null; }
