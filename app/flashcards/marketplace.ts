import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { CardItem } from './types';
import bundledManifest from './bundles/bundled_marketplace_manifest.json';
import { derivePackCodeName, victoriaMetaFromPackJson, type VictoriaPackFile } from './bundles/victoriaBundleShared';
import {
  OFFICIAL_DARK_LOGIC_EN_ID,
  OFFICIAL_NEGOTIATOR_EN_ID,
  OFFICIAL_PEAKY_BLINDERS_EN_ID,
  OFFICIAL_ROYAL_TEA_EN_ID,
  OFFICIAL_WILD_WEST_EN_ID,
} from './bundles/packIds';
export type FlashcardPackCategory = 'business' | 'travel' | 'daily' | 'exam' | 'slang' | 'verbs';

const PACK_CATEGORY_ICONS: Record<FlashcardPackCategory, string> = {
  business: 'briefcase-outline',
  travel: 'airplane-outline',
  daily: 'sunny-outline',
  exam: 'school-outline',
  slang: 'chatbubbles-outline',
  verbs: 'git-branch-outline',
};

/** Ionicons name for hub / shop tiles by pack category */
export function packCategoryIonIcon(category: FlashcardPackCategory): string {
  return PACK_CATEGORY_ICONS[category] ?? 'albums-outline';
}

export type FlashcardMarketPack = {
  id: string;
  /** Короткое кодове ім’я для сітки хаба (одна-дві «клички», без обрізання довгого заголовка). */
  codeName: string;
  titleRu: string;
  titleUk: string;
  /** ES — для локалі es; порожній рядок, якщо ще не заповнено в даних. */
  titleEs: string;
  descriptionRu: string;
  descriptionUk: string;
  descriptionEs: string;
  category: FlashcardPackCategory;
  cardCount: number;
  priceShards: number;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  authorName: string;
  isOfficial: boolean;
  /** Набор из community_packs (UGC); покупка через Cloud Function. */
  isCommunityUgc?: boolean;
  /** Полный authorStableId для UGC (редагування). */
  authorStableId?: string;
  /** Статус листингу з Firestore (published / update_pending …). */
  listingStatus?: string;
  /** Набір тимчасово знято з продажу — очікується повторна модерація. */
  isPendingUpdateReview?: boolean;
  /** Ключ палитри карточек UGC. */
  ugcCardThemeKey?: string;
  updatedAt: string;
};

export const DEV_OWNED_KEY = 'flashcards_market_dev_owned_v1';
/** Единое хранилище купленных наборов (DEV-маркет и покупка за осколки в shards_shop). */
export const OWNED_PACKS_KEY = 'flashcards_owned_packs_v1';
export const DEV_ACTIVE_PACK_KEY = 'flashcards_market_dev_active_pack_v1';
/** Собрані картки всіх куплених паків (після `buildMarketplaceOwnedCards`) — швидке відкрити розділ без пустого екрану. */
export const MARKETPLACE_BUILT_CARDS_CACHE_KEY = 'flashcards_market_built_cards_v1';
/** Підняти при зміні бандлів / схеми карт — інвалідує старий кеш на пристроях. */
export const MARKETPLACE_BUILT_CARDS_CACHE_EPOCH = 12;

type BuiltMarketplaceCardsCache = {
  epoch: number;
  /** `marketOwnedIdsCacheKey(ownedIds)` */
  ownedKey: string;
  cards: CardItem[];
};

export function marketOwnedIdsCacheKey(ownedIds: string[]): string {
  return [...ownedIds].sort().join('\0');
}

export async function loadBuiltMarketplaceCardsCache(): Promise<BuiltMarketplaceCardsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(MARKETPLACE_BUILT_CARDS_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as BuiltMarketplaceCardsCache;
    if (!p || p.epoch !== MARKETPLACE_BUILT_CARDS_CACHE_EPOCH) return null;
    if (typeof p.ownedKey !== 'string' || !Array.isArray(p.cards)) return null;
    return p;
  } catch {
    return null;
  }
}

