import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang, PlannedInterfaceLang } from '../../constants/i18n';
import type { StudyTarget } from '../study_target';
import { CardItem } from './types';
import {
  flashcardsMarketDevActivePackKey,
  flashcardsMarketplaceBuiltCardsCacheKey,
  flashcardsMarketDevOwnedPacksKey,
  flashcardsOwnedPacksKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';
import { flashcardsOfficialPacksAvailableForTarget } from '../flashcards_target_gate';
import { DebugLogger } from '../debug-logger';
import type { PackLanguage } from './pack_languages';
import type { PackLevel } from './pack_deck_meta';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
import {
  BoundedScopeCache,
  mergeOwnedIdReads,
  parseStrictArrayJson,
} from './myPacksDataIntegrity';
import { noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { cleanPackSourceTitle } from '../../shared/pack_source_title';
export type FlashcardPackCategory = 'business' | 'travel' | 'daily' | 'exam' | 'slang' | 'verbs';

/**
 * Градиенты обложек паков для полок хаба (макет A1 `.pk-cov` / `.mini-cov`).
 * зачем: в макете у каждого пака своя тёмная обложка с кодовым именем — она
 * и отличает паки друг от друга на полке. Данных об обложке в модели пака нет,
 * поэтому выводим её из категории: один пак = один устойчивый цвет, полка
 * читается как витрина, а не как список одинаковых плиток.
 */
export const PACK_CATEGORY_COVER: Record<FlashcardPackCategory, [string, string]> = {
  business: ['#3D2B16', '#241B0C'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
  travel: ['#123B33', '#0A2620'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
  daily: ['#241D3D', '#141024'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
  exam: ['#1A2C4A', '#0D1727'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
  slang: ['#3D1F16', '#24100A'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
  verbs: ['#17301F', '#0D1F13'], // theme-exempt: собственная тёмная обложка категории (графика витрины), одна на все темы по макету
};

export function packCoverGradient(category: FlashcardPackCategory): [string, string] {
  return PACK_CATEGORY_COVER[category] ?? ['#241D3D', '#141024']; // theme-exempt: запасная обложка (та же графика витрины)
}

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
  /** Короткое кодове ім\'я для сітки хаба (одна-дві «клички», без обрізання довгого заголовка). */
  codeName: string;
  titleRu: string;
  titleUk: string;
  /** ES — для локалі es; порожній рядок, якщо ще не заповнено в даних. */
  titleEs: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  /** R110: английское название (наборы из видео, автоназвание) — для интерфейса en и как запасное. */
  titleEn?: string;
  descriptionRu: string;
  descriptionUk: string;
  descriptionEs: string;
  descriptionPtBr?: string;
  descriptionVi?: string;
  descriptionId?: string;
  descriptionTr?: string;
  descriptionPl?: string;
  category: FlashcardPackCategory;
  cardCount: number;
  /**
   * @deprecated Цена в ЖЕМЧУГЕ — легаси официальных наборов «Магазина осколков».
   * Наборы сообщества за жемчуг не продаются: у них своя валюта — руны
   * (`priceRunes` ниже). Поле остаётся для чтения старых документов.
   */
  priceShards: number;
  /**
   * Цена набора в РУНАХ, которую ставит его автор (0 — бесплатно).
   *
   * зачем (владелец, 2026-09-17, экраны 6–8 макета docs/design/runes/MAKET.html):
   * это ОТМЕНЯЕТ решение Cards 2.1 §1.2 «наборы сообщества бесплатны».
   * Автор выбирает цену ползунком от 0 до 5 000 и может менять её когда
   * угодно, в том числе у уже опубликованного набора.
   *
   * ⚠️ СТАРЫЕ НАБОРЫ ОСТАЮТСЯ БЕСПЛАТНЫМИ НАВСЕГДА (решение владельца): у них
   * поля нет, а отсутствие поля читается как 0. Те, кто уже опубликовал и уже
   * пользуется, не должны пострадать от ввода платности.
   *
   * Руны остаются у приложения — автор получает читателей, а не выплату.
   */
  priceRunes?: number;
  /** Сколько людей добавило набор себе (Cards 2.1 §2.1). */
  addedCount?: number;
  /** Лайки активности набора (Cards 2.1 §2.2). */
  likesCount?: number;
  /**
   * Сколько откликов под набором (владелец 2026-09-04).
   *
   * зачем поле здесь, а не запрос подколлекции: списки и так читают документ
   * набора ради лайков, поэтому «💬 7» в каталоге стоит НОЛЬ дополнительных
   * чтений. Пересчёт подколлекции требовал бы запроса на каждый элемент списка.
   * Ноль и отсутствие значка — одно и то же: см. shouldShowCommentsCount.
   */
  commentsCount?: number;
  salesCount: number;
  authorName: string;
  isOfficial: boolean;
  /** Набор из community_packs (UGC); покупка через Cloud Function. */
  isCommunityUgc?: boolean;
  /** Study target this pack teaches; missing legacy Firestore docs are treated as English. */
  studyTarget?: StudyTarget;
  /** Independent target language for user/community packs; legacy packs normalize to English. */
  packLanguage?: PackLanguage;
  /** Полный authorStableId для UGC (редагування). */
  authorStableId?: string;
  /** Статус листингу з Firestore (published / update_pending …). */
  listingStatus?: string;
  /** Набір тимчасово знято з продажу — очікується повторна модерація. */
  isPendingUpdateReview?: boolean;
  /** Ключ палитри карточек UGC. */
  ugcCardThemeKey?: string;
  /**
   * YouTube-идентификатор ролика, из фраз которого собран набор (11 символов).
   *
   * зачем ПОЛЕ У ОБЫЧНОГО НАБОРА, а не отдельная сущность (владелец 2026-09-23):
   * фразы роликов живут в `video_phrase_sets` и НЕ имеют ни лайков, ни добавления
   * себе, ни тренировки. Отдельная сущность заставила бы написать ВТОРУЮ копию
   * социального слоя — тот самый класс бага, что уже дважды стоил работы
   * (`project_pack_runes_go_to_author`: выплата была написана, но только для одной
   * валюты; `project_own_pack_missing_in_deck_picker`: источников три, список
   * собирался из двух). Набор из видео — ОБЫЧНЫЙ community-набор плюс это поле,
   * поэтому лайки, «Добавить себе», тренировка, витрина и топ работают сразу.
   *
   * Отсутствие поля = обычный набор. Удаление поля не ломает набор и не отнимает
   * у людей добавленные карточки — он просто перестаёт показывать блок видео.
   */
  videoId?: string;
  /** Заголовок ролика — подпись под превью; пусто → подпись не рисуем. */
  videoTitle?: string;
  /** Длительность ролика в секундах — бейдж на превью; 0/нет → бейджа нет. */
  videoDurationSec?: number;
  /**
   * Уровень набора A1–C1 (ставит автор) — «40 · A2» на колоде Карточек 2.0.
   * Нет поля → уровень не показываем (не выдумываем). См. `flashcards/pack_deck_meta.ts`.
   */
  level?: PackLevel;
  /** Первые слова набора (до 3) — чипы колоды; из карточек документа каталога, без лишних чтений. */
  previewWords?: readonly string[];
  updatedAt: string;
};

/** Підняти при зміні бандлів / схеми карт — інвалідує старий кеш на пристроях. */
export const MARKETPLACE_BUILT_CARDS_CACHE_EPOCH = 12;
export const MARKETPLACE_BUILT_CARDS_CACHE_MAX_BYTES = 256 * 1024;

type BuiltMarketplaceCardsCache = {
  epoch: number;
  /** `marketOwnedIdsCacheKey(ownedIds)` */
  ownedKey: string;
  cards: CardItem[];
};

function marketplaceCacheUtf8Bytes(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function marketOwnedIdsCacheKey(ownedIds: string[]): string {
  return [...ownedIds].sort().join('\0');
}

function marketplaceCardsAllowedForTarget(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): boolean {
  return flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale);
}

export async function loadBuiltMarketplaceCardsCache(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<BuiltMarketplaceCardsCache | null> {
  const key = flashcardsMarketplaceBuiltCardsCacheKey(studyTarget);
  if (!marketplaceCardsAllowedForTarget(studyTarget, sourceLocale)) {
    await AsyncStorage.removeItem(key).catch(noteSwallowedHandler('marketplace:promise_1'));
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    if (marketplaceCacheUtf8Bytes(raw) > MARKETPLACE_BUILT_CARDS_CACHE_MAX_BYTES) {
      await AsyncStorage.removeItem(key).catch(noteSwallowedHandler('marketplace:promise_2'));
      return null;
    }
    const p = JSON.parse(raw) as BuiltMarketplaceCardsCache;
    if (!p || p.epoch !== MARKETPLACE_BUILT_CARDS_CACHE_EPOCH) return null;
    if (typeof p.ownedKey !== 'string' || !Array.isArray(p.cards)) return null;
    return p;
  } catch {
    return null;
  }
}

export async function saveBuiltMarketplaceCardsCache(
  ownedIds: string[],
  cards: CardItem[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<void> {
  const key = flashcardsMarketplaceBuiltCardsCacheKey(studyTarget);
  if (!marketplaceCardsAllowedForTarget(studyTarget, sourceLocale)) {
    await AsyncStorage.removeItem(key).catch(noteSwallowedHandler('marketplace:promise_3'));
    return;
  }
  if (ownedIds.length === 0) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // ignore
      DebugLogger.error('marketplace:key', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return;
  }
  const payload: BuiltMarketplaceCardsCache = {
    epoch: MARKETPLACE_BUILT_CARDS_CACHE_EPOCH,
    ownedKey: marketOwnedIdsCacheKey(ownedIds),
    cards,
  };
  // Defer serialization to avoid blocking the JS thread during frame renders.
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  try {
    const raw = JSON.stringify(payload);
    if (marketplaceCacheUtf8Bytes(raw) > MARKETPLACE_BUILT_CARDS_CACHE_MAX_BYTES) {
      await AsyncStorage.removeItem(key).catch(noteSwallowedHandler('marketplace:promise_4'));
      return;
    }
    await AsyncStorage.setItem(key, raw);
  } catch (e) {
      // ignore
      DebugLogger.error('marketplace:raw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// зачем: синхронное зеркало last-known owned pack ids в памяти по studyTarget —
// экран магазина сеет ownedPackIds ИЗ него при первом рендере (peekWarmOwnedPackIds),
// чтобы карточки уже открытых наборов не мигали «не куплено → куплено» после AsyncStorage round-trip.
const warmOwnedPackIdsByTarget = new BoundedScopeCache<string[]>(16);

function warmOwnedKey(
  studyTarget?: RuntimeStudyTarget,
  token: AccountGenerationToken = captureAccountGeneration(),
): string | null {
  const scope = accountScopeKey(token);
  return scope ? `${scope}|target:${storageStudyTarget(studyTarget)}` : null;
}

/** Последний известный список owned id для studyTarget — без ожидания AsyncStorage. null если ещё не читали в этой сессии. */
export function peekWarmOwnedPackIds(studyTarget?: RuntimeStudyTarget): string[] | null {
  const key = warmOwnedKey(studyTarget);
  return key ? (warmOwnedPackIdsByTarget.get(key) ?? null) : null;
}

/**
 * Последний известный список доступных паков — нужен синхронным путям каталога
 * (`fallbackBundledMarketPacks`), чтобы официальные наборы не «просачивались»
 * в выдачу до окончания async-загрузки owned (Cards 2.1 §1.1).
 */
export function peekAccessiblePackIds(studyTarget?: RuntimeStudyTarget): string[] {
  const key = warmOwnedKey(studyTarget);
  return key ? (warmOwnedPackIdsByTarget.get(key) ?? []) : [];
}

/** Только для тестов / логаута: сбросить синхронный снимок доступных паков. */
export function resetAccessiblePackIdsCache(): void {
  warmOwnedPackIdsByTarget.clear();
}

export type OwnedPackIdsLoadResult = {
  ids: string[];
  status: 'ready' | 'stale';
};

async function readOwnedIds(key: string): Promise<OwnedPackIdsLoadResult> {
  try {
    const parsed = parseStrictArrayJson(await AsyncStorage.getItem(key), (value): value is string => typeof value === 'string');
    return { ids: parsed.items, status: parsed.status };
  } catch (error: unknown) {
    // зачем (8C-2): немой catch прятал отказ чтения владения — причина в лог (без значений и uid).
    console.warn(`[MY-PACKS] owned_ids read_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return { ids: [], status: 'stale' };
  }
}

/** Status-aware read for surfaces where storage failure must not look like true empty. */
export async function loadOwnedPackIdsResult(
  studyTarget?: RuntimeStudyTarget,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<OwnedPackIdsLoadResult> {
  const cacheKey = warmOwnedKey(studyTarget, accountToken);
  if (!cacheKey || !isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
  const ownedKey = flashcardsOwnedPacksKey(studyTarget);
  const devOwnedKey = flashcardsMarketDevOwnedPacksKey(studyTarget);
  const [ownedRead, legacyRead] = await Promise.all([readOwnedIds(ownedKey), readOwnedIds(devOwnedKey)]);
  if (!isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
  let result = mergeOwnedIdReads([ownedRead, legacyRead], warmOwnedPackIdsByTarget.get(cacheKey) ?? []);
  if (result.status === 'ready' && result.ids.length > 0 && ownedRead.ids.length === 0 && legacyRead.ids.length > 0) {
    try {
      await AsyncStorage.setItem(ownedKey, JSON.stringify(result.ids));
    } catch (error: unknown) {
      console.warn(`[MY-PACKS] owned_ids legacy_migrate_failed kind=${error instanceof Error ? error.name : typeof error}`);
      result = { ...result, status: 'stale' };
    }
  }
  if (!isCurrentAccountGeneration(accountToken)) return { ids: [], status: 'stale' };
  if (result.status === 'ready') {
    warmOwnedPackIdsByTarget.set(cacheKey, result.ids);
  }
  return result;
}

export async function loadOwnedPackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return (await loadOwnedPackIdsResult(studyTarget)).ids;
}

/**
 * Список id паків, до яких юзер має доступ (для відображення в «Мої», кешу карт і т.д.).
 *
 * Раніше додавав «безкоштовний preview» рандомного паку з 48-год trial.
 * Ваучерна модель (див. pack_trial_gift.ts): сам факт активного ваучера
 * не дає доступ до контенту — юзер обирає й активує конкретний пак через
 * paywall-флоу, після чого його id додається до owned. Тому тут — лише owned.
 */
export async function loadAccessiblePackIds(studyTarget?: RuntimeStudyTarget): Promise<string[]> {
  return (await loadAccessiblePackIdsResult(studyTarget)).ids;
}

export async function loadAccessiblePackIdsResult(
  studyTarget?: RuntimeStudyTarget,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<OwnedPackIdsLoadResult> {
  return loadOwnedPackIdsResult(studyTarget, accountToken);
}

// зачем (8C-2): saveOwnedPackIds/addOwnedPackId удалены — вызовов не было, а read→await→write
// мимо поколения аккаунта мог записать набор в хранилище следующего аккаунта. Владение пишет
// только леджер (commitClientShardOperation: поколение + withAccountTransitionLock).
/** Refresh only the in-memory projection after an atomic economy commit. */
export function primeOwnedPackIdsCache(ids: readonly string[], studyTarget?: RuntimeStudyTarget): void {
  const key = warmOwnedKey(studyTarget);
  if (key) warmOwnedPackIdsByTarget.set(key, [...new Set(ids)]);
}

const parseNumber = (value: unknown, backup = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : backup;
};

export function derivePackCodeName(packId: string): string {
  const stripped = packId.replace(/^official_/i, '').replace(/_en$/i, '').replace(/_/g, ' ').trim();
  return stripped
    ? stripped.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
    : packId;
}

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

type MarketplaceInterfaceLocale = 'ru' | 'uk' | 'es' | PlannedInterfaceLang;

const PACK_TITLE_FIELD_BY_LANG = {
  ru: 'titleRu',
  uk: 'titleUk',
  es: 'titleEs',
  'pt-BR': 'titlePtBr',
  vi: 'titleVi',
  id: 'titleId',
  tr: 'titleTr',
  pl: 'titlePl',
} as const satisfies Record<MarketplaceInterfaceLocale, keyof FlashcardMarketPack>;

const PACK_DESCRIPTION_FIELD_BY_LANG = {
  ru: 'descriptionRu',
  uk: 'descriptionUk',
  es: 'descriptionEs',
  'pt-BR': 'descriptionPtBr',
  vi: 'descriptionVi',
  id: 'descriptionId',
  tr: 'descriptionTr',
  pl: 'descriptionPl',
} as const satisfies Record<MarketplaceInterfaceLocale, keyof FlashcardMarketPack>;

function trimmedMarketString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function spanishPackDescriptionReserve(pack: FlashcardMarketPack): string {
  return pack.cardCount > 0
    ? `Paquete de ${pack.cardCount} tarjetas en inglés.`
    : 'Paquete de tarjetas en inglés.';
}

/**
 * Название набора сообщества на языке автора — для интерфейсов, где своей
 * локали нет.
 *
 * зачем: у UGC-набора заполнена ровно ОДНА локаль — та, на которой писал автор.
 * Раньше фолбэком был код из id, и набор «Антоніми дієслів» (uk) в русском
 * интерфейсе назывался бы `1bnrdkbf9jfjjqjkbsl`. Живое название автора всегда
 * понятнее кода, поэтому берём первое непустое поле.
 */
function communityPackAuthoredTitle(pack: FlashcardMarketPack): string {
  return (
    trimmedMarketString(pack.titleRu) ||
    trimmedMarketString(pack.titleUk) ||
    trimmedMarketString(pack.titleEs) ||
    trimmedMarketString(pack.titlePtBr) ||
    trimmedMarketString(pack.titleVi) ||
    trimmedMarketString(pack.titleId) ||
    trimmedMarketString(pack.titleTr) ||
    trimmedMarketString(pack.titlePl)
  );
}

/**
 * Заголовок пака в шапке / плитках: planned-локалі не читають RU/UK/ES.
 * зачем: en — чисто UI-язык, у названий паков нет английского source
 * (см. app/source_locales.ts) — сужаем на RU, как остальные контентные
 * фолбэки в проекте, вместо того чтобы патчить каждый call site отдельно.
 */
export function packTitleForInterface(pack: FlashcardMarketPack, lang: Lang | PlannedInterfaceLang): string {
  return resolvePackTitle(pack, lang).title;
}

export type PackTitleSource = 'interface' | 'en' | 'ru' | 'authored' | 'video' | 'code';
const packTitleFallbackLogged = new Set<string>();

/**
 * Название набора: язык интерфейса → en → [официальный встроенный: имя-бренд] → ru → любое заполненное (язык автора) → название ролика →
 * (только если пусто всё) код.
 *
 * зачем (координатор 17.10, правило «без системных текстов»): у наборов из видео заполнены только ru/uk/es, и людям на
 * pt-BR/vi/id/tr/pl витрина показывала КОД набора вместо названия. Код людям не показываем: реальный набор без единого
 * названия маппер каталога вообще отбрасывает (communityFirestore), так что ветка 'code' — страховка с предупреждением в логе.
 * Хвост файла («….docx») срезает formatPackTitleForDisplay на любой ветке. Лог [PACK-TITLE] — раз на набор и язык, без спама в рендере.
 */
export function resolvePackTitle(pack: FlashcardMarketPack, lang: Lang | PlannedInterfaceLang): Readonly<{ title: string; source: PackTitleSource }> {
  const interfaceTitle = lang === 'en' ? trimmedMarketString(pack.titleEn) : trimmedMarketString(pack[PACK_TITLE_FIELD_BY_LANG[lang]]);
  // Официальный встроенный набор (не из видео, не UGC): его codeName — придуманное латинское имя-бренд, а не системный код;
  // в pt-BR/vi/… оно читается лучше русского названия (сторож marketplace_interface_locale: без кириллицы в planned-локалях).
  const officialBrand = !pack.isCommunityUgc && !trimmedMarketString(pack.videoId) && trimmedMarketString(pack.codeName)
    ? packHubCodeName(pack) : '';
  const chain: ReadonlyArray<readonly [PackTitleSource, string]> = [
    ['interface', interfaceTitle],
    ['en', trimmedMarketString(pack.titleEn)],
    ['code', officialBrand],
    ['ru', trimmedMarketString(pack.titleRu)],
    ['authored', communityPackAuthoredTitle(pack)],
    ['video', trimmedMarketString(pack.videoTitle)],
  ];
  for (const [source, raw] of chain) {
    const title = raw ? formatPackTitleForDisplay(raw) : '';
    if (!title) continue;
    if (source !== 'interface' && source !== 'code') logPackTitleFallback(pack.id, lang, source);
    return { title, source };
  }
  logPackTitleFallback(pack.id, lang, 'code');
  return { title: packHubCodeName(pack), source: 'code' };
}

function logPackTitleFallback(packId: string, lang: string, source: PackTitleSource): void {
  const key = `${packId}:${lang}`;
  if (packTitleFallbackLogged.has(key)) return;
  packTitleFallbackLogged.add(key);
  const line = `[PACK-TITLE] ${packId} lang=${lang}: своего названия нет → ${source}`; // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  if (source === 'code') console.warn(line); // guard-ok: настоящий набор сюда не доходит — если дошёл, это баг данных
  else console.log(line); // guard-ok: раз на набор и язык
}

/**
 * Название набора для показа: без хвоста файла («.docx», «(1)», « - копия»).
 * зачем (владелец, журнал строка 5; Ядро 306185f5c): одна функция чистки `cleanPackSourceTitle` на сервер и клиент.
 * Каталог чистит старые документы при чтении, а показ — страховка для локальных и своих наборов. Здесь — единая
 * точка: через `packTitleForInterface` название берут каталог, «Мои наборы», выбор в тренировке, шапки и шторки.
 * Если от названия ничего не осталось (всё имя было «.docx»), показываем исходник — пустая строка хуже.
 */
export function formatPackTitleForDisplay(raw: string): string {
  const source = String(raw ?? '').trim();
  return cleanPackSourceTitle(source) || source;
}

/** Короткая подпись под плиткой хаба: локализованная, но компактная. */
export function packHubLabelForInterface(pack: FlashcardMarketPack, lang: Lang | PlannedInterfaceLang): string {
  const contentLang = lang === 'en' ? 'ru' : lang;
  if (pack.isCommunityUgc) {
    const localizedTitle = packTitleForInterface(pack, lang).trim();
    if (localizedTitle) return localizedTitle;
  }
  return packHubCodeName(pack);
}

/** Описание набора сообщества на языке автора — см. communityPackAuthoredTitle. */
function communityPackAuthoredDescription(pack: FlashcardMarketPack): string {
  return (
    trimmedMarketString(pack.descriptionRu) ||
    trimmedMarketString(pack.descriptionUk) ||
    trimmedMarketString(pack.descriptionEs) ||
    trimmedMarketString(pack.descriptionPtBr) ||
    trimmedMarketString(pack.descriptionVi) ||
    trimmedMarketString(pack.descriptionId) ||
    trimmedMarketString(pack.descriptionTr) ||
    trimmedMarketString(pack.descriptionPl)
  );
}

/** Опис набору для модалки / деталей; planned-локалі не читають RU/UK/ES. */
export function packDescriptionForInterface(pack: FlashcardMarketPack, lang: Lang | PlannedInterfaceLang): string {
  const contentLang = lang === 'en' ? 'ru' : lang;
  const descriptionField = PACK_DESCRIPTION_FIELD_BY_LANG[contentLang];
  const requestedDescription = trimmedMarketString(pack[descriptionField]);
  if (requestedDescription) return requestedDescription;
  // зачем: у UGC заполнена только локаль автора — без этого фолбэка описание
  // набора «Антоніми дієслів» (uk) в русском интерфейсе было бы пустым.
  if (pack.isCommunityUgc) {
    return communityPackAuthoredDescription(pack);
  }
  const isSpanish = descriptionField === 'descriptionEs';
  if (!isSpanish) return '';
  return spanishPackDescriptionReserve(pack);
}

export const BUNDLED_MARKETPLACE_PACKS: FlashcardMarketPack[] = [];

/** Официальный набор — по флагу или по id-префиксу `official_` (Cards 2.1 §1.1). */
export function isOfficialCatalogPack(pack: Pick<FlashcardMarketPack, 'id' | 'isOfficial'>): boolean {
  return pack.isOfficial === true || String(pack.id).startsWith('official_');
}

/**
 * Cards 2.1 §1.1: официальные наборы выведены из каталога. Официальный пак попадает
 * в выдачу **только если** его id уже есть у пользователя (`loadAccessiblePackIds()`),
 * чтобы у владельцев набор оставался полностью рабочим. Наборы сообщества не фильтруются.
 */
export function filterCatalogPacksByOwnership(
  packs: FlashcardMarketPack[],
  accessiblePackIds: Iterable<string>,
): FlashcardMarketPack[] {
  void accessiblePackIds;
  return packs.filter((p) => !isOfficialCatalogPack(p));
}

/**
 * Полный бандл-каталог БЕЗ фильтра владения — для DEV-инструментов, сборки карточек
 * и экранов «мои наборы», где метаданные нужны независимо от видимости в каталоге.
 */
export function reserveBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  void studyTarget;
  void sourceLocale;
  return [];
}

/** @see reserveBundledMarketPacks — то же самое, явное имя для DEV-инструментов. */
export function allBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  return reserveBundledMarketPacks(studyTarget, sourceLocale);
}

/**
 * Синхронный запасной список для КАТАЛОГА (если async-загрузка вернула пусто или упала):
 * официальные паки в нём остаются только у владельцев (Cards 2.1 §1.1).
 */
export function fallbackBundledMarketPacks(studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): FlashcardMarketPack[] {
  return filterCatalogPacksByOwnership(
    reserveBundledMarketPacks(studyTarget, sourceLocale),
    peekAccessiblePackIds(studyTarget),
  );
}

/**
 * Цена набора в рунах — ЕДИНСТВЕННЫЙ источник для показа и для списания.
 *
 * зачем функция, а не чтение поля напрямую: каталог, экран набора и шит
 * покупки обязаны спрашивать одно и то же. Разойдись они — в списке стояла бы
 * одна цифра, а списалась бы другая. Тот же инвариант уже спас диалоги.
 *
 * Официальные наборы и старые наборы сообщества — всегда 0: платность введена
 * только для новых (решение владельца 2026-09-17).
 */
export function communityPackPriceRunes(pack: Pick<FlashcardMarketPack, 'priceRunes' | 'isCommunityUgc'>): number {
  if (!pack.isCommunityUgc) return 0;
  const price = Number(pack.priceRunes ?? 0);
  return Number.isFinite(price) && price > 0 ? Math.floor(price) : 0;
}

/** Границы цены, которую автор выбирает ползунком (экран 6 макета). */
export const COMMUNITY_PACK_PRICE_MIN_RUNES = 0;
export const COMMUNITY_PACK_PRICE_MAX_RUNES = 5000;
/** Шаг ползунка: мельче незачем — 100 рун человек всё равно не различает. */
export const COMMUNITY_PACK_PRICE_STEP_RUNES = 100;

export type MarketplacePacksLoadResult = {
  packs: FlashcardMarketPack[];
  status: 'ready' | 'stale';
};

export function peekWarmMarketplacePacks(_studyTarget?: RuntimeStudyTarget, _sourceLocale?: unknown): FlashcardMarketPack[] {
  return [];
}

export async function loadMarketplacePacksResult(
  _studyTarget?: RuntimeStudyTarget,
  _sourceLocale?: unknown,
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<MarketplacePacksLoadResult> {
  return { packs: [], status: isCurrentAccountGeneration(accountToken) ? 'ready' : 'stale' };
}
export async function loadMarketplacePacks(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): Promise<FlashcardMarketPack[]> {
  return (await loadMarketplacePacksResult(studyTarget, sourceLocale)).packs;
}

/**
 * Прогрев списка наборов при старте.
 * зачем (PM-210, экономия старта): каталог маркета сейчас пуст
 * (`loadMarketplacePacksResult` — заглушка `[]`), греть нечего. Намеренный no-op
 * без сети и без захвата поколения аккаунта; вызов из `_layout.tsx` оставлен,
 * чтобы не трогать корень. Вернётся каталог — прогрев вернуть ЗДЕСЬ.
 */
export async function prefetchMarketplacePacks(): Promise<void> {
  DebugLogger.info('[STARTUP-READS]', 'marketplace prefetch: no-op (catalog stub, 0 reads)');
}

export async function consumeDevActivePack(studyTarget?: RuntimeStudyTarget): Promise<string | null> {
  const key = flashcardsMarketDevActivePackKey(studyTarget);
  try {
    const packId = await AsyncStorage.getItem(key);
    await AsyncStorage.removeItem(key);
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
    es: '¿Puedes explicarme brevemente la idea principal?',
    'pt-BR': 'Você pode me explicar brevemente a ideia principal?',
    vi: 'Bạn có thể giải thích ngắn gọn ý chính cho tôi không?',
    id: 'Bisakah kamu menjelaskan ide utamanya secara singkat?',
    tr: 'Ana fikri kısaca anlatabilir misin?',
    pl: 'Czy możesz krótko wyjaśnić główną ideę?',
  },
  {
    en: 'Let us align on the next steps.',
    ru: 'Давай согласуем следующие шаги.',
    uk: 'Давай узгодимо наступні кроки.',
    es: 'Pongámonos de acuerdo sobre los próximos pasos.',
    'pt-BR': 'Vamos alinhar os próximos passos.',
    vi: 'Hãy thống nhất các bước tiếp theo.',
    id: 'Mari kita selaraskan langkah berikutnya.',
    tr: 'Sonraki adımlar üzerinde anlaşalım.',
    pl: 'Uzgodnijmy następne kroki.',
  },
  {
    en: 'I need a practical example for this.',
    ru: 'Мне нужен практический пример для этого.',
    uk: 'Мені потрібен практичний приклад для цього.',
    es: 'Necesito un ejemplo práctico de esto.',
    'pt-BR': 'Preciso de um exemplo prático disso.',
    vi: 'Tôi cần một ví dụ thực tế cho điều này.',
    id: 'Saya butuh contoh praktis untuk ini.',
    tr: 'Bunun için pratik bir örneğe ihtiyacım var.',
    pl: 'Potrzebuję praktycznego przykładu do tego.',
  },
];

export function buildDevOwnedPackCards(packs: FlashcardMarketPack[]): CardItem[] {
  return packs.flatMap((pack) =>
    PACK_CARD_TEMPLATES.map((tpl, idx) => ({
      id: `market_${pack.id}_${idx + 1}`,
      en: `${tpl.en} (${packHubCodeName(pack)})`,
      ru: tpl.ru,
      uk: tpl.uk,
      es: tpl.es,
      sourceLocales: {
        'pt-BR': tpl['pt-BR'],
        vi: tpl.vi,
        id: tpl.id,
        tr: tpl.tr,
        pl: tpl.pl,
      },
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${pack.id}`,
    })),
  );
}

/** Карточки для купленных наборов: реальный контент для известных id, иначе шаблоны. */
export function buildMarketplaceOwnedCards(
  ownedPacks: FlashcardMarketPack[],
  sourceLocale?: unknown,
  studyTarget?: RuntimeStudyTarget,
): CardItem[] {
  void sourceLocale;
  void studyTarget;
  return buildDevOwnedPackCards(ownedPacks.filter((pack) => !isOfficialCatalogPack(pack)));
}

export function bundledPacksForOwned(
  ownedIds: string[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: unknown,
): FlashcardMarketPack[] {
  void ownedIds;
  void studyTarget;
  void sourceLocale;
  return [];
}

/**
 * Повторно зібрати картки з бандлів у додатку і зберегти (після покупки, щоб кеш був готовий до відкриття «Картки»).
 */
export async function primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const owned = await loadOwnedPackIds(studyTarget);
  if (owned.length === 0) {
    await saveBuiltMarketplaceCardsCache([], [], studyTarget);
    return;
  }
  const ownedPacks = bundledPacksForOwned(owned, studyTarget);
  const cards = buildMarketplaceOwnedCards(ownedPacks, undefined, studyTarget);
  await saveBuiltMarketplaceCardsCache(owned, cards, studyTarget);
}

/** Після надання пробного набору з подарунка — зібрати кеш з куплених + trial */
export async function primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const ids = await loadAccessiblePackIds(studyTarget);
  if (ids.length === 0) {
    await saveBuiltMarketplaceCardsCache([], [], studyTarget);
    return;
  }
  const ownedPacks = bundledPacksForOwned(ids, studyTarget);
  const cards = buildMarketplaceOwnedCards(ownedPacks, undefined, studyTarget);
  await saveBuiltMarketplaceCardsCache(ids, cards, studyTarget);
}


/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
