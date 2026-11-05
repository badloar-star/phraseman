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
import { captureAccountGeneration } from './account_generation';
import { peekCurrentAccountCreatedAtMs } from './account_created_at';
import { ONBOARDING_COMPLETED_AT_KEY } from './fresh_install_gate';
import { RANK_GATES_PRIOR_PROGRESS_KEYS, judgeRankGateUser, type RankGateUserVerdict } from './rank_gates_new_user';
import { isDevForceNewbie } from './dev_force_newbie';
import { MAIN_COURSE_LESSON_COUNT } from './main_course_access';
import { STUDY_TARGETS, isStudyTarget, STUDY_TARGET_STORAGE_KEY } from './study_target';
import { lessonBestScoreKey, lessonProgressKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

const LOG = '[COURSE-LANG]';

/**
 * Прежний ключ УСТРОЙСТВА (один на телефон, без владельца) — оставлен только для разового переноса и для тестов. Новые записи сюда не пишутся.
 * зачем (Ревизор 04.11, блокер): общий ключ переносил первичный язык прежнего владельца на следующий аккаунт того же телефона.
 */
export const PRIMARY_COURSE_LANGUAGE_KEY = 'primary_course_language_v1';
/** Метка вместо удаления прежнего ключа: не запись, поэтому parsePrimaryCourseLanguageRecord вернёт null. */
export const LEGACY_KEY_MIGRATED_MARK = 'migrated_v1';

/**
 * Ключ записи { v, primary, newUser, atMs } ПО ВЛАДЕЛЬЦУ аккаунта: `story_events_v1:primary_course_language:<stableId>` — стираемое семейство
 * (app/cloud_sync WIPE_ONLY_ACCOUNT_KEY_PREFIXES): стирается при выходе и удалении аккаунта, не в SYNC_KEYS, на сервер не уходит.
 */
export const PRIMARY_COURSE_LANGUAGE_KEY_PREFIX = 'story_events_v1:primary_course_language';
export const primaryCourseLanguageKey = (owner: string): string => `${PRIMARY_COURSE_LANGUAGE_KEY_PREFIX}:${owner}`;

/** Владелец сейчас: активный аккаунт со stableId, иначе null (тогда записи нет и замок не работает). */
function activeOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

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
): Promise<'recorded' | 'no_language' | 'no_owner' | 'failed'> {
  try {
    const owner = activeOwner();
    if (!owner) {
      console.log(`${LOG} onboarding:no_owner`, JSON.stringify({ reason: 'нет активного аккаунта со stableId — запись не делаем, замок не работает' }));
      return 'no_owner';
    }
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
      accountCreatedAtMs: peekCurrentAccountCreatedAtMs(), // зачем: ветеран на втором устройстве (старый аккаунт Auth) не «новый» — то же правило, что у ранговых гейтов
    });
    // зачем (Сверка 06.11, dev_state?newbie=on): в dev-ключе запись первого языка считает человека новым (замок дополнительного языка проверяется на залогиненном аккаунте).
    const forceNew = await isDevForceNewbie();
    if (forceNew) console.log(`${LOG} onboarding:dev_force_newbie`, JSON.stringify({ verdictWas: verdict.isNew, now: true })); // guard-ok: ветка и значение
    const record: PrimaryCourseLanguageRecord = { v: 1, primary: target, newUser: forceNew || verdict.isNew, atMs: nowMs };
    if (activeOwner() !== owner) {
      console.log(`${LOG} onboarding:owner_changed`, JSON.stringify({ reason: 'аккаунт сменился во время записи — не пишем чужому' }));
      return 'failed';
    }
    await AsyncStorage.setItem(primaryCourseLanguageKey(owner), JSON.stringify(record));
    memo = null;
    lockedTargets.clear();
    console.log(`${LOG} onboarding:recorded`, JSON.stringify({ primary: target, newUser: verdict.isNew, reason: verdict.reason, priorProgress }));
    return 'recorded';
  } catch (error) {
    console.warn(`${LOG} onboarding:record_failed`, error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}

// Короткая память на процесс: охранник урока зовут часто, а запись меняется только при онбординге.
const MEMO_TTL_MS = 20_000;
let memo: { owner: string; atMs: number; record: PrimaryCourseLanguageRecord | null } | null = null;
const lockedTargets = new Set<string>();
let lastTracedLockDecision: string | null = null;

async function readRecord(nowMs: number): Promise<PrimaryCourseLanguageRecord | null> {
  const owner = activeOwner();
  if (!owner) {
    memo = null;
    lockedTargets.clear();
    return null;
  }
  if (memo && memo.owner === owner && nowMs - memo.atMs < MEMO_TTL_MS) return memo.record;
  if (memo && memo.owner !== owner) lockedTargets.clear(); // другой аккаунт на том же телефоне — чужие решения не переносим
  const key = primaryCourseLanguageKey(owner);
  let record = parsePrimaryCourseLanguageRecord(await AsyncStorage.getItem(key));
  if (!record) record = await migrateLegacyRecord(owner, key);
  if (activeOwner() !== owner) return null; // владелец сменился во время чтения
  memo = { owner, atMs: nowMs, record };
  return record;
}

/**
 * Разовый перенос старого общего ключа: переносим ТОЛЬКО запись с вердиктом «новый» (иначе игнорируем); прежний ключ гасим меткой (НЕ удаляем: замок владельца 04.11 —
 * число удалений ключей хранилища в коде не растёт).
 * Запись с таким вердиктом могла появиться только у сборки с включённым правилом; до выхода версии она всегда «не новый».
 */
async function migrateLegacyRecord(owner: string, key: string): Promise<PrimaryCourseLanguageRecord | null> {
  const legacyRaw = await AsyncStorage.getItem(PRIMARY_COURSE_LANGUAGE_KEY);
  if (legacyRaw === null) return null;
  const legacy = parsePrimaryCourseLanguageRecord(legacyRaw);
  const migrate = legacy !== null && legacy.newUser === true && activeOwner() === owner;
  console.log(`${LOG} legacy_key`, JSON.stringify({ migrate, legacyNew: legacy?.newUser ?? null, primary: legacy?.primary ?? null }));
  if (migrate && legacy) await AsyncStorage.setItem(key, JSON.stringify(legacy));
  await AsyncStorage.setItem(PRIMARY_COURSE_LANGUAGE_KEY, LEGACY_KEY_MIGRATED_MARK); // метка не разбирается как запись → дальше игнорируется
  return migrate ? legacy : null;
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
    // зачем (P0 06.11 «второй язык у бесплатного упирается в пейвол»): решение замка и значения, которые его определили — только при смене, чтобы не шуметь.
    const decisionKey = `${target}|${result.locked ? 1 : 0}|${result.reason}|${result.primary ?? '-'}`;
    if (decisionKey !== lastTracedLockDecision) {
      lastTracedLockDecision = decisionKey;
      console.log(`[ONBOARD-LANG] lock_decision target=${target} locked=${result.locked ? 1 : 0} reason=${result.reason} primary=${result.primary ?? 'none'}`); // guard-ok: трассировка P0
    }
    return result;
  } catch (error) {
    console.warn(`${LOG} read_failed`, JSON.stringify({ target, reason: error instanceof Error ? error.message : String(error) }));
    lockedTargets.delete(target);
    return { locked: false, reason: 'read_failed', primary: null, target };
  }
}

/** Синхронно: запирал ли последний ответ охранника этот язык (чтобы пейвол открылся с контекстом language_add). */
export function isCourseLanguageLockedSync(studyTarget?: RuntimeStudyTarget): boolean {
  if (!memo || memo.owner !== activeOwner()) return false; // ответ охранника относится к другому аккаунту — не запираем
  return lockedTargets.has(storageStudyTarget(studyTarget));
}

/** Только для тестов. */
export function __resetCourseLanguageAccessForTests(): void {
  memo = null;
  lockedTargets.clear();
}
