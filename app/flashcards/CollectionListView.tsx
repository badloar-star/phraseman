/**
 * cards-2.0 (E11): списочный view коллекции, вынесенный 1:1 из монолита
 * flashcards_collection.tsx (§3.2, §7 E11). Контейнер остаётся оркестратором
 * (данные, фильтр/поиск, undo-пайплайн, модалки); здесь — только list-UI:
 * FlatList + FlashcardListItem, swipe-удаление, delete-hint онбординг,
 * escort-скролл к деталям, free-limit секция, нижняя панель «Слушать/Тренировать».
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  type ViewToken,
} from 'react-native';
import Reanimated, { FadeInDown, type SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, { SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { IS_EXPO_GO } from '../config';
import { triLang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import type { SpeakOpts } from '../../hooks/use-audio';
import ReportErrorButton from '../../components/ReportErrorButton';
import FlashcardListItem from './FlashcardListItem';
import type { WordStrength } from './word_strength';
import { CardItem, CategoryId, type FlashcardContentLang } from './types';

/** Монотонний фліп (timing замість spring) + різке opacity — без «моргання» біля 0.5. */
const FLASHCARD_FLIP_DURATION_MS = 280;
const flashcardFlipEasing = Easing.out(Easing.cubic);

/** Геометрія списку — для розрахунку offset ескорт-скролу (onLayout-высоты, без measureInWindow). */
const LIST_PAD_TOP = 12;
const LIST_ROW_GAP = 12;
const ListRowGap = () => <View style={{ height: LIST_ROW_GAP }} />;

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
  lang: FlashcardContentLang;
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
  /** @deprecated см. `CollectionHeader`. */
  onListenDeck?: () => void;
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
}: Props) {
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
    let top = LIST_PAD_TOP;
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
      } catch { /* ignore */ }
      return;
    }
    const rowH = heights[info.itemId] ?? 0;
    const viewportH = scrollViewHRef.current;
    const target = viewportH > 0
      ? Math.max(0, top + rowH / 2 - viewportH / 2)
      : Math.max(0, top - LIST_PAD_TOP);
    (list as any).scrollToOffset({ offset: target, animated: true });
  }, []);

  // ── Delete hint onboarding ────────────────────────────────────────────────
  const dismissDeleteHint = useCallback(() => {
    if (deleteHintTimer.current) clearTimeout(deleteHintTimer.current);
    if (deleteHintPulseLoop.current) deleteHintPulseLoop.current.stop();
    Animated.timing(deleteHintAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      onSetShowDeleteHint(false);
      AsyncStorage.setItem('flashcard_delete_hint_seen', '1');
    });
  }, [deleteHintAnim, onSetShowDeleteHint]);

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
          backgroundColor: '#D32F2F',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'stretch',
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={{ color: '#fff', fontSize: f.caption, fontWeight: '700', marginTop: 4 }}>
          {deleteLabel}
        </Text>
      </View>
    ),
    [f.caption, deleteLabel],
  );

  const renderItem = useCallback(({ item, index: itemIdx }: { item: CardItem; index: number }) => {
    const editableCustom = isEditableCustomCard(item);
    const deletable =
      !item.isSystem && (editableCustom || item.categoryId === 'saved');
    const cardEl = (
      <FlashcardListItem
        item={item}
        itemIdx={itemIdx}
        lang={cardContentLang}
        activeCat={activeCat}
        deletingId={deletingId}
        longPressedId={longPressedId}
        t={t}
        f={f}
        sourceLabels={sourceLabels}
        deleteLabel={deleteLabel}
        voiceLabel={voiceLabel}
        cardHeight={cardHeight}
        cardStyle={st.card}
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
  ]);

  /** Нижний «хвост» — чтобы последнюю картку можно было прокрутить к центру. */
  const listPadBottom =
    (scrollViewH > 0 ? Math.max(12, scrollViewH - cardHeight - 12 - peek) : 20) + Math.max(0, extraBottomPad);

  return (
    <View style={{ flex: 1 }}>
      {/* Content wrapper — closes delete-overlay on outside tap */}
      <View
        style={{ flex: 1, overflow: 'hidden' }}
        onStartShouldSetResponder={() => longPressedId !== null}
        onResponderGrant={() => setLongPressedId(null)}
      >
        {/* Add card — лише власні картки; не в режимі перегляду купленого паку з маркету */}
        {activeCat === 'custom' && allowAddCustomCard && (
          <TouchableOpacity
            testID="fc-create-card"
            accessibilityLabel="qa-fc-create-card"
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
            <Ionicons name="add-circle-outline" size={20} color={t.correctText} />
            <Text style={{ fontSize: f.body, fontWeight: '700', color: t.correctText }}>
              {triLang(lang, { ru: 'Добавить карточку', uk: 'Додати картку', es: 'Añadir tarjeta' })}
            </Text>
          </TouchableOpacity>
        )}

        {/* DEV: reset and show hint button */}
        {IS_EXPO_GO && !showDeleteHint && (
          <TouchableOpacity
            onPress={() => {
              AsyncStorage.removeItem('flashcard_delete_hint_seen');
              deleteHintAnim.setValue(0);
              onSetShowDeleteHint(true);
            }}
            style={{ alignSelf: 'flex-end', marginRight: 16, marginBottom: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FF6B00' }}
          >
            <Text style={{ fontSize: 9, color: '#FF6B00', fontWeight: '800' }}>
              {triLang(lang, { ru: 'DEV: показать подсказку', uk: 'DEV: показати підказку', es: 'DEV: mostrar ayuda' })}
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
              })}
            </Text>
            <TouchableOpacity onPress={dismissDeleteHint} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={18} color={t.textMuted} />
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
          <FlatList
            ref={flatListRef as any}
            style={{ flex: 1 }}
            data={cards}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={ListRowGap}
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
                } catch {
                  // ignore
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
            ListFooterComponent={(
              <View>
                {hiddenByLimitCount > 0 && (
                  <TouchableOpacity
                    testID="flashcards-free-limit-section"
                    accessibilityLabel="qa-flashcards-free-limit-section"
                    accessible
                    activeOpacity={0.85}
                    onPress={onOpenPremiumLimit}
                    style={{
                      marginTop: 4,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: t.border,
                      backgroundColor: t.bgCard,
                      paddingVertical: 22,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="lock-closed" size={26} color={t.textMuted} />
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                      {triLang(lang, {
                        ru: `+${hiddenByLimitCount} карточек скрыто`,
                        uk: `+${hiddenByLimitCount} карток приховано`,
                        es: `+${hiddenByLimitCount} tarjetas ocultas`,
                      })}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center' }}>
                      {triLang(lang, {
                        ru: 'Бесплатно доступны первые 20 сохранённых карточек',
                        uk: 'Безкоштовно доступні перші 20 збережених карток',
                        es: 'Gratis: las primeras 20 tarjetas guardadas',
                      })}
                    </Text>
                    <View style={{ marginTop: 8, backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 10 }}>
                      <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '700' }}>
                        {triLang(lang, {
                          ru: 'Открыть все с Премиум',
                          uk: 'Відкрити всі з Преміум',
                          es: 'Desbloquear con Premium',
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
                      es: `Tarjetas · ${activeCat}`,
                    })}
                  />
                </View>
              </View>
            )}
          />
        </View>
      </View>

      {/*
        Кнопки «Слушать» / «Тренировать» переехали ВВЕРХ экрана и стали компактными
        иконками без подписей (замечание владельца после теста на iPhone) — см.
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
  lang: FlashcardContentLang;
  t: Theme;
  f: Record<string, number>;
  onUndo: () => void;
}) {
  return (
    <Reanimated.View
      entering={FadeInDown.duration(220)}
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        zIndex: 90,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: t.bgCard,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 13,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="trash-outline" size={18} color={t.textMuted} />
        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.sub, fontWeight: '600' }} numberOfLines={1}>
          {triLang(lang, { ru: 'Карточка удалена', uk: 'Картку видалено', es: 'Tarjeta eliminada' })}
        </Text>
        <TouchableOpacity
          testID="fc-undo-delete"
          accessibilityLabel="qa-fc-undo-delete"
          accessible
          onPress={onUndo}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            borderRadius: 10,
            backgroundColor: `${t.accent}1C`,
            borderWidth: 1,
            borderColor: `${t.accent}55`,
            paddingHorizontal: 14,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }}>
            {triLang(lang, { ru: 'Вернуть', uk: 'Повернути', es: 'Deshacer' })}
          </Text>
        </TouchableOpacity>
      </View>
    </Reanimated.View>
  );
}

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
  lang: FlashcardContentLang;
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
        <Text style={{ color: t.textSecond, fontSize: f.sub, textDecorationLine: 'underline' }}>
          {triLang(lang, {
            ru: 'Наборы сообщества',
            uk: 'Набори спільноти',
            es: 'Packs de la comunidad',
          })}
        </Text>
      </TouchableOpacity>
      )}
      {loadError && (
        <TouchableOpacity
          onPress={() => { void onRetry(); }}
          style={{ marginTop: 16, backgroundColor: t.bgSurface, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, borderWidth: 1, borderColor: t.border }}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
            {triLang(lang, {
              ru: 'Повторить загрузку',
              uk: 'Повторити завантаження',
              es: 'Reintentar la carga',
            })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles (перенесены из монолита — геометрия карточки-строки) ─────────────
const st = StyleSheet.create({
  card:         { position:'absolute', top:0, left:0, right:0, bottom:0, borderRadius:20, borderWidth:1, padding:22, alignItems:'center', justifyContent:'center' },
  sourceBadge:  { position:'absolute', top:18, left:18, paddingHorizontal:10, paddingVertical:4, borderRadius:20, borderWidth:1 },
  sourceBadgeText: { fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 },
  centerState:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
});
