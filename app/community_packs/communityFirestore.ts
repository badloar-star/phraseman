import firestore from '@react-native-firebase/firestore';
import { registerHubCacheProbe } from '../hub_lifecycle_probe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import type { FlashcardMarketPack, FlashcardPackCategory } from '../flashcards/marketplace';
import { derivePackCodeName } from '../flashcards/marketplace';
import type { CardItem } from '../flashcards/types';
import { COMMUNITY_PACKS_COLLECTION } from './schema';
import { comparePacksBySocial, readPackSocialCounts } from './packSocial';
import { readPackCommentsCount } from './packComments';
import { callCommunityFetchPackCardsIfAccessible, isCommunityPacksCloudEnabled } from './functionsClient';
import { getCanonicalUserId } from '../user_id_policy';
import { UGC_CARD_THEME_DEFAULT_ID } from './ugcCardThemePresets';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import type { StudyTarget } from '../study_target';
import { isPackLanguage, normalizePackCardTexts, normalizePackLanguage, PACK_LANGUAGE_CHOICES, type PackLanguage } from '../flashcards/pack_languages';
import { DebugLogger } from '../debug-logger';
import { normalizePackLevel, packPreviewWords, type PackLevel } from '../flashcards/pack_deck_meta';
import { cardVideoStartSecFromRaw } from '../flashcards/video_moment';
import { cleanPackSourceTitle } from '../../shared/pack_source_title';
import { captureAccountGeneration, subscribeAccountGeneration } from '../account_generation';
import { getDevCommunityPack, isDevCommunityPackId } from '../dev_cards_state';

function num(v: unknown, d = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : d;
}

/** Тот же формат, что у фраз роликов (`shared/video_phrases_contract.ts`). */
const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;

/**
 * Идентификатор ролика из документа набора — или undefined.
 *
 * зачем ПРОВЕРКА ФОРМАТА, а не просто String(): по этому значению строится
 * ссылка на YouTube и адрес превью. Мусор в поле превратился бы в битую
 * картинку у КАЖДОЙ строки списка и в открытие постороннего адреса по тапу.
 * Не прошло проверку — набор ведёт себя как обычный, без блока видео.
 */
function videoIdOrUndefined(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (!VIDEO_ID_RE.test(raw)) {
    // зачем лог, а не тихий выход: немой отказ здесь = «набор из видео не
    // показывает видео», и причину было бы не найти (правило «сперва логи»).
    DebugLogger.warn('[VIDEO-PACK]', `videoId отброшен: не формат YouTube, значение="${raw}"`);
    return undefined;
  }
  return raw;
}

/**
 * Название набора из документа — без хвоста файла.
 *
 * зачем (владелец, журнал строка 5; координатор 14:10): наборы роликов, записанные до правки сервера, несут название
 * из имени файла («… 500 фраз.docx»). Чистим при чтении: ноль записей и ноль лишних чтений вместо миграции в проде.
 * Если от названия ничего не осталось — оставляем как было, чтобы набор не пропал из каталога.
 */
function packTitleField(value: unknown): string {
  const raw = String(value ?? '').trim();
  return cleanPackSourceTitle(raw) || raw;
}

export type MapCommunityPackDocOptions = {
  /** false — для метаданных «мои / купленные» вне витрины (admin_revision_required, admin_removed). */
  forCatalog?: boolean;
  /** Missing legacy docs are English; French docs must not leak into English and vice versa. */
  studyTarget?: RuntimeStudyTarget;
};

function communityPackDocLanguage(data: Record<string, unknown> | undefined): PackLanguage {
  return normalizePackLanguage(data?.packLanguage ?? data?.studyTarget);
}

function communityPackDocStudyTarget(data: Record<string, unknown> | undefined): StudyTarget {
  return storageStudyTarget(data?.studyTarget as RuntimeStudyTarget | undefined);
}

export function communityPackDocMatchesStudyTarget(
  data: Record<string, unknown> | undefined,
  studyTarget?: RuntimeStudyTarget,
): boolean {
  /** New community packs are filtered by their independent pack language, not the active study target. */
  if (isPackLanguage(data?.packLanguage)) return true;
  return communityPackDocStudyTarget(data) === storageStudyTarget(studyTarget);
}

