import { useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser } from './cloud_sync';
import { getInstalledAppVersion } from './app_version';
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
import { normalizeArenaExpansionHome } from '../modules/arena/expansion_contract';
import { arenaParseMatchPlan, type ArenaMatchPlanWire } from '../modules/arena/duel_plan';
import type { ArenaMatchReport } from '../modules/arena/match_machine';
import {
  ARENA_LIVE_COLLECTION,
  ARENA_LIVE_SCHEMA_VERSION,
  ARENA_LIVE_SEATS,
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

async function callArena<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  await ensureAnonUser().catch(() => null);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const { getApp } = await import('@react-native-firebase/app');
  const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
  const clientVersion = getInstalledAppVersion({
    nativeAppVersion: Constants.nativeAppVersion,
    expoConfig: Constants.expoConfig,
  });
  const result = await httpsCallable(getFunctions(getApp(), REGION), name)({ ...payload, clientVersion });
  return result.data as T;
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

export const arenaV2MatchAccept = (matchId: string) => callArena<MatchMutationResponse>('arenaV2MatchAccept', { matchId });
export const arenaV2MatchDecline = (matchId: string) => callArena<MatchMutationResponse>('arenaV2MatchDecline', { matchId });
export const arenaV2SyncMatch = (matchId: string, expectedVersion?: number) => callArena<MatchMutationResponse>(
  'arenaV2SyncMatch',
  expectedVersion === undefined ? { matchId } : { matchId, expectedVersion },
);
export const arenaV2Forfeit = (matchId: string) => callArena<MatchMutationResponse>('arenaV2Forfeit', { matchId });

/* ─────────────────────────── Дуэль v3 ──────────────────────────────────── */

/**
 * Весь матч — три обращения к серверу, и ни одного во время самой игры.
 *
 * `arenaV2MatchPlan` отдаёт все задания и отпечатки правильных ответов сразу;
 * дальше устройство играет само и показывает вердикт мгновенно.
 * `arenaV2MatchFinish` принимает единственный отчёт. `arenaV2MatchSettle`
 * зовётся РОВНО ОДИН РАЗ и только если соперник не сдался к сроку.
 */
export async function arenaV2MatchPlan(matchId: string): Promise<Readonly<{
  ok: true;
  startedAtMs: number;
  deadlineAtMs: number;
  plan: ArenaMatchPlanWire;
}> | null> {
  const response = await callArena<Readonly<{
    ok: true; startedAtMs: number; deadlineAtMs: number; plan: unknown;
  }>>('arenaV2MatchPlan', { matchId });
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

export type ArenaMatchFinishResponse = MatchMutationResponse & Readonly<{
  matchStars: number;
  starsDelta: number;
  settled: boolean;
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
}>>('arenaV2InviteCreate', { friendStableUid, requestId });

export async function arenaV2InviteAccept(inviteId: string): Promise<Readonly<{
  ok: true;
  matchId: string;
  status: 'accepted';
  viewerSeat?: 'a' | 'b';
}>> {
  const response = await callArena<Readonly<{ ok: true; matchId: string; status: 'accepted'; viewerSeat?: 'a' | 'b' }>>('arenaV2InviteAccept', { inviteId });
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2InviteDecline = (inviteId: string) => callArena<{ ok: true }>('arenaV2InviteDecline', { inviteId });

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

export const arenaV2SeasonClaim = (input: Readonly<{
  seasonId?: string;
  level: number;
  side: 'free' | 'plus';
}>) => callArena<{ ok: true }>('arenaV2SeasonClaim', { ...input });

export const arenaV2SpinStatus = () => callArena<Readonly<{ ok: true; spinsAvailable: number }>>('arenaV2SpinStatus');
export const arenaV2SpinClaim = (requestId: string) => callArena<Readonly<{
  ok: true;
  receiptId: string;
  reward?: Readonly<{ kind: 'shards'; amount: number }>;
}>>('arenaV2SpinClaim', { requestId });

export async function arenaExpansionHome(): Promise<ArenaExpansionHome> {
  const response = await callArena<ArenaExpansionHomeWire>('arenaExpansionHome');
  return normalizeArenaExpansionHome(response);
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

export const arenaStarStore = () => callArena<ArenaStarStoreResponse>('arenaStarStore');
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

function useArenaDocument<T>(collection: string, documentId: string | null, active: boolean): ListenerState<T> {
  const [state, setState] = useState<ListenerState<T>>({ value: null, loading: Boolean(documentId), error: null, fresh: false });
  const valueRef = useRef<T | null>(null);

  useEffect(() => {
    if (!documentId) {
      valueRef.current = null;
      setState({ value: null, loading: false, error: null, fresh: false });
      return;
    }
    setState((previous) => ({ ...previous, loading: previous.value === null, error: null }));
    if (!active) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void (async () => {
      try {
        const firestore = (await import('@react-native-firebase/firestore')).default;
        if (cancelled) return;
        unsubscribe = firestore().collection(collection).doc(documentId).onSnapshot(
          { includeMetadataChanges: true },
          (snapshot: any) => {
            if (cancelled) return;
            if (!snapshot?.exists) {
              setState({ value: null, loading: false, error: 'not_found', fresh: !snapshot?.metadata?.fromCache });
              return;
            }
            const next = snapshot.data() as T;
            valueRef.current = next;
            setState({ value: next, loading: false, error: null, fresh: !snapshot.metadata?.fromCache });
          },
          (error: unknown) => {
            if (cancelled) return;
            setState({ value: valueRef.current, loading: false, error: String(error), fresh: false });
          },
        );
      } catch (error) {
        if (!cancelled) setState({ value: valueRef.current, loading: false, error: String(error), fresh: false });
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [active, collection, documentId]);

  return state;
}

/** The only queue listener: the signed-in owner's document, never a query. */
export function useArenaQueue(stableUid: string | null, active: boolean) {
  return useArenaDocument<ArenaTicket>('arena_v2_queue', stableUid, active);
}

/** Once matched, callers disable useArenaQueue and own exactly this one match listener. */
export function useArenaMatch(matchId: string | null, active: boolean) {
  return useArenaDocument<ArenaMatch>('arena_v2_matches', matchId, active);
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
  ticks: readonly Readonly<{ taskIndex: number; correct: boolean; raceElapsedMs: number }>[];
  finished: boolean;
}>): Promise<boolean> {
  try {
    const firestore = (await import('@react-native-firebase/firestore')).default;
    await firestore()
      .collection(ARENA_LIVE_COLLECTION)
      .doc(`${input.matchId}/${ARENA_LIVE_SEATS}/${input.seat}`)
      .set({
        schemaVersion: ARENA_LIVE_SCHEMA_VERSION,
        ticks: input.ticks.map((tick) => ({
          taskIndex: tick.taskIndex,
          correct: tick.correct,
          raceElapsedMs: tick.raceElapsedMs,
        })),
        finished: input.finished,
        // Метка времени обязательна по правилам: по ней почасовая уборка
        // находит протухшие каналы, иначе документы остались бы навсегда.
        updatedAtMs: Date.now(),
      }, { merge: true });
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
 */
export async function arenaFetchMatchHistory(limit = 30): Promise<readonly unknown[]> {
  const { getApp } = await import('@react-native-firebase/app');
  const authModule = await import('@react-native-firebase/auth');
  const uid = authModule.default().currentUser?.uid;
  if (!uid) return [];
  const firestore = (await import('@react-native-firebase/firestore')).default;
  void getApp;
  const snapshot = await firestore()
    .collection('users').doc(uid).collection('arena_v2_receipts')
    .orderBy('settledAtMs', 'desc')
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))))
    .get();
  return snapshot.docs.map((doc: { data(): unknown }) => doc.data());
}

/**
 * Разбор матча. Читается напрямую из документа, который сервер пишет при
 * закрытии матча: он доступен только владельцу, и заводить под разбор
 * отдельный вызов значило бы платить за то, что уже лежит.
 */
export async function arenaFetchMatchReview(matchId: string): Promise<readonly unknown[] | null> {
  const authModule = await import('@react-native-firebase/auth');
  const uid = authModule.default().currentUser?.uid;
  if (!uid || !matchId) return null;
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const snapshot = await firestore()
    .collection('users').doc(uid).collection('arena_v2_match_labs').doc(matchId)
    .get();
  if (!snapshot.exists) return null;
  const tasks = (snapshot.data() as { tasks?: unknown } | undefined)?.tasks;
  return Array.isArray(tasks) ? tasks : [];
}

/** Host-only friend-duel handoff: observes the owner's opaque active match id. */
export function useArenaProfile(stableUid: string | null, active: boolean) {
  return useArenaDocument<Readonly<{ activeMatchId?: string | null }>>('arena_v2_profiles', stableUid, active);
}

export default function ArenaClientRouteShim() { return null; }
