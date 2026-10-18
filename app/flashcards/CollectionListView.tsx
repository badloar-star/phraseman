/**
 * cards-2.0 (E11): списочный view коллекции, вынесенный 1:1 из монолита
 * flashcards_collection.tsx (§3.2, §7 E11). Контейнер остаётся оркестратором
 * (данные, фильтр/поиск, undo-пайплайн, модалки); здесь — только list-UI:
 * FlatList + FlashcardListItem, swipe-удаление, delete-hint онбординг,
 * escort-скролл к деталям, free-limit секция и действия тренировки.
 */
import { useStudyTarget } from '../../components/StudyTargetContext';
import { markDeleteHintSeen, resetDeleteHintSeen } from './delete_hint_seen';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import Reanimated, { FadeInDown, LinearTransition, type SharedValue } from 'react-native-reanimated';
import DuoPressable from '../../components/DuoPressable';
import { FlowText } from '../../components/text-integrity';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens, type GlassTokens } from '../../constants/liquidGlassThemePalette';
import { PlateFill, actionBoxShadow, plateBoxShadow, raisedBoxShadow } from '../../components/v2/ShadowSurface';
import { LV2_BAD } from '../../components/learning-v2/LearningV2Glass';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import PressableHybrid from '../../components/PressableHybrid';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { IS_EXPO_GO } from '../config';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWithCount, pluralWord } from '../../constants/plural'; // зачем (проход по склейке «число + слово», 12.10): число и существительное согласуются через общий помощник
import type { Theme } from '../../constants/theme';
import type { SpeakOpts } from '../../hooks/use-audio';
import { soundDirector } from '../../modules/audio/sound_director';
import ReportErrorButton from '../../components/ReportErrorButton';
import FlashcardListItem from './FlashcardListItem';
import { FLASHCARD_LIST_ITEM_CARD_STYLE } from './FlashcardListItemChrome';
import type { WordStrength } from './word_strength';
import { CardItem, CategoryId, resolveFlashcardBackText, type FlashcardContentLang } from './types';
import { DebugLogger } from '../debug-logger';
import { buildSourceLabel } from './source_labels';
import { remainingCardsToMinimum } from './saved_card_selection';

/** Монотонний фліп (timing замість spring) + різке opacity — без «моргання» біля 0.5. */
const FLASHCARD_FLIP_DURATION_MS = 280;
const flashcardFlipEasing = Easing.out(Easing.cubic);

/** Геометрія списку — для розрахунку offset ескорт-скролу (onLayout-высоты, без measureInWindow). */
const LIST_PAD_TOP = 12;
const LIST_ROW_GAP = 12;
const ListRowGap = () => <View style={{ height: LIST_ROW_GAP }} />;

// зачем (Тень 12.10): заливка плашек списка «Сохранённых» — PlateFill (градиент 180° темы) вместо блюр-блика с кромкой-линией
function SavedListGlass({ g, radius, raised = false }: { g: GlassTokens; radius: number; raised?: boolean }) {
  return <PlateFill g={g} radius={radius} raised={raised} />;
}

export type PackCardTheme = {
  borderAccent: string;
  frontGradient: readonly [string, string];
  backGradient: readonly [string, string];
};

type Props = {
  /** Уже отфильтрованные/найденные/обрезанные лимитом карточки. */
  cards: CardItem[];
  hiddenByLimitCount: number;
  activeCat: CategoryId;
  packDeeplink: string | null;
  lang: Lang; // зачем (R07, координатор 15.10): язык интерфейса — подписи на 9 языках; перевод карточек — cardContentLang
  cardContentLang: FlashcardContentLang;
  t: Theme;
  f: Record<string, number>;
  sourceLabels: Record<string, string>;
  deleteLabel: string;
  voiceLabel: string;
  editLabel: string;
  cardHeight: number;
  peek: number;
  packCardTheme?: PackCardTheme | null;
  /** Каскад FadeInDown строк — только для премиального просмотра пака. */
  packEnterAnimation: boolean;
  focusedIndexSV: SharedValue<number>;
  /** Поиск активен и ничего не нашёл → инлайн-плейсхолдер вместо пустого списка. */
  searchActive: boolean;
  showDeleteHint: boolean;
  onSetShowDeleteHint: (v: boolean) => void;
  allowAddCustomCard: boolean;
  onCreateCard: () => void;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
  onEditCard: (item: CardItem) => void;
  isEditableCustomCard: (item: CardItem) => boolean;
  /** Персист-пайплайн удаления контейнера (оптимистично + очередь + undo). */
  onDeleteCardById: (cardId: string, fallbackIdx?: number) => void | Promise<void>;
  onOpenPremiumLimit: () => void;
  onFocusedIndexChanged: (idx: number) => void;
  onCardsViewed: (ids: string[]) => void;
  onFlipTracked: (cardId: string) => void;
  /** @deprecated режимы живут в шапке (`CollectionHeader`); проп ничего не рисует. */
  trainPanelVisible?: boolean;
  /** @deprecated см. `CollectionHeader`. */
  onTrainDeck?: () => void;
  /** E13: «сила слова» по EN карточки (word_strength.strengthFor); null — без точек. */
  strengthForCard?: ((en: string) => WordStrength | null) | null;
  /** Cards 2.1 §5.2: запас снизу под закреплённый таббар раздела (0 — таббара нет). */
  extraBottomPad?: number;
  /**
   * Cards 2.1 §5.2: покадровый офсет списка для нижнего таббара раздела —
   * капсула сжимается при скролле вниз (`useFcTabBarScroll().onScroll`).
   * Обработчик не держит state, поэтому список от него не ре-рендерится.
   */
  onScroll?: (e: { nativeEvent?: { contentOffset?: { y?: number } } }) => void;
  /**
   * Витрина «Лучшее у сообщества» над первой карточкой (владелец, 2026-08-29).
   *
   * Именно ШАПКА СПИСКА, а не блок над ним: владелец потребовал, чтобы она
   * скроллилась вместе с карточками и уезжала за экран, а не висела прибитой.
   */
  listHeader?: React.ReactElement | null;
  /** Dense saved-card picker; normal card interactions are bypassed in this mode. */
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (cardId: string) => void;
  selectedCount?: number;
  canCreatePack?: boolean;
  selectionRemaining?: number;
  onCreatePack?: () => void;
  onDeleteSelected?: () => void;
  /** D131/PM-288: набор из видео — фраза с таймкодом открывает ролик на своей секунде. */
  onOpenVideoMoment?: ((item: CardItem) => void) | null;
  videoMomentLabel?: string;
};

