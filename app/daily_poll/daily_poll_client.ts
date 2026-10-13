// ═══ «Опрос дня» — чтение опроса и голос ══════════════════════════════════════
// зачем (владелец 2026-09-30, «Делаем, вопросы из админки»): карточка на вкладке
// «Друзья». Экономия Firebase обязательна, поэтому:
//  - опрос читается ОДНИМ getDoc daily_polls/{сегодня} при заходе на вкладку и
//    живёт в кэше на устройстве до конца дня (нет опроса — перепроверка не чаще
//    раза в NO_POLL_RECHECK_MS, чтобы опрос, заведённый днём, всё же появился);
//  - никаких onSnapshot и фоновых таймеров;
//  - свой голос хранится локально; проценты после голоса берём из ответа callable,
//    без повторного чтения.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { ensureAnonUser } from '../cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { DebugLogger } from '../debug-logger';
import { getLocalDayKey } from '../local_date';
import { getCanonicalUserId } from '../user_id_policy';
import { withCallableTimeout } from '../callable_timeout';
import { normalizeDailyPollCounts, parseDailyPoll, type DailyPoll, type DailyPollVote } from './daily_poll_model';
import { devDailyPollVote, getDevDailyPoll } from '../dev_social_state';

export const DAILY_POLL_LOG = '[DAILY-POLL]';
const REGION = 'us-central1';
const POLL_CACHE_PREFIX = 'daily_poll_cache_v1';
const VOTE_PREFIX = 'daily_poll_vote_v1';
/** Нет опроса на сегодня — не дёргаем сеть чаще, чем раз в 3 часа. */
const NO_POLL_RECHECK_MS = 3 * 60 * 60 * 1000;
// зачем (аудит Optimistic UI 13.10, координатор): без своего потолка голос на медленной сети держал строки опроса запертыми
// до нативного потолка RN Firebase (~60–70 с). 10 с — дальше «нет связи», откат выбора и разблокировка строк (карточка уже умеет).
export const DAILY_POLL_VOTE_TIMEOUT_MS = 10_000;
const POLL_VOTE_LOG = '[POLL-VOTE]';

export type DailyPollSnapshot = Readonly<{
  dateKey: string;
  ownerId: string;
  poll: DailyPoll | null;
  vote: DailyPollVote | null;
}>;

export type DailyPollVoteErrorReason = 'offline' | 'not_found' | 'closed' | 'unknown';

export type DailyPollVoteOutcome =
  | Readonly<{ ok: true; vote: DailyPollVote; alreadyVoted: boolean }>
  | Readonly<{ ok: false; reason: DailyPollVoteErrorReason }>;

type PollCacheRecord = Readonly<{ poll: DailyPoll | null; fetchedAtMs: number }>;

// Память процесса: повторный заход на вкладку рисует карточку в первом кадре.
let memory: DailyPollSnapshot | null = null;
let inFlightLoad: Promise<DailyPollSnapshot> | null = null;

function isCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

const pollCacheKey = (dateKey: string) => `${POLL_CACHE_PREFIX}::${dateKey}`;
const voteKey = (ownerId: string, dateKey: string) => `${VOTE_PREFIX}::${ownerId || 'anon'}::${dateKey}`;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    DebugLogger.warn(DAILY_POLL_LOG, `кэш не прочитан key=${key}: ${String(error)}`);
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    DebugLogger.warn(DAILY_POLL_LOG, `кэш не записан key=${key}: ${String(error)}`);
  }
}

function sanitizeVote(raw: unknown, poll: DailyPoll | null): DailyPollVote | null {
  if (!raw || typeof raw !== 'object' || !poll) return null;
  const record = raw as { optionId?: unknown; counts?: unknown };
  const optionId = String(record.optionId ?? '');
  const ids = poll.options.map((o) => o.id);
  if (!ids.includes(optionId)) return null;
  return { optionId, counts: normalizeDailyPollCounts(record.counts, ids) };
}

/** Синхронный снимок для первого кадра (только если он за сегодняшний день). */
export function peekTodayDailyPoll(): DailyPollSnapshot | null {
  return memory && memory.dateKey === getLocalDayKey() ? memory : null;
}

async function fetchPollFromNetwork(dateKey: string): Promise<DailyPoll | null> {
  const startedAt = Date.now();
  await ensureAnonUser();
  const snap = await firestore().collection('daily_polls').doc(dateKey).get(); // guard-ok: один документ по id, раз в день
  const poll = snap.exists ? parseDailyPoll(snap.data(), dateKey) : null;
  DebugLogger.info(DAILY_POLL_LOG, `сеть: прочитан опрос ${JSON.stringify({
    dateKey, exists: snap.exists, usable: Boolean(poll), options: poll?.options.length ?? 0, ms: Date.now() - startedAt,
  })}`);
  return poll;
}

