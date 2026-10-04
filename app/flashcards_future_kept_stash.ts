/**
 * Account Authority 2.0, этап S1e — локальные версии карточек, уступившие облачной «из будущего»
 * при силовом переносе перед сменой аккаунта.
 *
 * зачем: S1d (keepRemoteFromFuture) на пути записи страниц оставляет облачную правку «из будущего»
 * (часы ЭТОГО телефона отстают — или спешат часы другого устройства), а локальная остаётся только
 * на телефоне. Силовой перенос (forceSyncToCloud) после этого возвращает успех, и смена аккаунта
 * стирает телефон — локальная правка терялась. Аварийная копия (final_account_snapshot_before_switch)
 * хранила весь список, но при возврате облачный restore уже кладёт список, а копия доливает ТОЛЬКО
 * отсутствующие ключи — список из копии не возвращался.
 *
 * Решение (вариант Б ревью, без второго механизма копий):
 *  - stashForceFutureKeptLocalVersions — кладёт локальные версии ЭТИХ карточек в ключ аккаунта
 *    FLASHCARD_FUTURE_KEPT_STASH_KEY. Ключ в инвентаре аккаунта (cloud_sync.accountLocalDataKeysForToday):
 *    попадает в ту же аварийную копию того же владельца и стирается вместе с аккаунтом. В старое
 *    облако не уходит (не в SYNC_KEYS) — данные не покидают устройство.
 *  - mergeFutureKeptStashRaw — объединение записей: прежняя копия того же владельца не затирается.
 *  - applyFutureKeptStashAfterReturn — после доливания копии при входе возвращает версии в список,
 *    но только если на телефоне всё ещё лежит та самая облачная версия (то же время правки):
 *    правку, сделанную после возврата, не трогаем. Решённые записи убираются, нерешённые остаются.
 *
 * Записи несут владельца: чужие не применяются и не теряются.
 * Логи: префикс [FLASHCARD-FUTURE-STASH], только числа — без id, текста карточек и владельца.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cardEditTime } from './card_edit_time';
import type { FutureKeptLocalVersion } from './flashcard_pages_read_result';
import type { StudyTarget } from './study_target';

const LOG = '[FLASHCARD-FUTURE-STASH]';

/** Ключ аккаунта (не устройства): в копии и в стирании вместе с остальными данными аккаунта. */
export const FLASHCARD_FUTURE_KEPT_STASH_KEY = 'flashcards_force_future_kept_local_v1';

// зачем (S1e-2, п.4): значение ключа — ОДНА пара аварийной копии, а пара не делится между страницами
// (страница ≤ 512 КБ, иначе копия бросает value_upgrade_required и смена аккаунта блокируется).
// Прежний потолок 1000 записей не влезал: богатая карточка (объяснения и примеры на трёх языках,
// кириллица = 2 байта) — ~2.5 КБ, ×1000 ≈ 2.5 МБ. Поэтому два потолка: по числу (300 — с запасом
// выше реального числа конфликтов «из будущего») и по байтам (384 КБ — запас на конверт страницы и
// соседние пары). Сверх потолка отбрасываются самые старые записи, число — в лог.
export const FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES = 300;
export const FLASHCARD_FUTURE_KEPT_STASH_MAX_BYTES = 384 * 1024;
// зачем (S1e-2, п.3): записи ЧУЖОГО владельца (псевдоним merge, вопрос координатору) не применяются;
// старше 30 дней — как срок аварийной копии — их удаляем при применении, чтобы не копились.
const FOREIGN_ENTRY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Локальные версии одного списка карточек (ключ хранилища + язык). */
export type FutureKeptLocalGroup = Readonly<{
  key: string;
  target: StudyTarget;
  versions: readonly FutureKeptLocalVersion[];
}>;

type StashEntry = Readonly<{
  owner: string;
  target: string;
  id: string;
  card: Record<string, unknown>;
  /** Время правки облачной версии «из будущего» — по нему узнаём её на телефоне после возврата. */
  remoteEditTime: number;
  at: number;
}>;

function errorReason(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 80);
}

function isStashEntry(value: unknown): value is StashEntry {
  const entry = value as Partial<StashEntry> | null;
  return entry !== null && typeof entry === 'object'
    && typeof entry.owner === 'string' && entry.owner.length > 0
    && typeof entry.target === 'string' && entry.target.length > 0
    && typeof entry.id === 'string' && entry.id.length > 0
    && entry.card !== null && typeof entry.card === 'object' && !Array.isArray(entry.card)
    && typeof entry.remoteEditTime === 'number' && Number.isSafeInteger(entry.remoteEditTime)
    && typeof entry.at === 'number' && Number.isFinite(entry.at);
}

