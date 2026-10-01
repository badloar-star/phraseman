import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as Crypto from 'expo-crypto';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { commitConfirmedExternalShardEvent, wasConfirmedExternalShardEventApplied } from '../shards_system';
import { getStableId } from '../stable_id';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../account_generation';
import { DebugLogger, reportSwallowed } from '../debug-logger'; // зачем: PM-229-A1 — немые catch пишут причину

export const EXTERNAL_ECONOMY_EVENT_APPLIED_PREFIX = 'external_economy_event_applied_v1:';
// зачем: Firebase-экономия (PM-210). Раньше КАЖДЫЙ старт читал
// users/{uid}/external_economy_events С НАЧАЛА страницами по 100 — давний аккаунт
// платил чтением всей истории событий на каждом запуске. Теперь храним курсор
// «до сюда всё применено» (account-local, стирается/переезжает с аккаунтом —
// см. ACCOUNT_LOCAL_KEY_PREFIXES в app/cloud_sync.ts) и читаем только хвост.
// Нет курсора / курсор не сходится с журналом / пора сверки — прежнее полное чтение.
export const EXTERNAL_ECONOMY_EVENT_CURSOR_PREFIX = 'external_economy_event_cursor_v1:';
// Сервер ставит createdAtMs = nowMs ДО коммита транзакции (ретраи, пачки выплат),
// поэтому событие с чуть меньшей меткой может появиться позже соседнего. Хвост
// перечитываем с запасом в 1 ч — повтор безопасен: применение идемпотентно (маркер +
// журнал операций).
export const EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS = 60 * 60 * 1000;
// Страховочная полная сверка раз в 30 дней: дешёвая (раз в месяц) и чинит любой
// пропуск, который не поймал запас выше.
export const EXTERNAL_ECONOMY_EVENT_FULL_RESCAN_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EVENTS_PER_SYNC = 100;
const LOG = '[STARTUP-READS]';

export type ExternalEconomyEventCursor = Readonly<{
  schemaVersion: 'external-economy-event-cursor.v1';
  ownerStableId: string;
  /** createdAtMs последнего события, до которого ВСЁ подряд обработано. */
  createdAtMs: number;
  /** Последнее реально применённое событие — по нему сверяем курсор с журналом. */
  anchor: Readonly<{ source: string; eventId: string }> | null;
  fullScanAtMs: number;
  savedAtMs: number;
}>;

export function externalEconomyEventCursorKey(ownerStableId: string): string {
  return `${EXTERNAL_ECONOMY_EVENT_CURSOR_PREFIX}${encodeURIComponent(ownerStableId)}`;
}

function parseCursor(raw: string | null, ownerStableId: string): ExternalEconomyEventCursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExternalEconomyEventCursor> | null;
    if (
      !value || value.schemaVersion !== 'external-economy-event-cursor.v1'
      || value.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(value.createdAtMs) || Number(value.createdAtMs) <= 0
      || !Number.isSafeInteger(value.fullScanAtMs) || Number(value.fullScanAtMs) <= 0
      || !Number.isSafeInteger(value.savedAtMs) || Number(value.savedAtMs) <= 0
    ) return null;
    const anchor = value.anchor;
    if (anchor !== null && (
      !anchor || typeof anchor.source !== 'string' || !anchor.source
      || typeof anchor.eventId !== 'string' || !anchor.eventId
    )) return null;
    return value as ExternalEconomyEventCursor;
  } catch (error) {
    reportSwallowed('external_shard_event_sync:parseCursor', error);
    return null;
  }
}

type CursorDecision =
  | Readonly<{ mode: 'tail'; cursor: ExternalEconomyEventCursor; sinceMs: number }>
  | Readonly<{ mode: 'full'; reason: string }>;

