/**
 * Ник автора набора сообщества (замечание владельца после теста на iPhone).
 *
 * Было: на экране/плитке набора показывался технический идентификатор автора
 * (`authorStableId`, обрезанный до 24 символов) — пользователь видел «сырой UID».
 * Стало: показываем НИК того, кто разместил набор:
 *   • свой набор → локальный ник из `user_name` (Настройки → «Имя / никнейм»);
 *   • чужой набор → `public_profiles/{authorStableId}.name` (тот же документ,
 *     из которого система друзей/профилей берёт отображаемое имя);
 *   • ника нет / нет облака → аккуратный нейтральный фолбэк («Автор сообщества»),
 *     но НИКОГДА не сырой идентификатор.
 *
 * Кэш: память + AsyncStorage (7 дней) — каталог из 40 наборов не должен делать
 * 40 чтений Firestore при каждом заходе.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { getCanonicalUserId } from '../user_id_policy';
import { triLang, type Lang } from '../../constants/i18n';

const AUTHOR_NAME_CACHE_KEY = 'community_pack_author_names_v1';
const AUTHOR_NAME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AUTHOR_NAME_MAX_LEN = 32;

type CacheRecord = { name: string; at: number };

let memCache: Record<string, CacheRecord> | null = null;
const inFlight = new Map<string, Promise<string>>();

/** Нейтральная подпись, когда ник недоступен. Ни при каких условиях не UID. */
export function communityAuthorFallbackName(lang: Lang): string {
  return triLang(lang, {
    ru: 'Автор сообщества',
    uk: 'Автор спільноти',
    en: 'Community author',
    es: 'Autor de la comunidad',
    'pt-BR': 'Autor da comunidade',
    vi: 'Tác giả cộng đồng',
    id: 'Penulis komunitas',
    tr: 'Topluluk yazarı',
    pl: 'Autor społeczności',
  });
}

/**
 * Похоже ли значение на технический идентификатор, а не на ник.
 *
 * Легаси-документы каталога клали в `authorName` обрезанный stableId, поэтому
 * такие значения нужно отбрасывать даже там, где поле формально заполнено.
 */
export function looksLikeRawUserId(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (v === 'Community' || v === 'Unknown') return true;
  if (v.includes(' ')) return false;
  /** stableId / uid: длинная строка без пробелов из id-алфавита. */
  if (v.length >= 16 && /^[A-Za-z0-9_:.-]+$/.test(v)) return true;
  /** hex/uuid-подобные хвосты любой длины от 12 символов. */
  if (v.length >= 12 && /^[0-9a-f-]+$/i.test(v)) return true;
  return false;
}

function sanitizeNickname(raw: unknown): string {
  const v = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!v) return '';
  if (looksLikeRawUserId(v)) return '';
  return v.slice(0, AUTHOR_NAME_MAX_LEN);
}

async function readCache(): Promise<Record<string, CacheRecord>> {
  if (memCache) return memCache;
  try {
    const raw = await AsyncStorage.getItem(AUTHOR_NAME_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    memCache =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, CacheRecord>)
        : {};
  } catch {
    memCache = {};
  }
  return memCache;
}

async function writeCache(sid: string, name: string): Promise<void> {
  const cache = await readCache();
  cache[sid] = { name, at: Date.now() };
  try {
    await AsyncStorage.setItem(AUTHOR_NAME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* кэш — не критичный путь */
  }
}

/** Свой ник из настроек аккаунта («Имя / никнейм»). */
export async function loadOwnNickname(): Promise<string> {
  try {
    return sanitizeNickname(await AsyncStorage.getItem('user_name'));
  } catch {
    return '';
  }
}

async function fetchPublicProfileName(sid: string): Promise<string> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return '';
  try {
    const snap = await firestore().collection('public_profiles').doc(sid).get();
    if (!snap.exists) return '';
    return sanitizeNickname((snap.data() as Record<string, unknown> | undefined)?.name);
  } catch {
    return '';
  }
}

/**
 * Ник автора по его stableId. Пустая строка = ника нет (вызывающий рисует фолбэк).
 * Свой id разрешается локально и не ходит в сеть.
 */
export async function resolveCommunityAuthorNickname(
  authorStableId: string | null | undefined,
): Promise<string> {
  const sid = String(authorStableId ?? '').trim();
  if (!sid) return '';

  const own = await getCanonicalUserId().catch(() => null);
  if (own && own === sid) {
    const mine = await loadOwnNickname();
    if (mine) return mine;
  }

  const cache = await readCache();
  const hit = cache[sid];
  if (hit && Date.now() - hit.at < AUTHOR_NAME_TTL_MS) return hit.name;

  const pending = inFlight.get(sid);
  if (pending) return pending;

  const task = (async () => {
    const name = await fetchPublicProfileName(sid);
    await writeCache(sid, name);
    return name;
  })().finally(() => {
    inFlight.delete(sid);
  });
  inFlight.set(sid, task);
  return task;
}

export type PackAuthorRef = {
  authorStableId?: string;
  /** Легаси-поле каталога: может содержать обрезанный UID — тогда игнорируется. */
  authorName?: string;
};

/**
 * Готовая к показу подпись автора: ник, иначе нейтральный фолбэк.
 * Сырой идентификатор не возвращается никогда.
 */
export function communityAuthorLabel(nickname: string, lang: Lang): string {
  const nick = sanitizeNickname(nickname);
  return nick || communityAuthorFallbackName(lang);
}

/** Ник автора набора для UI. Пока грузится — нейтральный фолбэк, не UID. */
export function useCommunityAuthorName(pack: PackAuthorRef | null | undefined, lang: Lang): string {
  const sid = String(pack?.authorStableId ?? '').trim();
  const seed = sanitizeNickname(pack?.authorName);
  const [nick, setNick] = useState<string>(seed);

  useEffect(() => {
    let cancelled = false;
    setNick(seed);
    if (!sid) return () => { cancelled = true; };
    void resolveCommunityAuthorNickname(sid).then((n) => {
      if (!cancelled && n) setNick(n);
    });
    return () => {
      cancelled = true;
    };
  }, [sid, seed]);

  return communityAuthorLabel(nick, lang);
}

/** Только для тестов: сбросить кэш ников между кейсами. */
export function __resetCommunityAuthorNameCacheForTests(): void {
  memCache = null;
  inFlight.clear();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
