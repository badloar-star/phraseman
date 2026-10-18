import { flashcardsDeleteHintSeenKey, type RuntimeStudyTarget } from '../target_storage_keys';
import { registerHubCacheProbe } from '../hub_lifecycle_probe';
import { isDevCardsFail, isDevCardsHeld } from '../dev_cards_state';
import { useLang } from '../../components/LangContext';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from '../flashcards_target_gate';
import { ensureFrenchRemoteFlashcards, prefetchFrenchRemoteFlashcards } from '../french_flashcard_remote_runtime';
import { storageStudyTarget } from '../target_storage_keys';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from '../account_generation';
import { accountScopeKey } from '../account_scope_key';
/**
 * cards-2.0 (E11): загрузка данных коллекции, вынесенная из монолита
 * flashcards_collection.tsx (§7 E11 — разбиение до ≤600 строк).
 *
 * Здесь живут: module-level кэши мгновенной отрисовки, prime/stage-функции
 * (реэкспортируются из flashcards_collection.tsx для внешних вызовов),
 * миграция uk/транскрипций и загрузка маркета/UGC. Пост-загрузочная навигация
 * (restore-позиция, DEV-пак, deeplink) — через onLoaded-колбэк контейнера.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Flashcard,
  loadFlashcards,
  loadAllSavedFlashcards,
  removeFlashcardWithSnapshot,
  restoreFlashcard,
  mergeSavedFlashcardRepairs,
} from '../../hooks/use-flashcards';
import {
  getTranscription,
  needsTranscriptionRefresh,
  TRANSCRIPTION_ENGINE_VERSION,
} from '../transcription';
import { actionToastTri, emitAppEvent } from '../events';
import { checkAchievements } from '../achievements';
import { deleteCustomCard, listCustomCards, restoreCustomCard } from './custom_cards_store';
import { fcHaptic } from './SoundService';
import { getCardPackPaywallTheme, getCommunityUgcPackPaywallTheme } from './cardPackPaywallTheme';
import type { ThemeMode } from '../../constants/theme';
import {
  applyCardFilter,
  filterSavedCardsByContentKind,
  getCardsForCategory,
  searchCards,
  type SavedCardContentKind,
} from './selectors';
import { computeUnlockedSavedIds, splitByFreeLimit } from './free_limit';
import { CardItem, type CategoryId } from './types';
import { normalizePackLanguage } from './pack_languages';
import {
  readCustomCards,
  readFlashcardsProgress,
  type FlashcardsProgress,
} from './storage';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  consumeDevActivePack,
  reserveBundledMarketPacks,
  loadBuiltMarketplaceCardsCache,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  marketOwnedIdsCacheKey,
  saveBuiltMarketplaceCardsCache,
  type FlashcardMarketPack,
} from './marketplace';
import {
  clearStagedNavigationPackId,
  consumeStagedCommunityPackMarketCards,
  getStagedNavigationPackId,
  peekStagedCommunityPackCards,
  peekStagedCommunityPackMeta,
  stagedCommunityPackCardsPromise,
  stageCommunityPackCardsForNavigation,
} from '../community_packs/staging';
import { peekCommunityPackOpen, startCommunityPackOpen } from '../community_packs/stage_with_retry';
import { LOAD_GATE_TOTAL_MS } from '../load_gate_config';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { ugcCardChrome } from '../community_packs/ugcCardThemePresets';
import {
  loadLocalAuthorPacks,
  localAuthorPackCardItems,
  localAuthorPackToMarketPack,
} from '../community_packs/localAuthorPacks';
import {
  fetchCommunityPackCards,
  loadPublishedCommunityMarketPacks,
  peekPublishedCommunityMarketPacks,
} from '../community_packs/communityFirestore';
import { getCanonicalUserId } from '../user_id_policy';

/** Потолок загрузки «Сохранённых» без кэша (D158): тот же, что у useLoadGate; по его истечении — loadError и «Сейчас недоступно». */
const CARDS_LOAD_CEILING_MS = LOAD_GATE_TOTAL_MS;
import { noteSwallowed, noteSwallowedHandler, noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// Module-level cache — survives re-renders; warm via `primeFlashcardsCollectionCache` (хаб / root)
let _savedCardsCache: CardItem[] | null = null;
let _customCardsCache: CardItem[] | null = null;
let _collectionCacheScope = '';
function collectionCacheScope(studyTarget?: RuntimeStudyTarget): string {
  return `${accountScopeKey(captureAccountGeneration())}|${storageStudyTarget(studyTarget)}`;
}

/**
 * Тот же набор карточек? Сравниваем по id и полям, которые реально видно в
 * списке. Нужно, чтобы повторный вход в раздел не подменял state новым массивом
 * с идентичным содержимым: новая ссылка перерисовывала бы весь список зря
 * (репорт владельца «при открытии раздела карточек прыгают состояния»).
 * Полное глубокое сравнение здесь дороже самой перерисовки, поэтому его нет.
 */
/** Тот же список id? Тот же смысл, что и у sameCardList, но для owned-паков. */
function sameIdList(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function sameCardList(a: readonly CardItem[], b: readonly CardItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id
      || x.en !== y.en
      || x.ru !== y.ru
      || x.uk !== y.uk
      || x.es !== y.es
      || x.transcription !== y.transcription
      || JSON.stringify(x) !== JSON.stringify(y)
    ) return false;
  }
  return true;
}

// Built once per app session — lazy dynamic import so the ~2 MB lesson data
// files are NOT loaded at startup (only when a card actually needs migration).
let _enToUkCache: Map<string, string> | null = null;
async function getEnToUkMap(): Promise<Map<string, string>> {
  if (_enToUkCache) return _enToUkCache;
  const { getLessonData } = await import('../lesson_data_all');
  _enToUkCache = new Map<string, string>();
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    for (const p of getLessonData(lessonId)) {
      if (p.english && p.ukrainian && p.ukrainian !== p.russian) {
        _enToUkCache.set(p.english.trim(), p.ukrainian);
      }
    }
  }
  return _enToUkCache;
}

export const savedToCard = (f: Flashcard, fallbackPackLanguage?: unknown): CardItem => ({
  id: f.id, en: f.en, ru: f.ru, uk: f.uk || f.ru,
  es: f.es,
  sourceLocales: f.sourceLocales,
  sourceTitle: f.sourceTitle,
  studyTarget: f.studyTarget,
  transcription: f.transcription,
  categoryId: 'saved', isSystem: false,
  source: f.source, sourceId: f.sourceId,
  packLanguage: normalizePackLanguage(f.packLanguage ?? f.studyTarget ?? fallbackPackLanguage),
  addedAt: f.addedAt,
  literalRu: f.literalRu,
  literalUk: f.literalUk,
  literalEs: f.literalEs,
  explanationRu: f.explanationRu,
  explanationUk: f.explanationUk,
  explanationEs: f.explanationEs,
  exampleEn: f.exampleEn,
  exampleRu: f.exampleRu,
  exampleUk: f.exampleUk,
  exampleEs: f.exampleEs,
  usageNoteRu: f.usageNoteRu,
  usageNoteUk: f.usageNoteUk,
  usageNoteEs: f.usageNoteEs,
  register: f.register,
  level: f.level,
});

/**
 * Прогрів кешу колекції до відкриття екрана: збережені + кастомні з AsyncStorage
 * (і розігрів шляху built-market cache). Не блокує JS — тільки void Promise.
 */
export function primeFlashcardsCollectionCache(studyTarget?: RuntimeStudyTarget) {
  const token = captureAccountGeneration();
  const scope = collectionCacheScope(studyTarget);
  void Promise.all([
    loadAllSavedFlashcards().catch((swallowedError: unknown): Flashcard[] => { noteSwallowed('useCollectionData:promise_1', swallowedError); return []; }),
    readCustomCards(studyTarget).catch(noteSwallowedAs('useCollectionData:promise_2', null)),
    loadAccessiblePackIds(studyTarget).catch((swallowedError: unknown): string[] => { noteSwallowed('useCollectionData:promise_3', swallowedError); return []; }),
    loadBuiltMarketplaceCardsCache(studyTarget).catch(noteSwallowedAs<null>('useCollectionData:promise_4', null)),
    /**
     * зачем (владелец, 2026-08-16, «все разделы должны быть уже загружены, когда
     * открываем карточки»): без каталога наборов экран «Мои наборы» стартовал
     * пустым — его синхронная гидратация (peekMyPacksGroups) читает именно
     * warmMarketplacePacks. Греем здесь же: раздел один, и его подразделы должны
     * открываться готовыми, а не досоздаваться по одному.
     * Результат кэшируется в модуле marketplace, повторных чтений не будет.
     */
    loadMarketplacePacks(studyTarget).catch((swallowedError: unknown): FlashcardMarketPack[] => { noteSwallowed('useCollectionData:promise_5', swallowedError); return []; }),
  ]).then(([saved, rawCustom]) => {
    if (!isCurrentAccountGeneration(token)) return;
    _collectionCacheScope = scope;
    _savedCardsCache = saved.map((card) => savedToCard(card, studyTarget));
    _customCardsCache = Array.isArray(rawCustom) ? (rawCustom as CardItem[]) : [];
  });
}

