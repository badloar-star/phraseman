import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, DEV_CONTENT_UNLOCK, IS_BETA_TESTER, IS_EXPO_GO } from './config';
import { useEffectivePlatformOS } from './platform_ui_preview';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { useFeatureAccess } from '../components/PremiumContext';
import { useAudio } from '../hooks/use-audio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    BackHandler,
    Easing,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView, Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
    type ViewToken,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import PlusBadge from '../components/PlusBadge';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { FLASHCARDS_MARKET_DEV_ROUTE } from '../constants/devRoutes';
import { getCardPackPaywallTheme, getCommunityUgcPackPaywallTheme } from './flashcards/cardPackPaywallTheme';
import { Flashcard, loadFlashcards, removeFlashcard, saveFlashcards } from '../hooks/use-flashcards';
import { updateMultipleTaskProgress } from './daily_tasks';
import { getTranscription } from './transcription';
import { actionToastTri, emitAppEvent } from './events';
import { CATEGORIES, STR } from './flashcards/constants';
import { SYSTEM_CARDS } from './flashcards/system-cards';
import { CardItem, CategoryId } from './flashcards/types';
import {
  readCustomCards,
  readFlashcardsProgress,
  writeCustomCards,
  writeFlashcardsProgress,
} from './flashcards/storage';
import {
  applyCardFilter,
  buildFilterGroups,
  buildFilterOptions,
  FilterGroup,
  getCardsForCategory,
} from './flashcards/selectors';
import FlashcardListItem from './flashcards/FlashcardListItem';
import FlashcardsFilterDropdown from './flashcards/FlashcardsFilterDropdown';
import {
  buildMarketplaceOwnedCards,
  bundledPacksForOwned,
  consumeDevActivePack,
  reserveBundledMarketPacks,
  loadBuiltMarketplaceCardsCache,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  marketOwnedIdsCacheKey,
  packTitleForInterface,
  saveBuiltMarketplaceCardsCache,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  clearStagedNavigationPackId,
  consumeStagedCommunityPackMarketCards,
  getStagedNavigationPackId,
} from './community_packs/staging';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import {
  fetchCommunityPackCards,
  loadPublishedCommunityMarketPacks,
} from './community_packs/communityFirestore';
import { getCanonicalUserId } from './user_id_policy';
import { flashcardContentLang } from './spanish_content_gate';
import { checkAchievements } from './achievements';
import {
  flashcardsDeleteHintSeenKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
  flashcardsSystemCardsForTarget,
} from './flashcards_target_gate';
import { ensureFrenchRemoteFlashcards, prefetchFrenchRemoteFlashcards } from './french_flashcard_remote_runtime';
import { ensureCourseReleaseFlashcards, prefetchCourseReleaseFlashcards } from './language_runtime/course_release_flashcard_loader';
import { safeRouterBack } from './navigation_back';

/** Монотонний фліп (timing замість spring) + різке opacity — без «моргання» біля 0.5. */
const FLASHCARD_FLIP_DURATION_MS = 280;
const flashcardFlipEasing = Easing.out(Easing.cubic);

function normalizeRouteCategory(cat: string | string[] | undefined): CategoryId | null {
  const raw = Array.isArray(cat) ? cat[0] : cat;
  if (!raw || typeof raw !== 'string') return null;
  const knownCategory = CATEGORIES.some((c) => c.id === raw);
  if (!knownCategory) return null;
  return raw as CategoryId;
}

