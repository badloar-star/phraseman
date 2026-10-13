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
import { useFeatureAccess } from '../components/PremiumContext';
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
import ContentWrap from '../components/ContentWrap';
import { useScreen } from '../hooks/use-screen';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import CommunityPackPreview from './flashcards/CommunityPackPreview';
import { emitPackNotDownloadedToast } from './community_packs/stage_with_retry';
import { useTheme } from '../components/ThemeContext';
import { LinearGradient } from '../components/SafeLinearGradient';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../constants/i18n';
import { pluralWithCount } from '../constants/plural';
import { packCardRemovalRefusalText } from './community_packs/packCardRemovalCopy';
import { isLightThemeMode } from '../constants/theme';
import { actionToastTri, emitAppEvent } from './events';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { CATEGORIES, STR } from './flashcards/constants';
import { SYSTEM_CARDS } from './flashcards/system-cards';
import { flashcardsSystemCardsForTarget } from './flashcards_target_gate';
import { CardItem, CategoryId, resolveFlashcardBackText } from './flashcards/types';
import { writeFlashcardsProgress } from './flashcards/storage';
// E8: быстрый старт — размер сессии из последнего пресета (fc_mode_prefs_v1)
import { fcHaptic } from './flashcards/SoundService';
import {
  buildFilterGroups,
  buildFilterOptions,
  filterSavedCardsByContentKind,
  type FilterGroup,
  type SavedCardContentKind,
} from './flashcards/selectors';
import FlashcardsFilterDropdown from './flashcards/FlashcardsFilterDropdown';
import CollectionHeader from './flashcards/CollectionHeader';
import CollectionGalleryView from './flashcards/CollectionGalleryView';
import CommunityPackPreviewSkeleton from './flashcards/CommunityPackPreviewSkeleton';
import { CollectionMenuSheet, CollectionSearchField, CollectionTitleBlock, CollectionTopBar } from './flashcards/CollectionHeaderV2';
import { FREE_SAVED_CARD_LIMIT } from './flashcards/free_limit';
import { claimPackDelete, deleteOwnPackEverywhere, releasePackDelete } from './community_packs/deleteOwnPack';
import { PackAddCardButton, PackInfoBlock, PackTopBar, type PackBadge } from './flashcards/PackHeaderV2';
import { packDeckLevel } from '../components/packs/packDeckModel';
import { ExpandedCardV2, type ExpandedCardData } from './flashcards/ExpandedCardV2';
import { VideoSetView } from './flashcards/VideoSetView';
import { togglePackCardSaved } from './flashcards/save_pack_card';
import { schedulePublishedPackCardRemoval, type PublishedPackCardRemovalOutcome } from './community_packs/publishedPackCardRemoval';
import { removeCardFromLocalPack, restoreCardToLocalPack, type LocalPackCardSnapshot } from './community_packs/localPackCardOps';
import { isFlashcardSaved } from '../hooks/use-flashcards';
import { useCommunityAuthorName } from './community_packs/packAuthorNames';
import { isLocalAuthorPackId } from './community_packs/localAuthorPacks';
import CollectionListView, {
  CollectionEmptyState,
  UndoDeleteSnackbar,
} from './flashcards/CollectionListView';
import { SavedCollectionLoading, SavedCollectionState } from './flashcards/SavedCollectionStates';
import { resolveFlashcardListItemHeight } from './flashcards/FlashcardListItemChrome';
// Cards 2.1 §5.2: нижний таббар раздела (Тренировка / + / Наборы)
// §5.3: два входа в набор — «Мои наборы» и каталог сообщества; «назад» ведёт ровно туда
import {
  FC_MY_PACKS_ROUTE,
  FC_PACKS_ROUTE,
  shouldBypassEmptyCustomCollection,
} from './flashcards/tabbar_state';
import CommunityPackSocialBar from './community_packs/CommunityPackSocialBar';
import PackVideoHero from './flashcards/PackVideoHero';
import HomeV2VideoPlayerModal from '../components/home/v2/HomeV2VideoPlayerModal';
import { packSupportsVideoMoments, resolveVideoMoment, type VideoMoment } from './flashcards/video_moment';
import PackCommentsSheet from './community_packs/PackCommentsSheet';
import ReportPackModal from '../components/ReportPackModal';
import { packTitleForInterface } from './flashcards/marketplace';
import { publishLocalAuthorPack } from './community_packs/publishLocalPack';
import { PACK_PUBLISH_DAILY_LIMIT_COPY } from './community_packs/publish_limit_copy';
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
import { packPurchaseGate } from './community_packs/packPurchaseGate';
import { syncPendingPackSales } from './community_packs/packSaleSync';
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
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
    en: cat.fullLabelEn,
    es: cat.fullLabelES,
    'pt-BR': cat.fullLabelPtBr,
    vi: cat.fullLabelVi,
    id: cat.fullLabelId,
    tr: cat.fullLabelTr,
    pl: cat.fullLabelPl,
  };
  return labels[lang];
}

/** Тост «набор сейчас нельзя купить» (ревью 12.10 (д)): отказ гейта (нет цены / цены разошлись) повтором не лечится — без «попробуй ещё раз». */
function packBuyUnavailableToast() {
  return actionToastTri('error', {
    ru: 'Этот набор сейчас нельзя купить.',
    uk: 'Цей набір зараз не можна купити.',
    en: 'This pack can’t be bought right now.',
    es: 'Este paquete no se puede comprar ahora.',
    'pt-BR': 'Este pacote não pode ser comprado agora.',
    vi: 'Hiện chưa thể mua bộ thẻ này.',
    id: 'Paket ini belum bisa dibeli sekarang.',
    tr: 'Bu paket şu anda satın alınamıyor.',
    pl: 'Tego zestawu nie można teraz kupić.',
  });
}

/** Тост «покупка набора не удалась» (R1_PAYWALL_UX): окно покупки не должно молчать при отказе. */
function packBuyFailedToast() {
  return actionToastTri('error', {
    ru: 'Не удалось купить набор. Попробуй ещё раз.',
    uk: 'Не вдалося купити набір. Спробуй ще раз.',
    en: 'Couldn’t buy the pack. Try again.',
    es: 'No se pudo comprar el paquete. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível comprar o pacote. Tente de novo.',
    vi: 'Không mua được bộ thẻ. Hãy thử lại.',
    id: 'Tidak bisa membeli paket. Coba lagi.',
    tr: 'Paket satın alınamadı. Tekrar dene.',
    pl: 'Nie udało się kupić zestawu. Spróbuj ponownie.',
  });
}