/**
 * Викликати синхронно в `router.push` перед відкриттям колекції з `?pack=` —
 * тоді перший кадр уже містить картки з бандла (без порожнього «створити картку»).
 */
let stagedOwnedPackMarketCards: { key: string; cards: CardItem[] } | null = null;

function ownedPackStageKey(packId: string, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}::${packId}`;
}

function consumeStagedOwnedPackMarketCards(
  packId: string | null,
  studyTarget?: RuntimeStudyTarget,
): CardItem[] | null {
  const key = packId ? ownedPackStageKey(packId, studyTarget) : null;
  const cards = key && stagedOwnedPackMarketCards?.key === key
    ? stagedOwnedPackMarketCards.cards
    : null;
  // Любой mount коллекции завершает одноразовую передачу. Несовпавший снимок
  // нельзя оставлять для будущего direct-deeplink без свежего открытия плитки.
  stagedOwnedPackMarketCards = null;
  return cards;
}

export function stageOwnedPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): void {
  const packs = bundledPacksForOwned([packId], studyTarget);
  stagedOwnedPackMarketCards = packs.length > 0
    ? {
        key: ownedPackStageKey(packId, studyTarget),
        cards: buildMarketplaceOwnedCards(packs, undefined, studyTarget),
      }
    : null;
}

/** Результат полного цикла loadAll — контейнер решает restore/deeplink/DEV-пак. */
export type CollectionLoadedInfo = {
  userSid: string | null;
  savedCount: number;
  hintSeen: boolean;
  progress: FlashcardsProgress | null;
  ownedIds: string[];
  communityOwnedIds: string[];
  communityPublished: FlashcardMarketPack[];
  activePackId: string | null;
};

/**
 * Карточки просматриваемого набора ОДНИМ запросом на набор.
 *
 * зачем (координатор 12.10, аудит скорости R1, cards-v2-015): по прямой ссылке карточки набора начинают грузиться сразу, по id из ссылки (эффект ниже), а не после
 * шести загрузчиков loadAll. loadAll не должен запускать второй такой же запрос: берёт память сессии или идущую загрузку (`peekCommunityPackOpen`), и только если
 * ни того ни другого нет — загружает сам. Чтений столько же, только раньше. Журнал: `[PACK-OPEN] cards_fetch start|reuse|done` с источником и мс.
 */
async function fetchPreviewPackCardsOnce(packId: string, studyTarget: Parameters<typeof peekStagedCommunityPackCards>[1]): Promise<CardItem[]> {
  const memo = peekStagedCommunityPackCards(packId, studyTarget);
  if (memo) {
    console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'reuse', source: 'memo', packId, cards: memo.length })); // guard-ok: журнал загрузки карточек просмотра
    return memo;
  }
  const opening = peekCommunityPackOpen(packId, studyTarget);
  if (opening) {
    const waitStartedAt = Date.now();
    console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'reuse', source: 'inflight', packId })); // guard-ok: журнал загрузки карточек просмотра
    const cards = await opening.catch((error: unknown): CardItem[] => { noteSwallowed('useCollectionData:promise_14b', error); return []; });
    console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'done', source: 'inflight', packId, cards: cards.length, ms: Date.now() - waitStartedAt })); // guard-ok: журнал загрузки карточек просмотра
    return cards;
  }
  const startedAt = Date.now();
  console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'start', source: 'loadAll', packId })); // guard-ok: журнал загрузки карточек просмотра
  const cards = await fetchCommunityPackCards(packId, studyTarget).catch((swallowedError: unknown): CardItem[] => { noteSwallowed('useCollectionData:promise_14', swallowedError); return []; });
  console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'done', source: 'loadAll', packId, cards: cards.length, ms: Date.now() - startedAt })); // guard-ok: журнал загрузки карточек просмотра
  return cards;
}

export function useCollectionData(opts: {
  isDevMarketEnabled: boolean;
  /** Пост-загрузка: restore-позиция / DEV-пак / deeplink — логика контейнера. */
  onLoaded: (info: CollectionLoadedInfo) => void;
  /** `?pack=…&preview=1` — набор сообщества, который смотрят ДО добавления себе. */
  previewPackId?: string | null;
  /** `?pack=` — открытый набор: его карточки уже готовит staging до навигации. */
  deeplinkPackId?: string | null;
}) {
  const { isDevMarketEnabled } = opts;
  // Изоляция целей обучения: все чтения/записи коллекции идут в хранилище
  // текущей цели (иначе французская коллекция видит английские карточки).
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const scope = collectionCacheScope(studyTarget);
  if (_collectionCacheScope !== scope) {
    _savedCardsCache = null;
    _customCardsCache = null;
    _collectionCacheScope = scope;
  }
  /**
   * Гейты цели обучения: у не-английских целей официальные и community-наборы
   * скрыты (иначе французская коллекция показывает английские паки).
   */
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  /** Французские карточки приезжают удалённо — греем до первой отрисовки. */
  useEffect(() => {
    if (storageStudyTarget(studyTarget) !== 'fr') return;
    prefetchFrenchRemoteFlashcards(lang);
    let cancelled = false;
    ensureFrenchRemoteFlashcards(lang).catch(noteSwallowedHandler('useCollectionData:promise_6'));
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [lang, studyTarget]);
  const onLoadedRef = useRef(opts.onLoaded);
  onLoadedRef.current = opts.onLoaded;
  /**
   * Просмотр набора ДО добавления себе: карточки чужого набора нужно загрузить,
   * но НЕ записывать в кэш «моих» наборов и не отмечать владение.
   */
  const previewPackIdRef = useRef<string | null>(opts.previewPackId ?? null);
  previewPackIdRef.current = opts.previewPackId ?? null;

  /**
   * FIX (владелец, 2026-08-16) «при открытии раздела карточек прыгают состояния»:
   * loadAll зовётся из useFocusEffect при КАЖДОМ входе, в том числе когда данные
   * уже в кэше и не изменились. Он раздавал новые массивы (`saved.map(savedToCard)`
   * создаёт новые объекты каждый раз), новая ссылка меняла state, и весь список
   * перерисовывался заново — это и читалось как прыжок при входе.
   *
   * Сеттер ниже сравнивает по составу и оставляет ПРЕЖНЮЮ ссылку, когда набор
   * карточек тот же. Тогда повторный вход не даёт ни одной лишней перерисовки.
   * Сравниваем по id и полям, которые видно в списке: полное глубокое сравнение
   * на каждый фокус дороже самой перерисовки.
   */
  const setCardsIfChanged = useCallback(
    (setter: React.Dispatch<React.SetStateAction<CardItem[]>>, next: CardItem[]) => {
      setter((prev) => (sameCardList(prev, next) ? prev : next));
    },
    [],
  );
  /** То же для owned-списков: они пишутся 6 раз за один вход, почти всегда тем же составом. */
  const setIdsIfChanged = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, next: string[]) => {
      setter((prev) => (sameIdList(prev, next) ? prev : next));
    },
    [],
  );

  const [savedCards, setSavedCards] = useState<CardItem[]>(_savedCardsCache ?? []);
  const [customCards, setCustomCards] = useState<CardItem[]>(_customCardsCache ?? []);
  const [marketCards, setMarketCards] = useState<CardItem[]>(() => {
    if (!officialPacksEnabled && !communityPacksEnabled) {
      consumeStagedCommunityPackMarketCards(opts.deeplinkPackId ?? null, studyTarget);
      stagedOwnedPackMarketCards = null;
      return [];
    }
    const com = communityPacksEnabled
      ? consumeStagedCommunityPackMarketCards(opts.deeplinkPackId ?? null, studyTarget)
      : null;
    if (com && com.length > 0) return com;
    const snap = consumeStagedOwnedPackMarketCards(opts.deeplinkPackId ?? null, studyTarget);
    return snap ?? [];
  });
  /**
   * Полный первый кадр открываемого набора: ранняя AsyncStorage-гидратация не
   * должна временно выбрасывать staged-метаданные до ответа общего каталога.
   */
  const marketCatalogSeed = useMemo(() => {
    const base = officialPacksEnabled ? reserveBundledMarketPacks(studyTarget, lang) : [];
    // зачем (координатор 12.10, аудит скорости R1, cards-v2-015): выбранной плитки нет (прямая ссылка), но тёплый каталог сообщества в памяти может знать этот набор —
    // тогда шапка и счётчики известны с первого кадра, без ожидания шести загрузчиков loadAll (~1,7 с). Тёплого каталога нет — экран показывает заготовки.
    const stagedMeta = communityPacksEnabled
      ? peekStagedCommunityPackMeta(opts.deeplinkPackId ?? null, studyTarget)
        ?? (opts.deeplinkPackId ? peekPublishedCommunityMarketPacks(studyTarget)?.find((pack) => pack.id === opts.deeplinkPackId) ?? null : null)
      : null;
    return stagedMeta && !base.some((pack) => pack.id === stagedMeta.id)
      ? [...base, stagedMeta]
      : base;
  }, [communityPacksEnabled, lang, officialPacksEnabled, opts.deeplinkPackId, studyTarget]);
  const [marketPackCatalog, setMarketPackCatalog] = useState<FlashcardMarketPack[]>(marketCatalogSeed);
  /** Список купленных паков из хранилища — для `?pack=` до отрисовки `marketCards` (иначе гонка с кэшем). */
  const [ownedPackIdList, setOwnedPackIdList] = useState<string[]>([]);
  /** Куплені UGC-набори (окремий ключ AsyncStorage). */
  const [communityOwnedIdList, setCommunityOwnedIdList] = useState<string[]>([]);
  /** `getCanonicalUserId` — доступ автора до свого UGC без «покупки» в `communityOwnedIdList`. */
  const [accessStableId, setAccessStableId] = useState<string | null>(null);
  /** `loadAll` завершил цикл; до этого нельзя валидировать `?pack=` по пустому `marketCards`. */
  /**
   * FIX (владелец, 2026-08-16) «прыгает даже если список был пустой»:
   * collectionDataReady стартовал с false ВСЕГДА, в том числе на повторном
   * входе с уже прогретым кэшем. Пустой набор из-за этого кадр держался в
   * состоянии «ещё грузится» (packCardsPending), а потом рывком становился
   * пустым. Кэш есть — решение известно синхронно, ждать нечего.
   */
  const [collectionDataReady, setCollectionDataReady] = useState(
    () => {
      // КРИТИЧНО: при открытом `?pack=` готовность по-прежнему ЗАСЛУЖИВАЕТСЯ
      // загрузкой. Этот флаг валидирует набор по marketPackCatalog (см. хук
      // доступа ниже), и ранний true на непрогретом каталоге дал бы набору
      // ложный отказ 'unknown'. Мгновенная готовность — только для списка
      // сохранённых/своих карточек, где кэш и есть весь ответ.
      if (opts.deeplinkPackId) return false;
      return _savedCardsCache !== null || _customCardsCache !== null;
    },
  );
  /**
   * Instant paint when session cache exists (re-open); first cold open still waits on AsyncStorage.
   *
   * NB: кэш ПУСТОГО списка — это `[]`, а не `null`. Сравнение именно с null и
   * держит здесь пустую коллекцию: она уже прочитана, показывать загрузку
   * второй раз незачем.
   */
  const [loading, setLoading] = useState(
    () => _savedCardsCache === null && _customCardsCache === null,
  );
  const [loadError, setLoadError] = useState(false);

  // зачем (cards-039, Сверка 46232ea76, координатор 18.10; D158 «тихо ≠ бесконечно»): загрузка без кэша, которая не закончилась ни успехом, ни ошибкой (зависший запрос, нет сети),
  // держала скелетон вечно. Потолок — тот же, что у useLoadGate (12 с): по его истечении экран получает loadError и показывает «Сейчас недоступно» + «Попробовать снова».
  // Поздний успех loadAll сам снимет ошибку (setLoadError(false)), так что потолок ничего не ломает у медленной, но живой загрузки.
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => {
      console.warn('[CARDS-LOAD] ceiling', JSON.stringify({ afterMs: CARDS_LOAD_CEILING_MS, cacheSaved: _savedCardsCache !== null, cacheCustom: _customCardsCache !== null, action: 'loading→false, loadError→true' })); // guard-ok: потолок сработал — причина экрана ошибки
      setLoading(false);
      setLoadError(true);
    }, CARDS_LOAD_CEILING_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // зачем (аудит §AUTH-0110, координатор 15.10): кэш модуля при смене цели уже сбрасывается по области (collectionCacheScope), а вот состояние хука жило со старой целью до конца loadAll —
  // экран показывал карточки, каталог и купленные наборы прежнего языка. Сброс по studyTarget (кроме первого монтирования): списки пустые, каталог — зерно новой цели, «готово» снято.
  const prevTargetRef = useRef(storageStudyTarget(studyTarget));
  useEffect(() => {
    const now = storageStudyTarget(studyTarget);
    const before = prevTargetRef.current;
    if (before === now) return;
    prevTargetRef.current = now;
    console.log('[CARDS-TARGET] useCollectionData: цель', JSON.stringify({ // guard-ok: трассировка сброса при смене изучаемого языка
      from: before, to: now,
      reset: { saved: savedCards.length, custom: customCards.length, market: marketCards.length, catalog: marketPackCatalog.length, owned: ownedPackIdList.length, communityOwned: communityOwnedIdList.length, ready: collectionDataReady },
      newCatalogSeed: marketCatalogSeed.length,
    }));
    setSavedCards([]);
    setCustomCards([]);
    setMarketCards([]);
    setMarketPackCatalog(marketCatalogSeed);
    setOwnedPackIdList([]);
    setCommunityOwnedIdList([]);
    setCollectionDataReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyTarget]);

  /** Обновление стейта + module-cache одной операцией (delete/undo из контейнера). */
  const updateSavedCards = useCallback(
    (updater: (prev: CardItem[]) => CardItem[]) => {
      setSavedCards((prev) => {
        const next = updater(prev);
        _savedCardsCache = next;
        return next;
      });
    },
    [],
  );
  const updateCustomCards = useCallback(
    (updater: (prev: CardItem[]) => CardItem[]) => {
      setCustomCards((prev) => {
        const next = updater(prev);
        _customCardsCache = next;
        return next;
      });
    },
    [],
  );

  const loadAll = useCallback(async () => {
    const loadAllStartedAt = Date.now();
    const accountToken = captureAccountGeneration();
    console.log('[CARDS-LOAD] load:start', JSON.stringify({ cacheSaved: _savedCardsCache !== null, cacheCustom: _customCardsCache !== null, studyTarget: String(studyTarget), source: _savedCardsCache === null && _customCardsCache === null ? 'storage_cold' : 'cache_warm' })); // guard-ok: вход загрузки — откуда будут данные
    try {
      const userSid = await getCanonicalUserId().catch(noteSwallowedAs('useCollectionData:promise_7', null));
      if (!isCurrentAccountGeneration(accountToken)) return;
      setAccessStableId(userSid);
      // Only show loading on first ever open (no cache yet)
      if (!_savedCardsCache && !_customCardsCache) setLoading(true);
      const [saved, customParsed, progressParsed, hintSeen, ownedIdsEarly, builtMarketCache, communityOwnedEarly] =
        await Promise.all([
          loadAllSavedFlashcards(),
          readCustomCards(studyTarget),
          readFlashcardsProgress(studyTarget),
          AsyncStorage.getItem(flashcardsDeleteHintSeenKey(studyTarget)),
          loadAccessiblePackIds(studyTarget),
          loadBuiltMarketplaceCardsCache(studyTarget, lang).catch(noteSwallowedAs<null>('useCollectionData:promise_8', null)),
          loadCommunityOwnedPackIds(studyTarget).catch((swallowedError: unknown): string[] => { noteSwallowed('useCollectionData:promise_9', swallowedError); return []; }),
        ]);
      if (!isCurrentAccountGeneration(accountToken)) return;
      console.log(`[CARDS-HINT] loadAll: ключ=${flashcardsDeleteHintSeenKey(studyTarget)} значение=${JSON.stringify(hintSeen)} target=${String(studyTarget)}`); // guard-ok: значение из хранилища
      const custom: CardItem[] = Array.isArray(customParsed) ? (customParsed as CardItem[]) : [];
      // Швидке відображення: одразу з AsyncStorage, без import lesson data / маркету.
      const mappedSavedQuick = saved.map((card) => savedToCard(card, studyTarget));
      const cacheKeyEarly = marketOwnedIdsCacheKey([...ownedIdsEarly, ...communityOwnedEarly].sort());
      const cacheHit =
        communityOwnedEarly.length === 0 &&
        builtMarketCache &&
        builtMarketCache.ownedKey === cacheKeyEarly &&
        builtMarketCache.cards.length > 0;
      if (cacheHit) {
        setCardsIfChanged(setMarketCards, builtMarketCache.cards);
        setIdsIfChanged(setOwnedPackIdList, ownedIdsEarly);
        setIdsIfChanged(setCommunityOwnedIdList, communityOwnedEarly);
        setMarketPackCatalog(marketCatalogSeed);
      } else if (ownedIdsEarly.length > 0 || communityOwnedEarly.length > 0) {
        /** Одразу з бандла — не чекаємо Firestore у `marketPromise`, інакше `?pack=` показує порожній custom. */
        setIdsIfChanged(setOwnedPackIdList, ownedIdsEarly);
        setIdsIfChanged(setCommunityOwnedIdList, communityOwnedEarly);
        const ownedBundled = bundledPacksForOwned(ownedIdsEarly, studyTarget, lang);
        if (ownedBundled.length > 0) {
          setCardsIfChanged(setMarketCards, buildMarketplaceOwnedCards(ownedBundled, lang, studyTarget));
        }
        setMarketPackCatalog(marketCatalogSeed);
      }
      /**
       * Блокуємо лоадер лише якщо без маркет-кешу користувач побачить порожній список
       * (тільки куплені паки, немає збережених/своїх). Інакше одразу показуємо картки.
       */
      const mustDelayForEmptyMarketOnly =
        (ownedIdsEarly.length > 0 || communityOwnedEarly.length > 0) &&
        !cacheHit &&
        mappedSavedQuick.length === 0 &&
        custom.length === 0;
      if (mustDelayForEmptyMarketOnly) setLoading(true);
      _savedCardsCache = mappedSavedQuick;
      _customCardsCache = custom;
      // Повторный вход с тем же содержимым не должен менять ссылку (см. sameCardList),
      // иначе список перерисовывается целиком и это видно как прыжок.
      setCardsIfChanged(setSavedCards, mappedSavedQuick);
      setCardsIfChanged(setCustomCards, custom);
      setLoadError(false);
      if (!mustDelayForEmptyMarketOnly) setLoading(false);
      console.log('[CARDS-LOAD] load:ok', JSON.stringify({ ms: Date.now() - loadAllStartedAt, saved: mappedSavedQuick.length, custom: custom.length, holdLoadingForMarket: mustDelayForEmptyMarketOnly, cacheHit: !!cacheHit })); // guard-ok: итог быстрой загрузки из хранилища

      // Міграція UK / транскрипції (важка) і маркет — паралельно; `setMarketCards` не чекає міграції
      // (інакше платні картки з’являються пізніше за «Збережені» / порожній список).
      const migrationPromise = (async (): Promise<Flashcard[]> => {
        const hasMissingUk = saved.some((c: Flashcard) => !c.uk || c.uk === c.ru);
        // зачем: условие обязано совпадать с тем, что миграция реально чинит
        // (ниже она пропускает не-английские карточки). Иначе у человека с
        // французскими карточками "нужна миграция" истинно ВСЕГДА — версия
        // им не проставляется никогда — и каждый заход на экран тянул бы
        // лишний loadAllSavedFlashcards() из Firestore.
        const hasMissingTr = saved.some(
          (c: Flashcard) =>
            normalizePackLanguage(c.packLanguage ?? c.studyTarget) === 'en' &&
            (!c.transcription || needsTranscriptionRefresh(c.transcriptionEngineVersion)),
        );
        if (!hasMissingUk && !hasMissingTr) return saved;
        const enToUk = hasMissingUk ? await getEnToUkMap() : null;
        let needsSave = false;
        const migratedLocal = saved.map((card: Flashcard) => {
          if (normalizePackLanguage(card.packLanguage ?? card.studyTarget) !== 'en') return card;
          let updated = card;
          if (enToUk && (!card.uk || card.uk === card.ru)) {
            const ukTranslation = enToUk.get(card.en.trim());
            if (ukTranslation && ukTranslation !== card.ru) {
              needsSave = true;
              updated = { ...updated, uk: ukTranslation };
            }
          }
          // зачем: репорт 21.09.2026 — в сохранённых карточках лежит выдуманная
          // транскрипция от старой версии генератора (guests → /gdʒʌːsts/).
          // Чинить только пустые недостаточно: у пострадавших поле НЕ пустое,
          // поэтому такие карточки не мигрировали бы никогда. Признак порчи —
          // версия движка, а не вид строки (по виду выдумку не отличить).
          if (!updated.transcription || needsTranscriptionRefresh(updated.transcriptionEngineVersion)) {
            const tr = getTranscription(updated.en);
            if (tr !== (updated.transcription ?? '')) {
              needsSave = true;
              // Пустая строка здесь — осознанный результат: правильной
              // транскрипции у нас нет, и молчание честнее выдумки.
              updated = { ...updated, transcription: tr };
            }
            if (updated.transcriptionEngineVersion !== TRANSCRIPTION_ENGINE_VERSION) {
              needsSave = true;
              updated = { ...updated, transcriptionEngineVersion: TRANSCRIPTION_ENGINE_VERSION };
            }
          }
          return updated;
        });
        if (needsSave) {
          await mergeSavedFlashcardRepairs(migratedLocal, accountToken);
        }
        if (!isCurrentAccountGeneration(accountToken)) return [];
        const latest = await loadAllSavedFlashcards();
        if (!isCurrentAccountGeneration(accountToken)) return [];
        const mappedAfter = latest.map((card) => savedToCard(card, studyTarget));
        _savedCardsCache = mappedAfter;
        // Миграция чаще всего ничего не меняет (уже мигрированные карточки) —
        // тогда список не должен дёргаться повторной отрисовкой.
        setCardsIfChanged(setSavedCards, mappedAfter);
        return migratedLocal;
      })();

      const marketPromise = (async () => {
        // зачем (packs-simple-004: просмотр набора открывался ~138 с): время каждого шага, пока открыт просмотр.
        const pvStartedAt = Date.now();
        const pvParts: Record<string, number> = {};
        const pvMark = <T,>(name: string, work: Promise<T>): Promise<T> => work.finally(() => { pvParts[name] = Date.now() - pvStartedAt; });
        const [ownedIds, marketPacks, communityOwnedIds, communityPublished, activePackIdRaw, localAuthored] = await Promise.all([
          pvMark('accessibleIds', loadAccessiblePackIds(studyTarget)),
          pvMark('marketplace', loadMarketplacePacks(studyTarget)),
          pvMark('communityOwned', loadCommunityOwnedPackIds(studyTarget).catch((swallowedError: unknown): string[] => { noteSwallowed('useCollectionData:promise_10', swallowedError); return []; })),
          pvMark('communityPublished', loadPublishedCommunityMarketPacks(studyTarget).catch((swallowedError: unknown): FlashcardMarketPack[] => { noteSwallowed('useCollectionData:promise_11', swallowedError); return []; })),
          isDevMarketEnabled ? consumeDevActivePack(studyTarget) : Promise.resolve(null as string | null),
          pvMark('localAuthored', loadLocalAuthorPacks(studyTarget).catch((swallowedError: unknown) => { noteSwallowed('useCollectionData:promise_12', swallowedError); return []; })),
        ]);
        if (previewPackIdRef.current) {
          console.warn('[FC-PREVIEW] loaders', JSON.stringify({ pack: previewPackIdRef.current, ...pvParts, marketStartAfterLoadAllMs: pvStartedAt - loadAllStartedAt, inCatalog: communityPublished.some((pack) => pack.id === previewPackIdRef.current), communityOwned: communityOwnedIds.length })); // guard-ok: временная трассировка packs-simple-004
        }
        /** Свои наборы с устройства: доступны сразу после «Сохранить», без ожидания модерации. */
        if (!isCurrentAccountGeneration(accountToken)) throw new Error('Account changed');
        const localAuthoredMarket = localAuthored.map(pack => localAuthorPackToMarketPack(pack, pack.studyTarget));
        const localAuthoredIds = localAuthoredMarket.map((p) => p.id);
        const localAuthoredCards = localAuthored
          .filter((p) => localAuthoredIds.includes(p.id))
          .flatMap(localAuthorPackCardItems);
        setIdsIfChanged(setOwnedPackIdList, ownedIds);
        setIdsIfChanged(setCommunityOwnedIdList, [...communityOwnedIds, ...localAuthoredIds]);
        const mergedCatalog: FlashcardMarketPack[] = [...marketPacks];
        const seenCat = new Set(marketPacks.map((p) => p.id));
        for (const cp of communityPublished) {
          if (!seenCat.has(cp.id)) {
            seenCat.add(cp.id);
            mergedCatalog.push(cp);
          }
        }
        for (const lp of localAuthoredMarket) {
          if (!seenCat.has(lp.id)) {
            seenCat.add(lp.id);
            mergedCatalog.push(lp);
          }
        }
        setMarketPackCatalog(mergedCatalog);
        const ownedOfficialPacks = marketPacks.filter((pack) => ownedIds.includes(pack.id));
        const officialBuilt = buildMarketplaceOwnedCards(ownedOfficialPacks, lang, studyTarget);
        const authorCommunityIds =
          userSid == null
            ? []
            : communityPublished
                .filter(
                  (p) =>
                    p.isCommunityUgc &&
                    p.authorStableId === userSid &&
                    !communityOwnedIds.includes(p.id),
                )
                .map((p) => p.id);
        const communityIdsToLoad = [...new Set([...communityOwnedIds, ...authorCommunityIds])];
        const previewPackId = previewPackIdRef.current;
        const previewIdsToLoad =
          previewPackId && !communityIdsToLoad.includes(previewPackId) ? [previewPackId] : [];
        const pvCardsStartedAt = Date.now();
        const [communityCardLists, previewCardLists] = await Promise.all([
          Promise.all(communityIdsToLoad.map((id) => fetchCommunityPackCards(id, studyTarget).catch((swallowedError: unknown): CardItem[] => { noteSwallowed('useCollectionData:promise_13', swallowedError); return []; }))),
          Promise.all(previewIdsToLoad.map((id) => fetchPreviewPackCardsOnce(id, studyTarget))),
        ]);
        if (previewPackId) {
          console.warn('[FC-PREVIEW] cards', JSON.stringify({
            pack: previewPackId, ownCommunityPacks: communityIdsToLoad.length, previewFetched: previewIdsToLoad.length,
            previewCards: previewCardLists.flat().length, cardsMs: Date.now() - pvCardsStartedAt, totalMs: Date.now() - pvStartedAt,
          })); // guard-ok: временная трассировка packs-simple-004
        }
        const builtMarket = [...officialBuilt, ...communityCardLists.flat()];
        if (!isCurrentAccountGeneration(accountToken)) throw new Error('Account changed');
        // Финальный состав маркета почти всегда совпадает с тем, что уже показано
        // из кэша — тогда перерисовки быть не должно (см. sameCardList).
        setCardsIfChanged(setMarketCards, [...builtMarket, ...previewCardLists.flat(), ...localAuthoredCards]);
        /**
         * Локальные наборы в кэш не пишем: они меняются на устройстве и всегда читаются заново.
         * Просматриваемый (ещё не добавленный) набор в кэш «моих» тоже не попадает.
         */
        void saveBuiltMarketplaceCardsCache(
          [...ownedIds, ...communityIdsToLoad].sort(),
          builtMarket,
          studyTarget,
          lang,
        );
        if (mustDelayForEmptyMarketOnly) setLoading(false);
        return {
          ownedIds,
          communityOwnedIds: [...communityOwnedIds, ...localAuthoredIds],
          communityPublished,
          activePackId: activePackIdRaw as string | null,
        };
      })();

      const [migrated, { ownedIds, communityOwnedIds, communityPublished, activePackId }] = await Promise.all([
        migrationPromise,
        marketPromise,
      ]);
      if (!isCurrentAccountGeneration(accountToken)) return;
      onLoadedRef.current({
        userSid,
        savedCount: migrated.length,
        hintSeen: !!hintSeen,
        progress: progressParsed,
        ownedIds,
        communityOwnedIds,
        communityPublished,
        activePackId,
      });
    } catch (error) {
      // зачем (бета-тест А4, 15.10, «никакого немого catch»): причину отказа загрузки коллекции видно в журнале, а не только по пустому экрану
      console.warn(`[FC-COLLECTION] load FAILED stale=${!isCurrentAccountGeneration(accountToken)} —`, error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа в catch
      console.warn('[CARDS-LOAD] load:failed', JSON.stringify({ ms: Date.now() - loadAllStartedAt, stale: !isCurrentAccountGeneration(accountToken), reason: error instanceof Error ? error.message : String(error) })); // guard-ok: причина сбоя загрузки
      if (!isCurrentAccountGeneration(accountToken)) return;
      setLoading(false);
      setLoadError(true);
    } finally {
      if (isCurrentAccountGeneration(accountToken)) setCollectionDataReady(true);
    }
  }, [isDevMarketEnabled, lang, marketCatalogSeed, setCardsIfChanged, setIdsIfChanged, studyTarget]);

  /**
   * `?pack=` из «Моих наборов» / каталога: карточки набора уже поехали в
   * `stageCommunityPackCardsForNavigation` ДО `router.push`. Подхватываем ИМЕННО
   * этот запрос, а не ждём конца общего `loadAll` (маркет + каталог сообщества +
   * авторские наборы): иначе набор несколько секунд стоит пустым и пользователь
   * видит промежуточную заглушку вместо набора (владелец, 2026-08-13).
   */
  const deeplinkPackId = opts.deeplinkPackId ?? null;
  // зачем (packs-simple-004, мгновенное открытие): экран открыт по тапу ДО загрузки карточек — состояние для скелета
  // в просмотре и для выхода с тостом, если все тихие повторы вернули пусто.
  const [deeplinkCardsState, setDeeplinkCardsState] = useState<'idle' | 'pending' | 'ready' | 'failed'>('idle');
  // зачем (🟡 Макеты, 15.10): «Повторить» на экране «Не удалось загрузить» — новый заход загрузки карточек набора (без молчаливого закрытия экрана).
  const [deeplinkRetryTick, setDeeplinkRetryTick] = useState(0);
  const retryDeeplinkCards = useCallback(() => {
    console.log(`[PACK-OPEN] retry tap pack=${String(deeplinkPackId)}`); // guard-ok: тап «Повторить»
    setDeeplinkRetryTick((tick) => tick + 1);
  }, [deeplinkPackId]);
  useEffect(() => {
    if (!deeplinkPackId || !communityPacksEnabled) return;
    const sourceId = `DEV:${deeplinkPackId}`;
    const apply = (cards: CardItem[]) => {
      if (cards.length === 0) return;
      setMarketCards((prev) => (prev.some((c) => c.sourceId === sourceId) ? prev : [...prev, ...cards]));
    };
    const memo = peekStagedCommunityPackCards(deeplinkPackId, studyTarget);
    if (memo) {
      apply(memo);
      setDeeplinkCardsState('ready');
      return;
    }
    // зачем (координатор 12.10, аудит скорости R1, cards-v2-015): просмотр по прямой ссылке (`?pack=…&preview=1`) — карточек в памяти нет, плитку никто не готовил.
    // Раньше они грузились только внутри loadAll, ПОСЛЕ шести загрузчиков и сборки каталога (~1,7 с). id известен из ссылки — стартуем сразу. Один запрос на набор:
    // startCommunityPackOpen держит идущую загрузку по ключу (второй вызов получает тот же промис), loadAll берёт её же (fetchPreviewPackCardsOnce).
    const parallelStartedAt = Date.now();
    const opening = (deeplinkRetryTick > 0
      ? (console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'start', source: 'retry', packId: deeplinkPackId })), // guard-ok: повтор по тапу
        // зачем (Ревизор 3e4531ac1 🟡 (1), 💸): «Повторить» = ОДИН заход на нажатие с потолком 12 с, а не новая серия тихих повторов; пока заход идёт, экран показывает ожидание — кнопки нет.
        Promise.race([
          stageCommunityPackCardsForNavigation(deeplinkPackId, studyTarget),
          new Promise<CardItem[]>((resolve) => { setTimeout(() => resolve([]), LOAD_GATE_TOTAL_MS); }),
        ]))
      : null)
      ?? peekCommunityPackOpen(deeplinkPackId, studyTarget)
      ?? (previewPackIdRef.current === deeplinkPackId
        ? (console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'start', source: 'deeplink_parallel', packId: deeplinkPackId })), // guard-ok: журнал загрузки карточек просмотра
          startCommunityPackOpen(deeplinkPackId, studyTarget, undefined, 'deeplink'))
        : null);
    if (opening) {
      let cancelledOpen = false;
      setDeeplinkCardsState('pending');
      const startedAt = Date.now();
      void opening.then((cards) => {
        console.log('[PACK-OPEN] cards_fetch', JSON.stringify({ stage: 'done', source: 'deeplink_effect', packId: deeplinkPackId, cards: cards.length, ms: Date.now() - parallelStartedAt, cancelled: cancelledOpen })); // guard-ok: журнал загрузки карточек просмотра
        console.warn('[FC-PACK-OPEN] collection:resolved', JSON.stringify({ pack: deeplinkPackId, cards: cards.length, ms: Date.now() - startedAt, cancelled: cancelledOpen })); // guard-ok: временная трассировка packs-simple-004
        if (cancelledOpen) return;
        apply(cards);
        setDeeplinkCardsState(cards.length > 0 ? 'ready' : 'failed');
      }).catch((error: unknown) => {
        // зачем (Ревизор 3e4531ac1 🟡 (2)): отказ загрузки без catch оставлял скелет навсегда — теперь причина в журнале и состояние «не удалось».
        console.warn(`[PACK-OPEN] cards_fetch FAILED packId=${deeplinkPackId} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя
        if (!cancelledOpen) setDeeplinkCardsState('failed');
      });
      return () => { cancelledOpen = true; };
    }
    const pending = stagedCommunityPackCardsPromise(deeplinkPackId, studyTarget);
    if (!pending) return;
    let cancelled = false;
    void pending.then((cards) => {
      if (!cancelled) apply(cards);
    });
    return () => {
      cancelled = true;
    };
  }, [communityPacksEnabled, deeplinkPackId, studyTarget, deeplinkRetryTick]);

  return {
    deeplinkCardsState,
    retryDeeplinkCards,
    savedCards,
    customCards,
    marketCards,
    marketPackCatalog,
    setMarketPackCatalog,
    ownedPackIdList,
    communityOwnedIdList,
    accessStableId,
    collectionDataReady,
    // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `hold=saved_loading` / `fail=saved_load` — скелет и «ошибка загрузки»; в стор-сборке геттеры выключены.
    loading: loading || isDevCardsHeld('saved_loading'),
    loadError: loadError || isDevCardsFail('saved_load'),
    loadAll,
    updateSavedCards,
    updateCustomCards,
  };
}

