import { flashcardsDeleteHintSeenKey, type RuntimeStudyTarget } from '../target_storage_keys';
import { useLang } from '../../components/LangContext';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from '../flashcards_target_gate';
import { ensureFrenchRemoteFlashcards, prefetchFrenchRemoteFlashcards } from '../french_flashcard_remote_runtime';
import { storageStudyTarget } from '../target_storage_keys';
import { useStudyTarget } from '../../components/StudyTargetContext';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Flashcard,
  loadFlashcards,
  removeFlashcardWithSnapshot,
  restoreFlashcard,
  saveFlashcards,
} from '../../hooks/use-flashcards';
import { getTranscription } from '../transcription';
import { actionToastTri, emitAppEvent } from '../events';
import { checkAchievements } from '../achievements';
import { deleteCustomCard, restoreCustomCard } from './custom_cards_store';
import { fcHaptic } from './SoundService';
import { getCardPackPaywallTheme, getCommunityUgcPackPaywallTheme } from './cardPackPaywallTheme';
import type { ThemeMode } from '../../constants/theme';
import { applyCardFilter, getCardsForCategory, searchCards } from './selectors';
import { computeUnlockedSavedIds, splitByFreeLimit } from './free_limit';
import { CardItem, type CategoryId } from './types';
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
  stagedCommunityPackCardsPromise,
} from '../community_packs/staging';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { ugcCardChrome } from '../community_packs/ugcCardThemePresets';
import {
  loadLocalAuthorPacks,
  localAuthorPackCardItems,
  mergeLocalAuthorPacks,
} from '../community_packs/localAuthorPacks';
import {
  fetchCommunityPackCards,
  loadPublishedCommunityMarketPacks,
} from '../community_packs/communityFirestore';
import { getCanonicalUserId } from '../user_id_policy';

// Module-level cache — survives re-renders; warm via `primeFlashcardsCollectionCache` (хаб / root)
let _savedCardsCache: CardItem[] | null = null;
let _customCardsCache: CardItem[] | null = null;

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

