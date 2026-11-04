/**
 * Правило дополнительного языка классического курса (владелец 04.11, через координатора).
 *
 * Free = уроки 1–3 ПЕРВОГО выбранного языка (его даёт онбординг); дополнительные языки — Plus. Только для НОВЫХ пользователей:
 * старые сохраняют всё, что у них было. Касается классических курсов EN/ES/FR/DE/IT; видео, карточки и Learning V2 не затрагиваются.
 *
 * зачем так (координатор 04.11, пункты Б–Г):
 *  - «новый» определяется ОДИН РАЗ — в момент завершения онбординга (метка + нет прежнего прогресса, как в rank_gates_new_user) и
 *    записывается вместе с первым языком. Позже вердикт не пересчитывается: иначе первая же пройденная минута (streak/XP) делала бы
 *    нового «старым», а облачное восстановление — наоборот;
 *  - запись — ключ УСТРОЙСТВА: не в SYNC_KEYS (облако её не меняет), при выходе/смене аккаунта стирается вместе с остальным
 *    (у нового аккаунта своя запись из его онбординга). Нет записи / битая запись / чужой язык = НЕ запирать (лучше открыть лишнее);
 *  - момент выхода версии — общая константа RANK_GATES_NEW_USERS_SINCE_MS (ставит координатор при нарезке сборки); пока там максимум,
 *    «новых» нет и замок не работает.
 * Журнал: [COURSE-LANG].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';
import { RANK_GATES_PRIOR_PROGRESS_KEYS, judgeRankGateUser, type RankGateUserVerdict } from './rank_gates_new_user';
import { MAIN_COURSE_LESSON_COUNT } from './main_course_access';
import { STUDY_TARGETS, isStudyTarget, STUDY_TARGET_STORAGE_KEY } from './study_target';
import { lessonBestScoreKey, lessonProgressKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const LOG = '[COURSE-LANG]';

/** Ключ устройства: { v, primary, newUser, atMs }. Не входит в SYNC_KEYS. */
export const PRIMARY_COURSE_LANGUAGE_KEY = 'primary_course_language_v1';

export type PrimaryCourseLanguageRecord = Readonly<{ v: 1; primary: string; newUser: boolean; atMs: number }>;

export type CourseLanguageLockReason =
  | 'locked'
  | 'no_record'
  | 'not_new_user'
  | 'primary_language'
  | 'unknown_target'
  | 'has_progress'
  | 'read_failed';

export type CourseLanguageLock = Readonly<{ locked: boolean; reason: CourseLanguageLockReason; primary: string | null; target: string | null }>;

/** Чистое правило: запирает только нового пользователя на языке, отличном от первого. Всё неопределённое — не запирает. */
export function judgeCourseLanguageLock(input: Readonly<{ record: PrimaryCourseLanguageRecord | null; target: string | null }>): CourseLanguageLock {
  const { record, target } = input;
  if (!record) return { locked: false, reason: 'no_record', primary: null, target };
  if (!target || !isStudyTarget(target)) return { locked: false, reason: 'unknown_target', primary: record.primary, target };
  if (!record.newUser) return { locked: false, reason: 'not_new_user', primary: record.primary, target };
  if (record.primary === target) return { locked: false, reason: 'primary_language', primary: record.primary, target };
  return { locked: true, reason: 'locked', primary: record.primary, target };
}

/**
 * Есть ли в языке курса уже начатое (сохранённый прогресс или лучший результат любого из 32 уроков).
 * зачем (владелец 04.11, жёсткое условие): замок НИКОГДА не блокирует и не скрывает начатое — прогресс не пропадает ни в каком случае
 * (ни после окончания Plus, ни после облачного восстановления). Значение «0»/пусто/null начатым не считается.
 */
export async function languageHasStartedProgress(target: string): Promise<boolean> {
  if (!isStudyTarget(target)) return false;
  const keys: string[] = [];
  for (let lessonId = 1; lessonId <= MAIN_COURSE_LESSON_COUNT; lessonId += 1) {
    keys.push(lessonProgressKey(lessonId, target), lessonBestScoreKey(lessonId, target));
  }
  const rows = await AsyncStorage.multiGet(keys);
  return rows.some(([, value]) => typeof value === 'string' && value !== '' && value !== '0' && value !== 'null' && value !== '{}' && value !== '[]');
}

/** Есть ли начатое хотя бы в одном языке (признак «старого» для вердикта при онбординге). */
export async function anyLanguageHasStartedProgress(): Promise<boolean> {
  for (const target of STUDY_TARGETS) {
    if (await languageHasStartedProgress(target)) return true;
  }
  return false;
}