/** Разобрать значение ключа. null-значение → []; битое → null (вызывающий решает, что делать). */
function parseStash(raw: string | null, stage: string): StashEntry[] | null {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const entries = (parsed as { entries?: unknown } | null)?.entries;
    if ((parsed as { v?: unknown } | null)?.v !== 1 || !Array.isArray(entries)) {
      console.warn(`${LOG} ${stage} unparsable reason=shape`);
      return null;
    }
    const valid = entries.filter(isStashEntry);
    if (valid.length !== entries.length) {
      console.warn(`${LOG} ${stage} invalid_entries dropped=${entries.length - valid.length}`);
    }
    return valid;
  } catch (error) {
    console.warn(`${LOG} ${stage} unparsable reason=${errorReason(error)}`);
    return null;
  }
}

const entryIdentity = (entry: StashEntry): string => `${entry.owner}\u0000${entry.target}\u0000${entry.id}`;

/** Длина строки в байтах UTF-8 (без TextEncoder — его может не быть в движке). */
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

const serialize = (entries: readonly StashEntry[]): string => JSON.stringify({ v: 1, entries });

/** S1e-2: потолки по числу и по байтам; остаются самые свежие (вход отсортирован по времени). */
function capEntries(sorted: readonly StashEntry[]): StashEntry[] {
  let kept = sorted.length > FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES
    ? sorted.slice(sorted.length - FLASHCARD_FUTURE_KEPT_STASH_MAX_ENTRIES)
    : [...sorted];
  if (kept.length < sorted.length) {
    console.warn(`${LOG} cap_reached reason=count dropped_oldest=${sorted.length - kept.length}`);
  }
  // Байты: конверт + записи + запятые; считаем по записи, без повторной сериализации всего списка.
  const sizes = kept.map((entry) => utf8Bytes(JSON.stringify(entry)) + 1);
  let total = utf8Bytes(serialize([])) + sizes.reduce((sum, size) => sum + size, 0);
  let start = 0;
  while (total > FLASHCARD_FUTURE_KEPT_STASH_MAX_BYTES && start < kept.length) {
    total -= sizes[start];
    start += 1;
  }
  if (start > 0) {
    console.warn(`${LOG} cap_reached reason=bytes dropped_oldest=${start} kept=${kept.length - start}`);
    kept = kept.slice(start);
  }
  return kept;
}

/** Объединить записи: по (владелец, язык, id) остаётся более поздняя; потолки — самые свежие. */
function mergeEntries(base: readonly StashEntry[], extra: readonly StashEntry[]): StashEntry[] {
  const byIdentity = new Map<string, StashEntry>();
  for (const entry of [...base, ...extra]) {
    const known = byIdentity.get(entryIdentity(entry));
    if (known === undefined || entry.at >= known.at) byIdentity.set(entryIdentity(entry), entry);
  }
  return capEntries([...byIdentity.values()].sort((a, b) => a.at - b.at));
}

/**
 * S1e-2 (п.2): ключ стирается вместе с аккаунтом. Если он не пуст и в аварийную копию не попал
 * (presync гостя с успешной выгрузкой: свап без копии), пишем число — редкий случай становится видимым.
 * Только лог, стирание не останавливает.
 */
export function logFutureKeptStashBeforeWipe(stashRaw: string | null, inBackup: boolean): void {
  if (stashRaw === null || inBackup) return;
  const entries = parseStash(stashRaw, 'wipe');
  console.warn(`${LOG} future_kept_stash_wiped count=${entries === null ? 'unparsable' : entries.length}`);
}

/**
 * S1e: объединить значение ключа на телефоне с тем же ключом из прежней копии ТОГО ЖЕ владельца.
 * Чистая функция (кроме логов). Возвращает новое значение для копии; нечего объединять — live как есть.
 * зачем: новая копия заменяет прежнюю целиком — без этого записи прежней копии пропали бы.
 */