export const savedToCard = (f: Flashcard): CardItem => ({
  id: f.id, en: f.en, ru: f.ru, uk: f.uk || f.ru,
  es: f.es,
  transcription: f.transcription,
  categoryId: 'saved', isSystem: false,
  source: f.source, sourceId: f.sourceId,
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
  void Promise.all([
    loadFlashcards(studyTarget).catch((): Flashcard[] => []),
    readCustomCards(studyTarget).catch(() => null),
    loadAccessiblePackIds(studyTarget).catch((): string[] => []),
    loadBuiltMarketplaceCardsCache().catch((): null => null),
  ]).then(([saved, rawCustom]) => {
    _savedCardsCache = saved.map(savedToCard);
    _customCardsCache = Array.isArray(rawCustom) ? (rawCustom as CardItem[]) : [];
  });
}

/**
 * Викликати синхронно в `router.push` перед відкриттям колекції з `?pack=` —
 * тоді перший кадр уже містить картки з бандла (без порожнього «створити картку»).
 */
let stagedOwnedPackMarketCards: CardItem[] | null = null;

export function stageOwnedPackCardsForNavigation(packId: string): void {
  const packs = bundledPacksForOwned([packId]);
  stagedOwnedPackMarketCards = packs.length > 0 ? buildMarketplaceOwnedCards(packs) : null;
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
    ensureFrenchRemoteFlashcards(lang).catch(() => {});
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
      consumeStagedCommunityPackMarketCards();
      stagedOwnedPackMarketCards = null;
      return [];
    }
    const com = communityPacksEnabled ? consumeStagedCommunityPackMarketCards() : null;
    if (com && com.length > 0) return com;
    const snap = stagedOwnedPackMarketCards;
    stagedOwnedPackMarketCards = null;
    return snap ?? [];
  });
  const [marketPackCatalog, setMarketPackCatalog] = useState<FlashcardMarketPack[]>(
    () => (officialPacksEnabled ? reserveBundledMarketPacks(studyTarget, lang) : []),
  );
  /** Список купленных паков из хранилища — для `?pack=` до отрисовки `marketCards` (иначе гонка с кэшем). */
  const [ownedPackIdList, setOwnedPackIdList] = useState<string[]>([]);
  /** Куплені UGC-набори (окремий ключ AsyncStorage). */
  const [communityOwnedIdList, setCommunityOwnedIdList] = useState<string[]>([]);
  /** `getCanonicalUserId` — доступ автора до свого UGC без «покупки» в `communityOwnedIdList`. */
  const [accessStableId, setAccessStableId] = useState<string | null>(null);
  /** `loadAll` завершил цикл; до этого нельзя валидировать `?pack=` по пустому `marketCards`. */
  const [collectionDataReady, setCollectionDataReady] = useState(false);
  // Instant paint when session cache exists (re-open); first cold open still waits on AsyncStorage
  const [loading, setLoading] = useState(
    () => _savedCardsCache === null && _customCardsCache === null,
  );
  const [loadError, setLoadError] = useState(false);

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
    try {
      const userSid = await getCanonicalUserId().catch(() => null);
      setAccessStableId(userSid);
      // Only show loading on first ever open (no cache yet)
      if (!_savedCardsCache && !_customCardsCache) setLoading(true);
      const [saved, customParsed, progressParsed, hintSeen, ownedIdsEarly, builtMarketCache, communityOwnedEarly] =
        await Promise.all([
          loadFlashcards(studyTarget),
          readCustomCards(studyTarget),
          readFlashcardsProgress(studyTarget),
          AsyncStorage.getItem(flashcardsDeleteHintSeenKey(studyTarget)),
          loadAccessiblePackIds(studyTarget),
          loadBuiltMarketplaceCardsCache().catch((): null => null),
          loadCommunityOwnedPackIds(studyTarget).catch((): string[] => []),
        ]);
      const custom: CardItem[] = Array.isArray(customParsed) ? (customParsed as CardItem[]) : [];
      // Швидке відображення: одразу з AsyncStorage, без import lesson data / маркету.
      const mappedSavedQuick = saved.map(savedToCard);
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
        setMarketPackCatalog(reserveBundledMarketPacks());
      } else if (ownedIdsEarly.length > 0 || communityOwnedEarly.length > 0) {
        /** Одразу з бандла — не чекаємо Firestore у `marketPromise`, інакше `?pack=` показує порожній custom. */
        setIdsIfChanged(setOwnedPackIdList, ownedIdsEarly);
        setIdsIfChanged(setCommunityOwnedIdList, communityOwnedEarly);
        const ownedBundled = bundledPacksForOwned(ownedIdsEarly);
        if (ownedBundled.length > 0) {
          setCardsIfChanged(setMarketCards, buildMarketplaceOwnedCards(ownedBundled));
        }
        setMarketPackCatalog(reserveBundledMarketPacks());
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

      // Міграція UK / транскрипції (важка) і маркет — паралельно; `setMarketCards` не чекає міграції
      // (інакше платні картки з’являються пізніше за «Збережені» / порожній список).
      const migrationPromise = (async (): Promise<Flashcard[]> => {
        const hasMissingUk = saved.some((c: Flashcard) => !c.uk || c.uk === c.ru);
        const hasMissingTr = saved.some((c: Flashcard) => !c.transcription);
        if (!hasMissingUk && !hasMissingTr) return saved;
        const enToUk = hasMissingUk ? await getEnToUkMap() : null;
        let needsSave = false;
        const migratedLocal = saved.map((card: Flashcard) => {
          let updated = card;
          if (enToUk && (!card.uk || card.uk === card.ru)) {
            const ukTranslation = enToUk.get(card.en.trim());
            if (ukTranslation && ukTranslation !== card.ru) {
              needsSave = true;
              updated = { ...updated, uk: ukTranslation };
            }
          }
          if (!updated.transcription) {
            const tr = getTranscription(updated.en);
            if (tr) {
              needsSave = true;
              updated = { ...updated, transcription: tr };
            }
          }
          return updated;
        });
        if (needsSave) {
          await saveFlashcards(migratedLocal);
        }
        const mappedAfter = migratedLocal.map(savedToCard);
        _savedCardsCache = mappedAfter;
        // Миграция чаще всего ничего не меняет (уже мигрированные карточки) —
        // тогда список не должен дёргаться повторной отрисовкой.
        setCardsIfChanged(setSavedCards, mappedAfter);
        return migratedLocal;
      })();

      const marketPromise = (async () => {
        const [ownedIds, marketPacks, communityOwnedIds, communityPublished, activePackIdRaw, localAuthored] = await Promise.all([
          loadAccessiblePackIds(studyTarget),
          loadMarketplacePacks(studyTarget),
          loadCommunityOwnedPackIds(studyTarget).catch((): string[] => []),
          loadPublishedCommunityMarketPacks(studyTarget).catch((): FlashcardMarketPack[] => []),
          isDevMarketEnabled ? consumeDevActivePack(studyTarget) : Promise.resolve(null as string | null),
          loadLocalAuthorPacks(studyTarget).catch(() => []),
        ]);
        /** Свои наборы с устройства: доступны сразу после «Сохранить», без ожидания модерации. */
        const localAuthoredMarket = mergeLocalAuthorPacks(communityPublished, localAuthored, studyTarget);
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
        const officialBuilt = buildMarketplaceOwnedCards(ownedOfficialPacks);
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
        const [communityCardLists, previewCardLists] = await Promise.all([
          Promise.all(communityIdsToLoad.map((id) => fetchCommunityPackCards(id, studyTarget).catch((): CardItem[] => []))),
          Promise.all(previewIdsToLoad.map((id) => fetchCommunityPackCards(id, studyTarget).catch((): CardItem[] => []))),
        ]);
        const builtMarket = [...officialBuilt, ...communityCardLists.flat()];
        // Финальный состав маркета почти всегда совпадает с тем, что уже показано
        // из кэша — тогда перерисовки быть не должно (см. sameCardList).
        setCardsIfChanged(setMarketCards, [...builtMarket, ...previewCardLists.flat(), ...localAuthoredCards]);
        /**
         * Локальные наборы в кэш не пишем: они меняются на устройстве и всегда читаются заново.
         * Просматриваемый (ещё не добавленный) набор в кэш «моих» тоже не попадает.
         */
        void saveBuiltMarketplaceCardsCache([...ownedIds, ...communityIdsToLoad].sort(), builtMarket);
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
    } catch {
      setLoading(false);
      setOwnedPackIdList([]);
      setCommunityOwnedIdList([]);
      setLoadError(true);
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось загрузить карточки.',
          uk: 'Не вдалося завантажити картки.',
          es: 'No se pudieron cargar las tarjetas.',
        }),
      );
    } finally {
      setCollectionDataReady(true);
    }
  }, [isDevMarketEnabled]);

  /**
   * `?pack=` из «Моих наборов» / каталога: карточки набора уже поехали в
   * `stageCommunityPackCardsForNavigation` ДО `router.push`. Подхватываем ИМЕННО
   * этот запрос, а не ждём конца общего `loadAll` (маркет + каталог сообщества +
   * авторские наборы): иначе набор несколько секунд стоит пустым и пользователь
   * видит промежуточную заглушку вместо набора (владелец, 2026-08-13).
   */
  const deeplinkPackId = opts.deeplinkPackId ?? null;
  useEffect(() => {
    if (!deeplinkPackId || !communityPacksEnabled) return;
    const sourceId = `DEV:${deeplinkPackId}`;
    const apply = (cards: CardItem[]) => {
      if (cards.length === 0) return;
      setMarketCards((prev) => (prev.some((c) => c.sourceId === sourceId) ? prev : [...prev, ...cards]));
    };
    const memo = peekStagedCommunityPackCards(deeplinkPackId);
    if (memo) {
      apply(memo);
      return;
    }
    const pending = stagedCommunityPackCardsPromise(deeplinkPackId);
    if (!pending) return;
    let cancelled = false;
    void pending.then((cards) => {
      if (!cancelled) apply(cards);
    });
    return () => {
      cancelled = true;
    };
  }, [communityPacksEnabled, deeplinkPackId]);

  return {
    savedCards,
    customCards,
    marketCards,
    marketPackCatalog,
    setMarketPackCatalog,
    ownedPackIdList,
    communityOwnedIdList,
    accessStableId,
    collectionDataReady,
    loading,
    loadError,
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
        es: 'Pack DEV comprado abierto en Tarjetas.',
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
    const stagedFromHub = getStagedNavigationPackId() === pid;
    /** Режим просмотра: набор сообщества можно открыть и не добавляя его себе. */
    if (previewMode && packMeta.isCommunityUgc) {
      if (stagedFromHub) clearStagedNavigationPackId();
      return;
    }
    const owned =
      ownedPackIdList.includes(pid) ||
      communityOwnedIdList.includes(pid) ||
      isAuthorUgc ||
      stagedFromHub;
    if (owned) {
      if (stagedFromHub) clearStagedNavigationPackId();
    } else {
      emitAppEvent(
        'action_toast',
        actionToastTri('info', {
          ru: 'Набор ещё не куплен. Его можно открыть за осколки в магазине (вкладка с наборами карточек).',
          uk: 'Набір ще не куплено. Його можна відкрити за осколки в магазині (вкладка з наборами карток).',
          es: 'Aún no has comprado este pack. Puedes obtenerlo por fragmentos en la tienda (pestaña de packs de Tarjetas).',
        }),
      );
      onDeniedRef.current('not_owned');
    }
  }, [
    collectionDataReady, packDeeplink, marketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId, previewMode,
  ]);
}

