import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { configureAccordionLayout } from '../constants/layoutAnimation';
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
import { flashcardsSystemCardsForTarget } from './flashcards_target_gate';
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
// §5.3: два входа в набор — «Мои наборы» и каталог сообщества; «назад» ведёт ровно туда
import {
  FC_MY_PACKS_ROUTE,
  FC_PACKS_ROUTE,
  shouldBypassEmptyCustomCollection,
} from './flashcards/tabbar_state';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
import PackCommentsSheet from './community_packs/PackCommentsSheet';
import ReportPackModal from '../components/ReportPackModal';
import { packTitleForInterface } from './flashcards/marketplace';
import { publishLocalAuthorPack } from './community_packs/publishLocalPack';
import CollectionDeckView from './flashcards/CollectionDeckView';
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
import { DebugLogger } from './debug-logger';
import { captureAccountGeneration } from './account_generation';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { buyCommunityPackLocally } from './community_packs/packPurchase';
import { addCommunityPackToLibrary } from './community_packs/communityPackActions';
import CardPackShardPaywallModal from './flashcards/CardPackShardPaywallModal';
import type { FlashcardMarketPack } from './flashcards/marketplace';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import {
  defaultPackLanguageForStudyTarget,
  filterCardsByPackLanguage,
  type PackLanguage,
} from './flashcards/pack_languages';
import {
  getStoredPackLanguage,
  setStoredPackLanguage,
  subscribePackLanguage,
} from './flashcards/pack_language_preferences';
import {
  canCreatePackFromSelection,
  clearSelectionForLanguageChange,
  remainingCardsToMinimum,
  toggleSelectedCardId,
} from './flashcards/saved_card_selection';
import { stageSavedCardSet } from './community_packs/savedCardSetStaging';

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

