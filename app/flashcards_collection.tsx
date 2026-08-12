/**
 * cards-2.0 (E11): контейнер коллекции — загрузка данных (useCollectionData),
 * фильтр/поиск, роутинг режимов «Список / Колода», delete+undo-пайплайн, модалки.
 * View-режимы вынесены: CollectionListView (список) и CollectionDeckView (колода);
 * шапка — CollectionHeader; хуки данных/удаления/трекинга — useCollectionData.
 */
import { CLOUD_SYNC_ENABLED, DEV_MODE, IS_BETA_TESTER, IS_EXPO_GO } from './config';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { usePremium } from '../components/PremiumContext';
import { useAudio, type SpeakOpts } from '../hooks/use-audio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  InteractionManager,
  Platform,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { actionToastTri, emitAppEvent } from './events';
import { CATEGORIES, STR } from './flashcards/constants';
import { SYSTEM_CARDS } from './flashcards/system-cards';
import { CardItem, CategoryId } from './flashcards/types';
import { writeFlashcardsProgress } from './flashcards/storage';
// E8: быстрый старт — размер сессии из последнего пресета (fc_mode_prefs_v1)
import { FC_DEFAULT_SESSION_SIZE, getLastPreset } from './flashcards/mode_prefs';
import { fcHaptic } from './flashcards/SoundService';
import { buildFilterGroups, buildFilterOptions, FilterGroup } from './flashcards/selectors';
import FlashcardsFilterDropdown from './flashcards/FlashcardsFilterDropdown';
import CollectionHeader, { DevMarketFab } from './flashcards/CollectionHeader';
import CollectionListView, {
  CollectionEmptyState,
  UndoDeleteSnackbar,
} from './flashcards/CollectionListView';
import CollectionDeckView from './flashcards/CollectionDeckView';
// E13: «сила слова» — точки Weak/Medium/Strong из SRS-данных (§2)
import {
  loadWordStrengthMap,
  strengthFor,
  type WordStrength,
  type WordStrengthMap,
} from './flashcards/word_strength';
import {
  getCollectionViewMode,
  setCollectionViewMode,
  type FcCollectionViewMode,
} from './flashcards/collection_view_prefs';
import CommunityPackRatingBar from './community_packs/CommunityPackRatingBar';
import { isCommunityPacksCloudEnabled } from './community_packs/functionsClient';
import { flashcardContentLang } from './spanish_content_gate';
// E11: данные/удаление/трекинг/пак-декор вынесены из монолита в хуки
import {
  applyPostLoadNavigation,
  useCollectionData,
  useCollectionDeletion,
  useDerivedCollectionCards,
  useFlashcardViewTracking,
  usePackBrowseVisual,
  usePackDeeplinkGuard,
  type CollectionLoadedInfo,
} from './flashcards/useCollectionData';

// Реэкспорт prime/stage — внешние вызовы (хаб, root, flashcards.tsx) не трогаем
export {
  primeFlashcardsCollectionCache,
  stageOwnedPackCardsForNavigation,
  /** @deprecated те саме, що primeFlashcardsCollectionCache */
  primeFlashcardsCollectionCache as primeCustomFlashcardsCache,
} from './flashcards/useCollectionData';

/** E11 (§3.2): debounce строки поиска. */
const FC_SEARCH_DEBOUNCE_MS = 200;

function normalizeRouteCategory(cat: string | string[] | undefined): CategoryId | null {
  const raw = Array.isArray(cat) ? cat[0] : cat;
  if (!raw || typeof raw !== 'string') return null;
  return CATEGORIES.some((c) => c.id === raw) ? (raw as CategoryId) : null;
}