export async function saveBuiltMarketplaceCardsCache(ownedIds: string[], cards: CardItem[]): Promise<void> {
  if (ownedIds.length === 0) {
    try {
      await AsyncStorage.removeItem(MARKETPLACE_BUILT_CARDS_CACHE_KEY);
    } catch {
      // ignore
    }
    return;
  }
  const payload: BuiltMarketplaceCardsCache = {
    epoch: MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
    ownedKey: marketOwnedIdsCacheKey(ownedIds),
    cards,
  };
  try {
    await AsyncStorage.setItem(MARKETPLACE_BUILT_CARDS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

const parseIdList = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export async function loadOwnedPackIds(): Promise<string[]> {
  try {
    const fromOwned = parseIdList(await AsyncStorage.getItem(OWNED_PACKS_KEY));
    const fromLegacy = parseIdList(await AsyncStorage.getItem(DEV_OWNED_KEY));
    const merged = [...new Set([...fromOwned, ...fromLegacy])];
    if (merged.length > 0 && fromOwned.length === 0 && fromLegacy.length > 0) {
      await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return [];
  }
}

/**
 * Список id паків, до яких юзер має доступ (для відображення в «Мої», кешу карт і т.д.).
 *
 * Раніше додавав «безкоштовний preview» рандомного паку з 48-год trial.
 * Ваучерна модель (див. pack_trial_gift.ts): сам факт активного ваучера
 * не дає доступ до контенту — юзер обирає й активує конкретний пак через
 * paywall-флоу, після чого його id додається до owned. Тому тут — лише owned.
 */
export async function loadAccessiblePackIds(): Promise<string[]> {
  return loadOwnedPackIds();
}

export async function saveOwnedPackIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(OWNED_PACKS_KEY, JSON.stringify(ids));
}

export async function addOwnedPackId(id: string): Promise<void> {
  const cur = await loadOwnedPackIds();
  if (cur.includes(id)) return;
  await saveOwnedPackIds([...cur, id]);
}

const parseNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export { derivePackCodeName };

/** Легасі з Firestore часто в КАПСІ — на екрані хаба показуємо звичайний регістр. */
function normalizePackCodeDisplay(label: string): string {
  const t = label.trim();
  if (!t) return t;
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function packHubCodeName(pack: FlashcardMarketPack): string {
  const raw = (pack.codeName || '').trim();
  const base = raw.length > 0 ? raw : derivePackCodeName(pack.id);
  return normalizePackCodeDisplay(base);
}

/** Заголовок пака в шапке / плитках для RU/UK/ES (для ES — titleEs або codeName офіційних наборів). */
export function packTitleForInterface(pack: FlashcardMarketPack, lang: 'ru' | 'uk' | 'es'): string {
  if (lang === 'uk') return pack.titleUk;
  if (lang === 'ru') return pack.titleRu;
  const esTitle = pack.titleEs.trim();
  if (esTitle) return esTitle;
  if (pack.isCommunityUgc) {
    const a = pack.titleRu.trim();
    const b = pack.titleUk.trim();
    return a || b || packHubCodeName(pack);
  }
  return packHubCodeName(pack) || pack.titleRu;
}

/** Опис набору для модалки / деталей; для ES — descriptionEs або короткий фолбек без кирилиці. */
export function packDescriptionForInterface(pack: FlashcardMarketPack, lang: 'ru' | 'uk' | 'es'): string {
  if (lang === 'uk') return pack.descriptionUk;
  if (lang === 'ru') return pack.descriptionRu;
  const es = pack.descriptionEs.trim();
  if (es) return es;
  if (pack.isCommunityUgc) {
    return pack.descriptionUk.trim() || pack.descriptionRu.trim();
  }
  return pack.cardCount > 0
    ? `Paquete de ${pack.cardCount} tarjetas en inglés.`
    : 'Paquete de tarjetas en inglés.';
}

const bundledRaw = (bundledManifest as { packs?: VictoriaPackFile['pack'][] }).packs;
export const BUNDLED_MARKETPLACE_PACKS: FlashcardMarketPack[] = Array.isArray(bundledRaw)
  ? bundledRaw.map((p) => victoriaMetaFromPackJson(p))
  : [];

/** Синхронный запасной список (если async-загрузка вернула пусто или упала). */
export function fallbackBundledMarketPacks(): FlashcardMarketPack[] {
  return sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]);
}

/**
 * Каталог у додатку = тільки `bundled_marketplace_manifest.json`. Remote з Firestore
 * додає метадані, але **дані з бандла мають пріоритет** (реліз = джерело правди).
 */
function mergeMarketplaceLists(
  remote: FlashcardMarketPack[],
  bundled: FlashcardMarketPack[],
): FlashcardMarketPack[] {
  const byId = new Map<string, FlashcardMarketPack>();
  for (const p of remote) byId.set(p.id, p);
  for (const p of bundled) byId.set(p.id, p);
  return Array.from(byId.values());
}

/** Показуємо в магазині / хабі лише id з поточного маніфесту (не всі `published` з Firestore). */
function filterToBundledCatalog(packs: FlashcardMarketPack[]): FlashcardMarketPack[] {
  const allow = new Set(BUNDLED_MARKETPLACE_PACKS.map((p) => p.id));
  return packs.filter((p) => allow.has(p.id));
}

function sortPacksByUpdatedAt(packs: FlashcardMarketPack[]): FlashcardMarketPack[] {
  return [...packs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeMarketplaceResult(merged: FlashcardMarketPack[]): FlashcardMarketPack[] {
  if (merged.length > 0 || BUNDLED_MARKETPLACE_PACKS.length === 0) return merged;
  return sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]);
}

const mapPack = (id: string, data: any): FlashcardMarketPack | null => {
  if (!data) return null;
  const titleRu = String(data.titleRu ?? '').trim();
  const titleUk = String(data.titleUk ?? '').trim();
  if (!titleRu || !titleUk) return null;
  const codeNameRaw = String(data.codeName ?? '').trim();
  return {
    id,
    codeName: codeNameRaw || derivePackCodeName(id),
    titleRu,
    titleUk,
    titleEs: String(data.titleEs ?? ''),
    descriptionRu: String(data.descriptionRu ?? ''),
    descriptionUk: String(data.descriptionUk ?? ''),
    descriptionEs: String(data.descriptionEs ?? ''),
    category: (data.category as FlashcardPackCategory) ?? 'daily',
    cardCount: Math.max(0, Math.floor(parseNumber(data.cardCount))),
    priceShards: Math.max(0, Math.floor(parseNumber(data.priceShards))),
    ratingAvg: Math.max(0, Math.min(5, parseNumber(data.ratingAvg))),
    ratingCount: Math.max(0, Math.floor(parseNumber(data.ratingCount))),
    salesCount: Math.max(0, Math.floor(parseNumber(data.salesCount))),
    authorName: String(data.authorName ?? 'Unknown'),
    isOfficial: Boolean(data.isOfficial),
    updatedAt: String(data.updatedAt ?? new Date(0).toISOString()),
  };
};

/**
 * Sessionый warm-cache: после первого успешного `loadMarketplacePacks` экраны
 * читают тот же массив (та же ссылка) — нет ре-маунта тайлов при повторном focus.
 */
let warmMarketplacePacks: FlashcardMarketPack[] | null = null;
let loadMarketplaceInflight: Promise<FlashcardMarketPack[]> | null = null;

export function peekWarmMarketplacePacks(): FlashcardMarketPack[] | null {
  return warmMarketplacePacks;
}

export async function loadMarketplacePacks(): Promise<FlashcardMarketPack[]> {
  if (loadMarketplaceInflight) return loadMarketplaceInflight;
  const p = (async (): Promise<FlashcardMarketPack[]> => {
    try {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
        const fallback = normalizeMarketplaceResult(sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]));
        warmMarketplacePacks = fallback;
        return fallback;
      }
      const db = firestore();
      const snap = await db
        .collection('card_packs')
        .where('status', '==', 'published')
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      const mapped = snap.docs
        .map((doc: any) => mapPack(doc.id, doc.data()))
        .filter(Boolean) as FlashcardMarketPack[];
      const merged = sortPacksByUpdatedAt(mergeMarketplaceLists(mapped, BUNDLED_MARKETPLACE_PACKS));
      const result = normalizeMarketplaceResult(filterToBundledCatalog(merged));
      warmMarketplacePacks = result;
      return result;
    } catch {
      const fallback = normalizeMarketplaceResult(sortPacksByUpdatedAt([...BUNDLED_MARKETPLACE_PACKS]));
      warmMarketplacePacks ??= fallback;
      return warmMarketplacePacks;
    }
  })();
  loadMarketplaceInflight = p;
  try {
    return await p;
  } finally {
    loadMarketplaceInflight = null;
  }
}

