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
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { getCanonicalUserId } from './user_id_policy';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import { DebugLogger } from './debug-logger';

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

async function removeBackupRootExactly(): Promise<void> {
  await AsyncStorage.removeItem(BACKUP_KEY);
  if (await AsyncStorage.getItem(BACKUP_KEY) !== null) {
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

export async function restoreAccountSwitchEmergencyBackupIfSafe(
  isCurrent: () => boolean = () => true,
): Promise<BackupRestoreResult> {
  const generation = captureAccountGeneration();
  const generationIsCurrent = () => (
    isCurrent()
    && isCurrentAccountGeneration(generation)
  );

  return withAccountTransitionLock(async () => {
    if (!generationIsCurrent()) return { status: 'stale_generation' };
    const raw = await AsyncStorage.getItem(BACKUP_KEY);
    if (!raw) return { status: 'no_backup' };
    if (raw.length > BACKUP_PAGE_MAX_BYTES) return { status: 'upgrade_required' };

    const backup = parseBackup(raw);
    if (!backup) {
      await removeBackupRootExactly();
      return { status: 'invalid' };
    }

    if (typeof backup.createdAt === 'number' && Date.now() - backup.createdAt > BACKUP_MAX_AGE_MS) {
      if (backup.version === 3) await removeBackupPagesExactly(backup);
      await removeBackupRootExactly();
      return { status: 'expired' };
    }

    const currentId = await getCanonicalUserId().catch(() => null);
    if (!generationIsCurrent()) return { status: 'stale_generation' };
    if (!backup.stableId || !currentId || backup.stableId !== currentId) {
    // Чужой (или неизвестный) аккаунт — копию не трогаем: владелец может вернуться.
      return { status: 'different_account' };
    }

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
        const current = await multiGetExactly(page.pairs.map(([key]) => key));
        if (!generationIsCurrent()) return { status: 'stale_generation' };
        const backedValues = new Map(page.pairs);
        if (current.some(([key, value]) => value != null && isLearningV2SpoolGraphKey(key) &&
          value !== backedValues.get(key))) return { status: 'invalid' };
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
          const rankedPairs = page.pairs.filter(([key]) => restoreDependencyRank(key) === rank);
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
            await AsyncStorage.multiSet(missing);
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
        const graphPairs = page.pairs.filter(([key]) => isLearningV2SpoolGraphKey(key));
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
      await removeBackupRootExactly();
      await removeBackupPagesExactly(backup);
      return { status: 'restored', restoredKeys, skippedExisting };
    }

    const candidates = backup.pairs.filter(
      (pair): pair is [string, string] =>
        Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'string',
    );
    if (candidates.length === 0) {
      await removeBackupRootExactly();
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
        value !== backedValues.get(key))) return { status: 'invalid' };
    }
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
          await AsyncStorage.multiSet(missing);
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
    await removeBackupRootExactly();
    return { status: 'restored', restoredKeys, skippedExisting };
  });
}

// Required by Expo Router — not a screen
export default {};
