import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * cards-2.0 (E11): контейнер коллекции — загрузка данных (useCollectionData),
 * фильтр/поиск, роутинг режимов «Список / Колода», delete+undo-пайплайн, модалки.
 * View-режимы вынесены: CollectionListView (список) и CollectionDeckView (колода);
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
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
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
import CollectionHeader from './flashcards/CollectionHeader';
import CollectionListView, {
  CollectionEmptyState,
  UndoDeleteSnackbar,
} from './flashcards/CollectionListView';
// Cards 2.1 §5.2: нижний таббар раздела (Тренировка / + / Наборы)
import FlashcardsTabBar, { FC_TABBAR_HEIGHT } from './flashcards/FlashcardsTabBar';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
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
    es: cat.fullLabelES,
    'pt-BR': cat.fullLabelPtBr,
    vi: cat.fullLabelVi,
    id: cat.fullLabelId,
    tr: cat.fullLabelTr,
    pl: cat.fullLabelPl,
  };
  return labels[lang];
}

/**
 * Плановые локали: куда класть перевод своей карточки. ru/uk/es — базовые поля,
 * остальные языки — в sourceLocales (иначе перевод терялся у 5 новых локалей).
 */
export function customCardLocalizationForLang(
  lang: Lang,
  translatedText: string,
  existing?: CardItem,
): { baseRu: string; baseUk: string; baseEs: string; plannedSourceLocales: CardItem['sourceLocales'] } {
  const sourceLocales = { ...(existing?.sourceLocales ?? {}) };
  let ru = existing?.ru ?? '';
  let uk = existing?.uk ?? '';
  let es = existing?.es ?? '';

  switch (lang) {
    case 'uk':
      uk = translatedText;
      break;
    case 'es':
      es = translatedText;
      break;
    case 'pt-BR':
      sourceLocales['pt-BR'] = translatedText;
      break;
    case 'vi':
      sourceLocales.vi = translatedText;
      break;
    case 'id':
      sourceLocales.id = translatedText;
      break;
    case 'tr':
      sourceLocales.tr = translatedText;
      break;
    case 'pl':
      sourceLocales.pl = translatedText;
      break;
    case 'ru':
    default:
      ru = translatedText;
      break;
  }

  return { baseRu: ru, baseUk: uk, baseEs: es, plannedSourceLocales: sourceLocales };
}

export type FlashcardsCollectionScreenProps = {
  /**
   * Cards 2.1 §5.1: экран открыт как КОРЕНЬ раздела «Карточки» (`/flashcards`) —
   * сразу сохранённые карточки с поиском и фильтром. В этом режиме снизу
   * закреплён таббар раздела (§5.2), а панель «Тренировать эту колоду»
   * не дублируется (её роль берёт левая позиция таббара).
   */
  sectionRoot?: boolean;
};