export default function FlashcardsScreen() {
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
  /**
   * Покупка набора за руны (владелец 2026-09-17, экран 8 макета рун).
   * Шит переиспользован целиком — своей вёрстки покупки здесь нет.
   */
  const [purchasePack, setPurchasePack] = useState<FlashcardMarketPack | null>(null);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [runeBalance, setRuneBalance] = useState(0);
  const purchasingRef = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  // Баланс читаем ТОЛЬКО когда шит открылся: локальное чтение, 0 обращений к
  // Firestore, и на холодный старт экрана оно не влияет.
  useEffect(() => {
    if (!purchasePack) return;
    let cancelled = false;
    void readUnifiedLevelSpinStars(captureAccountGeneration()).then(({ balance }) => {
      if (!cancelled) setRuneBalance(balance);
    }).catch((error: unknown) => {
      // Немой catch запрещён: баланс 0 при живых рунах показал бы «не хватает».
      DebugLogger.error(
        'flashcards_collection:rune_balance',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
    return () => { cancelled = true; };
  }, [purchasePack]);
  /**
   * Шторка откликов (владелец 2026-09-17). `openComments=1` в параметрах route —
   * deep-link из колокольчика (см. NotificationCenterButton): набор открывается
   * СРАЗУ со шторкой поднятой и нужной строкой подсвеченной, без промежуточных
   * экранов, как договорились в макете docs/design/pack-comments-and-edit/….
   */
  const [commentsSheetOpen, setCommentsSheetOpen] = useState(false);
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null);
  // зачем: strLang — интерфейсный язык (UI-текст STR/фильтры), НЕ путать
  // с cardContentLang ниже — тот сужен до контентных 8 локалей (карточки
  // без английского source). Раньше оба указывали на один и тот же lang,
  // что было безопасно только пока Lang = 8 языков; после расширения на en
  // разделены явно (краш Студии аватаров 2026-08-27 — тот же класс бага).
  const strLang: Lang = lang;
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const router   = useRouter();
  const params   = useLocalSearchParams<{ cat?: string; pack?: string; create?: string; widgetCard?: string; preview?: string; from?: string; openComments?: string; commentId?: string }>();
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

  /**
   * Deep-link из колокольчика: `?pack=<id>&openComments=1&commentId=<id>`.
   * Поднимаем шторку сразу на входе, без ожидания загрузки карточек — она
   * читает свою ветку сама (PackCommentsSheet), а не зависит от marketPackCatalog.
   *
   * зачем отдельный ref на «уже обработанный» набор (аудит 2026-09-17, «deep-link
   * залипает на следующий набор»): expo-router может сохранить query-параметры
   * openComments/commentId при переходе на ДРУГОЙ набор в рамках того же route
   * (назад → плитка другого набора). Раньше эффект был завязан только на смену
   * packDeeplink и перезапускался на новом наборе с чужими параметрами —
   * человек видел шторку и подсветку от прошлого набора поверх нового. Теперь
   * deep-link применяется РОВНО ОДИН раз на конкретную пару (packId, commentId).
   *
   * Отдельно: смена самого набора (packDeeplink) без НОВОГО deep-link закрывает
   * шторку и снимает подсветку — иначе шторка предыдущего набора осталась бы
   * открытой поверх нового. Ручное открытие через тап на «💬 N» (onOpenComments)
   * это не задевает: оно не трогает params и происходит уже ПОСЛЕ смены набора.
   */
  const appliedCommentDeepLinkRef = useRef<string | null>(null);
  const prevPackDeeplinkForCommentsRef = useRef<string | null>(null);
  useEffect(() => {
    const packChanged = prevPackDeeplinkForCommentsRef.current !== packDeeplink;
    prevPackDeeplinkForCommentsRef.current = packDeeplink;
    const openRaw = Array.isArray(params.openComments) ? params.openComments[0] : params.openComments;
    const commentIdRaw = Array.isArray(params.commentId) ? params.commentId[0] : params.commentId;
    const commentId = commentIdRaw ? String(commentIdRaw).trim() : '';
    const hasDeepLink = openRaw === '1' && !!packDeeplink;
    if (!hasDeepLink) {
      if (packChanged) {
        setCommentsSheetOpen(false);
        setHighlightCommentId(null);
      }
      appliedCommentDeepLinkRef.current = null;
      return;
    }
    const linkKey = `${packDeeplink}:${commentId}`;
    if (appliedCommentDeepLinkRef.current === linkKey) return;
    appliedCommentDeepLinkRef.current = linkKey;
    setCommentsSheetOpen(true);
    setHighlightCommentId(commentId || null);
  }, [params.openComments, params.commentId, packDeeplink]);

  const s        = STR[strLang] ?? STR.ru;
  const insets   = useStableSafeAreaInsets();
  /** Ограничение ширины контента на планшетах — как в ContentWrap, но без flex. */
  const { contentMaxW } = useScreen();
  const { height: screenH } = useWindowDimensions();
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
   * Откуда открыт экран: `?from=hub` возвращает и сохранённые, и открытый набор
   * в хаб; `?from=mine` — в «Мои наборы»; `?from=community`/`?preview=1` —
   * в каталог сообщества.
  */
  const packBackOrigin = useMemo((): string | null => {
    const raw = Array.isArray(params.from) ? params.from[0] : params.from;
    if (raw === 'hub') return '/flashcards';
    if (!packDeeplink) return null;
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
     *  • открыты сохранённые карточки — кнопка возвращает в единый хаб карточек.
     */
    const backTarget = packBackOrigin ?? (packDeeplink ? FC_MY_PACKS_ROUTE : '/flashcards');
    safeRouterBack(router, backTarget as any);
  }, [router, packBackOrigin, packDeeplink]);

  /**
   * зачем (владелец, 2026-08-16): из ПУСТОЙ коллекции нужен путь туда, где берут
   * карточки, — в наборы сообщества. Раньше эта кнопка звала leaveCollection и
   * выбрасывала на главную. Это соседняя позиция таббара карточек, поэтому
   * replace: стек раздела не должен расти.
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

  const [packLanguage, setPackLanguage] = useState<PackLanguage>(() => defaultPackLanguageForStudyTarget(studyTarget));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [savedActionsOpen, setSavedActionsOpen] = useState(false);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [selectionCreateBusy, setSelectionCreateBusy] = useState(false);
  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  useEffect(() => subscribePackLanguage((next) => {
    setPackLanguage(next);
    setSelectedCardIds([]);
    setSelectionMode(false);
  }), []);

  useEffect(() => {
    let mounted = true;
    void getStoredPackLanguage().then((stored) => {
      if (!mounted) return;
      setPackLanguage(stored ?? defaultPackLanguageForStudyTarget(studyTarget));
    });
    return () => { mounted = false; };
  }, [studyTarget]);

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

  const reduceMotion = useReduceMotion();
  const exitSelectionMode = useCallback(() => {
    if (!reduceMotion) configureAccordionLayout();
    setSelectionMode(false);
    setSelectedCardIds([]);
    setSavedActionsOpen(false);
  }, [reduceMotion]);

  const enterSelectionMode = useCallback(() => {
    if (activeCat !== 'saved' || packDeeplink) return;
    if (!reduceMotion) configureAccordionLayout();
    setSelectionMode(true);
    setSelectedCardIds([]);
    setSavedActionsOpen(false);
    setViewMode('list');
    setCollectionViewMode('list');
  }, [activeCat, packDeeplink, reduceMotion]);

  const handlePackLanguageChange = useCallback((next: PackLanguage) => {
    setSelectedCardIds((current) => clearSelectionForLanguageChange(current, packLanguage, next));
    setSelectionMode(false);
    setSavedActionsOpen(false);
    setPackLanguage(next);
    void setStoredPackLanguage(next).catch(() => {});
  }, [packLanguage]);

  const toggleSavedCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((current) => toggleSelectedCardId(current, cardId));
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
    if (savedActionsOpen) {
      setSavedActionsOpen(false);
      return;
    }
    if (selectionMode) {
      exitSelectionMode();
      return;
    }
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
  }, [exitDeckToList, exitSelectionMode, filterOpen, leaveCollection, savedActionsOpen, searchActive, searchInput, selectionMode, viewMode]);

  // зачем (расследование 2026-08-28, жалоба Виталия/«Марс»: «есть Premium, а
  // лимит сохранённых всё равно показывает 20 из 20»): isPremium — узкое поле
  // (подтверждённая покупка через RevenueCat), а VIP/admin-override доступ
  // (his premium_plan='annual', vip_active=true, admin_premium_override=true)
  // в него НЕ попадает — только в hasPremiumAccess. Весь остальной проект
  // (остальные экраны) уже гейтит по hasPremiumAccess;
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
      routeCat: routeCatRef.current,
      packDeeplink: packRouteRef.current,
      pendingRestoreRef,
      setActiveCat,
      setCustomCatParam: () => router.setParams({ cat: 'custom' } as any),
      setShowDeleteHint,
      previewMode: previewRequestedRef.current,
    });
  }, [isDevMarketEnabled, router]);

  const {
    savedCards, customCards, marketCards, marketPackCatalog,
    ownedPackIdList, communityOwnedIdList, accessStableId,
    collectionDataReady, loading, loadError, loadAll,
    updateSavedCards, updateCustomCards,
  } = useCollectionData({
    isDevMarketEnabled,
    onLoaded,
    previewPackId: previewRequested ? packDeeplink : null,
    deeplinkPackId: packDeeplink,
  });

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

  /**
   * Системные карточки строго по языку обучения.
   * зачем: гейт `flashcardsSystemCardsForTarget` существовал, но не был подключён —
   * экран отдавал сырой английский банк даже в режиме French (2026-09-05).
   */
  const systemCardsForTarget = useMemo(
    () => flashcardsSystemCardsForTarget(SYSTEM_CARDS, studyTarget, lang),
    [studyTarget, lang],
  );

  const savedCardsForPackLanguage = useMemo(
    () => activeCat === 'saved' && !packDeeplink
      ? filterCardsByPackLanguage(savedCards, packLanguage)
      : savedCards,
    [activeCat, packDeeplink, packLanguage, savedCards],
  );

  // ── Derived: категория → фильтр → поиск → free-limit (E11: хук) ────────────
  const { cards, filteredCards, listCards, hiddenByLimitCount } = useDerivedCollectionCards({
    activeCat,
    packDeeplink,
    savedCards: savedCardsForPackLanguage,
    customCards,
    marketCards,
    systemCards: systemCardsForTarget, activeFilter, searchQuery, isPremium,
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
  const { undoEntry, deleteCardById, deleteCardsByIds, undoDelete } = useCollectionDeletion({
    cards, customCards, savedCards, updateCustomCards, updateSavedCards,
    currentIndexRef: indexRef, onIndexClamped, studyTarget,
  });

  const confirmDeleteSelected = useCallback(() => {
    if (selectedCardIds.length === 0) return;
    setSavedActionsOpen(false);
    setBatchDeleteConfirmOpen(true);
  }, [selectedCardIds.length]);

  const batchDeleteInFlight = useRef(false);
  const performDeleteSelected = useCallback(async () => {
    if (selectedCardIds.length === 0 || batchDeleteInFlight.current) return;
    batchDeleteInFlight.current = true;
    const ids = selectedCardIds;
    setBatchDeleteConfirmOpen(false);
    try {
      const deleted = await deleteCardsByIds(ids);
      if (deleted) exitSelectionMode();
    } finally {
      batchDeleteInFlight.current = false;
    }
  }, [deleteCardsByIds, exitSelectionMode, selectedCardIds]);

  const batchDeleteConfirmCopy = useMemo(() => ({
    title: triLang(lang, {
      ru: `Удалить ${selectedCardIds.length} карточек?`,
      uk: `Видалити ${selectedCardIds.length} карток?`,
      en: `Delete ${selectedCardIds.length} cards?`,
      es: `¿Eliminar ${selectedCardIds.length} tarjetas?`,
      'pt-BR': `Excluir ${selectedCardIds.length} cartões?`,
      vi: `Xóa ${selectedCardIds.length} thẻ?`,
      id: `Hapus ${selectedCardIds.length} kartu?`,
      tr: `${selectedCardIds.length} kart silinsin mi?`,
      pl: `Usunąć ${selectedCardIds.length} kart?`,
    }),
    message: triLang(lang, {
      ru: 'Карточки исчезнут из «Сохранённых». Исходные уроки и видео не изменятся.',
      uk: 'Картки зникнуть із «Збережених». Початкові уроки та відео не зміняться.',
      en: 'The cards will disappear from Saved. The original lessons and videos will not change.',
      es: 'Las tarjetas desaparecerán de Guardadas. Las lecciones y vídeos originales no cambiarán.',
      'pt-BR': 'Os cartões desaparecerão de Salvos. As lições e vídeos originais não mudarão.',
      vi: 'Thẻ sẽ biến mất khỏi mục Đã lưu. Bài học và video gốc không thay đổi.',
      id: 'Kartu akan hilang dari Tersimpan. Pelajaran dan video asli tidak berubah.',
      tr: 'Kartlar Kayıtlı bölümünden kaldırılır. Kaynak dersler ve videolar değişmez.',
      pl: 'Karty znikną z Zapisanych. Oryginalne lekcje i filmy nie zmienią się.',
    }),
    cancel: triLang(lang, {
      ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj',
    }),
    confirm: triLang(lang, {
      ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń',
    }),
  }), [lang, selectedCardIds.length]);

  // ── Filter options ─────────────────────────────────────────────────────────
  const filterGroups: FilterGroup[] = useMemo(
    () => buildFilterGroups(cards, activeCat, strLang),
    [cards, activeCat, strLang],
  );
  const filterOptions: { key: string; label: string }[] = useMemo(
    () => buildFilterOptions(filterGroups, strLang),
    [filterGroups, strLang],
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
    router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'flashcards_collection', saved: String(savedCards.length) } } as any);
  }, [router, savedCards.length]);

  // ── E7: входы в редактор (create/edit) — отдельный экран flashcards_card_editor ──
  const openCreateEditor = useCallback(() => {
    router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any);
  }, [router]);

  const openCreatePackFromSelection = useCallback(async () => {
    if (selectionCreateBusy || !canCreatePackFromSelection(selectedCardIds)) return;
    setSelectionCreateBusy(true);
    try {
      const stageKey = await stageSavedCardSet({
        packLanguage,
        cardIds: selectedCardIds,
        cards: savedCardsForPackLanguage as unknown as Array<{ id: string; [key: string]: unknown }>,
      });
      exitSelectionMode();
      router.push({ pathname: '/community_pack_create', params: { fresh: '1', stage: stageKey, origin: 'saved' } } as never);
    } catch {
      emitAppEvent('action_toast', actionToastTri('error', { ru: 'Не удалось открыть редактор. Выбор сохранён, попробуйте ещё раз.', uk: 'Не вдалося відкрити редактор. Спробуйте ще раз.', en: 'Could not open the editor. Try again.', es: 'No se pudo abrir el editor. Inténtalo de nuevo.' }));
    } finally {
      setSelectionCreateBusy(false);
    }
  }, [exitSelectionMode, packLanguage, router, savedCardsForPackLanguage, selectedCardIds, selectionCreateBusy]);
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

  /** Только просмотр: набор открыт из каталога и ещё не добавлен себе. */
  const previewMode = previewRequested && !packOwnedByMe;

  /**
   * «Отправить в сообщество»: своя коллекция, которая ещё живёт только на устройстве.
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
   * «Править набор» — свой УЖЕ опубликованный набор сообщества.
   *
   * зачем (владелец 17.09.2026): «юзер должен иметь возможность редактировать
   * свои наборы даже если они опубликованы». Ведёт на тот же экран публикации
   * (`community_pack_create.tsx` уже умеет режим правки через ?packId=,
   * см. fetchCommunityPackForAuthorEdit) — новый экран строить не нужно.
   * Показывается только когда я — автор (packOwnedByMe уже это проверяет)
   * и набор реально в каталоге (listingStatus облачный, не 'local_only').
   */
  const showEditButton =
    !!packDeeplink &&
    !previewMode &&
    !!currentMarketPack?.isCommunityUgc &&
    packOwnedByMe &&
    !!currentMarketPack.authorStableId &&
    currentMarketPack.authorStableId === accessStableId &&
    currentMarketPack.listingStatus !== 'local_only' &&
    CLOUD_SYNC_ENABLED &&
    !IS_EXPO_GO;

  const onEditPack = useCallback(() => {
    if (!packDeeplink) return;
    router.push({ pathname: '/community_pack_create', params: { packId: packDeeplink } } as any);
  }, [packDeeplink, router]);
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
          showPublish={showPublishButton}
          publishBusy={publishBusy}
          onPublish={onPublishPack}
          showEdit={showEditButton}
          onEdit={onEditPack}
          packLanguage={packLanguage}
          onPackLanguageChange={activeCat === 'saved' && !packDeeplink ? handlePackLanguageChange : undefined}
          selectionMode={selectionMode}
          selectedCount={selectedCardIds.length}
          selectionTotal={savedCardsForPackLanguage.length}
          actionsOpen={savedActionsOpen}
          onToggleActions={() => setSavedActionsOpen((open) => !open)}
          onEnterSelection={enterSelectionMode}
          onExitSelection={exitSelectionMode}
          onDeleteSelected={confirmDeleteSelected}
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
              onRequestPurchase={(p, price) => {
                // Шит покупки — ТОТ ЖЕ, что у наборов за жемчуг, с той же
                // анимацией (владелец 2026-09-17): меняется только валюта.
                setPurchasePack(p);
                setPurchasePrice(price);
              }}
              onOpenComments={() => { setHighlightCommentId(null); setCommentsSheetOpen(true); }}
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
            extraBottomPad={0}
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
            onFocusedIndexChanged={onFocusedIndexChanged}
            onCardsViewed={registerFlashcardViewed}
            onFlipTracked={trackCardFlip}
            strengthForCard={strengthForCard}
            extraBottomPad={selectionMode ? 132 : 0}
            selectionMode={selectionMode}
            selectedIds={selectedCardIdSet}
            onToggleSelection={toggleSavedCardSelection}
            selectedCount={selectedCardIds.length}
            canCreatePack={canCreatePackFromSelection(selectedCardIds) && !selectionCreateBusy}
            selectionRemaining={remainingCardsToMinimum(selectedCardIds)}
            onCreatePack={openCreatePackFromSelection}
            onDeleteSelected={confirmDeleteSelected}
          />
        )}

      {undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={Math.max(insets.bottom, 8) + 14}
          lang={cardContentLang}
          t={t}
          f={f}
          onUndo={undoDelete}
        />
      )}

      <FlashcardsFilterDropdown
        visible={filterOpen && !selectionMode && activeCat !== 'saved'}
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

      <ThemedConfirmModal
        visible={batchDeleteConfirmOpen}
        title={batchDeleteConfirmCopy.title}
        message={batchDeleteConfirmCopy.message}
        cancelLabel={batchDeleteConfirmCopy.cancel}
        confirmLabel={batchDeleteConfirmCopy.confirm}
        confirmVariant="default"
        destructive
        testIDPrefix="fc-delete-selected-confirm"
        onCancel={() => setBatchDeleteConfirmOpen(false)}
        onConfirm={() => { void performDeleteSelected(); }}
      />

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

      {commentsSheetOpen && currentMarketPack ? (
        <PackCommentsSheet
          visible
          packId={currentMarketPack.id}
          packTitle={packTitleForInterface(currentMarketPack, cardContentLang)}
          isPackAuthor={!!accessStableId && currentMarketPack.authorStableId === accessStableId}
          packAuthorStableId={currentMarketPack.authorStableId ?? null}
          ownedLocally={packOwnedByMe}
          lang={lang}
          onClose={() => { setCommentsSheetOpen(false); setHighlightCommentId(null); }}
          highlightCommentId={highlightCommentId}
        />
      ) : null}

      {/* Pokupka nabora za runy: TOT ZHE shit, chto u naborov za zhemchug, s toy
          zhe animaciey i temi zhe tremya rezhimami (vladelets 2026-09-17). */}
      {purchasePack ? (
        <CardPackShardPaywallModal
          visible
          mode={runeBalance >= purchasePrice ? 'confirm' : 'insufficient'}
          currency="runes"
          pack={purchasePack}
          balance={runeBalance}
          lang={lang}
          purchasing={purchasing}
          onClose={() => { setPurchasePack(null); setPurchasing(false); purchasingRef.current = false; }}
          onConfirmPurchase={() => {
            // Dvoynoy tap zashchishchen ref: sostoyanie vo vtorom tape togo zhe
            // kadra eshche staroe i spisalo by cenu vtoroy raz.
            if (purchasingRef.current || !purchasePack) return;
            purchasingRef.current = true;
            setPurchasing(true);
            const token = captureAccountGeneration();
            void buyCommunityPackLocally(token, purchasePack.id, purchasePrice).then(async (res) => {
              if (!res.ok) {
                purchasingRef.current = false;
                setPurchasing(false);
                console.log(`[PACK-BUY] denied pack=${purchasePack.id} reason=${res.reason}`); // guard-ok: otkaz obyazan logirovat'sya i v relize
                return;
              }
              await addCommunityPackToLibrary(purchasePack);
              purchasingRef.current = false;
              setPurchasing(false);
              setPurchasePack(null);
              void loadAll();
            }).catch((error: unknown) => {
              purchasingRef.current = false;
              setPurchasing(false);
              DebugLogger.error(
                'flashcards_collection:pack_buy',
                error instanceof Error ? error : new Error(String(error)),
                'warning',
              );
            });
          }}
          onGoToShards={() => { setPurchasePack(null); }}
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
