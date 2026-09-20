import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
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
  withAccountTransitionLockWithDeadline,
  type AccountGenerationToken,
} from './account_generation';
import { ensureStableAuthLink } from './cloud_sync';
import { createArenaHomeRead } from '../modules/arena/home_preload';
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
import type { ArenaStudyTarget } from '../modules/arena/target_registry';

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
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
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

const ARENA_PUBLICATION_FINGERPRINT_RE = /^[a-f0-9]{64}$/u;

/**
 * Проверка совпадения языкового контура в ответе Арены.
 *
 * зачем ЛОГ (владелец 2026-09-20, «билд свежий, а проблема та же»): все три
 * отказа этой функции снаружи выглядят одинаково — хаб показывает «Арена ещё
 * не включена на сервере», хотя Арена включена. Диагностировать по коду
 * невозможно: за день это стоило нескольких кругов. Печатаем ЗНАЧЕНИЯ,
 * приведшие к отказу, а не голый код. Запрет немых отказов — правило проекта.
 */
function requireArenaTargetIdentity(
  value: unknown,
  expectedTarget: ArenaStudyTarget,
  expectedFingerprint?: string,
  callName = 'unknown',
): Readonly<{ studyTarget: ArenaStudyTarget; publicationFingerprint: string }> {
  const candidate = value && typeof value === 'object'
    ? value as { studyTarget?: unknown; publicationFingerprint?: unknown; match?: unknown }
    : {};
  const nested = candidate.match && typeof candidate.match === 'object'
    ? candidate.match as { studyTarget?: unknown; publicationFingerprint?: unknown }
    : null;
  const studyTarget = candidate.studyTarget ?? nested?.studyTarget;
  const publicationFingerprint = candidate.publicationFingerprint ?? nested?.publicationFingerprint;
  /**
   * Ответ СТАРОГО сервера, который о языковых контурах не знает.
   *
   * зачем (владелец 2026-09-20, лог 14:30:19): на проде развёрнута версия
   * функций старее кода в репозитории — она не кладёт в ответ ни
   * `studyTarget`, ни `publicationFingerprint`:
   *   [ARENA-TARGET] mismatch call=arenaV2Home expected=en got=undefined
   *                  keys=season,availability,ok,profile
   * Клиент требовал эти поля безусловно и отбрасывал ВАЛИДНЫЙ ответ. Падали
   * оба вызова хаба, и Арена целиком показывала «ещё не включена на сервере»,
   * хотя сервер работал и Арена была включена.
   *
   * Отсутствие поля и НЕСОВПАДЕНИЕ поля — принципиально разные случаи:
   *  • поля НЕТ  → старый сервер, контуров не существует, утечь нечему;
   *  • поле ЕСТЬ и другое → настоящий рассинхрон, отказ как и прежде.
   * Защита срабатывает на расхождение, а не на версию сервера.
   *
   * Временная совместимость: после деплоя `functions/` эта ветка не будет
   * срабатывать вовсе, и её можно убрать. Каждое срабатывание пишет в лог.
   */
  const legacyServerResponse = studyTarget === undefined && publicationFingerprint === undefined;
  if (legacyServerResponse) {
    DebugLogger.warn('arena_client',
      `[ARENA-TARGET] legacy server response call=${callName} target=${expectedTarget} `
      + '— deployed functions are older than the app; deploy functions/ to restore contours');
    return { studyTarget: expectedTarget, publicationFingerprint: '' };
  }
  if (studyTarget !== expectedTarget) {
    DebugLogger.warn('arena_client',
      `[ARENA-TARGET] mismatch call=${callName} expected=${expectedTarget} `
      + `got=${String(studyTarget)} nested=${nested ? 'yes' : 'no'} `
      + `keys=${Object.keys(candidate).join(',') || 'none'}`);
    throw new Error('arena_response_target_mismatch');
  }
  if (typeof publicationFingerprint !== 'string'
    || !ARENA_PUBLICATION_FINGERPRINT_RE.test(publicationFingerprint)) {
    DebugLogger.warn('arena_client',
      `[ARENA-TARGET] publication invalid call=${callName} target=${expectedTarget} `
      + `fingerprint=${String(publicationFingerprint)}`);
    throw new Error('arena_response_publication_invalid');
  }
  if (expectedFingerprint && publicationFingerprint !== expectedFingerprint) {
    DebugLogger.warn('arena_client',
      `[ARENA-TARGET] publication mismatch call=${callName} target=${expectedTarget} `
      + `expected=${expectedFingerprint} got=${publicationFingerprint}`);
    throw new Error('arena_response_publication_mismatch');
  }
  return { studyTarget: expectedTarget, publicationFingerprint };
}