async function loadInternal(): Promise<DailyPollSnapshot> {
  const dateKey = getLocalDayKey();
  // зачем (Авторизация 12.10, съёмка R1 community-023): опрос на сегодня в проде может отсутствовать — `dailypoll=demo|voted` отдаёт опрос из памяти
  // без чтения daily_polls и без записи кэша/голоса на диск. В сторе геттер всегда null.
  const devPoll = getDevDailyPoll(dateKey);
  if (devPoll) {
    const snapshot: DailyPollSnapshot = { dateKey, ownerId: 'dev', poll: devPoll.poll, vote: devPoll.vote };
    memory = snapshot;
    DebugLogger.info(DAILY_POLL_LOG, `[DEV-STATE] опрос из памяти (dailypoll), сеть и диск не тронуты, голос=${devPoll.vote?.optionId ?? 'нет'}`);
    return snapshot;
  }
  const ownerId = (await getCanonicalUserId().catch((error: unknown) => {
    console.warn('[DAILY-POLL] owner id unavailable', { message: error instanceof Error ? error.message : String(error) });
    return null;
  })) ?? '';
  const cached = await readJson<PollCacheRecord>(pollCacheKey(dateKey));
  let poll: DailyPoll | null = cached ? parseCachedPoll(cached.poll, dateKey) : null;
  const cacheFresh = Boolean(cached) && (poll !== null || Date.now() - Number(cached?.fetchedAtMs ?? 0) < NO_POLL_RECHECK_MS);
  if (cacheFresh) {
    DebugLogger.info(DAILY_POLL_LOG, `кэш: опрос ${poll ? 'есть' : 'нет'} на ${dateKey}, сеть не трогаем`);
  } else if (!isCloudEnabled()) {
    DebugLogger.info(DAILY_POLL_LOG, `ранний выход: облако выключено (CLOUD_SYNC_ENABLED=${CLOUD_SYNC_ENABLED}, IS_EXPO_GO=${IS_EXPO_GO})`);
  } else {
    try {
      poll = await fetchPollFromNetwork(dateKey);
      await writeJson(pollCacheKey(dateKey), { poll, fetchedAtMs: Date.now() } satisfies PollCacheRecord);
    } catch (error) {
      // Сеть упала — карточки просто нет; следующий заход попробует снова (кэш не пишем).
      DebugLogger.warn(DAILY_POLL_LOG, `сеть: опрос не прочитан ${dateKey}: ${String(error)}`);
    }
  }
  const vote = sanitizeVote(await readJson<unknown>(voteKey(ownerId, dateKey)), poll);
  const snapshot: DailyPollSnapshot = { dateKey, ownerId, poll, vote };
  memory = snapshot;
  DebugLogger.info(DAILY_POLL_LOG, `итог: ${JSON.stringify({ dateKey, hasPoll: Boolean(poll), myVote: vote?.optionId ?? null })}`);
  return snapshot;
}

function parseCachedPoll(raw: DailyPoll | null, dateKey: string): DailyPoll | null {
  if (!raw) return null;
  // Кэш хранит уже разобранный опрос; прогоняем через тот же разбор, чтобы битая запись не дошла до UI.
  return parseDailyPoll({ ...raw, status: 'active' }, dateKey);
}

/**
 * Одно сетевое чтение в день (дальше — кэш устройства); параллельные вызовы
 * делят один промис. Локальный кэш перечитываем при каждом заходе: он дешёвый
 * и подхватывает смену аккаунта (голос хранится по владельцу).
 */
export function loadTodayDailyPoll(): Promise<DailyPollSnapshot> {
  if (!inFlightLoad) {
    inFlightLoad = loadInternal().finally(() => { inFlightLoad = null; });
  }
  return inFlightLoad;
}

function classifyVoteError(error: unknown): DailyPollVoteErrorReason {
  const err = error as { code?: unknown; message?: unknown };
  const text = `${String(err?.code ?? '')} ${String(err?.message ?? '')}`.toLowerCase();
  // зачем (аудит 01.10): голый 'not-found' без daily_poll_not_found = функция dailyPollVote
  // НЕ выложена в облако; раньше человек видел ложное «Этот опрос уже закрыт».
  if (text.includes('daily_poll_not_found')) return 'not_found';
  if (text.includes('not-found')) {
    DebugLogger.warn(DAILY_POLL_LOG, `голос: функция dailyPollVote не найдена в облаке (не выложена?) — ${text.trim()}`);
    return 'unknown';
  }
  if (text.includes('archived') || text.includes('not_today') || text.includes('option_invalid') || text.includes('options_broken')) return 'closed';
  if (text.includes('unavailable') || text.includes('network') || text.includes('deadline') || text.includes('callable_timeout') || text.includes('timed out')) return 'offline';
  return 'unknown';
}

let voteInFlight = false;

/**
 * Голос. Двойной тап гасится флагом (второй вызов — ранний выход с логом).
 * Успех сохраняет голос локально вместе со счётчиками от сервера.
 */
