// ════════════════════════════════════════════════════════════════════════════
// account_switch_backup_restore.ts — восстановление аварийной копии «Сменить аккаунт».
//
// cloud_sync.saveAccountSwitchEmergencyBackup() пишет полную копию account-ключей
// в AsyncStorage ПЕРЕД wipeLocalAccountData(). Старые v1/v2 копии лежат в одном
// root, новый v3 публикует root последним после bounded hash-chained страниц.
// При следующем входе в ТОТ ЖЕ аккаунт (stable_id совпал) доливаем из копии
// ключи, которых нет после restoreFromCloud.
//
// Правила безопасности:
//   • stableId в копии обязан совпасть с текущим canonical id — данные не могут
//     перетечь в чужой аккаунт.
//   • Доливаем ТОЛЬКО отсутствующие ключи (текущее значение == null): облачный
//     restore всегда главнее, копия лишь закрывает дыры, которых облако не знало.
//   • Копия старше 30 дней считается протухшей и удаляется.
//   • Слот пуст или занят чужой копией → берём самую свежую полку
//     `account_switch_emergency_backup_shelved_v1:<текущий владелец>:<время>`
//     (туда выход другого аккаунта откладывает чужую копию) с теми же проверками;
//     после доливания удаляется ровно эта полка (TG-0AE4918142EE).
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { beginSettingsStorageMutation } from '../lib/startup_settings_read_scope';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  withAccountTransitionLockWithDeadline,
} from './account_generation';
import { getCanonicalUserId } from './user_id_policy';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import { DebugLogger, reportSwallowed } from './debug-logger';
import { identityErrorCode, identityTag, identityTrace } from './identity_trace';
import { ACCOUNT_SWITCH_LEAK_KEYS } from './account_switch_leak_keys';

// Литерал продублирован из app/cloud_sync.ts (ACCOUNT_SWITCH_EMERGENCY_BACKUP_KEY):
// константа там не экспортируется. При смене ключа менять в обоих местах.
const BACKUP_KEY = 'account_switch_emergency_backup_latest_v1';
const BACKUP_PAGE_PREFIX = 'account_switch_emergency_backup_page_v1:';
const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60_000;
const BACKUP_PAGE_MAX_PAIRS = 64;
const BACKUP_PAGE_MAX_BYTES = 512 * 1024;
const BACKUP_MAX_PAGES = 512;
const BACKUP_MAX_PAIRS = BACKUP_MAX_PAGES * BACKUP_PAGE_MAX_PAIRS;
const BACKUP_MAX_TOTAL_UTF8_BYTES = 128 * 1024 * 1024;

/**
 * Метка-псевдоним копии: {from: A, to: B, at}.
 *
 * зачем (AA S2d раунд 3, §135 ❓2 + повторное security-ревью): вход сохранил
 * аварийную копию гостя A, и сервер ПОДТВЕРДИЛ merge(A→B). Копию переписывать на B
 * нельзя (страницы v3 связаны хешами по stableId), поэтому вход под замком смены
 * аккаунта пишет метку, а восстановление ниже принимает копию A для B только по ней:
 * доливает недостающие ключи, B не перезаписывает, затем удаляет копию и метку.
 * Без метки копия A остаётся «чужой» (different_account).
 */
const MERGE_ALIAS_KEY = 'account_switch_backup_merge_alias_v1';

export type AccountSwitchBackupMergeAlias = Readonly<{ from: string; to: string; at: number }>;

export async function writeAccountSwitchBackupMergeAlias(from: string, to: string): Promise<void> {
  const alias: AccountSwitchBackupMergeAlias = { from, to, at: Date.now() };
  await AsyncStorage.setItem(MERGE_ALIAS_KEY, JSON.stringify(alias));
}

export async function readAccountSwitchBackupMergeAlias(): Promise<AccountSwitchBackupMergeAlias | null> {
  try {
    const raw = await AsyncStorage.getItem(MERGE_ALIAS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccountSwitchBackupMergeAlias>;
    if (typeof parsed.from !== 'string' || !parsed.from || typeof parsed.to !== 'string' || !parsed.to
      || typeof parsed.at !== 'number') return null;
    return { from: parsed.from, to: parsed.to, at: parsed.at };
  } catch (error) {
    identityTrace('[ACC-BACKUP-MERGE]', 'alias read_failed', { code: identityErrorCode(error) });
    return null;
  }
}

/** Снять метку-псевдоним (AA S2d раунд 4: копия отложена вместо доливания). */
export async function clearAccountSwitchBackupMergeAlias(reason: string): Promise<void> {
  await removeMergeAlias(reason);
}

async function removeMergeAlias(reason: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(MERGE_ALIAS_KEY);
  } catch (error) {
    identityTrace('[ACC-BACKUP-MERGE]', 'alias remove_failed', { reason, code: identityErrorCode(error) });
  }
}

type BackupPayload = {
  version: 1 | 2;
  createdAt: number;
  reason?: string;
  stableId?: string | null;
  pairs: Array<[string, string]>;
};

type BackupManifestV3 = {
  version: 3;
  schemaVersion: 'account-switch-emergency-backup.v3';
  backupId: string;
  stableId: string;
  createdAt: number;
  reason: string;
  pageCount: number;
  pairCount: number;
  totalUtf8Bytes: number;
  lastPageFingerprint: string | null;
  requiredSessionReceiptCount: number;
  manifestFingerprint: string;
};