// ── E11: пост-загрузочная навигация (restore-позиция / DEV-пак / deeplink) ───
export function applyPostLoadNavigation(
  info: CollectionLoadedInfo,
  ctx: {
    isDevMarketEnabled: boolean;
    routeCat: CategoryId | null;
    packDeeplink: string | null;
    pendingRestoreRef: { current: { cat: CategoryId; idx: number } | null };
    setActiveCat: (cat: CategoryId) => void;
    /** router.setParams({ cat: 'custom' }) контейнера */
    setCustomCatParam: () => void;
    setShowDeleteHint: (v: boolean) => void;
    /** Просмотр набора до добавления: вкладку набора открываем и без владения. */
    previewMode?: boolean;
  },
): void {
  const { ownedIds, activePackId, progress } = info;
  // зачем (координатор 12.10, cards-033: hint=show «не применилась»; сперва логи): решение показать разовую подсказку — со значениями, которые его определили
  console.log(`[CARDS-HINT] решение: hintSeen=${String(info.hintSeen)} savedCount=${info.savedCount} → ${!info.hintSeen && info.savedCount > 0 ? 'показываем' : 'не показываем'}`); // guard-ok: ветвление логируется
  if (!info.hintSeen && info.savedCount > 0) {
    ctx.setShowDeleteHint(true);
  }
  const rc = ctx.routeCat;
  /**
   * `?pack=` — это экран НАБОРА, и он главнее всего остального.
   *
   * зачем (владелец, 2026-08-13 — «набор открывается через промежуточное окно»):
   * раньше вкладку набора включали только при ПОДТВЕРЖДЁННОМ владении из этой же
   * загрузки, а до того успевала сработать ветка восстановления позиции
   * (`!rc && progress`) — экран набора после загрузки прыгал на «Сохранённые».
   * Пользователь видел промежуточный экран вместо карточек набора. Доступ к
   * набору проверяет `usePackDeeplinkGuard`, здесь решается только вкладка.
   */
  if (ctx.packDeeplink) {
    ctx.pendingRestoreRef.current = null;
    ctx.setActiveCat('custom');
    return;
  }
  if (ctx.isDevMarketEnabled && activePackId && ownedIds.includes(activePackId)) {
    ctx.pendingRestoreRef.current = { cat: 'custom', idx: 0 };
    ctx.setActiveCat('custom');
    ctx.setCustomCatParam();
    emitAppEvent(
      'action_toast',
      actionToastTri('success', {
        ru: 'Открыт купленный DEV-набор в карточках.',
        uk: 'Відкрито придбаний DEV-набір у картках.',
        es: 'Pack DEV comprado abierto en Tarjetas.', en: 'Purchased DEV pack opened in Cards.',
        'pt-BR': 'Pacote DEV comprado aberto em Cartões.', vi: 'Đã mở bộ thẻ DEV đã mua trong Thẻ.', id: 'Paket DEV yang dibeli dibuka di Kartu.', tr: 'Satın alınan DEV paketi Kartlar\'da açıldı.', pl: 'Otwarto kupiony zestaw DEV w Kartach.',
      }),
    );
  } else if (!rc && progress) {
    ctx.pendingRestoreRef.current = { cat: progress.cat as CategoryId, idx: progress.idx };
    ctx.setActiveCat(progress.cat as CategoryId);
  } else if (rc && progress && progress.cat === rc) {
    ctx.pendingRestoreRef.current = { cat: rc, idx: progress.idx };
  } else {
    ctx.pendingRestoreRef.current = null;
  }
}