export function mergeFutureKeptStashRaw(liveRaw: string | null, carriedRaw: string | null): string | null {
  if (carriedRaw === null) return liveRaw;
  const carried = parseStash(carriedRaw, 'backup carry_previous');
  if (carried === null || carried.length === 0) {
    console.log(`${LOG} backup carry from_previous_copy=0 reason=${carried === null ? 'unparsable' : 'empty'}`);
    return liveRaw;
  }
  // Битое значение на телефоне не спасти — берём записи прежней копии (причина уже в логе).
  const live = parseStash(liveRaw, 'backup carry_live') ?? [];
  const merged = mergeEntries(carried, live);
  console.log(`${LOG} backup carry from_previous_copy=${carried.length} total=${merged.length}`);
  return serialize(merged);
}

/**
 * S1e: положить локальные версии оставленных карточек в ключ аккаунта (объединяя с уже лежащими).
 * true — сохранено (или нечего сохранять); false — запись не удалась/не подтвердилась:
 * вызывающий (forceSyncToCloud) отказывает переносу, чтобы смена аккаунта не стёрла правку.
 */
export async function stashForceFutureKeptLocalVersions(
  owner: string,
  groups: readonly FutureKeptLocalGroup[],
): Promise<boolean> {
  const at = Date.now();
  const fresh: StashEntry[] = [];
  let unusable = 0;
  for (const group of groups) {
    for (const version of group.versions) {
      const local = version.local as Record<string, unknown> | null;
      const id = local?.id;
      const remoteEditTime = cardEditTime(version.remote);
      if (local === null || typeof local !== 'object' || Array.isArray(local) || typeof id !== 'string'
        || id.length === 0 || remoteEditTime === null) {
        unusable += 1;
        continue;
      }
      fresh.push({ owner, target: group.target, id, card: local, remoteEditTime, at });
    }
  }
  if (unusable > 0) {
    // Без id карточку при возврате не узнать; у конфликтной пары id есть всегда — это сигнал бага.
    console.warn(`${LOG} stash unusable_versions=${unusable}`);
  }
  if (fresh.length === 0) {
    console.log(`${LOG} stash skip reason=nothing_kept`);
    return true;
  }
  const lists = groups.filter((group) => group.versions.length > 0).length;
  try {
    const existing = parseStash(await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY), 'stash existing');
    // Битое прежнее значение не спасти — перезаписываем (причина уже в логе).
    const merged = mergeEntries(existing ?? [], fresh);
    const raw = serialize(merged);
    await AsyncStorage.setItem(FLASHCARD_FUTURE_KEPT_STASH_KEY, raw);
    if (await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY) !== raw) {
      console.warn(`${LOG} stash verify_failed cards=${fresh.length}`);
      return false;
    }
    console.log(`${LOG} stash saved cards=${fresh.length} lists=${lists} total=${merged.length}`);
    return true;
  } catch (error) {
    console.warn(`${LOG} stash write_failed cards=${fresh.length} reason=${errorReason(error)}`);
    return false;
  }
}

/** Замена версий в локальном списке (очередь записи хука): решение — по СВЕЖЕЙ карточке. */
export type FutureKeptLocalReplacer = (
  target: StudyTarget,
  decide: (card: Readonly<Record<string, unknown>>) => Record<string, unknown> | null,
) => Promise<number>;

const defaultReplacer: FutureKeptLocalReplacer = async (target, decide) => {
  // зачем require: хук тянет UI-зависимости; грузим его только когда есть что вернуть.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
  return store.replaceSavedFlashcardsFromAccountsV2(target, (fresh) => (
    decide(fresh as unknown as Readonly<Record<string, unknown>>) as unknown as import('../hooks/use-flashcards').Flashcard | null
  ));
};

export type FutureKeptApplyStatus = 'none' | 'read_failed' | 'unparsable' | 'no_owner' | 'no_own_entries' | 'applied';

export type FutureKeptApplyResult = Readonly<{
  status: FutureKeptApplyStatus;
  replaced: number;
  /** Записи, оставшиеся в ключе (чужие + языки, где замена не удалась). */
  kept: number;
}>;

/** Оставшиеся записи → ключ (пусто — удалить). Сбой не бросает: повтор безопасен. */
async function writeRemaining(remaining: readonly StashEntry[]): Promise<void> {
  try {
    if (remaining.length === 0) await AsyncStorage.removeItem(FLASHCARD_FUTURE_KEPT_STASH_KEY);
    else await AsyncStorage.setItem(FLASHCARD_FUTURE_KEPT_STASH_KEY, serialize(remaining));
  } catch (error) {
    // Ключ остался прежним: повторное применение безопасно (заменяется только облачная версия).
    console.warn(`${LOG} apply cleanup_failed reason=${errorReason(error)}`);
  }
}