const isLearningV2SpoolGraphKey = (key: string): boolean =>
  key.startsWith('v2:required-session-local-commit:') ||
  key.startsWith('v2:required-session-local-commit-index:') ||
  key.startsWith('v2:required-session-completion-receipt:') ||
  key.startsWith('v2:required-session-completion-scheduler:') ||
  key.startsWith('v2:outbox:');

const restoreDependencyRank = (key: string): 0 | 1 | 2 => {
  if (key.startsWith('v2:outbox:') ||
    (key.startsWith('v2:required-session-local-commit-index:') &&
      key.endsWith(':head'))) return 2;
  if (key.startsWith('v2:required-session-local-commit:v1:') ||
    key.startsWith('v2:required-session-local-commit:v3:') ||
    (key.startsWith('v2:required-session-local-commit-index:') &&
      key.endsWith(':transaction'))) return 1;
  return 0;
};

async function multiGetExactly(
  keys: readonly string[],
): Promise<readonly (readonly [string, string | null])[]> {
  const rows = await AsyncStorage.multiGet([...keys]);
  if (rows.length !== keys.length || rows.some((row, index) =>
    !Array.isArray(row) || row.length !== 2 || row[0] !== keys[index] ||
    (row[1] !== null && typeof row[1] !== 'string'))) {
    throw new Error('account_switch_backup_restore_indeterminate');
  }
  return rows;
}

// Литерал продублирован из app/cloud_sync.ts (ACCOUNT_SWITCH_BACKUP_SHELVED_PREFIX).
// Формат ключа полки: `<prefix><stableId владельца>:<base36 ms>`.
const SHELVED_PREFIX = 'account_switch_emergency_backup_shelved_v1:';

async function removeBackupRootExactly(rootKey: string = BACKUP_KEY): Promise<void> {
  await AsyncStorage.removeItem(rootKey);
  if (await AsyncStorage.getItem(rootKey) !== null) {
    throw new Error('account_switch_backup_restore_indeterminate');
  }
}

async function removeBackupPagesExactly(backup: BackupManifestV3): Promise<void> {
  for (let offset = 0; offset < backup.pageCount; offset += BACKUP_PAGE_MAX_PAIRS) {
    const pageKeys = Array.from(
      { length: Math.min(BACKUP_PAGE_MAX_PAIRS, backup.pageCount - offset) },
      (_, index) => `${BACKUP_PAGE_PREFIX}${backup.backupId}:${offset + index}`,
    );
    await AsyncStorage.multiRemove(pageKeys);
    if ((await multiGetExactly(pageKeys)).some(([, value]) => value !== null)) {
      throw new Error('account_switch_backup_restore_indeterminate');
    }
  }
}

export type BackupRestoreResult =
  | { status: 'no_backup' }
  | { status: 'different_account' }
  | { status: 'expired' }
  | { status: 'upgrade_required' }
  | { status: 'invalid' }
  | { status: 'stale_generation' }
  | { status: 'lock_busy' }
  | { status: 'restored'; restoredKeys: number; skippedExisting: number };

