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
  if (!cacheKey || !isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
  try {
    const parsed = parseStrictArrayJson(
      await AsyncStorage.getItem(key),
      (value): value is string => typeof value === 'string',
    );
    if (!isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
    if (parsed.status === 'ready') {
      warmOwnedIdsByKey.set(cacheKey, parsed.items);
      return { ids: parsed.items, status: 'ready' };
    }
    return { ids: warmOwnedIdsByKey.get(cacheKey) ?? [], status: 'stale' };
  } catch {
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

export async function addCommunityOwnedPackId(
  id: string,
  studyTarget?: RuntimeStudyTarget,
  title?: CommunityOwnedPackTitle,
): Promise<void> {
  // зачем (6F ремонт №1, P2): владелец V2-операции — аккаунт в момент записи, не в момент постановки.
  const v2Owner = captureAccountsV2OwnerUid();
  const cur = await loadCommunityOwnedPackIds(studyTarget);
  if (!cur.includes(id)) {
    const next = [...cur, id];
    const key = flashcardsCommunityOwnedPacksKey(studyTarget);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    const token = captureAccountGeneration();
    const cacheKey = warmOwnedIdsKey(key, token);
    if (cacheKey && isCurrentAccountGeneration(token)) warmOwnedIdsByKey.set(cacheKey, next);
    // зачем (Account V2, 6F, dual-write): набор добавлен в библиотеку → операция V2
    // `<target>:community_packs` { itemIds }. Фоном, за флагом.
    const target = storageStudyTarget(studyTarget);
    produceAccountsV2ChangeIfEnabled(v2Owner, () => ({ kind: 'library_snapshot', target, packIds: next }));
  }
  // зачем: сохраняем название рядом с id в момент добавления набора — единственный
  // надёжный момент, когда оно точно есть под рукой, без похода в сеть позже
  // (шит «Что слушаем?» иначе показывал сырой id вместо названия — жалоба владельца).
  if (title && (title.titleRu || title.titleUk || title.titleEs)) {
    try {
      const titles = await loadCommunityOwnedPackTitles(studyTarget);
      titles[id] = title;
      await AsyncStorage.setItem(flashcardsCommunityOwnedPackTitlesKey(studyTarget), JSON.stringify(titles));
    } catch (e) {
      // не критично — фолбэк на код набора остаётся рабочим
      DebugLogger.error('communityOwnedStorage:titles', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
