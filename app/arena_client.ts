import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arenaOutboxAdoptOwnerGeneration,
  arenaOutboxFlush,
  arenaOutboxHasMatch,
  arenaOutboxList,
} from '../modules/arena/outbox_storage';
import { arenaOutboxHasGated } from '../modules/arena/result_outbox';
import {
  arenaRetryQueuedFinishDelivery,
  type ArenaFinishRetryResult,
} from '../modules/arena/finish_retry';
import {
  arenaReserveAccountDispatch,
  type ArenaNetworkDispatch,
} from '../modules/arena/account_dispatch';
import { arenaReadReviewWithRetry, type ArenaReviewAccountScope } from '../modules/arena/review_retry';
import type { ArenaKeyValueStore } from '../modules/arena/match_store';
import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { ensureStableAuthLink } from './cloud_sync';
import { getVersionForServerGate } from './app_version';
import { refreshShardsBalanceFromCloudAuthoritative } from './shards_system';
import { mergeLevelSpinServerStars } from './level_spin_star_grants';
import type {
  ArenaMatch,
  ArenaMatchReward,
  ArenaQueueMode,
  ArenaSummary,
  ArenaTicket,
  ArenaTaskMode,
} from '../modules/arena/contract';
import type {
  ArenaExpansionHome,
  ArenaExpansionHomeWire,
  ArenaExpansionMatchMutation,
  ArenaGhostCreateResponse,
  ArenaGhostResponse,
  ArenaGhostSourceKind,
  ArenaGhostSummary,
  ArenaMatchLabPlan,
  ArenaPartnerSummary,
  ArenaPurchaseResponse,
  ArenaRivalResponse,
  ArenaStarStoreResponse,
  ArenaTodayStartResponse,
} from '../modules/arena/expansion_contract';
import { arenaUnifiedStarsObservation, normalizeArenaExpansionHome } from '../modules/arena/expansion_contract';
import { createArenaListenerScopeGate, type ArenaListenerScopeToken } from '../modules/arena/listener_scope';
import { arenaParseMatchPlan, type ArenaMatchPlanWire } from '../modules/arena/duel_plan';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import {
  ARENA_LIVE_COLLECTION,
  ARENA_LIVE_SEATS,
  arenaLiveWritePayload,
} from '../modules/arena/live_channel';

const REGION = 'us-central1';

export type ArenaSeason = Readonly<{
  seasonId: string;
  stars: number;
  level: number;
  endsAtMs?: number;
  levels?: readonly Readonly<{
    level: number;
    stars: number;
    freeReward: Readonly<{ kind: 'shards'; amount: number } | { kind: 'spin_credit'; amount: 1 }>;
    plusReward: Readonly<{ kind: 'shards'; amount: number } | { kind: 'spin_credit'; amount: 1 }>;
    freeClaimed?: boolean;
    plusClaimed?: boolean;
  }>[];
}>;

export type ArenaHomeResponse = Readonly<{
  ok: true;
  availability: Readonly<{
    enabled: boolean;
    quickEnabled: boolean;
    rankedEnabled: boolean;
    friendEnabled: boolean;
    rewardsEnabled: boolean;
    spinEnabled: boolean;
  }>;
  profile: ArenaSummary;
  season: ArenaSeason;
  activeQueue?: ArenaTicket;
  activeMatch?: ArenaMatch;
  activeMatchViewerSeat?: 'a' | 'b';
}>;

type MatchMutationResponse = Readonly<{
  ok: true;
  matchId: string;
  state: ArenaMatch['state'];
  version: number;
  match?: ArenaMatch;
  viewerSeat?: 'a' | 'b';
  viewerReward?: ArenaMatchReward;
}>;

async function prepareArenaCall<T>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<() => Promise<T>> {
  // ⛔ НЕ УБИРАТЬ И НЕ ОТКАТЫВАТЬ: Арена обязана быть доступна СРАЗУ после
  // установки, без привязки аккаунта (владелец, 2026-08-25). arenaV2Home и
  // остальные callable'ы Арены зовутся с requireKnownIdentity:true —
  // серверу нужен уже существующий users/{stableId}, а один ensureAnonUser()
  // создаёт только ЛОКАЛЬНЫЙ id и анонимный вход, без записи на сервере.
  // На свежей установке это гонка: сервер честно отвечает stable_id_required,
  // а хаб рисует «Арена не включена», хотя рубильник ни при чём. Здесь
  // используем тот же bootstrap, что уже стоит перед лидербордом/друзьями/
  // квестами (ensureStableAuthLink = ensureAnonUser + серверная привязка),
  // чтобы users/{stableId} гарантированно существовал до первого arenaV2Home.
  // Не заменять обратно на голый ensureAnonUser().
  await ensureStableAuthLink().catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  // зачем: для гейта версии нужна разбираемая строка, а не 'unknown' —
  // иначе сервер отвечает «обнови приложение» установленной свежей сборке,
  // и хаб рисует «Арена не включена на сервере». См. getVersionForServerGate.
  const clientVersion = getVersionForServerGate({
    nativeAppVersion: Constants.nativeAppVersion,
    expoConfig: Constants.expoConfig,
  });
  const callable = httpsCallable(getFunctions(getApp(), REGION), name);
  return () => callable({ ...payload, clientVersion }).then((result) => result.data as T);
}

function isArenaStableIdRace(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '');
  const message = String((error as { message?: unknown })?.message ?? '');
  return code.includes('failed-precondition')
    && (message.includes('stable_id_required') || message.includes('stable_identity_missing'));
}