function parseBackup(raw: string): BackupPayload | BackupManifestV3 | null {
  if (raw.length > BACKUP_PAGE_MAX_BYTES) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed
      && (parsed.version === 1 || parsed.version === 2)
      && Array.isArray(parsed.pairs)
    ) {
      return parsed as BackupPayload;
    }
    if (parsed && parsed.version === 3 &&
      parsed.schemaVersion === 'account-switch-emergency-backup.v3' &&
      typeof parsed.backupId === 'string' && /^[a-z0-9-]{3,80}$/.test(parsed.backupId) &&
      typeof parsed.stableId === 'string' && parsed.stableId.length > 0 &&
      Number.isSafeInteger(parsed.createdAt) && parsed.createdAt >= 0 &&
      typeof parsed.reason === 'string' && parsed.reason.length <= 80 &&
      Number.isSafeInteger(parsed.pageCount) && parsed.pageCount >= 0 &&
      parsed.pageCount <= BACKUP_MAX_PAGES &&
      Number.isSafeInteger(parsed.pairCount) && parsed.pairCount >= 0 &&
      parsed.pairCount <= BACKUP_MAX_PAIRS &&
      Number.isSafeInteger(parsed.totalUtf8Bytes) && parsed.totalUtf8Bytes >= 0 &&
      parsed.totalUtf8Bytes <= BACKUP_MAX_TOTAL_UTF8_BYTES &&
      (parsed.lastPageFingerprint === null ||
        (typeof parsed.lastPageFingerprint === 'string' &&
          /^[a-f0-9]{64}$/.test(parsed.lastPageFingerprint))) &&
      Number.isSafeInteger(parsed.requiredSessionReceiptCount) &&
      parsed.requiredSessionReceiptCount >= 0 &&
      typeof parsed.manifestFingerprint === 'string' &&
      /^[a-f0-9]{64}$/.test(parsed.manifestFingerprint) &&
      Reflect.ownKeys(parsed).length === 12) {
      const { manifestFingerprint, ...body } = parsed;
      if (hashCanonicalBody(body) !== manifestFingerprint ||
        canonicalJsonV1(parsed) !== raw ||
        (parsed.pageCount === 0) !== (parsed.lastPageFingerprint === null)) return null;
      return parsed as BackupManifestV3;
    }
  } catch (e) {
      // повреждённый JSON — вызывающий удалит копию
      DebugLogger.error('account_switch_backup_restore:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return null;
}

function parseBackupPage(
  raw: string,
  manifest: BackupManifestV3,
  pageIndex: number,
  previousPageFingerprint: string | null,
): { readonly pairs: readonly (readonly [string, string])[]; readonly pageFingerprint: string } {
  if (raw.length > BACKUP_PAGE_MAX_BYTES || utf8ByteLengthV1(raw) > BACKUP_PAGE_MAX_BYTES) {
    throw new Error('account_switch_backup_invalid');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; } catch {
    throw new Error('account_switch_backup_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('account_switch_backup_invalid');
  }
  const value = parsed as Record<string, unknown>;
  if (Reflect.ownKeys(value).length !== 7 ||
    value.schemaVersion !== 'account-switch-emergency-backup-page.v1' ||
    value.backupId !== manifest.backupId || value.stableId !== manifest.stableId ||
    value.pageIndex !== pageIndex || value.previousPageFingerprint !== previousPageFingerprint ||
    !Array.isArray(value.pairs) || value.pairs.length < 1 ||
    value.pairs.length > BACKUP_PAGE_MAX_PAIRS ||
    value.pairs.some((pair) => !Array.isArray(pair) || pair.length !== 2 ||
      typeof pair[0] !== 'string' || pair[0].length === 0 || typeof pair[1] !== 'string') ||
    typeof value.pageFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.pageFingerprint)) {
    throw new Error('account_switch_backup_invalid');
  }
  const body = {
    schemaVersion: value.schemaVersion,
    backupId: value.backupId,
    stableId: value.stableId,
    pageIndex: value.pageIndex,
    previousPageFingerprint: value.previousPageFingerprint,
    pairs: value.pairs,
  };
  if (hashCanonicalBody(body) !== value.pageFingerprint || canonicalJsonV1(value) !== raw) {
    throw new Error('account_switch_backup_invalid');
  }
  return {
    pairs: value.pairs as readonly (readonly [string, string])[],
    pageFingerprint: value.pageFingerprint,
  };
}

export type BackupRestoreOptions = Readonly<{
  /**
   * Ждать замок смены аккаунта не дольше этого (мс); не дождались → `lock_busy`.
   * зачем (AA S2d раунд 4, L-R3-3): saveAccountSwitchEmergencyBackup зовёт доливание,
   * а его иногда вызывают уже ПОД этим замком — без потолка это была бы взаимная
   * блокировка; с потолком вызывающий откладывает копию вместо доливания.
   */
  lockTimeoutMs?: number;
  /**
   * Не искать полки (`…_shelved_v1:<владелец>:<время>`), только слот.
   * зачем (TG-0AE4918142EE): доливание из save идёт посреди выхода из аккаунта —
   * там нужен только слот с меткой merge, а не возврат старых полок в живое хранилище.
   */
  skipShelves?: boolean;
  /**
   * Получить список ключей хранилища, если восстановление его уже прочитало
   * (за вычетом снятых им полок). зачем (ревью TG-92BAE5BC536D, LOW): чистка полок
   * pruneShelvedAccountSwitchBackups берёт его вместо второго getAllKeys за вход.
   */
  onKeysScanned?: (keys: readonly string[]) => void;
}>;

/**
 * Можно ли на этом пути входа доставать полки владельца.
 *
 * зачем (ревью TG-92BAE5BC536D, MEDIUM 1): полка — снимок владельца на момент его
 * прошлого выхода. Доливать её можно только в ТОЛЬКО ЧТО стёртое хранилище (вход со
 * сменой аккаунта). На входах без стирания (linked_restore, created_restore,
 * keeplocal_restore_same) живые данные новее любой полки: долив вернул бы ключи,
 * которые человек удалил, и уже отправленные очереди (v2:outbox:*, операции монет).
 */
export function shelvesAllowedForPostAuthStage(stage: string): boolean {
  return stage === 'swap_restore' || stage === 'keeplocal_restore';
}

export async function restoreAccountSwitchEmergencyBackupIfSafe(
  isCurrent: () => boolean = () => true,
  options: BackupRestoreOptions = {},
): Promise<BackupRestoreResult> {
  const generation = captureAccountGeneration();
  const generationIsCurrent = () => (
    isCurrent()
    && isCurrentAccountGeneration(generation)
  );

  if (options.lockTimeoutMs !== undefined) {
    const locked = await withAccountTransitionLockWithDeadline(
      () => restoreUnderLock(generationIsCurrent, options),
      options.lockTimeoutMs,
    );
    const lockedResult: BackupRestoreResult = locked.completed ? locked.value : { status: 'lock_busy' };
    await logLeakKeysAfterRestore(lockedResult.status);
    return lockedResult;
  }
  const result = await withAccountTransitionLock(() => restoreUnderLock(generationIsCurrent, options));
  await logLeakKeysAfterRestore(result.status);
  return result;
}

/**
 * Что из ключей-утечек вернулось к владельцу после долива копии.
 * зачем (координатор 15.10): A при повторном входе получает свои лимиты, историю диалогов и лайки из копии, B — ничего.
 * Лог показывает, совпал ли владелец (status restored / different_account) и какие ключи-утечки теперь на телефоне. Не бросает.
 */
async function logLeakKeysAfterRestore(status: string): Promise<void> {
  try {
    const rows = await AsyncStorage.multiGet([...ACCOUNT_SWITCH_LEAK_KEYS]);
    const present = rows.filter(([, value]) => value != null).map(([key]) => key);
    const ownerMatch = status === 'restored' ? 'true' : status === 'different_account' ? 'false' : 'n/a';
    console.log(`[ACC-SWITCH-RESTORE] owner_match=${ownerMatch} status=${status} restored=${JSON.stringify(status === 'restored' ? present : [])} present=${present.length}`); // guard-ok: одна строка на вход
  } catch (error: unknown) {
    console.warn(`[ACC-SWITCH-RESTORE] scan_failed status=${status} code=${identityErrorCode(error)}`); // guard-ok: catch пишет причину
  }
}

/** Канонический id читается не больше одного раза за восстановление (слот + полки). */
function memoizeCurrentId(): () => Promise<string | null> {
  let pending: Promise<string | null> | null = null;
  return () => {
    pending ??= getCanonicalUserId().catch((error: unknown) => {
      // зачем: PM-229 — без причины нельзя отличить «аккаунт неизвестен» от сбоя чтения.
      reportSwallowed('account_switch_backup_restore:canonical_user_id', error);
      return null;
    });
    return pending;
  };
}

async function restoreUnderLock(
  generationIsCurrent: () => boolean,
  options: BackupRestoreOptions,
): Promise<BackupRestoreResult> {
  const resolveCurrentId = memoizeCurrentId();
  const scan = createShelfScan();
  const meta: RestoreMeta = { ownCopyCreatedAt: null };
  try {
    const slot = await restoreSlotUnderLock(generationIsCurrent, resolveCurrentId, meta);
    if (slot.status === 'restored') {
      // зачем (ревью TG-92BAE5BC536D, MEDIUM 1): своя копия из слота новее полок того
      // же владельца, отложенных раньше её создания — снять их, иначе при следующем
      // входе с пустым слотом старая полка воскресила бы удалённое и отправленное.
      await retireSupersededOwnShelves(scan, generationIsCurrent, resolveCurrentId, meta);
      return slot;
    }
    if (slot.status !== 'no_backup' && slot.status !== 'different_account') return slot;
    if (options.skipShelves === true) return slot;
    // зачем (TG-0AE4918142EE, §AUTH-0330): слот копии на телефоне один. Выход Б кладёт
    // копию A на полку, и раньше её не доставал никто — ранг, визитка, «Мои ошибки» и
    // кошелёк A пропадали. Теперь при пустом/чужом слоте возвращаем самую свежую полку
    // ТЕКУЩЕГО владельца теми же проверками, что и слот.
    const shelf = await restoreFreshestOwnShelfUnderLock(scan, generationIsCurrent, resolveCurrentId, meta);
    if (shelf?.status === 'restored') {
      await retireSupersededOwnShelves(scan, generationIsCurrent, resolveCurrentId, meta);
    }
    return shelf ?? slot;
  } finally {
    scan.report(options.onKeysScanned);
  }
}

/** Что известно о восстановленной копии: время создания СВОЕЙ копии (не по метке merge). */
type RestoreMeta = { ownCopyCreatedAt: number | null };

/** Один getAllKeys за восстановление; снятые полки вычитаются из отчёта для чистки. */
type ShelfScan = Readonly<{
  keys: () => Promise<readonly string[] | null>;
  forget: (key: string) => void;
  /** Ключи полок из прочитанного списка, ещё не снятые этим восстановлением. */
  remainingShelves: () => string[];
  report: (sink: ((keys: readonly string[]) => void) | undefined) => void;
}>;

function createShelfScan(): ShelfScan {
  let scanned: readonly string[] | null = null;
  let attempted = false;
  const removed = new Set<string>();
  return {
    keys: async () => {
      if (attempted) return scanned;
      attempted = true;
      try {
        scanned = await AsyncStorage.getAllKeys();
      } catch (error) {
        console.warn(`[ACC-MUT] backup:shelf_scan_failed code=${identityErrorCode(error)}`);
        scanned = null;
      }
      return scanned;
    },
    forget: (key) => { removed.add(key); },
    remainingShelves: () => (scanned ?? []).filter((key) => key.startsWith(SHELVED_PREFIX) && !removed.has(key)),
    report: (sink) => {
      if (!sink || scanned === null) return;
      try {
        sink(scanned.filter((key) => !removed.has(key)));
      } catch (error) {
        console.warn(`[ACC-MUT] backup:shelf_scan_report_failed code=${identityErrorCode(error)}`);
      }
    },
  };
}

async function restoreSlotUnderLock(
  generationIsCurrent: () => boolean,
  resolveCurrentId: () => Promise<string | null>,
  meta: RestoreMeta,
): Promise<BackupRestoreResult> {
  if (!generationIsCurrent()) return { status: 'stale_generation' };
  const raw = await AsyncStorage.getItem(BACKUP_KEY);
  if (!raw) {
    // Раунд 3: метка без копии больше ничего не значит — убираем.
    if (await AsyncStorage.getItem(MERGE_ALIAS_KEY) !== null) await removeMergeAlias('no_backup');
    return { status: 'no_backup' };
  }
  return restoreFromRoot({ kind: 'slot', rootKey: BACKUP_KEY, raw }, generationIsCurrent, resolveCurrentId, meta);
}

/** Страницы v3 по корню (без полной проверки: только чтобы снять их вместе с корнем). */
function pageKeysOfRoot(raw: string): string[] {
  try {
    const root = JSON.parse(raw) as { version?: unknown; backupId?: unknown; pageCount?: unknown };
    if (root.version !== 3 || typeof root.backupId !== 'string' || !/^[a-z0-9-]{3,80}$/.test(root.backupId)
      || !Number.isSafeInteger(root.pageCount) || Number(root.pageCount) < 0
      || Number(root.pageCount) > BACKUP_MAX_PAGES) return [];
    const backupId = root.backupId;
    return Array.from({ length: Number(root.pageCount) }, (_, index) => `${BACKUP_PAGE_PREFIX}${backupId}:${index}`);
  } catch (error) {
    console.warn(`[ACC-MUT] backup:shelf_root_unparsable code=${identityErrorCode(error)}`);
    return [];
  }
}

function backupIdOfRoot(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const value = (JSON.parse(raw) as { backupId?: unknown }).backupId;
    return typeof value === 'string' ? value : null;
  } catch (error) {
    console.warn(`[ACC-MUT] backup:slot_root_unparsable code=${identityErrorCode(error)}`);
    return null;
  }
}