type TargetCounters = { replaced: number; already: number; changed: number; seen: Set<string> };

/**
 * S1e: после доливания аварийной копии при входе вернуть локальные версии в список.
 * Карточка заменяется, только если на телефоне всё ещё облачная версия «из будущего» (то же время
 * правки). Уже своя версия / правка после возврата / карточки больше нет — запись решена, не трогаем.
 * Никогда не бросает.
 */
export async function applyFutureKeptStashAfterReturn(
  currentOwner: string | null,
  deps: Readonly<{ replace?: FutureKeptLocalReplacer }> = {},
): Promise<FutureKeptApplyResult> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(FLASHCARD_FUTURE_KEPT_STASH_KEY);
  } catch (error) {
    console.warn(`${LOG} apply read_failed reason=${errorReason(error)}`);
    return { status: 'read_failed', replaced: 0, kept: 0 };
  }
  if (raw === null) {
    console.log(`${LOG} apply skip reason=no_stash`);
    return { status: 'none', replaced: 0, kept: 0 };
  }
  const entries = parseStash(raw, 'apply');
  if (entries === null) {
    // Ранний выход: битое значение не трогаем — его можно разобрать вручную (поддержка).
    return { status: 'unparsable', replaced: 0, kept: 0 };
  }
  if (!currentOwner) {
    console.warn(`${LOG} apply skip reason=no_owner entries=${entries.length}`);
    return { status: 'no_owner', replaced: 0, kept: entries.length };
  }
  const own = entries.filter((entry) => entry.owner === currentOwner);
  const foreignAll = entries.filter((entry) => entry.owner !== currentOwner);
  const foreignCutoff = Date.now() - FOREIGN_ENTRY_MAX_AGE_MS;
  const foreign = foreignAll.filter((entry) => entry.at >= foreignCutoff);
  const foreignExpired = foreignAll.length - foreign.length;
  if (foreignExpired > 0) console.log(`${LOG} apply foreign_expired dropped=${foreignExpired}`);
  if (own.length === 0) {
    if (foreignExpired > 0) await writeRemaining(foreign);
    console.log(`${LOG} apply skip reason=no_own_entries other_owner=${foreign.length}`);
    return { status: 'no_own_entries', replaced: 0, kept: foreign.length };
  }
  const replace = deps.replace ?? defaultReplacer;
  const targets = [...new Set(own.map((entry) => entry.target))];
  const unresolved: StashEntry[] = [...foreign];
  let replacedTotal = 0;
  for (const target of targets) {
    const byId = new Map(own.filter((entry) => entry.target === target).map((entry) => [entry.id, entry]));
    const counters: TargetCounters = { replaced: 0, already: 0, changed: 0, seen: new Set() };
    let result: number;
    try {
      result = await replace(target as StudyTarget, (fresh) => {
        const id = fresh.id;
        const entry = typeof id === 'string' ? byId.get(id) : undefined;
        if (entry === undefined) return null;
        counters.seen.add(entry.id);
        const freshTime = cardEditTime(fresh);
        if (freshTime === entry.remoteEditTime) {
          counters.replaced += 1;
          return entry.card;
        }
        if (freshTime === cardEditTime(entry.card)) counters.already += 1;
        else counters.changed += 1;
        return null;
      });
    } catch (error) {
      console.warn(`${LOG} apply target=${target} result=replace_error reason=${errorReason(error)} kept=${byId.size}`);
      unresolved.push(...byId.values());
      continue;
    }
    if (result < 0) {
      // Аккаунт сменился / запись не прошла — записи остаются до следующего входа.
      console.warn(`${LOG} apply target=${target} result=replace_failed kept=${byId.size}`);
      unresolved.push(...byId.values());
      continue;
    }
    replacedTotal += result;
    const missing = byId.size - counters.seen.size;
    console.log(`${LOG} apply target=${target} replaced=${result} already=${counters.already} changed_since=${counters.changed} missing=${missing} result=ok`);
  }
  await writeRemaining(unresolved);
  console.log(`${LOG} apply done replaced=${replacedTotal} kept=${unresolved.length} other_owner=${foreign.length}`);
  return { status: 'applied', replaced: replacedTotal, kept: unresolved.length };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
