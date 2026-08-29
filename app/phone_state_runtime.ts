import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import * as Crypto from 'expo-crypto';

import { getLevelFromXP } from '../constants/theme';
import { openPhoneStateDatabase } from '../modules/phone-state/database';
import { migratePhoneStateSchema } from '../modules/phone-state/schema';
import { createReducerRegistry, type DomainReducer } from '../modules/phone-state/reducer_registry';
import {
  createPhoneStateStore,
  type PhoneStateStore,
  type PhoneStateStoreDatabase,
  type PhoneStateSqlValue,
  type PhoneStateStoreTransaction,
} from '../modules/phone-state/store';
import { createPersonalProgressReducer } from '../modules/phone-state/domains/progress_reducer';
import { createProgressRegistersReducer } from '../modules/phone-state/domains/progress_registers';
import { createPreferencesReducer } from '../modules/phone-state/domains/preferences';
import { createCardsReducer } from '../modules/phone-state/domains/cards';
import { createPracticeReducer } from '../modules/phone-state/domains/practice';
import { createEconomyReducer } from '../modules/phone-state/domains/economy';
import { createLearningV2Reducer } from '../modules/phone-state/domains/learning_v2';
import { configurePhoneStateLearningV2Bridge } from '../modules/phone-state/learning_v2_runtime_bridge';
import {
  createPersonalProgressApi,
  type PersonalProgressJournal,
} from '../modules/phone-state/domains/progress_api';
import {
  emptyPersonalProgressState,
  type PersonalProgressCommand,
  type PersonalProgressProjection,
  type PersonalProgressState,
} from '../modules/phone-state/domains/progress_projection';
import type { PersonalOperation, PendingPersonalOperation } from '../modules/phone-state/contracts';
import { operationFingerprint } from '../modules/phone-state/canonical';
import { createPhoneStateFirestoreRepository } from '../modules/phone-state/firestore_repository';
import { createPhoneStateSyncEngine } from '../modules/phone-state/sync_engine';
import { createPhoneStateSyncCoordinator, type SyncTriggerReason } from '../modules/phone-state/sync_coordinator';
import {
  createPhoneStateSqliteRetryStore,
  createPhoneStateSqliteSyncRepository,
} from '../modules/phone-state/sqlite_sync_repository';
import {
  configurePhoneStateBootstrapRuntime,
  defaultPhoneStateBootstrapDependencies,
  type PhoneStateBootstrapSession,
} from './phone_state_bootstrap';
import {
  configurePhoneStateHealthStorage,
  createPhoneStateHealthSqlStorage,
  getPhoneStateHealthSnapshot,
  recordPhoneStateHealthMetrics,
} from './phone_state_health';
import {
  configurePhoneStateProgressCutover,
  isPhoneStateCutoverEnabled,
} from './phone_state_progress_cutover';
import { configurePhoneStateCardsBridge } from './phone_state_cards_bridge';
import { configurePhoneStateShadowRuntime } from './phone_state_shadow_adapters';
import { configurePhoneStateSyncLifecycleRuntime } from './phone_state_sync_lifecycle';
import { getRemoteBool } from './remote_flags';
import { configurePhoneStatePreferenceBridge } from './phone_state_preference_bridge';
import { configurePhoneStatePracticeBridge } from './phone_state_practice_bridge';
import {
  commitPhoneStateCustomizationSelection,
  configurePhoneStateEconomyBridge,
  phoneStateEconomyCompositeFromLegacy,
} from './phone_state_economy_bridge';
import { drainCustomizationSelectionOutbox } from './customization_selection_journal';
import {
  backfillClientShardPhoneStateOutbox,
  drainClientShardPhoneStateOutbox,
} from './economy/client_shard_operation_ledger';
import { configurePhoneStateBackgroundSyncBridge } from './phone_state_background_sync_bridge';
import { configurePhoneStateProgressRegisterBridge } from './phone_state_progress_register_bridge';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
let installed = false;

type RuntimeSession = PhoneStateBootstrapSession & Readonly<{
  database: Awaited<ReturnType<typeof openPhoneStateDatabase>>;
  localDatabase: PhoneStateStoreDatabase;
  store: PhoneStateStore;
  deviceId: string;
  registry: ReturnType<typeof createReducerRegistry>;
  setSyncTrigger(trigger: ((reason: SyncTriggerReason) => void) | null): void;
  triggerSync(reason: SyncTriggerReason): void;
}>;

type OpaqueState = Readonly<{ appliedOperationIds: readonly string[] }>;