/** Прогрев списка наборов при старте — к моменту открытия магазина/хаба список уже в памяти. */
export async function prefetchMarketplacePacks(): Promise<void> {
  await loadMarketplacePacks().catch(() => {});
}

/** @deprecated Имя «dev» — фактически все купленные наборы; используйте loadOwnedPackIds. */
export async function loadDevOwnedPackIds(): Promise<string[]> {
  return loadOwnedPackIds();
}

export async function saveDevOwnedPackIds(ids: string[]): Promise<void> {
  await saveOwnedPackIds(ids);
}

export async function setDevActivePack(packId: string): Promise<void> {
  await AsyncStorage.setItem(DEV_ACTIVE_PACK_KEY, packId);
}

export async function consumeDevActivePack(): Promise<string | null> {
  try {
    const packId = await AsyncStorage.getItem(DEV_ACTIVE_PACK_KEY);
    await AsyncStorage.removeItem(DEV_ACTIVE_PACK_KEY);
    return packId;
  } catch {
    return null;
  }
}

const PACK_CARD_TEMPLATES = [
  {
    en: 'Could you walk me through the key idea?',
    ru: 'Можешь кратко объяснить основную идею?',
    uk: 'Можеш коротко пояснити основну ідею?',
  },
  {
    en: 'Let us align on the next steps.',
    ru: 'Давайте согласуем следующие шаги.',
    uk: 'Давайте узгодимо наступні кроки.',
  },
  {
    en: 'I need a practical example for this.',
    ru: 'Мне нужен практический пример для этого.',
    uk: 'Мені потрібен практичний приклад для цього.',
  },
];

