/**
 * «Дуэль на 5 фраз» (идея 3) — сеть телефона: вызов вместе со своим ходом, ход друга, ход без сети.
 *
 * зачем (контракт docs/work/tasks/friends-duel-2026-10-22.md, поправки 1 · ЯДРО 22.10; Firebase-экономия):
 * - friendsDuelChallenge {stableId, senderDisplayName?, friendUid, phraseIds[5], move, requestId} → {ok, duelId, expiresAtMs};
 *   ошибки подстрокой: limit / open_duel / not_friends / disabled.
 * - friendsDuelMove {stableId, duelId, move, requestId} → {ok, outcome, mine, theirs{correct, elapsedMs, results}};
 *   ошибки: expired / already_moved / not_invited / disabled.
 * - Один ход — одна запись на сервере. Ход сначала ложится на телефон (AsyncStorage, своё на аккаунт), потом уходит в сеть:
 *   телефон убили посреди запроса или нет сети — ход не потерян и уйдёт тем же requestId (сервер узнаёт повтор, второго
 *   хода не будет). Чтений Firestore нет, слушателей нет.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { maskUid } from '../diagnostic_mask';
import { getCanonicalUserId } from '../user_id_policy';
import { prepareTogetherSender } from './sender_identity';
import { DUEL_ANSWER_WINDOW_MS, DUEL_PHRASES, isValidDuelMove, type DuelMove, type DuelOutcome } from './duel_core';

const REGION = 'us-central1';
const PENDING_KEY = 'friends_duel_pending_v1';
/** Ход без сети старше суток не досылаем: срок дуэли всё равно вышел. */
const PENDING_KEEP_MS = DUEL_ANSWER_WINDOW_MS;

export type DuelChallengeReason = 'network' | 'limit' | 'open_duel' | 'not_friends' | 'disabled' | 'no_sender' | 'invalid';
export type DuelChallengeResult =
  | Readonly<{ ok: true; duelId: string; expiresAtMs: number }>
  | Readonly<{ ok: false; reason: DuelChallengeReason }>;

export type DuelMoveReason = 'network' | 'expired' | 'already_moved' | 'not_invited' | 'disabled' | 'no_sender' | 'invalid';
export type DuelSideScore = Readonly<{ correct: number; elapsedMs: number }>;
export type DuelMoveResult =
  | Readonly<{ ok: true; outcome: DuelOutcome; mine: DuelSideScore; theirs: DuelSideScore & Readonly<{ results: readonly boolean[] }> }>
  | Readonly<{ ok: false; reason: DuelMoveReason }>;

export type PendingDuel =
  | Readonly<{ kind: 'challenge'; friendUid: string; phraseIds: readonly string[]; move: DuelMove; requestId: string; createdAtMs: number }>
  | Readonly<{ kind: 'move'; duelId: string; move: DuelMove; requestId: string; createdAtMs: number }>;

const log = (line: string): void => { console.log(`[FRIENDS-DUEL] ${line}`); }; // guard-ok: журнал дуэли, одна строка на шаг
const errText = (e: unknown): string => (e instanceof Error ? e.message : String((e as { message?: unknown })?.message ?? e));