async function callArena<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const dispatch = await prepareArenaCall<T>(name, payload);
  try {
    return await dispatch();
  } catch (error) {
    // ⛔ НЕ УБИРАТЬ: закрывает гонку, когда bootstrap (ensureStableAuthLink
    // выше) не успел/не смог создать users/{stableId} до звонка — например,
    // из-за обрыва сети. Один повтор, не бесконечный ретрай.
    if (!isArenaStableIdRace(error)) throw error;
    await ensureStableAuthLink().catch(() => false);
    const retryDispatch = await prepareArenaCall<T>(name, payload);
    return retryDispatch();
  }
}

export function createArenaRequestId(prefix = 'arena'): string {
  return `${prefix}_${Crypto.randomUUID()}`;
}

const viewerSeatCache = new Map<string, 'a' | 'b'>();

export function rememberArenaViewerSeat(matchId: string | undefined, viewerSeat: 'a' | 'b' | undefined): void {
  if (matchId && viewerSeat) viewerSeatCache.set(matchId, viewerSeat);
}

export function peekArenaViewerSeat(matchId: string | null | undefined): 'a' | 'b' | null {
  return matchId ? viewerSeatCache.get(matchId) ?? null : null;
}

export async function arenaV2Home(): Promise<ArenaHomeResponse> {
  const response = await callArena<ArenaHomeResponse>('arenaV2Home');
  rememberArenaViewerSeat(response.activeMatch?.matchId, response.activeMatchViewerSeat);
  return response;
}