export function buildDevOwnedPackCards(packs: FlashcardMarketPack[]): CardItem[] {
  return packs.flatMap((pack) =>
    PACK_CARD_TEMPLATES.map((tpl, idx) => ({
      id: `market_${pack.id}_${idx + 1}`,
      en: `${tpl.en} (${pack.titleRu})`,
      ru: tpl.ru,
      uk: tpl.uk,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${pack.id}`,
    })),
  );
}

/** Карточки для купленных наборов: реальный контент для известных id, иначе шаблоны. */
export function buildMarketplaceOwnedCards(ownedPacks: FlashcardMarketPack[]): CardItem[] {
  return ownedPacks.flatMap((pack) => {
    if (pack.id === OFFICIAL_PEAKY_BLINDERS_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/peakyBlindersBundle') as typeof import('./bundles/peakyBlindersBundle')).getPeakyBlindersBundleCards();
    }
    if (pack.id === OFFICIAL_ROYAL_TEA_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/royalTeaBundle') as typeof import('./bundles/royalTeaBundle')).getRoyalTeaBundleCards();
    }
    if (pack.id === OFFICIAL_WILD_WEST_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/wildWestBundle') as typeof import('./bundles/wildWestBundle')).getWildWestBundleCards();
    }
    if (pack.id === OFFICIAL_DARK_LOGIC_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/darkLogicBundle') as typeof import('./bundles/darkLogicBundle')).getDarkLogicBundleCards();
    }
    if (pack.id === OFFICIAL_NEGOTIATOR_EN_ID) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return (require('./bundles/negotiatorBundle') as typeof import('./bundles/negotiatorBundle')).getNegotiatorBundleCards();
    }
    return buildDevOwnedPackCards([pack]);
  });
}

export function bundledPacksForOwned(ownedIds: string[]): FlashcardMarketPack[] {
  const s = new Set(ownedIds);
  return BUNDLED_MARKETPLACE_PACKS.filter((p) => s.has(p.id));
}

/**
 * Повторно зібрати картки з бандлів у додатку і зберегти (після покупки, щоб кеш був готовий до відкриття «Картки»).
 */
export async function primeMarketplaceBuiltCardsCacheFromOwnedStorage(): Promise<void> {
  const owned = await loadOwnedPackIds();
  if (owned.length === 0) {
    await saveBuiltMarketplaceCardsCache([], []);
    return;
  }
  const ownedPacks = bundledPacksForOwned(owned);
  const cards = buildMarketplaceOwnedCards(ownedPacks);
  await saveBuiltMarketplaceCardsCache(owned, cards);
}

/** Після надання пробного набору з подарунка — зібрати кеш з куплених + trial */
export async function primeMarketplaceBuiltCardsCacheFromAccessibleStorage(): Promise<void> {
  const ids = await loadAccessiblePackIds();
  if (ids.length === 0) {
    await saveBuiltMarketplaceCardsCache([], []);
    return;
  }
  const ownedPacks = bundledPacksForOwned(ids);
  const cards = buildMarketplaceOwnedCards(ownedPacks);
  await saveBuiltMarketplaceCardsCache(ids, cards);
}


/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