export function makeDuelRequestId(): string {
  return `fdl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function errorHaystack(error: unknown): string {
  return `${String((error as { code?: unknown })?.code ?? '')} ${errText(error)}`.toLowerCase();
}

function classifyChallengeError(error: unknown): DuelChallengeReason {
  const text = errorHaystack(error);
  if (text.includes('disabled')) return 'disabled';
  if (text.includes('open_duel')) return 'open_duel';
  if (text.includes('limit')) return 'limit';
  if (text.includes('not_friends')) return 'not_friends';
  return 'network';
}

function classifyMoveError(error: unknown): DuelMoveReason {
  const text = errorHaystack(error);
  if (text.includes('disabled')) return 'disabled';
  if (text.includes('expired')) return 'expired';
  if (text.includes('already_moved')) return 'already_moved';
  if (text.includes('not_invited')) return 'not_invited';
  return 'network';
}

/** Досылать позже: нет сети или вход ещё не готов (без сети анонимный вход тоже не проходит). Остальное — окончательный ответ. */
const keepForRetry = (reason: DuelChallengeReason | DuelMoveReason): boolean => reason === 'network' || reason === 'no_sender';

const isPhraseIds = (ids: unknown): ids is readonly string[] =>
  Array.isArray(ids) && ids.length === DUEL_PHRASES && new Set(ids).size === DUEL_PHRASES
  && ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 96);

function isPending(value: unknown): value is PendingDuel {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.requestId !== 'string' || typeof v.createdAtMs !== 'number' || !isValidDuelMove(v.move)) return false;
  if (v.kind === 'challenge') return typeof v.friendUid === 'string' && v.friendUid.length > 0 && isPhraseIds(v.phraseIds);
  return v.kind === 'move' && typeof v.duelId === 'string' && v.duelId.length > 0;
}

async function readPendingRaw(scope: string): Promise<PendingDuel[]> {
  try {
    const raw = await AsyncStorage.getItem(`${PENDING_KEY}::${scope}`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isPending) : [];
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] pending:read failed owner=${maskUid(scope)} → считаем, что отложенных ходов нет: ${errText(e)}`); // guard-ok: catch называет причину
    return [];
  }
}

