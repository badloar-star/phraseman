import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flashcardsCommunityOwnedPacksKey,
  flashcardsCommunityOwnedPackTitlesKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { DebugLogger } from '../debug-logger';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import { captureAccountsV2OwnerUid, produceAccountsV2ChangeIfEnabled } from '../accounts_v2_client_flag';
import { BoundedScopeCache, parseStrictArrayJson } from '../flashcards/myPacksDataIntegrity';
import { devCommunityMarkOwned, getDevCommunityOwnedIds, isDevCommunityPackId } from '../dev_cards_state';
import { notifyOwnedPackIdsChanged } from './owned_pack_ids_signal';
import { hideRemovedOwnedIds, loadOwnedTombstones, stampOwnedTombstone } from './community_owned_tombstones';

const warmOwnedIdsByKey = new BoundedScopeCache<string[]>(16);

function warmOwnedIdsKey(storageKey: string, token: AccountGenerationToken): string | null {
  const scope = accountScopeKey(token);
  return scope ? `${scope}|storage:${storageKey}` : null;
}

export type CommunityOwnedPackIdsLoadResult = {
  ids: string[];
  status: 'ready' | 'stale';
};

/** Status-aware read for callers that must distinguish empty from unreadable. */
export async function loadCommunityOwnedPackIdsResult(
  studyTarget?: RuntimeStudyTarget,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<CommunityOwnedPackIdsLoadResult> {
  const key = flashcardsCommunityOwnedPacksKey(studyTarget);
  const cacheKey = warmOwnedIdsKey(key, accountToken);
  if (!cacheKey || !isCurrentAccountGeneration(accountToken)) {
    // зачем (сперва логи): немой отказ здесь выглядел как «своих наборов нет».
    console.warn('[PACKS-OWNED] load:stale', JSON.stringify({ reason: !cacheKey ? `account_phase_${accountToken.phase}` : 'account_generation_changed', key }));
    return { ids: [], status: 'stale' };
  }
  try {
    const parsed = parseStrictArrayJson(
      await AsyncStorage.getItem(key),
      (value): value is string => typeof value === 'string',
    );
    if (!isCurrentAccountGeneration(accountToken)) {
      console.warn('[PACKS-OWNED] load:stale', JSON.stringify({ reason: 'account_generation_changed_after_read', key }));
      return { ids: [], status: 'stale' };
    }
    if (parsed.status === 'ready') {
      // зачем (R47): объединение при восстановлении возвращает убранный набор — прячем id, чьё победившее событие «убрано» (надгробие новее добавления).
      const tombstones = await loadOwnedTombstones(studyTarget);
      const visibleItems = hideRemovedOwnedIds(parsed.items, tombstones);
      if (visibleItems.length !== parsed.items.length) {
        console.log(`[MY-PACKS] tombstone hide key=${key} raw=${parsed.items.length} visible=${visibleItems.length} hidden=${parsed.items.filter((id) => !visibleItems.includes(id)).join(',')}`); // guard-ok: какие id спрятаны
      }
      if (!isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
      warmOwnedIdsByKey.set(cacheKey, visibleItems);
      // зачем (съёмка R1): «добавленные» в памяти демо-наборы (dev `community=`) видны рядом с настоящими; в хранилище их нет.
      const devOwned = getDevCommunityOwnedIds().filter((id) => !visibleItems.includes(id));
      return { ids: devOwned.length ? [...visibleItems, ...devOwned] : visibleItems, status: 'ready' };
    }
    console.warn('[PACKS-OWNED] load:unreadable -> warm copy', JSON.stringify({ key, parseStatus: parsed.status }));
    return { ids: warmOwnedIdsByKey.get(cacheKey) ?? [], status: 'stale' };
  } catch (error) {
    console.warn('[PACKS-OWNED] load:catch -> warm copy', JSON.stringify({ key }), error instanceof Error ? error.message : String(error));
    return isCurrentAccountGeneration(accountToken)
      ? { ids: warmOwnedIdsByKey.get(cacheKey) ?? [], status: 'stale' }
      : { ids: [], status: 'stale' };
  }
}

export async function loadCommunityOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return (await loadCommunityOwnedPackIdsResult(studyTarget)).ids;
}

/** Локальная мета набора для выбора: название и фактическая рубашка UGC-пака. */
export type CommunityOwnedPackTitle = {
  titleRu: string;
  titleUk: string;
  titleEs: string;
};

function parseTitles(raw: string | null): Record<string, CommunityOwnedPackTitle> {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== 'object') return {};
    const out: Record<string, CommunityOwnedPackTitle> = {};
    for (const [id, v] of Object.entries(p as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const t = v as Record<string, unknown>;
      out[id] = {
        titleRu: typeof t.titleRu === 'string' ? t.titleRu : '',
        titleUk: typeof t.titleUk === 'string' ? t.titleUk : '',
        titleEs: typeof t.titleEs === 'string' ? t.titleEs : '',
      };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Заголовки набранных community-паков по id — читает `deck_options.packTitle`, когда
 * самого объекта пака нет под рукой (набор не входит в BUNDLED_MARKETPLACE_PACKS).
 * Без сети: пишется тут же, в момент появления id (см. `addCommunityOwnedPackId`).
 */
export async function loadCommunityOwnedPackTitles(
  studyTarget?: RuntimeStudyTarget,
): Promise<Record<string, CommunityOwnedPackTitle>> {
  try {
    return parseTitles(await AsyncStorage.getItem(flashcardsCommunityOwnedPackTitlesKey(studyTarget)));
  } catch {
    return {};
  }
}

function sameTitle(left: CommunityOwnedPackTitle | undefined, right: CommunityOwnedPackTitle): boolean {
  return left !== undefined && left.titleRu === right.titleRu && left.titleUk === right.titleUk && left.titleEs === right.titleEs;
}

export async function addCommunityOwnedPackId(
  id: string,
  studyTarget?: RuntimeStudyTarget,
  title?: CommunityOwnedPackTitle,
): Promise<void> {
  // зачем (съёмка R1): демо-набор «добавляется» только в память — ни хранилища, ни операции Account V2.
  if (isDevCommunityPackId(id)) {
    devCommunityMarkOwned(id);
    return;
  }
  // зачем (6F ремонт №1, P2): владелец V2-операции — аккаунт в момент записи, не в момент постановки.
  const v2Owner = captureAccountsV2OwnerUid();
  const cur = await loadCommunityOwnedPackIds(studyTarget);
  let packIds = cur;
  let libraryChanged = false;
  if (!cur.includes(id)) {
    const next = [...cur, id];
    const key = flashcardsCommunityOwnedPacksKey(studyTarget);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    const token = captureAccountGeneration();
    const cacheKey = warmOwnedIdsKey(key, token);
    if (cacheKey && isCurrentAccountGeneration(token)) warmOwnedIdsByKey.set(cacheKey, next);
    packIds = next;
    libraryChanged = true;
    // зачем (R47): добавление — событие «добавлено» со своим временем: оно перебивает более раннее надгробие (на этом и других устройствах); права на платный набор не при чём.
    await stampOwnedTombstone(id, false, studyTarget).catch((error: unknown) => {
      console.warn(`[MY-PACKS] tombstone add-stamp FAILED pack=${id} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
    });
  }
  // зачем: сохраняем название рядом с id в момент добавления набора — единственный
  // надёжный момент, когда оно точно есть под рукой, без похода в сеть позже
  // (шит «Что слушаем?» иначе показывал сырой id вместо названия — жалоба владельца).
  let titles: Record<string, CommunityOwnedPackTitle> | null = null;
  if (title && (title.titleRu || title.titleUk || title.titleEs)) {
    try {
      const loaded = await loadCommunityOwnedPackTitles(studyTarget);
      titles = loaded;
      // зачем (7C): то же название не переписываем — ни лишней записи, ни лишней операции V2.
      if (!sameTitle(loaded[id], title)) {
        titles = { ...loaded, [id]: title };
        await AsyncStorage.setItem(flashcardsCommunityOwnedPackTitlesKey(studyTarget), JSON.stringify(titles));
        libraryChanged = true;
      }
    } catch (e) {
      // не критично — фолбэк на код набора остаётся рабочим
      DebugLogger.error('communityOwnedStorage:titles', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  if (libraryChanged) {
    // зачем (Account V2, 6F, dual-write): набор добавлен в библиотеку → операция V2
    // `<target>:community_packs` { itemIds }. Фоном, за флагом.
    // зачем (7C): вместе с локальными названиями — производитель шлёт ОТДЕЛЬНОЙ операцией
    // только изменившиеся, чтобы новая установка показывала название, а не код набора.
    emitLibrarySnapshot(v2Owner, storageStudyTarget(studyTarget), packIds, titles);
  }
}

/** Единственное место, где состав библиотеки уходит в Account V2 (добавление и «убрать из моих» — один путь, сервер сам различает добавленные и снятые id). */
function emitLibrarySnapshot(
  v2Owner: ReturnType<typeof captureAccountsV2OwnerUid>,
  target: ReturnType<typeof storageStudyTarget>,
  packIds: readonly string[],
  snapshotTitles: Record<string, CommunityOwnedPackTitle> | null,
): void {
  produceAccountsV2ChangeIfEnabled(v2Owner, () => ({ kind: 'library_snapshot', target, packIds,
    ...(snapshotTitles === null ? {} : { titles: snapshotTitles }) }));
}

/**
 * «Убрать из моих» для ЧУЖОГО набора (добавленного из сообщества или из видео). Не серверное «удалить как автор» — набор остаётся у автора.
 *
 * зачем (Ревизор R47, координатор 15.10): функции «убрать из библиотеки» не было — «Удалить набор» звал серверное удаление автора, чужой набор отвечал not_author, исчезал и возвращался с тостом об ошибке.
 * Локально и мгновенно: id снят из списка, прогретая копия и локальное название обновлены; в облако уходит снимок библиотеки без этого id — планировщик Account V2 превращает снятый id в removeItemIds,
 * то есть сервер ставит tombstone, и гидрация при следующем входе (`removedIds` в merge) набор не вернёт. Новых чтений Firestore нет.
 * Результат: 'removed' — убран; 'not_owned' — такого id в «моих» нет (например, купленный официальный набор); 'stale' — хранилище нечитаемо/аккаунт сменился (ничего не писали).
 */
export async function removeCommunityOwnedPackId(
  id: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<'removed' | 'not_owned' | 'stale'> {
  if (isDevCommunityPackId(id)) return 'removed';
  const v2Owner = captureAccountsV2OwnerUid();
  const token = captureAccountGeneration();
  const loaded = await loadCommunityOwnedPackIdsResult(studyTarget, token);
  if (loaded.status !== 'ready' || !isCurrentAccountGeneration(token)) {
    console.warn(`[MY-PACKS] remove skip pack=${id} reason=${loaded.status === 'ready' ? 'account_changed' : 'storage_stale'}`); // guard-ok: ранний выход с причиной
    return 'stale';
  }
  if (!loaded.ids.includes(id)) {
    console.log(`[MY-PACKS] remove pack=${id} result=not_owned owned=${loaded.ids.length}`); // guard-ok: набора нет в «моих»
    return 'not_owned';
  }
  const next = loaded.ids.filter((item) => item !== id);
  const key = flashcardsCommunityOwnedPacksKey(studyTarget);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  const cacheKey = warmOwnedIdsKey(key, token);
  if (cacheKey && isCurrentAccountGeneration(token)) warmOwnedIdsByKey.set(cacheKey, next);
  let titles: Record<string, CommunityOwnedPackTitle> | null = null;
  try {
    const current = await loadCommunityOwnedPackTitles(studyTarget);
    if (id in current) {
      titles = Object.fromEntries(Object.entries(current).filter(([packId]) => packId !== id));
      await AsyncStorage.setItem(flashcardsCommunityOwnedPackTitlesKey(studyTarget), JSON.stringify(titles));
    }
  } catch (e) {
    DebugLogger.error('communityOwnedStorage:remove_titles', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
  const target = storageStudyTarget(studyTarget);
  // зачем (R47): надгробие для легаси-синка + выгрузка существующим путём (без отдельного документа).
  await stampOwnedTombstone(id, true, studyTarget).catch((error: unknown) => {
    console.warn(`[MY-PACKS] tombstone remove-stamp FAILED pack=${id} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
  });
  void import('../cloud_sync').then((mod) => mod.syncToCloud()).catch((error: unknown) => {
    console.warn(`[MY-PACKS] tombstone syncToCloud FAILED pack=${id} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
  });
  emitLibrarySnapshot(v2Owner, target, next, titles);
  notifyOwnedPackIdsChanged(); // строки видео-наборов и экран ролика сразу снова предлагают «Добавить»
  console.log(`[MY-PACKS] remove pack=${id} result=removed owned_before=${loaded.ids.length} owned_after=${next.length} target=${target} synced=tombstone_via_snapshot`); // guard-ok: итог убирания
  return 'removed';
}

/**
 * Account V2, Пакет 6G — гидрация библиотеки наборов из своей учётки V2.
 * зачем: новая установка получает наборы, добавленные на другом телефоне.
 * Правило «объединение с tombstone»: добавляем живые id сервера, которых нет
 * локально; id, удалённые на сервере (tombstone), НЕ добавляем; локальные id
 * не удаляем никогда (удаление — только явное действие человека). Хранилище
 * нечитаемо (stale) — не пишем вовсе, чтобы не затереть его частичным списком.
 * Возвращает число добавленных; -1 — пропуск (лог).
 */
export async function mergeCommunityOwnedPackIdsFromAccountsV2(
  serverIds: readonly string[],
  removedIds: readonly string[],
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const token = captureAccountGeneration();
  const loaded = await loadCommunityOwnedPackIdsResult(studyTarget, token);
  if (loaded.status !== 'ready' || !isCurrentAccountGeneration(token)) {
    console.warn(`[ACCOUNT-V2] hydrate library skip reason=${loaded.status === 'ready' ? 'account_changed' : 'storage_stale'}`);
    return -1;
  }
  const removed = new Set(removedIds);
  const known = new Set(loaded.ids);
  const additions = serverIds.filter((id) => typeof id === 'string' && id.length > 0 && !known.has(id) && !removed.has(id));
  if (additions.length === 0) return 0;
  const next = [...loaded.ids, ...new Set(additions)];
  const key = flashcardsCommunityOwnedPacksKey(studyTarget);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  const cacheKey = warmOwnedIdsKey(key, token);
  if (cacheKey && isCurrentAccountGeneration(token)) warmOwnedIdsByKey.set(cacheKey, next);
  return next.length - loaded.ids.length;
}

/**
 * Account V2, Пакет 7C — названия наборов из своей учётки V2 (гидрация).
 * зачем: новая установка получала только id, и выбор наборов показывал сырой
 * код набора. Правило: название пишется только для набора, который есть в
 * локальной библиотеке, и только если локального названия нет (локальное не
 * затираем никогда). Хранилище наборов или названий нечитаемо — не пишем вовсе.
 * Возвращает число записанных названий; -1 — пропуск (лог).
 */
export async function mergeCommunityOwnedPackTitlesFromAccountsV2(
  serverTitles: Readonly<Record<string, CommunityOwnedPackTitle>>,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const token = captureAccountGeneration();
  const loaded = await loadCommunityOwnedPackIdsResult(studyTarget, token);
  if (loaded.status !== 'ready' || !isCurrentAccountGeneration(token)) {
    console.warn(`[ACCOUNT-V2] hydrate library_titles skip reason=${loaded.status === 'ready' ? 'account_changed' : 'storage_stale'}`);
    return -1;
  }
  const key = flashcardsCommunityOwnedPackTitlesKey(studyTarget);
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[ACCOUNT-V2] hydrate library_titles skip reason=titles_unreadable kind=${error instanceof Error ? error.name : typeof error}`);
    return -1;
  }
  // зачем: битое хранилище названий нельзя «починить» записью только серверных —
  // parseTitles вернул бы {} и затёр бы все локальные названия.
  if (raw !== null) {
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('[ACCOUNT-V2] hydrate library_titles skip reason=titles_malformed');
      return -1;
    }
  }
  const local = parseTitles(raw);
  const owned = new Set(loaded.ids);
  const next: Record<string, CommunityOwnedPackTitle> = { ...local };
  let written = 0;
  for (const [id, title] of Object.entries(serverTitles)) {
    if (!owned.has(id) || !title || !(title.titleRu || title.titleUk || title.titleEs)) continue;
    const mine = local[id];
    if (mine && (mine.titleRu || mine.titleUk || mine.titleEs)) continue;
    // зачем: defineProperty — id `__proto__` остаётся обычным полем, прототип не подменяется.
    Object.defineProperty(next, id, {
      value: { titleRu: String(title.titleRu ?? ''), titleUk: String(title.titleUk ?? ''), titleEs: String(title.titleEs ?? '') },
      enumerable: true, writable: true, configurable: true,
    });
    written += 1;
  }
  if (written === 0) return 0;
  if (!isCurrentAccountGeneration(token)) {
    console.warn('[ACCOUNT-V2] hydrate library_titles skip reason=account_changed');
    return -1;
  }
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return written;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