// ── E11: deep link `?pack=` — доступ: куплено, автор UGC, або staging з хаба ──
export function usePackDeeplinkGuard(args: {
  collectionDataReady: boolean;
  packDeeplink: string | null;
  marketPackCatalog: FlashcardMarketPack[];
  ownedPackIdList: string[];
  communityOwnedIdList: string[];
  accessStableId: string | null;
  /**
   * Просмотр набора ДО добавления себе (`?preview=1`): владение не требуется,
   * экран открывается в режиме «только чтение».
   */
  previewMode?: boolean;
  /** Набор неизвестен/не куплен → назад на хаб (роутинг контейнера). */
  onDenied: (reason: 'unknown' | 'not_owned') => void;
}): void {
  const { studyTarget } = useStudyTarget();
  const {
    collectionDataReady, packDeeplink, marketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId, previewMode, onDenied,
  } = args;
  const onDeniedRef = useRef(onDenied);
  onDeniedRef.current = onDenied;
  useEffect(() => {
    if (!collectionDataReady) return;
    const pid = packDeeplink;
    if (!pid) return;
    const packMeta = marketPackCatalog.find((p) => p.id === pid);
    if (!packMeta) {
      onDeniedRef.current('unknown');
      return;
    }
    const isAuthorUgc =
      !!packMeta.isCommunityUgc &&
      !!packMeta.authorStableId &&
      !!accessStableId &&
      packMeta.authorStableId === accessStableId;
    const stagedFromHub = getStagedNavigationPackId(studyTarget) === pid;
    /** Режим просмотра: набор сообщества можно открыть и не добавляя его себе. */
    if (previewMode && packMeta.isCommunityUgc) {
      if (stagedFromHub) clearStagedNavigationPackId();
      return;
    }
    const owned =
      ownedPackIdList.includes(pid) ||
      communityOwnedIdList.includes(pid) ||
      isAuthorUgc;
    if (owned) {
      if (stagedFromHub) clearStagedNavigationPackId();
    } else {
      if (stagedFromHub) clearStagedNavigationPackId();
      emitAppEvent(
        'action_toast',
        actionToastTri('info', {
          ru: 'Набор ещё не открыт. Его можно открыть за монеты в магазине (вкладка с наборами карточек).',
          uk: 'Набір ще не відкрито. Його можна відкрити за монети в магазині (вкладка з наборами карток).',
          es: 'Aún no has desbloqueado este pack. Puedes obtenerlo por monedas en la tienda (pestaña de packs de Tarjetas).', en: 'This pack isn\'t unlocked yet. You can unlock it with coins in the shop (the card packs tab).',
          'pt-BR': 'Este pacote ainda não está desbloqueado. Você pode desbloqueá-lo com moedas na loja (aba de pacotes de cartões).', vi: 'Bộ thẻ này chưa được mở khóa. Bạn có thể mở bằng xu trong cửa hàng (mục bộ thẻ).', id: 'Paket ini belum terbuka. Kamu bisa membukanya dengan koin di toko (tab paket kartu).', tr: 'Bu paket henüz açılmadı. Mağazada madeni parayla açabilirsin (kart paketleri sekmesi).', pl: 'Ten zestaw nie jest jeszcze odblokowany. Możesz go odblokować za monety w sklepie (zakładka zestawów kart).',
        }),
      );
      onDeniedRef.current('not_owned');
    }
  }, [
    collectionDataReady, packDeeplink, marketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId, previewMode, studyTarget,
  ]);
}

