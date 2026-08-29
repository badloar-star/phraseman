import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flashcardsCommunityOwnedPacksKey,
  flashcardsCommunityOwnedPackTitlesKey,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { DebugLogger } from '../debug-logger';

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function loadCommunityOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  try {
    return parseIds(await AsyncStorage.getItem(flashcardsCommunityOwnedPacksKey(studyTarget)));
  } catch {
    return [];
  }
}

/** Заголовки на трёх языках — только те поля, что реально нужны шиту выбора набора. */
export type CommunityOwnedPackTitle = { titleRu: string; titleUk: string; titleEs: string };

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
    await AsyncStorage.setItem(flashcardsCommunityOwnedPacksKey(studyTarget), JSON.stringify([...cur, id]));
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