export function mapCommunityPackDocToMarket(
  id: string,
  data: Record<string, unknown> | undefined,
  opts?: MapCommunityPackDocOptions,
): FlashcardMarketPack | null {
  if (!data) return null;
  const studyTarget = communityPackDocStudyTarget(data);
  if (!isPackLanguage(data.packLanguage) && studyTarget !== storageStudyTarget(opts?.studyTarget)) return null;
  const st = String(data.listingStatus ?? '');
  const forCatalog = opts?.forCatalog !== false;
  if (forCatalog) {
    if (st !== 'published' && st !== 'update_pending') return null;
  } else if (
    st !== 'published' &&
    st !== 'update_pending' &&
    st !== 'admin_revision_required' &&
    st !== 'admin_removed'
  ) {
    return null;
  }
  const titleRu = packTitleField(data.titleRu);
  const titleUk = packTitleField(data.titleUk);
  const titleEs = packTitleField(data.titleEs);
  const titlePtBr = packTitleField(data.titlePtBr);
  const titleVi = packTitleField(data.titleVi);
  const titleId = packTitleField(data.titleId);
  const titleTr = packTitleField(data.titleTr);
  const titlePl = packTitleField(data.titlePl);
  if (!titleRu && !titleUk && !titleEs && !titlePtBr && !titleVi && !titleId && !titleTr && !titlePl) return null;
  const codeNameRaw = String(data.codeName ?? '').trim();
  const cat = (data.category as FlashcardPackCategory) ?? 'slang';
  const authorSid = String(data.authorStableId ?? '').trim();
  const social = readPackSocialCounts(data);
  return {
    id,
    codeName: codeNameRaw || derivePackCodeName(id),
    titleRu,
    titleUk,
    titleEs,
    titlePtBr,
    titleVi,
    titleId,
    titleTr,
    titlePl,
    descriptionRu: String(data.descriptionRu ?? ''),
    descriptionUk: String(data.descriptionUk ?? ''),
    descriptionEs: String(data.descriptionEs ?? ''),
    descriptionPtBr: String(data.descriptionPtBr ?? ''),
    descriptionVi: String(data.descriptionVi ?? ''),
    descriptionId: String(data.descriptionId ?? ''),
    descriptionTr: String(data.descriptionTr ?? ''),
    descriptionPl: String(data.descriptionPl ?? ''),
    category: cat,
    cardCount: Math.max(0, num(data.cardCount)),
    /** Легаси-поле ЖЕМЧУГА в документе игнорируем: наборы сообщества за жемчуг
     *  не продавались и не продаются. Их валюта — руны, поле ниже. */
    priceShards: 0,
    /**
     * Цена в РУНАХ, которую поставил автор (владелец 2026-09-17, экран 6-8
     * макета docs/design/runes/MAKET.html). Отменяет Cards 2.1 §1.2
     * «наборы сообщества бесплатны».
     *
     * зачем читать здесь: без этой строки цена, сохранённая автором, терялась
     * бы по дороге из Firestore — каталог и шит покупки всегда видели бы 0.
     * Класс бага «механизм есть, а данных не дали».
     *
     * Поля нет у старых наборов — они остаются бесплатными навсегда.
     */
    priceRunes: Math.max(0, num(data.priceRunes)),
    likesCount: social.likesCount,
    addedCount: social.addedCount,
    // зачем: счётчик откликов едет вместе с лайками из ТОГО ЖЕ документа —
    // так «💬 7» в списках не стоит ни одного дополнительного чтения.
    commentsCount: readPackCommentsCount(data),
    salesCount: Math.max(0, num(data.salesCount)),
    /**
     * Ник автора резолвится отдельно (`packAuthorNames.ts`): в документе набора
     * его нет, а раньше сюда клали обрезанный `authorStableId` — и пользователь
     * видел на экране набора сырой UID вместо ника.
     */
    authorName: '',
    authorStableId: authorSid || undefined,
    studyTarget,
    packLanguage: communityPackDocLanguage(data),
    listingStatus: st,
    isPendingUpdateReview: st === 'update_pending' || st === 'admin_revision_required',
    ugcCardThemeKey: String(data.cardThemeKey ?? '').trim() || undefined,
    /**
     * Связь с роликом YouTube (набор из видео).
     *
     * зачем ЧИТАТЬ ЗДЕСЬ, а не только объявить поле в типе: ровно на этой строке
     * уже терялась цена в рунах — тип её знал, документ её нёс, а маппер молчал,
     * и каталог всегда видел 0 («механизм есть, а данных не дали»). Без этих трёх
     * строк список «Из видео» был бы ПУСТЫМ при полной базе: фильтр ищет videoId,
     * которого в объекте набора нет.
     *
     * Поля нет у обычных наборов — тогда undefined, и блок видео просто не рисуется.
     */
    videoId: videoIdOrUndefined(data.videoId),
    videoTitle: packTitleField(data.videoTitle) || undefined,
    videoDurationSec: Math.max(0, num(data.videoDurationSec)) || undefined,
    // зачем (Карточки 2.0, колода «40 · A2» + три слова): карточки уже в этом документе — ноль новых чтений.
    // Тот же урок, что с ценой в рунах: поле, не прочитанное здесь, до экрана не доедет.
    ...(normalizePackLevel(data.level) ? { level: normalizePackLevel(data.level) } : {}),
    previewWords: packPreviewWords(data.cards, communityPackDocLanguage(data)),
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: typeof data.updatedAt === 'number' ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Cards 2.1 §2.3: каталог сортируется по лайкам ↓, затем по числу добавлений ↓, затем по свежести.
 */
export function sortCommunityMarketPacksBySocial(a: FlashcardMarketPack, b: FlashcardMarketPack): number {
  return comparePacksBySocial(a, b);
}

/** @deprecated Cards 2.1 §2.3: сортировка по рейтингу заменена на сортировку по лайкам. */
export const sortCommunityMarketPacksByRating = sortCommunityMarketPacksBySocial;

/**
 * Тёплый кэш опубликованного каталога сообщества.
 *
 * зачем (Firebase-экономия): запрос читает до 80 документов, а зовут его хаб
 * карточек при КАЖДОМ фокусе и витрина «Лучшее у сообщества». Без кэша каждое
 * возвращение на экран стоило десятки чтений. Каталог сообщества меняется
 * медленно (модерация), поэтому 6 часов — безопасный TTL; pull-to-refresh и
 * явная кнопка «Повторить» проходят мимо кэша через `forceRemote`.
 */
const COMMUNITY_CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
let _communityCatalogCache: {
  key: string;
  at: number;
  packs: FlashcardMarketPack[];
} | null = null;

let catalogGeneration = 0;

/**
 * зачем (PM-252 п.7, Firebase-экономия + мгновенное открытие): кэш в памяти умирал с процессом,
 * и КАЖДЫЙ холодный запуск снова читал 100–200 документов (7 запросов). Каталог публичный и
 * меняется медленно — копия на диске с тем же TTL 6 ч отдаёт его без сети. Запись фоном, чтение
 * один раз на загрузчик. Ключ: `community_catalog_v1:<kind>:<studyTarget>`; стирается сбросом кэша.
 */
export const COMMUNITY_CATALOG_DISK_PREFIX = 'community_catalog_v1:';
type CatalogKind = 'community' | 'video';
type CatalogEntry = { key: string; at: number; packs: FlashcardMarketPack[] };
const catalogDiskKey = (kind: CatalogKind, key: string): string => `${COMMUNITY_CATALOG_DISK_PREFIX}${kind}:${key}`;

async function readCatalogFromDisk(kind: CatalogKind, key: string): Promise<CatalogEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(catalogDiskKey(kind, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CatalogEntry>;
    if (typeof parsed?.at !== 'number' || !Array.isArray(parsed.packs)) {
      console.warn('[PACKS-CATALOG] disk entry malformed -> ignored', JSON.stringify({ kind, key }));
      return null;
    }
    return { key, at: parsed.at, packs: parsed.packs as FlashcardMarketPack[] };
  } catch (error) {
    console.warn('[PACKS-CATALOG] disk read failed -> network', JSON.stringify({ kind, key }), error instanceof Error ? error.message : String(error));
    return null;
  }
}

function writeCatalogToDisk(kind: CatalogKind, entry: CatalogEntry): void {
  void AsyncStorage.setItem(catalogDiskKey(kind, entry.key), JSON.stringify({ at: entry.at, packs: entry.packs }))
    .catch((error: unknown) => {
      console.warn('[PACKS-CATALOG] disk write failed (memory copy still serves)', JSON.stringify({ kind, key: entry.key }), error instanceof Error ? error.message : String(error));
    });
}

/** Один сетевой запрос на ключ: хаб, витрина, прогрев и тренировки на холодном старте больше не дублируют 7 запросов. */
const catalogInFlight = new Map<string, Promise<FlashcardMarketPack[]>>();
function dedupeCatalogFetch(id: string, run: () => Promise<FlashcardMarketPack[]>): Promise<FlashcardMarketPack[]> {
  const pending = catalogInFlight.get(id);
  if (pending) return pending;
  const next = run().finally(() => { catalogInFlight.delete(id); });
  catalogInFlight.set(id, next);
  return next;
}

export function invalidateCommunityPackCatalog(): void {
  catalogGeneration += 1;
  _communityCatalogCache = null;
  // зачем: после публикации/правки своего набора диск не должен вернуть каталог без него.
  void AsyncStorage.getAllKeys()
    .then((keys) => AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(`${COMMUNITY_CATALOG_DISK_PREFIX}community:`))))
    .catch((error: unknown) => {
      console.warn('[PACKS-CATALOG] disk invalidate failed', error instanceof Error ? error.message : String(error));
    });
}