function requireArenaTargetResponse<T>(
  value: T,
  expectedTarget: ArenaStudyTarget,
  expectedFingerprint?: string,
  callName = 'unknown',
): T {
  requireArenaTargetIdentity(value, expectedTarget, expectedFingerprint, callName);
  return value;
}

type ArenaCallableErrorShape = {
  code?: unknown;
  message?: unknown;
  nativeErrorMessage?: unknown;
  details?: unknown;
  userInfo?: { message?: unknown };
};

function stringifyArenaErrorDetail(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value == null) return null;
  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== '{}' ? serialized : null;
  } catch {
    return null;
  }
}

/** Firebase iOS can hide the callable's real reason outside Error.message. */
export function arenaCallableErrorText(error: unknown): string {
  const shape = (error && typeof error === 'object')
    ? error as ArenaCallableErrorShape
    : undefined;
  const parts = [
    stringifyArenaErrorDetail(shape?.code),
    error instanceof Error ? stringifyArenaErrorDetail(error.message) : stringifyArenaErrorDetail(error),
    stringifyArenaErrorDetail(shape?.nativeErrorMessage),
    stringifyArenaErrorDetail(shape?.userInfo?.message),
    stringifyArenaErrorDetail(shape?.details),
  ].filter((part): part is string => Boolean(part));
  return [...new Set(parts)].join(' | ').slice(0, 500) || 'unknown';
}

/**
 * Сетевая подготовка перед вызовом Арены: привязка аккаунта и App Check.
 *
 * Вынесена отдельно, чтобы её можно было выполнить ДО захвата замка
 * аккаунта — сетевой вызов под замком вешал всю Арену (см. reserveArenaCall).
 * Идемпотентна: повторный вызов ничего не делает.
 */
async function arenaCallBootstrap(): Promise<void> {
  await ensureStableAuthLink().catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
}

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
  await arenaCallBootstrap();
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
  return () => callable({ ...payload, clientVersion })
    .then((result) => result.data as T)
    .catch((error: unknown) => {
      // зачем (аудит 2026-08-29): Арена не писала в app_errors НИЧЕГО — её
      // отказы были видны только если человек сам жал «Сообщить об ошибке».
      // Это общее горло всех callable Арены: одна точка даёт след каждому
      // отказу. Необратимые переходы (вердикт, финиш, расчёт, клейм сезона) —
      // critical (доезжают до Firestore/app_errors, там квота 20/час на
      // человека); остальное — warning (локальный журнал + support-бандл).
      const message = arenaCallableErrorText(error);
      const irreversible = name === 'arenaV2MatchFinish' || name === 'arenaV2MatchSettle'
        || name === 'arenaV2SubmitAnswer' || name === 'arenaV2SubmitSpeedAttempt'
        || name === 'arenaV2SeasonClaim';
      const diagnosticError = new Error(message);
      if (error instanceof Error && error.stack) diagnosticError.stack = error.stack;
      DebugLogger.error(
        `arena:${name}`,
        diagnosticError,
        irreversible ? 'critical' : 'warning',
      );
      throw error;
    });
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

const sharedArenaHomeRead = createArenaHomeRead<ArenaHomeResponse>();
const sharedArenaExpansionRead = createArenaHomeRead<ArenaExpansionHome>();

export async function arenaV2Home(studyTarget: ArenaStudyTarget): Promise<ArenaHomeResponse> {
  const token = captureAccountGeneration();
  return sharedArenaHomeRead(`${token.generation}:${token.stableId}:${studyTarget}`, async () => {
    const response = requireArenaTargetResponse(
      await callArena<ArenaHomeResponse>('arenaV2Home', { studyTarget }),
      studyTarget,
      undefined,
      'arenaV2Home',
    );
    rememberArenaViewerSeat(response.activeMatch?.matchId, response.activeMatchViewerSeat);
    return response;
  });
}