function normalizePackParam(pack: string | string[] | undefined): string | null {
  const raw = Array.isArray(pack) ? pack[0] : pack;
  if (!raw || typeof raw !== 'string') return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

// Module-level cache — survives re-renders; warm via `primeFlashcardsCollectionCache` (хаб / root)
let _savedCardsCacheByTarget: Partial<Record<string, CardItem[]>> = {};
let _customCardsCacheByTarget: Partial<Record<string, CardItem[]>> = {};

function flashcardsCacheTarget(studyTarget?: RuntimeStudyTarget): string {
  return storageStudyTarget(studyTarget);
}

// Built once per app session — lazy dynamic import so the ~2 MB lesson data
// files are NOT loaded at startup (only when a card actually needs migration).
let _enToUkCache: Map<string, string> | null = null;
async function getEnToUkMap(): Promise<Map<string, string>> {
  if (_enToUkCache) return _enToUkCache;
  const { getLessonData } = await import('./lesson_data_all');
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

// Types and static dictionaries are moved to app/flashcards/*

const savedToCard = (f: Flashcard): CardItem => ({
  id: f.id, en: f.en, ru: f.ru, uk: f.uk || f.ru,
  es: f.es,
  sourceLocales: {
    'pt-BR': f.sourceLocales?.['pt-BR'],
    vi: f.sourceLocales?.vi,
    id: f.sourceLocales?.id,
    tr: f.sourceLocales?.tr,
    pl: f.sourceLocales?.pl,
  },
  transcription: f.transcription,
  categoryId: 'saved', isSystem: false,
  source: f.source, sourceId: f.sourceId,
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

function fullCategoryLabelForLang(cat: (typeof CATEGORIES)[number], lang: Lang): string {
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

function customCardLocalizationForLang(
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

/**
 * Прогрів кешу колекції до відкриття екрана: збережені + кастомні з AsyncStorage
 * (і розігрів шляху built-market cache). Не блокує JS — тільки void Promise.
 */
export function primeFlashcardsCollectionCache(studyTarget?: RuntimeStudyTarget) {
  const target = flashcardsCacheTarget(studyTarget);
  void Promise.all([
    loadFlashcards(target).catch((): Flashcard[] => []),
    readCustomCards(target).catch(() => null),
    loadAccessiblePackIds(target).catch((): string[] => []),
    loadBuiltMarketplaceCardsCache(target).catch((): null => null),
  ]).then(([saved, rawCustom]) => {
    _savedCardsCacheByTarget[target] = saved.map(savedToCard);
    _customCardsCacheByTarget[target] = Array.isArray(rawCustom) ? (rawCustom as CardItem[]) : [];
  });
}

/** @deprecated те саме, що primeFlashcardsCollectionCache */
export function primeCustomFlashcardsCache(studyTarget?: RuntimeStudyTarget) {
  primeFlashcardsCollectionCache(studyTarget);
}

/**
 * Викликати синхронно в `router.push` перед відкриттям колекції з `?pack=` —
 * тоді перший кадр уже містить картки з бандла (без порожнього «створити картку»).
 */
let stagedOwnedPackMarketCards: CardItem[] | null = null;
let stagedOwnedPackMarketCardsTarget: string | null = null;

export function stageOwnedPackCardsForNavigation(packId: string, studyTarget?: RuntimeStudyTarget, sourceLocale?: unknown): boolean {
  stagedOwnedPackMarketCards = null;
  stagedOwnedPackMarketCardsTarget = null;
  if (!flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale)) return false;
  const packs = bundledPacksForOwned([packId], studyTarget, sourceLocale);
  if (packs.length === 0) return false;
  stagedOwnedPackMarketCards = buildMarketplaceOwnedCards(packs, sourceLocale, studyTarget);
  stagedOwnedPackMarketCardsTarget = storageStudyTarget(studyTarget);
  return stagedOwnedPackMarketCards.length > 0;
}

function consumeStagedOwnedPackMarketCards(studyTarget?: RuntimeStudyTarget): CardItem[] | null {
  if (stagedOwnedPackMarketCardsTarget !== storageStudyTarget(studyTarget)) {
    stagedOwnedPackMarketCards = null;
    stagedOwnedPackMarketCardsTarget = null;
    return null;
  }
  const snap = stagedOwnedPackMarketCards;
  stagedOwnedPackMarketCards = null;
  stagedOwnedPackMarketCardsTarget = null;
  return snap;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FlashcardsScreen() {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const effectiveOs = useEffectivePlatformOS();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode, statusBarLight, uiScale } = useTheme();
  const isLightTheme = false;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const flashcardsTarget = flashcardsCacheTarget(studyTarget);
  const savedCardsCache = _savedCardsCacheByTarget[flashcardsTarget] ?? null;
  const customCardsCache = _customCardsCacheByTarget[flashcardsTarget] ?? null;
  const strLang: Lang = lang;
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget, lang);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  const [flashcardPackTick, setFlashcardPackTick] = useState(0);
  useEffect(() => {
    const target = storageStudyTarget(studyTarget);
    if (target === 'en') return;
    prefetchCourseReleaseFlashcards(target, lang);
    if (target === 'fr') prefetchFrenchRemoteFlashcards(lang);
    let cancelled = false;
    ensureCourseReleaseFlashcards(target, lang)
      .catch(() => target === 'fr' ? ensureFrenchRemoteFlashcards(lang) : undefined)
      .finally(() => { if (!cancelled) setFlashcardPackTick((value) => value + 1); });
    return () => { cancelled = true; };
  }, [lang, studyTarget]);
  useEffect(() => {
    if (storageStudyTarget(studyTarget) !== 'fr') return;
    let cancelled = false;
    loadMarketplacePacks(studyTarget, lang)
      .then(() => {
        if (!cancelled) setFlashcardPackTick((value) => value + 1);
      })
      .catch(() => {
        if (!cancelled) setFlashcardPackTick((value) => value + 1);
      });
    return () => { cancelled = true; };
  }, [lang, studyTarget]);
  const router   = useRouter();
  const params   = useLocalSearchParams<{ cat?: string; pack?: string }>();
  const routeCat = useMemo(() => normalizeRouteCategory(params.cat), [params.cat]);
  const packDeeplink = useMemo(() => normalizePackParam(params.pack), [params.pack]);
  const routeCatRef = useRef<CategoryId | null>(null);
  routeCatRef.current = routeCat;
  const packRouteRef = useRef<string | null>(null);
  packRouteRef.current = packDeeplink;

  const s        = STR[strLang];
  const insets   = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const topSafeInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const { height: screenH, width: screenW } = useWindowDimensions();
  /**
   * Назва набору / категорії в шапці колекції — навмисно менша за звичайний h2 екрана,
   * щоб довгі UK-рядки (лапки, коми) вміщались без «Влучно, та м'…».
   */
  const collectionHeaderTitleFontSize = useMemo(() => {
    const base = f.h3;
    if (screenW <= 320) return Math.max(13, base - 2);
    if (screenW < 360) return Math.max(14, base - 1);
    if (screenW < 400) return Math.max(14, base);
    return base;
  }, [f.h3, screenW]);
  const { CARD_H, PEEK } = useMemo(() => {
    const reserved = 200 + insets.top + bottomInset;
    const hAvail = Math.max(220, screenH - reserved);
    /** Компактніша висота картки: раніше max 280px / ~52% екрана було зайвим. × uiScale — узгоджено з темою. */
    const cardH = Math.min(224, Math.max(140, Math.round(hAvail * 0.45 * uiScale)));
    const peek = Math.max(30, Math.round(cardH * 0.19));
    return { CARD_H: cardH, PEEK: peek };
  }, [screenH, insets.top, bottomInset, uiScale]);
  const isDevMarketEnabled = DEV_CONTENT_UNLOCK || IS_BETA_TESTER;
  /** На хаб карток (або pop у стеку), а не на головне меню — зручніше при відкритті з підбірки / набору. */
  const leaveCollection = useCallback(() => {
    safeRouterBack(router, '/flashcards' as any);
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
    () => applyCardFilter(cards, activeFilter),
    [cards, activeFilter],
  );

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
  const onDetailsOpenAnimStarted = useCallback(() => {
    detailsEscortUserDragRef.current = false;
  }, []);
  const onDetailsScrollSettled = useCallback(
    (info: { itemId: string; itemIndex: number }) => {
      if (detailsEscortUserDragRef.current) {
        detailsEscortUserDragRef.current = false;
        return;
      }
      const list = flatListRef.current;
      if (!list || filteredCards.length === 0) return;
      const byId = filteredCards.findIndex((c) => c.id === info.itemId);
      const index = byId >= 0 ? byId : Math.min(Math.max(0, info.itemIndex), Math.max(0, filteredCards.length - 1));
      const backupScrollToIndex = () => {
        detailsEscortProgrammaticRef.current = true;
        detailsEscortIgnoreScrollUntilRef.current = Date.now() + 1000;
        requestAnimationFrame(() => {
          try {
            (list as any).scrollToIndex({ index, viewPosition: 0.5, viewOffset: 0, animated: true });
          } catch {
            // ignore
          }
          setTimeout(() => {
            detailsEscortProgrammaticRef.current = false;
          }, 1100);
        });
      };
      const runCenterByMeasure = () => {
        const row = listItemRowRefById.current[info.itemId];
        if (!row) {
          backupScrollToIndex();
          return;
        }
        const viewport = listViewportRef.current;
        if (!viewport || typeof (viewport as any).measureInWindow !== 'function') {
          backupScrollToIndex();
          return;
        }
        detailsEscortProgrammaticRef.current = true;
        detailsEscortIgnoreScrollUntilRef.current = Date.now() + 1000;
        (row as any).measureInWindow((rx: number, ry: number, _rw: number, rh: number) => {
          (viewport as any).measureInWindow((lx: number, ly: number, _lw: number, lh: number) => {
            const rowCenterY = ry + rh / 2;
            const listCenterY = ly + lh / 2;
            const delta = rowCenterY - listCenterY;
            if (Math.abs(delta) < 1.5) {
              setTimeout(() => {
                detailsEscortProgrammaticRef.current = false;
              }, 60);
              return;
            }
            const current = listScrollYRef.current;
            const next = Math.max(0, current + delta);
            const useAnim = Math.abs(delta) >= 72;
            (list as any).scrollToOffset({ offset: next, animated: useAnim });
            setTimeout(
              () => {
                detailsEscortProgrammaticRef.current = false;
              },
              useAnim ? 1200 : 80,
            );
          });
        });
      };
      // Wait for layout + split gap animation; measureInWindow is reliable (scrollToIndex is not, variable row height)
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          setTimeout(runCenterByMeasure, 100);
        });
      });
    },
    [filteredCards],
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
    const userSid = await getCanonicalUserId().catch(() => null);
    setAccessStableId(userSid);
    // Only show loading on first ever open (no cache yet)
    if (!_savedCardsCacheByTarget[flashcardsTarget] && !_customCardsCacheByTarget[flashcardsTarget]) setLoading(true);
    const [saved, customParsed, progressParsed, hintSeen, ownedIdsEarly, builtMarketCache, communityOwnedEarly] =
      await Promise.all([
      loadFlashcards(studyTarget),
      readCustomCards(studyTarget),
      readFlashcardsProgress(studyTarget),
      AsyncStorage.getItem(flashcardsDeleteHintSeenKey(studyTarget)),
      officialPacksEnabled ? loadAccessiblePackIds(studyTarget) : Promise.resolve([] as string[]),
      officialPacksEnabled ? loadBuiltMarketplaceCardsCache(studyTarget, lang).catch((): null => null) : Promise.resolve(null),
      communityPacksEnabled ? loadCommunityOwnedPackIds(studyTarget).catch((): string[] => []) : Promise.resolve([] as string[]),
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
      setMarketCards(builtMarketCache.cards);
      setOwnedPackIdList(ownedIdsEarly);
      setCommunityOwnedIdList(communityOwnedEarly);
      setMarketPackCatalog(reserveBundledMarketPacks(studyTarget, lang));
    } else if (ownedIdsEarly.length > 0 || communityOwnedEarly.length > 0) {
      /** Одразу з бандла — не чекаємо Firestore у `marketPromise`, інакше `?pack=` показує порожній custom. */
      setOwnedPackIdList(ownedIdsEarly);
      setCommunityOwnedIdList(communityOwnedEarly);
      const ownedBundled = bundledPacksForOwned(ownedIdsEarly, studyTarget, lang);
      if (ownedBundled.length > 0) {
        setMarketCards(buildMarketplaceOwnedCards(ownedBundled, lang, studyTarget));
      }
      setMarketPackCatalog(reserveBundledMarketPacks(studyTarget, lang));
    } else if (!officialPacksEnabled) {
      setMarketCards([]);
      setOwnedPackIdList([]);
      setCommunityOwnedIdList([]);
      setMarketPackCatalog([]);
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
    _savedCardsCacheByTarget[flashcardsTarget] = mappedSavedQuick;
    _customCardsCacheByTarget[flashcardsTarget] = custom;
    setSavedCards(mappedSavedQuick);
    setCustomCards(custom);
    setLoadError(false);
    if (!mustDelayForEmptyMarketOnly) setLoading(false);

    // Міграція UK / транскрипції (важка) і маркет — паралельно; `setMarketCards` не чекає міграції
    // (інакше платні картки з\'являються пізніше за «Збережені» / порожній список).
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
          await saveFlashcards(migratedLocal, studyTarget);
        }
        const mappedAfter = migratedLocal.map(savedToCard);
        _savedCardsCacheByTarget[flashcardsTarget] = mappedAfter;
        setSavedCards(mappedAfter);
        return migratedLocal;
    })();

    const marketPromise = (async () => {
      if (!officialPacksEnabled) {
        setOwnedPackIdList([]);
        setCommunityOwnedIdList([]);
        setMarketPackCatalog([]);
        setMarketCards([]);
        return {
          ownedIds: [] as string[],
          marketPacks: [] as FlashcardMarketPack[],
          communityOwnedIds: [] as string[],
          communityPublished: [] as FlashcardMarketPack[],
          activePackId: null as string | null,
        };
      }
      const [ownedIds, marketPacks, communityOwnedIds, communityPublished, activePackIdRaw] = await Promise.all([
        loadAccessiblePackIds(studyTarget),
        loadMarketplacePacks(studyTarget, lang),
        communityPacksEnabled ? loadCommunityOwnedPackIds(studyTarget).catch((): string[] => []) : Promise.resolve([] as string[]),
        communityPacksEnabled ? loadPublishedCommunityMarketPacks(studyTarget).catch((): FlashcardMarketPack[] => []) : Promise.resolve([] as FlashcardMarketPack[]),
        isDevMarketEnabled ? consumeDevActivePack(studyTarget) : Promise.resolve(null as string | null),
      ]);
      setOwnedPackIdList(ownedIds);
      setCommunityOwnedIdList(communityOwnedIds);
      const mergedCatalog: FlashcardMarketPack[] = [...marketPacks];
      const seenCat = new Set(marketPacks.map((p) => p.id));
      for (const cp of communityPublished) {
        if (!seenCat.has(cp.id)) {
          seenCat.add(cp.id);
          mergedCatalog.push(cp);
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
      const communityCardLists = await Promise.all(
        communityIdsToLoad.map((id) => fetchCommunityPackCards(id, studyTarget).catch((): CardItem[] => [])),
      );
      const builtMarket = [...officialBuilt, ...communityCardLists.flat()];
      setMarketCards(builtMarket);
      void saveBuiltMarketplaceCardsCache([...ownedIds, ...communityIdsToLoad].sort(), builtMarket, studyTarget, lang);
      if (mustDelayForEmptyMarketOnly) setLoading(false);
      return {
        ownedIds,
        marketPacks,
        communityOwnedIds,
        communityPublished,
        activePackId: activePackIdRaw as string | null,
      };
    })();

    const [migrated, { ownedIds, communityOwnedIds, communityPublished, activePackId: activePackId }] = await Promise.all([
      migrationPromise,
      marketPromise,
    ]);
    if (!hintSeen && migrated.length > 0) {
      setShowDeleteHint(true);
    }
    const rc = routeCatRef.current;
    if (isDevMarketEnabled && activePackId && ownedIds.includes(activePackId)) {
      pendingRestoreRef.current = { cat: 'custom', idx: 0 };
      setActiveCat('custom');
      router.setParams({ cat: 'custom' } as any);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Открыт купленный DEV-набор в карточках.',
          uk: 'Відкрито придбаний DEV-набір у картках.',
          es: 'Pack DEV comprado abierto en Tarjetas.',
          'pt-BR': 'Pack DEV comprado aberto em Cartões.',
          vi: 'Đã mở pack DEV đã mua trong Thẻ.',
          id: 'Pack DEV yang dibeli dibuka di Kartu.',
          tr: 'Satın alınan DEV paketi Kartlar içinde açıldı.',
          pl: 'Kupiony pakiet DEV otwarto w Kartach.',
        }),
      );
    } else if (!rc && progressParsed) {
      pendingRestoreRef.current = { cat: progressParsed.cat as CategoryId, idx: progressParsed.idx };
      setActiveCat(progressParsed.cat as CategoryId);
    } else if (rc && progressParsed && progressParsed.cat === rc) {
      pendingRestoreRef.current = { cat: rc, idx: progressParsed.idx };
    } else {
      pendingRestoreRef.current = null;
    }
    const deepPack = packRouteRef.current;
    if (deepPack) {
      const deepMeta = communityPublished.find((p) => p.id === deepPack);
      const isAuthorOfDeep =
        !!userSid &&
        !!deepMeta?.isCommunityUgc &&
        deepMeta.authorStableId === userSid;
      if (ownedIds.includes(deepPack) || communityOwnedIds.includes(deepPack) || isAuthorOfDeep) {
        pendingRestoreRef.current = null;
        setActiveCat('custom');
      }
    }
    } catch {
      setLoading(false);
      setOwnedPackIdList([]);
      setCommunityOwnedIdList([]);
      setLoadError(true);
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Карточки не загрузились. Попробуй позже.',
          uk: 'Не вдалося завантажити картки.',
          es: 'No se pudieron cargar las tarjetas.',
          'pt-BR': 'Não foi possível carregar os cartões.',
          vi: 'Không thể tải thẻ.',
          id: 'Gagal memuat kartu.',
          tr: 'Kartlar yüklenemedi.',
          pl: 'Nie udało się załadować kart.',
        }),
      );
    } finally {
      setCollectionDataReady(true);
    }
  }, [communityPacksEnabled, flashcardsTarget, isDevMarketEnabled, officialPacksEnabled, router, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      sessionDoneRef.current = false;
      flashAchievementSeenRef.current.clear();
      let cancelled = false;
      const run = () => {
        if (!cancelled) void loadAll();
      };
      /** `?pack=` — без відкладення після анімацій: інакше один-два кадри з порожнім списком. */
      if (packDeeplink) {
        run();
      } else {
        InteractionManager.runAfterInteractions(run);
      }
      return () => {
        cancelled = true;
      };
    }, [loadAll, packDeeplink]),
  );

  // Deep link /flashcards_collection?pack=… — доступ: куплено, автор UGC, або картки вже підготовлені в хабі (staging).
  useEffect(() => {
    if (!collectionDataReady) return;
    const pid = packDeeplink;
    if (!pid) return;
    const known = marketPackCatalog.some((p) => p.id === pid);
    if (!known) {
      router.replace('/flashcards' as any);
      return;
    }
    const packMeta = marketPackCatalog.find((p) => p.id === pid);
    const isAuthorUgc =
      !!packMeta?.isCommunityUgc &&
      !!packMeta.authorStableId &&
      !!accessStableId &&
      packMeta.authorStableId === accessStableId;
    const stagedFromHub = getStagedNavigationPackId() === pid;
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
          uk: 'Набір ще не куплено. Його можна відкрити за уламки в магазині (вкладка з наборами карток).',
          es: 'Aún no has comprado este pack. Puedes obtenerlo por fragmentos en la tienda (pestaña de packs de Tarjetas).',
          'pt-BR': 'Este pack ainda não foi comprado. Você pode abri-lo por fragmentos na loja (aba de packs de Cartões).',
          vi: 'Bạn chưa mua pack này. Bạn có thể mở bằng mảnh trong cửa hàng (tab pack Thẻ).',
          id: 'Pack ini belum dibeli. Kamu bisa membukanya dengan shard di toko (tab pack Kartu).',
          tr: 'Bu paket henüz satın alınmadı. Mağazada parçalarla açabilirsin (Kart paketleri sekmesi).',
          pl: 'Ten pakiet nie został jeszcze kupiony. Możesz otworzyć go za odłamki w sklepie (zakładka pakietów Kart).',
        }),
      );
      router.replace('/flashcards' as any);
    }
  }, [
    collectionDataReady,
    packDeeplink,
    marketPackCatalog,
    ownedPackIdList,
    communityOwnedIdList,
    accessStableId,
    router,
  ]);

  // ── Category / pack changes reset position + flips. Data refreshes must not undo a user's flip.
  useEffect(() => {
    setIndex(0);
    resetCardFlipState();
  }, [activeCat, packDeeplink, resetCardFlipState]);

  // ── Data-dependent filter sync. Runs on async card refresh, but intentionally preserves flip state.
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
  }, [activeCat, cards, packDeeplink]);

  // ── Restore saved scroll index after async cards load without resetting any already-flipped card.
  useEffect(() => {
    const restore = pendingRestoreRef.current;
    if (!restore || restore.cat !== activeCat || loading) return;
    const safeIdx = Math.min(restore.idx, Math.max(0, cards.length - 1));
    pendingRestoreRef.current = null;
    setIndex(safeIdx);
  }, [activeCat, cards.length, loading]);

  // ── User changed filter: go to first card in filtered list
  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
  }, [activeFilter, flipAnim]);

  // ── Persist progress so it survives tab switches ───────────────────────────
  useEffect(() => {
    if (loading) return;
    writeFlashcardsProgress({ cat: activeCat, idx: index }, studyTarget).catch(() => {});
  }, [index, activeCat, loading, studyTarget]);

  // ── (removed: old single-active-card reset on scroll — each card now has independent flip state) ──

  const getCardFlipAnim = useCallback((cardId: string) => {
    if (!cardFlipAnims.current[cardId]) {
      cardFlipAnims.current[cardId] = new Animated.Value(0);
    }
    return cardFlipAnims.current[cardId];
  }, []);

  const getOverlayAnim = useCallback((cardId: string) => {
    if (!overlayAnims.current[cardId]) {
      overlayAnims.current[cardId] = new Animated.Value(0);
    }
    return overlayAnims.current[cardId];
  }, []);

  const getDeleteAnim = useCallback((cardId: string) => {
    if (!cardDeleteAnims.current[cardId]) {
      cardDeleteAnims.current[cardId] = { opacity: new Animated.Value(1), scale: new Animated.Value(1) };
    }
    return cardDeleteAnims.current[cardId];
  }, []);

  // ── Delete hint onboarding ────────────────────────────────────────────────
  const dismissDeleteHint = useCallback(() => {
    if (deleteHintTimer.current) clearTimeout(deleteHintTimer.current);
    if (deleteHintPulseLoop.current) deleteHintPulseLoop.current.stop();
    Animated.timing(deleteHintAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setShowDeleteHint(false);
      AsyncStorage.setItem(flashcardsDeleteHintSeenKey(studyTarget), '1');
    });
  }, [deleteHintAnim, deleteHintPulseLoop, studyTarget]);

  useEffect(() => {
    if (!showDeleteHint) return;
    // Fade in
    Animated.timing(deleteHintAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      // Start pulse loop after fade-in
      deleteHintPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(deleteHintPulse, { toValue: 1.025, duration: 700, useNativeDriver: true }),
          Animated.timing(deleteHintPulse, { toValue: 1,     duration: 700, useNativeDriver: true }),
        ])
      );
      deleteHintPulseLoop.current.start();
    });
    // Auto-dismiss after 5s
    deleteHintTimer.current = setTimeout(() => dismissDeleteHint(), 5000);
    return () => {
      if (deleteHintTimer.current) clearTimeout(deleteHintTimer.current);
      if (deleteHintPulseLoop.current) deleteHintPulseLoop.current.stop();
    };
  }, [showDeleteHint, deleteHintAnim, deleteHintPulse, dismissDeleteHint]);

  // ── Overlay animation ─────────────────────────────────────────────────────
  const prevLongPressedId = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevLongPressedId.current;
    prevLongPressedId.current = longPressedId;

    // Hide previous overlay
    if (prev !== null && overlayAnims.current[prev]) {
      Animated.timing(overlayAnims.current[prev], { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
    // Show new overlay
    if (longPressedId !== null) {
      const anim = getOverlayAnim(longPressedId);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 140 }).start();
    }
  }, [getOverlayAnim, longPressedId]);

  // ── Unified delete pipeline ────────────────────────────────────────────────
  const deleteCardById = useCallback(async (cardId: string, backupIdx?: number) => {
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    try {
      if (target.categoryId === 'saved') {
        await removeFlashcard(target.id, studyTarget);
        setSavedCards((prev) => prev.filter((c) => c.id !== target.id));
      } else if (target.categoryId === 'custom') {
        const updatedCustom = customCards.filter((c) => c.id !== target.id);
        await writeCustomCards(updatedCustom, studyTarget);
        setCustomCards(updatedCustom);
      }
      const updated = cards.filter((c) => c.id !== target.id);
      setIndex((prev) => {
        const base = typeof backupIdx === 'number' ? backupIdx : prev;
        return Math.max(0, Math.min(base, updated.length - 1));
      });
      setIsFlipped(false);
      flipAnim.setValue(0);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Карточка удалена.',
          uk: 'Картку видалено.',
          es: 'Tarjeta eliminada.',
          'pt-BR': 'Cartão removido.',
          vi: 'Đã xóa thẻ.',
          id: 'Kartu dihapus.',
          tr: 'Kart silindi.',
          pl: 'Karta usunięta.',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Карточка не удалилась. Попробуй снова.',
          uk: 'Не вдалося видалити картку.',
          es: 'No se pudo eliminar la tarjeta.',
          'pt-BR': 'Não foi possível remover o cartão.',
          vi: 'Không thể xóa thẻ.',
          id: 'Gagal menghapus kartu.',
          tr: 'Kart silinemedi.',
          pl: 'Nie udało się usunąć karty.',
        }),
      );
    }
  }, [cards, customCards, flipAnim, studyTarget]);

  // ── Delete with animation ──────────────────────────────────────────────────
  const handleDeleteCard = useCallback(async (item: CardItem, itemIdx: number) => {
    const anim = getDeleteAnim(item.id);
    anim.opacity.setValue(1);
    anim.scale.setValue(1);
    setDeletingId(item.id);
    setLongPressedId(null);

    // Flash white → scale up → fade out
    Animated.sequence([
      Animated.timing(anim.scale,   { toValue: 1.06, duration: 80,  useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(anim.scale,   { toValue: 1.18, duration: 260, useNativeDriver: true }),
        Animated.timing(anim.opacity, { toValue: 0,    duration: 280, useNativeDriver: true }),
      ]),
    ]).start(async () => {
      await deleteCardById(item.id, itemIdx);
      setDeletingId(null);
    });
  }, [deleteCardById, getDeleteAnim]);

  const handleFlipCard = useCallback((cardId: string) => {
    const cardAnim = getCardFlipAnim(cardId);
    if (!cardAnim) return;
    const isNowFlipped = cardFlippedState.current[cardId] ?? false;
    const toValue = isNowFlipped ? 0 : 1;
    cardFlippedState.current[cardId] = !isNowFlipped;
    Animated.timing(cardAnim, {
      toValue,
      duration: FLASHCARD_FLIP_DURATION_MS,
      easing: flashcardFlipEasing,
      useNativeDriver: true,
    }).start();
    // Трекинг: только при переворачивании (не возврате). flashcard_view — один раз на карточку за сессию (как при скролле).
    if (!isNowFlipped) {
      const set = flashcardDailyViewCountedRef.current;
      const isNewView = !set.has(cardId);
      if (isNewView) set.add(cardId);
      const updates: Parameters<typeof updateMultipleTaskProgress>[0] = [{ type: 'flashcard_flip', increment: 1 }];
      if (isNewView) updates.push({ type: 'flashcard_view', increment: 1 });
      updateMultipleTaskProgress(updates, { studyTarget }).catch(() => {});
      checkAchievements({ type: 'flashcard_flipped', count: 1, studyTarget }).catch(() => {});
      if (isNewView) checkAchievements({ type: 'flashcard_viewed', count: 1, studyTarget }).catch(() => {});
    }
  }, [getCardFlipAnim, studyTarget]);

  // ── Flip all cards simultaneously ─────────────────────────────────────────
  const handleFlipAll = useCallback(() => {
    const toValue = allFlipped ? 0 : 1;
    const timingCfg = {
      duration: FLASHCARD_FLIP_DURATION_MS,
      easing: flashcardFlipEasing,
      useNativeDriver: true as const,
    };
    setAllFlipped(!allFlipped);
    setIsFlipped(toValue === 1);

    (filteredCards ?? []).forEach((card, i) => {
      const anim = getCardFlipAnim(card.id);
      Animated.timing(anim, { toValue, ...timingCfg }).start();
      if (i === index) Animated.timing(flipAnim, { toValue, ...timingCfg }).start();
    });
  }, [allFlipped, filteredCards, flipAnim, getCardFlipAnim, index]);

  // ── Filter options — must be before any early return ─────────────────────
  // Two-level: group -> items. Used for rendering the dropdown.
  const filterGroups: FilterGroup[] = useMemo(
    () => buildFilterGroups(cards, activeCat, strLang),
    [cards, activeCat, strLang],
  );

  // Flat list still needed for "find label by key".
  const filterOptions: { key: string; label: string }[] = useMemo(
    () => buildFilterOptions(filterGroups, strLang),
    [filterGroups, strLang],
  );

  const headerTitle = useMemo(() => {
    if (packDeeplink && marketPackCatalog.length > 0) {
      const p = marketPackCatalog.find((x) => x.id === packDeeplink);
      if (p) return packTitleForInterface(p, lang);
    }
    const cat = CATEGORIES.find((c) => c.id === activeCat);
    const full = cat == null ? undefined : fullCategoryLabelForLang(cat, lang);
    return full ?? s.title;
  }, [packDeeplink, marketPackCatalog, lang, activeCat, s.title]);

  // ── Scroll to card when category switches ─────────────────────────────────
  useEffect(() => {
    if (flatListRef.current) {
      (flatListRef.current as any).scrollToOffset({ offset: 0, animated: false });
    }
  }, [activeCat, packDeeplink]);

  const handleSave = async () => {
    if (!draftTR.trim()) return;
    Keyboard.dismiss();
    // ARCHITECTURE RULE: each field stores only its own language.
    // When editing in UK mode, only `uk` is updated; `ru` is preserved from existing card.
    // When editing in RU mode, only `ru` is updated; `uk` is preserved from existing card.
    // When editing in ES mode, only `es` is updated; `ru` / `uk` are preserved.
    const existing = editingId ? customCards.find(c => c.id === editingId) : undefined;
    const descTrim = draftDescription.trim();
    const localizedFields = customCardLocalizationForLang(lang, draftTR.trim(), existing);
    const newCard = {
      id: editingId ?? `custom_${Date.now()}`,
      en: draftEN.trim(),
      description: descTrim.length > 0 ? descTrim : undefined,
      categoryId: 'custom',
      isSystem: false,
    } as CardItem;
    newCard.ru = localizedFields.baseRu;
    newCard.uk = localizedFields.baseUk;
    newCard.es = localizedFields.baseEs;
    newCard.sourceLocales = localizedFields.plannedSourceLocales;
    let updated: CardItem[];
    if (editingId) {
      updated = customCards.map(c => c.id === editingId ? newCard : c);
    } else {
      updated = [...customCards, newCard];
    }
    try {
      await writeCustomCards(updated, studyTarget);
      setCustomCards(updated);
      slideAnim.setValue(0);
      setActiveCat('custom');
      router.setParams({ cat: 'custom' } as any);
      setMode('view');
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: editingId ? 'Карточка обновлена.' : 'Карточка сохранена.',
          uk: editingId ? 'Картку оновлено.' : 'Картку збережено.',
          es: editingId ? 'Tarjeta actualizada.' : 'Tarjeta guardada.',
          'pt-BR': editingId ? 'Cartão atualizado.' : 'Cartão salvo.',
          vi: editingId ? 'Đã cập nhật thẻ.' : 'Đã lưu thẻ.',
          id: editingId ? 'Kartu diperbarui.' : 'Kartu disimpan.',
          tr: editingId ? 'Kart güncellendi.' : 'Kart kaydedildi.',
          pl: editingId ? 'Karta zaktualizowana.' : 'Karta zapisana.',
        }),
      );
    } catch {
      emitAppEvent(
        'action_toast',
        actionToastTri('error', {
          ru: 'Карточка не сохранилась. Повтори попытку.',
          uk: 'Не вдалося зберегти картку.',
          es: 'No se pudo guardar la tarjeta.',
          'pt-BR': 'Não foi possível salvar o cartão.',
          vi: 'Không thể lưu thẻ.',
          id: 'Gagal menyimpan kartu.',
          tr: 'Kart kaydedilemedi.',
          pl: 'Nie udało się zapisać karty.',
        }),
      );
    }
  };

  const cancelCreate = useCallback(() => {
    setMode('view');
    setCreateStep('front');
    setDraftDescription('');
    createFlipAnim.setValue(0);
  }, [createFlipAnim]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (filterOpen) {
        setFilterOpen(false);
        return true;
      }
      if (mode === 'create' || mode === 'edit') {
        cancelCreate();
        return true;
      }
      leaveCollection();
      return true;
    });
    return () => sub.remove();
  }, [mode, filterOpen, leaveCollection, cancelCreate]);

  // ── Create / Edit mode ────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const canSave = draftEN.trim().length > 0 && draftTR.trim().length > 0;
    return (
      <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView style={[st.safe, { backgroundColor: 'transparent' }]} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <KeyboardAvoidingView style={{ flex:1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>

          {/* Header */}
          <View style={[st.header, { borderBottomColor: t.border, paddingTop: topSafeInset + 12 }]}>
            <TouchableOpacity activeOpacity={0.75} onPress={cancelCreate} style={{ width: 40 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={26} color={t.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {mode === 'edit' ? s.editCard : s.newCard}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Form */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 20 }}>

            {/* EN field */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight:'700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {s.editFront}
              </Text>
              <TextInput
                style={{
                  backgroundColor: t.bgSurface,
                  borderWidth: 1.5,
                  borderColor: createStep === 'front' ? t.accent : t.border,
                  borderRadius: 14,
                  paddingHorizontal: 18, paddingVertical: 16,
                  color: t.textPrimary, fontSize: f.body + 2, fontWeight:'600',
                }}
                placeholder={s.enterEN}
                placeholderTextColor={t.textGhost}
                value={draftEN}
                onChangeText={setDraftEN}
                autoFocus={mode === 'create'}
                returnKeyType="next"
                onSubmitEditing={() => backInputRef.current?.focus()}
                blurOnSubmit={false}
                maxLength={80}
                onFocus={() => setCreateStep('front')}
              />
            </View>

            {/* Translation field */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight:'700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {s.editBack}
              </Text>
              <TextInput
                ref={backInputRef}
                style={{
                  backgroundColor: t.bgSurface,
                  borderWidth: 1.5,
                  borderColor: createStep === 'back' ? t.accent : t.border,
                  borderRadius: 14,
                  paddingHorizontal: 18, paddingVertical: 16,
                  color: t.textPrimary, fontSize: f.body + 2, fontWeight:'600',
                }}
                placeholder={s.enterRU}
                placeholderTextColor={t.textGhost}
                value={draftTR}
                onChangeText={setDraftTR}
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                blurOnSubmit={false}
                maxLength={80}
                onFocus={() => setCreateStep('back')}
              />
            </View>

            {/* Optional description */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight:'700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {s.editDescription}
              </Text>
              <TextInput
                ref={descriptionInputRef}
                style={{
                  backgroundColor: t.bgSurface,
                  borderWidth: 1.5,
                  borderColor: createStep === 'description' ? t.accent : t.border,
                  borderRadius: 14,
                  paddingHorizontal: 18, paddingVertical: 16,
                  color: t.textPrimary, fontSize: f.body, fontWeight:'500',
                }}
                placeholder={s.enterDescription}
                placeholderTextColor={t.textGhost}
                value={draftDescription}
                onChangeText={setDraftDescription}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                blurOnSubmit
                maxLength={220}
                multiline
                onFocus={() => setCreateStep('description')}
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: canSave ? t.accent : t.bgSurface,
                borderWidth: canSave ? 0 : 1, borderColor: t.border,
                borderRadius: 14, paddingVertical: 16, marginTop: 8,
              }}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={canSave ? t.correctText : t.textGhost} style={{ marginRight: 8 }} />
              <Text style={{ color: canSave ? t.correctText : t.textGhost, fontSize: f.body, fontWeight:'700' }}>
                {s.save}
              </Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!loading && filteredCards.length === 0) return (
    <ScreenGradient artBackdrop="flashcards">
    <SafeAreaView style={[st.safe, { backgroundColor: 'transparent' }]} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <ContentWrap>
        <View style={[st.header, { borderBottomColor: t.border, paddingTop: topSafeInset + 12 }]}>
          <TapScale testID="flashcards-header-back" accessibilityLabel="qa-flashcards-header-back" accessible onPress={leaveCollection} style={{ width: 40 }} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TapScale>
          <Text
            style={[st.headerTitle, { color: t.textPrimary, fontSize: collectionHeaderTitleFontSize, flex: 1, minWidth: 0, textAlign: 'center', paddingHorizontal: 4 }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {headerTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.centerState}>
          <Ionicons name={activeCat === 'custom' ? 'pencil-outline' : 'bookmark-outline'} size={56} color={t.textGhost} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight:'700', marginTop: 12 }}>{s.empty}</Text>
          {loadError && (
            <TouchableOpacity
              onPress={loadAll}
              style={{ marginTop: 16, backgroundColor: t.bgSurface, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, borderWidth: 1, borderColor: t.border }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Повторить',
                  uk: 'Повторити',
                  es: 'Reintentar',
                  'pt-BR': 'Tentar novamente',
                  vi: 'Thử lại',
                  id: 'Coba lagi',
                  tr: 'Tekrar dene',
                  pl: 'Spróbuj ponownie',
                })}
              </Text>
            </TouchableOpacity>
          )}
          {activeCat === 'custom' && allowAddCustomCard && (
            <TouchableOpacity
              onPress={() => { setDraftEN(''); setDraftTR(''); setDraftDescription(''); setEditingId(null); setCreateStep('front'); createFlipAnim.setValue(0); setMode('create'); }}
              style={{ marginTop: 24, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
            >
              <Text style={{ color: t.correctText, fontWeight:'700', fontSize: f.body }}>
                {triLang(lang, {
                  ru: '+ Создать первую карточку',
                  uk: '+ Створити першу картку',
                  es: '+ Crear la primera tarjeta',
                  'pt-BR': '+ Criar o primeiro cartão',
                  vi: '+ Tạo thẻ đầu tiên',
                  id: '+ Buat kartu pertama',
                  tr: '+ İlk kartı oluştur',
                  pl: '+ Utwórz pierwszą kartę',
                })}
              </Text>
            </TouchableOpacity>
          )}
          {activeCat === 'custom' && communityPacksEnabled && CLOUD_SYNC_ENABLED && !IS_EXPO_GO && (
            <TouchableOpacity
              onPress={() => router.push('/community_pack_create' as any)}
              style={{ marginTop: 14, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 1, borderColor: t.accent }}
            >
              <Text style={{ color: t.accent, fontWeight: '700', fontSize: f.body }}>
                {triLang(lang, { ru: '+ Создать набор', uk: '+ Створити набір', es: '+ Crear pack', 'pt-BR': '+ Criar pacote', vi: '+ Tạo bộ thẻ', id: '+ Buat paket', tr: '+ Paket oluştur', pl: '+ Utwórz zestaw' })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ContentWrap>
      {isDevMarketEnabled && (
        <TouchableOpacity
              onPress={() => router.push(FLASHCARDS_MARKET_DEV_ROUTE as any)}
          style={{
            position: 'absolute',
            right: 14,
            bottom: Math.max(bottomInset, 8) + 20,
            zIndex: 60,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${t.accent}66`,
            backgroundColor: `${t.accent}1F`,
            paddingHorizontal: 10,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="storefront-outline" size={14} color={t.accent} />
          <Text style={{ fontSize: f.caption, color: t.accent, fontWeight: '800' }}>DEV MARKET</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
    </ScreenGradient>
  );

  return (
    <ScreenGradient artBackdrop="flashcards">
    <SafeAreaView style={[st.safe, { backgroundColor: 'transparent' }]} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={[st.header, { borderBottomColor: t.border, paddingTop: topSafeInset + 12 }]}>
          <TapScale testID="flashcards-header-back" accessibilityLabel="qa-flashcards-header-back" accessible onPress={leaveCollection} style={{ width: 40 }} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TapScale>
          <Text
            style={[st.headerTitle, { color: t.textPrimary, fontSize: collectionHeaderTitleFontSize, flex: 1, minWidth: 0, textAlign: 'center', paddingHorizontal: 4 }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {headerTitle}
          </Text>
          <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 8, flexShrink: 0 }}>
            {isDevMarketEnabled && (
              <TouchableOpacity
                onPress={() => router.push(FLASHCARDS_MARKET_DEV_ROUTE as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: `${t.accent}66`,
                  backgroundColor: `${t.accent}1A`,
                }}
              >
                <Ionicons name="flask-outline" size={12} color={t.accent} />
                <Text style={{ fontSize: f.caption, color: t.accent, fontWeight: '700' }}>DEV</Text>
              </TouchableOpacity>
            )}
            {savedBtnsVisible && activeCat !== 'custom' && filterOptions.length > 0 && (
              <View>
                <View style={{ position: 'relative' }}>
                  <TouchableOpacity
                    onPress={() => setFilterOpen(o => !o)}
                    hitSlop={{ top:8,bottom:8,left:8,right:8 }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 12, borderWidth: 1,
                      borderColor: activeFilter !== 'all' ? t.accent : t.border,
                      backgroundColor: activeFilter !== 'all' ? t.accent + '18' : 'transparent',
                    }}
                  >
                    <Ionicons name="filter-outline" size={12} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
                    <Text style={{ fontSize: f.caption, fontWeight: '600', color: activeFilter !== 'all' ? t.accent : t.textSecond }}>
                      {activeFilter === 'all'
                        ? triLang(lang, { ru: 'Фильтр', uk: 'Фільтр', es: 'Filtro', 'pt-BR': 'Filtro', vi: 'Bộ lọc', id: 'Filter', tr: 'Filtre', pl: 'Filtr' })
                        : (filterOptions.find(o => o.key === activeFilter)?.label ??
                            triLang(lang, { ru: 'Фильтр', uk: 'Фільтр', es: 'Filtro', 'pt-BR': 'Filtro', vi: 'Bộ lọc', id: 'Filter', tr: 'Filtre', pl: 'Filtr' }))}
                    </Text>
                    <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={10} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Slide wrapper — clips and drives category-switch slide transition */}
        <View
          style={{ flex: 1, overflow: 'hidden' }}
          onStartShouldSetResponder={() => longPressedId !== null}
          onResponderGrant={() => setLongPressedId(null)}
        >
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>

        {/* Add card — лише власні картки; не в режимі перегляду купленого паку з маркету */}
        {activeCat === 'custom' && allowAddCustomCard && (
          <TouchableOpacity
            onPress={() => { setDraftEN(''); setDraftTR(''); setDraftDescription(''); setEditingId(null); setCreateStep('front'); createFlipAnim.setValue(0); setMode('create'); }}
            activeOpacity={0.8}
            style={{
              marginHorizontal: 16, marginTop: 10, marginBottom: 4,
              paddingVertical: 14, paddingHorizontal: 20,
              borderRadius: 14, backgroundColor: t.accent,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={t.correctText} />
            <Text style={{ fontSize: f.body, fontWeight: '700', color: t.correctText }}>
              {triLang(lang, { ru: 'Добавить карточку', uk: 'Додати картку', es: 'Añadir tarjeta', 'pt-BR': 'Adicionar cartão', vi: 'Thêm thẻ', id: 'Tambah kartu', tr: 'Kart ekle', pl: 'Dodaj kartę' })}
            </Text>
          </TouchableOpacity>
        )}

        {filteredCards.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4 }}>
          <TouchableOpacity
            onPress={openSwipeGame}
            activeOpacity={0.82}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={{
              flex: 1,
              minHeight: 48,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 15,
              borderWidth: 1,
              borderColor: t.accent,
              backgroundColor: t.bgCard,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            accessibilityLabel={triLang(lang, {
              ru: 'Тренироваться с карточками',
              uk: 'Тренуватися з картками',
              es: 'Practicar con tarjetas',
              'pt-BR': 'Praticar com cartões',
              vi: 'Luyện tập với thẻ',
              id: 'Berlatih dengan kartu',
              tr: 'Kartlarla pratik yap',
              pl: 'Ćwicz z fiszkami',
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles-outline" size={18} color={t.textSecond} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}
                >
                  {triLang(lang, {
                    ru: 'Тренировать',
                    uk: 'Тренувати',
                    es: 'Practicar',
                    'pt-BR': 'Praticar',
                    vi: 'Luyện tập',
                    id: 'Berlatih',
                    tr: 'Pratik',
                    pl: 'Ćwicz',
                  })}
                </Text>
              </View>
              {!isPremium && (
                <PlusBadge themeMode={themeMode} size="xs" showIcon={false} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openAudioMode}
            activeOpacity={0.82}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={{
              flex: 1,
              minHeight: 48,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 15,
              borderTopWidth: 1,
              borderTopColor: glassFill(t.accent, 0.14),
              backgroundColor: glassFill(t.bgSurface, 0.46),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            accessibilityLabel={triLang(lang, {
              ru: 'Слушать карточки автоматически',
              uk: 'Слухати картки автоматично',
              es: 'Escuchar tarjetas automáticamente',
              'pt-BR': 'Ouvir cartões automaticamente',
              vi: 'Nghe thẻ tự động',
              id: 'Dengarkan kartu otomatis',
              tr: 'Kartları otomatik dinle',
              pl: 'Słuchaj fiszek automatycznie',
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  borderColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="headset-outline" size={18} color={t.textMuted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}
                >
                  {triLang(lang, {
                    ru: 'Слушать',
                    uk: 'Слухати',
                    es: 'Escuchar',
                    'pt-BR': 'Ouvir',
                    vi: 'Nghe',
                    id: 'Dengar',
                    tr: 'Dinle',
                    pl: 'Słuchaj',
                  })}
                </Text>
              </View>
              {!isPremium && (
                <PlusBadge themeMode={themeMode} size="xs" showIcon={false} />
              )}
            </View>
          </TouchableOpacity>
          </View>
        )}

        {/* Flip all — у режимі купленого паку: спокійна друкарська кнопка, без "кислотного" лайму */}
        {filteredCards.length > 0 &&
          (packPremiumVisual ? (
            <TouchableOpacity
              onPress={handleFlipAll}
              activeOpacity={0.88}
              style={{
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 4,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: allFlipped ? packPremiumVisual.borderAccent : `${packPremiumVisual.borderAccent}55`,
                backgroundColor: t.bgCard,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              <Ionicons name="sync-outline" size={16} color={t.textSecond} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.textPrimary }}>
                {triLang(lang, { ru: 'Развернуть все', uk: 'Розгорнути всі', es: 'Desplegar todas', 'pt-BR': 'Virar todas', vi: 'Lật tất cả', id: 'Balik semua', tr: 'Hepsini çevir', pl: 'Odwróć wszystkie' })}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFlipAll}
              style={{
                marginHorizontal: 16, marginTop: 8, marginBottom: 4,
                paddingVertical: 8, paddingHorizontal: 16,
                borderRadius: 20, borderWidth: 1,
                borderColor: allFlipped ? t.accent : t.border,
                backgroundColor: allFlipped ? t.accent + '18' : 'transparent',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Ionicons name="sync-outline" size={15} color={allFlipped ? t.accent : t.textSecond} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: allFlipped ? t.accent : t.textSecond }}>
                {triLang(lang, { ru: 'Развернуть все', uk: 'Розгорнути всі', es: 'Desplegar todas', 'pt-BR': 'Virar todas', vi: 'Lật tất cả', id: 'Balik semua', tr: 'Hepsini çevir', pl: 'Odwróć wszystkie' })}
              </Text>
            </TouchableOpacity>
          ))}

        {/* DEV: reset and show hint button */}
        {IS_EXPO_GO && !showDeleteHint && (
          <TouchableOpacity
            onPress={() => {
              AsyncStorage.removeItem(flashcardsDeleteHintSeenKey(studyTarget));
              deleteHintAnim.setValue(0);
              setShowDeleteHint(true);
            }}
            style={{ alignSelf: 'flex-end', marginRight: 16, marginBottom: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FF6B00' }}
          >
            <Text style={{ fontSize: 9, color: '#FF6B00', fontWeight: '800' }}>
              {triLang(lang, { ru: 'DEV: показать подсказку', uk: 'DEV: показати підказку', es: 'DEV: mostrar ayuda', 'pt-BR': 'DEV: mostrar dica', vi: 'DEV: hiện gợi ý', id: 'DEV: tampilkan petunjuk', tr: 'DEV: ipucunu göster', pl: 'DEV: pokaż wskazówkę' })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete hint — one-time onboarding tip */}
        {showDeleteHint && (
          <Animated.View style={{
            opacity: deleteHintAnim,
            transform: [
              { translateY: deleteHintAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              { scale: deleteHintPulse },
            ],
            marginHorizontal: 16, marginTop: 8, marginBottom: 4,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: t.bgSurface,
            borderRadius: 12, borderWidth: 1, borderColor: t.border,
            paddingHorizontal: 14, paddingVertical: 10,
          }}>
            <Ionicons name="hand-left-outline" size={18} color={t.textSecond} />
            <Text style={{ flex: 1, color: t.textSecond, fontSize: f.sub, lineHeight: 18 }}>
              {triLang(lang, {
                ru: 'Зажмите карточку чтобы удалить её',
                uk: 'Затисніть картку, щоб видалити її',
                es: 'Mantén pulsada la tarjeta para eliminarla',
                'pt-BR': 'Segure o cartão para excluí-lo',
                vi: 'Nhấn giữ thẻ để xóa',
                id: 'Tekan lama kartu untuk menghapusnya',
                tr: 'Kartı silmek için basılı tut',
                pl: 'Przytrzymaj kartę, aby ją usunąć',
              })}
            </Text>
            <TouchableOpacity activeOpacity={0.75} onPress={dismissDeleteHint} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color={t.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Card list: virtualized list with snapping */}
        {(() => {
          /** Нижний «хвост» — чтобы последнюю картку можно было прокрутить к центру; верх — не centering-padding,
           * иначе scrollViewH − CARD_H даёт 200+ px пустоты под кнопкою «Розгорнути всі» на старті. */
          const listPadTop = 12;
          const listPadBottom = scrollViewH > 0 ? Math.max(12, scrollViewH - CARD_H - 12 - PEEK) : 20;
          return (
        <View ref={listViewportRef} collapsable={false} style={{ flex: 1 }} onLayout={(e) => setScrollViewH(e.nativeEvent.layout.height)}>
        <FlashList
          ref={flatListRef as any}
          style={{ flex: 1 }}
          data={filteredCards}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index: itemIdx }) => {
            const cardEl = (
              <FlashcardListItem
                item={item}
                itemIdx={itemIdx}
                lang={cardContentLang}
                activeCat={activeCat}
                isPremium={isPremium}
                deletingId={deletingId}
                longPressedId={longPressedId}
                t={t}
                f={f}
                themeMode={themeMode}
                sourceLabels={s.source as Record<string, string>}
                deleteLabel={s.delete}
                voiceLabel={triLang(lang, { ru: 'Озвучить', uk: 'Озвучити', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Odsłuchaj' })}
                premiumExpiredTitle={triLang(lang, {
                  ru: 'Плюс истёк',
                  uk: 'Плюс закінчився',
                  es: 'Plus caducado',
                  'pt-BR': 'Plus expirou',
                  vi: 'Plus đã hết hạn',
                  id: 'Plus kedaluwarsa',
                  tr: 'Plus süresi doldu',
                  pl: 'Plus wygasło',
                })}
                premiumExpiredSubtitle={triLang(lang, {
                  ru: 'Обновите Плюс чтобы увидеть эти карточки',
                  uk: 'Поновіть Плюс щоб побачити ці картки',
                  es: 'Renueva Plus para ver estas tarjetas.',
                  'pt-BR': 'Renove o Plus para ver estes cartões.',
                  vi: 'Gia hạn Plus để xem các thẻ này.',
                  id: 'Perpanjang Plus untuk melihat kartu ini.',
                  tr: 'Bu kartları görmek için Plus’u yenile.',
                  pl: 'Odnów Plus, aby zobaczyć te karty.',
                })}
                cardHeight={CARD_H}
                cardStyle={st.card}
                sourceBadgeStyle={st.sourceBadge}
                sourceBadgeTextStyle={st.sourceBadgeText}
                getCardFlipAnim={getCardFlipAnim}
                getOverlayAnim={getOverlayAnim}
                getDeleteAnim={getDeleteAnim}
                onOpenPremium={() => router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', saved: String(savedCards.length) } } as any)}
                onFlipCard={handleFlipCard}
                onOpenDelete={(cardId) => setLongPressedId(cardId)}
                onCloseDelete={() => setLongPressedId(null)}
                onDeleteCard={handleDeleteCard}
                onSpeak={(text, opts) => speakAudio(text, undefined, opts)}
                onDetailsOpenAnimStarted={onDetailsOpenAnimStarted}
                onDetailsScrollSettled={onDetailsScrollSettled}
                setListItemRowRef={setListItemRowRef}
                packCardTheme={packCardTheme}
                isRowInFocus={itemIdx === index}
                chevronHintDelayMs={
                  packPremiumVisual
                    ? 500 + Math.min(itemIdx, 24) * 36
                    : 0
                }
              />
            );
            if (!packPremiumVisual) return cardEl;
            return (
              <Reanimated.View entering={FadeInDown.duration(420).delay(Math.min(itemIdx, 24) * 36)}>
                {cardEl}
              </Reanimated.View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: listPadTop, paddingBottom: listPadBottom }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollBeginDrag={() => {
            setLongPressedId(null);
            detailsEscortProgrammaticRef.current = false;
            detailsEscortIgnoreScrollUntilRef.current = 0;
            detailsEscortUserDragRef.current = true;
          }}
          onScroll={(e) => {
            listScrollYRef.current = e.nativeEvent.contentOffset.y;
            setLongPressedId((prev) => (prev != null ? null : prev));
            if (Date.now() < detailsEscortIgnoreScrollUntilRef.current) return;
            if (detailsEscortProgrammaticRef.current) return;
            detailsEscortUserDragRef.current = true;
          }}
        />
        </View>
          );
        })()}

        </Animated.View>
        </View>

      {isDevMarketEnabled && (
        <TouchableOpacity
          onPress={() => router.push(FLASHCARDS_MARKET_DEV_ROUTE as any)}
          style={{
            position: 'absolute',
            right: 14,
            bottom: Math.max(bottomInset, 8) + 20,
            zIndex: 60,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${t.accent}66`,
            backgroundColor: `${t.accent}1F`,
            paddingHorizontal: 10,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Ionicons name="storefront-outline" size={14} color={t.accent} />
          <Text style={{ fontSize: f.caption, color: t.accent, fontWeight: '800' }}>DEV MARKET</Text>
        </TouchableOpacity>
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
  safe:         { flex:1 },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:12, paddingBottom:8, borderBottomWidth:0.5 },
  headerTitle:  { fontWeight:'700', letterSpacing:0.2 },
  progressWrap: { flexDirection:'row', alignItems:'center', marginVertical:8, gap:10 },
  progressTrack:{ flex:1, height:6, borderRadius:3, overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:3 },
  cardArea:     { paddingHorizontal:0, justifyContent:'center', alignItems:'center' },
  card:         { position:'absolute', top:0, left:0, right:0, bottom:0, borderRadius:20, borderWidth:1, padding:22, alignItems:'center', justifyContent:'center' },
  sourceBadge:  { position:'absolute', top:18, left:18, paddingHorizontal:10, paddingVertical:4, borderRadius:20, borderWidth:1 },
  sourceBadgeText: { fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 },
  swipeHint:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:32, paddingTop:8, paddingBottom:32 },
  navBtnPrimary:{ flex:1, height:56, borderRadius:28, alignItems:'center', justifyContent:'center' },
  centerState:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
});