// ── E11: undo-пайплайн удаления (E7), вынесен из монолита ────────────────────
/**
 * Оптимистичное удаление + undo-снекбар 5с. Персист идёт СРАЗУ через очередь
 * записи (custom_cards_store / use-flashcards withWriteLock) — undo кладёт
 * карточку обратно тем же путём. Никаких «запись после таймаута» (принцип 4).
 */
export type UndoEntry = {
  accountToken: AccountGenerationToken;
  key: number;
  kind: 'custom' | 'saved';
  uiCard: CardItem;
  uiIndex: number;
  customSnapshot: { card: CardItem; index: number } | null;
  savedSnapshot: { card: Flashcard; index: number } | null;
  batch?: {
    kind: 'saved';
    items: {
      uiCard: CardItem;
      uiIndex: number;
      savedSnapshot: { card: Flashcard; index: number } | null;
    }[];
  };
};

export function useCollectionDeletion(args: {
  cards: CardItem[];
  customCards: CardItem[];
  savedCards: CardItem[];
  updateCustomCards: (updater: (prev: CardItem[]) => CardItem[]) => void;
  updateSavedCards: (updater: (prev: CardItem[]) => CardItem[]) => void;
  /** Текущий фокус-индекс контейнера (fallback, когда явный itemIdx не передан). */
  currentIndexRef: { current: number };
  /** Сброс фокуса после удаления (indexRef + SharedValue контейнера). */
  onIndexClamped: (idx: number) => void;
  /** зачем: удаление и undo обязаны бить в хранилище своего языка (2026-09-05). */
  studyTarget?: RuntimeStudyTarget;
}) {
  const { cards, customCards, savedCards, updateCustomCards, updateSavedCards, currentIndexRef, onIndexClamped, studyTarget } = args;
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoKeyRef = useRef(0);
  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);
  useEffect(() => () => clearUndoTimer(), [clearUndoTimer]);

  // зачем (аудит Optimistic UI, 04.10): двойной тап «удалить» запускал два удаления — второе не находило карточку в хранилище, падало и
  // откатом возвращало в список карточку, уже удалённую. Один проход на карточку, пока первый не завершился.
  const deletingCardIdsRef = useRef<Set<string>>(new Set());
  const deleteCardById = useCallback(async (cardId: string, fallbackIdx?: number) => {
    const accountToken = captureAccountGeneration();
    const target = cards.find((c) => c.id === cardId);
    if (!target || target.isSystem) return;
    if (deletingCardIdsRef.current.has(cardId)) {
      console.warn(`[FC-COLLECTION] delete:skip_in_flight cardId=${cardId}`);
      return;
    }
    const kind: 'custom' | 'saved' | null =
      target.categoryId === 'custom' && customCards.some((c) => c.id === target.id)
        ? 'custom'
        : target.categoryId === 'saved'
          ? 'saved'
          : null;
    if (!kind) return;
    deletingCardIdsRef.current.add(cardId);
    try {
      // 1) Оптимистично из списка сразу
      let uiIndex = 0;
      if (kind === 'custom') {
        uiIndex = Math.max(0, customCards.findIndex((c) => c.id === target.id));
        updateCustomCards((prev) => prev.filter((c) => c.id !== target.id));
      } else {
        uiIndex = Math.max(0, savedCards.findIndex((c) => c.id === target.id));
        updateSavedCards((prev) => prev.filter((c) => c.id !== target.id));
      }
      const updated = cards.filter((c) => c.id !== target.id);
      const base = typeof fallbackIdx === 'number' ? fallbackIdx : currentIndexRef.current;
      onIndexClamped(Math.max(0, Math.min(base, updated.length - 1)));
      // 2) Персист через очередь записи (снапшот — для восстановления на место)
      const customSnapshot = kind === 'custom' ? await deleteCustomCard(target.id, studyTarget) : null;
      const savedSnapshot = kind === 'saved' ? await removeFlashcardWithSnapshot(target.id, target.studyTarget ?? target.packLanguage ?? studyTarget) : null;
      if (kind === 'saved' && !savedSnapshot) throw new Error('Saved card no longer available');
      // 3) Undo-снекбар 5с (новое удаление заменяет предыдущее)
      const key = ++undoKeyRef.current;
      clearUndoTimer();
      if (!isCurrentAccountGeneration(accountToken)) return;
      setUndoEntry({ accountToken, key, kind, uiCard: target, uiIndex, customSnapshot, savedSnapshot });
      undoTimerRef.current = setTimeout(() => {
        setUndoEntry((cur) => (cur?.key === key ? null : cur));
      }, 5000);
    } catch (error: unknown) {
      console.warn(`[FC-COLLECTION] delete:failed kind=${kind} cardId=${cardId} — откат только этой карточки`, error instanceof Error ? error.message : String(error));
      if (!isCurrentAccountGeneration(accountToken)) return;
      // зачем: откат возвращает ТОЛЬКО удалённую карточку на её место, а не весь список из устаревшего замыкания — иначе стирались бы правки, сделанные за время удаления.
      const restoreTarget = <T extends { id: string }>(prev: T[], card: T, index: number): T[] => (
        prev.some((c) => c.id === card.id) ? prev : [...prev.slice(0, index), card, ...prev.slice(index)]
      );
      if (kind === 'saved') updateSavedCards((prev) => restoreTarget(prev, target as (typeof prev)[number], Math.max(0, savedCards.findIndex((c) => c.id === target.id))));
      else updateCustomCards((prev) => restoreTarget(prev, target as (typeof prev)[number], Math.max(0, customCards.findIndex((c) => c.id === target.id))));
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось удалить карточку.',
          uk: 'Не вдалося видалити картку.',
          es: 'No se pudo eliminar la tarjeta.', en: 'Couldn’t delete the card.',
          'pt-BR': 'Não foi possível excluir o cartão.', vi: 'Không xóa được thẻ.', id: 'Kartu tidak bisa dihapus.', tr: 'Kart silinemedi.', pl: 'Nie udało się usunąć karty.',
        }),
      );
    } finally {
      deletingCardIdsRef.current.delete(cardId);
    }
  }, [cards, customCards, savedCards, clearUndoTimer, updateCustomCards, updateSavedCards, currentIndexRef, onIndexClamped, studyTarget]);

  const deleteCardsByIds = useCallback(async (cardIds: readonly string[]) => {
    const accountToken = captureAccountGeneration();
    const wanted = new Set(cardIds.map((id) => String(id ?? '').trim()).filter(Boolean));
    const targets = cards.filter((card) => wanted.has(card.id) && !card.isSystem && card.categoryId === 'saved');
    if (targets.length === 0) return false;
    const targetIds = new Set(targets.map((card) => card.id));
    const items = targets.map((card) => ({
      uiCard: card,
      uiIndex: Math.max(0, savedCards.findIndex((saved) => saved.id === card.id)),
      savedSnapshot: null as { card: Flashcard; index: number } | null,
    }));
    const updated = cards.filter((card) => !targetIds.has(card.id));
    updateSavedCards((prev) => prev.filter((card) => !targetIds.has(card.id)));
    const base = currentIndexRef.current;
    onIndexClamped(Math.max(0, Math.min(base, updated.length - 1)));
    try {
      for (const item of items) {
        if (!isCurrentAccountGeneration(accountToken)) return false;
        item.savedSnapshot = await removeFlashcardWithSnapshot(item.uiCard.id, item.uiCard.studyTarget ?? item.uiCard.packLanguage ?? studyTarget);
        if (!item.savedSnapshot) throw new Error('Saved card no longer available');
      }
      const key = ++undoKeyRef.current;
      clearUndoTimer();
      setUndoEntry({
        accountToken,
        key,
        kind: 'saved',
        uiCard: items[0].uiCard,
        uiIndex: items[0].uiIndex,
        customSnapshot: null,
        savedSnapshot: null,
        batch: { kind: 'saved', items },
      });
      undoTimerRef.current = setTimeout(() => {
        setUndoEntry((cur) => (cur?.key === key ? null : cur));
      }, 5000);
      return true;
    } catch (error: unknown) {
      // зачем (координатор 12.10, аудит Optimistic UI R1): немой catch — причина отката пакетного удаления в журнал.
      console.warn(`[OPT-UI] batch_delete rollback kind=${error instanceof Error ? error.name : typeof error} items=${items.length}`); // guard-ok: catch пишет причину
      if (!isCurrentAccountGeneration(accountToken)) return false;
      for (const item of [...items].reverse()) {
        if (!isCurrentAccountGeneration(accountToken)) return false;
        if (item.savedSnapshot) await restoreFlashcard(item.savedSnapshot.card, item.savedSnapshot.index).catch(noteSwallowedHandler('useCollectionData:promise_15'));
      }
      const actual = await loadAllSavedFlashcards();
      if (!isCurrentAccountGeneration(accountToken)) return false;
      updateSavedCards(() => actual.map(card => savedToCard(card)));
      onIndexClamped(Math.max(0, Math.min(base, savedCards.length - 1)));
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось удалить выбранные карточки.',
          uk: 'Не вдалося видалити вибрані картки.',
          es: 'No se pudieron eliminar las tarjetas seleccionadas.', en: 'Couldn’t delete the selected cards.',
          'pt-BR': 'Não foi possível excluir os cartões selecionados.', vi: 'Không xóa được các thẻ đã chọn.', id: 'Kartu yang dipilih tidak bisa dihapus.', tr: 'Seçilen kartlar silinemedi.', pl: 'Nie udało się usunąć wybranych kart.',
        }),
      );
      return false;
    }
  }, [cards, savedCards, clearUndoTimer, updateSavedCards, currentIndexRef, onIndexClamped, studyTarget]);

  /** «Вернуть»: restore через ту же очередь — карточка встаёт на прежнее место. */
  const undoDelete = useCallback(async () => {
    const entry = undoEntry;
    if (!entry) return;
    if (!isCurrentAccountGeneration(entry.accountToken)) { setUndoEntry(null); return; }
    clearUndoTimer();
    setUndoEntry(null);
    fcHaptic('tap');
    try {
      if (entry.batch?.kind === 'saved') {
        // зачем (координатор 12.10, аудит Optimistic UI R1): «Вернуть» возвращает карточки в список в тот же кадр, запись в хранилище догоняет; при сбое catch перечитывает факт и говорит об этом.
        if (!isCurrentAccountGeneration(entry.accountToken)) return;
        updateSavedCards((prev) => {
          const next = [...prev];
          for (const item of [...entry.batch!.items].sort((a, b) => a.uiIndex - b.uiIndex)) {
            if (next.some((card) => card.id === item.uiCard.id)) continue;
            next.splice(Math.max(0, Math.min(item.uiIndex, next.length)), 0, item.savedSnapshot ? savedToCard(item.savedSnapshot.card, studyTarget) : item.uiCard);
          }
          return next;
        });
        for (const item of [...entry.batch.items].reverse()) {
          if (!isCurrentAccountGeneration(entry.accountToken)) return;
          if (item.savedSnapshot) await restoreFlashcard(item.savedSnapshot.card, item.savedSnapshot.index);
        }
      } else if (entry.kind === 'custom') {
        const card = entry.customSnapshot?.card ?? entry.uiCard;
        const index = entry.customSnapshot?.index ?? entry.uiIndex;
        // зачем (координатор 12.10, аудит Optimistic UI R1, E4/E6): своя карточка возвращается в список в тот же кадр, запись догоняет; при сбое catch перечитывает список своих из хранилища.
        updateCustomCards((prev) => {
          if (prev.some((c) => c.id === card.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, Math.min(index, next.length)), 0, card);
          return next;
        });
        await restoreCustomCard(card, index, studyTarget);
      } else {
        const uiCard = entry.savedSnapshot ? savedToCard(entry.savedSnapshot.card, studyTarget) : entry.uiCard;
        const index = entry.savedSnapshot?.index ?? entry.uiIndex;
        updateSavedCards((prev) => {
          if (prev.some((c) => c.id === uiCard.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, Math.min(index, next.length)), 0, uiCard);
          return next;
        });
        if (entry.savedSnapshot) {
          await restoreFlashcard(entry.savedSnapshot.card, entry.savedSnapshot.index);
        }
      }
    } catch (error: unknown) {
      console.warn(`[OPT-UI] undo_delete rollback kind=${error instanceof Error ? error.name : typeof error} entry=${entry.kind}${entry.batch ? ' batch' : ''}`); // guard-ok: catch пишет причину
      if (!isCurrentAccountGeneration(entry.accountToken)) return;
      if (entry.kind === 'custom' && !entry.batch) {
        const actualCustom = await listCustomCards(studyTarget).catch((reloadError: unknown) => {
          console.warn(`[OPT-UI] undo_delete custom reload_failed kind=${reloadError instanceof Error ? reloadError.name : typeof reloadError}`); // guard-ok: catch пишет причину
          return null;
        });
        if (!isCurrentAccountGeneration(entry.accountToken)) return;
        if (actualCustom) updateCustomCards(() => actualCustom);
      } else {
        const actual = await loadAllSavedFlashcards();
        if (!isCurrentAccountGeneration(entry.accountToken)) return;
        updateSavedCards(() => actual.map(card => savedToCard(card)));
      }
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось вернуть карточку.',
          uk: 'Не вдалося повернути картку.',
          es: 'No se pudo restaurar la tarjeta.', en: 'Couldn’t restore the card.',
          'pt-BR': 'Não foi possível restaurar o cartão.', vi: 'Không khôi phục được thẻ.', id: 'Kartu tidak bisa dipulihkan.', tr: 'Kart geri yüklenemedi.', pl: 'Nie udało się przywrócić karty.',
        }),
      );
    }
  }, [undoEntry, clearUndoTimer, updateCustomCards, updateSavedCards, studyTarget]);

  return { undoEntry, deleteCardById, deleteCardsByIds, undoDelete };
}