/**
 * Снять полки текущего владельца, отложенные НЕ ПОЗЖЕ создания только что долитой
 * своей копии (метка ≤ createdAt): эта копия — более поздний снимок того же человека.
 * Снимаем корень и его страницы; полку, чьи страницы делит слот, страниц не лишаем;
 * полку с чужим владельцем внутри не трогаем.
 */
async function retireSupersededOwnShelves(
  scan: ShelfScan,
  generationIsCurrent: () => boolean,
  resolveCurrentId: () => Promise<string | null>,
  meta: RestoreMeta,
): Promise<void> {
  const createdAt = meta.ownCopyCreatedAt;
  if (createdAt === null) {
    console.warn('[ACC-MUT] backup:shelf_retire_skipped reason=no_own_created_at');
    return;
  }
  const keys = await scan.keys();
  if (keys === null || !keys.some((key) => key.startsWith(SHELVED_PREFIX))) return;
  const currentId = await resolveCurrentId();
  if (!currentId || !generationIsCurrent()) {
    console.warn(`[ACC-MUT] backup:shelf_retire_skipped reason=${currentId ? 'stale_generation' : 'no_current_id'}`);
    return;
  }
  const candidates = ownShelfCandidates(keys, currentId);
  if (candidates.length === 0) return;
  const owner = identityTag(currentId);
  const slotBackupId = backupIdOfRoot(await AsyncStorage.getItem(BACKUP_KEY));
  for (const candidate of candidates) {
    const stamp = candidate.stampedAt.toString(36);
    try {
      const raw = await AsyncStorage.getItem(candidate.key);
      if (raw === null) { scan.forget(candidate.key); continue; }
      const inner = (() => {
        try {
          return JSON.parse(raw) as { stableId?: unknown; createdAt?: unknown };
        } catch (error) {
          console.warn(`[ACC-MUT] backup:shelf_root_unparsable code=${identityErrorCode(error)}`);
          return null;
        }
      })();
      if (inner?.stableId !== currentId) {
        console.warn(`[ACC-MUT] backup:shelf_retire_skipped reason=inner_owner_mismatch owner=${owner} stamp=${stamp}`);
        continue;
      }
      // зачем (ревью TG-2307361A2567, LOW): возраст — по createdAt ВНУТРИ копии, а не по
      // метке в имени ключа (она ставится в момент откладывания и зависит от часов того
      // выхода). Метка — только запасной путь для старых копий без createdAt.
      const copyCreatedAt = Number.isSafeInteger(inner?.createdAt) ? Number(inner?.createdAt) : candidate.stampedAt;
      if (copyCreatedAt > createdAt) continue;
      // 2б: страницы, которые держит слот или другая оставшаяся полка (дубль), не трогаем.
      const backupId = backupIdOfRoot(raw);
      const sharedWithShelf = backupId !== null && await (async () => {
        for (const other of scan.remainingShelves()) {
          if (other === candidate.key) continue;
          if (backupIdOfRoot(await AsyncStorage.getItem(other)) === backupId) return true;
        }
        return false;
      })();
      const pageKeys = backupId === slotBackupId || sharedWithShelf ? [] : pageKeysOfRoot(raw);
      for (let offset = 0; offset < pageKeys.length; offset += BACKUP_PAGE_MAX_PAIRS) {
        await AsyncStorage.multiRemove(pageKeys.slice(offset, offset + BACKUP_PAGE_MAX_PAIRS));
      }
      await AsyncStorage.removeItem(candidate.key);
      scan.forget(candidate.key);
      console.warn(`[ACC-MUT] backup:shelf_retired reason=superseded owner=${owner} stamp=${stamp} pages=${pageKeys.length}`);
    } catch (error) {
      console.warn(`[ACC-MUT] backup:shelf_retire_failed owner=${owner} stamp=${stamp} code=${identityErrorCode(error)}`);
    }
  }
}

