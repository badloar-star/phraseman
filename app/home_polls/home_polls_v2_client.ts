// ═══ Опросы на Главной 2.0 — загрузка и голос ═════════════════════════════════
// зачем (владелец 18.10, сборка 134; координатор: «экономия — тексты в бандле, сеть не чаще раза в сутки, счётчики
// только после ответа»):
//  - показ НЕ ходит в сеть: тексты из content/polls/home_polls_v2.json, набор дня — по общему расписанию
//    (shared/home_polls_v2_schedule.ts), свои ответы — в AsyncStorage по владельцу и набору;
//  - сеть — только голос по тапу (callable homePollV2Vote): в ответ приходят счётчики этого вопроса, их и показываем;
//  - двойной тап по одному вопросу гасится флагом, потолок ожидания 10 с, при сбое выбор откатывается.
// Журнал [POLLS-V2]: вход, каждая ветка с причиной, сеть (что ушло/вернулось, мс), итог.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { HOME_POLLS_V2_SET_COUNT, homePollV2WindowForDate, type HomePollV2Window } from '../../shared/home_polls_v2_schedule';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import { withCallableTimeout } from '../callable_timeout';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getLocalDayKey } from '../local_date';
import { getCanonicalUserId } from '../user_id_policy';
import {
  nextUnansweredQuestionIndex,
  normalizeHomePollV2Counts,
  parseHomePollV2Catalog,
  type HomePollV2Answer,
  type HomePollV2Set,
} from './home_polls_v2_model';

export const POLLS_V2_LOG = '[POLLS-V2]';
const REGION = 'us-central1';
const ANSWERS_PREFIX = 'home_polls_v2_answers_v1';
export const HOME_POLL_V2_VOTE_TIMEOUT_MS = 10_000;

// eslint-disable-next-line @typescript-eslint/no-require-imports
// Runtime copy lives under app/: content/ is intentionally excluded by Watchman,
// Metro and .easignore. A contract test keeps it equal to the authoring source.
const CATALOG = parseHomePollV2Catalog(require('./home_polls_v2.json'));

export type HomePollV2Snapshot = Readonly<{
  dateKey: string;
  ownerId: string;
  window: HomePollV2Window | null;
  set: HomePollV2Set | null;
  answers: Readonly<Record<string, HomePollV2Answer>>;
  /** Индекс вопроса, который сейчас ждёт ответа; null — набор пройден (или набора нет). */
  questionIndex: number | null;
}>;

export type HomePollV2VoteErrorReason = 'offline' | 'closed' | 'unknown';
export type HomePollV2VoteOutcome =
  | Readonly<{ ok: true; answer: HomePollV2Answer; alreadyAnswered: boolean }>
  | Readonly<{ ok: false; reason: HomePollV2VoteErrorReason; queued?: boolean }>;

type QueuedHomePollV2Vote = Readonly<{
  setId: string;
  questionId: string;
  optionId: string;
  dateKey: string;
  queuedAtMs: number;
}>;

let memory: HomePollV2Snapshot | null = null;
const votesInFlight = new Set<string>();

const answersKey = (ownerId: string, setId: string) => `${ANSWERS_PREFIX}::${ownerId || 'anon'}::${setId}`;
const queueKey = (ownerId: string) => `home_polls_v2_queue_v1::${ownerId}`;

function log(step: string, fields: Record<string, unknown> = {}): void {
  console.log(`${POLLS_V2_LOG} ${step} ${JSON.stringify(fields)}`); // guard-ok: журнал опросов, без текстов и uid
}

async function readAnswers(ownerId: string, set: HomePollV2Set): Promise<Record<string, HomePollV2Answer>> {
  try {
    const raw = await AsyncStorage.getItem(answersKey(ownerId, set.id));
    const parsed = raw ? JSON.parse(raw) as Record<string, { optionId?: unknown; counts?: unknown }> : {};
    const out: Record<string, HomePollV2Answer> = {};
    for (const question of set.questions) {
      const row = parsed[question.id];
      const ids = question.options.map((o) => o.id);
      const storedOptionId = row?.optionId;
      const optionId = storedOptionId === null ? null : String(storedOptionId ?? '');
      if (optionId === null || ids.includes(optionId)) {
        out[question.id] = { optionId, counts: normalizeHomePollV2Counts(row?.counts, ids) };
      }
    }
    return out;
  } catch (error) {
    log('answers:read_failed', { setId: set.id, message: error instanceof Error ? error.message : String(error) });
    return {};
  }
}

