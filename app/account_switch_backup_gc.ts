/**
 * Уборка аварийных копий смены аккаунта на холодном старте: ОДНА копия на владельца, страницы без корня — долой.
 *
 * зачем (координатор 15.10, 🔴 по прогону №7): из 440 ключей хранилища 358 оказались страницами копий
 * `account_switch_emergency_backup_page_v1:<backupId>:<n>` — копии копились от выходов: это раздувание базы (потолок Android
 * 64 МБ) и данные людей, которые лежат дольше нужного. Что делает уборка:
 *  1) у одного владельца несколько полок `…_shelved_v1:<owner>:<stamp>` — оставляем самую свежую, старшие снимаем;
 *  2) страницы, на которые не указывает ни слот, ни одна полка, снимаем (обрыв записи, вытеснение без страниц, старые сборки),
 *     но только старше 10 минут по метке в backupId — страницы копии, которую пишут прямо сейчас, не трогаем никогда;
 *  3) полки других владельцев старше срока — прежней pruneShelvedAccountSwitchBackups (срок и тот же журнал).
 * Всё под замком смены аккаунта (сохранение и долив копии под ним же) и не дольше одного раза за процесс и раз в 6 ч.
 * Журнал: `[ACC-SWITCH-BACKUP] owners=N roots=R pages=M pruned=K …` — одна строка на запуск, без id (только счётчики).
 * Литералы префиксов продублированы из app/cloud_sync.ts (как в account_switch_backup_restore.ts) — без цикла импорта.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { withAccountTransitionLockWithDeadline } from './account_generation';
import { identityErrorCode } from './identity_trace';

const LOG = '[ACC-SWITCH-BACKUP]';
const SLOT_KEY = 'account_switch_emergency_backup_latest_v1';
const PAGE_PREFIX = 'account_switch_emergency_backup_page_v1:';
const SHELF_PREFIX = 'account_switch_emergency_backup_shelved_v1:';
const LAST_RUN_KEY = 'account_switch_backup_gc_last_run_v1';
const MIN_INTERVAL_MS = 6 * 60 * 60_000;
/** Страница моложе этого — возможно, копию пишут прямо сейчас (корень публикуется последним). */
const ORPHAN_MIN_AGE_MS = 10 * 60_000;
const LOCK_DEADLINE_MS = 3_000;
const REMOVE_CHUNK = 128;

export type AccountSwitchBackupGcResult = Readonly<{
  status: 'done' | 'throttled' | 'already_ran' | 'lock_busy' | 'failed';
  owners: number;
  roots: number;
  pages: number;
  prunedShelves: number;
  prunedPages: number;
  agedShelves: number;
}>;

type Root = Readonly<{ key: string; owner: string | null; backupId: string | null; stampedAt: number }>;

let ranThisProcess = false;

const EMPTY = { owners: 0, roots: 0, pages: 0, prunedShelves: 0, prunedPages: 0, agedShelves: 0 } as const;

function parseRoot(key: string, raw: string | null): Root {
  let owner: string | null = null;
  let backupId: string | null = null;
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as { stableId?: unknown; backupId?: unknown };
      if (typeof parsed.stableId === 'string' && parsed.stableId.length > 0) owner = parsed.stableId;
      if (typeof parsed.backupId === 'string' && /^[a-z0-9-]{3,80}$/.test(parsed.backupId)) backupId = parsed.backupId;
    } catch (error: unknown) {
      // Битый корень не трогаем (его страницы считаются занятыми только если backupId прочитан) — пишем причину.
      console.warn(`${LOG} root_unparsable kind=${key === SLOT_KEY ? 'slot' : 'shelf'} code=${identityErrorCode(error)}`);
    }
  }
  if (key.startsWith(SHELF_PREFIX)) {
    const rest = key.slice(SHELF_PREFIX.length);
    const cut = rest.lastIndexOf(':');
    const stamp = cut > 0 ? parseInt(rest.slice(cut + 1), 36) : NaN;
    return { key, owner: owner ?? (cut > 0 ? rest.slice(0, cut) : null), backupId, stampedAt: Number.isSafeInteger(stamp) ? stamp : 0 };
  }
  return { key, owner, backupId, stampedAt: Number.MAX_SAFE_INTEGER };
}

/** backupId = `<createdAt base36>-<случайное>[-n]` (saveAccountSwitchEmergencyBackup). */
function backupCreatedAt(backupId: string): number {
  const at = parseInt(backupId.split('-')[0] ?? '', 36);
  return Number.isSafeInteger(at) ? at : 0;
}

function pageBackupId(pageKey: string): string {
  const rest = pageKey.slice(PAGE_PREFIX.length);
  const cut = rest.lastIndexOf(':');
  return cut > 0 ? rest.slice(0, cut) : rest;
}

async function removeInChunks(keys: readonly string[]): Promise<void> {
  for (let offset = 0; offset < keys.length; offset += REMOVE_CHUNK) {
    await AsyncStorage.multiRemove(keys.slice(offset, offset + REMOVE_CHUNK));
  }
}