export async function arenaV2FindMatch(studyTarget: ArenaStudyTarget, mode: ArenaQueueMode, requestId: string): Promise<Readonly<{
  ok: true;
  status: 'waiting' | 'matched';
  stableUid: string;
  matchId?: string;
  viewerSeat?: 'a' | 'b';
  queue?: ArenaTicket;
  /** Сколько ЖИВЫХ игроков ищет сейчас, не считая тебя. Ботов в рейтинге нет. */
  searchingNow?: number;
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
}>> {
  const response = requireArenaTargetResponse(await callArena<Readonly<{ ok: true; status: 'waiting' | 'matched'; stableUid: string; matchId?: string; viewerSeat?: 'a' | 'b'; queue?: ArenaTicket; searchingNow?: number; studyTarget: ArenaStudyTarget; publicationFingerprint: string }>>(
    'arenaV2FindMatch', { studyTarget, mode, requestId },
  ), studyTarget);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2QueueCancel = (studyTarget: ArenaStudyTarget, requestId?: string) => callArena<{ ok: true }>(
  'arenaV2QueueCancel',
  requestId ? { studyTarget, requestId } : { studyTarget },
);

export async function arenaV2QuickBotFallback(studyTarget: ArenaStudyTarget, requestId: string): Promise<Readonly<{
  ok: true;
  status: 'matched';
  matchId: string;
  viewerSeat?: 'a' | 'b';
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
}>> {
  const response = requireArenaTargetResponse(await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat?: 'a' | 'b'; studyTarget: ArenaStudyTarget; publicationFingerprint: string }>>(
    'arenaV2QuickBotFallback', { studyTarget, requestId },
  ), studyTarget);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

/** зачем (владелец 2026-08-28): зеркало быстрого фолбэка для рейтинга — тот же
 *  контракт ответа, отдельный callable из-за дневного лимита на сервере. */
export async function arenaV2RankedBotFallback(studyTarget: ArenaStudyTarget, requestId: string): Promise<Readonly<{
  ok: true;
  status: 'matched';
  matchId: string;
  viewerSeat?: 'a' | 'b';
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
}>> {
  const response = requireArenaTargetResponse(await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat?: 'a' | 'b'; studyTarget: ArenaStudyTarget; publicationFingerprint: string }>>(
    'arenaV2RankedBotFallback', { studyTarget, requestId },
  ), studyTarget);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2MatchAccept = (matchId: string, studyTarget: ArenaStudyTarget) => callArena<MatchMutationResponse>('arenaV2MatchAccept', { matchId, studyTarget })
  .then((response) => requireArenaTargetResponse(response, studyTarget));
/**
 * НЕ ВЫЗЫВАЕТСЯ НИ ОДНИМ ЭКРАНОМ, и это осознанно.
 *
 * Матч не предлагают — в него входят: игрок уже нажал «Играть» или принял
 * приглашение друга, поэтому экран матча принимает дуэль сам. Отказаться
 * можно раньше, на уровне приглашения (`arenaV2InviteDecline`), и позже,
 * выходом из матча (`arenaV2Forfeit`). Обёртка оставлена ради серверного
 * договора; если понадобится экран отказа от матча — он уже есть чем.
 */
export const arenaV2MatchDecline = (matchId: string, studyTarget: ArenaStudyTarget) => callArena<MatchMutationResponse>('arenaV2MatchDecline', { matchId, studyTarget })
  .then((response) => requireArenaTargetResponse(response, studyTarget));
export const arenaV2SyncMatch = (matchId: string, studyTarget: ArenaStudyTarget, expectedVersion?: number) => callArena<MatchMutationResponse>(
  'arenaV2SyncMatch',
  expectedVersion === undefined ? { matchId, studyTarget } : { matchId, studyTarget, expectedVersion },
).then((response) => requireArenaTargetResponse(response, studyTarget));
export const arenaV2Forfeit = (matchId: string, studyTarget: ArenaStudyTarget) => callArena<MatchMutationResponse>('arenaV2Forfeit', { matchId, studyTarget })
  .then((response) => requireArenaTargetResponse(response, studyTarget));
/**
 * Снять замок незакрытого матча, который так и не начался.
 *
 * зачем (владелец 2026-08-29): матч, который НЕ СОСТОЯЛСЯ, обязан закрываться
 * сразу. Иначе `activeMatchId` в профиле блокирует любой новый поиск, и Арена
 * перестаёт открываться вовсе. Сервер сам решает, действительно ли матч мёртв,
 * — клиент не может закрыть живую игру этим вызовом.
 */
export const arenaV2ReleaseStaleMatch = (studyTarget: ArenaStudyTarget) => callArena<Readonly<{
  released: boolean;
  matchId?: string;
}>>('arenaV2ReleaseStaleMatch', { studyTarget });

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
  studyTarget: ArenaStudyTarget,
  response: ArenaMatchPlanResponseWire,
): ArenaMatchPlanResponse | null {
  const plan = arenaParseMatchPlan(response?.plan, studyTarget, matchId);
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

export async function arenaV2MatchPlan(matchId: string, studyTarget: ArenaStudyTarget): Promise<ArenaMatchPlanResponse | null> {
  const response = await callArena<ArenaMatchPlanResponseWire>('arenaV2MatchPlan', { matchId, studyTarget });
  return normalizeArenaMatchPlanResponse(matchId, studyTarget, response);
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
  studyTarget: ArenaStudyTarget;
  report: ArenaMatchReportWire;
}>) => callArena<ArenaMatchFinishResponse>('arenaV2MatchFinish', {
  matchId: input.matchId,
  studyTarget: input.studyTarget,
  reportId: input.matchId,
  report: input.report,
}).then((response) => requireArenaTargetResponse(response, input.studyTarget));

