import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * cards-2.0 (E11): контейнер коллекции — загрузка данных (useCollectionData),
 * фильтр/поиск, роутинг режимов «Список / Стопка», delete+undo-пайплайн, модалки.
 * View-режимы вынесены: CollectionListView (список) и CollectionDeckView (стопка карточек);
 * шапка — CollectionHeader; хуки данных/удаления/трекинга — useCollectionData.
 */
import { CLOUD_SYNC_ENABLED, DEV_CONTENT_UNLOCK, IS_EXPO_GO } from './config';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSharedValue } from 'react-native-reanimated';
import { usePremium } from '../components/PremiumContext';
import { useAudio, type SpeakOpts } from '../hooks/use-audio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  InteractionManager,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
import { actionToastTri, emitAppEvent } from './events';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { CATEGORIES, STR } from './flashcards/constants';
import { SYSTEM_CARDS } from './flashcards/system-cards';
import { CardItem, CategoryId } from './flashcards/types';
import { writeFlashcardsProgress } from './flashcards/storage';
// E8: быстрый старт — размер сессии из последнего пресета (fc_mode_prefs_v1)
import { fcHaptic } from './flashcards/SoundService';
import { buildFilterGroups, buildFilterOptions, FilterGroup } from './flashcards/selectors';
import FlashcardsFilterDropdown from './flashcards/FlashcardsFilterDropdown';
import CollectionHeader from './flashcards/CollectionHeader';
import CollectionListView, {
  CollectionEmptyState,
  UndoDeleteSnackbar,
} from './flashcards/CollectionListView';
import { resolveFlashcardListItemHeight } from './flashcards/FlashcardListItemChrome';
// Cards 2.1 §5.2: нижний таббар раздела (Тренировка / + / Наборы)
import FlashcardsTabBar, { FC_TABBAR_HEIGHT, useFcTabBarScroll } from './flashcards/FlashcardsTabBar';
// §5.3: два входа в набор — «Мои наборы» и каталог сообщества; «назад» ведёт ровно туда
import {
  FC_MY_PACKS_ROUTE,
  FC_PACKS_ROUTE,
  shouldBypassEmptyCustomCollection,
} from './flashcards/tabbar_state';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
import ReportPackModal from '../components/ReportPackModal';
import { packTitleForInterface } from './flashcards/marketplace';
import { publishLocalAuthorPack } from './community_packs/publishLocalPack';
import CollectionDeckView from './flashcards/CollectionDeckView';
// Витрина «Лучшее у сообщества» — три топ-набора над сохранёнными (владелец, 2026-08-29)
import SavedTopCommunityPacks from './flashcards/SavedTopCommunityPacks';
import { stageCommunityPackCardsForNavigation } from './community_packs/staging';
import type { FlashcardMarketPack } from './flashcards/marketplace';
// E13: «сила слова» — точки из новой проекции ошибок (§2).
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
import { isCommunityPacksCloudEnabled } from './community_packs/functionsClient';
import { flashcardContentLang } from './spanish_content_gate';
// E11: данные/удаление/трекинг/пак-декор вынесены из монолита в хуки
import {
  applyPostLoadNavigation,
  useCollectionData,
  useCollectionDeletion,
  primeFlashcardsCollectionCache,
  useDerivedCollectionCards,
  useFlashcardViewTracking,
  usePackBrowseVisual,
  usePackDeeplinkGuard,
  type CollectionLoadedInfo,
} from './flashcards/useCollectionData';
import { DebugLogger } from './debug-logger';

/** E11 (§3.2): debounce строки поиска. */
const FC_SEARCH_DEBOUNCE_MS = 200;

function normalizeRouteCategory(cat: string | string[] | undefined): CategoryId | null {
  const raw = Array.isArray(cat) ? cat[0] : cat;
  if (!raw || typeof raw !== 'string') return null;
  const known = CATEGORIES.some((c) => c.id === raw);
  return known ? (raw as CategoryId) : null;
}