/**
 * DEV-фикстура (phraseman://dev_state?cards=demo): каталог сообщества как свежий кэш (память + диск) — хаб и
 * «Лучшее у сообщества» берут его без сети 6 ч. зачем: съёмка кадров макета (координатор 11.10). В сторе — отказ.
 */
export function seedCommunityCatalogForDev(studyTarget: RuntimeStudyTarget | undefined, packs: FlashcardMarketPack[]): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) {
    console.warn('[PACKS-CATALOG] dev seed отклонён: не dev-сборка');
    return false;
  }
  const entry = { key: String(studyTarget ?? 'default'), at: Date.now(), packs };
  _communityCatalogCache = entry;
  writeCatalogToDisk('community', entry);
  // зачем (cards-v2-025, «в строке 1 слово вместо 3»): сколько слов превью лежит в посеянных наборах — вход строки каталога ([PACK-DECK] row читает то же поле).
  console.log('[PACKS-CATALOG] dev seed', JSON.stringify({ key: entry.key, packs: packs.length, previewLens: packs.map((pack) => (Array.isArray(pack.previewWords) ? pack.previewWords.length : -1)) }));
  return true;
}

/** Синхронный снимок для первого кадра. null — снимка нет, нужен спиннер. */
export function peekPublishedCommunityMarketPacks(
  studyTarget?: RuntimeStudyTarget,
): FlashcardMarketPack[] | null {
  const key = String(studyTarget ?? 'default');
  /**
   * зачем (владелец: «сначала моргает и затем появляется»): промах этого снимка
   * НЕ виден на экране как поломка — каталог просто приезжает вторым кадром.
   * Поэтому каждый ранний выход обязан назвать причину и оба ключа: именно
   * рассинхрон ключа (peek без studyTarget vs load с ним) и давал пустой кадр.
   */
  if (!_communityCatalogCache) {
    if (__DEV__) console.log('[PACKS-FIRSTFRAME] peek MISS reason=no-cache wantKey=%s', key);
    return null;
  }
  if (_communityCatalogCache.key !== key) {
    if (__DEV__) console.log('[PACKS-FIRSTFRAME] peek MISS reason=key-mismatch wantKey=%s cacheKey=%s cachedPacks=%d', key, _communityCatalogCache.key, _communityCatalogCache.packs.length);
    return null;
  }
  const ageMs = Date.now() - _communityCatalogCache.at;
  if (ageMs > COMMUNITY_CATALOG_TTL_MS) {
    if (__DEV__) console.log('[PACKS-FIRSTFRAME] peek MISS reason=stale key=%s ageMs=%d ttlMs=%d', key, ageMs, COMMUNITY_CATALOG_TTL_MS);
    return null;
  }
  if (__DEV__) console.log('[PACKS-FIRSTFRAME] peek HIT key=%s packs=%d ageMs=%d', key, _communityCatalogCache.packs.length, ageMs);
  return _communityCatalogCache.packs;
}

/* ═══════════ НАБОРЫ ИЗ ВИДЕО ═══════════ */