export async function submitDailyPollVote(snapshot: DailyPollSnapshot, optionId: string): Promise<DailyPollVoteOutcome> {
  const { dateKey, poll } = snapshot;
  console.log(`${POLL_VOTE_LOG} вход dateKey=${dateKey} option=${optionId} poll=${poll ? 'есть' : 'нет'} inFlight=${String(voteInFlight)}`); // guard-ok: вход
  if (voteInFlight) {
    console.warn(`${POLL_VOTE_LOG} ранний выход reason=in_flight option=${optionId}`); // guard-ok: ранний выход
    DebugLogger.info(DAILY_POLL_LOG, `голос: ранний выход — предыдущий ещё в полёте (option=${optionId})`);
    return { ok: false, reason: 'unknown' };
  }
  if (!poll) {
    console.warn(`${POLL_VOTE_LOG} ранний выход reason=no_poll dateKey=${dateKey}`); // guard-ok: ранний выход
    DebugLogger.warn(DAILY_POLL_LOG, `голос: ранний выход — опроса нет (dateKey=${dateKey})`);
    return { ok: false, reason: 'not_found' };
  }
  const devVote = getDevDailyPoll(dateKey) ? devDailyPollVote(optionId) : null;
  if (devVote) {
    memory = { ...snapshot, vote: devVote };
    DebugLogger.info(DAILY_POLL_LOG, `[DEV-STATE] голос в опросе из памяти option=${optionId}, dailyPollVote не вызывается`);
    return { ok: true, vote: devVote, alreadyVoted: false };
  }
  if (!isCloudEnabled()) {
    console.warn(`${POLL_VOTE_LOG} ранний выход reason=cloud_disabled`); // guard-ok: ранний выход
    DebugLogger.info(DAILY_POLL_LOG, 'голос: ранний выход — облако выключено');
    return { ok: false, reason: 'offline' };
  }
  voteInFlight = true;
  const startedAt = Date.now();
  try {
    const stableId = await ensureAnonUser();
    if (!stableId) {
      console.warn(`${POLL_VOTE_LOG} ранний выход reason=no_stable_id ms=${Date.now() - startedAt}`); // guard-ok: ранний выход
      DebugLogger.warn(DAILY_POLL_LOG, 'голос: ранний выход — нет stableId');
      return { ok: false, reason: 'offline' };
    }
    const fn = httpsCallable<
      { dateKey: string; optionId: string; stableId: string },
      { ok: boolean; status: 'accepted' | 'already_voted'; optionId: string; counts: Record<string, number> }
    >(getFunctions(getApp(), REGION), 'dailyPollVote');
    const res = await withCallableTimeout(fn({ dateKey, optionId, stableId }), 'dailyPollVote', DAILY_POLL_VOTE_TIMEOUT_MS);
    const ids = poll.options.map((o) => o.id);
    const serverOption = ids.includes(String(res.data?.optionId)) ? String(res.data.optionId) : optionId;
    const vote: DailyPollVote = { optionId: serverOption, counts: normalizeDailyPollCounts(res.data?.counts, ids) };
    DebugLogger.info(DAILY_POLL_LOG, `голос: ответ ${JSON.stringify({
      dateKey, sent: optionId, status: res.data?.status, serverOption, counts: vote.counts, ms: Date.now() - startedAt,
    })}`);
    const ownerId = snapshot.ownerId || stableId;
    await writeJson(voteKey(ownerId, dateKey), vote);
    memory = { ...snapshot, ownerId, vote };
    console.log(`${POLL_VOTE_LOG} итог ok status=${String(res.data?.status)} option=${serverOption} ms=${Date.now() - startedAt}`); // guard-ok: итог
    return { ok: true, vote, alreadyVoted: res.data?.status === 'already_voted' };
  } catch (error) {
    const reason = classifyVoteError(error);
    console.warn(`${POLL_VOTE_LOG} итог fail reason=${reason} code=${String((error as { code?: unknown })?.code ?? '')} ms=${Date.now() - startedAt}${String((error as { code?: unknown })?.code ?? '') === 'callable_timeout' ? ` — потолок ${DAILY_POLL_VOTE_TIMEOUT_MS} мс, откат выбора` : ''}`); // guard-ok: catch пишет причину
    DebugLogger.warn(DAILY_POLL_LOG, `голос: ошибка ${JSON.stringify({
      dateKey, optionId, reason, code: String((error as { code?: unknown })?.code ?? ''), message: String((error as { message?: unknown })?.message ?? error), ms: Date.now() - startedAt,
    })}`);
    return { ok: false, reason };
  } finally {
    voteInFlight = false;
  }
}

/** Только для тестов: сброс памяти процесса. */
export function __resetDailyPollMemoryForTests(): void {
  memory = null;
  inFlightLoad = null;
  voteInFlight = false;
}