function normalizePackParam(pack: string | string[] | undefined): string | null {
  const raw = Array.isArray(pack) ? pack[0] : pack;
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
/** Плановые локали: полное имя категории без ru/uk/es-тернаров. */
export function fullCategoryLabelForLang(cat: (typeof CATEGORIES)[number], lang: Lang): string {
  const labels: Record<Lang, string> = {
    ru: cat.fullLabelRU,
    uk: cat.fullLabelUK,
    en: cat.fullLabelRU,
    es: cat.fullLabelES,
    'pt-BR': cat.fullLabelPtBr,
    vi: cat.fullLabelVi,
    id: cat.fullLabelId,
    tr: cat.fullLabelTr,
    pl: cat.fullLabelPl,
  };
  return labels[lang];
}

export type FlashcardsCollectionScreenProps = {
  /**
   * Cards 2.1 §5.1: экран открыт как КОРЕНЬ раздела «Карточки» (`/flashcards`) —
   * сразу сохранённые карточки с поиском и фильтром. В этом режиме снизу
   * закреплён таббар раздела (§5.2), а кнопки «Слушать» / «Тренировать»
   * не дублируются (их роль берёт левая позиция таббара).
   */
  sectionRoot?: boolean;
};

export default function FlashcardsScreen({ sectionRoot = false }: FlashcardsCollectionScreenProps = {}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode, statusBarLight, uiScale } = useTheme();
  const isLightTheme = isLightThemeMode(themeMode);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (Apple 1.2, UGC): пожаловаться на чужой набор можно было только
  // в каталоге долгим тапом по плитке. На самой странице набора — там, где
  // человек и читает чужие карточки, — жалобы не было вовсе.
  const [packReportOpen, setPackReportOpen] = useState(false);
  // зачем: strLang — интерфейсный язык (UI-текст STR/фильтры), НЕ путать
  // с cardContentLang ниже — тот сужен до контентных 8 локалей (карточки
  // без английского source). Раньше оба указывали на один и тот же lang,
  // что было безопасно только пока Lang = 8 языков; после расширения на en
  // разделены явно (краш Студии аватаров 2026-08-27 — тот же класс бага).
  const strLang: Lang = lang;
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const router   = useRouter();
  const params   = useLocalSearchParams<{ cat?: string; pack?: string; create?: string; widgetCard?: string; preview?: string; from?: string }>();
  const routeCat = useMemo(() => normalizeRouteCategory(params.cat), [params.cat]);
  const packDeeplink = useMemo(() => normalizePackParam(params.pack), [params.pack]);
  const routeCatRef = useRef<CategoryId | null>(null);
  routeCatRef.current = routeCat;
  const packRouteRef = useRef<string | null>(null);
  packRouteRef.current = packDeeplink;
  /**
   * `?preview=1` — набор сообщества открыт ДО добавления себе: карточки видно,
   * тренировать/слушать/редактировать нельзя, наверху — «Добавить себе» и лайк.
   */
  const previewRequested = useMemo(() => {
    const raw = Array.isArray(params.preview) ? params.preview[0] : params.preview;
    return raw === '1' && !!packDeeplink;
  }, [params.preview, packDeeplink]);
  const previewRequestedRef = useRef(false);
  previewRequestedRef.current = previewRequested;

  const s        = STR[strLang] ?? STR.ru;
  const insets   = useStableSafeAreaInsets();
  /** Ограничение ширины контента на планшетах — как в ContentWrap, но без flex. */
  const { contentMaxW } = useScreen();
  const { height: screenH, width: winW } = useWindowDimensions();
  const { CARD_H, PEEK } = useMemo(() => {
    /** Компактніша висота картки: раніше max 280px / ~52% екрана було зайвим. × uiScale — узгоджено з темою. */
    const cardH = resolveFlashcardListItemHeight(
      screenH,
      insets.top,
      insets.bottom,
      uiScale,
    );
    const peek = Math.max(30, Math.round(cardH * 0.19));
    return { CARD_H: cardH, PEEK: peek };
  }, [screenH, insets.top, insets.bottom, uiScale]);
  /**
   * DEV-«магазин наборов» больше НЕ имеет входа из раздела карточек (решение владельца
   * 2026-08-13): флаг остался только для восстановления активного DEV-набора при заходе
   * по прямому роуту и погашен store-предохранителем.
   */
  const isDevMarketEnabled = DEV_CONTENT_UNLOCK;
  /**
   * Откуда открыт набор: `?from=mine` — «Мои наборы», каталог сообщества —
   * `?from=community` или режим просмотра (`?preview=1` ставит только каталог).
   */
  const packBackOrigin = useMemo((): string | null => {
    if (!packDeeplink) return null;
    const raw = Array.isArray(params.from) ? params.from[0] : params.from;
    if (raw === 'mine') return FC_MY_PACKS_ROUTE;
    if (raw === 'community' || previewRequested) return FC_PACKS_ROUTE;
    return null;
  }, [packDeeplink, params.from, previewRequested]);

  /**
   * Pop у стеку; фолбек — корінь розділу («Збережені»), а з самого кореня — головне меню
   * (інакше `replace('/flashcards')` із `/flashcards` замкнуло б екран на собі).
   *
   * Набор (замечание владельца, 2026-08-13: «назад» из набора вело на промежуточный
   * экран): возврат идёт РОВНО туда, откуда набор открыли. `dismissTo` — нативный
   * POP_TO: он снимает всё, что успело оказаться между каталогом/«Моими наборами»
   * и набором, поэтому промежуточных остановок не остаётся.
   */
  const leaveCollection = useCallback(() => {
    const canGoBack = typeof router.canGoBack === 'function' && router.canGoBack();
    if (packBackOrigin && canGoBack && typeof router.dismissTo === 'function') {
      try {
        // зачем (баг «второй „назад“ снова открывает тот же набор»): dismissTo — это
        // POP_TO в обход navigation_back.ts, а его JS-модель стека (navigationStack)
        // узнаёт о новом пути только из rememberNavigationPath в _layout.tsx. Без этого
        // флага rememberEntry считает переход обычным push и КЛАДЁТ каталог поверх ещё
        // не снятой записи набора — второй safeRouterBack всплывал обратно на набор.
        markNextNavigationAsReplace();
        router.dismissTo(packBackOrigin as any);
        return;
      } catch (e) {
      // нет такого экрана в стеке — обычный back ниже
      DebugLogger.error('flashcards_collection:canGoBack', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    }
    /**
     * зачем (владелец, 2026-08-16): у этой кнопки ДВА разных смысла, и их нельзя
     * сводить к одному фолбеку.
     *
     *  • открыт НАБОР — кнопка ведёт к выбору наборов. Прямой заход (диплинк,
     *    плитка категории) не несёт `?from=`, поэтому packBackOrigin пуст; без
     *    этой ветки набор выбрасывал на главную мимо выбора (репорт владельца
     *    «кнопка к выбору категорий ведёт на главную»);
     *  • открыт КОРЕНЬ раздела (сохранённые карточки) — выход наружу, на главную.
     *    Фолбек '/flashcards' здесь замкнул бы экран сам на себя.
     */
    const backTarget = packBackOrigin ?? (packDeeplink ? FC_MY_PACKS_ROUTE : '/(tabs)/home');
    safeRouterBack(router, backTarget as any);
  }, [router, packBackOrigin, packDeeplink]);

  /**
   * зачем (владелец, 2026-08-16): из ПУСТОЙ коллекции нужен путь туда, где берут
   * карточки, — в наборы сообщества. Раньше эта кнопка звала leaveCollection и
   * выбрасывала на главную. Это соседняя позиция таббара карточек, поэтому
   * replace: стек раздела не должен расти (см. FlashcardsTabBar.go).
   */
  const openCommunityPacks = useCallback(() => {
    markNextNavigationAsReplace();
    router.replace(FC_PACKS_ROUTE as any);
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
  // E11: режим просмотра «Список / Стопка» (персист fc_collection_view_v1)
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
  const searchActive = searchQuery.trim().length > 0;

  /** Один контракт для стрелки и Android Back: сначала закрываем локальный слой. */
  const handleCollectionBack = useCallback(() => {
    if (filterOpen) {
      setFilterOpen(false);
      return;
    }
    if (searchInput.length > 0 || searchActive) {
      setSearchInput('');
      setSearchQuery('');
      return;
    }
    if (viewMode === 'deck') {
      exitDeckToList();
      return;
    }
    leaveCollection();
  }, [exitDeckToList, filterOpen, leaveCollection, searchActive, searchInput, viewMode]);

  // зачем (расследование 2026-08-28, жалоба Виталия/«Марс»: «есть Premium, а
  // лимит сохранённых всё равно показывает 20 из 20»): isPremium — узкое поле
  // (подтверждённая покупка через RevenueCat), а VIP/admin-override доступ
  // (his premium_plan='annual', vip_active=true, admin_premium_override=true)
  // в него НЕ попадает — только в hasPremiumAccess. Весь остальной проект
  // (FlashcardsTabBar и другие 13 экранов) уже гейтит по hasPremiumAccess;
  // этот файл был единственным исключением.
  const { hasPremiumAccess: isPremium } = usePremium();
  // Карта «силы слова» строится из проекции нового журнала ошибок.
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
      // Корень раздела всегда открывает «Сохранённые»: восстановление старой
      // пустой custom-вкладки и создавало удалённый промежуточный экран.
      routeCat: sectionRoot ? 'saved' : routeCatRef.current,
      packDeeplink: packRouteRef.current,
      pendingRestoreRef,
      setActiveCat,
      setCustomCatParam: () => router.setParams({ cat: 'custom' } as any),
      setShowDeleteHint,
      previewMode: previewRequestedRef.current,
    });
  }, [isDevMarketEnabled, router, sectionRoot]);

  const {
    savedCards, customCards, marketCards, marketPackCatalog, setMarketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId,
    collectionDataReady, loading, loadError, loadAll,
    updateSavedCards, updateCustomCards,
  } = useCollectionData({
    isDevMarketEnabled,
    onLoaded,
    previewPackId: previewRequested ? packDeeplink : null,
    deeplinkPackId: packDeeplink,
  });

  /**
   * зачем (владелец, 2026-08-16): «все разделы должны быть уже загружены, когда
   * открываем карточки». Корень раздела греет общий кэш подразделов — тогда
   * «Мои наборы» / «Наборы сообщества» открываются готовыми, а не рисуют сначала
   * пустое состояние. Прогрев идёт мимо первого кадра (после интеракций) и
   * кэшируется в модуле, поэтому вход в раздел за него не платит.
   */
  useEffect(() => {
    if (!sectionRoot) return;
    const task = InteractionManager.runAfterInteractions(() => {
      primeFlashcardsCollectionCache(studyTarget);
    });
    return () => task.cancel();
  }, [sectionRoot, studyTarget]);

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
    previewMode: previewRequested,
    /** Нет доступа — возвращаем туда, откуда пришли, а не на «Сохранённые». */
    onDenied: () => leaveCollection(),
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
  persistProgressRef.current = (index: number) => {
    if (loading) return;
    // Изоляция целей обучения: позиция сохраняется в хранилище текущей цели.
    writeFlashcardsProgress({ cat: activeCat, idx: index }, studyTarget).catch(() => {});
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

  /** Смена верхней карточки в «Стопке»: позиция + трекинг просмотра. */
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
    () => triLang(lang, {
      ru: 'Озвучить', uk: 'Озвучити', en: 'Listen', es: 'Escuchar',
      'pt-BR': 'Ouvir', vi: 'Phát âm', id: 'Putar', tr: 'Seslendir', pl: 'Odtwórz',
    }),
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
    () => triLang(lang, {
      ru: 'Редактировать', uk: 'Редагувати', en: 'Edit', es: 'Editar',
      'pt-BR': 'Editar', vi: 'Chỉnh sửa', id: 'Edit', tr: 'Düzenle', pl: 'Edytuj',
    }),
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
      handleCollectionBack();
      return true;
    });
    return () => sub.remove();
  }, [handleCollectionBack]);

  // «Тренировать этот набор» использует обычный живой режим карточек.
  /** deckId текущего набора: сохранённые / свои карточки / добавленный набор. */
  const trainDeckId = useMemo((): string | null => {
    if (packDeeplink) return `pack:${packDeeplink}`;
    // Просмотр купленного набора через фильтр (без ?pack=) — тоже тренируем набор
    if (activeFilter.startsWith('lesson:DEV:')) return `pack:${activeFilter.slice('lesson:DEV:'.length)}`;
    if (activeCat === 'saved') return 'saved';
    if (activeCat === 'custom') return 'custom';
    return null;
  }, [packDeeplink, activeFilter, activeCat]);

  /** Набор уже у пользователя (куплен / добавлен / он его автор). */
  const packOwnedByMe = useMemo(() => {
    if (!packDeeplink) return false;
    if (ownedPackIdList.includes(packDeeplink) || communityOwnedIdList.includes(packDeeplink)) return true;
    return (
      !!currentMarketPack?.isCommunityUgc &&
      !!currentMarketPack.authorStableId &&
      !!accessStableId &&
      currentMarketPack.authorStableId === accessStableId
    );
  }, [packDeeplink, ownedPackIdList, communityOwnedIdList, currentMarketPack, accessStableId]);

  /** Публичный staged-снимок — только render input, не разрешение на тренировку. */
  const packTrainingAccessReady = !packDeeplink || (collectionDataReady && packOwnedByMe);

  const startDeckSession = useCallback((mode: 'blitz' | 'listening') => {
    if (!trainDeckId || !packTrainingAccessReady) return;
    fcHaptic('tap');
    router.push({
      pathname: mode === 'blitz' ? '/flashcards_blitz_session' : '/flashcards_listening_session',
      params: { deck: trainDeckId, ...(mode === 'listening' ? { size: 'preset' } : {}) },
    } as any);
  }, [packTrainingAccessReady, trainDeckId, router]);
  const startDeckTraining = useCallback(() => startDeckSession('blitz'), [startDeckSession]);
  const startDeckListening = useCallback(() => startDeckSession('listening'), [startDeckSession]);

  /** Только просмотр: набор открыт из каталога и ещё не добавлен себе. */
  const previewMode = previewRequested && !packOwnedByMe;

  /* ── Витрина «Лучшее у сообщества» (владелец, 2026-08-29) ──────────────────
   *
   * Три самых залайканных набора сообщества стоят НАД списком сохранённых
   * карточек, и добавить их можно прямо оттуда. Раздел «Наборы сообщества»
   * не изменён — это дополнительный вход, а не замена.
   *
   * Живёт ТОЛЬКО в корне раздела на сохранённых: на экране конкретного набора,
   * в «Своих карточках» и в режиме просмотра витрине не место.
   *
   * Firebase: 0 дополнительных чтений — `marketPackCatalog` этот экран уже грузит.
   */
  const [topPackOpeningId, setTopPackOpeningId] = useState<string | null>(null);
  const topPackOpeningRef = useRef<string | null>(null);
  const showSavedTopPacks =
    sectionRoot && !packDeeplink && !previewMode && activeCat === 'saved' && !searchActive;

  /** Тап по плитке — открыть набор в режиме просмотра, как в каталоге. */
  const openTopCommunityPack = useCallback(
    (pack: FlashcardMarketPack) => {
      if (topPackOpeningRef.current) return;
      topPackOpeningRef.current = pack.id;
      setTopPackOpeningId(pack.id);
      void (async () => {
        const cards = await stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack);
        /** Поздний ответ не должен трогать чужое состояние (гонка двойного тапа). */
        if (topPackOpeningRef.current !== pack.id) return;
        topPackOpeningRef.current = null;
        setTopPackOpeningId(null);
        if (cards.length === 0) {
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
            uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
            es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível carregar o pacote. Verifique a internet e tente novamente.',
            vi: 'Không thể tải bộ thẻ. Hãy kiểm tra mạng và thử lại.',
            id: 'Paket tidak dapat dimuat. Periksa internet lalu coba lagi.',
            tr: 'Paket yüklenemedi. İnternetini kontrol edip tekrar dene.',
            pl: 'Nie udało się wczytać zestawu. Sprawdź internet i spróbuj ponownie.',
          }));
          return;
        }
        router.push({
          pathname: '/flashcards_collection',
          params: { pack: pack.id, preview: '1' },
        } as never);
      })();
    },
    [router, studyTarget],
  );

  /**
   * Набор добавлен с витрины: галочка на плитке уже стоит (optimistic внутри
   * плитки), здесь догоняем содержимое экрана — карточки набора должны появиться
   * в списке сохранённых без перезахода.
   */
  const onTopCommunityPackAdded = useCallback(() => {
    void loadAll();
  }, [loadAll]);

  const savedTopPacksHeader = useMemo(() => {
    if (!showSavedTopPacks) return null;
    return (
      <SavedTopCommunityPacks
        catalog={marketPackCatalog}
        ownedCommunityPackIds={communityOwnedIdList}
        lang={lang}
        t={t}
        contentWidth={Math.min(contentMaxW, winW - 32)}
        studyTarget={studyTarget}
        openingPackId={topPackOpeningId}
        onOpenPreview={openTopCommunityPack}
        onAdded={onTopCommunityPackAdded}
      />
    );
  }, [
    showSavedTopPacks, marketPackCatalog, communityOwnedIdList, lang, t,
    contentMaxW, winW, studyTarget, topPackOpeningId, openTopCommunityPack, onTopCommunityPackAdded,
  ]);

  /**
   * «Слушать» / «Тренировать» — компактными иконками ВВЕРХУ экрана (замечание
   * владельца: раньше это были широкие кнопки с текстом внизу). В корне раздела
   * их роль берёт таббар, в режиме просмотра тренировка недоступна.
   */
  const showModeButtons =
    !sectionRoot && !previewMode && packTrainingAccessReady && trainDeckId !== null
    && !loading && filteredCards.length > 0;

  /**
   * «Сделать публичным»: своя коллекция, которая ещё живёт только на устройстве.
   * Уже опубликованный / отправленный набор кнопку не показывает.
   */
  const [publishBusy, setPublishBusy] = useState(false);
  /** Заявка уже ушла в этой сессии — второй раз кнопку не показываем. */
  const [publishSubmitted, setPublishSubmitted] = useState(false);
  useEffect(() => { setPublishSubmitted(false); }, [packDeeplink]);
  const showPublishButton =
    !!packDeeplink &&
    !previewMode &&
    !publishSubmitted &&
    !!currentMarketPack?.isCommunityUgc &&
    currentMarketPack.listingStatus === 'local_only' &&
    CLOUD_SYNC_ENABLED &&
    !IS_EXPO_GO;

  const onPublishPack = useCallback(() => {
    if (!packDeeplink || publishBusy) return;
    setPublishBusy(true);
    void (async () => {
      const res = await publishLocalAuthorPack(packDeeplink, lang, studyTarget);
      setPublishBusy(false);
      if (res === 'submitted') {
        setPublishSubmitted(true);
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Набор отправлен на публикацию.',
          uk: 'Набір надіслано на публікацію.',
          es: 'El pack se ha enviado para publicarse.',
          'pt-BR': 'O pacote foi enviado para publicação.',
          vi: 'Bộ thẻ đã được gửi để đăng.',
          id: 'Paket dikirim untuk dipublikasikan.',
          tr: 'Paket yayınlanmak üzere gönderildi.',
          pl: 'Zestaw wysłany do publikacji.',
        }));
        void loadAll();
        return;
      }
      if (res === 'invalid') {
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Для публикации нужны название, описание и достаточное число карточек.',
          uk: 'Для публікації потрібні назва, опис і достатня кількість карток.',
          es: 'Para publicar hacen falta título, descripción y suficientes tarjetas.',
          'pt-BR': 'Para publicar são necessários título, descrição e cartões suficientes.',
          vi: 'Để đăng cần có tiêu đề, mô tả và đủ số thẻ.',
          id: 'Untuk publikasi perlu judul, deskripsi, dan cukup kartu.',
          tr: 'Yayınlamak için başlık, açıklama ve yeterli kart gerekir.',
          pl: 'Do publikacji potrzebny jest tytuł, opis i wystarczająca liczba kart.',
        }));
        return;
      }
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось отправить набор на публикацию.',
        uk: 'Не вдалося надіслати набір на публікацію.',
        es: 'No se pudo enviar el pack para publicarse.',
        'pt-BR': 'Não foi possível enviar o pacote para publicação.',
        vi: 'Không thể gửi bộ thẻ để đăng.',
        id: 'Gagal mengirim paket untuk dipublikasikan.',
        tr: 'Paket yayına gönderilemedi.',
        pl: 'Nie udało się wysłać zestawu do publikacji.',
      }));
    })();
  }, [packDeeplink, publishBusy, lang, studyTarget, loadAll]);
  /**
   * Высота таббара раздела — под неё резервируем «хвост» списка (§5.2).
   * Нижний инсет здесь уже съеден `SafeAreaView` экрана, поэтому таббару передаём 0.
   */
  const tabBarReserve = sectionRoot ? FC_TABBAR_HEIGHT + 8 : 0;
  /** §5.2: капсула таббара сжимается при скролле списка — как на главной. */
  const tabScroll = useFcTabBarScroll();
  /** Стопка карточек не скроллится списком — возвращаем капсулу при смене режима. */
  useEffect(() => {
    tabScroll.expandNow();
  }, [viewMode, tabScroll]);

  /**
   * Набор ещё догружается: список пуст не потому, что набор пустой, а потому что
   * карточки в пути. Заглушка «пусто» в этот момент и читалась как промежуточный
   * экран перед набором (замечание владельца, 2026-08-13) — не показываем её.
   *
   * зачем (владелец, «сначала тёмные карточки без цвета, потом рывком цветные и
   * кнопки»): у наборов сообщества (UGC) карточки приходят на первый кадр синхронно
   * через staging, а их оформление (packCardTheme) — только из marketPackCatalog,
   * который догружается с сервера отдельным async-циклом (loadAll в useCollectionData).
   * Карточки успевали отрисоваться БЕЗ темы, а через кадр перекрашивались — сам рывок.
   * У бандловых (встроенных) наборов marketPackCatalog синхронный с первого кадра
   * (reserveBundledMarketPacks), поэтому им ждать нечего — держим паузу только пока
   * каталог ещё не подтвердил решение по этому конкретному packDeeplink.
   */
  const packCardsPending =
    !!packDeeplink && !collectionDataReady && (filteredCards.length === 0 || !currentMarketPack);
  const isEmpty = !loading && !packCardsPending && filteredCards.length === 0;
  const bypassEmptyCustomCollection = shouldBypassEmptyCustomCollection({
    collectionDataReady,
    activeCat,
    packDeeplink,
    customCardCount: customCards.length,
  });
  useEffect(() => {
    if (!bypassEmptyCustomCollection) return;
    // Redirect заменяет native route, но без этой метки наш собственный
    // section-back stack продолжал помнить пустую коллекцию. Закрытие редактора
    // тогда возвращало сюда и сразу открывало редактор снова.
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/flashcards_card_editor',
      params: { create: '1', cat: 'custom' },
    } as any);
  }, [bypassEmptyCustomCollection, router]);

  /**
   * зачем (владелец, 2026-08-16, «прыжки страниц»): пустая custom-коллекция
   * через кадр уезжает в редактор (эффект выше), поэтому настоящий список тут
   * рисовать нельзя — это был бы лишний промежуточный экран.
   *
   * Но и `null` не годится: он держится, только пока под ним ЕСТЬ предыдущий
   * экран. При прямом входе (диплинк `?cat=custom`, перезапуск, возврат из
   * фона) под ним пусто — и владелец видел провал вместо перехода.
   *
   * Отдаём константный фон темы — тот же, что у стека и у экрана редактора.
   * Кадр не пустой, геометрия не прыгает, а смены фона на переходе не видно.
   */
  if (bypassEmptyCustomCollection) {
    return <View style={{ flex: 1, backgroundColor: t.bgPrimary }} />;
  }

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
          onBack={handleCollectionBack}
          showViewToggle={!isEmpty}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          filterGroups={filterGroups}
          filterOptions={filterOptions}
          activeFilter={activeFilter}
          filterOpen={filterOpen}
          onToggleFilterOpen={() => setFilterOpen((o) => !o)}
          showModeButtons={showModeButtons}
          onListen={startDeckListening}
          onTrain={startDeckTraining}
          showPublish={showPublishButton}
          publishBusy={publishBusy}
          onPublish={onPublishPack}
          /* На экране НАБОРА поиска по карточкам нет (в «Сохранённых» — остаётся). */
          showSearch={!packDeeplink && !(isEmpty && !searchActive)}
          searchInput={searchInput}
          searchActive={searchActive}
          onSearchInput={setSearchInput}
        />

        {/*
          Лайк и «Добавить себе» — на самом наборе.

          БАГ «невидимой стены» (замечание владельца): раньше строка была обёрнута
          в <ContentWrap>, а у него `flex: 1`. Соседом списка он забирал ПОЛОВИНУ
          высоты экрана прозрачным блоком — карточки уезжали под невидимый слой.
          Обёртка ниже ограничивает ширину БЕЗ flex, поэтому список получает всю
          оставшуюся высоту.
        */}
        {packDeeplink && currentMarketPack?.isCommunityUgc ? (
          <View style={[st.socialRow, { maxWidth: contentMaxW }]}>
            <CommunityPackSocialBar
              pack={currentMarketPack}
              lang={lang}
              t={t}
              owned={packOwnedByMe}
              variant="screen"
              onAdded={() => { void loadAll(); }}
            />
            {/* Тихая ссылка под лайком: жалоба не должна спорить с «Добавить
                себе», но обязана быть на виду у самого контента. */}
            <TouchableOpacity
              testID="collection-report-pack"
              accessibilityRole="button"
              onPress={() => setPackReportOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ alignSelf: 'center', paddingVertical: 10 }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Пожаловаться на набор', uk: 'Поскаржитись на набір', en: 'Report this pack', es: 'Denunciar el pack',
                  'pt-BR': 'Denunciar o pacote', vi: 'Báo cáo bộ thẻ', id: 'Laporkan set',
                  tr: 'Seti bildir', pl: 'Zgłoś zestaw',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {isEmpty ? (
          /*
            Пустая коллекция ТОЖЕ должна скроллиться, если сверху стоит витрина.

            зачем (владелец, 2026-08-29): блок «не должен быть зафиксирован» —
            он часть страницы и обязан уезжать за экран при скролле. В ветке со
            списком за это отвечает ListHeaderComponent; здесь списка нет, поэтому
            даём собственный ScrollView. Без витрины ведём себя как раньше —
            обычный центрированный ContentWrap, лишнего скролла не появляется.
          */
          savedTopPacksHeader ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: tabBarReserve + 24,
              }}
              showsVerticalScrollIndicator={false}
              onScroll={sectionRoot ? tabScroll.onScroll : undefined}
              scrollEventThrottle={16}
            >
              {savedTopPacksHeader}
              <CollectionEmptyState
                lang={cardContentLang}
                t={t}
                f={f}
                emptyTitle={s.empty}
                emptySub={s.emptySub}
                searchActive={searchActive}
                loadError={loadError}
                onLeave={openCommunityPacks}
                onRetry={loadAll}
              />
            </ScrollView>
          ) : (
          <ContentWrap>
            {/* зачем (владелец, 2026-08-16): ОДНО состояние, без вариантов.
                Раньше подпись переключалась «Ничего не найдено» ↔ «Нет карточек»
                в зависимости от поиска — два разных текста в одном месте читались
                как смена состояний. «Ничего не найдено» удалено полностью. */}
            <CollectionEmptyState
              lang={cardContentLang}
              t={t}
              f={f}
              emptyTitle={s.empty}
              emptySub={s.emptySub}
              searchActive={searchActive}
              loadError={loadError}
              onLeave={openCommunityPacks}
              onRetry={loadAll}
            />
          </ContentWrap>
          )
        ) : viewMode === 'deck' ? (
          <CollectionDeckView
            cards={listCards}
            initialIndex={indexRef.current}
            lang={cardContentLang}
            cardContentLang={cardContentLang}
            t={t}
            f={f}
            packCardTheme={packCardTheme}
            onSpeak={onSpeakCb}
            onIndexChanged={onDeckIndexChanged}
            onFlipTracked={trackCardFlip}
            onExitToList={exitDeckToList}
            strengthForCard={strengthForCard}
            extraBottomPad={tabBarReserve}
          />
        ) : (
          <CollectionListView
            cards={listCards}
            hiddenByLimitCount={hiddenByLimitCount}
            activeCat={activeCat}
            packDeeplink={packDeeplink}
            lang={cardContentLang}
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
            allowAddCustomCard={allowAddCustomCard && !previewMode}
            onCreateCard={openCreateEditor}
            onSpeak={onSpeakCb}
            onEditCard={openEditEditor}
            isEditableCustomCard={previewMode ? () => false : isEditableCustomCard}
            onDeleteCardById={deleteCardById}
            onOpenPremiumLimit={openPremiumLimit}
            onScroll={sectionRoot ? tabScroll.onScroll : undefined}
            onFocusedIndexChanged={onFocusedIndexChanged}
            onCardsViewed={registerFlashcardViewed}
            onFlipTracked={trackCardFlip}
            strengthForCard={strengthForCard}
            extraBottomPad={tabBarReserve}
            listHeader={savedTopPacksHeader}
          />
        )}

      {undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={
            Math.max(insets.bottom, 8) + 14
            + (sectionRoot ? FC_TABBAR_HEIGHT : 0)
          }
          lang={cardContentLang}
          t={t}
          f={f}
          onUndo={undoDelete}
        />
      )}

      <FlashcardsFilterDropdown
        visible={filterOpen}
        lang={lang}
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

      {/* Cards 2.1 §5.2: таббар раздела — только в корне «Карточек» */}
      {sectionRoot ? (
        <FlashcardsTabBar
          lang={lang}
          t={t}
          active="cards"
          bottomInset={0}
          scroll={tabScroll}
          // зачем: пункт «Коллекция» ведёт в сохранённые+свои карточки раздела —
          // без них вести некуда, прячем пункт вместо мёртвого тапа (владелец).
          hasAnyCards={savedCards.length > 0 || customCards.length > 0}
        />
      ) : null}

      {/* Жалоба на чужой набор прямо с его страницы. «Не показывать» скрывает
          набор на устройстве — тогда уходим назад, чтобы не остаться на
          экране только что скрытого набора. */}
      {packReportOpen && currentMarketPack ? (
        <ReportPackModal
          visible
          packId={currentMarketPack.id}
          packTitle={packTitleForInterface(currentMarketPack, cardContentLang)}
          authorStableId={currentMarketPack.authorStableId ?? null}
          lang={lang}
          studyTarget={studyTarget}
          onClose={() => setPackReportOpen(false)}
          onPackHiddenOnDevice={() => {
            setPackReportOpen(false);
            openCommunityPacks();
          }}
        />
      ) : null}

    </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1 },
  /** Ширина как у ContentWrap, но БЕЗ flex — иначе блок съедает высоту списка. */
  socialRow: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
});