async function reserveArenaCall<T>(
  name: string,
  payload: Record<string, unknown>,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<T> | null> {
  const ownerStableUid = account.phase === 'active' ? account.stableId : null;
  if (!ownerStableUid) return null;
  /**
   * Сетевой bootstrap выполняется ДО захвата замка аккаунта.
   *
   * зачем (владелец 2026-09-20, лог `[ARENA-OUTBOX-GUARD] lock timeout
   * waited=5012ms — another holder is stuck`): `prepareArenaCall` внутри
   * делает ДВА сетевых вызова — `ensureStableAuthLink` и App Check. Пока они
   * шли под замком, ВСЕ остальные владельцы замка стояли: очередь
   * `withAccountTransitionLock` ждёт предыдущего БЕЗ таймаута. На моргнувшей
   * сети Арена вставала целиком — проверка отчётов висела в `checking`,
   * кнопки режимов гасли.
   *
   * Замок защищает смену ПОКОЛЕНИЯ аккаунта, а bootstrap поколения не
   * меняет. Под замком остаётся только проверка владельца — локальная и
   * мгновенная.
   */
  await arenaCallBootstrap();
  return arenaReserveAccountDispatch({
    isOwnerCurrent: () => isCurrentAccountGeneration(account, ownerStableUid),
    withTransitionLock: (work) => withAccountTransitionLock(async () => work()),
    prepareDispatch: () => prepareArenaCall<T>(name, payload),
  });
}

export async function arenaV2MatchAcceptDispatch(
  matchId: string,
  studyTarget: ArenaStudyTarget,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse> | null> {
  const dispatch = await reserveArenaCall<MatchMutationResponse>(
    'arenaV2MatchAccept', { matchId, studyTarget }, account,
  );
  return dispatch ? {
    networkPromise: dispatch.networkPromise.then((response) =>
      requireArenaTargetResponse(response, studyTarget)),
  } : null;
}

export async function arenaV2MatchPlanDispatch(
  matchId: string,
  studyTarget: ArenaStudyTarget,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<ArenaMatchPlanResponse | null> | null> {
  const dispatch = await reserveArenaCall<ArenaMatchPlanResponseWire>(
    'arenaV2MatchPlan',
    { matchId, studyTarget },
    account,
  );
  if (!dispatch) return null;
  return {
    networkPromise: dispatch.networkPromise.then((response) =>
      normalizeArenaMatchPlanResponse(matchId, studyTarget, response)),
  };
}

export async function arenaV2SyncMatchDispatch(
  matchId: string,
  studyTarget: ArenaStudyTarget,
  expectedVersion: number | undefined,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse> | null> {
  const dispatch = await reserveArenaCall<MatchMutationResponse>('arenaV2SyncMatch',
    expectedVersion === undefined ? { matchId, studyTarget } : { matchId, studyTarget, expectedVersion },
    account,
  );
  return dispatch ? {
    networkPromise: dispatch.networkPromise.then((response) =>
      requireArenaTargetResponse(response, studyTarget)),
  } : null;
}

/** Creates the native callable promise while the captured account owns the transition lock. */
export async function arenaV2MatchFinishDispatch(
  input: Readonly<{ matchId: string; studyTarget: ArenaStudyTarget; report: ArenaMatchReportWire }>,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<ArenaMatchFinishResponse> | null> {
  const dispatch = await reserveArenaCall<ArenaMatchFinishResponse>('arenaV2MatchFinish', {
    matchId: input.matchId,
    studyTarget: input.studyTarget,
    reportId: input.matchId,
    report: input.report,
  }, account);
  return dispatch ? {
    networkPromise: dispatch.networkPromise.then((response) =>
      requireArenaTargetResponse(response, input.studyTarget)),
  } : null;
}

export async function arenaV2MatchSettleDispatch(
  matchId: string,
  studyTarget: ArenaStudyTarget,
  account: AccountGenerationToken,
): Promise<ArenaNetworkDispatch<MatchMutationResponse & { settled: boolean }> | null> {
  const dispatch = await reserveArenaCall<MatchMutationResponse & { settled: boolean }>('arenaV2MatchSettle', {
    matchId,
    studyTarget,
  }, account);
  return dispatch ? {
    networkPromise: dispatch.networkPromise.then((response) =>
      requireArenaTargetResponse(response, studyTarget)),
  } : null;
}

export const arenaV2MatchSettle = (matchId: string, studyTarget: ArenaStudyTarget) =>
  callArena<MatchMutationResponse & { settled: boolean }>('arenaV2MatchSettle', { matchId, studyTarget })
    .then((response) => requireArenaTargetResponse(response, studyTarget));

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
  studyTarget: ArenaStudyTarget;
  taskIndex: number;
  submissionId: string;
  answer: unknown;
}>) => callArena<MatchMutationResponse & { correct: boolean; points: number }>('arenaV2SubmitAnswer', { ...input })
  .then((response) => requireArenaTargetResponse(response, input.studyTarget));

export const arenaV2SubmitSpeedAttempt = (input: Readonly<{
  matchId: string;
  studyTarget: ArenaStudyTarget;
  taskIndex: number;
  submissionId: string;
  pairIndex: number;
  selectedIndex: number;
}>) => callArena<MatchMutationResponse & { correct: boolean; points: number }>('arenaV2SubmitSpeedAttempt', { ...input })
  .then((response) => requireArenaTargetResponse(response, input.studyTarget));

export const arenaV2InviteCreate = (studyTarget: ArenaStudyTarget, friendStableUid: string, requestId: string) => callArena<Readonly<{
  ok: true;
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
  stableUid: string;
  inviteId: string;
  status: 'pending';
  expiresAtMs: number;
}>>('arenaV2InviteCreate', { studyTarget, friendStableUid, requestId })
  .then((response) => requireArenaTargetResponse(response, studyTarget));

export type ArenaFriendInviteStatus = Readonly<{
  ok: true;
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
  status: 'pending' | 'accepted' | 'matched' | 'declined' | 'cancelled' | 'expired';
  matchId?: string;
  viewerSeat: 'a' | 'b';
  expiresAtMs?: number;
  rendezvousExpiresAtMs?: number;
  counterpartStableUid?: string;
  counterpartName?: string;
  counterpartAvatar?: string;
}>;

export async function arenaV2InviteAccept(studyTarget: ArenaStudyTarget, inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = requireArenaTargetResponse(
    await callArena<ArenaFriendInviteStatus>('arenaV2InviteAccept', { studyTarget, inviteId }),
    studyTarget,
  );
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaV2InviteDecline = (studyTarget: ArenaStudyTarget, inviteId: string) => callArena<{ ok: true }>('arenaV2InviteDecline', { studyTarget, inviteId });
export const arenaV2InviteCancel = (studyTarget: ArenaStudyTarget, inviteId: string) => callArena<{ ok: true }>('arenaV2InviteCancel', { studyTarget, inviteId });
export async function arenaV2InviteReady(studyTarget: ArenaStudyTarget, inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = requireArenaTargetResponse(
    await callArena<ArenaFriendInviteStatus>('arenaV2InviteReady', { studyTarget, inviteId }),
    studyTarget,
  );
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}
export async function arenaV2InviteStatus(studyTarget: ArenaStudyTarget, inviteId: string): Promise<ArenaFriendInviteStatus> {
  const response = requireArenaTargetResponse(
    await callArena<ArenaFriendInviteStatus>('arenaV2InviteStatus', { studyTarget, inviteId }),
    studyTarget,
  );
  if (response.matchId) rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}
export async function arenaV2DevFriendBotCreate(studyTarget: ArenaStudyTarget, requestId: string): Promise<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat: 'a'; acceptedDelayMs: number; studyTarget: ArenaStudyTarget; publicationFingerprint: string }>> {
  const response = requireArenaTargetResponse(await callArena<Readonly<{ ok: true; status: 'matched'; matchId: string; viewerSeat: 'a'; acceptedDelayMs: number; studyTarget: ArenaStudyTarget; publicationFingerprint: string }>>(
    'arenaV2DevFriendBotCreate', { studyTarget, requestId },
  ), studyTarget);
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
export const arenaV2FriendsBoard = async (studyTarget: ArenaStudyTarget) => requireArenaTargetResponse(
  await callArena<Readonly<{
  ok: true;
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
  rows: readonly ArenaFriendsBoardRow[];
  ownRating: number;
  percentileAbove: number | null;
  friendsCount: number;
  truncated: boolean;
  }>>('arenaV2FriendsBoard', { studyTarget }),
  studyTarget,
);

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

export async function arenaExpansionHome(studyTarget: ArenaStudyTarget): Promise<ArenaExpansionHome> {
  const token = captureAccountGeneration();
  return sharedArenaExpansionRead(
    `${token.generation}:${token.stableId}:${studyTarget}`,
    () => readArenaExpansionHome(studyTarget),
  );
}

async function readArenaExpansionHome(studyTarget: ArenaStudyTarget): Promise<ArenaExpansionHome> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId?.trim();
  const response = await callArena<ArenaExpansionHomeWire & Readonly<{
    studyTarget: ArenaStudyTarget;
    publicationFingerprint: string;
  }>>('arenaExpansionHome', { studyTarget });
  requireArenaTargetIdentity(response, studyTarget);
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

export async function arenaTodayStart(studyTarget: ArenaStudyTarget, requestId: string): Promise<ArenaTodayStartResponse> {
  const response = await callArena<ArenaTodayStartResponse>('arenaTodayStart', { studyTarget, requestId });
  requireArenaExpansionMatch(response);
  requireArenaTargetIdentity(response, studyTarget);
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

async function callArenaExpansionMutation(
  name: string,
  studyTarget: ArenaStudyTarget,
  payload: Record<string, unknown>,
): Promise<ArenaExpansionMatchMutation> {
  const response = await callArena<ArenaExpansionMatchMutation>(name, payload);
  requireArenaExpansionMatch(response);
  requireArenaTargetIdentity(response, studyTarget);
  rememberArenaViewerSeat(response.matchId, response.viewerSeat);
  return response;
}

export const arenaTodaySubmitAnswer = (input: Readonly<{
  matchId: string; studyTarget: ArenaStudyTarget; taskIndex: number; submissionId: string; answer: unknown;
}>) => callArenaExpansionMutation('arenaTodaySubmitAnswer', input.studyTarget, { ...input });

export const arenaTodaySubmitSpeedAttempt = (input: Readonly<{
  matchId: string; studyTarget: ArenaStudyTarget; taskIndex: number; submissionId: string; pairIndex: number; selectedIndex: number;
}>) => callArenaExpansionMutation('arenaTodaySubmitSpeedAttempt', input.studyTarget, { ...input });

export const arenaTodaySync = (matchId: string, studyTarget: ArenaStudyTarget, expectedVersion?: number) => callArenaExpansionMutation(
  'arenaTodaySync', studyTarget,
  expectedVersion === undefined ? { matchId, studyTarget } : { matchId, studyTarget, expectedVersion },
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

type ArenaTargetedRivalResponse = ArenaRivalResponse & Readonly<{
  studyTarget: ArenaStudyTarget;
  publicationFingerprint: string;
}>;

export const arenaRivalPropose = (studyTarget: ArenaStudyTarget, sourceMatchId: string, requestId: string) => callArena<ArenaTargetedRivalResponse>(
  'arenaRivalPropose', { studyTarget, sourceMatchId, requestId },
).then((response) => requireArenaTargetResponse(response, studyTarget));
export const arenaRivalAccept = (studyTarget: ArenaStudyTarget, seriesId: string, requestId: string) => callArena<ArenaTargetedRivalResponse>(
  'arenaRivalAccept', { studyTarget, seriesId, requestId },
).then((response) => requireArenaTargetResponse(response, studyTarget));
export const arenaRivalNext = (studyTarget: ArenaStudyTarget, seriesId: string, requestId: string) => callArena<ArenaTargetedRivalResponse>(
  'arenaRivalNext', { studyTarget, seriesId, requestId },
).then((response) => requireArenaTargetResponse(response, studyTarget));
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

export async function arenaStarStore(studyTarget: ArenaStudyTarget): Promise<ArenaStarStoreResponse> {
  const accountToken = captureAccountGeneration();
  const ownerStableId = accountToken.stableId?.trim();
  const response = await callArena<ArenaStarStoreResponse>('arenaStarStore', { studyTarget });
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
export const arenaStarPurchase = (studyTarget: ArenaStudyTarget, itemId: string, catalogVersion: string | undefined, requestId: string) => callArena<ArenaPurchaseResponse>(
  'arenaStarPurchase', { studyTarget, itemId, catalogVersion, requestId },
);
export const arenaStarEquip = (studyTarget: ArenaStudyTarget, itemId: string, slot: string, requestId: string) => callArena<Readonly<{
  ok: true; slot: string; itemId: string;
}>>('arenaStarEquip', { studyTarget, itemId, slot, requestId });

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
  expectedTarget?: ArenaStudyTarget,
): ListenerState<T> {
  const listenerKey = `${ownerScopeKey}:${expectedTarget ?? 'global'}:${collection}:${documentId ?? ''}`;
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
            if (expectedTarget) {
              try {
                requireArenaTargetIdentity(next, expectedTarget);
              } catch (error) {
                valueRef.current = { scope: capturedScope, value: null };
                publish({ value: null, loading: false, error: String(error), fresh: !snapshot.metadata?.fromCache });
                return;
              }
            }
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
  }, [active, collection, documentId, expectedTarget, gate, ownerScopeKey, renderScope]);

  return gate.current(scopedState.scope)
    ? scopedState.state
    : arenaListenerNeutralState<T>(documentId);
}

/** The only queue listener: the signed-in owner's document, never a query. */
export function useArenaQueue(stableUid: string | null, studyTarget: ArenaStudyTarget, active: boolean) {
  return useArenaDocument<ArenaTicket>('arena_v2_queue', stableUid, active, studyTarget, studyTarget);
}

/** Once matched, callers disable useArenaQueue and own exactly this one match listener. */
export function useArenaMatch(matchId: string | null, studyTarget: ArenaStudyTarget, active: boolean, ownerScopeKey = '') {
  return useArenaDocument<ArenaMatch>(
    'arena_v2_matches', matchId, active, `${ownerScopeKey}:${studyTarget}`, studyTarget,
  );
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
export async function arenaFetchMatchHistory(
  studyTarget: ArenaStudyTarget,
  limit = 30,
): Promise<readonly unknown[]> {
  const account = captureAccountGeneration();
  const stableUid = account.phase === 'active' ? account.stableId : null;
  if (!stableUid) throw new Error('arena_history_account_not_ready');
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const snapshot = await firestore()
    .collection('users').doc(stableUid).collection('arena_v2_receipts')
    .where('studyTarget', '==', studyTarget)
    .orderBy('settledAtMs', 'desc')
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))))
    .get();
  // Смена аккаунта во время чтения: чужую историю показывать нельзя, а пустой
  // список тут был бы новым враньём — поэтому отказ, его экран покажет честно.
  if (!isCurrentAccountGeneration(account, stableUid)) throw new Error('arena_history_account_stale');
  return snapshot.docs.map((doc: { data(): unknown }) => {
    const value = doc.data();
    requireArenaTargetIdentity(value, studyTarget);
    return value;
  });
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
  studyTarget: ArenaStudyTarget,
): Promise<readonly unknown[] | null> {
  if (!scope.stableUid || !matchId) return null;
  const firestore = (await import('@react-native-firebase/firestore')).default;
  const ref = firestore()
    .collection('users').doc(scope.stableUid).collection('arena_v2_match_labs').doc(matchId);
  const read = async (): Promise<readonly unknown[] | null> => {
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as { tasks?: unknown } | undefined;
    requireArenaTargetIdentity(data, studyTarget);
    const tasks = data?.tasks;
    return Array.isArray(tasks) ? tasks : [];
  };
  return arenaReadReviewWithRetry(
    read,
    () => new Promise((resolve) => setTimeout(resolve, 900)),
  );
}

/** Host-only friend-duel handoff: observes the owner's opaque active match id. */
export function useArenaProfile(
  stableUid: string | null,
  studyTarget: ArenaStudyTarget,
  active: boolean,
) {
  const documentId = stableUid
    ? studyTarget === 'en'
      ? stableUid
      : `${stableUid}/arena_v2_target_profiles/${studyTarget}`
    : null;
  return useArenaDocument<Readonly<{ activeMatchId?: string | null }>>(
    'arena_v2_profiles', documentId, active, studyTarget,
  );
}

/**
 * Досылает отчёты, застрявшие в очереди.
 *
 * Зовётся с хаба и с экрана результата — то есть в тех двух местах, куда игрок
 * приходит сам. Отдельного расписания намеренно нет: фоновый опрос стоил бы
 * денег за базу каждый день у каждого игрока, а отчёт всё равно ждёт своего
 * часа на диске и никуда не денется.
 */
export async function arenaFlushOutbox(studyTarget: ArenaStudyTarget): Promise<number> {
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId) return 0;
  const scope = { stableUid: account.stableId, accountGeneration: account.generation, studyTarget };
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
        studyTarget: entry.studyTarget,
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
  studyTarget: ArenaStudyTarget,
  account: AccountGenerationToken,
): Promise<ArenaQueuedFinishRetryResult> {
  const stableUid = account.phase === 'active' ? account.stableId : null;
  if (!matchId || !stableUid || !isCurrentAccountGeneration(account, stableUid)) {
    return { status: 'stale' };
  }
  const scope = { stableUid, accountGeneration: account.generation, studyTarget };
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
      studyTarget: entry.studyTarget,
      report: arenaMatchReportToWire(entry.report, entry.rulesVersion),
    }, account),
  });
}