// ── E11: трекинг ачивки сессии ──────────────────────────────────────────────
export function useFlashcardViewTracking() {
  /** Изоляция целей: счётчик просмотров считает карточки текущей цели. */
  const { studyTarget } = useStudyTarget();
  const sessionDoneRef = useRef(false); // achievement fired once per session
  /** Просмотренные id из словаря flashcards_v1 — для ачивки «все карточки за сессию». */
  const flashAchievementSeenRef = useRef<Set<string>>(new Set());
  const resetSession = useCallback(() => {
    sessionDoneRef.current = false;
    flashAchievementSeenRef.current.clear();
  }, []);

  const registerFlashcardViewed = useCallback((cardIds: string[]) => {
    for (const id of cardIds) {
      if (id) flashAchievementSeenRef.current.add(id);
    }
    if (!sessionDoneRef.current && cardIds.length > 0) {
      loadFlashcards(studyTarget)
        .then((all) => {
          if (all.length === 0) return;
          const seen = flashAchievementSeenRef.current;
          if (all.every((c) => seen.has(c.id))) {
            sessionDoneRef.current = true;
            checkAchievements({ type: 'flashcards_session' }).catch(noteSwallowedHandler('useCollectionData:promise_17'));
          }
        })
        .catch(noteSwallowedHandler('useCollectionData:promise_16'));
    }
  }, [studyTarget]);

  const trackCardFlip = useCallback((_cardId: string) => {}, []);

  return { registerFlashcardViewed, trackCardFlip, resetSession };
}