function opaqueReducer(domain: string): DomainReducer<OpaqueState> {
  return Object.freeze({
    domain,
    version: 1,
    initial: () => Object.freeze({ appliedOperationIds: Object.freeze([]) }),
    apply: (state, operation) => Object.freeze({
      appliedOperationIds: Object.freeze(
        [...new Set([...state.appliedOperationIds, operation.operationId])]
          .sort((left, right) => left.localeCompare(right)),
      ),
    }),
    validate: (value: unknown): value is OpaqueState => (
      value !== null
      && typeof value === 'object'
      && Array.isArray((value as OpaqueState).appliedOperationIds)
      && (value as OpaqueState).appliedOperationIds.every((id) => typeof id === 'string')
    ),
  });
}

function positiveNumber(raw: string | null): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function stringArray(raw: string | null): readonly string[] {
  if (!raw) return Object.freeze([]);
  try {
    const value: unknown = JSON.parse(raw);
    return Object.freeze(Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
        .sort((left, right) => left.localeCompare(right))
      : []);
  } catch {
    return Object.freeze([]);
  }
}

async function ensureDeviceId(database: RuntimeSession['database']): Promise<string> {
  const existing = await database.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM device_state WHERE singleton = 1 LIMIT 1;',
  );
  if (existing && DEVICE_ID_PATTERN.test(existing.device_id)) return existing.device_id;
  const deviceId = `device_${Crypto.randomUUID().replace(/-/g, '')}`;
  await database.runAsync(
    'INSERT OR IGNORE INTO device_state (singleton, device_id, next_sequence, hybrid_counter) VALUES (1, ?, 1, 0);',
    deviceId,
  );
  const persisted = await database.getFirstAsync<{ device_id: string }>(
    'SELECT device_id FROM device_state WHERE singleton = 1 LIMIT 1;',
  );
  if (!persisted || !DEVICE_ID_PATTERN.test(persisted.device_id)) {
    throw new Error('phone_state_device_id_invalid');
  }
  return persisted.device_id;
}

function adaptExpoSqliteDatabase(
  database: Awaited<ReturnType<typeof openPhoneStateDatabase>>,
): PhoneStateStoreDatabase {
  const transaction = (value: unknown): PhoneStateStoreTransaction => value as PhoneStateStoreTransaction;
  const adapted: PhoneStateStoreDatabase = {
    getFirstAsync: <T,>(sql: string, ...params: PhoneStateSqlValue[]) => (
      database.getFirstAsync<T>(sql, ...params)
    ),
    getAllAsync: <T,>(sql: string, ...params: PhoneStateSqlValue[]) => (
      database.getAllAsync<T>(sql, ...params)
    ),
    runAsync: (sql: string, ...params: PhoneStateSqlValue[]) => database.runAsync(sql, ...params),
    withExclusiveTransactionAsync: async <T,>(
      task: (tx: PhoneStateStoreTransaction) => Promise<T>,
    ): Promise<T> => {
      let settled = false;
      let result!: T;
      await database.withExclusiveTransactionAsync(async (tx) => {
        result = await task(transaction(tx));
        settled = true;
      });
      if (!settled) throw new Error('phone_state_transaction_incomplete');
      return result;
    },
  };
  return Object.freeze(adapted);
}

function progressJournal(session: RuntimeSession): PersonalProgressJournal {
  const projectionFromState = (state: unknown): PersonalProgressProjection => {
    const candidate = state as PersonalProgressState | undefined;
    return candidate?.projection ?? emptyPersonalProgressState().projection;
  };
  return Object.freeze({
    commit: async (command: PersonalProgressCommand) => {
      const pending: PendingPersonalOperation = Object.freeze({
        schemaVersion: 1,
        stableUid: session.context.stableUid,
        accountGeneration: session.context.lineage,
        deviceId: session.deviceId,
        domain: 'progress',
        kind: command.kind,
        entityId: command.eventId,
        payload: command,
        exactResult: 'exactResult' in command ? command.exactResult : Object.freeze({ imported: true }),
        createdAtMs: Date.now(),
      });
      const result = await session.store.commit(pending, { idempotencyKey: command.eventId });
      if (command.kind === 'complete_lesson' || command.kind === 'complete_exam') {
        session.triggerSync('sealed_segment');
      }
      return Object.freeze({
        projection: projectionFromState(result.projection.state),
        duplicate: result.duplicate,
      });
    },
    read: async () => {
      const projection = await session.store.readProjection('progress');
      return projectionFromState(projection?.state);
    },
  });
}