/** Ждёт ли отчёт об этом матче отправки — чтобы экран результата не врал. */
export async function arenaOutboxPending(
  matchId: string | null,
  studyTarget: ArenaStudyTarget,
): Promise<boolean> {
  if (!matchId) return false;
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId) return false;
  const scope = { stableUid: account.stableId, accountGeneration: account.generation, studyTarget };
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
/**
 * Есть ли в локальной очереди отчёты, отвергнутые сервером как «старый клиент».
 *
 * зачем ТРАССИРОВКА и ДЕДЛАЙН (владелец 2026-09-20, «они серые они не
 * нажимаются»): эта проверка зависала НАВСЕГДА — во всех строках лога за 17
 * минут `reportGuard=checking`, ни одного `clear`. Пока она висела, хаб
 * считал данные неизвестными и гасил все кнопки режимов.
 *
 * Причин молчания было две, и обе запрещены правилами проекта:
 *  • немой `catch { return false }` — ни шага, ни причины;
 *  • `withAccountTransitionLock` ждёт предыдущего владельца БЕЗ таймаута
 *    (`account_generation.ts:184`), а таких вызовов в проекте 231 — угадать
 *    держателя невозможно.
 *
 * Теперь каждый шаг называет себя, а ожидание замка ограничено. Не захватили
 * — отвечаем «блокировки не нашли»: гвард запрещает игру только при
 * ПОЛОЖИТЕЛЬНОМ ответе, неизвестность не запрещает ничего.
 */