async function collectUnderLock(nowMs: number): Promise<AccountSwitchBackupGcResult> {
  const keys = await AsyncStorage.getAllKeys();
  const shelfKeys = keys.filter((key) => key.startsWith(SHELF_PREFIX));
  const pageKeys = keys.filter((key) => key.startsWith(PAGE_PREFIX));
  const rootKeys = [...(keys.includes(SLOT_KEY) ? [SLOT_KEY] : []), ...shelfKeys];
  const rows = rootKeys.length > 0 ? await AsyncStorage.multiGet(rootKeys) : [];
  const roots = rows.map(([key, raw]) => parseRoot(key, raw));
  const owners = new Set(roots.map((root) => root.owner).filter((owner): owner is string => owner !== null));

  // 1) одна полка на владельца: самая свежая остаётся, старшие снимаются (их страницы уйдут шагом 2, если больше никем не заняты)
  const newestShelfByOwner = new Map<string, Root>();
  for (const root of roots) {
    if (root.key === SLOT_KEY || root.owner === null) continue;
    const kept = newestShelfByOwner.get(root.owner);
    if (!kept || root.stampedAt > kept.stampedAt) newestShelfByOwner.set(root.owner, root);
  }
  const staleShelves = roots.filter((root) => root.key !== SLOT_KEY && root.owner !== null
    && newestShelfByOwner.get(root.owner)?.key !== root.key);
  if (staleShelves.length > 0) await removeInChunks(staleShelves.map((root) => root.key));
  const liveRoots = roots.filter((root) => !staleShelves.includes(root));

  // 2) страницы без корня, старше 10 минут
  const referenced = new Set(liveRoots.map((root) => root.backupId).filter((id): id is string => id !== null));
  const orphanPages = pageKeys.filter((key) => {
    const backupId = pageBackupId(key);
    if (referenced.has(backupId)) return false;
    const createdAt = backupCreatedAt(backupId);
    return createdAt > 0 && nowMs - createdAt > ORPHAN_MIN_AGE_MS;
  });
  if (orphanPages.length > 0) await removeInChunks(orphanPages);

  // 3) чужие полки старше срока — прежний помощник (тот же срок, тот же журнал), со своим списком ключей
  let agedShelves = 0;
  try {
    const { pruneShelvedAccountSwitchBackups } = await import('./cloud_sync');
    const remaining = keys.filter((key) => !staleShelves.some((root) => root.key === key) && !orphanPages.includes(key));
    agedShelves = await pruneShelvedAccountSwitchBackups(nowMs, remaining);
  } catch (error: unknown) {
    console.warn(`${LOG} aged_prune_failed code=${identityErrorCode(error)}`);
  }
  return {
    status: 'done',
    owners: owners.size,
    roots: roots.length,
    pages: pageKeys.length,
    prunedShelves: staleShelves.length,
    prunedPages: orphanPages.length,
    agedShelves,
  };
}

export async function runAccountSwitchBackupGc(source: string, nowMs: number = Date.now()): Promise<AccountSwitchBackupGcResult> {
  const startedAt = Date.now();
  if (ranThisProcess) {
    console.log(`${LOG} skip reason=already_ran source=${source}`);
    return { status: 'already_ran', ...EMPTY };
  }
  ranThisProcess = true;
  try {
    const lastRun = parseInt(String(await AsyncStorage.getItem(LAST_RUN_KEY) ?? ''), 10);
    // часы назад (nowMs < lastRun) — порог считаем пройденным, иначе уборка стояла бы, пока время не догонит записанное
    if (Number.isFinite(lastRun) && lastRun > 0 && nowMs >= lastRun && nowMs - lastRun < MIN_INTERVAL_MS) {
      console.log(`${LOG} skip reason=throttled source=${source} sinceMs=${nowMs - lastRun}`);
      return { status: 'throttled', ...EMPTY };
    }
    const locked = await withAccountTransitionLockWithDeadline(() => collectUnderLock(nowMs), LOCK_DEADLINE_MS);
    if (!locked.completed) {
      // замок держит смена/стирание аккаунта — уборка подождёт следующего холодного старта
      console.log(`${LOG} skip reason=lock_busy source=${source} ms=${Date.now() - startedAt}`);
      ranThisProcess = false;
      return { status: 'lock_busy', ...EMPTY };
    }
    await AsyncStorage.setItem(LAST_RUN_KEY, String(nowMs));
    const result = locked.value;
    console.log(`${LOG} owners=${result.owners} roots=${result.roots} pages=${result.pages} pruned=${result.prunedShelves + result.prunedPages + result.agedShelves} prunedShelves=${result.prunedShelves} prunedPages=${result.prunedPages} agedShelves=${result.agedShelves} source=${source} ms=${Date.now() - startedAt}`); // guard-ok: одна строка на холодный старт
    return result;
  } catch (error: unknown) {
    console.warn(`${LOG} failed source=${source} code=${identityErrorCode(error)} ms=${Date.now() - startedAt}`);
    return { status: 'failed', ...EMPTY };
  }
}

/** Только для тестов: сбросить «уже запускалась в этом процессе». */
export function __resetAccountSwitchBackupGcForTests(): void {
  ranThisProcess = false;
}

/* expo-router: keep this utility from being treated as a screen */
export default function __AccountSwitchBackupGcRouteShim() {
  return null;
}