export default function FlashcardsScreen({ sectionRoot = false }: FlashcardsCollectionScreenProps = {}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode, statusBarLight, uiScale } = useTheme();
  const isLightTheme = isLightThemeMode(themeMode);
  const { lang } = useLang();
  /** Компоненты раздела карточек локализованы на ru/uk/es — сужаем интерфейсный язык. */

  const { studyTarget } = useStudyTarget();
  const strLang: Lang = lang;
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const router   = useRouter();
  const params   = useLocalSearchParams<{ cat?: string; pack?: string; create?: string; widgetCard?: string }>();
  const routeCat = useMemo(() => normalizeRouteCategory(params.cat), [params.cat]);
  const packDeeplink = useMemo(() => normalizePackParam(params.pack), [params.pack]);
  const routeCatRef = useRef<CategoryId | null>(null);
  routeCatRef.current = routeCat;
  const packRouteRef = useRef<string | null>(null);
  packRouteRef.current = packDeeplink;

  const s        = STR[strLang] ?? STR.ru;
  const insets   = useStableSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { CARD_H, PEEK } = useMemo(() => {
    const reserved = 200 + insets.top + insets.bottom;
    const hAvail = Math.max(220, screenH - reserved);
    /** Компактніша висота картки: раніше max 280px / ~52% екрана було зайвим. × uiScale — узгоджено з темою. */
    const cardH = Math.min(224, Math.max(140, Math.round(hAvail * 0.45 * uiScale)));
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
   * Pop у стеку; фолбек — корінь розділу («Збережені»), а з самого кореня — головне меню
   * (інакше `replace('/flashcards')` із `/flashcards` замкнуло б екран на собі).
   */
  const leaveCollection = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace((sectionRoot ? '/(tabs)/home' : '/flashcards') as any);
    }
  }, [router, sectionRoot]);

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

  const [savedCards, setSavedCards]   = useState<CardItem[]>(savedCardsCache ?? []);
  const [customCards, setCustomCards] = useState<CardItem[]>(customCardsCache ?? []);
  const [marketCards, setMarketCards] = useState<CardItem[]>(() => {
    if (!officialPacksEnabled && !communityPacksEnabled) {
      consumeStagedCommunityPackMarketCards();
      stagedOwnedPackMarketCards = null;
      stagedOwnedPackMarketCardsTarget = null;
      return [];
    }
    const com = communityPacksEnabled ? consumeStagedCommunityPackMarketCards() : null;
    if (com && com.length > 0) return com;
    return officialPacksEnabled ? consumeStagedOwnedPackMarketCards(studyTarget) ?? [] : [];
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
  // «Пульт»: замок коллекции карточек снимается, когда фича переведена в «Фри».
  const isPremium = useFeatureAccess('flashcards');
  const [index, setIndex]             = useState(0);
  const [, setIsFlipped]              = useState(false);
  const [allFlipped, setAllFlipped]   = useState(false);
  const cardFlipAnims                 = useRef<Record<string, Animated.Value>>({});
  const cardFlippedState              = useRef<Record<string, boolean>>({});
  // Instant paint when session cache exists (re-open); first cold open still waits on AsyncStorage
  const [loading, setLoading]         = useState(
    () => savedCardsCache === null && customCardsCache === null,
  );
  const [loadError, setLoadError]     = useState(false);
  const sessionDoneRef                = useRef(false); // achievement fired once per session
  /** Просмотренные id из словаря flashcards_v1 — для ачивки «все карточки за сессию». */
  const flashAchievementSeenRef      = useRef<Set<string>>(new Set());
  const pendingRestoreRef             = useRef<{ cat: CategoryId; idx: number } | null>(null);
  // Create / Edit mode. Card training lives in /flashcards_swipe.
  const [mode, setMode]               = useState<'view' | 'create' | 'edit'>('view');
  const [createStep, setCreateStep]   = useState<'front' | 'back' | 'description'>('front');
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draftEN, setDraftEN]         = useState('');
  const [draftTR, setDraftTR]         = useState(''); // translation
  const [draftDescription, setDraftDescription] = useState('');

  // Refs
  const backInputRef     = useRef<any>(null);
  const descriptionInputRef = useRef<any>(null);
  const flatListRef      = useRef<any>(null);
  /** Native View wrapping FlatList — has measureInWindow (FlatList ref does not). */
  const listViewportRef  = useRef<View | null>(null);
  // Tracks last rendered index in scroll listener to fire focusAnim on every card change
  const scrollIndexRef   = useRef(0);
  const [scrollViewH, setScrollViewH] = useState(0);
  /** Задание дня «пролистать карточки»: не дублировать одну и ту же карточку за сессию (скролл + переворот). */
  const flashcardDailyViewCountedRef = useRef<Set<string>>(new Set());
  useEffect(() => () => { flashcardDailyViewCountedRef.current.clear(); }, []);

  const registerFlashcardViewed = useCallback((cardIds: string[]) => {
    const set = flashcardDailyViewCountedRef.current;
    let n = 0;
    for (const id of cardIds) {
      if (!id || set.has(id)) continue;
      set.add(id);
      n += 1;
    }
    if (n > 0) {
      updateMultipleTaskProgress(
        [{ type: 'flashcard_view', increment: n }],
        { studyTarget },
      ).catch(() => {});
      checkAchievements({ type: 'flashcard_viewed', count: n, studyTarget }).catch(() => {});
    }
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
            checkAchievements({ type: 'flashcards_session', studyTarget }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [studyTarget]);

  // Animations
  const flipAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const createFlipAnim = useRef(new Animated.Value(0)).current;
  const [savedBtnsVisible] = useState(true);
  // Long-press delete overlay
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  // Delete hint onboarding
  const [showDeleteHint, setShowDeleteHint] = useState(false);
  const deleteHintAnim = useRef(new Animated.Value(0)).current;
  const deleteHintPulse = useRef(new Animated.Value(1)).current;
  const deleteHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteHintPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const overlayAnims = useRef<Record<string, Animated.Value>>({});
  // Card delete animation
  const cardDeleteAnims = useRef<Record<string, { opacity: Animated.Value; scale: Animated.Value }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetCardFlipState = useCallback(() => {
    setIsFlipped(false);
    setAllFlipped(false);
    flipAnim.setValue(0);
    Object.values(cardFlipAnims.current ?? {}).forEach((a) => a.setValue(0));
    cardFlippedState.current = {};
  }, [flipAnim]);

  /** Власні картки користувача окремо від куплених наборів; куплений набір — лише з `?pack=`. */
  const collectionCustomCards = useMemo(() => {
    if (packDeeplink) {
      return (officialPacksEnabled ? marketCards : []).filter(
        (c) => c.source === 'lesson' && c.sourceId === `DEV:${packDeeplink}`,
      );
    }
    return customCards ?? [];
  }, [officialPacksEnabled, packDeeplink, marketCards, customCards]);
  const systemCardsForTarget = useMemo(
    () => flashcardsSystemCardsForTarget(SYSTEM_CARDS, studyTarget, lang),
    [flashcardPackTick, lang, studyTarget],
  );
  const cards = useMemo(() => {
    if (activeCat === 'custom') {
      return collectionCustomCards;
    }
    return getCardsForCategory(activeCat, savedCards, customCards, systemCardsForTarget);
  }, [activeCat, savedCards, customCards, collectionCustomCards, systemCardsForTarget]);
  const filteredCards = useMemo(
    () => applyCardFilter(cards, activeFilter, cardStatuses),
    [cards, activeFilter, cardStatuses],
  );

  // Widget deep link: reveal the exact saved/created card once local storage has
  // hydrated. This preserves the normal collection view and avoids a second,
  // divergent card-details route.
  const handledWidgetCardRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = Array.isArray(params.widgetCard) ? params.widgetCard[0] : params.widgetCard;
    if (!raw || handledWidgetCardRef.current === raw || filteredCards.length === 0) return;
    const cardIndex = filteredCards.findIndex((card) => card.id === raw);
    if (cardIndex < 0) return;
    handledWidgetCardRef.current = raw;
    setIndex(cardIndex);
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToIndex?.({ index: cardIndex, animated: false, viewPosition: 0.35 });
    });
  }, [filteredCards, params.widgetCard]);

  // зачем: чипы считаем по ПОЛНОМУ набору, а не по отфильтрованному — иначе
  // после выбора «Слабые» остальные чипы исчезли бы и вернуться было бы некуда.
  const cardIds = useMemo(() => cards.map((c) => c.id), [cards]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 45 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const top = viewableItems[0];
    if (top?.index != null) {
      scrollIndexRef.current = top.index;
      setIndex(top.index);
    }
    const ids: string[] = [];
    for (const token of viewableItems) {
      if (!token.isViewable || token.index == null) continue;
      const card = filteredCards[token.index];
      if (card?.id) ids.push(card.id);
    }
    registerFlashcardViewed(ids);
  }, [filteredCards, registerFlashcardViewed]);

  /** Куплені набори (`sourceId` = `DEV:…`) — без CTA «додати свою картку». */
  const allowAddCustomCard = useMemo(() => {
    if (packDeeplink) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter.startsWith('lesson:')) {
      const sourceId = activeFilter.slice(7);
      if (sourceId.startsWith('DEV:')) return false;
    }
    return true;
  }, [packDeeplink, activeFilter]);

  /** Куплений набір з маркету (`?pack=` або фільтр `lesson:DEV:…`) — преміальний декор як у paywall. */
  const isMarketplacePackBrowse = useMemo(() => {
    if (packDeeplink) return true;
    if (activeFilter.startsWith('lesson:')) return activeFilter.slice(7).startsWith('DEV:');
    return false;
  }, [packDeeplink, activeFilter]);

  const currentMarketPack = useMemo((): FlashcardMarketPack | null => {
    if (!isMarketplacePackBrowse) return null;
    if (packDeeplink) return marketPackCatalog.find((p) => p.id === packDeeplink) ?? null;
    const sourceId = activeFilter.slice(7);
    if (sourceId.startsWith('DEV:')) {
      const packId = sourceId.slice(4);
      return marketPackCatalog.find((p) => p.id === packId) ?? null;
    }
    return null;
  }, [isMarketplacePackBrowse, packDeeplink, activeFilter, marketPackCatalog]);

  const swipeSourceId = useMemo(() => {
    if (packDeeplink) {
      const kind = currentMarketPack?.isCommunityUgc ? 'community' : 'official';
      return `${kind}:${packDeeplink}`;
    }
    if (activeCat === 'custom') return 'custom:all';
    if (activeCat === 'saved') return 'saved:all';
    return '';
  }, [activeCat, currentMarketPack?.isCommunityUgc, packDeeplink]);

  const openSwipeGame = useCallback(() => {
    if (!isPremium) {
      router.push({
        pathname: '/premium_modal',
        params: { context: 'flashcard_training', source: 'flashcards_collection_training' },
      } as any);
      return;
    }
    const paramsForSwipe: { source?: string; filter?: string } = {};
    if (swipeSourceId) paramsForSwipe.source = swipeSourceId;
    if (swipeSourceId && activeFilter !== 'all') paramsForSwipe.filter = activeFilter;
    router.push({ pathname: '/flashcards_swipe', params: paramsForSwipe } as any);
  }, [activeFilter, isPremium, router, swipeSourceId]);

  const openAudioMode = useCallback(() => {
    if (!isPremium) {
      router.push({
        pathname: '/premium_modal',
        params: { context: 'flashcard_autoplay', source: 'flashcards_collection_audio' },
      } as any);
      return;
    }
    const paramsForAudio: { source?: string; filter?: string } = {};
    if (swipeSourceId) paramsForAudio.source = swipeSourceId;
    if (swipeSourceId && activeFilter !== 'all') paramsForAudio.filter = activeFilter;
    router.push({ pathname: '/flashcards_audio', params: paramsForAudio } as any);
  }, [activeFilter, isPremium, router, swipeSourceId]);

  const packPremiumVisual = useMemo(() => {
    if (!currentMarketPack) return null;
    if (currentMarketPack.isCommunityUgc && currentMarketPack.ugcCardThemeKey) {
      return getCommunityUgcPackPaywallTheme(currentMarketPack.ugcCardThemeKey, { themeMode, isLight: isLightTheme });
    }
    return getCardPackPaywallTheme(currentMarketPack, { themeMode, isLight: isLightTheme });
  }, [currentMarketPack, themeMode, isLightTheme]);

  const packCardTheme = useMemo(() => {
    if (!packPremiumVisual) return undefined;
    const c0 = packPremiumVisual.ctaColors[0];
    const c1 = packPremiumVisual.ctaColors[1];
    const fa = isLightTheme ? '20' : '3E';
    const ba = isLightTheme ? '18' : '32';
    return {
      borderAccent: packPremiumVisual.borderAccent,
      frontGradient: [c0 + fa, t.bgCard] as [string, string],
      backGradient: [c1 + ba, t.bgSurface] as [string, string],
    };
  }, [packPremiumVisual, isLightTheme, t.bgCard, t.bgSurface]);

  /** Auto-scroll to expanded details: ignore our own scroll; user drag / scroll cancels. */
  const detailsEscortIgnoreScrollUntilRef = useRef(0);
  const detailsEscortUserDragRef = useRef(false);
  const detailsEscortProgrammaticRef = useRef(false);
  /** Last FlatList content offset (for measure-based "center the row in the list viewport") */
  const listScrollYRef = useRef(0);
  /** Map item id → ref to the full row (card + details) for measureInWindow */
  const listItemRowRefById = useRef<Record<string, View | null>>({});
  const setListItemRowRef = useCallback((id: string, el: View | null) => {
    if (el) listItemRowRefById.current[id] = el;
    else delete listItemRowRefById.current[id];
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

  /**
   * Нижняя закреплённая панель тренировки — только когда в колоде есть карточки.
   * В корне раздела (§5) её место занимает таббар — не дублируем два ряда кнопок.
   */
  const trainPanelVisible =
    !sectionRoot && trainDeckId !== null && !loading && filteredCards.length > 0;
  /**
   * Высота таббара раздела — под неё резервируем «хвост» списка (§5.2).
   * Нижний инсет здесь уже съеден `SafeAreaView` экрана, поэтому таббару передаём 0.
   */
  const tabBarReserve = sectionRoot ? FC_TABBAR_HEIGHT + 8 : 0;

  const searchActive = searchQuery.trim().length > 0;
  const isEmpty = !loading && filteredCards.length === 0;

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

        {/* Cards 2.1 §2: лайк активности и счётчик добавлений — на самом наборе. */}
        {packDeeplink && currentMarketPack?.isCommunityUgc ? (
          <ContentWrap>
            <CommunityPackSocialBar
              pack={currentMarketPack}
              lang={strLang}
              t={t}
              owned={communityOwnedIdList.includes(packDeeplink)}
            />
          </ContentWrap>
        ) : null}

        {isEmpty ? (
          <ContentWrap>
            <CollectionEmptyState
              activeCat={activeCat}
              lang={strLang}
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
            lang={strLang}
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
            lang={strLang}
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
            extraBottomPad={tabBarReserve}
          />
        )}

      {undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={
            Math.max(insets.bottom, 8) + 14
            + (trainPanelVisible && viewMode === 'list' && !isEmpty ? 66 : 0)
            + (sectionRoot ? FC_TABBAR_HEIGHT : 0)
          }
          lang={strLang}
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

      {/* Cards 2.1 §5.2: таббар раздела — только в корне «Карточек» */}
      {sectionRoot ? (
        <FlashcardsTabBar lang={lang} t={t} active="cards" bottomInset={0} />
      ) : null}

    </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1 },
});