const ARENA_OUTBOX_GUARD_LOCK_TIMEOUT_MS = 5_000;

export async function arenaOutboxBlockedByUpdate(studyTarget: ArenaStudyTarget): Promise<boolean> {
  const startedAt = Date.now();
  try {
    const account = captureAccountGeneration();
    if (account.phase !== 'active' || !account.stableId) {
      DebugLogger.info('arena_client',
        `[ARENA-OUTBOX-GUARD] skip target=${studyTarget} phase=${account.phase} `
        + `stableId=${account.stableId ? 'present' : 'missing'}`);
      return false;
    }
    const scope = { stableUid: account.stableId, accountGeneration: account.generation, studyTarget };
    const lock = await withAccountTransitionLockWithDeadline(async () => {
      if (!isCurrentAccountGeneration(account, scope.stableUid)) return false;
      await arenaOutboxAdoptOwnerGeneration(AsyncStorage as unknown as ArenaKeyValueStore, scope);
      return isCurrentAccountGeneration(account, scope.stableUid);
    }, ARENA_OUTBOX_GUARD_LOCK_TIMEOUT_MS);
    if (!lock.completed) {
      DebugLogger.warn('arena_client',
        `[ARENA-OUTBOX-GUARD] lock timeout target=${studyTarget} `
        + `waited=${Date.now() - startedAt}ms — another holder is stuck`);
      return false;
    }
    if (!lock.value) {
      DebugLogger.info('arena_client',
        `[ARENA-OUTBOX-GUARD] account changed target=${studyTarget} `
        + `took=${Date.now() - startedAt}ms`);
      return false;
    }
    const rows = await arenaOutboxList(AsyncStorage as unknown as ArenaKeyValueStore, scope);
    const blocked = arenaOutboxHasGated(rows);
    DebugLogger.info('arena_client',
      `[ARENA-OUTBOX-GUARD] done target=${studyTarget} rows=${rows.length} `
      + `blocked=${blocked} took=${Date.now() - startedAt}ms`);
    return blocked;
  } catch (error) {
    // Немой catch запрещён: молчание этой ветки и держало кнопки мёртвыми.
    DebugLogger.warn('arena_client',
      `[ARENA-OUTBOX-GUARD] failed target=${studyTarget} `
      + `took=${Date.now() - startedAt}ms: ${String(error)}`);
    return false;
  }
}

export default function ArenaClientRouteShim() { return null; }
