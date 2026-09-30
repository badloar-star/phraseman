import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flashcardsCommunityOwnedPacksKey,
  flashcardsCommunityOwnedPackTitlesKey,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { DebugLogger } from '../debug-logger';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
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
  const cur = await loadCommunityOwnedPackIds(studyTarget);
  if (!cur.includes(id)) {
    const next = [...cur, id];
    const key = flashcardsCommunityOwnedPacksKey(studyTarget);
    await AsyncStorage.setItem(key, JSON.stringify(next));
    const token = captureAccountGeneration();
    const cacheKey = warmOwnedIdsKey(key, token);
    if (cacheKey && isCurrentAccountGeneration(token)) warmOwnedIdsByKey.set(cacheKey, next);
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

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