/** Отдельный снимок раздела «Из видео» — у него своя выдача, не общий лимит. */
let _videoCatalogCache: { key: string; at: number; packs: FlashcardMarketPack[] } | null = null;

/** Сколько наборов из видео тянем за раз. Лента листается, всё сразу не нужно. */
const VIDEO_PACKS_LIMIT = 60;

export function peekVideoMarketPacks(studyTarget?: RuntimeStudyTarget): FlashcardMarketPack[] | null {
  const key = String(studyTarget ?? 'default');
  if (!_videoCatalogCache || _videoCatalogCache.key !== key) return null;
  return Date.now() - _videoCatalogCache.at <= COMMUNITY_CATALOG_TTL_MS ? _videoCatalogCache.packs : null;
}

/**
 * Наборы, собранные из роликов.
 *
 * зачем ОТДЕЛЬНЫЙ запрос, а не фильтр общего каталога (это НЕ дубль загрузчика):
 * общая выдача берёт `limit(40)` на язык и сортирует по лайкам. Наборы из видео
 * конкурировали бы в ней с наборами сообщества за те же 40 мест — при полном
 * каталоге раздел «Из видео» оказался бы ПУСТЫМ при заполненной базе. Ровно тот
 * класс бага, что уже ловили: «механизм есть, а данных не дали».
 * `where('videoId', '!=', null)` даёт разделу собственные места.
 *
 * Стоимость: один запрос на вход в раздел, результат живёт в кэше тот же TTL,
 * что и каталог сообщества. Фоновых таймеров нет.
 */
export async function loadVideoMarketPacks(
  studyTarget?: RuntimeStudyTarget,
  opts?: { forceRemote?: boolean },
): Promise<FlashcardMarketPack[]> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    DebugLogger.warn('[VIDEO-PACK]', 'каталог не читается: облако выключено (Expo Go или CLOUD_SYNC_ENABLED=false)');
    return [];
  }
  const cacheKey = String(studyTarget ?? 'default');
  if (!opts?.forceRemote) {
    const warm = peekVideoMarketPacks(studyTarget);
    if (warm) return warm;
    const disk = await readCatalogFromDisk('video', cacheKey);
    if (disk && Date.now() - disk.at <= COMMUNITY_CATALOG_TTL_MS) {
      _videoCatalogCache = disk;
      DebugLogger.info('[VIDEO-PACK]', `каталог с диска: ${disk.packs.length}, возраст ${Math.round((Date.now() - disk.at) / 60000)} мин`);
      return disk.packs;
    }
  }
  return dedupeCatalogFetch(`video:${cacheKey}`, () => fetchVideoCatalogFromNetwork(studyTarget, cacheKey));
}

async function fetchVideoCatalogFromNetwork(
  studyTarget: RuntimeStudyTarget | undefined,
  cacheKey: string,
): Promise<FlashcardMarketPack[]> {
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', '==', 'published')
      .where('videoId', '!=', null)
      .limit(VIDEO_PACKS_LIMIT)
      .get();
    const list = snap.docs
      .map((d) => mapCommunityPackDocToMarket(d.id, d.data() as Record<string, unknown>, { studyTarget }))
      .filter(Boolean) as FlashcardMarketPack[];
    /** Порядок — общий для всего приложения: лайки → добавления → свежесть. */
    const out = list.filter((pack) => !!pack.videoId).sort(comparePacksBySocial);
    _videoCatalogCache = { key: cacheKey, at: Date.now(), packs: out };
    writeCatalogToDisk('video', _videoCatalogCache);
    DebugLogger.info('[VIDEO-PACK]', `каталог из сети: документов ${snap.docs.length}, с videoId ${out.length}`);
    return out;
  } catch (error) {
    // зачем не немой catch: пустой раздел при полной базе — это как раз тот
    // отказ, который ищут кругами. Здесь же видно и причину (часто — индекс).
    DebugLogger.error('[VIDEO-PACK]:loadVideoMarketPacks', error, 'warning');
    // Уже показанный непустой снимок оставляем на экране при кратком сетевом
    // отказе. Но отсутствие пригодного снимка НЕ равно пустому каталогу:
    // вызывающий экран должен получить reject и показать «Повторить».
    if (_videoCatalogCache?.key === cacheKey && _videoCatalogCache.packs.length > 0) {
      return _videoCatalogCache.packs;
    }
    // Копия на диске любого возраста лучше, чем «Повторить» на пустом экране (D158).
    const disk = await readCatalogFromDisk('video', cacheKey);
    if (disk && disk.packs.length > 0) {
      DebugLogger.warn('[VIDEO-PACK]', `сеть недоступна — показываем копию с диска (${disk.packs.length})`);
      _videoCatalogCache = disk;
      return disk.packs;
    }
    throw error;
  }
}

export async function loadPublishedCommunityMarketPacks(
  studyTarget?: RuntimeStudyTarget,
  opts?: { forceRemote?: boolean },
): Promise<FlashcardMarketPack[]> {
  const generation = catalogGeneration;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    /** зачем: пустой каталог в Expo Go выглядел как «сообщество пустое», а не как отключённое облако. */
    if (__DEV__) console.log('[PACKS-FIRSTFRAME] load EARLY-RETURN reason=cloud-off isExpoGo=%s cloudSync=%s', String(IS_EXPO_GO), String(CLOUD_SYNC_ENABLED));
    return [];
  }
  const cacheKey = String(studyTarget ?? 'default');
  if (!opts?.forceRemote) {
    const warm = peekPublishedCommunityMarketPacks(studyTarget);
    if (warm) {
      if (__DEV__) console.log('[PACKS-FIRSTFRAME] load CACHE key=%s packs=%d source=warm-cache', cacheKey, warm.length);
      return warm;
    }
    const disk = await readCatalogFromDisk('community', cacheKey);
    if (disk && Date.now() - disk.at <= COMMUNITY_CATALOG_TTL_MS && generation === catalogGeneration) {
      _communityCatalogCache = disk;
      console.log('[PACKS-CATALOG] load DISK', JSON.stringify({ key: cacheKey, packs: disk.packs.length, ageMin: Math.round((Date.now() - disk.at) / 60000) }));
      return disk.packs;
    }
  } else if (__DEV__) {
    console.log('[PACKS-FIRSTFRAME] load FORCE-REMOTE key=%s (cache bypassed by user gesture)', cacheKey);
  }
  return dedupeCatalogFetch(`community:${cacheKey}:${generation}`, () => fetchCommunityCatalogFromNetwork(studyTarget, cacheKey, generation));
}