type ShelfCandidate = Readonly<{ key: string; stampedAt: number }>;

/** Полки владельца `ownerId`, свежие первыми. Ключ чужого владельца сюда не попадает. */
function ownShelfCandidates(keys: readonly string[], ownerId: string): ShelfCandidate[] {
  const prefix = `${SHELVED_PREFIX}${ownerId}:`;
  return keys
    .filter((key) => key.startsWith(prefix))
    .map((key) => ({ key, stamp: key.slice(prefix.length) }))
    // зачем: остаток после `<владелец>:` — только метка base36; иначе это ключ другого
    // владельца, чей id начинается с `<ownerId>:` (двоеточие в метке не встречается).
    .filter(({ stamp }) => /^[0-9a-z]{1,13}$/.test(stamp))
    .map(({ key, stamp }) => ({ key, stampedAt: parseInt(stamp, 36) }))
    .filter(({ stampedAt }) => Number.isSafeInteger(stampedAt) && stampedAt > 0)
    .sort((left, right) => right.stampedAt - left.stampedAt);
}

/**
 * Вернуть самую свежую годную полку текущего владельца. null — полки не было
 * (или ни одна не подошла): вызывающий отдаёт результат слота.
 *
 * Инварианты: владелец сверяется ВНУТРИ копии (корень и каждая страница v3), а не
 * только по имени ключа; метка merge на полки не действует; после успешного
 * доливания удаляется ровно эта полка (корень и её страницы), остальные не трогаем.
 */