function normalizePackParam(pack: string | string[] | undefined): string | null {
  const raw = Array.isArray(pack) ? pack[0] : pack;
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FlashcardsScreen() {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode, statusBarLight, uiScale } = useTheme();
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const strLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const router   = useRouter();
  const params   = useLocalSearchParams<{ cat?: string; pack?: string; create?: string }>();
  const routeCat = useMemo(() => normalizeRouteCategory(params.cat), [params.cat]);
  const packDeeplink = useMemo(() => normalizePackParam(params.pack), [params.pack]);
  const routeCatRef = useRef<CategoryId | null>(null);
  routeCatRef.current = routeCat;
  const packRouteRef = useRef<string | null>(null);
  packRouteRef.current = packDeeplink;

  const s        = STR[strLang];
  const insets   = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { CARD_H, PEEK } = useMemo(() => {
    const reserved = 200 + insets.top + insets.bottom;
    const hAvail = Math.max(220, screenH - reserved);
    /** Компактніша висота картки: раніше max 280px / ~52% екрана було зайвим. × uiScale — узгоджено з темою. */
    const cardH = Math.min(224, Math.max(140, Math.round(hAvail * 0.45 * uiScale)));
    const peek = Math.max(30, Math.round(cardH * 0.19));
    return { CARD_H: cardH, PEEK: peek };
  }, [screenH, insets.top, insets.bottom, uiScale]);
  const isDevMarketEnabled = DEV_MODE || IS_BETA_TESTER;
  /** На хаб карток (або pop у стеку), а не на головне меню — зручніше при відкритті з підбірки / набору. */
  const leaveCollection = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/flashcards' as any);
    }
  }, [router]);

  // ── State ──────────────────────────────────────────────────────────────────
  /** `?pack=` без `cat` — одразу «Власні» (набір), не кадр з «Збережені» до завантаження маркету. */
  const [activeCat, setActiveCat] = useState<CategoryId>(() => {
    const rc = normalizeRouteCategory(params.cat);
    if (rc) return rc;
    if (normalizePackParam(params.pack)) return 'custom';
    return 'saved';
  });

  useEffect(() => {
    const raw = Array.isArray(params.cat) ? params.cat[0] : params.cat;
    if (typeof raw === 'string' && raw.length > 0 && !CATEGORIES.some((c) => c.id === raw)) {
      if (packDeeplink) return;
      router.replace('/flashcards' as any);
    }
  }, [params.cat, packDeeplink, router]);

  useEffect(() => {
    if (routeCat) setActiveCat(routeCat);
  }, [routeCat]);
  const [activeFilter, setActiveFilter]   = useState<string>('all');
  const [filterOpen, setFilterOpen]       = useState(false);
  // E11: режим просмотра «Список / Колода» (персист fc_collection_view_v1)
  const [viewMode, setViewMode] = useState<FcCollectionViewMode>('list');
  useEffect(() => {
    let mounted = true;
    getCollectionViewMode().then((m) => { if (mounted) setViewMode(m); });
    return () => { mounted = false; };
  }, []);
  const toggleViewMode = useCallback(() => {
    fcHaptic('tap');
    setViewMode((prev) => {
      const next: FcCollectionViewMode = prev === 'list' ? 'deck' : 'list';
      setCollectionViewMode(next);
      return next;
    });
  }, []);
  const exitDeckToList = useCallback(() => {
    setViewMode('list');
    setCollectionViewMode('list');
  }, []);
  // E11: поиск (debounce 200мс, по загруженному массиву, все вкладки — §3.2)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const tm = setTimeout(() => setSearchQuery(searchInput), FC_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tm);
  }, [searchInput]);

  const { isPremium } = usePremium();
  // E13: карта «силы слова» (active_recall_items + trainer_store_v1) — только чтение
  const [strengthMap, setStrengthMap] = useState<WordStrengthMap | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadWordStrengthMap().then((m) => {
        if (!cancelled) setStrengthMap(m);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  const strengthForCard = useCallback(
    (en: string): WordStrength | null => strengthFor(en, strengthMap),
    [strengthMap],
  );
  /** Фокус-строка списка через SharedValue — смена видимой карточки не вызывает setState родителя. */
  const focusedIndexSV = useSharedValue(0);
  const indexRef = useRef(0);
  const pendingRestoreRef = useRef<{ cat: CategoryId; idx: number } | null>(null);
  const [showDeleteHint, setShowDeleteHint] = useState(false);
  const { registerFlashcardViewed, trackCardFlip, resetSession } = useFlashcardViewTracking();

  // ── Data (E11: вынесено в useCollectionData) ───────────────────────────────
  const onLoaded = useCallback((info: CollectionLoadedInfo) => {
    applyPostLoadNavigation(info, {
      isDevMarketEnabled,
      routeCat: routeCatRef.current,
      packDeeplink: packRouteRef.current,
      pendingRestoreRef,
      setActiveCat,
      setCustomCatParam: () => router.setParams({ cat: 'custom' } as any),
      setShowDeleteHint,
    });
  }, [isDevMarketEnabled, router]);

  const {
    savedCards, customCards, marketCards, marketPackCatalog, setMarketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId,
    collectionDataReady, loading, loadError, loadAll,
    updateSavedCards, updateCustomCards,
  } = useCollectionData({ isDevMarketEnabled, onLoaded });

  useFocusEffect(
    useCallback(() => {
      resetSession();
      let cancelled = false;
      const run = () => {
        if (!cancelled) void loadAll();
      };
      /** `?pack=` — без відкладення після анімацій: інакше один-два кадри з порожнім списком. */
      if (packDeeplink || Platform.OS === 'web') {
        /** web: InteractionManager may never flush in headless/browser — run directly. */
        run();
      } else {
        InteractionManager.runAfterInteractions(run);
      }
      return () => {
        cancelled = true;
      };
    }, [loadAll, packDeeplink, resetSession]),
  );

  // Deep link /flashcards_collection?pack=… — доступ: куплено, автор UGC, або картки вже підготовлені в хабі (staging).
  usePackDeeplinkGuard({
    collectionDataReady,
    packDeeplink,
    marketPackCatalog,
    ownedPackIdList,
    communityOwnedIdList,
    accessStableId,
    onDenied: () => router.replace('/flashcards' as any),
  });

  // ── Derived: категория → фильтр → поиск → free-limit (E11: хук) ────────────
  const { cards, filteredCards, listCards, hiddenByLimitCount } = useDerivedCollectionCards({
    activeCat, packDeeplink, savedCards, customCards, marketCards,
    systemCards: SYSTEM_CARDS, activeFilter, searchQuery, isPremium,
  });

  /** Куплені набори (`sourceId` = `DEV:…`) — без CTA «додати свою картку». */
  const allowAddCustomCard = useMemo(() => {
    if (packDeeplink) return false;
    if (activeFilter.startsWith('lesson:')) {
      const sourceId = activeFilter.slice(7);
      if (sourceId.startsWith('DEV:')) return false;
    }
    return true;
  }, [packDeeplink, activeFilter]);

  /** Куплений набір з маркету — преміальний декор як у paywall (E11: хук). */
  const { currentMarketPack, packPremiumVisual, packCardTheme } = usePackBrowseVisual({
    packDeeplink,
    activeFilter,
    marketPackCatalog,
    themeMode,
    isLightTheme,
    bgCard: t.bgCard,
    bgSurface: t.bgSurface,
  });

  // ── Category / data / pack: filter + позиция ───────────────────────────────
  const persistProgressRef = useRef<(idx: number) => void>(() => {});
  persistProgressRef.current = (idx: number) => {
    if (loading) return;
    writeFlashcardsProgress({ cat: activeCat, idx }).catch(() => {});
  };
  useEffect(() => {
    const packFilter =
      packDeeplink && activeCat === 'custom' ? (`lesson:DEV:${packDeeplink}` as const) : null;
    if (
      packFilter &&
      cards.some((c) => c.source === 'lesson' && c.sourceId === `DEV:${packDeeplink}`)
    ) {
      setActiveFilter(packFilter);
    } else {
      setActiveFilter('all');
    }
    const restore = pendingRestoreRef.current;
    let idx = 0;
    if (restore && restore.cat === activeCat) {
      idx = Math.min(restore.idx, Math.max(0, cards.length - 1));
      pendingRestoreRef.current = null;
    }
    indexRef.current = idx;
    focusedIndexSV.value = idx;
    persistProgressRef.current(idx);
  }, [activeCat, cards, packDeeplink, focusedIndexSV]);

  // ── User changed filter/search: go to first card
  useEffect(() => {
    indexRef.current = 0;
    focusedIndexSV.value = 0;
  }, [activeFilter, searchQuery, focusedIndexSV]);

  const onFocusedIndexChanged = useCallback((idx: number) => {
    indexRef.current = idx;
    focusedIndexSV.value = idx;
    persistProgressRef.current(idx);
  }, [focusedIndexSV]);

  /** Смена верхней карточки в «Колоде»: позиция + трекинг просмотра. */
  const onDeckIndexChanged = useCallback((idx: number, cardId: string) => {
    onFocusedIndexChanged(idx);
    registerFlashcardViewed([cardId]);
  }, [onFocusedIndexChanged, registerFlashcardViewed]);

  // ── E7/E11: удаление + undo (вынесено в useCollectionDeletion) ─────────────
  const onIndexClamped = useCallback((idx: number) => {
    indexRef.current = idx;
    focusedIndexSV.value = idx;
  }, [focusedIndexSV]);
  const { undoEntry, deleteCardById, undoDelete } = useCollectionDeletion({
    cards, customCards, savedCards, updateCustomCards, updateSavedCards,
    currentIndexRef: indexRef, onIndexClamped,
  });

  // ── Filter options ─────────────────────────────────────────────────────────
  const filterGroups: FilterGroup[] = useMemo(
    () => buildFilterGroups(cards, activeCat, strLang),
    [cards, activeCat, strLang],
  );
  const filterOptions: { key: string; label: string }[] = useMemo(
    () => buildFilterOptions(filterGroups, strLang),
    [filterGroups, strLang],
  );

  const onCommunityRatingUpdated = useCallback(
    (avg: number, count: number) => {
      if (!packDeeplink) return;
      setMarketPackCatalog((prev) => prev.map((p) => (p.id === packDeeplink ? { ...p, ratingAvg: avg, ratingCount: count } : p)));
    },
    [packDeeplink, setMarketPackCatalog],
  );

  // ── Стабилизированные пропсы view ──────────────────────────────────────────
  const sourceLabels = s.source as Record<string, string>;
  const voiceLabel = useMemo(
    () => triLang(lang, { ru: 'Озвучить', uk: 'Озвучити', es: 'Escuchar' }),
    [lang],
  );
  const onSpeakCb = useCallback(
    (text: string, opts?: SpeakOpts) => speakAudio(text, undefined, opts),
    [speakAudio],
  );
  const openPremiumLimit = useCallback(() => {
    router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', saved: String(savedCards.length) } } as any);
  }, [router, savedCards.length]);

  // ── E7: входы в редактор (create/edit) — отдельный экран flashcards_card_editor ──
  const openCreateEditor = useCallback(() => {
    router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any);
  }, [router]);
  /** Легаси-диплинк `?create=1` (старый inline-флоу) → сразу в редактор, один раз. */
  const consumedCreateParamRef = useRef(false);
  useEffect(() => {
    const raw = Array.isArray(params.create) ? params.create[0] : params.create;
    if (raw === '1' && !consumedCreateParamRef.current) {
      consumedCreateParamRef.current = true;
      openCreateEditor();
    }
  }, [params.create, openCreateEditor]);
  const openEditEditor = useCallback(
    (item: CardItem) => {
      router.push({ pathname: '/flashcards_card_editor', params: { id: item.id } } as any);
    },
    [router],
  );
  const editLabel = useMemo(
    () => triLang(lang, { ru: 'Редактировать', uk: 'Редагувати', es: 'Editar' }),
    [lang],
  );
  /** Кастомная карточка юзера (не купленный пак): редактируемая. */
  const isEditableCustomCard = useCallback(
    (item: CardItem) =>
      item.categoryId === 'custom' &&
      !item.isSystem &&
      !packDeeplink &&
      !String(item.sourceId ?? '').startsWith('DEV:'),
    [packDeeplink],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (filterOpen) {
        setFilterOpen(false);
        return true;
      }
      if (viewMode === 'deck') {
        exitDeckToList();
        return true;
      }
      leaveCollection();
      return true;
    });
    return () => sub.remove();
  }, [filterOpen, viewMode, exitDeckToList, leaveCollection]);

  // ── E8: «Тренировать эту колоду» — words-сессия тренера с ?deck=… (§3.7) ──
  /** deckId текущей колоды: сохранённые / свои карточки / купленный набор. */
  const trainDeckId = useMemo((): string | null => {
    if (packDeeplink) return `pack:${packDeeplink}`;
    // Просмотр купленного набора через фильтр (без ?pack=) — тоже тренируем набор
    if (activeFilter.startsWith('lesson:DEV:')) return `pack:${activeFilter.slice('lesson:DEV:'.length)}`;
    if (activeCat === 'saved') return 'saved';
    if (activeCat === 'custom') return 'custom';
    return null;
  }, [packDeeplink, activeFilter, activeCat]);

  const startDeckSession = useCallback((mode: 'trainer' | 'listening') => {
    if (!trainDeckId) return;
    fcHaptic('tap');
    void (async () => {
      // Размер сессии — из последнего пресета (fc_mode_prefs_v1), дефолт 15 (§3.5)
      const preset = await getLastPreset(mode).catch(() => null);
      const size = preset?.size ?? FC_DEFAULT_SESSION_SIZE;
      router.push({
        pathname: mode === 'trainer' ? '/trainer_words_session' : '/flashcards_listening_session',
        params: { deck: trainDeckId, size: String(size) },
      } as any);
    })();
  }, [trainDeckId, router]);
  const startDeckTraining = useCallback(() => startDeckSession('trainer'), [startDeckSession]);
  const startDeckListening = useCallback(() => startDeckSession('listening'), [startDeckSession]);

  /** Нижняя закреплённая панель тренировки — только когда в колоде есть карточки. */
  const trainPanelVisible = trainDeckId !== null && !loading && filteredCards.length > 0;

  const searchActive = searchQuery.trim().length > 0;
  const isEmpty = !loading && filteredCards.length === 0;
  const openDevMarket = useCallback(() => router.push('/flashcards_market_dev' as any), [router]);

  return (
    <ScreenGradient>
    <SafeAreaView style={[st.safe, { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        <CollectionHeader
          t={t}
          f={f}
          lang={lang}
          activeCat={activeCat}
          packDeeplink={packDeeplink}
          marketPackCatalog={marketPackCatalog}
          fallbackTitle={s.title}
          onBack={leaveCollection}
          isDevMarketEnabled={isDevMarketEnabled}
          onOpenDevMarket={openDevMarket}
          showViewToggle={!isEmpty}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          filterGroups={filterGroups}
          filterOptions={filterOptions}
          activeFilter={activeFilter}
          filterOpen={filterOpen}
          onToggleFilterOpen={() => setFilterOpen((o) => !o)}
          showSearch={!(isEmpty && !searchActive)}
          searchInput={searchInput}
          searchActive={searchActive}
          onSearchInput={setSearchInput}
        />

        {packDeeplink &&
        currentMarketPack?.isCommunityUgc &&
        communityOwnedIdList.includes(packDeeplink) &&
        CLOUD_SYNC_ENABLED &&
        !IS_EXPO_GO &&
        isCommunityPacksCloudEnabled() ? (
          <CommunityPackRatingBar
            packId={packDeeplink}
            lang={strLang}
            t={t}
            catalogRatingAvg={currentMarketPack.ratingAvg}
            catalogRatingCount={currentMarketPack.ratingCount}
            onAggregateUpdated={onCommunityRatingUpdated}
          />
        ) : null}

        {isEmpty ? (
          <ContentWrap>
            <CollectionEmptyState
              activeCat={activeCat}
              lang={lang}
              t={t}
              f={f}
              emptyTitle={s.empty}
              emptySub={s.emptySub}
              loadError={loadError}
              allowAddCustomCard={allowAddCustomCard}
              showCreatePackButton={CLOUD_SYNC_ENABLED && !IS_EXPO_GO}
              onLeave={leaveCollection}
              onRetry={loadAll}
              onCreateCard={openCreateEditor}
              onCreatePack={() => router.push('/community_pack_create' as any)}
            />
          </ContentWrap>
        ) : viewMode === 'deck' ? (
          <CollectionDeckView
            cards={listCards}
            initialIndex={indexRef.current}
            lang={lang}
            cardContentLang={cardContentLang}
            t={t}
            f={f}
            packCardTheme={packCardTheme}
            onSpeak={onSpeakCb}
            onIndexChanged={onDeckIndexChanged}
            onFlipTracked={trackCardFlip}
            onExitToList={exitDeckToList}
            strengthForCard={strengthForCard}
          />
        ) : (
          <CollectionListView
            cards={listCards}
            hiddenByLimitCount={hiddenByLimitCount}
            activeCat={activeCat}
            packDeeplink={packDeeplink}
            lang={lang}
            cardContentLang={cardContentLang}
            t={t}
            f={f}
            sourceLabels={sourceLabels}
            deleteLabel={s.delete}
            voiceLabel={voiceLabel}
            editLabel={editLabel}
            cardHeight={CARD_H}
            peek={PEEK}
            packCardTheme={packCardTheme}
            packEnterAnimation={!!packPremiumVisual}
            focusedIndexSV={focusedIndexSV}
            searchActive={searchActive}
            showDeleteHint={showDeleteHint}
            onSetShowDeleteHint={setShowDeleteHint}
            allowAddCustomCard={allowAddCustomCard}
            onCreateCard={openCreateEditor}
            onSpeak={onSpeakCb}
            onEditCard={openEditEditor}
            isEditableCustomCard={isEditableCustomCard}
            onDeleteCardById={deleteCardById}
            onOpenPremiumLimit={openPremiumLimit}
            onFocusedIndexChanged={onFocusedIndexChanged}
            onCardsViewed={registerFlashcardViewed}
            onFlipTracked={trackCardFlip}
            trainPanelVisible={trainPanelVisible}
            onTrainDeck={startDeckTraining}
            onListenDeck={startDeckListening}
            strengthForCard={strengthForCard}
          />
        )}

      {isDevMarketEnabled && (
        <DevMarketFab
          t={t}
          f={f}
          bottomOffset={Math.max(insets.bottom, 8) + 20}
          onPress={openDevMarket}
        />
      )}

      {undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={Math.max(insets.bottom, 8) + 14 + (trainPanelVisible && viewMode === 'list' && !isEmpty ? 66 : 0)}
          lang={lang}
          t={t}
          f={f}
          onUndo={undoDelete}
        />
      )}

      <FlashcardsFilterDropdown
        visible={filterOpen}
        lang={strLang}
        activeFilter={activeFilter}
        filterGroups={filterGroups}
        t={t}
        f={f}
        onClose={() => setFilterOpen(false)}
        onSelect={(key) => {
          setActiveFilter(key);
          setFilterOpen(false);
        }}
      />

    </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1 },
});