// ── E11: производные списки — категория → фильтр → поиск → free-limit (§3.2) ──
export function useDerivedCollectionCards(args: {
  activeCat: CategoryId;
  packDeeplink: string | null;
  savedCards: CardItem[];
  customCards: CardItem[];
  marketCards: CardItem[];
  systemCards: CardItem[];
  savedContentKind: SavedCardContentKind;
  activeFilter: string;
  searchQuery: string;
  isPremium: boolean;
}) {
  const {
    activeCat, packDeeplink, savedCards, customCards, marketCards,
    systemCards, savedContentKind, activeFilter, searchQuery, isPremium,
  } = args;
  /** Власні картки користувача окремо від куплених наборів; куплений набір — лише з `?pack=`. */
  const collectionCustomCards = useMemo(() => {
    if (packDeeplink) {
      return (marketCards ?? []).filter(
        (c) => c.source === 'lesson' && c.sourceId === `DEV:${packDeeplink}`,
      );
    }
    return customCards ?? [];
  }, [packDeeplink, marketCards, customCards]);
  const cards = useMemo(() => {
    if (activeCat === 'custom') return collectionCustomCards;
    return getCardsForCategory(activeCat, savedCards, customCards, systemCards);
  }, [activeCat, savedCards, customCards, collectionCustomCards, systemCards]);
  const contentFilteredCards = useMemo(
    () => activeCat === 'saved' && !packDeeplink
      ? filterSavedCardsByContentKind(cards, savedContentKind)
      : cards,
    [activeCat, cards, packDeeplink, savedContentKind],
  );
  const filteredCards = useMemo(
    () => applyCardFilter(contentFilteredCards, activeFilter),
    [contentFilteredCards, activeFilter],
  );
  /** E11: поиск по en/ru/uk/es поверх активного фильтра (все вкладки). */
  const searchedCards = useMemo(
    () => searchCards(filteredCards, searchQuery),
    [filteredCards, searchQuery],
  );
  /**
   * Лимит бесплатных 20 — по СТАБИЛЬНЫМ id (первые 20 по addedAt в неотфильтрованном
   * массиве сохранённых), а не по индексу рендера (баг 10). Заблокированные карточки
   * не рендерятся N замками — вместо них одна секция «+N скрыто» в футере списка.
   */
  const unlockedSavedIds = useMemo(() => computeUnlockedSavedIds(savedCards), [savedCards]);
  const { visible: listCards, hiddenCount: hiddenByLimitCount } = useMemo(() => {
    if (activeCat !== 'saved') return { visible: searchedCards, hiddenCount: 0 };
    return splitByFreeLimit(searchedCards, unlockedSavedIds, isPremium);
  }, [activeCat, searchedCards, unlockedSavedIds, isPremium]);

  return { cards, filteredCards, listCards, hiddenByLimitCount };
}

