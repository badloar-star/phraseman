/**
 * «Дуэль на 5 фраз» (идея 3) — откуда берутся фразы: курс, вшитый в приложение, и локальный прогресс курса.
 *
 * зачем (координатор 22.10: «фразы — из уже пройденного, без новых загрузок»; Firebase-экономия): ни одного чтения сети —
 * пройденные занятия лежат в локальном прогрессе курса, тексты — в сборке. Модули курса подключаем лениво (как
 * app/learning_v2_home_continue_route.ts): вкладка «Друзья» не платит за каталог курса, пока дуэль не открыта.
 * Курс factory_native — английский; у других изучаемых языков пройденного для дуэли пока нет (решение D188: дуэль — один язык).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../../constants/i18n';
import {
  buildDuelPhraseSet,
  duelPhrasesFromRow,
  duelSessionKey,
  resolveDuelPhrases,
  type DuelAuthoredLocale,
  type DuelPhrase,
  type DuelSessionRef,
} from './duel_phrases';

const LOG = '[FRIENDS-DUEL]';
/** Последние прочитанные занятия (память процесса): реванш и повторное открытие итога не разбирают курс заново. */
const SESSION_CACHE_MAX = 16;
const sessionCache = new Map<string, readonly DuelPhrase[]>();

/** Язык подачи курса: украинский — свой, остальные — русский (как FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1). */
export function duelAuthoredLocale(lang: Lang): DuelAuthoredLocale {
  return lang === 'uk' ? 'uk' : 'ru';
}

/** Задания «Собери фразу» одного занятия из курса в сборке. Нет занятия или битый файл — пустой список с причиной в журнале. */
export function loadDuelSessionPhrases(ref: DuelSessionRef, lang: Lang): readonly DuelPhrase[] {
  const locale = duelAuthoredLocale(lang);
  const key = `${locale}:${duelSessionKey(ref)}`;
  const hit = sessionCache.get(key);
  if (hit) return hit;
  const startedAt = Date.now();
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { FACTORY_NATIVE_MANIFEST_V1 } = require('../../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as typeof import('../../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const row = FACTORY_NATIVE_MANIFEST_V1.find((r) => r.lessonOrdinal === ref.lessonOrdinal && r.sessionOrdinal === ref.sessionOrdinal);
    if (!row) {
      console.warn(`${LOG} phrases: занятия урок=${ref.lessonOrdinal} занятие=${ref.sessionOrdinal} нет в курсе сборки → пусто`);
      return [];
    }
    const { phrases, skipped } = duelPhrasesFromRow(row, locale);
    sessionCache.set(key, phrases);
    while (sessionCache.size > SESSION_CACHE_MAX) {
      const oldest = sessionCache.keys().next().value;
      if (oldest === undefined) break;
      sessionCache.delete(oldest);
    }
    console.log(`${LOG} phrases: урок=${ref.lessonOrdinal} занятие=${ref.sessionOrdinal} язык=${locale} фраз=${phrases.length} пропущено=${skipped} ms=${Date.now() - startedAt}`);
    return phrases;
  } catch (error) {
    console.warn(`${LOG} phrases: урок=${ref.lessonOrdinal} занятие=${ref.sessionOrdinal} не прочитать (${error instanceof Error ? error.message : String(error)}) → пусто`);
    return [];
  }
}

/** Пройденные занятия курса этого аккаунта (только выпущенные). Не английский курс или ошибка чтения — пусто, с причиной. */
export async function loadMyDuelSessions(studyTarget: string): Promise<DuelSessionRef[]> {
  if (studyTarget !== 'en') {
    console.log(`${LOG} sessions: изучаемый язык=${studyTarget} — пройденного курса для дуэли нет (курс фраз только английский) → пусто`);
    return [];
  }
  const startedAt = Date.now();
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { factoryNativeLearningV2AvailabilityV1 } = require('../../modules/learning-v2/content/factory_native/factory_native_catalog_v1') as typeof import('../../modules/learning-v2/content/factory_native/factory_native_catalog_v1');
    const { isLearningV2SessionReleasedV1 } = require('../learning_v2_session_availability_v1') as typeof import('../learning_v2_session_availability_v1');
    const { createLearningV2CourseLocalProgressStoreV1 } = require('../../modules/learning-v2/progress/course_local_progress_v1') as typeof import('../../modules/learning-v2/progress/course_local_progress_v1');
    const { deriveLocalOfflineProgressAccountScopeHash } = require('../../modules/learning-v2/progress/progress_account_scope') as typeof import('../../modules/learning-v2/progress/progress_account_scope');
    const { getStableId } = require('../stable_id') as typeof import('../stable_id');
    const { withAccountTransitionLock } = require('../account_generation') as typeof import('../account_generation');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const released = new Map(factoryNativeLearningV2AvailabilityV1().sessions
      .filter((s) => isLearningV2SessionReleasedV1(s.lessonOrdinal, s.sessionOrdinal))
      .map((s) => [s.courseSessionId, { lessonOrdinal: s.lessonOrdinal, sessionOrdinal: s.sessionOrdinal }] as const));
    const state = await withAccountTransitionLock(async () => {
      const scope = deriveLocalOfflineProgressAccountScopeHash(await getStableId());
      return createLearningV2CourseLocalProgressStoreV1(AsyncStorage).load(scope);
    });
    const refs = state.completedSessionIds.flatMap((id) => {
      const ref = released.get(id);
      return ref ? [ref] : [];
    });
    console.log(`${LOG} sessions: пройдено=${state.completedSessionIds.length} из них выпущено=${refs.length} источник=локальный прогресс курса ms=${Date.now() - startedAt}`);
    return refs;
  } catch (error) {
    console.warn(`${LOG} sessions: прогресс курса не прочитать (${error instanceof Error ? error.message : String(error)}) → пусто`);
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
  const sessions = await loadMyDuelSessions(input.studyTarget);
  const startedAt = Date.now();
  const { phrases, sessionsRead } = buildDuelPhraseSet(sessions, input.seed, (ref) => loadDuelSessionPhrases(ref, input.lang));
  console.log(`${LOG} pick: занятий пройдено=${sessions.length} прочитано=${sessionsRead} фраз=${phrases.length} зерно=${input.seed} уроки=${duelLessonsLabel(phrases) ?? '—'} ms=${Date.now() - startedAt}`);
  return phrases;
}

/** Фразы дуэли по id с сервера — из курса на телефоне. Не нашлись все пять — null (в журнале — какие id пришли). */
export function resolveDuelPhrasesOnPhone(ids: unknown, lang: Lang): DuelPhrase[] | null {
  const phrases = resolveDuelPhrases(ids, (ref) => loadDuelSessionPhrases(ref, lang));
  if (phrases === null) console.warn(`${LOG} resolve: фразы дуэли не собрать из курса на телефоне ids=${JSON.stringify(ids)}`);
  return phrases;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