async function importCoreProgressOnce(session: RuntimeSession): Promise<void> {
  if (await session.store.readProjection('progress')) return;
  const rows = new Map(await AsyncStorage.multiGet([
    'user_total_xp',
    'weekly_xp',
    'streak_count',
    'streak_last_date',
    'unlocked_lessons',
  ]));
  const lastDate = rows.get('streak_last_date');
  const projection: PersonalProgressProjection = Object.freeze({
    totalXp: positiveNumber(rows.get('user_total_xp') ?? null),
    level: 1,
    weeklyXp: positiveNumber(rows.get('weekly_xp') ?? null),
    activityDates: Object.freeze(
      typeof lastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(lastDate) ? [lastDate] : [],
    ),
    streakCount: positiveNumber(rows.get('streak_count') ?? null),
    completedLessons: Object.freeze([]),
    passedExams: Object.freeze([]),
    unlockedLessons: stringArray(rows.get('unlocked_lessons') ?? null),
    bestResults: Object.freeze({}),
  });
  const journal = progressJournal(session);
  await journal.commit(Object.freeze({
    kind: 'opening_import',
    eventId: 'phone-state-opening-progress-v1',
    projection,
  }));
}

async function importProgressRegistersOnce(session: RuntimeSession): Promise<void> {
  if (await session.store.readProjection('progress_registers')) return;
  const keys = ['login_bonus_v1', 'onboarding_done', 'onboarding_step'] as const;
  const rows = await AsyncStorage.multiGet(keys);
  for (const [key, value] of rows) {
    if (value === null || value.length > 48 * 1024) continue;
    await session.store.commit(Object.freeze({
      schemaVersion: 1,
      stableUid: session.context.stableUid,
      accountGeneration: session.context.lineage,
      deviceId: session.deviceId,
      domain: 'progress_registers',
      kind: 'set_field',
      entityId: key,
      payload: Object.freeze({ field: key, value }),
      exactResult: Object.freeze({ imported: true, value }),
      createdAtMs: Date.now(),
    }), { idempotencyKey: `progress-register:opening:${key}:v1` });
  }
}

async function importLegacyEconomyOnce(session: RuntimeSession): Promise<void> {
  if (await session.store.readProjection('economy')) return;
  const ledger = await import('./economy/client_shard_operation_ledger');
  const openingBalance = await ledger.readClientShardLedgerOpeningBalance(session.context.stableUid);
  if (openingBalance !== null) {
    await session.store.commit(Object.freeze({
      schemaVersion: 1,
      stableUid: session.context.stableUid,
      accountGeneration: session.context.lineage,
      deviceId: session.deviceId,
      domain: 'economy',
      kind: 'opening_balance',
      entityId: 'opening:v1',
      payload: Object.freeze({ balance: openingBalance }),
      exactResult: Object.freeze({ openingBalance }),
      createdAtMs: Date.now(),
    }), { idempotencyKey: 'economy:opening:v1' });
  }
  // One bounded migration scan only. Ongoing synchronization never scans
  // AsyncStorage history; it uses PhoneState sealed segments and cursors.
  const allKeys = await AsyncStorage.getAllKeys();
  if (allKeys.length > 16_384) throw new Error('phone_state_economy_opening_scan_too_large');
  const prefix = `${ledger.CLIENT_SHARD_OPERATION_PREFIX}${encodeURIComponent(session.context.stableUid)}:`;
  const operationIds = allKeys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)).sort();
  if (operationIds.length > 4_096) throw new Error('phone_state_economy_opening_history_too_large');
  for (const operationId of operationIds) {
    const operation = await ledger.readStoredClientShardOperation(session.context.stableUid, operationId);
    if (!operation || operation.authority !== 'client') continue;
    const composite = phoneStateEconomyCompositeFromLegacy(operation);
    await session.store.commit(Object.freeze({
      schemaVersion: 1,
      stableUid: session.context.stableUid,
      accountGeneration: session.context.lineage,
      deviceId: session.deviceId,
      domain: 'economy',
      kind: 'composite',
      entityId: operation.operationId,
      payload: composite,
      exactResult: composite.grant,
      createdAtMs: operation.createdAtMs,
    }), { idempotencyKey: `economy:${operation.operationId}` });
  }
}