async function restoreFreshestOwnShelfUnderLock(
  scan: ShelfScan,
  generationIsCurrent: () => boolean,
  resolveCurrentId: () => Promise<string | null>,
  meta: RestoreMeta,
): Promise<BackupRestoreResult | null> {
  const keys = await scan.keys();
  if (keys === null) return null;
  // Дешёвый ранний выход: полок нет вовсе — канонический id не читаем.
  if (!keys.some((key) => key.startsWith(SHELVED_PREFIX))) return null;
  const currentId = await resolveCurrentId();
  if (!generationIsCurrent()) return { status: 'stale_generation' };
  if (!currentId) {
    console.warn('[ACC-MUT] backup:shelf_skipped reason=no_current_id');
    return null;
  }
  const candidates = ownShelfCandidates(keys, currentId);
  if (candidates.length === 0) return null;
  const owner = identityTag(currentId);
  for (const [index, candidate] of candidates.entries()) {
    const stamp = candidate.stampedAt.toString(36);
    const raw = await AsyncStorage.getItem(candidate.key);
    if (raw === null) {
      console.warn(`[ACC-MUT] backup:shelf_skipped reason=vanished owner=${owner} stamp=${stamp}`);
      continue;
    }
    const result = await restoreFromRoot(
      { kind: 'shelf', rootKey: candidate.key, raw },
      generationIsCurrent,
      resolveCurrentId,
      meta,
    );
    if (result.status === 'restored' || result.status === 'expired') scan.forget(candidate.key);
    if (result.status === 'restored') {
      console.warn(
        `[ACC-MUT] backup:restored_from_shelf owner=${owner} stamp=${stamp} restoredKeys=${result.restoredKeys} skippedExisting=${result.skippedExisting} olderShelvesLeft=${candidates.length - index - 1}`,
      );
      return result;
    }
    if (result.status === 'stale_generation' || result.status === 'lock_busy') {
      console.warn(`[ACC-MUT] backup:shelf_aborted reason=${result.status} owner=${owner} stamp=${stamp}`);
      return result;
    }
    // invalid / expired / upgrade_required / different_account (владелец внутри не тот):
    // эта полка не годится — пробуем следующую по свежести. Битую полку не удаляем
    // (кроме протухшей): её уберёт pruneShelvedAccountSwitchBackups через 30 дней.
    console.warn(`[ACC-MUT] backup:shelf_skipped reason=${result.status} owner=${owner} stamp=${stamp}`);
  }
  return null;
}

type RestoreRootSource = Readonly<{ kind: 'slot' | 'shelf'; rootKey: string; raw: string }>;

