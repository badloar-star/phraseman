/**
 * «Дуэль на 5 фраз» (идея 3) — откуда берутся фразы: классический курс, вшитый в приложение, и локальный прогресс уроков.
 *
 * зачем (координатор 22.10: «фразы — из уже пройденного, без новых загрузок»; Firebase-экономия): ни одного чтения сети —
 * пройденные уроки лежат в локальном прогрессе (lesson<N>_progress), тексты — в сборке. Файл урока читается лениво,
 * только когда дуэль открыта: вкладка «Друзья» не платит за курс заранее.
 * зачем (владелец 11.11): прежний источник — курс занятий — удалён; дуэль переведена на уроки классического курса.
 * Работает для всех пяти языков классического курса; у остальных изучаемых языков пройденного для дуэли нет.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../../constants/i18n';
import { classicCourseActiveFor, getClassicLessonPhrases } from '../classic_course_phrases';
import { LESSON_PROGRESS_PASS_CORRECT, LESSON_PROGRESS_SCAN_COUNT } from '../lesson_progress_scan';
import { lessonProgressKey, type RuntimeStudyTarget } from '../target_storage_keys';
import {
  buildDuelPhraseSet,
  duelLessonKey,
  duelPhrasesFromLesson,
  resolveDuelPhrases,
  type DuelLessonRef,
  type DuelPhrase,
} from './duel_phrases';

const LOG = '[FRIENDS-DUEL]';
/** Последние прочитанные уроки (память процесса): реванш и повторное открытие итога не разбирают курс заново. */
const LESSON_CACHE_MAX = 8;
const lessonCache = new Map<string, readonly DuelPhrase[]>();

/** Фразы «Собери фразу» одного урока из курса в сборке. Нет урока/курса или битый файл — пустой список с причиной в журнале. */
export function loadDuelLessonPhrases(ref: DuelLessonRef, lang: Lang): readonly DuelPhrase[] {
  const key = `${lang}:${duelLessonKey(ref)}`;
  const hit = lessonCache.get(key);
  if (hit) return hit;
  const startedAt = Date.now();
  if (!classicCourseActiveFor(ref.lang)) {
    console.warn(`${LOG} phrases: язык курса=${ref.lang} урок=${ref.lessonOrdinal} — классического курса для языка нет → пусто`); // guard-ok: ранний выход с причиной
    return [];
  }
  try {
    const lessonPhrases = getClassicLessonPhrases(ref.lessonOrdinal, ref.lang);
    if (lessonPhrases.length === 0) {
      console.warn(`${LOG} phrases: язык курса=${ref.lang} урок=${ref.lessonOrdinal} — урока нет в курсе сборки → пусто`); // guard-ok: ранний выход с причиной
      return [];
    }
    const { phrases, skipped } = duelPhrasesFromLesson(lessonPhrases, ref, lang);
    lessonCache.set(key, phrases);
    while (lessonCache.size > LESSON_CACHE_MAX) {
      const oldest = lessonCache.keys().next().value;
      if (oldest === undefined) break;
      lessonCache.delete(oldest);
    }
    console.log(`${LOG} phrases: язык курса=${ref.lang} урок=${ref.lessonOrdinal} интерфейс=${lang} фраз=${phrases.length} пропущено=${skipped} источник=курс в сборке ms=${Date.now() - startedAt}`);
    return phrases;
  } catch (error) {
    console.warn(`${LOG} phrases: язык курса=${ref.lang} урок=${ref.lessonOrdinal} не прочитать (${error instanceof Error ? error.message : String(error)}) → пусто`); // guard-ok: catch с причиной
    return [];
  }
}

/** Сколько верных ответов в сохранённом прогрессе урока; битая запись — 0 (урок просто не считается пройденным). */
function correctAnswers(raw: string | null): number {
  if (!raw) return 0;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry === 'correct' || entry === 'replay_correct').length : 0;
  } catch (error) {
    console.warn(`${LOG} lessons: прогресс урока не разобрался (${error instanceof Error ? error.message : String(error)}) → урок не считаем пройденным`); // guard-ok: catch с причиной
    return 0;
  }
}

/** Пройденные уроки классического курса на этом телефоне (то же правило, что на экране итога урока). Ошибка чтения — пусто, с причиной. */
export async function loadMyDuelLessons(studyTarget: string): Promise<DuelLessonRef[]> {
  if (!classicCourseActiveFor(studyTarget)) {
    console.log(`${LOG} lessons: изучаемый язык=${studyTarget} — классического курса для дуэли нет → пусто`); // guard-ok: ранний выход с причиной
    return [];
  }
  const startedAt = Date.now();
  try {
    const lessonIds = Array.from({ length: LESSON_PROGRESS_SCAN_COUNT }, (_, index) => index + 1);
    // зачем: один multiGet вместо 32 обращений к хранилищу (как lesson_progress_scan).
    const rows = await AsyncStorage.multiGet(lessonIds.map((lessonId) => lessonProgressKey(lessonId, studyTarget as RuntimeStudyTarget)));
    const refs = lessonIds
      .filter((_, index) => correctAnswers(rows[index]?.[1] ?? null) >= LESSON_PROGRESS_PASS_CORRECT)
      .map((lessonOrdinal) => ({ lang: studyTarget, lessonOrdinal }));
    console.log(`${LOG} lessons: язык=${studyTarget} ключей=${rows.length} пройдено=${refs.length} порог=${LESSON_PROGRESS_PASS_CORRECT} источник=локальный прогресс уроков ms=${Date.now() - startedAt}`);
    return refs;
  } catch (error) {
    console.warn(`${LOG} lessons: прогресс уроков не прочитать (${error instanceof Error ? error.message : String(error)}) → пусто`); // guard-ok: catch с причиной
    return [];
  }
}

/** «1» или «1–2»: какие уроки дали фразы (факт «общие уроки» на экране вызова). Нет фраз — null. */
export function duelLessonsLabel(phrases: readonly DuelPhrase[]): string | null {
  if (phrases.length === 0) return null;
  const lessons = phrases.map((p) => p.lessonOrdinal);
  const low = Math.min(...lessons);
  const high = Math.max(...lessons);
  return low === high ? String(low) : `${low}–${high}`;
}

/** Пять фраз нового вызова из своего пройденного. Меньше пяти разных — пусто (экран вызова: «Пока мало пройденных фраз»). */
export async function pickMyDuelPhrases(input: Readonly<{ studyTarget: string; lang: Lang; seed: number }>): Promise<readonly DuelPhrase[]> {
  const lessons = await loadMyDuelLessons(input.studyTarget);
  const startedAt = Date.now();
  const { phrases, lessonsRead } = buildDuelPhraseSet(lessons, input.seed, (ref) => loadDuelLessonPhrases(ref, input.lang));
  console.log(`${LOG} pick: уроков пройдено=${lessons.length} прочитано=${lessonsRead} фраз=${phrases.length} зерно=${input.seed} уроки=${duelLessonsLabel(phrases) ?? '—'} ms=${Date.now() - startedAt}`);
  return phrases;
}

/** Фразы дуэли по id с сервера — из курса на телефоне. Не нашлись все пять — null (в журнале — какие id пришли). */
export function resolveDuelPhrasesOnPhone(ids: unknown, lang: Lang): DuelPhrase[] | null {
  const phrases = resolveDuelPhrases(ids, (ref) => loadDuelLessonPhrases(ref, lang));
  if (phrases === null) console.warn(`${LOG} resolve: фразы дуэли не собрать из курса на телефоне ids=${JSON.stringify(ids)}`);
  return phrases;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