async function openRuntimeSession(
  context: RuntimeSession['context'],
): Promise<RuntimeSession> {
  const database = await openPhoneStateDatabase({
    stableUid: context.stableUid,
    accountGeneration: context.lineage,
  });
  try {
    await migratePhoneStateSchema(database);
    const deviceId = await ensureDeviceId(database);
    const localDatabase = adaptExpoSqliteDatabase(database);
    const registry = createReducerRegistry([
      createPersonalProgressReducer(getLevelFromXP),
      createProgressRegistersReducer(),
      createPreferencesReducer(),
      createCardsReducer(),
      createPracticeReducer(),
      createEconomyReducer(),
      createLearningV2Reducer(),
      opaqueReducer('xp'),
      opaqueReducer('lesson_completion'),
      opaqueReducer('exam_completion'),
    ] as const);
    const store = createPhoneStateStore({ database: localDatabase, registry });
    let closed = false;
    let syncTrigger: ((reason: SyncTriggerReason) => void) | null = null;
    const session: RuntimeSession = {
      context,
      database,
      localDatabase,
      store,
      deviceId,
      registry,
      setSyncTrigger: (trigger) => { syncTrigger = trigger; },
      triggerSync: (reason) => { syncTrigger?.(reason); },
      close: async () => {
        if (closed) return;
        closed = true;
        configurePhoneStateShadowRuntime(null);
        configurePhoneStatePreferenceBridge(null);
        configurePhoneStateCardsBridge(null);
        configurePhoneStatePracticeBridge(null);
        configurePhoneStateEconomyBridge(null);
        configurePhoneStateLearningV2Bridge(null);
        configurePhoneStateBackgroundSyncBridge(null);
        configurePhoneStateProgressRegisterBridge(null);
        configurePhoneStateProgressCutover(null);
        configurePhoneStateSyncLifecycleRuntime(null);
        syncTrigger = null;
        await configurePhoneStateHealthStorage(null);
        await database.closeAsync();
      },
    };
    return Object.freeze(session);
  } catch (error) {
    await database.closeAsync().catch(() => undefined);
    throw error;
  }
}