export async function arenaV2FindMatch(mode: ArenaQueueMode, requestId: string): Promise<Readonly<{
  ok: true;
  status: 'waiting' | 'matched';
  stableUid: string;
  matchId?: string;
  viewerSeat?: 'a' | 'b';
  queue?: ArenaTicket;
  /** Сколько ЖИВЫХ игроков ищет сейчас, не считая тебя. Ботов в рейтинге нет. */
  searchingNow?: number;
}>> {
  const response = await callArena<Readonly<{ ok: true; status: 'waiting' | 'matched'; stableUid: string; matchId?: string; viewerSeat?: 'a' | 'b'; queue?: ArenaTicket; searchingNow?: number }>>('arenaV2FindMatch', { mode, requestId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2QueueCancel = (requestId?: string) => callArena<{ ok: true }>(
  'arenaV2QueueCancel',
  requestId ? { requestId } : {},
);

export async function arenaV2QuickBotFallback(requestId: string): Promise<Readonly<{
  ok: true;
  status: 'matched';
  matchId: string;
  viewerSeat?: 'a' | 'b';
}>> {
  const response = await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat?: 'a' | 'b' }>>('arenaV2QuickBotFallback', { requestId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

/** зачем (владелец 2026-08-28): зеркало быстрого фолбэка для рейтинга — тот же
 *  контракт ответа, отдельный callable из-за дневного лимита на сервере. */
export async function arenaV2RankedBotFallback(requestId: string): Promise<Readonly<{
  ok: true;
  status: 'matched';
  matchId: string;
  viewerSeat?: 'a' | 'b';
}>> {
  const response = await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat?: 'a' | 'b' }>>('arenaV2RankedBotFallback', { requestId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2MatchAccept = (matchId: string) => callArena<MatchMutationResponse>('arenaV2MatchAccept', { matchId });
/**
 * НЕ ВЫЗЫВАЕТСЯ НИ ОДНИМ ЭКРАНОМ, и это осознанно.
 *
 * Матч не предлагают — в него входят: игрок уже нажал «Играть» или принял
 * приглашение друга, поэтому экран матча принимает дуэль сам. Отказаться
 * можно раньше, на уровне приглашения (`arenaV2InviteDecline`), и позже,
 * выходом из матча (`arenaV2Forfeit`). Обёртка оставлена ради серверного
 * договора; если понадобится экран отказа от матча — он уже есть чем.
 */
export const arenaV2MatchDecline = (matchId: string) => callArena<MatchMutationResponse>('arenaV2MatchDecline', { matchId });
export const arenaV2SyncMatch = (matchId: string, expectedVersion?: number) => callArena<MatchMutationResponse>(
  'arenaV2SyncMatch',
  expectedVersion === undefined ? { matchId } : { matchId, expectedVersion },
);
export const arenaV2Forfeit = (matchId: string) => callArena<MatchMutationResponse>('arenaV2Forfeit', { matchId });
/**
 * Снять замок незакрытого матча, который так и не начался.
 *
 * зачем (владелец 2026-08-29): матч, который НЕ СОСТОЯЛСЯ, обязан закрываться
 * сразу. Иначе `activeMatchId` в профиле блокирует любой новый поиск, и Арена
 * перестаёт открываться вовсе. Сервер сам решает, действительно ли матч мёртв,
 * — клиент не может закрыть живую игру этим вызовом.
 */
export const arenaV2ReleaseStaleMatch = () => callArena<Readonly<{
  released: boolean;
  matchId?: string;
}>>('arenaV2ReleaseStaleMatch', {});

/* ─────────────────────────── Дуэль v3 ──────────────────────────────────── */

/**
 * Весь матч — три обращения к серверу, и ни одного во время самой игры.
 *
 * `arenaV2MatchPlan` отдаёт все задания и отпечатки правильных ответов сразу;
 * дальше устройство играет само и показывает вердикт мгновенно.
 * `arenaV2MatchFinish` принимает единственный отчёт. `arenaV2MatchSettle`
 * зовётся РОВНО ОДИН РАЗ и только если соперник не сдался к сроку.
 */
type ArenaMatchPlanResponseWire = Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: unknown;
}>;

type ArenaMatchPlanResponse = Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: ArenaMatchPlanWire;
}>;

function normalizeArenaMatchPlanResponse(
  matchId: string,
  response: ArenaMatchPlanResponseWire,
): ArenaMatchPlanResponse | null {
  const plan = arenaParseMatchPlan(response?.plan);
  // Разбор закрытый: план, который не сошёлся целиком, к игре не допускается.
  // Начать матч с половиной заданий хуже, чем честно не начать.
  if (!plan) return null;
  rememberArenaViewerSeat(matchId, plan.viewerSeat);
  return {
    ok: true,
    startedAtMs: Math.trunc(Number(response.startedAtMs ?? 0)),
    deadlineAtMs: Math.trunc(Number(response.deadlineAtMs ?? 0)),
    plan,
  };
}

export async function arenaV2MatchPlan(matchId: string): Promise<ArenaMatchPlanResponse | null> {
  const response = await callArena<ArenaMatchPlanResponseWire>('arenaV2MatchPlan', { matchId });
  return normalizeArenaMatchPlanResponse(matchId, response);
}

export type ArenaMatchFinishResponse = MatchMutationResponse & Readonly<{
  matchStars: number;
  starsDelta: number;
  settled: boolean;
  /** Caller-only review rows returned immediately, before shared settlement. */
  viewerReview?: readonly unknown[];
  /** Когда спросить о закрытии, если соперник ещё не сдал. Один раз, не опрос. */
  settleProbeAtMs?: number;
}>;

/**
 * Отправляет отчёт. `reportId` — идентификатор матча: повтор после обрыва сети
 * обязан вернуть тот же результат, а не начислить второй раз. Клиентских
 * случайных ключей здесь нет намеренно — они ломаются при восстановлении из
 * резервной копии, а пара «игрок + матч» уже уникальна.
 */
export const arenaV2MatchFinish = (input: Readonly<{
  matchId: string;
  report: ArenaMatchReportWire;
}>) => callArena<ArenaMatchFinishResponse>('arenaV2MatchFinish', {
  matchId: input.matchId,
  reportId: input.matchId,
  report: input.report,
});

function reserveArenaCall<T>(
  name: string,
  payload: Record<string, unknown>,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<T> | null> {
  const ownerStableUid = account.phase === 'active' ? account.stableId : null;
  if (!ownerStableUid) return Promise.resolve(null);
  return arenaReserveAccountDispatch({
    isOwnerCurrent: () => isCurrentAccountGeneration(account, ownerStableUid),
    withTransitionLock: (work) => withAccountTransitionLock(async () => work()),
    prepareDispatch: () => prepareArenaCall<T>(name, payload),
  });
}

export function arenaV2MatchAcceptDispatch(
  matchId: string,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse> | null> {
  return reserveArenaCall<MatchMutationResponse>('arenaV2MatchAccept', { matchId }, account);
}

export async function arenaV2MatchPlanDispatch(
  matchId: string,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<ArenaMatchPlanResponse | null> | null> {
  const dispatch = await reserveArenaCall<ArenaMatchPlanResponseWire>(
    'arenaV2MatchPlan',
    { matchId },
    account,
  );
  if (!dispatch) return null;
  return {
    networkPromise: dispatch.networkPromise.then((response) =>
      normalizeArenaMatchPlanResponse(matchId, response)),
  };
}

export function arenaV2SyncMatchDispatch(
  matchId: string,
  expectedVersion: number | undefined,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse> | null> {
  return reserveArenaCall<MatchMutationResponse>('arenaV2SyncMatch',
    expectedVersion === undefined ? { matchId } : { matchId, expectedVersion },
    account,
  );
}

/** Creates the native callable promise while the captured account owns the transition lock. */
export function arenaV2MatchFinishDispatch(
  input: Readonly<{ matchId: string; report: ArenaMatchReportWire }>,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<ArenaMatchFinishResponse> | null> {
  return reserveArenaCall<ArenaMatchFinishResponse>('arenaV2MatchFinish', {
    matchId: input.matchId,
    reportId: input.matchId,
    report: input.report,
  }, account);
}

export function arenaV2MatchSettleDispatch(
  matchId: string,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse & { settled: boolean }> | null> {
  return reserveArenaCall<MatchMutationResponse & { settled: boolean }>('arenaV2MatchSettle', {
    matchId,
  }, account);
}

export const arenaV2MatchSettle = (matchId: string) =>
  callArena<MatchMutationResponse & { settled: boolean }>('arenaV2MatchSettle', { matchId });

/** Отчёт в том виде, в каком его ждёт сервер. */
export type ArenaMatchReportWire = Readonly<{
  schemaVersion: 'arena-match-report.v2';
  rulesVersion: string;
  matchId: string;
  seat: 'a' | 'b';
  planHash: string;
  taskCount: number;
  startedAtWallMs: number;
  finishedAtWallMs: number;
  tasks: readonly Readonly<{
    taskIndex: number;
    status: string;
    raceElapsedMs: number;
    answer?: unknown;
    pairAttempts?: Readonly<Record<string, readonly number[]>>;
  }>[];
  shownMatchStars: number;
  abandoned: boolean;
  clockSuspect: boolean;
}>;

/**
 * Переводит локальный отчёт в проводной вид.
 *
 * Журнал тыков по парам едет отдельным полем, а не внутри исхода: сервер
 * пересчитывает «угадано с первой попытки» сам и заявленному числу не верит,
 * иначе перебор всех вариантов снова стал бы выгодным.
 */
export function arenaMatchReportToWire(
  report: ArenaMatchReport,
  rulesVersion: string,
): ArenaMatchReportWire {
  return {
    schemaVersion: 'arena-match-report.v2',
    rulesVersion,
    matchId: report.matchId,
    seat: report.seat,
    planHash: report.planHash,
    taskCount: report.outcomes.length,
    startedAtWallMs: report.startedAtWallMs,
    finishedAtWallMs: report.finishedAtWallMs,
    tasks: report.outcomes.map((outcome) => {
      const journal = report.pairAttemptsByTask[outcome.taskIndex];
      return {
        taskIndex: outcome.taskIndex,
        status: outcome.status,
        raceElapsedMs: outcome.raceElapsedMs,
        ...(outcome.answer === null || outcome.answer === undefined ? {} : { answer: outcome.answer }),
        ...(journal
          ? {
            pairAttempts: Object.fromEntries(
              Object.entries(journal).map(([pair, attempts]) => [String(pair), [...attempts]]),
            ),
          }
          : {}),
      };
    }),
    shownMatchStars: report.matchStars,
    abandoned: report.abandoned,
    clockSuspect: report.clockSuspect,
  };
}

/**
 * Пошаговая отправка ответов — путь дуэли v2. НИ ОДИН экран его больше не
 * зовёт: в v3 план матча выдаётся целиком, ответы проверяются на устройстве,
 * а на сервер уходит один отчёт в конце (три вызова на матч вместо десятков).
 *
 * Обёртки оставлены потому, что на сервере эти функции живы ради матчей,
 * начатых старой сборкой приложения. Удалить их можно будет вместе с
 * серверными — но не раньше, иначе договор клиента с сервером перестанет
 * читаться из одного места.
 */
export const arenaV2SubmitAnswer = (input: Readonly<{
  matchId: string;
  taskIndex: number;
  submissionId: string;
  answer: unknown;
}>) => callArena<MatchMutationResponse & { correct: boolean; points: number }>('arenaV2SubmitAnswer', { ...input });

export const arenaV2SubmitSpeedAttempt = (input: Readonly<{
  matchId: string;
  taskIndex: number;
  submissionId: string;
  pairIndex: number;
  selectedIndex: number;
}>) => callArena<MatchMutationResponse & { correct: boolean; points: number }>('arenaV2SubmitSpeedAttempt', { ...input });

export const arenaV2InviteCreate = (friendStableUid: string, requestId: string) => callArena<Readonly<{
  ok: true;
  stableUid: string;
  inviteId: string;
  status: 'pending';
  expiresAtMs: number;
}>>('arenaV2InviteCreate', { friendStableUid, requestId });

export type ArenaFriendInviteStatus = Readonly<{
  ok: true;
  status: 'pending' | 'accepted' | 'matched' | 'declined' | 'cancelled' | 'expired';
  matchId?: string;
  viewerSeat: 'a' | 'b';
  expiresAtMs?: number;
  rendezvousExpiresAtMs?: number;
  counterpartStableUid?: string;
  counterpartName?: string;
  counterpartAvatar?: string;
}>;

export async function arenaV2InviteAccept(inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = await callArena<ArenaFriendInviteStatus>('arenaV2InviteAccept', { inviteId });
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2InviteDecline = (inviteId: string) => callArena<{ ok: true }>('arenaV2InviteDecline', { inviteId });
export const arenaV2InviteCancel = (inviteId: string) => callArena<{ ok: true }>('arenaV2InviteCancel', { inviteId });
export async function arenaV2InviteReady(inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = await callArena<ArenaFriendInviteStatus>('arenaV2InviteReady', { inviteId });
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}
export async function arenaV2InviteStatus(inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = await callArena<ArenaFriendInviteStatus>('arenaV2InviteStatus', { inviteId });
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}
export async function arenaV2DevFriendBotCreate(requestId: string): Promise<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat: 'a'; acceptedDelayMs: number }>> {
  const response = await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat: 'a'; acceptedDelayMs: number }>>('arenaV2DevFriendBotCreate', { requestId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export type ArenaFriendsBoardRow = Readonly<{
  stableUid: string;
  you: boolean;
  rating: number;
  rank: number;
  seasonBestTierIndex: number;
  wins: number;
  losses: number;
}>;

/**
 * Таблица друзей и собственный процентиль. Зовётся при открытии экрана, не по
 * кругу: список друзей меняется днями, а не секундами.
 */
export const arenaV2FriendsBoard = () => callArena<Readonly<{
  ok: true;
  rows: readonly ArenaFriendsBoardRow[];
  ownRating: number;
  percentileAbove: number | null;
  friendsCount: number;
  truncated: boolean;
}>>('arenaV2FriendsBoard');

/**
 * зачем (владелец, 23.08): `reward` теперь всегда возвращается клиенту —
 * раньше тип был `{ ok: true }` и `spin_credit`-приз, приходивший в теле
 * ответа, оставался незамеченным. Единственный спин в приложении живёт в
 * разделе «Подарки» (см. local_level_spins.ts); для `kind === 'spin_credit'`
 * вызывающий должен выдать локальный кредит тем же способом, что и за
 * ranked-победу — по идемпотентному ключу `${seasonId}_${level}_${side}`.
 */
export const arenaV2SeasonClaim = (input: Readonly<{
  seasonId?: string;
  level: number;
  side: 'free' | 'plus';
}>) => callArena<Readonly<{
  ok: true;
  seasonId: string;
  level: number;
  side: 'free' | 'plus';
  reward: Readonly<{ kind: 'shards'; amount: number }> | Readonly<{ kind: 'spin_credit'; amount: 1 }>;
}>>('arenaV2SeasonClaim', { ...input })
  .then(async (result) => {
    if (result.reward.kind === 'shards') {
      await refreshShardsBalanceFromCloudAuthoritative().catch(() => null);
    }
    return result;
  });

export async function arenaExpansionHome(): Promise<ArenaExpansionHome> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId?.trim();
  const response = await callArena<ArenaExpansionHomeWire>('arenaExpansionHome');
  const home = normalizeArenaExpansionHome(response);
  if (!ownerStableId) return home;
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    throw new Error('arena_account_scope_stale');
  }
  await mergeLevelSpinServerStars(accountToken, arenaUnifiedStarsObservation(home));
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    throw new Error('arena_account_scope_stale');
  }
  return home;
}

export async function arenaTodayStart(requestId: string): Promise<ArenaTodayStartResponse> {
  const response = await callArena<ArenaTodayStartResponse>('arenaTodayStart', { requestId });
  requireArenaExpansionMatch(response);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

function requireArenaExpansionMatch(response: { match?: unknown }): asserts response is { match: ArenaMatch } {
  const match = response.match as Partial<ArenaMatch> | undefined;
  if (!match || typeof match.matchId !== 'string' || typeof match.version !== 'number'
    || typeof match.currentTaskIndex !== 'number' || typeof match.state !== 'string'
    || !Array.isArray(match.players) || !Array.isArray(match.submittedBy)) {
    throw new Error('arena_expansion_match_malformed');
  }
}

async function callArenaExpansionMutation(name: string, payload: Record<string, unknown>): Promise<ArenaExpansionMatchMutation> {
  const response = await callArena<ArenaExpansionMatchMutation>(name, payload);
  requireArenaExpansionMatch(response);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaTodaySubmitAnswer = (input: Readonly<{
  matchId: string; taskIndex: number; submissionId: string; answer: unknown;
}>) => callArenaExpansionMutation('arenaTodaySubmitAnswer', { ...input });

export const arenaTodaySubmitSpeedAttempt = (input: Readonly<{
  matchId: string; taskIndex: number; submissionId: string; pairIndex: number; selectedIndex: number;
}>) => callArenaExpansionMutation('arenaTodaySubmitSpeedAttempt', { ...input });

export const arenaTodaySync = (matchId: string, expectedVersion?: number) => callArenaExpansionMutation(
  'arenaTodaySync', expectedVersion === undefined ? { matchId } : { matchId, expectedVersion },
);

export const arenaMatchLabGet = (input: Readonly<{ sourceRunId?: string; matchId?: string; mode?: ArenaTaskMode }> = {}) => callArena<Readonly<{ ok: true; plan: ArenaMatchLabPlan }>>(
  'arenaMatchLabGet', { ...input },
);

export const arenaGhostCreate = (friendStableUid: string, sourceRunId: string, sourceKind: ArenaGhostSourceKind, requestId: string) => callArena<ArenaGhostCreateResponse>(
  'arenaGhostCreate', { friendStableUid, sourceRunId, sourceKind, requestId },
);
export async function arenaGhostAccept(inviteToken: string, requestId: string): Promise<ArenaGhostResponse> {
  const response = await callArena<ArenaGhostResponse>('arenaGhostAccept', { inviteToken, requestId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}
export const arenaGhostStatus = (inviteToken?: string) => callArena<Readonly<{
  ok: true; ghosts: readonly ArenaGhostSummary[]; selected?: ArenaGhostResponse;
}>>('arenaGhostStatus', inviteToken ? { inviteToken } : {});
export const arenaGhostDecline = (inviteToken: string) => callArena<Readonly<{ ok: true; ghostId: string; status: 'declined' }>>(
  'arenaGhostDecline', { inviteToken },
);

export const arenaRivalPropose = (sourceMatchId: string, requestId: string) => callArena<ArenaRivalResponse>(
  'arenaRivalPropose', { sourceMatchId, requestId },
);
export const arenaRivalAccept = (seriesId: string, requestId: string) => callArena<ArenaRivalResponse>(
  'arenaRivalAccept', { seriesId, requestId },
);
export const arenaRivalNext = (seriesId: string, requestId: string) => callArena<ArenaRivalResponse>(
  'arenaRivalNext', { seriesId, requestId },
);
export const arenaRivalLeave = (seriesId: string, requestId: string) => callArena<ArenaRivalResponse>(
  'arenaRivalLeave', { seriesId, requestId },
);
export const arenaRivalMute = (seriesId: string, muted: boolean, requestId: string) => callArena<Readonly<{
  ok: true; seriesId: string; muted: boolean;
}>>('arenaRivalMute', { seriesId, muted, requestId });

export const arenaPartnerInvite = (friendStableUid: string, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerInvite', { friendStableUid, requestId });
export const arenaPartnerAccept = (partnershipId: string, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerAccept', { partnershipId, requestId });
export const arenaPartnerPause = (partnershipId: string, paused: boolean, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerPause', { partnershipId, paused, requestId });
export const arenaPartnerPreferences = (
  enabled: boolean,
  quietHoursUtc: Readonly<{ startHour: number; endHour: number }> | null,
  requestId: string,
) => callArena<Readonly<{
  ok: true; enabled: boolean; quietHoursUtc: Readonly<{ startHour: number; endHour: number }> | null;
}>>('arenaPartnerPreferences', { enabled, quietHoursUtc, requestId });
export const arenaPartnerNudge = (partnershipId: string, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerNudge', { partnershipId, requestId });
export const arenaPartnerRemove = (partnershipId: string, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerRemove', { partnershipId, requestId });
export const arenaPartnerClaimSpotlight = (partnershipId: string, requestId: string) => callArena<Readonly<{
  ok: true; partner: ArenaPartnerSummary;
}>>('arenaPartnerClaimSpotlight', { partnershipId, requestId });

export async function arenaStarStore(): Promise<ArenaStarStoreResponse> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId?.trim();
  const response = await callArena<ArenaStarStoreResponse>('arenaStarStore');
  if (!ownerStableId) return response;
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    throw new Error('arena_account_scope_stale');
  }
  await mergeLevelSpinServerStars(accountToken, arenaUnifiedStarsObservation(response));
  if (!isCurrentAccountGeneration(accountToken, ownerStableId)) {
    throw new Error('arena_account_scope_stale');
  }
  return response;
}
export const arenaStarPurchase = (itemId: string, catalogVersion: string | undefined, requestId: string) => callArena<ArenaPurchaseResponse>(
  'arenaStarPurchase', { itemId, catalogVersion, requestId },
);
export const arenaStarEquip = (itemId: string, slot: string, requestId: string) => callArena<Readonly<{
  ok: true; slot: string; itemId: string;
}>>('arenaStarEquip', { itemId, slot, requestId });

type ListenerState<T> = Readonly<{
  value: T | null;
  loading: boolean;
  error: string | null;
  fresh: boolean;
}>;

const arenaListenerNeutralState = <T,>(documentId: string | null): ListenerState<T> => ({
  value: null,
  loading: Boolean(documentId),
  error: null,
  fresh: false,
});

function useArenaDocument<T>(
  collection: string,
  documentId: string | null,
  active: boolean,
  ownerScopeKey = '',
): ListenerState<T> {
  const listenerKey = `${ownerScopeKey}:${collection}:${documentId ?? ''}`;
  const gate = useRef(createArenaListenerScopeGate()).current;
  const renderScope = gate.capture(listenerKey);
  const [scopedState, setScopedState] = useState<Readonly<{
    scope: ArenaListenerScopeToken;
    state: ListenerState<T>;
  }>>(() => ({ scope: renderScope, state: arenaListenerNeutralState<T>(documentId) }));
  const valueRef = useRef<Readonly<{ scope: ArenaListenerScopeToken; value: T | null }>>({
    scope: renderScope,
    value: null,
  });
  if (!gate.current(valueRef.current.scope)) {
    valueRef.current = { scope: renderScope, value: null };
  }

  useEffect(() => {
    const capturedScope = renderScope;
    const publish = (state: ListenerState<T>) => {
      if (!gate.current(capturedScope)) return;
      setScopedState({ scope: capturedScope, state });
    };
    if (!documentId) {
      valueRef.current = { scope: capturedScope, value: null };
      publish({ value: null, loading: false, error: null, fresh: false });
      return;
    }
    const visibleValue = valueRef.current.value;
    publish({ value: visibleValue, loading: visibleValue === null, error: null, fresh: false });
    if (!active) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      try {
        const firestore = (await import('@react-native-firebase/firestore')).default;
        if (cancelled || !gate.current(capturedScope)) return;
        unsubscribe = firestore().collection(collection).doc(documentId).onSnapshot(
          { includeMetadataChanges: true },
          (snapshot: any) => {
            if (cancelled || !gate.current(capturedScope)) return;
            if (!snapshot?.exists) {
              valueRef.current = { scope: capturedScope, value: null };
              publish({ value: null, loading: false, error: 'not_found', fresh: !snapshot?.metadata?.fromCache });
              return;
            }
            const next = snapshot.data() as T;
            valueRef.current = { scope: capturedScope, value: next };
            publish({ value: next, loading: false, error: null, fresh: !snapshot.metadata?.fromCache });
          },
          (error: unknown) => {
            if (cancelled || !gate.current(capturedScope)) return;
            publish({ value: valueRef.current.value, loading: false, error: String(error), fresh: false });
          },
        );
      } catch (error) {
        if (!cancelled && gate.current(capturedScope)) {
          publish({ value: valueRef.current.value, loading: false, error: String(error), fresh: false });
        }
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [active, collection, documentId, gate, ownerScopeKey, renderScope]);

  return gate.current(scopedState.scope)
    ? scopedState.state
    : arenaListenerNeutralState<T>(documentId);
}

/** The only queue listener: the signed-in owner's document, never a query. */
export function useArenaQueue(stableUid: string | null, active: boolean) {
  return useArenaDocument<ArenaTicket>('arena_v2_queue', stableUid, active);
}

/** Once matched, callers disable useArenaQueue and own exactly this one match listener. */
export function useArenaMatch(matchId: string | null, active: boolean, ownerScopeKey = '') {
  return useArenaDocument<ArenaMatch>('arena_v2_matches', matchId, active, ownerScopeKey);
}

/**
 * Живой прогресс соперника.
 *
 * Подписка идёт на ЧУЖОЕ место за столом, а не на свой документ: своё мы и так
 * знаем. Путь строится из места, а не из идентификатора игрока — тот намеренно
 * спрятан, ради этого и заведены отдельные метки участия.
 */
export function useArenaOpponentLive(matchId: string | null, opponentSeat: 'a' | 'b' | null, active: boolean) {
  const path = matchId && opponentSeat ? `${matchId}/${ARENA_LIVE_SEATS}/${opponentSeat}` : null;
  return useArenaDocument<Record<string, unknown>>(ARENA_LIVE_COLLECTION, path ?? null, active);
}

/**
 * Публикует свой ход в канал.
 *
 * Единственная запись, которую клиент делает в базу за весь матч, и она
 * ограничена: вызывать её разрешено только тогда, когда `arenaLivePublishPlan`
 * вернул не-null, то есть появилось НОВОЕ закрытое задание. Повтор ничего не
 * добавляет по смыслу и не должен добавлять записей.
 *
 * Ошибка записи глотается намеренно: канал — индикатор, а не начисление. Итог
 * матча пересчитает сервер по запечатанным заданиям, поэтому непрошедшая
 * запись стоит одного негоревшего индикатора, а не результата.
 */
export async function arenaPublishLiveTicks(input: Readonly<{
  matchId: string;
  seat: 'a' | 'b';
  ticks: readonly Readonly<{ taskIndex: number; correct: boolean; raceElapsedMs: number; matchStars?: number }>[];
  finished: boolean;
}>): Promise<boolean> {
  try {
    const firestore = (await import('@react-native-firebase/firestore')).default;
    await firestore()
      .collection(ARENA_LIVE_COLLECTION)
      .doc(`${input.matchId}/${ARENA_LIVE_SEATS}/${input.seat}`)
      .set(arenaLiveWritePayload({
        ticks: input.ticks,
        finished: input.finished,
        // Метка времени обязательна по правилам: по ней почасовая уборка
        // находит протухшие каналы, иначе документы остались бы навсегда.
        updatedAtMs: Date.now(),
      }), { merge: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Расписки матчей для истории.
 *
 * Читаются напрямую: они уже пишутся при закрытии матча, читать их разрешено
 * только владельцу, и заводить под историю серверный вызов значило бы платить
 * дважды за то, что уже лежит. Разовое чтение при открытии экрана, не подписка.
 *
 * зачем stableUid, а не authUid (владелец, 2026-08-23: «в арене история не
 * отображает результаты квик матча»): сервер пишет расписку в
 * `users/{stableUid}/arena_v2_receipts` — stableUid приходит из
 * `resolveStableUidForAuth`, и у связанного аккаунта (анонимный вход, затем
 * Apple/Google, либо слияние) он НЕ равен authUid. Эта функция была
 * единственным местом клиента Арены, читавшим по authUid: матчи закрывались,
 * расписки писались, а экран читал пустую чужую ветку и честно показывал
 * «матчей нет». Быстрый матч выпадал первым просто потому, что его играют чаще.
 *
 * зачем бросок вместо пустого массива: «отказ» и «матчей нет» — разные вещи,
 * и различить их обязан ВЫЗЫВАЮЩИЙ. Раньше несостоявшееся чтение возвращало
 * `[]`, экран засчитывал его за успех и писал игроку «матчей нет» — то есть
 * враньё о нём самом.
 */
export async function arenaFetchMatchHistory(limit = 30): Promise<readonly unknown[]> {
  const account = captureAccountGeneration();
  const stableUid = account.phase === 'active' ? account.stableId : null;
  if (!stableUid) throw new Error('arena_history_account_not_ready');
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const snapshot = await firestore()
    .collection('users').doc(stableUid).collection('arena_v2_receipts')
    .orderBy('settledAtMs', 'desc')
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))))
    .get();
  // Смена аккаунта во время чтения: чужую историю показывать нельзя, а пустой
  // список тут был бы новым враньём — поэтому отказ, его экран покажет честно.
  if (!isCurrentAccountGeneration(account, stableUid)) throw new Error('arena_history_account_stale');
  return snapshot.docs.map((doc: { data(): unknown }) => doc.data());
}

/**
 * Разбор матча. Читается напрямую из документа, который сервер пишет при
 * закрытии матча: он доступен только владельцу, и заводить под разбор
 * отдельный вызов значило бы платить за то, что уже лежит.
 *
 * зачем повтор (владелец, 2026-08-17): «Разбор» на экране результата ведёт
 * сюда МГНОВЕННО по нажатию, а серверная транзакция settleMatch дописывает
 * этот же документ асинхронно, на доли секунды позже отправки результата.
 * Игрок, нажавший быстро, попадал в гонку: документа ещё нет, экран навсегда
 * говорит «разбор не готов», хотя запись доедет через мгновение. Один короткий
 * повтор закрывает окно гонки, не превращаясь в опрос по кругу — читаем
 * ровно дважды, максимум.
 */
export async function arenaFetchMatchReview(
  scope: ArenaReviewAccountScope,
  matchId: string,
): Promise<readonly unknown[] | null> {
  if (!scope.stableUid || !matchId) return null;
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const ref = firestore()
    .collection('users').doc(scope.stableUid).collection('arena_v2_match_labs').doc(matchId);
  const read = async (): Promise<readonly unknown[] | null> => {
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const tasks = (snapshot.data() as { tasks?: unknown } | undefined)?.tasks;
    return Array.isArray(tasks) ? tasks : [];
  };
  return arenaReadReviewWithRetry(
    read,
    () => new Promise((resolve) => setTimeout(resolve, 900)),
  );
}

/** Host-only friend-duel handoff: observes the owner's opaque active match id. */
export function useArenaProfile(stableUid: string | null, active: boolean) {
  return useArenaDocument<Readonly<{ activeMatchId?: string | null }>>('arena_v2_profiles', stableUid, active);
}

/**
 * Досылает отчёты, застрявшие в очереди.
 *
 * Зовётся с хаба и с экрана результата — то есть в тех двух местах, куда игрок
 * приходит сам. Отдельного расписания намеренно нет: фоновый опрос стоил бы
 * денег за базу каждый день у каждого игрока, а отчёт всё равно ждёт своего
 * часа на диске и никуда не денется.
 */
export async function arenaFlushOutbox(): Promise<number> {
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId) return 0;
  const scope = { stableUid: account.stableId, accountGeneration: account.generation };
  const adopted = await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(account, scope.stableUid)) return false;
    await arenaOutboxAdoptOwnerGeneration(AsyncStorage as unknown as ArenaKeyValueStore, scope);
    return isCurrentAccountGeneration(account, scope.stableUid);
  });
  if (!adopted) return 0;
  const result = await arenaOutboxFlush(AsyncStorage as unknown as ArenaKeyValueStore, {
    scope,
    wallNowMs: Date.now(),
    isScopeCurrent: (candidate) => isCurrentAccountGeneration(account, candidate.stableUid),
    send: async (entry) => {
      const dispatch = await arenaV2MatchFinishDispatch({
        matchId: entry.matchId,
        report: arenaMatchReportToWire(entry.report, entry.rulesVersion),
      }, account);
      if (!dispatch) throw new Error('arena_account_scope_stale');
      await dispatch.networkPromise;
    },
  });
  return result.sent.length;
}

export type ArenaQueuedFinishRetryResult = ArenaFinishRetryResult<ArenaMatchFinishResponse>;

/**
 * Retries only the report owned by the still-mounted match screen.
 *
 * Unlike the generic hub/history flush this returns the typed callable body:
 * the screen must retain caller-private review rows and the one-shot settle
 * deadline before it can leave the final task for a coherent result.
 */
export async function arenaRetryQueuedFinish(
  matchId: string,
  account: AccountGenerationToken,
): Promise<ArenaQueuedFinishRetryResult> {
  const stableUid = account.phase === 'active' ? account.stableId : null;
  if (!matchId || !stableUid || !isCurrentAccountGeneration(account, stableUid)) {
    return { status: 'stale' };
  }
  const scope = { stableUid, accountGeneration: account.generation };
  const current = () => isCurrentAccountGeneration(account, stableUid);
  const adopted = await withAccountTransitionLock(async () => {
    if (!current()) return false;
    await arenaOutboxAdoptOwnerGeneration(AsyncStorage as unknown as ArenaKeyValueStore, scope);
    return current();
  });
  if (!adopted) return { status: 'stale' };

  return arenaRetryQueuedFinishDelivery({
    store: AsyncStorage as unknown as ArenaKeyValueStore,
    scope,
    matchId,
    wallNowMs: Date.now(),
    isAlive: current,
    isScopeCurrent: current,
    withTransitionLock: (work) => withAccountTransitionLock(async () => work()),
    reserveDispatch: (entry) => arenaV2MatchFinishDispatch({
      matchId: entry.matchId,
      report: arenaMatchReportToWire(entry.report, entry.rulesVersion),
    }, account),
  });
}

/** Ждёт ли отчёт об этом матче отправки — чтобы экран результата не врал. */
export async function arenaOutboxPending(matchId: string | null): Promise<boolean> {
  if (!matchId) return false;
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId) return false;
  const scope = { stableUid: account.stableId, accountGeneration: account.generation };
  const adopted = await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(account, scope.stableUid)) return false;
    await arenaOutboxAdoptOwnerGeneration(AsyncStorage as unknown as ArenaKeyValueStore, scope);
    return isCurrentAccountGeneration(account, scope.stableUid);
  });
  if (!adopted) return false;
  return arenaOutboxHasMatch(AsyncStorage as unknown as ArenaKeyValueStore, scope, matchId);
}

/**
 * Застрял ли отчёт из-за устаревшего приложения.
 *
 * Такой отчёт повторами не спасти: сервер отвергает старого клиента и будет
 * отвергать дальше. Единственное честное действие — сказать игроку, что от него
 * требуется обновление, иначе награда за сыгранный матч не придёт никогда, а он
 * даже не узнает почему.
 */
export async function arenaOutboxBlockedByUpdate(): Promise<boolean> {
  try {
    const account = captureAccountGeneration();
    if (account.phase !== 'active' || !account.stableId) return false;
    const scope = { stableUid: account.stableId, accountGeneration: account.generation };
    const adopted = await withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(account, scope.stableUid)) return false;
      await arenaOutboxAdoptOwnerGeneration(AsyncStorage as unknown as ArenaKeyValueStore, scope);
      return isCurrentAccountGeneration(account, scope.stableUid);
    });
    if (!adopted) return false;
    return arenaOutboxHasGated(
      await arenaOutboxList(AsyncStorage as unknown as ArenaKeyValueStore, scope),
    );
  } catch {
    return false;
  }
}

export default function ArenaClientRouteShim() { return null; }