export default function FlashcardsScreen() {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode, statusBarLight, uiScale, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const isLightTheme = isLightThemeMode(themeMode);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  // зачем (Apple 1.2, UGC): пожаловаться на чужой набор можно было только
  // в каталоге долгим тапом по плитке. На самой странице набора — там, где
  // человек и читает чужие карточки, — жалобы не было вовсе.
  const [packReportOpen, setPackReportOpen] = useState(false);
  // зачем: раскрытая карточка (ExpandedCardV2) — состояние нужно уже Back-обработчику выше по файлу
  const [openedCardId, setOpenedCardId] = useState<string | null>(null);
  const [openedSaved, setOpenedSaved] = useState(false);
  // зачем (владелец 04.10: «Удалить» у карточки своего набора + «Вернуть»): скрытые сразу (Optimistic UI) и снимок для возврата
  const [hiddenPackCardIds, setHiddenPackCardIds] = useState<ReadonlySet<string>>(() => new Set());
  const [packUndo, setPackUndo] = useState<{ key: number; snapshot: LocalPackCardSnapshot | null; undoPublished?: () => Promise<boolean>; cardId?: string } | null>(null);
  const packUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packUndoKeyRef = useRef(0);
  /**
   * Покупка набора за руны (владелец 2026-09-17, экран 8 макета рун).
   * Шит переиспользован целиком — своей вёрстки покупки здесь нет.
   */
  const [purchasePack, setPurchasePack] = useState<FlashcardMarketPack | null>(null);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [runeBalance, setRuneBalance] = useState(0);
  const purchasingRef = useRef(false);
  const [purchasing, setPurchasing] = useState(false);
  // зачем (R1_PAYWALL_UX п.2, координатор 12.10): единственный вход в окно покупки набора. Набор без цены или с расхождением цен не открывает окно
  // («за 0» и отказ уже после тапа) — причина отказа пишется в журнал. Все три места вызова (соцбар, просмотр набора, набор из видео) идут сюда.
  const requestPackPurchase = useCallback((p: FlashcardMarketPack, price: number) => {
    const gate = packPurchaseGate(p, price);
    if (!gate.ok) {
      console.warn(`[PACK-BUY] gate:refused pack=${p.id} price=${price} packPriceRunes=${String(p.priceRunes ?? '-')} reason=${gate.reason}`); // guard-ok: отказ окна покупки называет причину
      emitAppEvent('action_toast', packBuyUnavailableToast()); // зачем (ревью 12.10 п.5 и (д)): отказ гейта — не только журнал; повтором он не лечится, поэтому без «попробуй ещё раз»
      return;
    }
    setPurchasePack(p);
    setPurchasePrice(price);
  }, []);
  // Баланс читаем ТОЛЬКО когда шит открылся: локальное чтение, 0 обращений к
  // Firestore, и на холодный старт экрана оно не влияет.
  useEffect(() => {
    if (!purchasePack) return;
    let cancelled = false;
    // зачем здесь же (владелец 2026-09-21): разбираем очередь непришедших
    // начислений авторам. Покупка проходит и в офлайне, поэтому без разбора
    // при следующем заходе автор не получил бы руны НИКОГДА. Момент выбран
    // намеренно: шит покупки, а не старт экрана — холодный старт не трогаем.
    void syncPendingPackSales(captureAccountGeneration());
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
  const params   = useLocalSearchParams<{ cat?: string; pack?: string; create?: string; preview?: string; from?: string; openComments?: string; commentId?: string; search?: string }>();
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
  const [savedContentKind, setSavedContentKind] = useState<SavedCardContentKind>('all');
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
  // зачем (cards-v2 `setActions`, «Удалить набор»): окно подтверждения удаления своего набора
  const [deletePackOpen, setDeletePackOpen] = useState(false);
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
    void setStoredPackLanguage(next).catch(noteSwallowedHandler('flashcards_collection:useCallback.setStoredPackLanguage'));
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
  // зачем (Карточки 2.0, макет cards-v2 «Поиск»): поле поиска «Сохранённых» открывается кнопкой в шапке и живёт в полосе масштаба над сеткой
  // зачем (Карточки 2.0 12.10, лупа в шапке хаба): ?search=1 открывает «Сохранённые» сразу с полем поиска
  const [searchOpen, setSearchOpen] = useState(() => params.search === '1');

  /** Один контракт для стрелки и Android Back: сначала закрываем локальный слой. */
  const handleCollectionBack = useCallback(() => {
    if (openedCardId) {
      setOpenedCardId(null);
      return;
    }
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
    if (searchInput.length > 0 || searchActive || searchOpen) {
      setSearchInput('');
      setSearchQuery('');
      setSearchOpen(false);
      return;
    }
    if (viewMode === 'deck') {
      exitDeckToList();
      return;
    }
    leaveCollection();
  }, [exitDeckToList, exitSelectionMode, filterOpen, leaveCollection, openedCardId, savedActionsOpen, searchActive, searchInput, searchOpen, selectionMode, viewMode]);

  // Saved visibility must use the same authoritative feature decision as the
  // save path: Plus/VIP/intro/admin access and the remote global Free switch.
  const isPremium = useFeatureAccess('flashcards');
  // Карта «силы слова» строится из проекции нового журнала ошибок.
  const [strengthMap, setStrengthMap] = useState<WordStrengthMap | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // зачем (22.09): без языка функция читала английский журнал всегда —
      // на испанском/французском/немецком подсветка не появлялась вовсе.
      void loadWordStrengthMap(studyTarget).then((m) => {
        if (!cancelled) setStrengthMap(m);
      });
      return () => {
        cancelled = true;
      };
    }, [studyTarget]),
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
    updateSavedCards, updateCustomCards, deeplinkCardsState,
  } = useCollectionData({
    isDevMarketEnabled,
    onLoaded,
    previewPackId: previewRequested ? packDeeplink : null,
    deeplinkPackId: packDeeplink,
  });

  // зачем (packs-simple-004, мгновенное открытие): тап открыл экран до загрузки карточек; если все тихие повторы
  // вернули пусто — прежняя мягкая подсказка и назад (раньше её показывала плитка, не уходя со списка).
  const packOpenFailHandledRef = useRef(false);
  useEffect(() => {
    if (deeplinkCardsState !== 'failed' || packOpenFailHandledRef.current) return;
    packOpenFailHandledRef.current = true;
    console.warn('[FC-PACK-OPEN] collection:failed → назад', JSON.stringify({ pack: packDeeplink })); // guard-ok: ветка логируется
    emitPackNotDownloadedToast();
    leaveCollection();
  }, [deeplinkCardsState, leaveCollection, packDeeplink]);

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

  const savedContentCounts = useMemo(() => ({
    all: savedCardsForPackLanguage.length,
    word: filterSavedCardsByContentKind(savedCardsForPackLanguage, 'word').length,
    phrase: filterSavedCardsByContentKind(savedCardsForPackLanguage, 'phrase').length,
  }), [savedCardsForPackLanguage]);

  useEffect(() => {
    if (activeCat === 'saved' && savedContentKind !== 'phrase') {
      setActiveFilter('all');
      setFilterOpen(false);
    }
  }, [activeCat, savedContentKind]);

  // ── Derived: категория → фильтр → поиск → free-limit (E11: хук) ────────────
  const { cards, filteredCards, listCards: listCardsRaw, hiddenByLimitCount } = useDerivedCollectionCards({
    activeCat,
    packDeeplink,
    savedCards: savedCardsForPackLanguage,
    customCards,
    marketCards,
    systemCards: systemCardsForTarget, savedContentKind, activeFilter, searchQuery, isPremium,
  });
  const listCards = useMemo(
    () => (hiddenPackCardIds.size === 0 ? listCardsRaw : listCardsRaw.filter((card) => !hiddenPackCardIds.has(card.id))),
    [hiddenPackCardIds, listCardsRaw],
  );

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

  /**
   * D131/PM-288: тап по фразе набора из видео открывает ролик на её секунде.
   *
   * зачем модалка поверх экрана, а не переход: «назад» обязан вернуть в тот же
   * набор на ту же позицию прокрутки — экран набора не размонтируется, список
   * остаётся как был. Открытие — локальный setState на том же тапе (плеер
   * грузится внутри своей рамки, без спиннера на весь экран).
   * Без таймкода/ролика/готовности видеораздела (D129) обработчика нет —
   * кнопка момента не рисуется вовсе.
   */
  const [videoMoment, setVideoMoment] = useState<VideoMoment | null>(null);
  const videoMomentPack = packDeeplink && packSupportsVideoMoments(currentMarketPack) ? currentMarketPack : null;
  const openVideoMoment = useCallback((card: CardItem) => {
    const moment = resolveVideoMoment(videoMomentPack, card);
    if (!moment) return;
    DebugLogger.info('[VIDEO-SEEK]', `набор ${videoMomentPack?.id ?? '?'}: открываю ${moment.videoId} на ${moment.startSec}s (карточка ${moment.cardId})`);
    setVideoMoment(moment);
  }, [videoMomentPack]);
  const closeVideoMoment = useCallback(() => setVideoMoment(null), []);
  const videoMomentLabel = triLang(lang, {
    ru: 'Смотреть в видео', uk: 'Дивитися у відео', en: 'Watch in the video', es: 'Ver en el vídeo',
    'pt-BR': 'Ver no vídeo', vi: 'Xem trong video', id: 'Tonton di video', tr: 'Videoda izle', pl: 'Zobacz w filmie',
  });

  // ── Category / data / pack: filter + позиция ───────────────────────────────
  const persistProgressRef = useRef<(idx: number) => void>(() => {});
  persistProgressRef.current = (index: number) => {
    if (loading) return;
    // Изоляция целей обучения: позиция сохраняется в хранилище текущей цели.
    writeFlashcardsProgress({ cat: activeCat, idx: index }, studyTarget).catch(noteSwallowedHandler('flashcards_collection:FlashcardsScreen.writeFlashcardsProgress'));
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
  // зачем (Макеты cards-032, 12.10): подсказка «Зажми карточку…» скрыта при ЛЮБОЙ открытой шторке/окне экрана («⋯», подтверждения, фильтр, комментарии, жалоба), а не только при шторке долгого нажатия и плашке «Удалено»
  const hintCoveredByOverlay = savedActionsOpen || batchDeleteConfirmOpen || deletePackOpen || filterOpen || commentsSheetOpen || packReportOpen;
  // зачем (координатор 12.10, cards-033; сперва логи): итог — что именно решило, видна ли подсказка на экране
  useEffect(() => {
    console.log(`[CARDS-HINT] экран: showDeleteHint=${String(showDeleteHint)} undoEntry=${String(!!undoEntry)} packUndo=${String(!!packUndo)} covered=${String(hintCoveredByOverlay)} → видна=${String(showDeleteHint && !undoEntry && !packUndo && !hintCoveredByOverlay)}`); // guard-ok: итог ветвления
  }, [showDeleteHint, undoEntry, packUndo, hintCoveredByOverlay]);

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

  // зачем (Макеты 776430946, cards-035: «Удалить 3 карточек?»): число подставлялось в фиксированную форму; склоняем через общий помощник constants/plural.ts
  // (ru/uk/pl — три формы, в винительном падеже после «удалить»; en/es/pt-BR — две; vi/id/tr форму числа не меняют).
  const batchDeleteConfirmCopy = useMemo(() => ({
    title: triLang(lang, {
      ru: `Удалить ${pluralWithCount('ru', selectedCardIds.length, { one: 'карточку', few: 'карточки', many: 'карточек' })}?`,
      uk: `Видалити ${pluralWithCount('uk', selectedCardIds.length, { one: 'картку', few: 'картки', many: 'карток' })}?`,
      en: `Delete ${pluralWithCount('en', selectedCardIds.length, { one: 'card', few: 'cards', many: 'cards' })}?`,
      es: `¿Eliminar ${pluralWithCount('es', selectedCardIds.length, { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })}?`,
      'pt-BR': `Excluir ${pluralWithCount('pt-BR', selectedCardIds.length, { one: 'cartão', few: 'cartões', many: 'cartões' })}?`,
      vi: `Xóa ${selectedCardIds.length} thẻ?`,
      id: `Hapus ${selectedCardIds.length} kartu?`,
      tr: `${selectedCardIds.length} kart silinsin mi?`,
      pl: `Usunąć ${pluralWithCount('pl', selectedCardIds.length, { one: 'kartę', few: 'karty', many: 'kart' })}?`,
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
  const sourceFilterCards = useMemo(
    () => activeCat === 'saved' && !packDeeplink
      ? savedContentKind === 'phrase'
        ? filterSavedCardsByContentKind(cards, 'phrase')
        : []
      : cards,
    [activeCat, cards, packDeeplink, savedContentKind],
  );
  const filterGroups: FilterGroup[] = useMemo(
    () => buildFilterGroups(sourceFilterCards, activeCat, strLang),
    [sourceFilterCards, activeCat, strLang],
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
    (text: string, opts?: SpeakOpts) => {
      // зачем («Family», 04.10): жалоба «Не воспроизводится запись» со страницы набора — видно, какой набор и язык запросили озвучку.
      console.log('[PACK-AUDIO] tap', JSON.stringify({ pack: packDeeplink ?? null, cat: activeCat, chars: text?.trim().length ?? 0, language: opts?.language ?? null, cardAudio: !!opts?.cardAudio }));
      speakAudio(text, undefined, opts);
    },
    [speakAudio, packDeeplink, activeCat],
  );
  const openPremiumLimit = useCallback(() => {
    router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'flashcards_collection', saved: String(savedCards.length) } } as any);
  }, [router, savedCards.length]);

  // ── E7: входы в редактор (create/edit) — отдельный экран flashcards_card_editor ──
  const openCreateEditor = useCallback(() => {
    router.push({ pathname: '/flashcards_card_editor', params: { create: '1', cat: 'custom' } } as any);
  }, [router]);

  // зачем (аудит Optimistic UI Карточек, 12.10): `selectionCreateBusy` — состояние, второй тап в том же кадре проходил; синхронный замок — ref
  const selectionCreateLockRef = useRef(false);
  const openCreatePackFromSelection = useCallback(async () => {
    if (selectionCreateBusy || !canCreatePackFromSelection(selectedCardIds)) return;
    if (selectionCreateLockRef.current) {
      console.log('[OPT-UI] pack_from_selection ignored reason=double_tap'); // guard-ok: ранний выход пишет причину
      return;
    }
    selectionCreateLockRef.current = true;
    setSelectionCreateBusy(true);
    try {
      const stageKey = await stageSavedCardSet({
        packLanguage,
        cardIds: selectedCardIds,
        cards: savedCardsForPackLanguage as unknown as Array<{ id: string; [key: string]: unknown }>,
      });
      exitSelectionMode();
      router.push({ pathname: '/community_pack_create', params: { fresh: '1', stage: stageKey, origin: 'saved' } } as never);
    } catch (error: unknown) {
      console.warn('[OPT-UI] pack_from_selection rollback reason=stage_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
      emitAppEvent('action_toast', actionToastTri('error', { ru: 'Не удалось открыть редактор. Выбор сохранён, попробуй ещё раз.', uk: 'Не вдалося відкрити редактор. Спробуй ще раз.', en: 'Could not open the editor. Try again.', es: 'No se pudo abrir el editor. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível abrir o editor. Tente de novo.', vi: 'Không mở được trình chỉnh sửa. Hãy thử lại.', id: 'Editor tidak bisa dibuka. Coba lagi.', tr: 'Düzenleyici açılamadı. Tekrar dene.', pl: 'Nie udało się otworzyć edytora. Spróbuj ponownie.' }));
    } finally {
      selectionCreateLockRef.current = false;
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
  // зачем (координатор 12.10, Сверка cards-v2-016: «после „Добавить себе“ приложение ушло в каталог, образец остаётся на экране набора»; сперва логи):
  // кода, который уводит с экрана набора после добавления, нет — набор должен остаться открытым и перейти из «просмотра» в «добавлен». Журнал показывает,
  // что происходит на самом деле: смена режима просмотра, откуда пришло владение и что экран делает при уходе (размонтирование = переход на другой маршрут).
  useEffect(() => {
    if (!packDeeplink) return;
    console.log('[CARDS-PACK-ADD]', JSON.stringify({ // guard-ok: журнал расследования cards-v2-016
      stage: 'mode', pack: packDeeplink, previewRequested, packOwnedByMe, previewMode,
      owned: ownedPackIdList.includes(packDeeplink), communityOwned: communityOwnedIdList.includes(packDeeplink),
      hasMarketPack: !!currentMarketPack, cards: listCards.length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packDeeplink, previewRequested, packOwnedByMe, previewMode, !!currentMarketPack]);
  useEffect(() => () => {
    if (packDeeplink) console.log('[CARDS-PACK-ADD]', JSON.stringify({ stage: 'unmount', pack: packDeeplink })); // guard-ok: экран набора ушёл (переход на другой маршрут)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // зачем (аудит Optimistic UI 13.10, правило №10 «откат при ошибке + кнопка не зависает»): исключение из publishLocalAuthorPack раньше оставляло publishBusy=true навсегда и уходило в необработанный отказ без сообщения.
      // Теперь исключение сводится к исходу 'error' (та же ветка тоста ниже), флаг снимается всегда, причина — в журнал.
      let res: Awaited<ReturnType<typeof publishLocalAuthorPack>>;
      try {
        res = await publishLocalAuthorPack(packDeeplink, lang, studyTarget);
      } catch (error: unknown) {
        console.warn('[PACK-PUBLISH] onPublishPack: исключение — кнопка освобождена, показываем ошибку', error instanceof Error ? error.message : String(error)); // guard-ok: лог причины в catch
        res = 'error';
      }
      setPublishBusy(false);
      if (res === 'submitted') {
        setPublishSubmitted(true);
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Набор отправлен на публикацию.',
          uk: 'Набір надіслано на публікацію.',
          es: 'El pack se ha enviado para publicarse.', en: 'The pack was sent for publication.',
          'pt-BR': 'O pacote foi enviado para publicação.',
          vi: 'Bộ thẻ đã được gửi để đăng.',
          id: 'Paket dikirim untuk dipublikasikan.',
          tr: 'Paket yayınlanmak üzere gönderildi.',
          pl: 'Zestaw wysłany do publikacji.',
        }));
        void loadAll();
        return;
      }
      if (res === 'daily_limit') {
        // зачем: Q55 — отдельный текст про суточный лимит (3 набора), а не общее «не удалось».
        emitAppEvent('action_toast', actionToastTri('info', PACK_PUBLISH_DAILY_LIMIT_COPY));
        return;
      }
      if (res === 'invalid') {
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Для публикации нужны название, описание и достаточное число карточек.',
          uk: 'Для публікації потрібні назва, опис і достатня кількість карток.',
          es: 'Para publicar hacen falta título, descripción y suficientes tarjetas.', en: 'Publishing needs a title, a description and enough cards.',
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
        es: 'No se pudo enviar el pack para publicarse.', en: 'Could not send the pack for publication.',
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
  const isEmpty = !loading && !packCardsPending && listCards.length === 0;
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
  // зачем (владелец 04.10, макет cards-section «Список»): «Сохранённые» — сетка плиток; тап по плитке открывает карточку (пока — стопкой с этой карточки),
  // «Тренировать» ведёт на хаб с открытым окном выбора режима (там вся логика лимита и пейвола).
  const savedSurface = activeCat === 'saved' && !packDeeplink;
  // зачем (cards-v2 `savedLimit`, координатор 12.10): Free, упёршийся в 50 сохранённых, видит пилюлю «50/50» в шапке и «Безлимит с Plus» внизу
  // вместо секции «+N скрыто». Скрытые лимитом карточки по-прежнему скрыты (уже сохранённое не отбираем: открываются с Plus).
  const savedLimitReached = savedSurface && !isPremium && (hiddenByLimitCount > 0 || savedCards.length >= FREE_SAVED_CARD_LIMIT);
  // зачем (владелец 04.10: «карточки открываются горизонтальными разворачивающимися»): тап по плитке раскрывает карточку по центру (ExpandedCardV2),
  // а не открывает стопку. «Сохранено» читается из общего хранилища сохранённых по английскому слову.
  const openedCard = useMemo(() => (openedCardId ? listCards.find((card) => card.id === openedCardId) ?? null : null), [openedCardId, listCards]);
  const openCardFromGallery = useCallback((id: string) => {
    fcHaptic('tap');
    setOpenedCardId(id);
  }, []);
  const closeOpenedCard = useCallback(() => setOpenedCardId(null), []);
  useEffect(() => {
    if (!openedCard) return undefined;
    let cancelled = false;
    void isFlashcardSaved(openedCard.en, openedCard.packLanguage ?? studyTarget).then((value) => {
      if (!cancelled) setOpenedSaved(value);
    }).catch((error: unknown) => {
      console.warn('[PACK-CARD-SAVE] не удалось проверить «сохранено»', error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [openedCard?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- проверяем только при открытии новой карточки
  const unhidePackCard = useCallback((cardId: string) => {
    setHiddenPackCardIds((prev) => {
      if (!prev.has(cardId)) return prev;
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  }, []);
  const deletePackCard = useCallback((card: CardItem) => {
    if (!packDeeplink) return;
    console.log(`[PACK-CARD-DELETE] экран: удалить cardId=${card.id} packId=${packDeeplink}`);
    setHiddenPackCardIds((prev) => new Set(prev).add(card.id)); // Optimistic UI: карточка исчезает сразу
    const failToast = () => emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Не удалось удалить карточку.', uk: 'Не вдалося видалити картку.', en: 'Could not delete the card.', es: 'No se pudo eliminar la tarjeta.',
      'pt-BR': 'Não foi possível excluir o cartão.', vi: 'Không thể xóa thẻ.', id: 'Kartu tidak dapat dihapus.', tr: 'Kart silinemedi.', pl: 'Nie udało się usunąć karty.',
    }));
    void removeCardFromLocalPack(packDeeplink, card.id).then((snapshot) => {
      if (!snapshot) { unhidePackCard(card.id); failToast(); return; }
      const key = ++packUndoKeyRef.current;
      if (packUndoTimerRef.current) clearTimeout(packUndoTimerRef.current);
      setPackUndo({ key, snapshot });
      packUndoTimerRef.current = setTimeout(() => setPackUndo((cur) => (cur?.key === key ? null : cur)), 5000);
      void loadAll();
    }).catch((error: unknown) => {
      console.warn('[PACK-CARD-DELETE] экран: сбой, откат', error instanceof Error ? error.message : String(error));
      unhidePackCard(card.id);
      failToast();
    });
  }, [loadAll, packDeeplink, unhidePackCard]);
  // зачем (координатор 04.10): карточка опубликованного набора — окно «Вернуть» 5 с на клиенте, затем ОДИН вызов сервера (очередь ядра);
  // карточка прячется сразу (Optimistic UI), при отказе сервера — возвращается с причиной.
  const deletePublishedPackCard = useCallback((card: CardItem) => {
    if (!packDeeplink) return;
    console.log(`[PACK-CARD-REMOVE] экран: удалить из опубликованного cardId=${card.id} packId=${packDeeplink}`);
    setHiddenPackCardIds((prev) => new Set(prev).add(card.id));
    // зачем (координатор 12.10): причина отказа переводится вместе с языком интерфейса (раньше русская строка шла во все 9 полей тоста)
    const refusalText = (reason: string) => packCardRemovalRefusalText(reason, lang);
    void schedulePublishedPackCardRemoval({
      cloudPackId: packDeeplink,
      cardId: card.id,
      onSettled: (outcome: PublishedPackCardRemovalOutcome) => {
        console.log(`[PACK-CARD-REMOVE] экран: итог kind=${outcome.kind} reason=${outcome.kind === 'refused' ? outcome.reason : '-'}`);
        if (outcome.kind === 'refused') {
          unhidePackCard(card.id);
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: refusalText(outcome.reason), uk: refusalText(outcome.reason), en: refusalText(outcome.reason), es: refusalText(outcome.reason),
            'pt-BR': refusalText(outcome.reason), vi: refusalText(outcome.reason), id: refusalText(outcome.reason), tr: refusalText(outcome.reason), pl: refusalText(outcome.reason),
          }));
        }
        void loadAll();
      },
    }).then((handle) => {
      const key = ++packUndoKeyRef.current;
      if (packUndoTimerRef.current) clearTimeout(packUndoTimerRef.current);
      setPackUndo({ key, snapshot: null, undoPublished: handle.undo, cardId: card.id });
      packUndoTimerRef.current = setTimeout(() => setPackUndo((cur) => (cur?.key === key ? null : cur)), 5000);
    }).catch((error: unknown) => {
      console.warn('[PACK-CARD-REMOVE] экран: не поставили в очередь, откат', error instanceof Error ? error.message : String(error));
      unhidePackCard(card.id);
    });
  }, [loadAll, packDeeplink, unhidePackCard]);
  const undoPackDelete = useCallback(() => {
    const entry = packUndo;
    if (!entry) return;
    setPackUndo(null);
    if (packUndoTimerRef.current) clearTimeout(packUndoTimerRef.current);
    if (entry.undoPublished) {
      void entry.undoPublished().then((ok) => {
        console.log(`[PACK-CARD-REMOVE] экран: «Вернуть» отменено=${ok}`);
        if (ok && entry.cardId) unhidePackCard(entry.cardId);
      }).catch((error: unknown) => {
        console.warn('[PACK-CARD-REMOVE] экран: «Вернуть» не удалось', error instanceof Error ? error.message : String(error));
      });
      return;
    }
    if (!entry.snapshot) return;
    const snapshot = entry.snapshot;
    void restoreCardToLocalPack(snapshot).then((ok) => {
      console.log(`[PACK-CARD-DELETE] экран: возврат ok=${ok}`);
      void loadAll();
    }).catch((error: unknown) => {
      console.warn('[PACK-CARD-DELETE] экран: возврат не удался', error instanceof Error ? error.message : String(error));
    });
  }, [loadAll, packUndo, unhidePackCard]);
  useEffect(() => () => { if (packUndoTimerRef.current) clearTimeout(packUndoTimerRef.current); }, []);
  const openedSaveInFlightRef = useRef(false);
  const onToggleOpenedSave = useCallback(() => {
    const card = openedCard;
    if (!card) return;
    // зачем (аудит Optimistic UI 12.10): двойной тап запускал две встречные записи (убрать и снова добавить) с устаревшим `before` — защёлка до ответа
    if (openedSaveInFlightRef.current) {
      console.log(`[PACK-CARD-SAVE] повторный тап отклонён: запись ещё идёт cardId=${card.id}`); // guard-ok: ранний выход пишет причину
      return;
    }
    openedSaveInFlightRef.current = true;
    const before = openedSaved;
    setOpenedSaved(!before); // Optimistic UI: галочка сразу, запись догоняет
    fcHaptic('tap');
    void togglePackCardSaved(card, before, packDeeplink, studyTarget).finally(() => { openedSaveInFlightRef.current = false; }).then((result) => {
      if (result === 'limit_reached') {
        setOpenedSaved(before);
        openPremiumLimit();
      } else if (result === 'stale' || result === 'failed') {
        setOpenedSaved(before);
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось сохранить карточку.', uk: 'Не вдалося зберегти картку.', en: 'Could not save the card.', es: 'No se pudo guardar la tarjeta.',
          'pt-BR': 'Não foi possível salvar o cartão.', vi: 'Không thể lưu thẻ.', id: 'Kartu tidak dapat disimpan.', tr: 'Kart kaydedilemedi.', pl: 'Nie udało się zapisać karty.',
        }));
      } else if (result === 'duplicate') {
        setOpenedSaved(true);
      }
    });
  }, [openedCard, openedSaved, packDeeplink, studyTarget, openPremiumLimit]);
  const onTrainGallery = useCallback(() => {
    router.navigate({ pathname: '/flashcards', params: { train: '1' } } as never);
  }, [router]);
  // зачем (владелец 04.10): «Тренировать» внутри набора — сразу этот набор: хаб откроет окно режимов и после выбора запустит сессию с ним
  const onTrainThisPack = useCallback(() => {
    if (!packDeeplink) { router.navigate({ pathname: '/flashcards', params: { train: '1' } } as never); return; }
    router.navigate({ pathname: '/flashcards', params: { train: '1', deck: `pack:${packDeeplink}`, cnt: String(listCards.length) } } as never);
  }, [listCards.length, packDeeplink, router]);

  // зачем: имя автора для шапки набора; хук обязан стоять до раннего return ниже
  const packAuthorName = useCommunityAuthorName(currentMarketPack ?? null, lang);

  if (bypassEmptyCustomCollection) {
    return <View style={{ flex: 1, backgroundColor: t.bgPrimary }} />;
  }

  // зачем (макет cards-section «Свой набор» / «Чужой — добавлен»): экран набора — своя шапка и сетка карточек. Наборы из видео
  // (ролик-герой, «момент из видео») остаются на прежнем виде — они в группе «Из видео».
  // зачем (макет cards-section «Набор из видео»): набор из ролика (есть videoId) — свой экран: заголовок, превью, пилюли, фразы с таймкодом, кнопка внизу
  const videoSetSurface = !!packDeeplink && !!currentMarketPack?.videoId;
  // зачем (координатор 12.10, аудит скорости R1, cards-v2-015): просмотр чужого набора открыт, а метаданных набора ещё нет (прямая ссылка: нет ни выбранной
  // плитки, ни тёплого каталога). Раньше в эти ~1,7 с рисовался экран СВОЕГО набора с «0 карточек» и пустой сеткой, потом экран перескакивал на просмотр.
  // Пока каталог не ответил (collectionDataReady=false) — заготовки той же геометрии, без чисел. Каталог ответил, а набора нет — прежнее поведение.
  const previewResolving = previewMode && !!packDeeplink && !currentMarketPack && !videoMomentPack && !collectionDataReady;
  const packSurface = !!packDeeplink && !(previewMode && currentMarketPack) && !videoMomentPack && !currentMarketPack?.videoId && !previewResolving;
  const packMine = !!packDeeplink && (
    isLocalAuthorPackId(packDeeplink)
    || (!!currentMarketPack?.isCommunityUgc && !!currentMarketPack.authorStableId && currentMarketPack.authorStableId === accessStableId)
  );
  const packPublished = currentMarketPack?.listingStatus === 'published' || currentMarketPack?.listingStatus === 'update_pending';
  const packBadge: PackBadge = packMine ? (packPublished ? 'community' : 'only_you') : currentMarketPack?.isCommunityUgc ? 'in_you' : null;
  const packTitleText = currentMarketPack ? packTitleForInterface(currentMarketPack, cardContentLang) : s.title;
  // зачем (координатор 12.10, «Удалить набор» через общую функцию): после подтверждения экран уходит сразу (Optimistic UI), а удаление идёт фоном
  // (app/community_packs/deleteOwnPack.ts — та же логика, что в «Моих наборах»). Сбой — понятное сообщение; набор остаётся на сервере/устройстве и
  // вернётся в «Мои наборы» при следующей загрузке. Двойной тап отсекает общая защёлка.
  const confirmDeletePack = () => {
    const pack = currentMarketPack;
    setDeletePackOpen(false);
    if (!pack) {
      console.warn('[PACK-DELETE] экран набора: нет currentMarketPack — удаление пропущено', { packDeeplink });
      return;
    }
    if (!claimPackDelete(pack.id)) return;
    console.log('[PACK-DELETE] экран набора: подтверждено, ухожу сразу', { packId: pack.id, mine: packMine }); // guard-ok: единичный лог на жест
    leaveCollection();
    void deleteOwnPackEverywhere(pack, studyTarget)
      .then(() => {
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Набор удалён.', uk: 'Набір видалено.', en: 'Pack deleted.', es: 'Pack eliminado.',
          'pt-BR': 'Pacote excluído.', vi: 'Đã xóa bộ thẻ.', id: 'Paket dihapus.', tr: 'Paket silindi.', pl: 'Zestaw usunięty.',
        }));
      })
      .catch((error: unknown) => {
        console.warn('[PACK-DELETE] экран набора: удаление не удалось', { packId: pack.id, error: String(error) });
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось удалить набор.', uk: 'Не вдалося видалити набір.', en: 'Could not delete the pack.', es: 'No se pudo eliminar el pack.',
          'pt-BR': 'Não foi possível excluir o pacote.', vi: 'Không thể xóa bộ thẻ.', id: 'Paket tidak dapat dihapus.', tr: 'Paket silinemedi.', pl: 'Nie udało się usunąć zestawu.',
        }));
      })
      .finally(() => releasePackDelete(pack.id));
  };
  const packInfoBlock = packSurface ? (
    <PackInfoBlock
      lang={lang}
      title={packTitleText}
      authorName={packMine || currentMarketPack?.isCommunityUgc ? packAuthorName : null}
      mine={packMine}
      badge={packBadge}
      left={packMine
        ? <PackAddCardButton lang={lang} onPress={onEditPack} />
        : currentMarketPack?.isCommunityUgc
          ? <CommunityPackSocialBar pack={currentMarketPack} lang={lang} t={t} owned variant="previewMeta" onOpenComments={() => { setHighlightCommentId(null); setCommentsSheetOpen(true); }} />
          : null}
      onTrain={listCards.length > 0 ? onTrainThisPack : null}
      cardCount={listCards.length}
      // зачем (сверка Макетов e4e4149d0): в шапке своего и добавленного набора не было уровня (A2/B2), хотя он есть в документе набора — тот же чип `.lvl`, что в каталоге.
      level={packDeckLevel(currentMarketPack)}
    />
  ) : null;

  const expandedOpened = openedCard;
  const expandedEditable = expandedOpened ? isEditableCustomCard(expandedOpened) : false;
  const expandedOwn = !!expandedOpened && (savedSurface || packMine || expandedEditable);
  // зачем: удалять карточку из набора отсюда можно только в локальном наборе автора, которого ещё нет в сообществе (опубликованный правится через сервер)
  const packCardDeletable = packMine && !!packDeeplink && isLocalAuthorPackId(packDeeplink) && currentMarketPack?.listingStatus === 'local_only';
  // зачем: опубликованный набор автора (есть в облаке, не локальный) — удаление идёт через очередь «Вернуть → один вызов сервера»
  const publishedCardDeletable = packMine && !!packDeeplink && !isLocalAuthorPackId(packDeeplink) && !!currentMarketPack && currentMarketPack.listingStatus !== 'local_only' && !currentMarketPack.videoId;
  const expandedStrength = expandedOpened && strengthForCard ? strengthForCard(expandedOpened.en) : null;
  const expandedData: ExpandedCardData | null = expandedOpened ? {
    id: expandedOpened.id,
    front: expandedOpened.en,
    ipa: expandedOpened.transcription ?? null,
    back: resolveFlashcardBackText(expandedOpened, cardContentLang),
    dots: expandedStrength === 'strong' ? 4 : expandedStrength === 'medium' ? 2 : expandedStrength === 'weak' ? 1 : 0,
    // зачем: в редакторе набора третье поле теперь «Пример» (хранится как заметка карточки) — показываем её, если готового примера нет
    example: expandedOpened.exampleEn?.trim() || expandedOpened.description?.trim() || null,
    exampleTr: (cardContentLang === 'uk' ? expandedOpened.exampleUk : cardContentLang === 'es' ? expandedOpened.exampleEs : expandedOpened.exampleRu)?.trim() || null,
  } : null;
  // зачем (координатор 12.10, cards-005): в одобренном образце экран называется «Сохранённые 64», а не «Карточки» — так же названа плитка в хабе; общий s.title («Карточки») остаётся названием раздела.
  const savedScreenTitle = triLang(lang, {
    ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
    vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
  });
  const expandedOverline = savedSurface ? savedScreenTitle : packBadge === 'in_you' && packAuthorName ? `${packTitleText} · ${packAuthorName}` : packTitleText;

  const savedTitleBlock = savedSurface ? (
    <CollectionTitleBlock
      lang={lang}
      title={savedScreenTitle}
      cardCount={savedCardsForPackLanguage.length}
      // зачем: кадр 7 «Пусто» — только заголовок; поиск нужен, пока он активен (результат «ничего не найдено»)
      titleOnly={isEmpty && !loadError && searchQuery.trim().length === 0 && searchInput.length === 0}
      // зачем: поле поиска в заголовке остаётся только для пустого результата (иначе негде поправить запрос); при сетке оно в полосе масштаба
      showSearch={isEmpty && !loadError && (searchQuery.trim().length > 0 || searchInput.length > 0)}
      searchInput={searchInput}
      onSearchInput={setSearchInput}
    />
  ) : null;

  return (
    <ScreenGradient>
    {activeCat === 'saved' && !packDeeplink ? (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: glass.bg }]}>
        <LinearGradient colors={[glass.bgTop, glass.bg, glass.bgBottom]} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
      </View>
    ) : null}
    {/* зачем (координатор 12.10, Сверка cards-042: панель «‹ … ⋮» набора лежала ПОД строкой состояния, сдвиг ≈75 px): родной SafeAreaView берёт отступы
        у системы уже после первого кадра — пока экран входит в стек и ещё не приклеен к окну, inset сверху = 0 и панель стоит под часами. Отступы берём
        из useStableSafeAreaInsets (родной или запасной по высоте строки состояния — не меньше), как требует Performance Bible. Равнозначно SafeAreaView
        по всем четырём краям. Журнал положения панели — [CARDS-SET-HEADER] (PackHeaderV2). */}
    <View style={[st.safe, { backgroundColor: 'transparent', paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

        {/* зачем (packs-simple.html кадр 4, указание координатора 04.10): набор ДО добавления рисует отдельный
            CommunityPackPreview; свой набор (эталон «Карточек», CARDS_LOCKED) идёт прежней веткой без изменений. */}
        {videoSetSurface && currentMarketPack ? (
          <VideoSetView
            pack={currentMarketPack}
            title={packTitleForInterface(currentMarketPack, cardContentLang)}
            cards={listCards}
            lang={lang}
            cardContentLang={cardContentLang}
            onBack={handleCollectionBack}
            onMore={currentMarketPack.isCommunityUgc && !packMine ? () => setPackReportOpen(true) : null}
            onSpeak={(text) => onSpeakCb(text)}
            onOpenMoment={videoMomentPack ? openVideoMoment : null}
            // зачем (cards-v2 videoSet(), 12.10): «Добавить +» / «✓ В моих наборах» — кнопка ряда под названием (CommunityPackSocialBar variant="setAdd"),
            // а не нижняя «Учить набор»; логика добавления и покупки прежняя.
            owned={!previewMode}
            onAdded={() => { void loadAll(); }}
            onRequestPurchase={requestPackPurchase}
            onTrain={!previewMode && listCards.length > 0 ? onTrainThisPack : null}
          />
        ) : previewResolving ? (
          <CommunityPackPreviewSkeleton lang={lang} onBack={handleCollectionBack} />
        ) : previewMode && currentMarketPack ? (
          <CommunityPackPreview
            pack={currentMarketPack}
            cards={listCards}
            lang={lang}
            cardContentLang={cardContentLang}
            t={t}
            onBack={handleCollectionBack}
            onMore={() => setPackReportOpen(true)}
            onAdded={() => { void loadAll(); }}
            onRequestPurchase={requestPackPurchase}
            onOpenComments={() => { setHighlightCommentId(null); setCommentsSheetOpen(true); }}
            onSpeak={onSpeakCb}
            cardsLoading={deeplinkCardsState === 'pending' && listCards.length === 0}
          />
        ) : (<>
        {savedSurface ? (
          <CollectionTopBar
            lang={lang}
            onBack={handleCollectionBack}
            onMenu={() => setSavedActionsOpen(true)}
            selectionMode={selectionMode}
            selectedCount={selectedCardIds.length}
            selectionTotal={savedCardsForPackLanguage.length}
            onExitSelection={exitSelectionMode}
            onSearch={() => setSearchOpen((open) => !open)}
            searchOpen={searchOpen || searchInput.length > 0}
            limitLabel={savedLimitReached ? `${Math.min(savedCards.length, FREE_SAVED_CARD_LIMIT)}/${FREE_SAVED_CARD_LIMIT}` : null}
            limitIcon="bookmark-outline"
            onCreate={openCreateEditor}
          />
        ) : packSurface ? (
          <PackTopBar lang={lang} onBack={handleCollectionBack} onMenu={() => setSavedActionsOpen(true)} />
        ) : (
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
          savedContentKind={activeCat === 'saved' && !packDeeplink ? savedContentKind : undefined}
          savedContentCounts={activeCat === 'saved' && !packDeeplink ? savedContentCounts : undefined}
          onSavedContentKindChange={setSavedContentKind}
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
          showSearch={!packDeeplink && (activeCat === 'saved' || !(isEmpty && !searchActive))}
          searchInput={searchInput}
          searchActive={searchActive}
          onSearchInput={setSearchInput}
        />
        )}

        {/*
          Лайк и «Добавить себе» — на самом наборе.

          БАГ «невидимой стены» (замечание владельца): раньше строка была обёрнута
          в <ContentWrap>, а у него `flex: 1`. Соседом списка он забирал ПОЛОВИНУ
          высоты экрана прозрачным блоком — карточки уезжали под невидимый слой.
          Обёртка ниже ограничивает ширину БЕЗ flex, поэтому список получает всю
          оставшуюся высоту.
        */}
        {/* Набор собран из ролика — широкое превью НАД социальной строкой
            (владелец 2026-09-23: «покажи как выглядит внутри любого набора
            тоже экран — с видео вверху»). Набор без `videoId` этот блок не
            рисует вообще, поэтому обычные наборы не меняются ни на пиксель. */}
        {packDeeplink && currentMarketPack?.videoId ? (
          <View style={{ maxWidth: contentMaxW, alignSelf: 'center', width: '100%', paddingHorizontal: 16 }}>
            <PackVideoHero pack={currentMarketPack} lang={lang} t={t} />
          </View>
        ) : null}

        {packDeeplink && currentMarketPack?.isCommunityUgc && !packSurface ? (
          <View style={[st.socialRow, { maxWidth: contentMaxW }]}>
            <CommunityPackSocialBar
              pack={currentMarketPack}
              lang={lang}
              t={t}
              owned={packOwnedByMe}
              variant="screen"
              onAdded={() => { void loadAll(); }}
              // Шит покупки — ТОТ ЖЕ, что у наборов за жемчуг, с той же анимацией (владелец 2026-09-17): меняется только валюта.
              onRequestPurchase={requestPackPurchase}
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

        {savedSurface && (loading && listCards.length === 0 || isEmpty) ? (
          <View style={{ paddingHorizontal: 20 }}>{savedTitleBlock}</View>
        ) : null}
        {activeCat === 'saved' && loading && !packDeeplink && listCards.length === 0 ? (
          <SavedCollectionLoading lang={lang} />
        ) : isEmpty && activeCat === 'saved' && !packDeeplink ? (
          <SavedCollectionState
            lang={lang}
            loadError={loadError}
            searchActive={searchQuery.trim().length > 0}
            onCommunity={openCommunityPacks}
            onRetry={loadAll}
          />
        ) : isEmpty ? (
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
        ) : savedSurface || packSurface ? (
          <CollectionGalleryView
            cards={listCards}
            searchQuery={savedSurface ? searchQuery : ''}
            searchField={savedSurface && (searchOpen || searchInput.length > 0)
              ? <CollectionSearchField lang={lang} value={searchInput} onChange={setSearchInput} onClose={() => setSearchOpen(false)} autoFocus />
              : undefined}
            gridTopGap={packSurface ? 0 : undefined}
            lang={cardContentLang}
            header={savedSurface ? savedTitleBlock : packInfoBlock}
            hiddenByLimitCount={hiddenByLimitCount}
            limitCta={savedLimitReached ? { onPress: openPremiumLimit } : null}
            onOpenPremiumLimit={openPremiumLimit}
            onOpenCard={openCardFromGallery}
            onSpeak={(text) => onSpeakCb(text)}
            strengthForCard={strengthForCard}
            onCardsViewed={registerFlashcardViewed}
            isEditableCustomCard={isEditableCustomCard}
            onEditCard={openEditEditor}
            onDeleteCardById={deleteCardById}
            selectionMode={selectionMode}
            selectedIds={selectedCardIdSet}
            onToggleSelection={toggleSavedCardSelection}
            selectedCount={selectedCardIds.length}
            canCreatePack={canCreatePackFromSelection(selectedCardIds) && !selectionCreateBusy}
            selectionRemaining={remainingCardsToMinimum(selectedCardIds)}
            onCreatePack={openCreatePackFromSelection}
            onDeleteSelected={confirmDeleteSelected}
            showDeleteHint={showDeleteHint && !undoEntry && !packUndo && !hintCoveredByOverlay} // зачем (координатор 12.10, cards-006): внизу одна плашка за раз — пока видна «Удалено · Вернуть», подсказка «Зажми карточку…» прячется (состояние подсказки не теряется, вернётся после плашки)
            onSetShowDeleteHint={setShowDeleteHint}
            // зачем (Макеты cards-section-012, 12.10): на экране набора кнопка «Тренировать» уже есть в шапке (packInfoBlock), плавающая её дублировала и закрывала нижние ряды сетки; в образце cards-v2 №14 поверх сетки ничего нет
            onTrain={listCards.length > 0 && !packSurface && !undoEntry && !packUndo ? onTrainGallery : null} // зачем (R1_DIFF_ONE_FIX, cards-v2-010): под плашкой «Удалено · Вернуть» выглядывал край «Тренировать» — внизу одна плашка за раз
            allowAddCustomCard={false}
            onCreateCard={openCreateEditor}
            activeCat={activeCat}
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
            showDeleteHint={showDeleteHint && !undoEntry && !packUndo && !hintCoveredByOverlay} // зачем (координатор 12.10, cards-006): внизу одна плашка за раз — пока видна «Удалено · Вернуть», подсказка «Зажми карточку…» прячется (состояние подсказки не теряется, вернётся после плашки)
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
            onOpenVideoMoment={videoMomentPack ? openVideoMoment : null}
            videoMomentLabel={videoMomentLabel}
          />
        )}

        </>)}

      {packUndo && !undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={Math.max(insets.bottom + 6, 14)}
          lang={cardContentLang}
          t={t}
          f={f}
          onUndo={undoPackDelete}
        />
      )}
      {undoEntry && (
        <UndoDeleteSnackbar
          bottomOffset={Math.max(insets.bottom + 6, 14)}
          lang={cardContentLang}
          t={t}
          f={f}
          onUndo={undoDelete}
        />
      )}

      {savedSurface || packSurface ? (
        <CollectionMenuSheet
          visible={savedActionsOpen}
          onClose={() => setSavedActionsOpen(false)}
          menu={{
            lang,
            viewMode,
            onToggleViewMode: toggleViewMode,
            showViewToggle: savedSurface && !isEmpty,
            hasFilter: savedSurface && filterGroups.length > 0 && savedContentKind === 'phrase',
            filterActive: activeFilter !== 'all',
            onOpenFilter: () => setFilterOpen(true),
            savedContentKind: savedSurface ? savedContentKind : undefined,
            savedContentCounts: savedSurface ? savedContentCounts : undefined,
            onSavedContentKindChange: savedSurface ? setSavedContentKind : undefined,
            packLanguage: savedSurface ? packLanguage : undefined,
            onPackLanguageChange: savedSurface ? handlePackLanguageChange : undefined,
            selectionMode,
            selectedCount: selectedCardIds.length,
            onEnterSelection: savedSurface ? enterSelectionMode : undefined,
            onDeleteSelected: confirmDeleteSelected,
            onOpenCommunity: savedSurface ? openCommunityPacks : undefined,
            showPublish: packSurface && showPublishButton,
            publishBusy,
            onPublish: onPublishPack,
            showEdit: packSurface && (showEditButton || packMine),
            onEdit: onEditPack,
            title: packSurface ? packTitleText : undefined,
            onDeletePack: packSurface && packMine && !!currentMarketPack ? () => setDeletePackOpen(true) : undefined,
            onNewCard: packSurface && (showEditButton || packMine) ? onEditPack : undefined,
            onReport: packSurface && !packMine && !!currentMarketPack?.isCommunityUgc ? () => setPackReportOpen(true) : undefined,
          }}
        />
      ) : null}

      <FlashcardsFilterDropdown
        visible={filterOpen && !selectionMode && (activeCat !== 'saved' || savedContentKind === 'phrase')}
        savedGlass={activeCat === 'saved' && !packDeeplink}
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
        visible={deletePackOpen}
        title={triLang(lang, { ru: 'Удалить набор', uk: 'Видалити набір', en: 'Delete pack', es: 'Eliminar pack', 'pt-BR': 'Excluir pacote', vi: 'Xóa bộ thẻ', id: 'Hapus paket', tr: 'Paketi sil', pl: 'Usuń zestaw' })}
        message={`«${packTitleText}» — ${triLang(lang, {
          ru: 'набор будет убран из твоих наборов.', uk: 'набір буде прибрано з твоїх наборів.', en: 'this pack will be removed from your packs.', es: 'este pack se quitará de tus packs.',
          'pt-BR': 'este pacote será removido dos seus pacotes.', vi: 'bộ thẻ này sẽ bị xóa khỏi các bộ của bạn.', id: 'paket ini akan dihapus dari paketmu.', tr: 'bu paketlerinden kaldırılacak.', pl: 'ten zestaw zostanie usunięty z twoich zestawów.',
        })}`}
        cancelLabel={triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'Vazgeç', pl: 'Anuluj' })}
        confirmLabel={triLang(lang, { ru: 'Удалить набор', uk: 'Видалити набір', en: 'Delete pack', es: 'Eliminar pack', 'pt-BR': 'Excluir pacote', vi: 'Xóa bộ thẻ', id: 'Hapus paket', tr: 'Paketi sil', pl: 'Usuń zestaw' })}
        confirmVariant="default"
        destructive
        testIDPrefix="fc-delete-pack-confirm"
        onCancel={() => setDeletePackOpen(false)}
        onConfirm={confirmDeletePack}
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
      {/* D131: ролик набора на секунде фразы; закрытие возвращает в тот же набор. */}
      {videoMoment ? (
        <HomeV2VideoPlayerModal
          testID="pack-video-moment-player"
          video={{ id: videoMoment.videoId, title: videoMoment.title }}
          startSec={videoMoment.startSec}
          onClose={closeVideoMoment}
        />
      ) : null}

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
                // зачем (R1_PAYWALL_UX, координатор 12.10): раньше при отказе крутилка просто пропадала и окно оставалось без слова. Нехватка рун сама
                // переключает окно на «Пополнить» (mode считается по балансу), поэтому тост — для остальных причин (смена аккаунта, неверная цена).
                if (res.reason !== 'insufficient_runes') emitAppEvent('action_toast', res.reason === 'invalid_price' ? packBuyUnavailableToast() : packBuyFailedToast()); // неверная цена повтором не лечится
                return;
              }
              await addCommunityPackToLibrary(purchasePack);
              // зачем (владелец 2026-09-21): руны получает АВТОР набора. Догонка
              // фоновая — покупатель её не ждёт, набор уже добавлен.
              void syncPendingPackSales(token);
              purchasingRef.current = false;
              setPurchasing(false);
              setPurchasePack(null);
              void loadAll();
            }).catch((error: unknown) => {
              purchasingRef.current = false;
              setPurchasing(false);
              emitAppEvent('action_toast', packBuyFailedToast()); // зачем (R1_PAYWALL_UX): сбой после списания не должен быть немым
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

    </View>
    {expandedData ? (
      <ExpandedCardV2
        card={expandedData}
        lang={lang}
        overline={expandedOverline}
        sourceCard={expandedOpened}
        // зачем (Карточки 2.0, «В набор»): своих неопубликованных наборов нет — открываем «Новый набор» (черновик создаётся с нуля)
        onCreatePack={() => { setOpenedCardId(null); router.push({ pathname: '/community_pack_create', params: { fresh: '1' } } as never); }}
        footer={expandedOwn ? 'own' : 'foreign'}
        showSave={!savedSurface}
        saved={openedSaved}
        canEdit={!!expandedOpened && (expandedEditable || packMine)}
        canDelete={!!expandedOpened && (expandedEditable || expandedOpened.categoryId === 'saved' || packCardDeletable || publishedCardDeletable)}
        onClose={closeOpenedCard}
        onSpeak={(text) => onSpeakCb(text)}
        onEdit={() => {
          const card = expandedOpened;
          setOpenedCardId(null);
          if (!card) return;
          if (expandedEditable) openEditEditor(card);
          else onEditPack();
        }}
        onDelete={() => {
          const card = expandedOpened;
          setOpenedCardId(null);
          if (!card) return;
          if (expandedEditable || card.categoryId === 'saved') void deleteCardById(card.id);
          else if (packCardDeletable) deletePackCard(card);
          else if (publishedCardDeletable) deletePublishedPackCard(card);
        }}
        onToggleSave={onToggleOpenedSave}
      />
    ) : null}
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