export function installPhoneStateProductionRuntime(): void {
  if (installed) return;
  installed = true;
  configurePhoneStateBootstrapRuntime({
    ...defaultPhoneStateBootstrapDependencies,
    openAccount: openRuntimeSession,
    importLegacy: async (baseSession) => {
      await importCoreProgressOnce(baseSession as RuntimeSession);
      await importProgressRegistersOnce(baseSession as RuntimeSession);
      await importLegacyEconomyOnce(baseSession as RuntimeSession);
    },
    compareShadow: async () => undefined,
    installDormantSync: async (baseSession) => {
      const session = baseSession as RuntimeSession;
      await configurePhoneStateHealthStorage(createPhoneStateHealthSqlStorage(session.localDatabase));
      const api = createPersonalProgressApi({ journal: progressJournal(session) });
      configurePhoneStateProgressCutover(api);
      const scope = {
        stableUid: session.context.stableUid,
        accountGeneration: session.context.lineage,
      };
      configurePhoneStateShadowRuntime({
        scope: () => ({
          stableUid: session.context.stableUid,
          accountGeneration: session.context.lineage,
          deviceId: session.deviceId,
        }),
        append: async ({ operation, idempotencyKey }) => {
          const result = await session.store.commit(operation, { idempotencyKey });
          return Object.freeze({ duplicate: result.duplicate });
        },
      });
      configurePhoneStatePreferenceBridge({
        scope,
        deviceId: session.deviceId,
        store: session.store,
      });
      configurePhoneStateProgressRegisterBridge({
        scope,
        deviceId: session.deviceId,
        store: session.store,
        triggerSync: () => session.triggerSync('sealed_segment'),
      });
      configurePhoneStateCardsBridge({
        scope,
        deviceId: session.deviceId,
        store: session.store,
        enabled: () => isPhoneStateCutoverEnabled(scope.stableUid),
      });
      configurePhoneStatePracticeBridge({
        scope,
        deviceId: session.deviceId,
        store: session.store,
        triggerSync: () => session.triggerSync('sealed_segment'),
      });
      configurePhoneStateEconomyBridge({
        scope,
        runtimeGeneration: session.context.runtimeToken.generation,
        deviceId: session.deviceId,
        store: session.store,
        triggerSync: () => session.triggerSync('sealed_segment'),
      });
      void drainCustomizationSelectionOutbox({
        token: session.context.runtimeToken,
        lineage: session.context.lineage,
      }, {
        storage: AsyncStorage,
        mirror: commitPhoneStateCustomizationSelection,
      }).catch(() => {});
      void backfillClientShardPhoneStateOutbox({
        accountToken: session.context.runtimeToken,
      }).then(() => drainClientShardPhoneStateOutbox({
        accountToken: session.context.runtimeToken,
      })).catch(() => {});
      configurePhoneStateLearningV2Bridge({
        scope,
        deviceId: session.deviceId,
        store: session.store,
        triggerSync: () => session.triggerSync('sealed_segment'),
      });
      const manifestBody = Object.freeze({
        schemaVersion: 'personal-sync-device.v1' as const,
        ...scope,
        deviceId: session.deviceId,
        createdAtMs: Date.now(),
      });
      const local = createPhoneStateSqliteSyncRepository({
        database: session.localDatabase,
        registry: session.registry,
      });
      const rawCloud = createPhoneStateFirestoreRepository(firestore());
      let firestoreReads = 0;
      let firestoreWrites = 0;
      const cloud = Object.freeze({
        createSegment: async (...args: Parameters<typeof rawCloud.createSegment>) => {
          firestoreWrites += 1;
          return rawCloud.createSegment(...args);
        },
        ensureDeviceManifest: async (...args: Parameters<typeof rawCloud.ensureDeviceManifest>) => {
          firestoreWrites += 1;
          return rawCloud.ensureDeviceManifest(...args);
        },
        listDeviceManifests: async (...args: Parameters<typeof rawCloud.listDeviceManifests>) => {
          firestoreReads += 1;
          return rawCloud.listDeviceManifests(...args);
        },
        listSegmentsAfter: async (...args: Parameters<typeof rawCloud.listSegmentsAfter>) => {
          firestoreReads += 1;
          return rawCloud.listSegmentsAfter(...args);
        },
        listExternalEventsAfter: async (...args: Parameters<typeof rawCloud.listExternalEventsAfter>) => {
          firestoreReads += 1;
          return rawCloud.listExternalEventsAfter(...args);
        },
        createCheckpoint: async (...args: Parameters<typeof rawCloud.createCheckpoint>) => {
          firestoreWrites += 1;
          return rawCloud.createCheckpoint(...args);
        },
        latestCheckpoint: async (...args: Parameters<typeof rawCloud.latestCheckpoint>) => {
          firestoreReads += 1;
          return rawCloud.latestCheckpoint(...args);
        },
      });
      const engine = createPhoneStateSyncEngine({
        scope,
        deviceManifest: Object.freeze({
          ...manifestBody,
          fingerprint: await operationFingerprint(manifestBody),
        }),
        cloud,
        local,
      });
      const guardedEngine = Object.freeze({
        flushOnce: engine.flushOnce,
        pullOnce: engine.pullOnce,
        syncOnce: async () => {
          if (!getRemoteBool('phone_state_sync_enabled')) return Object.freeze({
            uploaded: 0,
            duplicates: 0,
            downloaded: 0,
            quarantined: 0,
            hasMore: false,
          });
          const readsBefore = firestoreReads;
          const writesBefore = firestoreWrites;
          const result = await engine.syncOnce();
          const previous = getPhoneStateHealthSnapshot()?.metrics;
          await recordPhoneStateHealthMetrics({
            duplicates: (previous?.duplicates ?? 0) + result.duplicates,
            quarantine: (previous?.quarantine ?? 0) + result.quarantined,
            firestoreReads: (previous?.firestoreReads ?? 0) + (firestoreReads - readsBefore),
            firestoreWrites: (previous?.firestoreWrites ?? 0) + (firestoreWrites - writesBefore),
          });
          if (result.downloaded > 0) {
            const { hydrateLevelSpinStarsAfterPhoneStatePull } = await import('./level_spin_star_grants');
            await hydrateLevelSpinStarsAfterPhoneStatePull(
              session.context.runtimeToken,
              result,
            ).catch(() => {});
          }
          return result;
        },
      });
      const coordinator = createPhoneStateSyncCoordinator({
        engine: guardedEngine,
        retryStore: createPhoneStateSqliteRetryStore(session.localDatabase),
        leaseOwner: `runtime_${Crypto.randomUUID()}`,
        now: Date.now,
        random: Math.random,
        setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
        clearTimer: (timer) => clearTimeout(timer),
        drainExternalIntents: async () => {
          const { resumePendingFriendGiftSends } = await import('./friend_gift_outbox');
          const result = await resumePendingFriendGiftSends();
          if (result.pending > 0) throw new Error('network_friend_gift_pending');
          return Object.freeze({ hasMore: false });
        },
      });
      session.setSyncTrigger((reason) => coordinator.trigger(reason));
      configurePhoneStateBackgroundSyncBridge(() => coordinator.trigger('sealed_segment'));
      configurePhoneStateSyncLifecycleRuntime({
        scope,
        coordinator,
        // Lifecycle subscriptions are cheap and dynamic; guardedEngine performs
        // zero Firebase work while the server-background flag is off.
        rolloutEnabled: true,
      });
    },
  });
}

export default function __RouteShim() { return null; }