// ── E11: undo-пайплайн удаления (E7), вынесен из монолита ────────────────────
/**
 * Оптимистичное удаление + undo-снекбар 5с. Персист идёт СРАЗУ через очередь
 * записи (custom_cards_store / use-flashcards withWriteLock) — undo кладёт
 * карточку обратно тем же путём. Никаких «запись после таймаута» (принцип 4).
 */
export type UndoEntry = {
  key: number;
  kind: 'custom' | 'saved';
  uiCard: CardItem;
  uiIndex: number;
  customSnapshot: { card: CardItem; index: number } | null;
  savedSnapshot: { card: Flashcard; index: number } | null;
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
}) {
  const { cards, customCards, savedCards, updateCustomCards, updateSavedCards, currentIndexRef, onIndexClamped } = args;
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

  const deleteCardById = useCallback(async (cardId: string, fallbackIdx?: number) => {
    const target = cards.find((c) => c.id === cardId);
    if (!target || target.isSystem) return;
    const kind: 'custom' | 'saved' | null =
      target.categoryId === 'custom' && customCards.some((c) => c.id === target.id)
        ? 'custom'
        : target.categoryId === 'saved'
          ? 'saved'
          : null;
    if (!kind) return;
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
      const customSnapshot = kind === 'custom' ? await deleteCustomCard(target.id) : null;
      const savedSnapshot = kind === 'saved' ? await removeFlashcardWithSnapshot(target.id) : null;
      // 3) Undo-снекбар 5с (новое удаление заменяет предыдущее)
      const key = ++undoKeyRef.current;
      clearUndoTimer();
      setUndoEntry({ key, kind, uiCard: target, uiIndex, customSnapshot, savedSnapshot });
      undoTimerRef.current = setTimeout(() => {
        setUndoEntry((cur) => (cur?.key === key ? null : cur));
      }, 5000);
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось удалить карточку.',
          uk: 'Не вдалося видалити картку.',
          es: 'No se pudo eliminar la tarjeta.',
        }),
      );
    }
  }, [cards, customCards, savedCards, clearUndoTimer, updateCustomCards, updateSavedCards, currentIndexRef, onIndexClamped]);

  /** «Вернуть»: restore через ту же очередь — карточка встаёт на прежнее место. */
  const undoDelete = useCallback(async () => {
    const entry = undoEntry;
    if (!entry) return;
    clearUndoTimer();
    setUndoEntry(null);
    fcHaptic('tap');
    try {
      if (entry.kind === 'custom') {
        const card = entry.customSnapshot?.card ?? entry.uiCard;
        const index = entry.customSnapshot?.index ?? entry.uiIndex;
        await restoreCustomCard(card, index);
        updateCustomCards((prev) => {
          if (prev.some((c) => c.id === card.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, Math.min(index, next.length)), 0, card);
          return next;
        });
      } else {
        if (entry.savedSnapshot) {
          await restoreFlashcard(entry.savedSnapshot.card, entry.savedSnapshot.index);
        }
        const uiCard = entry.savedSnapshot ? savedToCard(entry.savedSnapshot.card) : entry.uiCard;
        const index = entry.savedSnapshot?.index ?? entry.uiIndex;
        updateSavedCards((prev) => {
          if (prev.some((c) => c.id === uiCard.id)) return prev;
          const next = [...prev];
          next.splice(Math.max(0, Math.min(index, next.length)), 0, uiCard);
          return next;
        });
      }
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Не удалось вернуть карточку.',
          uk: 'Не вдалося повернути картку.',
          es: 'No se pudo restaurar la tarjeta.',
        }),
      );
    }
  }, [undoEntry, clearUndoTimer, updateCustomCards, updateSavedCards]);

  return { undoEntry, deleteCardById, undoDelete };
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
            checkAchievements({ type: 'flashcards_session' }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

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
  activeFilter: string;
  searchQuery: string;
  isPremium: boolean;
}) {
  const {
    activeCat, packDeeplink, savedCards, customCards, marketCards,
    systemCards, activeFilter, searchQuery, isPremium,
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
  const filteredCards = useMemo(
    () => applyCardFilter(cards, activeFilter),
    [cards, activeFilter],
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
      return getCommunityUgcPackPaywallTheme(currentMarketPack.ugcCardThemeKey, { themeMode, isLight: isLightTheme });
    }
    return getCardPackPaywallTheme(currentMarketPack, { themeMode, isLight: isLightTheme });
  }, [currentMarketPack, themeMode, isLightTheme]);

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
      frontGradient: [c0 + fa, bgCard] as [string, string],
      backGradient: [c1 + ba, bgSurface] as [string, string],
    };
  }, [currentMarketPack, packPremiumVisual, isLightTheme, bgCard, bgSurface]);

  return { currentMarketPack, packPremiumVisual, packCardTheme };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
