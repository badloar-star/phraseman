// paywall_upcoming_phrases_v1.ts — 3–4 фразы «что скажешь через 30 дней» для пейвола М из ближайших непройденных уроков курса.
// зачем (координатор 25.10, для 2 · ДИЗАЙН): блок пейвола показывает настоящие фразы курса этого человека, а не рекламные. Только
// локальный контент: вступление занятия уже в бандле (ленивый require из манифеста), ни сети, ни Firestore, ответ синхронный.
// Пара берётся из карточки «Скажи так» вступления (learningV2IntroSayPartsForPageV1) — там чистые фраза и значение на ru/uk;
// строка задания («Соберите фразу — брат высокий; …») для этого не годится. Нечего показать — пустой массив, блок скрывается.
import { learningV2IntroSayPartsForPageV1 } from '../runtime/task_prompt_parts_v1';

const LOG = '[PAYWALL-M-PHRASES]';
const SESSION_RE = /^lesson-0*(\d+):session:0*(\d+)$/u;

export type LearningV2UpcomingPhraseV1 = Readonly<{ en: string; translation: string; lessonOrdinal: number; sessionOrdinal: number }>;

type ManifestRow = Readonly<{ lessonOrdinal: number; sessionOrdinal: number; loadIntro: () => unknown }>;
type IntroPage = Readonly<{ pageId?: unknown; bodyByLocale?: Readonly<Record<string, unknown>> }>;

// Ключ (урок:занятие:язык) → фраза или null: одно занятие разбирается один раз за процесс.
const cache = new Map<string, LearningV2UpcomingPhraseV1 | null>();

function manifestRows(): readonly ManifestRow[] {
  // зачем: манифест (1596 строк с ленивыми require) нужен только при показе блока — не тянем его в первый кадр пейвола
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./factory_native/factory_native_manifest_v1.generated') as { FACTORY_NATIVE_MANIFEST_V1: readonly ManifestRow[] }).FACTORY_NATIVE_MANIFEST_V1;
}

function phraseOf(row: ManifestRow, locale: 'ru' | 'uk'): LearningV2UpcomingPhraseV1 | null {
  const key = `${row.lessonOrdinal}:${row.sessionOrdinal}:${locale}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let out: LearningV2UpcomingPhraseV1 | null = null;
  try {
    const pages = ((row.loadIntro() as { pages?: unknown }).pages ?? []) as readonly IntroPage[];
    for (const page of pages) {
      const body = typeof page.bodyByLocale?.[locale] === 'string' ? (page.bodyByLocale[locale] as string) : '';
      const phrase = learningV2IntroSayPartsForPageV1({ pageId: String(page.pageId ?? ''), body, interfaceLocale: locale }).phrase;
      if (phrase?.text && phrase.meaning) { out = { en: phrase.text, translation: phrase.meaning, lessonOrdinal: row.lessonOrdinal, sessionOrdinal: row.sessionOrdinal }; break; }
    }
    if (!out) console.log(`${LOG} session:no_say_phrase`, JSON.stringify({ lesson: row.lessonOrdinal, session: row.sessionOrdinal, locale, pages: pages.length })); // guard-ok: почему занятие не дало фразы
  } catch (error) {
    console.warn(`${LOG} session:intro_failed`, JSON.stringify({ lesson: row.lessonOrdinal, session: row.sessionOrdinal, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
  cache.set(key, out);
  return out;
}

/**
 * Фразы из ближайших непройденных уроков: по одной из первого занятия каждого следующего выпущенного урока (начиная со
 * следующего); не хватило уроков — из оставшихся непройденных занятий текущего урока. Пусто — курс пройден, данных нет или
 * язык интерфейса без перевода (перевод курса есть только ru/uk; русский перевод другому языку не показываем).
 */
export function learningV2UpcomingCoursePhrasesV1(input: Readonly<{
  /** Текущее занятие из прогресса курса («lesson-1:session:09»); null — курс пройден либо прогресса нет. */
  currentSessionId: string | null;
  /** Пройдено ли что-нибудь — отличает новичка (null + ничего не пройдено) от прошедшего курс. */
  completedCount: number;
  interfaceLocale: string;
  count?: number;
}>): readonly LearningV2UpcomingPhraseV1[] {
  const want = Math.max(1, Math.min(4, input.count ?? 4));
  if (input.interfaceLocale !== 'ru' && input.interfaceLocale !== 'uk') {
    console.log(`${LOG} empty`, JSON.stringify({ reason: 'no_translation_for_locale', locale: input.interfaceLocale })); // guard-ok: ранний выход с причиной
    return [];
  }
  const locale = input.interfaceLocale;
  const match = SESSION_RE.exec(input.currentSessionId ?? '');
  if (!match && input.completedCount > 0) {
    console.log(`${LOG} empty`, JSON.stringify({ reason: 'course_completed', completedCount: input.completedCount })); // guard-ok: ранний выход с причиной
    return [];
  }
  // новичок без прогресса — как будто он в первом занятии первого урока
  const currentLesson = match ? Number(match[1]) : 1;
  const currentSession = match ? Number(match[2]) : 1;
  const rows = manifestRows();
  const firstOfNextLessons = [...new Set(rows.map((r) => r.lessonOrdinal))]
    .filter((lesson) => lesson > currentLesson)
    .sort((a, b) => a - b)
    .map((lesson) => rows.find((r) => r.lessonOrdinal === lesson && r.sessionOrdinal === 1))
    .filter((r): r is ManifestRow => !!r);
  const restOfCurrentLesson = rows
    .filter((r) => r.lessonOrdinal === currentLesson && r.sessionOrdinal > currentSession)
    .sort((a, b) => a.sessionOrdinal - b.sessionOrdinal);
  const out: LearningV2UpcomingPhraseV1[] = [];
  const seen = new Set<string>();
  for (const [source, list] of [['next_lessons', firstOfNextLessons], ['current_lesson_rest', restOfCurrentLesson]] as const) {
    for (const row of list) {
      if (out.length >= want) break;
      const phrase = phraseOf(row, locale);
      if (!phrase || seen.has(phrase.en.toLowerCase())) continue;
      seen.add(phrase.en.toLowerCase());
      out.push(phrase);
    }
    if (out.length > 0) console.log(`${LOG} source`, JSON.stringify({ source, taken: out.length, candidates: list.length })); // guard-ok: откуда взяты фразы
  }
  if (out.length === 0) {
    console.log(`${LOG} empty`, JSON.stringify({ reason: 'no_released_lessons_ahead', currentLesson, currentSession, releasedLessons: new Set(rows.map((r) => r.lessonOrdinal)).size })); // guard-ok: пусто с причиной
    return [];
  }
  console.log(`${LOG} result`, JSON.stringify({ currentLesson, currentSession, locale, count: out.length, from: out.map((p) => `${p.lessonOrdinal}:${p.sessionOrdinal}`) })); // guard-ok: итог, что увидит человек
  return Object.freeze(out);
}

export function __resetUpcomingPhrasesCacheForTests(): void {
  cache.clear();
}