async function decideCursor(ownerStableId: string, nowMs: number): Promise<CursorDecision> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(externalEconomyEventCursorKey(ownerStableId));
  } catch (error) {
    reportSwallowed('external_shard_event_sync:readCursor', error);
    return { mode: 'full', reason: 'cursor_read_failed' };
  }
  if (!raw) return { mode: 'full', reason: 'no_cursor' };
  const cursor = parseCursor(raw, ownerStableId);
  if (!cursor) return { mode: 'full', reason: 'cursor_invalid' };
  if (nowMs < cursor.fullScanAtMs) return { mode: 'full', reason: 'clock_skew' };
  if (nowMs - cursor.fullScanAtMs >= EXTERNAL_ECONOMY_EVENT_FULL_RESCAN_MS) {
    return { mode: 'full', reason: 'periodic_rescan' };
  }
  if (cursor.anchor) {
    // Курсор приехал без журнала (восстановление копии, ручная чистка) — не верим ему.
    const anchorApplied = await wasConfirmedExternalShardEventApplied(
      ownerStableId, cursor.anchor.source, cursor.anchor.eventId,
    ).catch((error: unknown) => {
      reportSwallowed('external_shard_event_sync:anchorCheck', error);
      return false;
    });
    if (!anchorApplied) return { mode: 'full', reason: 'anchor_not_in_journal' };
  }
  return {
    mode: 'tail',
    cursor,
    sinceMs: Math.max(0, cursor.createdAtMs - EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS),
  };
}

export type ExternalEconomyEvent = Readonly<{
  schemaVersion: 'external-economy-event.v1';
  source: string;
  eventId: string;
  ownerStableId: string;
  delta: number;
  reason: string;
  kind: string;
  subjectId: string;
  payload: Record<string, unknown>;
  createdAtMs: number;
}>; 

function parseEvent(value: unknown, ownerStableId: string): ExternalEconomyEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Partial<ExternalEconomyEvent>;
  if (
    event.schemaVersion !== 'external-economy-event.v1'
    || event.ownerStableId !== ownerStableId
    || typeof event.source !== 'string' || event.source.length === 0 || event.source.length > 64
    || typeof event.eventId !== 'string' || event.eventId.length === 0 || event.eventId.length > 512
    || !Number.isSafeInteger(event.delta) || event.delta === 0
    || typeof event.reason !== 'string' || event.reason.length === 0 || event.reason.length > 64
    || typeof event.kind !== 'string' || event.kind.length === 0 || event.kind.length > 160
    || typeof event.subjectId !== 'string' || event.subjectId.length === 0 || event.subjectId.length > 160
    || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)
    || !Number.isSafeInteger(event.createdAtMs) || Number(event.createdAtMs) <= 0
  ) return null;
  return event as ExternalEconomyEvent;
}