export default function CollectionListView({
  cards,
  hiddenByLimitCount,
  activeCat,
  packDeeplink,
  lang,
  cardContentLang,
  t,
  f,
  sourceLabels,
  deleteLabel,
  voiceLabel,
  editLabel,
  cardHeight,
  peek,
  packCardTheme = null,
  packEnterAnimation,
  focusedIndexSV,
  searchActive,
  showDeleteHint,
  onSetShowDeleteHint,
  allowAddCustomCard,
  onCreateCard,
  onSpeak,
  onEditCard,
  isEditableCustomCard,
  onDeleteCardById,
  onOpenPremiumLimit,
  onFocusedIndexChanged,
  onCardsViewed,
  onFlipTracked,
  strengthForCard = null,
  extraBottomPad = 0,
  onScroll,
  listHeader = null,
  selectionMode = false,
  selectedIds = new Set<string>(),
  onToggleSelection,
  selectedCount = 0,
  canCreatePack = false,
  selectionRemaining,
  onCreatePack,
  onDeleteSelected,
  onOpenVideoMoment = null,
  videoMomentLabel,
}: Props) {
  // зачем (аудит #10): ключ подсказки — по цели обучения, как читает useCollectionData
  const { studyTarget: hintStudyTarget } = useStudyTarget();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const flatListRef = useRef<any>(null);
  const [scrollViewH, setScrollViewH] = useState(0);
  const scrollViewHRef = useRef(0);

  // Long-press delete overlay
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  // Delete hint onboarding
  const deleteHintAnim = useRef(new Animated.Value(0)).current;
  const deleteHintPulse = useRef(new Animated.Value(1)).current;
  const deleteHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteHintPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  // Anim registries (per-card, lazy)
  const cardFlipAnims = useRef<Record<string, Animated.Value>>({});
  const overlayAnims = useRef<Record<string, Animated.Value>>({});
  const cardDeleteAnims = useRef<Record<string, { opacity: Animated.Value; scale: Animated.Value }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const cardFlippedState = useRef<Record<string, boolean>>({});

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

  // ── Category/data switch: сброс флипов (та же семантика, что в монолите) ──
  useEffect(() => {
    Object.values(cardFlipAnims.current ?? {}).forEach((a) => a.setValue(0));
    cardFlippedState.current = {};
  }, [activeCat, cards]);

  // ── Scroll to top when category/pack switches ─────────────────────────────
  useEffect(() => {
    if (flatListRef.current) {
      (flatListRef.current as any).scrollToOffset({ offset: 0, animated: false });
    }
  }, [activeCat, packDeeplink]);

  // ── Viewability: STABLE identity callback, mutable deps через refs ────────
  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 45 }), []);
  const listCardsRef = useRef<CardItem[]>([]);
  const onCardsViewedRef = useRef(onCardsViewed);
  const onFocusedIndexChangedRef = useRef(onFocusedIndexChanged);
  const focusedIdxRef = useRef(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const top = viewableItems[0];
    if (top?.index != null && top.index !== focusedIdxRef.current) {
      focusedIdxRef.current = top.index;
      onFocusedIndexChangedRef.current(top.index);
    }
    const ids: string[] = [];
    for (const token of viewableItems) {
      if (!token.isViewable || token.index == null) continue;
      const card = listCardsRef.current[token.index];
      if (card?.id) ids.push(card.id);
    }
    onCardsViewedRef.current(ids);
  }).current;
  listCardsRef.current = cards;
  onCardsViewedRef.current = onCardsViewed;
  onFocusedIndexChangedRef.current = onFocusedIndexChanged;

  /**
   * Escort-скролл к раскрытым деталям: высоты строк из onLayout + один scrollToOffset
   * в момент завершения анимации раскрытия (без measureInWindow и таймаутов 1100/1200мс).
   * Прерывание — onScrollBeginDrag (только пользовательский drag).
   */
  const detailsEscortUserDragRef = useRef(false);
  /** id → полная высота строки (карточка + раскрытые детали) из onLayout. */
  const rowHeightsRef = useRef<Record<string, number>>({});
  /**
   * Высота шапки списка (витрина «Лучшее у сообщества»).
   *
   * зачем: `onDetailsScrollSettled` ниже считает офсет строки ВРУЧНУЮ, начиная
   * с LIST_PAD_TOP. Шапка стоит выше первой карточки — без её высоты раскрытие
   * деталей уводило бы список мимо цели ровно на высоту витрины.
   */
  const listHeaderHRef = useRef(0);
  const onRowLayout = useCallback((id: string, height: number) => {
    rowHeightsRef.current[id] = height;
  }, []);
  const onDetailsOpenAnimStarted = useCallback(() => {
    detailsEscortUserDragRef.current = false;
  }, []);
  const onDetailsScrollSettled = useCallback((info: { itemId: string; itemIndex: number }) => {
    if (detailsEscortUserDragRef.current) {
      detailsEscortUserDragRef.current = false;
      return;
    }
    const list = flatListRef.current;
    const cardsArr = listCardsRef.current;
    if (!list || cardsArr.length === 0) return;
    const idx = cardsArr.findIndex((c) => c.id === info.itemId);
    if (idx < 0) return;
    const heights = rowHeightsRef.current;
    let top = LIST_PAD_TOP + listHeaderHRef.current;
    let measuredAll = true;
    for (let i = 0; i < idx; i++) {
      const h = heights[cardsArr[i].id];
      if (h == null) { measuredAll = false; break; }
      top += h + LIST_ROW_GAP;
    }
    if (!measuredAll) {
      // Строки выше ещё не мерялись (редко) — scrollToIndex, onScrollToIndexFailed подстрахует
      try {
        (list as any).scrollToIndex({ index: idx, viewPosition: 0.5, viewOffset: 0, animated: true });
      } catch (e) {
      // ignore
      DebugLogger.error('CollectionListView:h', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      return;
    }
    const rowH = heights[info.itemId] ?? 0;
    const viewportH = scrollViewHRef.current;
    const target = viewportH > 0
      ? Math.max(0, top + rowH / 2 - viewportH / 2)
      : Math.max(0, top - LIST_PAD_TOP - listHeaderHRef.current);
    (list as any).scrollToOffset({ offset: target, animated: true });
  }, []);

  // ── Delete hint onboarding ────────────────────────────────────────────────
  const dismissDeleteHint = useCallback(() => {
    if (deleteHintTimer.current) clearTimeout(deleteHintTimer.current);
    if (deleteHintPulseLoop.current) deleteHintPulseLoop.current.stop();
    Animated.timing(deleteHintAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      onSetShowDeleteHint(false);
      markDeleteHintSeen(hintStudyTarget, 'CollectionListView:dismissDeleteHint');
    });
  }, [deleteHintAnim, hintStudyTarget, onSetShowDeleteHint]);

  useEffect(() => {
    if (!showDeleteHint) return;
    // Fade in
    Animated.timing(deleteHintAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      // Start pulse loop after fade-in
      deleteHintPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(deleteHintPulse, { toValue: 1.025, duration: 700, useNativeDriver: true }),
          Animated.timing(deleteHintPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        // зачем (PM-032): разовая реакция, а не вечная пульсация.
        { iterations: 3 },
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

  // ── Delete with animation (персист — через контейнерный onDeleteCardById) ──
  const handleDeleteCard = useCallback((item: CardItem, itemIdx: number) => {
    // зачем: удаление уже необратимо решено нажатием (диалога подтверждения
    // здесь нет) — звук играет сразу, оптимистично, до анимации ухода карточки
    // и до await onDeleteCardById.
    soundDirector.request('pm.cards.editor_delete', { scope: 'cards' });
    const anim = getDeleteAnim(item.id);
    anim.opacity.setValue(1);
    anim.scale.setValue(1);
    setDeletingId(item.id);
    setLongPressedId(null);
    // Поджатие → fade out. ВАЖНО: потолок масштаба строго 1 — апскейл вьюхи с
    // текстом рисует слой в layout-размере и растягивает его, отчего кириллица
    // выглядит «мыльной/пиксельной» во время анимации (жалоба владельца).
    Animated.sequence([
      Animated.timing(anim.scale, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(anim.scale, { toValue: 0.9, duration: 260, useNativeDriver: true }),
        Animated.timing(anim.opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(async () => {
      await onDeleteCardById(item.id, itemIdx);
      setDeletingId(null);
    });
  }, [getDeleteAnim, onDeleteCardById]);

  // ── Flip individual card by index (list mode: all cards visible) ──────────
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
    // Трекинг: только при переворачивании (не возврате) — контейнерный колбэк.
    if (!isNowFlipped) onFlipTracked(cardId);
  }, [getCardFlipAnim, onFlipTracked]);

  const openDelete = useCallback((cardId: string) => setLongPressedId(cardId), []);
  const closeDelete = useCallback(() => setLongPressedId(null), []);

  /** E7: swipe-to-delete — красная зона под свайп влево (native; web — кнопка в деталях). */
  const renderSwipeDeleteAction = useCallback(
    () => (
      <View
        style={{
          width: 96,
          marginLeft: 12,
          borderRadius: 20,
          backgroundColor: LV2_BAD, // зачем (замечание владельца 10.10): красный удаления — семантический токен, не литерал
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
        }}
      >
        <Ionicons name="trash-outline" size={24} color={g.mediaInk} />
        <Text style={{ color: g.mediaInk, fontSize: f.caption, fontWeight: '700', marginTop: 4 }}>
          {deleteLabel}
        </Text>
      </View>
    ),
    [f.caption, deleteLabel, g.mediaInk],
  );

  const reduceMotion = useReduceMotion();
  const renderItem = useCallback(({ item, index: itemIdx }: { item: CardItem; index: number }) => {
    if (selectionMode) {
      const selected = selectedIds.has(item.id);
      const sourceLabel = buildSourceLabel(item.origin ?? { source: item.source, sourceId: item.sourceId, sourceTitle: item.sourceTitle }, lang);
      const backText = resolveFlashcardBackText(item, cardContentLang);
      return (
        <PressableHybrid
          testID={`fc-selection-card-${item.id}`}
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.en}. ${backText}. ${sourceLabel}`}
          accessibilityState={{ checked: selected }}
          onPress={() => onToggleSelection?.(item.id)}
          contentStyle={{
            minHeight: 82,
            borderRadius: 16,
            // зачем (Тень 12.10): карточка выбора — плашка без рамки; отмеченная приподнята (raised)
            boxShadow: selected ? raisedBoxShadow(g) : plateBoxShadow(g),
            paddingHorizontal: 12,
            paddingVertical: 9,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <SavedListGlass g={g} radius={16} raised={selected} />
          {/* индикатор выбора (чекбокс) — кольцо оставлено намеренно: это не контейнер */}
          <View style={{ width: 30, height: 30, borderRadius: 10, borderWidth: 1.5, borderColor: g.glassEdge /* shadow-ok: индикатор выбора (чекбокс) */, backgroundColor: selected ? g.cta : g.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
            {selected ? <Ionicons name="checkmark" size={18} color={g.ctaInk} /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <FlowText testID={`fc-select-front-${item.id}`} provenance="external" style={{ color: g.text, fontSize: f.body, fontWeight: '700' }}>{item.en}</FlowText>
            <FlowText testID={`fc-select-back-${item.id}`} provenance="external" style={{ color: g.secondary, fontSize: f.caption, marginTop: 2 }}>{backText}</FlowText>
            <FlowText testID={`fc-select-source-${item.id}`} provenance="external" style={{ color: g.secondary, fontSize: Math.max(10, f.caption - 1), fontWeight: '700', marginTop: 3 }}>{sourceLabel}</FlowText>
          </View>
        </PressableHybrid>
      );
    }
    const editableCustom = isEditableCustomCard(item);
    const deletable =
      !item.isSystem && (editableCustom || item.categoryId === 'saved');
    const cardEl = (
      <FlashcardListItem
        item={item}
        itemIdx={itemIdx}
        lang={cardContentLang}
        activeCat={activeCat}
        savedCollectionSurface={activeCat === 'saved' && !packDeeplink}
        deletingId={deletingId}
        longPressedId={longPressedId}
        t={t}
        f={f}
        sourceLabels={sourceLabels}
        deleteLabel={deleteLabel}
        voiceLabel={voiceLabel}
        cardHeight={activeCat === 'saved' && !packDeeplink ? 112 : cardHeight}
        cardStyle={FLASHCARD_LIST_ITEM_CARD_STYLE}
        sourceBadgeStyle={st.sourceBadge}
        sourceBadgeTextStyle={st.sourceBadgeText}
        getCardFlipAnim={getCardFlipAnim}
        getOverlayAnim={getOverlayAnim}
        getDeleteAnim={getDeleteAnim}
        onFlipCard={handleFlipCard}
        onOpenDelete={openDelete}
        onCloseDelete={closeDelete}
        onDeleteCard={handleDeleteCard}
        onSpeak={onSpeak}
        onDetailsOpenAnimStarted={onDetailsOpenAnimStarted}
        onDetailsScrollSettled={onDetailsScrollSettled}
        onRowLayout={onRowLayout}
        packCardTheme={packCardTheme}
        focusedIndexSV={focusedIndexSV}
        chevronHintDelayMs={packEnterAnimation ? 500 + Math.min(itemIdx, 24) * 36 : 0}
        onEditCard={editableCustom ? onEditCard : null}
        editLabel={editLabel}
        onDeleteFromDetails={
          Platform.OS === 'web' && deletable ? handleDeleteCard : null
        }
        strength={strengthForCard ? strengthForCard(item.en) : null}
        onOpenVideoMoment={onOpenVideoMoment}
        videoMomentLabel={videoMomentLabel}
      />
    );
    /** Swipe-влево = удалить (custom + saved, native). Web/фолбэк — long-press и кнопка в деталях. */
    const rowEl =
      Platform.OS !== 'web' && deletable ? (
        <ReanimatedSwipeable
          friction={1.6}
          rightThreshold={56}
          overshootRight={false}
          renderRightActions={renderSwipeDeleteAction}
          onSwipeableOpen={(direction) => {
            if (direction !== SwipeDirection.RIGHT) return;
            // Строку не закрываем: оптимистичное удаление сразу убирает её из data
            void handleDeleteCard(item, itemIdx);
          }}
        >
          {cardEl}
        </ReanimatedSwipeable>
      ) : (
        cardEl
      );
    if (!packEnterAnimation) return rowEl;
    return (
      <Reanimated.View entering={FadeInDown.duration(420).delay(Math.min(itemIdx, 24) * 36)}>
        {rowEl}
      </Reanimated.View>
    );
  }, [
    cardContentLang,
    activeCat,
    packDeeplink,
    deletingId,
    longPressedId,
    t,
    f,
    sourceLabels,
    deleteLabel,
    voiceLabel,
    cardHeight,
    getCardFlipAnim,
    getOverlayAnim,
    getDeleteAnim,
    handleFlipCard,
    openDelete,
    closeDelete,
    handleDeleteCard,
    onSpeak,
    onDetailsOpenAnimStarted,
    onDetailsScrollSettled,
    onRowLayout,
    packCardTheme,
    packEnterAnimation,
    focusedIndexSV,
    isEditableCustomCard,
    onEditCard,
    editLabel,
    renderSwipeDeleteAction,
    strengthForCard,
    onOpenVideoMoment,
    videoMomentLabel,
    selectionMode,
    selectedIds,
    onToggleSelection,
    lang,
    g.card,
    g.cta,
    g.ctaInk,
    g.glassEdge,
    g.opaqueControl,
    g, // зачем (Тень 12.10): плашки берут заливку и тень из токенов темы целиком; объект токенов кэшируется по теме
    g.secondary,
    g.selected,
    g.text,
  ]);

  /** Нижний «хвост» — чтобы последнюю картку можно было прокрутить к центру. */
  const listPadBottom = selectionMode
    ? 16
    : (scrollViewH > 0 ? Math.max(12, scrollViewH - cardHeight - 12 - peek) : 20) + Math.max(0, extraBottomPad);

  return (
    <View style={{ flex: 1 }}>
      {/* Content wrapper — closes delete-overlay on outside tap */}
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onStartShouldSetResponder={() => longPressedId !== null}
        onResponderGrant={() => setLongPressedId(null)}
      >
        {/* Add card — лише власні картки; не в режимі перегляду купленого паку з маркету */}
        {!selectionMode && activeCat === 'custom' && allowAddCustomCard && (
          <TouchableOpacity
            testID="fc-create-card"
            accessible
            onPress={onCreateCard}
            activeOpacity={0.8}
            style={{
              marginHorizontal: 16, marginTop: 10, marginBottom: 4,
              paddingVertical: 14, paddingHorizontal: 20,
              borderRadius: 14, backgroundColor: t.accent,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={t.textOnGold} />
            <Text style={{ fontSize: f.body, fontWeight: '700', color: t.textOnGold }}>
              {triLang(lang, {
                ru: 'Добавить карточку', uk: 'Додати картку', en: 'Add a card', es: 'Añadir tarjeta',
                'pt-BR': 'Adicionar cartão', vi: 'Thêm thẻ', id: 'Tambah kartu', tr: 'Kart ekle', pl: 'Dodaj kartę',
              })}
            </Text>
          </TouchableOpacity>
        )}

        {/* DEV: reset and show hint button */}
        {!selectionMode && IS_EXPO_GO && !showDeleteHint && (
          <TouchableOpacity
            onPress={() => {
              resetDeleteHintSeen(hintStudyTarget);
              deleteHintAnim.setValue(0);
              onSetShowDeleteHint(true);
            }}
            style={{ alignSelf: 'flex-end', marginRight: 16, marginBottom: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 /* shadow-ok: DEV-кнопка, в магазинной сборке её нет */, borderColor: '#FF6B00' /* theme-exempt: DEV-кнопка, в магазинной сборке её нет */ }}
          >
            <Text style={{ fontSize: 13, color: '#FF6B00' /* theme-exempt: DEV-кнопка */, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'DEV: показать подсказку', uk: 'DEV: показати підказку', en: 'DEV: show hint', es: 'DEV: mostrar ayuda',
                'pt-BR': 'DEV: mostrar dica', vi: 'DEV: hiện gợi ý', id: 'DEV: tampilkan petunjuk', tr: 'DEV: ipucunu göster', pl: 'DEV: pokaż podpowiedź',
              })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Delete hint — one-time onboarding tip */}
        {!selectionMode && showDeleteHint && (
          <Animated.View style={{
            opacity: deleteHintAnim,
            transform: [
              { translateY: deleteHintAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              { scale: deleteHintPulse },
            ],
            position: 'absolute', bottom: 14, left: 16, right: 16, zIndex: 20,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: g.sheet,
            borderRadius: 14, boxShadow: plateBoxShadow(g),
            paddingHorizontal: 14, paddingVertical: 10,
          }}>
            <SavedListGlass g={g} radius={14} />
            <Ionicons name="trash-outline" size={18} color={g.secondary} />
            <Text style={{ flex: 1, color: g.text, fontSize: f.sub, lineHeight: 18 }}>
              {triLang(lang, {
                ru: 'Зажми карточку, чтобы удалить её',
                uk: 'Затисни картку, щоб видалити її',
                en: 'Hold a card to delete it',
                es: 'Mantén pulsada la tarjeta para eliminarla',
                'pt-BR': 'Segure o cartão para excluí-lo',
                vi: 'Giữ thẻ để xóa',
                id: 'Tahan kartu untuk menghapusnya',
                tr: 'Silmek için kartı basılı tut',
                pl: 'Przytrzymaj kartę, aby ją usunąć',
              })}
            </Text>
            <TouchableOpacity onPress={dismissDeleteHint} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color={g.secondary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Card list: virtualized list with snapping */}
        <View
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={(e) => {
            scrollViewHRef.current = e.nativeEvent.layout.height;
            setScrollViewH(e.nativeEvent.layout.height);
          }}
        >
          <Reanimated.FlatList decelerationRate="fast"
            itemLayoutAnimation={reduceMotion ? undefined : LinearTransition.duration(LUM.contentMs)}
            ref={flatListRef as any}
            style={{ flex: 1 }}
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={selectionMode ? (() => <View style={{ height: 6 }} />) : ListRowGap}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: LIST_PAD_TOP, paddingBottom: listPadBottom }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              setLongPressedId(null);
              detailsEscortUserDragRef.current = true;
            }}
            onScrollToIndexFailed={({ index: failedIdx, averageItemLength }) => {
              const list = flatListRef.current;
              if (!list || averageItemLength == null || averageItemLength <= 0) return;
              const maxIdx = Math.max(0, cards.length - 1);
              const safe = Math.min(Math.max(0, failedIdx), maxIdx);
              const offset = Math.max(0, safe * averageItemLength - 24);
              (list as any).scrollToOffset({ offset, animated: true });
              setTimeout(() => {
                try {
                  (list as any).scrollToIndex({ index: safe, viewPosition: 0.5, viewOffset: 0, animated: true });
                } catch (e) {
      // ignore
      DebugLogger.error('CollectionListView:offset', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
              }, 100);
            }}
            /**
             * FIX (владелец, 2026-08-16) «сначала одно, потом ничего не найдено,
             * потом нет карточек»: пустых состояний было ДВА, и на входе они
             * показывались друг за другом. Пока идёт первая загрузка, isEmpty
             * ещё false, поэтому монтировался список — и он рисовал вот эту
             * заглушку; следом экран целиком заменялся на CollectionEmptyState.
             *
             * Пустое состояние теперь ОДНО и живёт в контейнере
             * (flashcards_collection.tsx → CollectionEmptyState). Здесь — null:
             * список ничего не рисует, когда рисовать нечего, и моргать нечему.
             */
            ListEmptyComponent={null}
            ListHeaderComponent={
              listHeader
                ? (
                  <View onLayout={(e) => { listHeaderHRef.current = e.nativeEvent.layout.height; }}>
                    {listHeader}
                  </View>
                )
                : null
            }
            ListFooterComponent={(
              <View>
                {!selectionMode && hiddenByLimitCount > 0 && (
                  <TouchableOpacity
                    testID="flashcards-free-limit-section"
                    accessible
                    activeOpacity={0.85}
                    onPress={onOpenPremiumLimit}
                    style={{
                      marginTop: 4,
                      borderRadius: 20,
                      backgroundColor: g.plateFillFrom,
                      boxShadow: plateBoxShadow(g), // зачем (Тень 12.10): плашка «скрыто лимитом» без рамки
                      paddingVertical: 22,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="lock-closed" size={26} color={g.lightTint} />
                    <Text style={{ color: g.text, fontSize: f.body, fontWeight: '700' }}>
                      {triLang(lang, {
                        ru: `+${hiddenByLimitCount} ${pluralWord('ru', hiddenByLimitCount, { one: 'карточка скрыта', few: 'карточки скрыты', many: 'карточек скрыто' })}`,
                        uk: `+${hiddenByLimitCount} ${pluralWord('uk', hiddenByLimitCount, { one: 'картка прихована', few: 'картки приховані', many: 'карток приховано' })}`,
                        en: `+${hiddenByLimitCount} ${pluralWord('en', hiddenByLimitCount, { one: 'card hidden', few: 'cards hidden', many: 'cards hidden' })}`,
                        es: `+${hiddenByLimitCount} ${pluralWord('es', hiddenByLimitCount, { one: 'tarjeta oculta', few: 'tarjetas ocultas', many: 'tarjetas ocultas' })}`,
                        'pt-BR': `+${hiddenByLimitCount} ${pluralWord('pt-BR', hiddenByLimitCount, { one: 'cartão oculto', few: 'cartões ocultos', many: 'cartões ocultos' })}`,
                        vi: `+${hiddenByLimitCount} thẻ bị ẩn`,
                        id: `+${hiddenByLimitCount} kartu disembunyikan`,
                        tr: `+${hiddenByLimitCount} kart gizli`,
                        pl: `+${hiddenByLimitCount} ${pluralWord('pl', hiddenByLimitCount, { one: 'karta ukryta', few: 'karty ukryte', many: 'kart ukrytych' })}`,
                      })}
                    </Text>
                    <Text style={{ color: g.secondary, fontSize: f.caption, textAlign: 'center' }}>
                      {triLang(lang, {
                        ru: 'Бесплатно доступны первые 50 сохранённых карточек',
                        uk: 'Безкоштовно доступні перші 50 збережених карток',
                        en: 'The first 50 saved cards are free',
                        es: 'Gratis: las primeras 50 tarjetas guardadas',
                        'pt-BR': 'Grátis: os primeiros 50 cartões salvos',
                        vi: 'Miễn phí: 50 thẻ đã lưu đầu tiên',
                        id: 'Gratis: 50 kartu tersimpan pertama',
                        tr: 'Ücretsiz: kaydedilen ilk 50 kart',
                        pl: 'Za darmo: pierwsze 50 zapisanych kart',
                      })}
                    </Text>
                    <View style={{ marginTop: 8, backgroundColor: g.ctaFill, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10 }}>
                      <Text style={{ color: g.ctaFillInk, fontSize: f.sub, fontWeight: '700' }}>
                        {triLang(lang, {
                          ru: 'Открыть все с Plus',
                          uk: 'Відкрити все з Plus',
                          en: 'Unlock all with Plus',
                          es: 'Desbloquear todo con Plus',
                          'pt-BR': 'Desbloquear tudo com Plus',
                          vi: 'Mở tất cả với Plus',
                          id: 'Buka semua dengan Plus',
                          tr: 'Plus ile tümünü aç',
                          pl: 'Odblokuj wszystko z Plus',
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ReportErrorButton
                    screen="flashcards_collection"
                    dataId={`flashcards_${activeCat}`}
                    dataText={triLang(lang, {
                      ru: `Карточки · ${activeCat}`,
                      uk: `Картки · ${activeCat}`,
                      en: `Cards · ${activeCat}`,
                      es: `Tarjetas · ${activeCat}`,
                      'pt-BR': `Cartões · ${activeCat}`,
                      vi: `Thẻ · ${activeCat}`,
                      id: `Kartu · ${activeCat}`,
                      tr: `Kartlar · ${activeCat}`,
                      pl: `Karty · ${activeCat}`,
                    })}
                  />
                </View>
              </View>
            )}
          />
        </View>
      </View>

      {selectionMode ? (
        <Reanimated.View entering={reduceMotion ? undefined : FadeInDown.duration(LUM.contentMs)} testID="fc-selection-action-bar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: g.sheet, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom > 0 ? 12 : 20 }}>
          <SavedListGlass g={g} radius={0} />
          {/* зачем (координатор 13.10, cards-007): при пустом выборе подсказки нет, как в образце */}
          {!canCreatePack && selectedIds.size > 0 ? (
            <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 17, textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
                ru: `Выбери ещё ${pluralWithCount('ru', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'карточку', few: 'карточки', many: 'карточек' })}, чтобы создать набор`, uk: `Познач ще ${pluralWithCount('uk', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'картку', few: 'картки', many: 'карток' })}, щоб створити набір`,
                en: `Select ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} more ${pluralWord('en', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'card', few: 'cards', many: 'cards' })} to create a pack`, es: `Elige ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} ${pluralWord('es', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })} más para crear un pack`,
                'pt-BR': `Escolha mais ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} ${pluralWord('pt-BR', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'cartão', few: 'cartões', many: 'cartões' })} para criar um pacote`, vi: `Chọn thêm ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} thẻ để tạo bộ thẻ`,
                id: `Pilih ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} kartu lagi untuk membuat paket`, tr: `Paket oluşturmak için ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} kart daha seç`,
                pl: `Wybierz jeszcze ${pluralWithCount('pl', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'kartę', few: 'karty', many: 'kart' })}, aby utworzyć zestaw`,
              })}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12 }}>
          <DuoPressable
            testID="fc-create-pack-from-selection"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un set', 'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
            })}
            accessibilityHint={canCreatePack ? undefined : triLang(lang, {
              ru: `Нужно ещё ${pluralWithCount('ru', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'карточка', few: 'карточки', many: 'карточек' })}`, uk: `Потрібно ще ${pluralWithCount('uk', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'картка', few: 'картки', many: 'карток' })}`, en: `Select ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} more ${pluralWord('en', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'card', few: 'cards', many: 'cards' })}`, es: `Elige ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} ${pluralWord('es', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })} más`, 'pt-BR': `Escolha mais ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} ${pluralWord('pt-BR', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'cartão', few: 'cartões', many: 'cartões' })}`, vi: `Chọn thêm ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} thẻ`, id: `Pilih ${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} kartu lagi`, tr: `${selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds))} kart daha seç`, pl: `Wybierz jeszcze ${pluralWithCount('pl', selectionRemaining ?? remainingCardsToMinimum(Array.from(selectedIds)), { one: 'kartę', few: 'karty', many: 'kart' })}`,
            })}
            accessibilityState={{ disabled: !canCreatePack }}
            disabled={!canCreatePack}
            onPress={onCreatePack}
            style={{ flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: canCreatePack ? g.cta : g.buttonFill, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: canCreatePack ? g.ctaInk : g.secondary, fontSize: f.body, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear un set', 'pt-BR': 'Criar um pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur', pl: 'Utwórz zestaw',
              })}
            </Text>
          </DuoPressable>
          <TouchableOpacity
            testID="fc-delete-selected"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Удалить выбранные', uk: 'Видалити вибрані', en: 'Delete selected', es: 'Eliminar seleccionadas', 'pt-BR': 'Excluir selecionadas', vi: 'Xóa thẻ đã chọn', id: 'Hapus yang dipilih', tr: 'Seçilenleri sil', pl: 'Usuń zaznaczone',
            })}
            accessibilityState={{ disabled: selectedCount === 0 }}
            disabled={selectedCount === 0}
            onPress={onDeleteSelected}
            style={{ minWidth: 102, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: t.wrong, alignItems: 'center', justifyContent: 'center', opacity: selectedCount > 0 ? 1 : 0.38 }}
          >
            <Text style={{ color: g.text, fontSize: f.caption, fontWeight: '700' }}>
              {triLang(lang, {
                ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń',
              })}
            </Text>
          </TouchableOpacity>
          </View>
        </Reanimated.View>
      ) : null}

      {/*
        Кнопка «Тренировать» переехала ВВЕРХ экрана и стала компактной
        иконкой без подписи (замечание владельца после теста на iPhone) — см.
        `CollectionHeader`. Нижняя широкая панель с текстом здесь больше не рисуется.
      */}
    </View>
  );
}

// ── E7: undo-снекбар «Карточка удалена · Вернуть» (5с) — общий для списка и empty state ──
export function UndoDeleteSnackbar({
  bottomOffset,
  lang,
  t,
  f,
  onUndo,
}: {
  bottomOffset: number;
  lang: Lang;
  t: Theme;
  f: Record<string, number>;
  onUndo: () => void;
}) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  // зачем (Карточки 2.0, макет cards-v2 «Удалено — вернуть», .toast): пилюля 56 высотой r28 на всю ширину (поля 16, снизу 34),
  // слева значок корзины и «Удалено», справа кнопка «Вернуть» (cta sm, 40). Стиль «Тень»: плашка и тень темы, без обводки.
  return (
    <Reanimated.View
      entering={FadeInDown.duration(220)}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: Math.max(bottomOffset, 34),
        zIndex: 90,
      }}
    >
      <View
        style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 28,
          paddingLeft: 18,
          paddingRight: 8,
          backgroundColor: g.opaqueControl,
          boxShadow: plateBoxShadow(g),
        }}
      >
        <Ionicons name="trash-outline" size={18} color={g.text} />
        <FlowText testID="fc-deleted-notice" provenance="authored" style={{ flex: 1, color: g.text, fontSize: 16, lineHeight: 20, fontWeight: '600' }}>
          {triLang(lang, {
              ru: 'Удалено', uk: 'Видалено', en: 'Deleted', es: 'Eliminado',
              'pt-BR': 'Excluído', vi: 'Đã xóa', id: 'Dihapus', tr: 'Silindi', pl: 'Usunięto',
            })}
        </FlowText>
        <TouchableOpacity
          testID="fc-undo-delete"
          accessible
          onPress={onUndo}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            height: 40,
            borderRadius: 20,
            backgroundColor: g.ctaFill,
            boxShadow: actionBoxShadow(g),
            paddingHorizontal: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: g.ctaFillInk, fontSize: 16, lineHeight: 20, fontWeight: '600' }}>
            {triLang(lang, {
              ru: 'Вернуть', uk: 'Повернути', en: 'Undo', es: 'Deshacer',
              'pt-BR': 'Desfazer', vi: 'Hoàn tác', id: 'Batalkan', tr: 'Geri al', pl: 'Cofnij',
            })}
          </Text>
        </TouchableOpacity>
      </View>
    </Reanimated.View>
  );
}

let collectionSilentRetries = 0;

// ── Empty state (вынесен из early-return монолита; хедер остаётся у контейнера) ──
export function CollectionEmptyState({
  lang,
  t,
  f,
  emptyTitle,
  emptySub,
  searchActive = false,
  loadError,
  onLeave,
  onRetry,
}: {
  lang: Lang;
  t: Theme;
  f: Record<string, number>;
  emptyTitle: string;
  emptySub: string;
  /** Пустой РЕЗУЛЬТАТ ПОИСКА, а не пустая коллекция: другой значок, без выхода. */
  searchActive?: boolean;
  loadError: boolean;
  onLeave: () => void;
  onRetry: () => void | Promise<void>;
}) {
  // зачем (владелец 01.10: «никаких не загрузилось и кнопок Повторить»): сбой загрузки —
  // тихий повтор в фоне (до 5 раз по 20 с на процесс), без кнопки.
  useEffect(() => {
    if (!loadError) return undefined;
    if (collectionSilentRetries >= 5) {
      console.warn('[FC-COLLECTION] empty: silent retries exhausted', { attempts: collectionSilentRetries });
      return undefined;
    }
    const timer = setTimeout(() => {
      collectionSilentRetries += 1;
      console.warn('[FC-COLLECTION] empty: silent retry', { attempt: collectionSilentRetries });
      void Promise.resolve(onRetry()).catch((error: unknown) => {
        console.warn('[FC-COLLECTION] empty: retry failed', error instanceof Error ? error.message : String(error));
      });
    }, 20_000);
    return () => clearTimeout(timer);
  }, [loadError, onRetry]);
  return (
    <View style={st.centerState}>
      <Ionicons name={searchActive ? 'search-outline' : 'bookmark-outline'} size={56} color={t.textGhost} />
      <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginTop: 12 }}>{emptyTitle}</Text>
      {emptySub ? (
        <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 6 }}>{emptySub}</Text>
      ) : null}
      {/* зачем: при пустом поиске «К выбору категорий» — ложный выход: человек
          хочет очистить запрос, а не покинуть раздел. Ссылку тут не показываем. */}
      {/* зачем (владелец, 2026-08-16): «К выбору категорий» вела наружу раздела —
          из пустой коллекции человека выбрасывало на главную. Из пустого раздела
          нужен путь ТУДА, ГДЕ БЕРУТ КАРТОЧКИ, — в наборы сообщества. */}
      {searchActive ? null : (
      <TouchableOpacity
        onPress={onLeave}
        style={{ marginTop: 14, paddingHorizontal: 12, paddingVertical: 8 }}
      >
        <Text style={{ color: t.accentText, fontSize: f.sub, textDecorationLine: 'underline' }}>
          {triLang(lang, {
            ru: 'Наборы сообщества',
            uk: 'Набори спільноти',
            en: 'Community packs',
            es: 'Packs de la comunidad',
            'pt-BR': 'Pacotes da comunidade',
            vi: 'Bộ thẻ cộng đồng',
            id: 'Paket komunitas',
            tr: 'Topluluk paketleri',
            pl: 'Zestawy społeczności',
          })}
        </Text>
      </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles (перенесены из монолита — геометрия карточки-строки) ─────────────
const st = StyleSheet.create({
  sourceBadge:  { position:'absolute', top:18, left:18, paddingHorizontal:10, paddingVertical:4, borderRadius:20 }, // зачем (Тень 12.10): стиль бейджа без рамки (в FlashcardListItem не используется)
  sourceBadgeText: { fontSize: 13, fontWeight: '700', textTransform:'uppercase', letterSpacing:0.6 },
  centerState:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
});