async function fetchCommunityCatalogFromNetwork(
  studyTarget: RuntimeStudyTarget | undefined,
  cacheKey: string,
  generation: number,
): Promise<FlashcardMarketPack[]> {
  try {
    // Limit each language independently; a busy EN catalog must not starve FR/DE/ES.
    // зачем (D127): «Без языка» — отдельная корзина, иначе такие наборы тонули бы
    // в общем limit(80) и не доходили до витрины. +1 запрос раз в 6 часов (кэш).
    const languageSnapshots = await Promise.all(PACK_LANGUAGE_CHOICES.map(language => firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', 'in', ['published', 'update_pending'])
      .where('packLanguage', '==', language)
      .limit(40)
      .get()));
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('listingStatus', 'in', ['published', 'update_pending'])
      .limit(80)
      .get();
    const docs = [...new Map([...languageSnapshots.flatMap(snapshot => snapshot.docs), ...snap.docs].map(doc => [doc.id, doc])).values()];
    const list = docs
      .map((d) => mapCommunityPackDocToMarket(d.id, d.data() as Record<string, unknown>, { studyTarget }))
      .filter(Boolean) as FlashcardMarketPack[];
    list.sort(sortCommunityMarketPacksBySocial);
    const out = PACK_LANGUAGE_CHOICES.flatMap(language => list.filter(pack => normalizePackLanguage(pack.packLanguage) === language).slice(0, 40));
    if (generation !== catalogGeneration) {
      if (__DEV__) console.log('[PACKS-FIRSTFRAME] load ABORT reason=catalog-invalidated key=%s', cacheKey);
      return [];
    }
    _communityCatalogCache = { key: cacheKey, at: Date.now(), packs: out };
    writeCatalogToDisk('community', _communityCatalogCache);
    console.log('[PACKS-CATALOG] load NETWORK', JSON.stringify({ key: cacheKey, docs: docs.length, packs: out.length }));
    return out;
  } catch (e) {
    // зачем: вкладка «Сообщество» тихо показывала пустой список без единой
    // подсказки в логах — владелец видел 0 наборов при 2 published в базе.
    if (__DEV__) console.warn('[communityFirestore] loadPublishedCommunityMarketPacks failed', e);
    // Отказ сети не должен обнулять уже показанный каталог — отдаём прошлый снимок (память, затем диск любого возраста).
    if (_communityCatalogCache?.key === cacheKey) return _communityCatalogCache.packs;
    const disk = await readCatalogFromDisk('community', cacheKey);
    if (disk) {
      console.warn('[PACKS-CATALOG] network failed -> disk copy', JSON.stringify({ key: cacheKey, packs: disk.packs.length }));
      _communityCatalogCache = disk;
      return disk.packs;
    }
    return [];
  }
}

/**
 * 8C-2: результат загрузки наборов автора. `error` — облако не ответило: это НЕ «у автора
 * нет наборов». В `packs` при ошибке — последнее известное для этого автора и цели (или []).
 */
export type AuthorCommunityPacksResult = {
  status: 'ok' | 'error';
  packs: FlashcardMarketPack[];
};

/** 8C-2: последнее удачное чтение по (автор, цель); ключ содержит id автора, поэтому чужому аккаунту не достаётся. */
const AUTHOR_PACKS_LAST_KNOWN_LIMIT = 8;
const authorPacksLastKnown = new Map<string, FlashcardMarketPack[]>();

// зачем (Account V2, Пакет 8L): последнее известное живёт в памяти процесса. При смене
// поколения аккаунта (вход в другой аккаунт, выход, сброс) оно целиком теряет смысл —
// чистим, как и остальные кэши, привязанные к поколению. Ключ и так содержит автора,
// но память о прошлом аккаунте не должна переживать переход.
subscribeAccountGeneration((token) => {
  if (authorPacksLastKnown.size === 0) return;
  console.log(`[MY-PACKS] author_packs last_known_cleared reason=account_generation phase=${token.phase} entries=${authorPacksLastKnown.size}`);
  authorPacksLastKnown.clear();
});

/**
 * 8L: набор отозван/удалён автором — убрать его из последнего известного, иначе при
 * следующем сбое чтения он «воскреснет» в «Моих наборах» и тренировке.
 */
export function forgetAuthorPackLastKnown(packId: string | null | undefined): void {
  if (!packId) return;
  let removed = 0;
  for (const [key, packs] of authorPacksLastKnown) {
    const next = packs.filter((pack) => pack.id !== packId);
    if (next.length !== packs.length) {
      removed += packs.length - next.length;
      authorPacksLastKnown.set(key, next);
    }
  }
  console.log(`[MY-PACKS] author_packs last_known_forget removed=${removed}`);
}

function rememberAuthorPacks(key: string, packs: FlashcardMarketPack[]): void {
  authorPacksLastKnown.delete(key);
  authorPacksLastKnown.set(key, packs);
  while (authorPacksLastKnown.size > AUTHOR_PACKS_LAST_KNOWN_LIMIT) {
    const oldest = authorPacksLastKnown.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    authorPacksLastKnown.delete(oldest);
  }
}