async function restoreFromRoot(
  source: RestoreRootSource,
  generationIsCurrent: () => boolean,
  resolveCurrentId: () => Promise<string | null>,
  meta: RestoreMeta,
): Promise<BackupRestoreResult> {
  return (async () => {
    const { raw } = source;
    if (raw.length > BACKUP_PAGE_MAX_BYTES) return { status: 'upgrade_required' };

    const backup = parseBackup(raw);
    if (!backup) {
      // зачем: битая полка может быть единственным следом данных — снимает её только
      // 30-дневная чистка; битый слот, как и раньше, удаляется сразу.
      if (source.kind === 'slot') await removeBackupRootExactly(source.rootKey);
      return { status: 'invalid' };
    }

    if (typeof backup.createdAt === 'number' && Date.now() - backup.createdAt > BACKUP_MAX_AGE_MS) {
      if (backup.version === 3) await removeBackupPagesExactly(backup);
      await removeBackupRootExactly(source.rootKey);
      return { status: 'expired' };
    }

    const currentId = await resolveCurrentId();
    if (!generationIsCurrent()) return { status: 'stale_generation' };
    // Раунд 3 (§135 ❓2): копия гостя A принимается для B только по метке
    // подтверждённого merge(A→B); иначе — чужой аккаунт, копию не трогаем.
    // Метка относится к слоту; полка доливается только своему владельцу.
    let mergedFrom: string | null = null;
    if (source.kind === 'slot' && backup.stableId && currentId && backup.stableId !== currentId) {
      const alias = await readAccountSwitchBackupMergeAlias();
      if (!generationIsCurrent()) return { status: 'stale_generation' };
      if (alias && alias.from === backup.stableId && alias.to === currentId) mergedFrom = alias.from;
    }
    if (!backup.stableId || !currentId || (backup.stableId !== currentId && mergedFrom === null)) {
    // Чужой (или неизвестный) аккаунт — копию не трогаем: владелец может вернуться.
      return { status: 'different_account' };
    }
    // Ключи, названные по id гостя A (очереди, квитанции), в B не переносим: B их не
    // прочтёт, а чужая очередь не должна оказаться в чужом профиле.
    // зачем (AA S2d раунд 4, L-R3-1): при доливании по псевдониму граф Learning V2
    // копии A может конфликтовать с графом B. Прежде это давало `invalid` и вечную
    // копию, блокирующую «Сменить аккаунт». Теперь весь граф копии пропускается как
    // «уже есть» (половину чужого графа в B не ставим — он связан зависимостями),
    // остальное доливается, копия и метка удаляются. Без псевдонима (своя копия)
    // поведение прежнее: конфликт → invalid.
    let skipAllGraphKeys = false;
    let graphKeysInCopy = 0;
    const restorable = (key: string): boolean => mergedFrom === null
      || (!key.includes(mergedFrom) && !(skipAllGraphKeys && isLearningV2SpoolGraphKey(key)));
    let skippedForeignKeys = 0;
    const finishMergedRestore = async (restoredKeys: number, skippedExisting: number): Promise<void> => {
      if (mergedFrom === null) {
        // Своя копия долита: её время создания решает, какие свои полки устарели (MEDIUM 1).
        meta.ownCopyCreatedAt = Number.isSafeInteger(backup.createdAt) ? backup.createdAt : null;
        return;
      }
      await removeMergeAlias('restored');
      identityTrace('[ACC-BACKUP-MERGE]', 'restored', {
        restoredKeys,
        skippedExisting,
        skippedForeignKeys,
        graphConflict: skipAllGraphKeys,
        skippedGraphKeys: skipAllGraphKeys ? graphKeysInCopy : 0,
      });
    };

    if (backup.version === 3) {
      let observedPairs = 0;
      let observedUtf8Bytes = 0;
      let observedReceiptCount = 0;
      let previousPageFingerprint: string | null = null;
      let previousKey: string | null = null;
      const auditedPageFingerprints: string[] = [];
      // Pass 1 proves the complete immutable chain and every graph conflict
      // before the first restore write. A missing/tampered later page can
      // therefore never leave half of a spool graph installed.
      for (let pageIndex = 0; pageIndex < backup.pageCount; pageIndex += 1) {
        if (!generationIsCurrent()) return { status: 'stale_generation' };
        const pageKey = `${BACKUP_PAGE_PREFIX}${backup.backupId}:${pageIndex}`;
        const pageRaw = await AsyncStorage.getItem(pageKey);
        if (pageRaw === null) return { status: 'invalid' };
        let page: ReturnType<typeof parseBackupPage>;
        try {
          page = parseBackupPage(pageRaw, backup, pageIndex, previousPageFingerprint);
        } catch {
          return { status: 'invalid' };
        }
        for (const [key, value] of page.pairs) {
          if (previousKey !== null && key <= previousKey) return { status: 'invalid' };
          previousKey = key;
          observedUtf8Bytes += utf8ByteLengthV1(key) + utf8ByteLengthV1(value);
          if (!Number.isSafeInteger(observedUtf8Bytes)) return { status: 'invalid' };
          if (key.startsWith('v2:required-session-completion-receipt:v1:')) {
            observedReceiptCount += 1;
          }
        }
        observedPairs += page.pairs.length;
        graphKeysInCopy += page.pairs.filter(([key]) => isLearningV2SpoolGraphKey(key)).length;
        skippedForeignKeys += page.pairs.filter(([key]) => mergedFrom !== null && key.includes(mergedFrom)).length;
        const current = await multiGetExactly(page.pairs.map(([key]) => key));
        if (!generationIsCurrent()) return { status: 'stale_generation' };
        const backedValues = new Map(page.pairs);
        if (current.some(([key, value]) => value != null && isLearningV2SpoolGraphKey(key) &&
          restorable(key) && value !== backedValues.get(key))) {
          if (mergedFrom === null) return { status: 'invalid' };
          skipAllGraphKeys = true; // L-R3-1: см. выше
        }
        previousPageFingerprint = page.pageFingerprint;
        auditedPageFingerprints.push(page.pageFingerprint);
      }
      if (observedPairs !== backup.pairCount || observedUtf8Bytes !== backup.totalUtf8Bytes ||
        observedReceiptCount !== backup.requiredSessionReceiptCount ||
        previousPageFingerprint !== backup.lastPageFingerprint) return { status: 'invalid' };
      let restoredKeys = 0;
      let skippedExisting = 0;
      // The backup root remains durable until all three dependency ranks are
      // installed and re-read. A process cut can therefore only leave safe
      // orphan leaves (rank 0) or a fully resolvable prefix, and the next boot
      // deterministically rolls the same restore forward.
      for (const rank of [0, 1, 2] as const) {
        previousPageFingerprint = null;
        for (let pageIndex = 0; pageIndex < backup.pageCount; pageIndex += 1) {
          const pageRaw = await AsyncStorage.getItem(
            `${BACKUP_PAGE_PREFIX}${backup.backupId}:${pageIndex}`,
          );
          if (pageRaw === null) throw new Error('account_switch_backup_restore_indeterminate');
          const page = parseBackupPage(pageRaw, backup, pageIndex, previousPageFingerprint);
          if (page.pageFingerprint !== auditedPageFingerprints[pageIndex]) {
            throw new Error('account_switch_backup_restore_indeterminate');
          }
          previousPageFingerprint = page.pageFingerprint;
          const rankedPairs = page.pairs.filter(([key]) => restoreDependencyRank(key) === rank && restorable(key));
          if (rankedPairs.length === 0) continue;
          const keys = rankedPairs.map(([key]) => key);
          const current = await multiGetExactly(keys);
          if (!generationIsCurrent()) return { status: 'stale_generation' };
          const backedValues = new Map(rankedPairs);
          if (current.some(([key, value]) => value != null &&
            isLearningV2SpoolGraphKey(key) && value !== backedValues.get(key))) {
            throw new Error('account_switch_backup_restore_indeterminate');
          }
          const existing = new Set(current.filter(([, value]) => value != null).map(([key]) => key));
          const missing = rankedPairs.filter(([key]) => !existing.has(key)) as [string, string][];
          if (missing.length > 0) {
            const finishSettingsMutation = missing.some(([key]) => key === 'user_settings')
              ? beginSettingsStorageMutation() : undefined;
            try {
              await AsyncStorage.multiSet(missing);
            } finally {
              finishSettingsMutation?.();
            }
            const verified = await multiGetExactly(missing.map(([key]) => key));
            if (verified.some(([key, value], index) =>
              key !== missing[index][0] || value !== missing[index][1])) {
              throw new Error('account_switch_backup_restore_indeterminate');
            }
          }
          restoredKeys += missing.length;
          skippedExisting += existing.size;
        }
        if (previousPageFingerprint !== backup.lastPageFingerprint) {
          throw new Error('account_switch_backup_restore_indeterminate');
        }
      }
      // Before deleting the recovery root, prove that every queue-graph byte is
      // present exactly. Normal cloud-restored keys may intentionally differ.
      previousPageFingerprint = null;
      for (let pageIndex = 0; pageIndex < backup.pageCount; pageIndex += 1) {
        const pageRaw = await AsyncStorage.getItem(
          `${BACKUP_PAGE_PREFIX}${backup.backupId}:${pageIndex}`,
        );
        if (pageRaw === null) throw new Error('account_switch_backup_restore_indeterminate');
        const page = parseBackupPage(pageRaw, backup, pageIndex, previousPageFingerprint);
        if (page.pageFingerprint !== auditedPageFingerprints[pageIndex]) {
          throw new Error('account_switch_backup_restore_indeterminate');
        }
        previousPageFingerprint = page.pageFingerprint;
        const graphPairs = page.pairs.filter(([key]) => isLearningV2SpoolGraphKey(key) && restorable(key));
        if (graphPairs.length === 0) continue;
        const verified = await multiGetExactly(graphPairs.map(([key]) => key));
        if (verified.some(([key, value], index) =>
          key !== graphPairs[index][0] || value !== graphPairs[index][1])) {
          throw new Error('account_switch_backup_restore_indeterminate');
        }
      }
      if (previousPageFingerprint !== backup.lastPageFingerprint) {
        throw new Error('account_switch_backup_restore_indeterminate');
      }
      if (!generationIsCurrent()) return { status: 'stale_generation' };
      await removeBackupRootExactly(source.rootKey);
      await removeBackupPagesExactly(backup);
      await finishMergedRestore(restoredKeys, skippedExisting);
      return { status: 'restored', restoredKeys, skippedExisting };
    }

    const typedPairs = backup.pairs.filter(
      (pair): pair is [string, string] =>
        Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string',
    );
    let candidates = typedPairs.filter(([key]) => restorable(key));
    skippedForeignKeys = typedPairs.length - candidates.length;
    graphKeysInCopy = typedPairs.filter(([key]) => isLearningV2SpoolGraphKey(key)).length;
    if (candidates.length === 0) {
      await removeBackupRootExactly(source.rootKey);
      return { status: 'invalid' };
    }
    const candidateKeys = new Set<string>();
    for (const [key] of candidates) {
      if (candidateKeys.has(key)) return { status: 'invalid' };
      candidateKeys.add(key);
    }

    // Historical monolithic backups remain compatible, but they receive the
    // same full conflict preflight before the first write.
    for (let offset = 0; offset < candidates.length; offset += BACKUP_PAGE_MAX_PAIRS) {
      const chunk = candidates.slice(offset, offset + BACKUP_PAGE_MAX_PAIRS);
      const current = await multiGetExactly(chunk.map(([key]) => key));
      if (!generationIsCurrent()) return { status: 'stale_generation' };
      const backedValues = new Map(chunk);
      if (current.some(([key, value]) => value != null && isLearningV2SpoolGraphKey(key) &&
        value !== backedValues.get(key))) {
        if (mergedFrom === null) return { status: 'invalid' };
        skipAllGraphKeys = true; // L-R3-1
      }
    }
    if (skipAllGraphKeys) candidates = candidates.filter(([key]) => restorable(key));
    let restoredKeys = 0;
    let skippedExisting = 0;
    for (const rank of [0, 1, 2] as const) {
      for (let offset = 0; offset < candidates.length; offset += BACKUP_PAGE_MAX_PAIRS) {
        const chunk = candidates.slice(offset, offset + BACKUP_PAGE_MAX_PAIRS)
          .filter(([key]) => restoreDependencyRank(key) === rank);
        if (chunk.length === 0) continue;
        const current = await multiGetExactly(chunk.map(([key]) => key));
        if (!generationIsCurrent()) return { status: 'stale_generation' };
        const backedValues = new Map(chunk);
        if (current.some(([key, value]) => value != null && isLearningV2SpoolGraphKey(key) &&
          value !== backedValues.get(key))) {
          throw new Error('account_switch_backup_restore_indeterminate');
        }
        const existing = new Set(current.filter(([, value]) => value != null).map(([key]) => key));
        const missing = chunk.filter(([key]) => !existing.has(key));
        if (missing.length > 0) {
          const finishSettingsMutation = missing.some(([key]) => key === 'user_settings')
            ? beginSettingsStorageMutation() : undefined;
          try {
            await AsyncStorage.multiSet(missing);
          } finally {
            finishSettingsMutation?.();
          }
          const verified = await multiGetExactly(missing.map(([key]) => key));
          if (verified.some(([key, value], index) =>
            key !== missing[index][0] || value !== missing[index][1])) {
            throw new Error('account_switch_backup_restore_indeterminate');
          }
        }
        restoredKeys += missing.length;
        skippedExisting += existing.size;
      }
    }
    if (!generationIsCurrent()) return { status: 'stale_generation' };
    await removeBackupRootExactly(source.rootKey);
    await finishMergedRestore(restoredKeys, skippedExisting);
    return { status: 'restored', restoredKeys, skippedExisting };
  })();
}

// Required by Expo Router — not a screen
export default {};