async function appliedKey(ownerStableId: string, source: string, eventId: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${source}:${eventId}`,
  );
  return `${EXTERNAL_ECONOMY_EVENT_APPLIED_PREFIX}${encodeURIComponent(ownerStableId)}:${hash}`;
}

/**
 * Pull immutable outside-world facts into the local wallet. The server sends
 * facts only; it never sends a balance and cannot reject or reverse a local
 * purchase result. Refunds may create ledger debt: UI remains clamped to zero,
 * future credits repay it, and no already-delivered result is revoked.
 */
export async function syncConfirmedExternalShardEventsFromCloud(): Promise<{
  applied: number;
  skipped: number;
  invalid: number;
}> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return { applied: 0, skipped: 0, invalid: 0 };
  const ownerStableId = String(await getStableId()).trim();
  if (!ownerStableId) return { applied: 0, skipped: 0, invalid: 0 };
  const accountToken = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(accountToken, ownerStableId);
  if (!isCurrent()) return { applied: 0, skipped: 0, invalid: 0 };

  const cloudSync = await import('../cloud_sync');
  const authStableId = await cloudSync.ensureAnonUser().catch((swallowedError: unknown) => { reportSwallowed('external_shard_event_sync:syncConfirmedExternalShardEventsFromCloud', swallowedError); return null; });
  if (authStableId !== ownerStableId) return { applied: 0, skipped: 0, invalid: 0 };
  const linked = await cloudSync.ensureStableAuthLinkForStableId(ownerStableId).catch((swallowedError: unknown) => { reportSwallowed('external_shard_event_sync:syncConfirmedExternalShardEventsFromCloud#2', swallowedError); return false; });
  if (!linked) return { applied: 0, skipped: 0, invalid: 0 };

  let applied = 0;
  let skipped = 0;
  let invalid = 0;
  let cursor: any = null;
  const startedAtMs = Date.now();
  const decision = await decideCursor(ownerStableId, startedAtMs);
  if (!isCurrent()) {
    DebugLogger.info(LOG, 'external_events: account changed before read -> stop');
    return { applied: 0, skipped: 0, invalid: 0 };
  }
  DebugLogger.info(LOG, decision.mode === 'tail'
    ? `external_events: tail read since=${decision.sinceMs} (cursorAt=${decision.cursor.createdAtMs}, overlapMs=${EXTERNAL_ECONOMY_EVENT_CURSOR_OVERLAP_MS})`
    : `external_events: full read (reason=${decision.reason})`);
  // Продвигаем курсор только по НЕПРЕРЫВНОМУ префиксу обработанных событий: первое
  // неприменённое событие замораживает его, и следующий старт перечитает с него.
  let frontierMs: number | null = decision.mode === 'tail' ? decision.cursor.createdAtMs : null;
  let anchor: ExternalEconomyEventCursor['anchor'] = decision.mode === 'tail' ? decision.cursor.anchor : null;
  let frontierBlocked = false;
  let docsRead = 0;
  let completed = false;
  const advance = (createdAtMs: number, nextAnchor?: ExternalEconomyEventCursor['anchor']): void => {
    if (frontierBlocked) return;
    if (frontierMs === null || createdAtMs > frontierMs) frontierMs = createdAtMs;
    if (nextAnchor) anchor = nextAnchor;
  };
  const block = (why: string): void => {
    if (!frontierBlocked) DebugLogger.info(LOG, `external_events: cursor frozen (${why})`);
    frontierBlocked = true;
  };
  while (isCurrent()) {
    let query: any = firestore()
      .collection('users')
      .doc(ownerStableId)
      .collection('external_economy_events');
    if (decision.mode === 'tail') query = query.where('createdAtMs', '>=', decision.sinceMs);
    query = query
      .orderBy('createdAtMs', 'asc')
      .orderBy(firestore.FieldPath.documentId(), 'asc')
      .limit(MAX_EVENTS_PER_SYNC);
    if (cursor) query = query.startAfter(cursor);
    let snapshot: any;
    try {
      snapshot = await query.get();
    } catch (error) {
      DebugLogger.warn(LOG, `external_events: query failed mode=${decision.mode} after ${docsRead} docs: ${String(error)}`);
      throw error;
    }
    docsRead += snapshot.docs.length;
    if (!isCurrent()) break;
    if (snapshot.docs.length === 0) { completed = true; break; }
    for (const document of snapshot.docs) {
      if (!isCurrent()) break;
      const rawData = document.data();
      const event = parseEvent(rawData, ownerStableId);
      if (!event) {
        invalid += 1;
        // Битое событие не станет валидным само — курсор его проходит (как и раньше,
        // оно просто считалось invalid), но только если у него есть метка времени.
        const rawCreatedAt = Number((rawData as { createdAtMs?: unknown } | undefined)?.createdAtMs);
        if (Number.isSafeInteger(rawCreatedAt) && rawCreatedAt > 0) advance(rawCreatedAt);
        else block('invalid_event_without_time');
        continue;
      }
      const markerKey = await appliedKey(ownerStableId, event.source, event.eventId);
      const markerExists = await AsyncStorage.getItem(markerKey) !== null;
      const operationExists = await wasConfirmedExternalShardEventApplied(
        ownerStableId,
        event.source,
        event.eventId,
      );
      if (markerExists && operationExists) {
        skipped += 1;
        advance(event.createdAtMs, { source: event.source, eventId: event.eventId });
        continue;
      }
      if (markerExists && !operationExists) await AsyncStorage.removeItem(markerKey);

      const result = await commitConfirmedExternalShardEvent({
        expectedOwnerStableId: ownerStableId,
        source: event.source,
        eventId: event.eventId,
        delta: event.delta,
        reason: event.reason,
        grant: {
          kind: event.kind,
          subjectId: event.subjectId,
          payload: event.payload,
        },
      });
      if (result.status !== 'applied' && result.status !== 'already-applied') {
        block(`commit_status=${result.status}`);
        continue;
      }
      if (!isCurrent()) break;
      if (event.source === 'report_reply' && event.kind === 'confirmed_report_reward_bundle') {
        try {
          const { applyConfirmedReportRewardBundleExtrasFromEvent } = await import('../report_reward_bundle');
          await applyConfirmedReportRewardBundleExtrasFromEvent(
            event.eventId,
            event.payload.rewardBundle,
            ownerStableId,
          );
        } catch (error) {
          // The pearl operation above is idempotent. Leave the marker absent so
          // the exact rune/spin grants are retried after interruption.
          reportSwallowed('external_shard_event_sync:reportRewardExtras', error);
          block('report_reward_extras_failed');
          continue;
        }
      }
      if (!isCurrent()) break;
      await AsyncStorage.setItem(markerKey, JSON.stringify({
        status: result.status,
        requestedDelta: event.delta,
        effectiveDelta: event.delta,
        operationId: result.operation.operationId,
        appliedAtMs: Date.now(),
      }));
      applied += 1;
      advance(event.createdAtMs, { source: event.source, eventId: event.eventId });
    }
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < MAX_EVENTS_PER_SYNC) { completed = true; break; }
  }
  await saveCursorAfterSync({
    ownerStableId, isCurrent, completed, frontierMs, anchor, decision, startedAtMs,
  });
  DebugLogger.info(LOG, `external_events: done mode=${decision.mode} docsRead=${docsRead} applied=${applied} skipped=${skipped} invalid=${invalid} completed=${completed} frozen=${frontierBlocked}`);
  return { applied, skipped, invalid };
}

async function saveCursorAfterSync(input: Readonly<{
  ownerStableId: string;
  isCurrent: () => boolean;
  completed: boolean;
  frontierMs: number | null;
  anchor: ExternalEconomyEventCursor['anchor'];
  decision: CursorDecision;
  startedAtMs: number;
}>): Promise<void> {
  const { ownerStableId, isCurrent, completed, frontierMs, anchor, decision, startedAtMs } = input;
  // Прерванный проход (смена аккаунта) курсор не трогает: прогресс не подтверждён.
  if (!completed || !isCurrent()) {
    DebugLogger.info(LOG, `external_events: cursor not saved (completed=${completed}, current=${isCurrent()})`);
    return;
  }
  if (frontierMs === null) {
    DebugLogger.info(LOG, 'external_events: cursor not saved (no events yet)');
    return;
  }
  const next: ExternalEconomyEventCursor = {
    schemaVersion: 'external-economy-event-cursor.v1',
    ownerStableId,
    createdAtMs: frontierMs,
    anchor,
    // Полная сверка обновляет метку; хвостовой проход её сохраняет.
    fullScanAtMs: decision.mode === 'full' ? startedAtMs : decision.cursor.fullScanAtMs,
    savedAtMs: Date.now(),
  };
  try {
    await AsyncStorage.setItem(externalEconomyEventCursorKey(ownerStableId), JSON.stringify(next));
  } catch (error) {
    reportSwallowed('external_shard_event_sync:saveCursor', error);
  }
}

export async function listConfirmedRevenueCatPurchaseEventsFromCloud(
  ownerStableId: string,
): Promise<readonly ExternalEconomyEvent[]> {
  const owner = String(ownerStableId ?? '').trim();
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO || !owner || String(await getStableId()).trim() !== owner) return [];
  const accountToken = captureAccountGeneration();
  if (!isCurrentAccountGeneration(accountToken, owner)) return [];
  const snapshot = await firestore()
    .collection('users')
    .doc(owner)
    .collection('external_economy_events')
    .where('source', '==', 'revenuecat_purchase')
    .limit(200)
    .get();
  if (!isCurrentAccountGeneration(accountToken, owner)) return [];
  return snapshot.docs
    .map((document) => parseEvent(document.data(), owner))
    .filter((event): event is ExternalEconomyEvent => event !== null);
}