/** Набори автора в очікуванні повторної модерації після редагування (з ознакою «помилка ≠ порожньо»). */
export async function loadAuthorCommunityPacksPendingUpdateResult(
  authorStableId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<AuthorCommunityPacksResult> {
  if (!authorStableId || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    console.log(`[MY-PACKS] author_packs result=ok code=${!authorStableId ? 'no_author' : 'cloud_disabled'} count=0`);
    return { status: 'ok', packs: [] };
  }
  const lastKnownKey = `${authorStableId}|${String(studyTarget ?? '')}`;
  const readGeneration = captureAccountGeneration().generation;
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('authorStableId', '==', authorStableId)
      .get();
    const out: FlashcardMarketPack[] = [];
    for (const doc of snap.docs) {
      const st = String(doc.data().listingStatus ?? '');
      if (st !== 'published' && st !== 'update_pending' && st !== 'admin_revision_required') continue;
      const m = mapCommunityPackDocToMarket(doc.id, doc.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
      if (m) out.push(m);
    }
    // зачем (8L): чтение, начатое до смены аккаунта, не наполняет очищенный кэш заново.
    if (captureAccountGeneration().generation === readGeneration) rememberAuthorPacks(lastKnownKey, out);
    else console.log('[MY-PACKS] author_packs last_known_skip reason=account_generation_changed');
    console.log(`[MY-PACKS] author_packs result=ok code=read docs=${snap.docs.length} count=${out.length}`);
    return { status: 'ok', packs: out };
  } catch (e) {
    // зачем (8C-2): раньше ошибка глоталась в `[]`, и «Мои наборы» / тренировка считали,
    // что опубликованных наборов у автора нет. Теперь — явный error + последнее известное.
    const lastKnown = authorPacksLastKnown.get(lastKnownKey);
    const code = (e as { code?: unknown } | null)?.code;
    console.warn(`[MY-PACKS] author_packs result=error code=${typeof code === 'string' ? code : (e instanceof Error ? e.name : typeof e)}`
      + ` last_known=${lastKnown ? lastKnown.length : 'none'}`);
    return { status: 'error', packs: lastKnown ?? [] };
  }
}

/** Набори автора в очікуванні повторної модерації після редагування. При помилці — останнє відоме (див. `...Result`). */
export async function loadAuthorCommunityPacksPendingUpdate(
  authorStableId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardMarketPack[]> {
  return (await loadAuthorCommunityPacksPendingUpdateResult(authorStableId, studyTarget)).packs;
}

export type CommunityPackEditorSnapshot = {
  studyTarget: StudyTarget;
  packLanguage?: PackLanguage;
  title: string;
  description: string;
  cardThemeKey: string;
  /** Цена набора в рунах (0 — бесплатный). */
  priceRunes?: number;
  /** Уровень A1–C1 (Карточки 2.0) — чтобы правка показала выбранный автором уровень. */
  level?: PackLevel;
  cards: {
    id: string;
    en: string;
    ru: string;
    uk: string;
    translationUk?: string;
    origin?: { source?: string; sourceId?: string; sourceTitle?: string };
    es?: string;
    sourceLocales?: {
      'pt-BR'?: string;
      vi?: string;
      id?: string;
      tr?: string;
      pl?: string;
    };
    richSchemaVersion?: 1;
    exampleTarget?: string;
    exampleSource?: string;
    note?: string;
    sourceReferences?: string[];
  }[];
};

export async function fetchCommunityPackForAuthorEdit(
  packId: string,
  authorStableId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CommunityPackEditorSnapshot | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED || !packId || !authorStableId) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    const d = snap.data() as Record<string, unknown>;
    const docStudyTarget = communityPackDocStudyTarget(d);
    if (!communityPackDocMatchesStudyTarget(d, studyTarget)) return null;
    if (String(d.authorStableId ?? '').trim() !== authorStableId) return null;
    const st = String(d.listingStatus ?? '');
    if (st !== 'published' && st !== 'update_pending' && st !== 'admin_revision_required') return null;
    const cardsRaw = Array.isArray(d.cards) ? d.cards : [];
    const cards = cardsRaw.map((raw: unknown, i: number) => {
      const c = raw as Record<string, unknown>;
      return {
        id: String(c.id ?? `c${i + 1}`).trim() || `c${i + 1}`,
        en: normalizePackCardTexts(c, normalizePackLanguage(d.packLanguage)).targetText,
        ru: normalizePackCardTexts(c, normalizePackLanguage(d.packLanguage)).translationText,
        uk: String(c.uk ?? '').trim(),
        translationUk: typeof c.translationUk === 'string' ? c.translationUk : undefined,
        origin: c.origin && typeof c.origin === 'object' ? c.origin as { source?: string; sourceId?: string; sourceTitle?: string } : undefined,
        es: String(c.es ?? '').trim() || undefined,
        sourceLocales: {
          'pt-BR': String((c.sourceLocales as Record<string, unknown> | undefined)?.['pt-BR'] ?? '').trim() || undefined,
          vi: String((c.sourceLocales as Record<string, unknown> | undefined)?.vi ?? '').trim() || undefined,
          id: String((c.sourceLocales as Record<string, unknown> | undefined)?.id ?? '').trim() || undefined,
          tr: String((c.sourceLocales as Record<string, unknown> | undefined)?.tr ?? '').trim() || undefined,
          pl: String((c.sourceLocales as Record<string, unknown> | undefined)?.pl ?? '').trim() || undefined,
        },
        richSchemaVersion: Number(c.richSchemaVersion) === 1 ? 1 as const : undefined,
        exampleTarget: String(c.exampleTarget ?? '').trim() || undefined,
        exampleSource: String(c.exampleSource ?? '').trim() || undefined,
        note: String(c.note ?? '').trim() || undefined,
        sourceReferences: Array.isArray(c.sourceReferences) ? c.sourceReferences.map(String).map((value) => value.trim()).filter(Boolean) : undefined,
      };
    });
    return {
      studyTarget: docStudyTarget,
      packLanguage: communityPackDocLanguage(d),
      title: String(d.titleRu ?? d.titleUk ?? d.titleEs ?? d.titlePtBr ?? d.titleVi ?? d.titleId ?? d.titleTr ?? d.titlePl ?? '').trim(),
      description: String(d.descriptionRu ?? d.descriptionUk ?? d.descriptionEs ?? d.descriptionPtBr ?? d.descriptionVi ?? d.descriptionId ?? d.descriptionTr ?? d.descriptionPl ?? '').trim(),
      cardThemeKey: String(d.cardThemeKey ?? UGC_CARD_THEME_DEFAULT_ID).trim() || UGC_CARD_THEME_DEFAULT_ID,
      // зачем (владелец 2026-09-21): без этого автор платного набора открывал
      // правку с ценой 0 и обнулял её, сам того не зная.
      priceRunes: Math.max(0, Math.floor(Number(d.priceRunes ?? 0))) || 0,
      level: normalizePackLevel(d.level),
      cards,
    };
  } catch (e) {
    // зачем логируем (правило проекта «сперва логи», аудит 17.09.2026): немой
    // catch здесь означал, что автор открывает редактор СВОЕГО набора и видит
    // пустой экран без единой строки в логах — нельзя отличить отказ сети от
    // permission-denied или битых данных карточки.
    DebugLogger.warn('communityFirestore:authorEdit', `[PACK-EDIT] снимок набора для редактирования не получен packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Карточки из поля `cards` документа community_packs (как у CF при модерации). */
export function communityPackCardsToCardItems(packId: string, cards: unknown, packLanguage?: PackLanguage): CardItem[] {
  if (!Array.isArray(cards)) return [];
  const out: CardItem[] = [];
  for (const raw of cards) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const id = String(c.id ?? '').trim();
    const normalizedText = normalizePackCardTexts(c, normalizePackLanguage(packLanguage));
    const en = normalizedText.targetText;
    const ru = normalizedText.translationText;
    const es = String(c.es ?? '').trim();
    /** У `CommunityPackCardPayload` третя колонка — нотатка/опис (редактор), не український переклад фрази. */
    const descriptionNote = String(c.uk ?? '').trim();
    const richSchemaVersion = Number(c.richSchemaVersion) === 1 ? 1 as const : undefined;
    const exampleTarget = String(c.exampleTarget ?? c.exampleEn ?? '').trim();
    const exampleSource = String(c.exampleSource ?? c.exampleRu ?? '').trim();
    const note = String(c.note ?? c.description ?? descriptionNote).trim();
    const sourceReferences = Array.isArray(c.sourceReferences) ? c.sourceReferences.map(String).map((value) => value.trim()).filter(Boolean) : [];
    const sourceLocales = {
      'pt-BR': String((c.sourceLocales as Record<string, unknown> | undefined)?.['pt-BR'] ?? '').trim() || undefined,
      vi: String((c.sourceLocales as Record<string, unknown> | undefined)?.vi ?? '').trim() || undefined,
      id: String((c.sourceLocales as Record<string, unknown> | undefined)?.id ?? '').trim() || undefined,
      tr: String((c.sourceLocales as Record<string, unknown> | undefined)?.tr ?? '').trim() || undefined,
      pl: String((c.sourceLocales as Record<string, unknown> | undefined)?.pl ?? '').trim() || undefined,
    };
    const hasSourceLocale = Object.values(sourceLocales).some((text) => !!String(text ?? '').trim());
    if (!id || !en || (!ru && !es && !hasSourceLocale)) continue;
    // зачем: D131 — таймкод фразы набора из видео едет тем же чтением документа
    // набора; без этой строки поле терялось бы в маппере («данных не дали»).
    const videoStartSec = cardVideoStartSecFromRaw(c.videoStartSec, `${packId}_${id}`);
    const item = {
      id: `${packId}_${id}`,
      en,
      packLanguage: normalizePackLanguage(packLanguage),
      origin: c.origin && typeof c.origin === 'object' ? c.origin : undefined,
      ...(videoStartSec === undefined ? {} : { videoStartSec }),
      sourceLocales,
      description: note || undefined,
      categoryId: 'custom',
      isSystem: true,
      source: 'lesson',
      sourceId: `DEV:${packId}`,
      richSchemaVersion,
      exampleTarget: exampleTarget || undefined,
      exampleSource: exampleSource || undefined,
      note: note || undefined,
      sourceReferences: sourceReferences.length ? sourceReferences : undefined,
      exampleEn: exampleTarget || undefined,
      exampleRu: exampleSource || undefined,
    } as CardItem;
    item.ru = ru;
    item.uk = String(c.translationUk ?? '').trim() || ru;
    item.es = es || undefined;
    out.push(item);
  }
  return out;
}

export async function fetchCommunityPackCards(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardItem[]> {
  // зачем (координатор 12.10, съёмка R1): демо-набор под dev `packcards=` — карточки из памяти, сеть не вызывается.
  if (isDevCommunityPackId(packId)) {
    const devPack = getDevCommunityPack(packId);
    console.warn(`[DEV-STATE] community: карточки набора из памяти pack=${packId} cards=${devPack?.cards.length ?? 0}`); // guard-ok: dev-ветка
    return devPack ? communityPackCardsToCardItems(packId, devPack.cards, normalizePackLanguage(devPack.meta.packLanguage)) : [];
  }
  // зачем: [PACK-OPEN] — каждый ранний выход и время чтения документа (набор открывался 138 с, причина неизвестна)
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    console.log(`[PACK-OPEN] cards:skip packId=${packId} expoGo=${IS_EXPO_GO} cloudSync=${CLOUD_SYNC_ENABLED}`);
    return [];
  }
  const tRead = Date.now();
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    console.log(`[PACK-OPEN] cards:doc packId=${packId} exists=${snap.exists} ms=${Date.now() - tRead}`);
    if (!snap.exists) return [];
    const d = snap.data() as Record<string, unknown> | undefined;
    if (!d) { console.log(`[PACK-OPEN] cards:no_data packId=${packId}`); return []; }
    if (!communityPackDocMatchesStudyTarget(d, studyTarget)) { console.log(`[PACK-OPEN] cards:target_mismatch packId=${packId}`); return []; }
    const st = String(d.listingStatus ?? '');
    console.log(`[PACK-OPEN] cards:status packId=${packId} listingStatus=${st} rawCards=${Array.isArray(d.cards) ? d.cards.length : typeof d.cards}`);
    if (st === 'published' || st === 'update_pending' || st === 'admin_revision_required') {
      return communityPackCardsToCardItems(packId, d.cards, communityPackDocLanguage(d));
    }
    if (st === 'admin_removed' && isCommunityPacksCloudEnabled()) {
      const sid = await getCanonicalUserId();
      if (!sid) return [];
      try {
        const res = await callCommunityFetchPackCardsIfAccessible({
          stableId: sid,
          packId,
          studyTarget: storageStudyTarget(studyTarget),
        });
        if (res?.cards?.length) return communityPackCardsToCardItems(packId, res.cards, communityPackDocLanguage(d));
      } catch (e) {
        // Набор снят админом: доступ к карточкам для уже добавивших даёт только
        // callable. Отказ здесь = пустой набор на экране, причину не глушим.
        DebugLogger.warn('communityFirestore:cards', `[PACK-CARDS] callable для снятого набора отказал packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
        return [];
      }
    }
    console.log(`[PACK-OPEN] cards:status_unreadable packId=${packId} listingStatus=${st}`);
    return [];
  } catch (e) {
    // зачем логируем (аудит 17.09.2026): человек открывал добавленный набор и
    // видел НОЛЬ карточек молча — ни строки в логах, хотя соседние функции
    // этого же файла уже пишут причину через DebugLogger.
    DebugLogger.warn('communityFirestore:cards', `[PACK-CARDS] карточки набора не прочитаны packId=${packId}: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

export async function fetchCommunityPackMeta(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardMarketPack | null> {
  // зачем (съёмка R1): мета демо-набора из памяти, без сети.
  if (isDevCommunityPackId(packId)) return (getDevCommunityPack(packId)?.meta as unknown as FlashcardMarketPack | undefined) ?? null;
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return null;
    return mapCommunityPackDocToMarket(packId, snap.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
  } catch (e) {
    if (__DEV__) console.warn('[communityFirestore] fetchCommunityPackMeta failed', packId, e);
    return null;
  }
}

/**
 * Пакет 8C: то же чтение, что fetchCommunityPackMeta, но с различением исходов.
 * зачем: «Мои наборы» держали экран в загрузке, пока хоть один добавленный набор не
 * найден — а несуществующий набор (удалён, тестовый id) не находится никогда. Теперь
 * 'missing' (документа нет / облако выключено в этой сборке) — окончательно для сессии,
 * 'error' (сеть, права) — повтор позже. Без uid/id в логах.
 */
export type CommunityPackMetaResult =
  | { status: 'found'; pack: FlashcardMarketPack }
  | { status: 'missing'; reason: 'not_found' | 'unmappable' | 'cloud_disabled' }
  | { status: 'error' };

export async function fetchCommunityPackMetaResult(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<CommunityPackMetaResult> {
  // зачем (съёмка R1, cards-044): мета демо-набора из памяти, без сети; без `packcards=on` — «нет документа».
  if (isDevCommunityPackId(packId)) {
    const devMeta = getDevCommunityPack(packId)?.meta as unknown as FlashcardMarketPack | undefined;
    console.warn(`[DEV-STATE] community: мета набора из памяти pack=${packId} found=${!!devMeta}`); // guard-ok: dev-ветка
    return devMeta ? { status: 'found', pack: devMeta } : { status: 'missing', reason: 'not_found' };
  }
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { status: 'missing', reason: 'cloud_disabled' };
  try {
    const snap = await firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId).get();
    if (!snap.exists) return { status: 'missing', reason: 'not_found' };
    const pack = mapCommunityPackDocToMarket(packId, snap.data() as Record<string, unknown>, { forCatalog: false, studyTarget });
    return pack ? { status: 'found', pack } : { status: 'missing', reason: 'unmappable' };
  } catch (e) {
    console.warn(`[MY-PACKS] meta_fetch_failed kind=${e instanceof Error ? e.name : typeof e}`);
    return { status: 'error' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): размеры кэшей этого модуля попадают в [HUB-LIFECYCLE] на mount/unmount хаба; вне dev — пусто.
registerHubCacheProbe('community.catalogInFlight', () => catalogInFlight.size);
registerHubCacheProbe('community.authorPacksLastKnown', () => authorPacksLastKnown.size);
registerHubCacheProbe('community.catalogPacks', () => _communityCatalogCache?.packs.length ?? 0);
registerHubCacheProbe('community.videoCatalogPacks', () => _videoCatalogCache?.packs.length ?? 0);