/** Разбор записи с телефона; всё непохожее на запись = null (не запирать). */
export function parsePrimaryCourseLanguageRecord(raw: string | null | undefined): PrimaryCourseLanguageRecord | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const value = JSON.parse(raw) as Partial<PrimaryCourseLanguageRecord> | null;
    if (!value || value.v !== 1 || typeof value.primary !== 'string' || !isStudyTarget(value.primary)
      || typeof value.newUser !== 'boolean' || typeof value.atMs !== 'number' || !Number.isFinite(value.atMs)) return null;
    return { v: 1, primary: value.primary, newUser: value.newUser, atMs: value.atMs };
  } catch (error) {
    console.warn(`${LOG} record_corrupt`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Вызывается при завершении онбординга (после записи метки времени): фиксирует первый язык и вердикт «новый».
 * Не бросает: сбой записи = записи нет = замок не работает (причина в журнале).
 */
export async function recordPrimaryCourseLanguageAtOnboarding(
  nowMs: number = Date.now(),
  sinceMs?: number,
): Promise<'recorded' | 'no_language' | 'failed'> {
  try {
    const keys = [STUDY_TARGET_STORAGE_KEY, ONBOARDING_COMPLETED_AT_KEY, ...RANK_GATES_PRIOR_PROGRESS_KEYS];
    const map = new Map(await AsyncStorage.multiGet(keys));
    const target = map.get(STUDY_TARGET_STORAGE_KEY);
    if (!isStudyTarget(target)) {
      console.log(`${LOG} onboarding:no_language`, JSON.stringify({ target: target ?? null }));
      return 'no_language';
    }
    const completedAtMs = Number(map.get(ONBOARDING_COMPLETED_AT_KEY));
    const priorProgress = RANK_GATES_PRIOR_PROGRESS_KEYS.some((key) => Number(map.get(key)) > 0) || await anyLanguageHasStartedProgress();
    const verdict: RankGateUserVerdict = judgeRankGateUser({
      completedAtMs: Number.isFinite(completedAtMs) && completedAtMs > 0 ? completedAtMs : null,
      priorProgress,
      nowMs,
      sinceMs,
    });
    const record: PrimaryCourseLanguageRecord = { v: 1, primary: target, newUser: verdict.isNew, atMs: nowMs };
    await AsyncStorage.setItem(PRIMARY_COURSE_LANGUAGE_KEY, JSON.stringify(record));
    memo = null;
    console.log(`${LOG} onboarding:recorded`, JSON.stringify({ primary: target, newUser: verdict.isNew, reason: verdict.reason, priorProgress }));
    return 'recorded';
  } catch (error) {
    console.warn(`${LOG} onboarding:record_failed`, error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}

// Короткая память на процесс: охранник урока зовут часто, а запись меняется только при онбординге.
const MEMO_TTL_MS = 20_000;
let memo: { atMs: number; record: PrimaryCourseLanguageRecord | null } | null = null;
const lockedTargets = new Set<string>();

async function readRecord(nowMs: number): Promise<PrimaryCourseLanguageRecord | null> {
  if (memo && nowMs - memo.atMs < MEMO_TTL_MS) return memo.record;
  const raw = await AsyncStorage.getItem(PRIMARY_COURSE_LANGUAGE_KEY);
  const record = parsePrimaryCourseLanguageRecord(raw);
  memo = { atMs: nowMs, record };
  return record;
}

/** Решение для языка курса. Любая ошибка чтения = не запирать (с причиной в журнале). */
export async function resolveCourseLanguageLock(studyTarget?: RuntimeStudyTarget, nowMs: number = Date.now()): Promise<CourseLanguageLock> {
  const target = storageStudyTarget(studyTarget);
  try {
    let result = judgeCourseLanguageLock({ record: await readRecord(nowMs), target });
    if (result.locked && await languageHasStartedProgress(target)) {
      result = { ...result, locked: false, reason: 'has_progress' };
      console.log(`${LOG} not_locked:has_progress`, JSON.stringify({ target, primary: result.primary }));
    }
    if (result.locked) lockedTargets.add(target); else lockedTargets.delete(target);
    return result;
  } catch (error) {
    console.warn(`${LOG} read_failed`, JSON.stringify({ target, reason: error instanceof Error ? error.message : String(error) }));
    lockedTargets.delete(target);
    return { locked: false, reason: 'read_failed', primary: null, target };
  }
}

/** Синхронно: запирал ли последний ответ охранника этот язык (чтобы пейвол открылся с контекстом language_add). */
export function isCourseLanguageLockedSync(studyTarget?: RuntimeStudyTarget): boolean {
  return lockedTargets.has(storageStudyTarget(studyTarget));
}

/** Только для тестов. */
export function __resetCourseLanguageAccessForTests(): void {
  memo = null;
  lockedTargets.clear();
}