/** Прозрачность к цвету #rrggbb суффиксом `AA`; цвет другого вида (rgba, #rrggbbaa) возвращается без изменений. */
function withHexAlpha(color: string, aa: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${aa}` : color;
}

// ── E11: премиальный декор просмотра купленного пака (`?pack=` / lesson:DEV:…) ──
export function usePackBrowseVisual(args: {
  packDeeplink: string | null;
  activeFilter: string;
  marketPackCatalog: FlashcardMarketPack[];
  themeMode: ThemeMode;
  isLightTheme: boolean;
  bgCard: string;
  bgSurface: string;
}) {
  const { packDeeplink, activeFilter, marketPackCatalog, themeMode, isLightTheme, bgCard, bgSurface } = args;
  // зачем (координатор 12.10): оболочка окна покупки и тон карточек купленного набора следуют активной теме Liquid Glass (в том числе светлой)
  const { liquidGlassThemeId } = useTheme();
  const glassTokens = useMemo(() => liquidGlassTokens(liquidGlassThemeId), [liquidGlassThemeId]);
  const currentMarketPack = useMemo((): FlashcardMarketPack | null => {
    if (packDeeplink) return marketPackCatalog.find((p) => p.id === packDeeplink) ?? null;
    if (activeFilter.startsWith('lesson:')) {
      const sourceId = activeFilter.slice(7);
      if (sourceId.startsWith('DEV:')) {
        const packId = sourceId.slice(4);
        return marketPackCatalog.find((p) => p.id === packId) ?? null;
      }
    }
    return null;
  }, [packDeeplink, activeFilter, marketPackCatalog]);

  const packPremiumVisual = useMemo(() => {
    if (!currentMarketPack) return null;
    if (currentMarketPack.isCommunityUgc && currentMarketPack.ugcCardThemeKey) {
      return getCommunityUgcPackPaywallTheme(currentMarketPack.ugcCardThemeKey, { tokens: glassTokens });
    }
    return getCardPackPaywallTheme(currentMarketPack, { tokens: glassTokens });
  }, [currentMarketPack, glassTokens]);

  const packCardTheme = useMemo(() => {
    /**
     * UGC-набор: цвет карточек берём напрямую из выбранной автором палитры
     * (`ugcCardChrome`), а не из декора paywall-модалки — иначе в светлой теме
     * выбор «Цвет карточек» не влиял ни на что (владелец, 2026-08-13).
     */
    if (currentMarketPack?.isCommunityUgc) {
      const chrome = ugcCardChrome(currentMarketPack.ugcCardThemeKey, {
        isLight: isLightTheme,
        bgCard,
        bgSurface,
      });
      return {
        borderAccent: chrome.borderAccent,
        frontGradient: chrome.frontGradient,
        backGradient: chrome.backGradient,
      };
    }
    if (!packPremiumVisual) return null;
    const c0 = packPremiumVisual.ctaColors[0];
    const c1 = packPremiumVisual.ctaColors[1];
    const fa = isLightTheme ? '20' : '3E';
    const ba = isLightTheme ? '18' : '32';
    return {
      borderAccent: packPremiumVisual.borderAccent,
      // зачем (координатор 12.10): цвета оболочки теперь из токенов темы — суффикс прозрачности добавляем только к #rrggbb, иначе цвет остаётся как есть
      frontGradient: [withHexAlpha(c0, fa), bgCard] as [string, string],
      backGradient: [withHexAlpha(c1, ba), bgSurface] as [string, string],
    };
  }, [currentMarketPack, packPremiumVisual, isLightTheme, bgCard, bgSurface]);

  return { currentMarketPack, packPremiumVisual, packCardTheme };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): размеры кэшей этого модуля попадают в [HUB-LIFECYCLE] на mount/unmount хаба; вне dev — пусто.
registerHubCacheProbe('collection.savedCards', () => _savedCardsCache?.length ?? 0);
registerHubCacheProbe('collection.customCards', () => _customCardsCache?.length ?? 0);
registerHubCacheProbe('collection.enToUk', () => _enToUkCache?.size ?? 0);
registerHubCacheProbe('collection.stagedOwnedPackCards', () => stagedOwnedPackMarketCards?.cards.length ?? 0);