async function writeAnswers(ownerId: string, setId: string, answers: Readonly<Record<string, HomePollV2Answer>>): Promise<void> {
  try {
    await AsyncStorage.setItem(answersKey(ownerId, setId), JSON.stringify(answers));
  } catch (error) {
    log('answers:write_failed', { setId, message: error instanceof Error ? error.message : String(error) });
  }
}

async function readQueue(ownerId: string): Promise<QueuedHomePollV2Vote[]> {
  if (!ownerId) return [];
  try {
    const raw = await AsyncStorage.getItem(queueKey(ownerId));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is QueuedHomePollV2Vote => {
      if (!row || typeof row !== 'object') return false;
      const value = row as Partial<QueuedHomePollV2Vote>;
      return typeof value.setId === 'string' && typeof value.questionId === 'string'
        && typeof value.optionId === 'string' && typeof value.dateKey === 'string'
        && typeof value.queuedAtMs === 'number';
    }).slice(-20);
  } catch (error) {
    log('queue:read_failed', { message: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

async function writeQueue(ownerId: string, queue: readonly QueuedHomePollV2Vote[]): Promise<boolean> {
  if (!ownerId) return false;
  try {
    if (queue.length === 0) await AsyncStorage.removeItem(queueKey(ownerId));
    else await AsyncStorage.setItem(queueKey(ownerId), JSON.stringify(queue.slice(-20)));
    return true;
  } catch (error) {
    log('queue:write_failed', { message: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

async function enqueueVote(ownerId: string, vote: QueuedHomePollV2Vote): Promise<boolean> {
  const queue = await readQueue(ownerId);
  const withoutSameQuestion = queue.filter((row) => !(row.setId === vote.setId && row.questionId === vote.questionId));
  const stored = await writeQueue(ownerId, [...withoutSameQuestion, vote]);
  log('queue:stored', { setId: vote.setId, questionId: vote.questionId, size: withoutSameQuestion.length + 1 });
  return stored;
}

async function callVote(stableId: string, vote: QueuedHomePollV2Vote): Promise<{
  status: 'accepted' | 'already_answered'; counts: Record<string, number>; voteCount: number;
}> {
  const fn = httpsCallable<
    { setId: string; questionId: string; optionId: string; dateKey: string; stableId: string },
    { ok: boolean; status: 'accepted' | 'already_answered'; counts: Record<string, number>; voteCount: number }
  >(getFunctions(getApp(), REGION), 'homePollV2Vote');
  const res = await withCallableTimeout(fn({
    setId: vote.setId,
    questionId: vote.questionId,
    optionId: vote.optionId,
    dateKey: vote.dateKey,
    stableId,
  }), 'homePollV2Vote', HOME_POLL_V2_VOTE_TIMEOUT_MS);
  return res.data;
}

/** Набор дня без сети: расписание + бандл + свои ответы с диска. */
export async function loadTodayHomePollV2(dateKey: string = getLocalDayKey()): Promise<HomePollV2Snapshot> {
  // Конечное расписание — общая константа (её же берёт сервер), а не длина бандла: иначе устройство и сервер разойдутся.
  const window = homePollV2WindowForDate(dateKey, HOME_POLLS_V2_SET_COUNT);
  const set = window ? CATALOG[window.setIndex] ?? null : null;
  const ownerId = (await getCanonicalUserId().catch((error: unknown) => {
    log('owner:unavailable', { message: error instanceof Error ? error.message : String(error) });
    return null;
  })) ?? '';
  if (!window || !set) {
    log('load:no_set', { dateKey, reason: !window ? 'before_anchor_or_bad_date' : 'set_broken_in_bundle', setId: window?.setId ?? null, catalog: CATALOG.length });
    memory = { dateKey, ownerId, window, set: null, answers: {}, questionIndex: null };
    return memory;
  }
  const answers = await readAnswers(ownerId, set);
  const questionIndex = nextUnansweredQuestionIndex(set, answers);
  memory = { dateKey, ownerId, window, set, answers, questionIndex };
  log('load:done', { dateKey, setId: set.id, questions: set.questions.length, answered: Object.keys(answers).length, visible: questionIndex !== null, network: false });
  return memory;
}

function classifyVoteError(error: unknown): HomePollV2VoteErrorReason {
  const err = error as { code?: unknown; message?: unknown };
  const text = `${String(err?.code ?? '')} ${String(err?.message ?? '')}`.toLowerCase();
  if (text.includes('not_votable') || text.includes('option_invalid') || text.includes('question_invalid') || text.includes('set_closed') || text.includes('set_not_found')) return 'closed';
  if (text.includes('unavailable') || text.includes('network') || text.includes('deadline') || text.includes('callable_timeout') || text.includes('timed out')) return 'offline';
  return 'unknown';
}

/**
 * Голос по одному вопросу. Сервер отклоняет повтор (вопрос уже отвечен этим человеком) — тогда ответ
 * «already_answered» со счётчиками, и это тоже успех для экрана. Свой вариант хранится только на телефоне.
 */
export async function submitHomePollV2Vote(snapshot: HomePollV2Snapshot, questionId: string, optionId: string): Promise<HomePollV2VoteOutcome> {
  const { set, dateKey } = snapshot;
  const accountToken = captureAccountGeneration();
  const flightKey = `${set?.id ?? 'none'}::${questionId}`;
  log('vote:in', { setId: set?.id ?? null, questionId, optionId, inFlight: votesInFlight.has(flightKey) });
  if (!set) {
    log('vote:early_exit', { reason: 'no_set' });
    return { ok: false, reason: 'closed' };
  }
  if (!snapshot.ownerId || !isCurrentAccountGeneration(accountToken, snapshot.ownerId)) {
    log('vote:early_exit', { reason: 'stale_account_generation' });
    return { ok: false, reason: 'unknown' };
  }
  const question = set.questions.find((q) => q.id === questionId);
  if (!question || !question.options.some((o) => o.id === optionId)) {
    log('vote:early_exit', { reason: 'unknown_question_or_option', questionId, optionId });
    return { ok: false, reason: 'closed' };
  }
  if (votesInFlight.has(flightKey)) {
    log('vote:early_exit', { reason: 'in_flight', questionId });
    return { ok: false, reason: 'unknown' };
  }
  votesInFlight.add(flightKey);
  const startedAt = Date.now();
  const stableId = snapshot.ownerId;
  let queuedVote: QueuedHomePollV2Vote | null = null;
  let queueStored = false;
  try {
    queuedVote = { setId: set.id, questionId, optionId, dateKey, queuedAtMs: Date.now() };
    queueStored = await enqueueVote(stableId, queuedVote);
    if (!isCurrentAccountGeneration(accountToken, stableId)) {
      log('vote:early_exit', { reason: 'account_changed_after_queue', ms: Date.now() - startedAt });
      return { ok: false, reason: 'unknown', queued: queueStored };
    }
    if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) {
      log('vote:queued', { reason: 'cloud_disabled', setId: set.id, questionId });
      return { ok: false, reason: 'offline', queued: queueStored };
    }
    const data = await callVote(stableId, queuedVote);
    if (!isCurrentAccountGeneration(accountToken, stableId)) {
      // The server may have accepted the old account's vote. Keep its queue row;
      // an idempotent retry will reconcile it when that account becomes active.
      log('vote:late_result_ignored', { setId: set.id, questionId, ms: Date.now() - startedAt });
      return { ok: false, reason: 'unknown', queued: queueStored };
    }
    const ids = question.options.map((o) => o.id);
    const answer: HomePollV2Answer = {
      optionId: data?.status === 'accepted' ? optionId : null,
      counts: normalizeHomePollV2Counts(data?.counts, ids),
    };
    const ownerId = stableId;
    const base = memory && memory.ownerId === ownerId && memory.set?.id === set.id ? memory.answers : snapshot.answers;
    const answers = { ...base, [questionId]: answer };
    await writeAnswers(ownerId, set.id, answers);
    await writeQueue(ownerId, (await readQueue(ownerId)).filter((row) => !(row.setId === set.id && row.questionId === questionId)));
    if (!isCurrentAccountGeneration(accountToken, ownerId)) {
      log('vote:late_ui_result_ignored', { setId: set.id, questionId, ms: Date.now() - startedAt });
      return { ok: false, reason: 'unknown' };
    }
    memory = { ...snapshot, ownerId, answers, questionIndex: nextUnansweredQuestionIndex(set, answers) };
    log('vote:out', { setId: set.id, questionId, status: data?.status ?? null, voteCount: data?.voteCount ?? null, ms: Date.now() - startedAt });
    return { ok: true, answer, alreadyAnswered: data?.status === 'already_answered' };
  } catch (error) {
    const reason = classifyVoteError(error);
    log('vote:failed', { setId: set.id, questionId, reason, code: String((error as { code?: unknown })?.code ?? ''), ms: Date.now() - startedAt });
    if (reason === 'closed' && isCurrentAccountGeneration(accountToken, stableId) && queuedVote) {
      await writeQueue(stableId, (await readQueue(stableId)).filter((row) => !(row.setId === set.id && row.questionId === questionId)));
    }
    return { ok: false, reason, queued: reason !== 'closed' && queueStored && Boolean(stableId && queuedVote) };
  } finally {
    votesInFlight.delete(flightKey);
  }
}

/** Retry only already-queued votes. Called after connectivity returns; never used to fetch display data. */
export async function flushHomePollV2Queue(snapshot: HomePollV2Snapshot): Promise<HomePollV2Snapshot> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return snapshot;
  const accountToken = captureAccountGeneration();
  const stableId = snapshot.ownerId;
  if (!stableId || !isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
  const queue = await readQueue(stableId);
  if (queue.length === 0) return snapshot;
  let remaining = [...queue];
  let answers = { ...snapshot.answers };
  for (const vote of queue) {
    const voteSet = CATALOG.find((row) => row?.id === vote.setId) ?? null;
    const question = voteSet?.questions.find((row) => row.id === vote.questionId);
    if (!voteSet || !question) {
      remaining = remaining.filter((row) => row !== vote);
      continue;
    }
    try {
      const data = await callVote(stableId, vote);
      if (!isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
      const answer: HomePollV2Answer = {
        optionId: data.status === 'accepted' ? vote.optionId : null,
        counts: normalizeHomePollV2Counts(data.counts, question.options.map((option) => option.id)),
      };
      if (voteSet.id === snapshot.set?.id) {
        answers[vote.questionId] = answer;
      } else {
        const historicalAnswers = await readAnswers(stableId, voteSet);
        if (!isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
        await writeAnswers(stableId, voteSet.id, { ...historicalAnswers, [vote.questionId]: answer });
      }
      remaining = remaining.filter((row) => row !== vote);
      log('queue:flushed', { setId: vote.setId, questionId: vote.questionId, status: data.status });
    } catch (error) {
      if (!isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
      if (classifyVoteError(error) === 'closed') remaining = remaining.filter((row) => row !== vote);
      else break;
    }
  }
  if (!isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
  await writeQueue(stableId, remaining);
  if (!snapshot.set) return snapshot;
  await writeAnswers(stableId, snapshot.set.id, answers);
  if (!isCurrentAccountGeneration(accountToken, stableId)) return snapshot;
  const next = { ...snapshot, ownerId: stableId, answers, questionIndex: nextUnansweredQuestionIndex(snapshot.set, answers) };
  memory = next;
  return next;
}

/** Только для тестов. */
export function __resetHomePollV2ForTests(): void {
  memory = null;
  votesInFlight.clear();
}

/** Только для тестов и dev: размер каталога (сколько наборов в бандле). */
export function homePollV2CatalogSize(): number {
  return CATALOG.length;
}