async function writePendingRaw(scope: string, list: readonly PendingDuel[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${PENDING_KEY}::${scope}`, JSON.stringify(list));
    return true;
  } catch (e) {
    console.warn(`[FRIENDS-DUEL] pending:write failed owner=${maskUid(scope)} items=${list.length} → ход живёт только до закрытия приложения: ${errText(e)}`); // guard-ok: catch называет причину
    return false;
  }
}

async function rememberPending(entry: PendingDuel): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`pending:skip kind=${entry.kind} reason=no_user`);
    return;
  }
  const now = Date.now();
  const kept = (await readPendingRaw(scope)).filter((p) => p.requestId !== entry.requestId && now - p.createdAtMs < PENDING_KEEP_MS);
  if (await writePendingRaw(scope, [...kept, entry])) log(`pending:saved kind=${entry.kind} request=${entry.requestId} total=${kept.length + 1}`);
}

async function forgetPending(requestId: string): Promise<void> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log(`pending:forget skip request=${requestId} reason=no_user`);
    return;
  }
  const list = await readPendingRaw(scope);
  const next = list.filter((p) => p.requestId !== requestId);
  if (next.length !== list.length && (await writePendingRaw(scope, next))) log(`pending:forget request=${requestId} left=${next.length}`);
}

/** Отложенные ходы своего аккаунта (не старше суток). */
export async function readPendingDuels(nowMs: number = Date.now()): Promise<PendingDuel[]> {
  const scope = await getCanonicalUserId();
  if (!scope) {
    log('pending:read none reason=no_user');
    return [];
  }
  return (await readPendingRaw(scope)).filter((p) => nowMs - p.createdAtMs < PENDING_KEEP_MS);
}

type ChallengeResponse = { duelId?: unknown; expiresAtMs?: unknown };
type MoveResponse = { outcome?: unknown; mine?: unknown; theirs?: unknown };

/** Только сеть: один запрос вызова. Повтор — тем же requestId. */
async function callChallenge(entry: Extract<PendingDuel, { kind: 'challenge' }>): Promise<DuelChallengeResult> {
  const sender = await prepareTogetherSender();
  if (!sender) {
    log(`challenge:skip request=${entry.requestId} reason=no_sender`);
    return { ok: false, reason: 'no_sender' };
  }
  const payload = {
    stableId: sender.stableId,
    ...(sender.displayName ? { senderDisplayName: sender.displayName } : {}),
    friendUid: entry.friendUid,
    phraseIds: [...entry.phraseIds],
    move: { results: [...entry.move.results], elapsedMs: entry.move.elapsedMs },
    requestId: entry.requestId,
  };
  const startedAt = Date.now();
  try {
    const res = await httpsCallable<typeof payload, ChallengeResponse>(getFunctions(getApp(), REGION), 'friendsDuelChallenge')(payload);
    const data = res.data ?? {};
    const duelId = typeof data.duelId === 'string' ? data.duelId : '';
    const expiresAtMs = typeof data.expiresAtMs === 'number' && Number.isFinite(data.expiresAtMs) ? data.expiresAtMs : 0;
    if (!duelId) {
      log(`challenge:bad_response request=${entry.requestId} friend=${maskUid(entry.friendUid)} ms=${Date.now() - startedAt} → ход принят без номера дуэли`);
      return { ok: false, reason: 'invalid' };
    }
    log(`challenge:ok request=${entry.requestId} friend=${maskUid(entry.friendUid)} duel=${maskUid(duelId)} correct=${entry.move.results.filter(Boolean).length} ms=${Date.now() - startedAt}`);
    return { ok: true, duelId, expiresAtMs };
  } catch (error) {
    const reason = classifyChallengeError(error);
    log(`challenge:error request=${entry.requestId} friend=${maskUid(entry.friendUid)} reason=${reason} ms=${Date.now() - startedAt} raw="${errText(error).slice(0, 160)}"`);
    return { ok: false, reason };
  }
}

const isCorrectCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= DUEL_PHRASES;
const isElapsed = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function parseMoveResponse(data: MoveResponse): Extract<DuelMoveResult, { ok: true }> | null {
  const outcome = data.outcome === 'win' || data.outcome === 'loss' || data.outcome === 'draw' ? data.outcome : null;
  const mine = data.mine as { correct?: unknown; elapsedMs?: unknown } | undefined;
  const theirs = data.theirs as { correct?: unknown; elapsedMs?: unknown; results?: unknown } | undefined;
  if (!outcome || !mine || !theirs || !isCorrectCount(mine.correct) || !isElapsed(mine.elapsedMs) || !isCorrectCount(theirs.correct) || !isElapsed(theirs.elapsedMs)) return null;
  const results = theirs.results;
  if (!Array.isArray(results) || results.length !== DUEL_PHRASES || !results.every((r) => typeof r === 'boolean')) return null;
  return { ok: true, outcome, mine: { correct: mine.correct, elapsedMs: mine.elapsedMs }, theirs: { correct: theirs.correct, elapsedMs: theirs.elapsedMs, results } };
}

/** Только сеть: один запрос хода друга. */
async function callMove(entry: Extract<PendingDuel, { kind: 'move' }>): Promise<DuelMoveResult> {
  const sender = await prepareTogetherSender();
  if (!sender) {
    log(`move:skip request=${entry.requestId} reason=no_sender`);
    return { ok: false, reason: 'no_sender' };
  }
  const payload = {
    stableId: sender.stableId,
    duelId: entry.duelId,
    move: { results: [...entry.move.results], elapsedMs: entry.move.elapsedMs },
    requestId: entry.requestId,
  };
  const startedAt = Date.now();
  try {
    const res = await httpsCallable<typeof payload, MoveResponse>(getFunctions(getApp(), REGION), 'friendsDuelMove')(payload);
    const parsed = parseMoveResponse(res.data ?? {});
    if (!parsed) {
      log(`move:bad_response request=${entry.requestId} duel=${maskUid(entry.duelId)} ms=${Date.now() - startedAt} → итог не разобрать`);
      return { ok: false, reason: 'invalid' };
    }
    log(`move:ok request=${entry.requestId} duel=${maskUid(entry.duelId)} outcome=${parsed.outcome} mine=${parsed.mine.correct}/${parsed.mine.elapsedMs} theirs=${parsed.theirs.correct}/${parsed.theirs.elapsedMs} ms=${Date.now() - startedAt}`);
    return parsed;
  } catch (error) {
    const reason = classifyMoveError(error);
    log(`move:error request=${entry.requestId} duel=${maskUid(entry.duelId)} reason=${reason} ms=${Date.now() - startedAt} raw="${errText(error).slice(0, 160)}"`);
    return { ok: false, reason };
  }
}

/**
 * Вызов со своим ходом: ход сначала на телефон, затем в сеть. Сеть пропала — ход остаётся на телефоне («Ход готов»);
 * сервер отказал (лимит, уже идёт дуэль, не друзья) — ход убираем, досылать нечего.
 */
export async function submitDuelChallenge(input: Readonly<{ friendUid: string; phraseIds: readonly string[]; move: DuelMove }>): Promise<DuelChallengeResult> {
  if (!input.friendUid || !isPhraseIds(input.phraseIds) || !isValidDuelMove(input.move)) {
    log(`challenge:refuse reason=invalid friend=${input.friendUid ? maskUid(input.friendUid) : 'none'} ids=${Array.isArray(input.phraseIds) ? input.phraseIds.length : 'none'} move_ok=${isValidDuelMove(input.move)}`);
    return { ok: false, reason: 'invalid' };
  }
  const entry: PendingDuel = { kind: 'challenge', friendUid: input.friendUid, phraseIds: [...input.phraseIds], move: input.move, requestId: makeDuelRequestId(), createdAtMs: Date.now() };
  await rememberPending(entry);
  const result = await callChallenge(entry);
  if (result.ok || !keepForRetry(result.reason)) await forgetPending(entry.requestId);
  return result;
}

/** Ход в ответ на вызов: так же — телефон, потом сеть. Срок вышел или ход уже был — убираем. */
export async function submitDuelMove(input: Readonly<{ duelId: string; move: DuelMove }>): Promise<DuelMoveResult> {
  if (!input.duelId || !isValidDuelMove(input.move)) {
    log(`move:refuse reason=invalid duel=${input.duelId ? maskUid(input.duelId) : 'none'} move_ok=${isValidDuelMove(input.move)}`);
    return { ok: false, reason: 'invalid' };
  }
  const entry: PendingDuel = { kind: 'move', duelId: input.duelId, move: input.move, requestId: makeDuelRequestId(), createdAtMs: Date.now() };
  await rememberPending(entry);
  const result = await callMove(entry);
  if (result.ok || !keepForRetry(result.reason)) await forgetPending(entry.requestId);
  return result;
}

export type DuelDeclineReason = 'network' | 'expired' | 'not_invited' | 'already_moved' | 'disabled' | 'invalid';

/**
 * «Отказаться» от вызова. Шторка и маркер уже закрыты (Optimistic UI) — это только сеть, один запрос без повторов:
 * не дошёл — дуэль сама закроется по сроку (сервер закрывает лениво), вызвавший увидит «не ответил за сутки».
 */
export async function submitDuelDecline(duelId: string): Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; reason: DuelDeclineReason }>> {
  if (!duelId) {
    log('decline:refuse reason=invalid duel=none');
    return { ok: false, reason: 'invalid' };
  }
  const startedAt = Date.now();
  try {
    await httpsCallable<{ duelId: string }, unknown>(getFunctions(getApp(), REGION), 'friendsDuelDecline')({ duelId });
    log(`decline:ok duel=${maskUid(duelId)} ms=${Date.now() - startedAt}`);
    return { ok: true };
  } catch (error) {
    const text = errorHaystack(error);
    const reason: DuelDeclineReason = text.includes('disabled') ? 'disabled'
      : text.includes('expired') ? 'expired'
        : text.includes('already_moved') ? 'already_moved'
          : text.includes('not_invited') ? 'not_invited'
            : 'network';
    log(`decline:error duel=${maskUid(duelId)} reason=${reason} ms=${Date.now() - startedAt} raw="${errText(error).slice(0, 160)}"`);
    return { ok: false, reason };
  }
}

/** Дослать отложенные ходы (при входе во «Друзей»). По одному запросу на ход, без повторов внутри одного захода. */
export async function flushPendingDuels(): Promise<Readonly<{ sent: number; dropped: number; left: number }>> {
  const pending = await readPendingDuels();
  if (pending.length === 0) return { sent: 0, dropped: 0, left: 0 };
  let sent = 0;
  let dropped = 0;
  for (const entry of pending) {
    const result = entry.kind === 'challenge' ? await callChallenge(entry) : await callMove(entry);
    if (!result.ok && keepForRetry(result.reason)) continue;
    if (result.ok) sent += 1;
    else dropped += 1;
    await forgetPending(entry.requestId);
  }
  const left = pending.length - sent - dropped;
  log(`pending:flush total=${pending.length} sent=${sent} dropped=${dropped} left=${left}`);
  return { sent, dropped, left };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
