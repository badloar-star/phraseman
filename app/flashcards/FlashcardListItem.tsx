import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLightImpact, hapticMediumImpact } from '../../hooks/use-haptics';
import { DEV_CONTENT_UNLOCK } from '../config';
import { useEffectivePlatformOS } from '../platform_ui_preview';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { getHintFlag, setHintFlag } from './hint_flags';
import type { Theme } from '../../constants/theme';
import { inferExpoSpeechLanguage, speechLocaleToShortLabel, type SpeakOpts } from '../../hooks/use-audio';
import { SOURCE_COLORS } from './constants';
import FlashcardDetailsBody from './FlashcardDetailsBody';
import { buildLegacyFlipFaceStyles, useFcCrossfadeFlip } from './PhraseCard';
import WordStrengthDots from './WordStrengthDots';
import type { WordStrength } from './word_strength';
import { OFFICIAL_MODERN_ABBREV_EN_ID } from './bundles/packIds';
import { CardItem, CategoryId, cardHasDetails, resolveFlashcardBackText, type FlashcardContentLang } from './types';

const MODERN_ABBREV_DEV = `DEV:${OFFICIAL_MODERN_ABBREV_EN_ID}`;

/** Розбір «абревіатура — пояснення» для EN-шифра (поля `abbrev` / `expansion` або з рядка `en`). */
function splitAbbrevMarketplaceEn(
  en: string,
  abbrevEn?: string,
  expansionEn?: string,
): { head: string; rest: string } {
  if (abbrevEn?.trim() && expansionEn?.trim()) {
    return { head: abbrevEn.trim(), rest: expansionEn.trim() };
  }
  if (abbrevEn?.trim()) {
    const head = abbrevEn.trim();
    const rest = en.replace(head, '').replace(/^[\s:：—–\-|]+/u, '').trim();
    return { head, rest };
  }
  const t = en.trim();
  const byDelim = t.split(/\s[—–]\s/);
  if (byDelim.length >= 2) {
    return { head: byDelim[0].trim(), rest: byDelim.slice(1).join(' — ').trim() };
  }
  const m = t.match(/^([^:]+)[:：]\s*(.+)$/s);
  if (m) return { head: m[1].trim(), rest: m[2].trim() };
  return { head: t, rest: '' };
}

const OPEN_DETAILS_MS = 280;
const CLOSE_DETAILS_MS = 240;
/** Split gap + borders after height expand — short timing avoids a one-frame “pop” vs list scroll. */
const SPLIT_DETAILS_OPEN_MS = 110;
const DETAILS_H_PAD = 32;
const OPEN_DETAILS_EASING = REasing.bezier(0.25, 0.1, 0.25, 1);
const CLOSE_DETAILS_EASING = REasing.bezier(0.4, 0, 0.2, 1);
/** Final gap between main card and details bubble (smaller than FlatList ItemSeparator) */
const DETAILS_SPLIT_GAP = 8;
/** Плановые локали: подписи тумблера деталей без ru/uk/es-тернаров. */
const FLASHCARD_DETAILS_TOGGLE_LABELS: Record<FlashcardContentLang, { collapse: string; expand: string }> = {
  ru: { collapse: 'Скрыть детали', expand: 'Показать детали' },
  uk: { collapse: 'Згорнути деталі', expand: 'Розгорнути деталі' },
  es: { collapse: 'Ocultar detalles', expand: 'Mostrar detalles' },
  'pt-BR': { collapse: 'Ocultar detalhes', expand: 'Mostrar detalhes' },
  vi: { collapse: 'Ẩn chi tiết', expand: 'Hiện chi tiết' },
  id: { collapse: 'Sembunyikan detail', expand: 'Tampilkan detail' },
  tr: { collapse: 'Ayrıntıları gizle', expand: 'Ayrıntıları göster' },
  pl: { collapse: 'Ukryj szczegóły', expand: 'Pokaż szczegóły' },
};

/** Плановые локали: язык озвучки обратной стороны карточки. */
const FLASHCARD_BACK_SPEECH_BY_LANG: Record<FlashcardContentLang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

const speechLocaleForFlashcardBack = (lang: FlashcardContentLang): string => {
  return FLASHCARD_BACK_SPEECH_BY_LANG[lang];
};

type Props = {
  item: CardItem;
  itemIdx: number;
  lang: FlashcardContentLang;
  activeCat: CategoryId;
  deletingId: string | null;
  longPressedId: string | null;
  t: Theme;
  f: Record<string, number>;
  sourceLabels: Record<string, string>;
  deleteLabel: string;
  voiceLabel: string;
  voiceDisabled?: boolean;
  cardHeight: number;
  cardStyle: any;
  sourceBadgeStyle: any;
  sourceBadgeTextStyle: any;
  getCardFlipAnim: (cardId: string) => Animated.Value;
  getOverlayAnim: (cardId: string) => Animated.Value;
  getDeleteAnim: (cardId: string) => { opacity: Animated.Value; scale: Animated.Value };
  onFlipCard: (cardId: string) => void;
  /** Learning V2 word encounters must react on the first touch frame. */
  flipOnPressIn?: boolean;
  onOpenDelete: (cardId: string) => void;
  onCloseDelete: () => void;
  onDeleteCard: (item: CardItem, itemIdx: number) => void;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
  /** Fires when the user starts opening details (resets list “escort” state). */
  onDetailsOpenAnimStarted?: (info: { itemId: string; itemIndex: number }) => void;
  /** Fires when details are fully open (after split spring) so the list can scroll the row into view. */
  onDetailsScrollSettled?: (info: { itemId: string; itemIndex: number }) => void;
  /** Полная высота строки (карточка + детали) из onLayout — для escort-скролла списка. */
  onRowLayout?: (id: string, height: number) => void;
  /** Тема купленого паку з маркету — градієнт і бордер карток. */
  packCardTheme?: {
    borderAccent: string;
    frontGradient: readonly [string, string];
    backGradient: readonly [string, string];
  } | null;
  /**
   * Фокус-строка списка (индекс из viewability) через SharedValue: смена видимой
   * карточки анимируется на UI-потоке, без setState-каскада от родителя.
   */
  focusedIndexSV?: SharedValue<number>;
  /**
   * Затримка (мс) перед циклом «нуджу» шеврона. Якщо батько одночасно дає entering (FadeInDown),
   * вертикальний вхід рядка + translateY на шевроні зливаються в «глітч» — відклади підказку.
   */
  chevronHintDelayMs?: number;
  /** E7 (баг 8): «Редактировать» в раскрытых деталях кастомной карточки → flashcards_card_editor. */
  onEditCard?: ((item: CardItem) => void) | null;
  editLabel?: string;
  /** E7: кнопка удаления в деталях — фолбэк свайпа на web (§3.2 плана). */
  onDeleteFromDetails?: ((item: CardItem, itemIdx: number) => void) | null;
  /** E13: «сила слова» из проекции ошибок; null/undefined — точки не рисуем. */
  strength?: WordStrength | null;
};

function FlashcardListItemImpl({
  item,
  itemIdx,
  lang,
  activeCat,
  deletingId,
  longPressedId,
  t,
  f,
  sourceLabels,
  deleteLabel,
  voiceLabel,
  voiceDisabled = false,
  cardHeight,
  cardStyle,
  sourceBadgeStyle,
  sourceBadgeTextStyle,
  getCardFlipAnim,
  getOverlayAnim,
  getDeleteAnim,
  onFlipCard,
  flipOnPressIn = false,
  onOpenDelete,
  onCloseDelete,
  onDeleteCard,
  onSpeak,
  onDetailsOpenAnimStarted,
  onDetailsScrollSettled,
  onRowLayout,
  packCardTheme = null,
  focusedIndexSV,
  chevronHintDelayMs = 0,
  onEditCard = null,
  editLabel,
  onDeleteFromDetails = null,
  strength = null,
}: Props) {
  const effectiveOs = useEffectivePlatformOS();
  const tr = resolveFlashcardBackText(item, lang);
  const srcBadgeColor = SOURCE_COLORS[item.source ?? 'lesson'] ?? '#4A90D9';
  const srcLabel = item.source ? sourceLabels[item.source] : null;
  /** Купленные / официальные наборы: `sourceId` = `DEV:<packId>`, без технич. подписи в UI. */
  const isMarketplaceBundleCard = String(item.sourceId ?? '').startsWith('DEV:');
  const showDevPackCornerBadge = DEV_CONTENT_UNLOCK && isMarketplaceBundleCard;
  const showSourceBadge = !!(srcLabel && !isMarketplaceBundleCard);
  const isModernAbbrevCard = item.sourceId === MODERN_ABBREV_DEV;
  const parsedAbbrevEn = useMemo(
    () => splitAbbrevMarketplaceEn(item.en, item.abbrevEn, item.expansionEn),
    [item.en, item.abbrevEn, item.expansionEn],
  );
  // E2: позиционного лимита-20 здесь больше нет (баг 10) — заблокированные лимитом
  // карточки не попадают в data списка; вместо замков одна секция «+N скрыто» в футере.
  /** У «Збережені» кнопка озвучки справа (як раніше); в інших вкладках — зліва, щоб не перекривати фразу. */
  const voiceSpeakOnRight = activeCat === 'saved';
  const usePackFace = !!packCardTheme && isMarketplaceBundleCard;
  /**
   * Фокус-строка через SharedValue (перф-пакет E2): расфокус peek-строк пака
   * анимируется на UI-потоке; скролл не дергает setState родителя.
   *
   * БЫЛО: `withTiming(...)` вызывался ВНУТРИ `useAnimatedStyle`. Такой стиль
   * пересчитывается на каждое изменение любого прочитанного SharedValue и на
   * каждый ре-маунт строки — и каждый пересчёт СТАРТОВАЛ НОВУЮ анимацию от
   * текущего значения. В режиме, где все карточки полупрозрачные (просмотр
   * купленного набора), это давало бесконечный перезапуск таймингов на каждой
   * видимой строке: список лагал, карточки «переключались и возвращались назад»
   * (репорт владельца).
   *
   * СТАЛО: анимация живёт в `useDerivedValue` — она перезапускается ТОЛЬКО когда
   * реально меняется фокус-индекс, а `useAnimatedStyle` лишь читает готовый
   * прогресс и интерполирует его. Плюс на слабых устройствах / «уменьшить
   * движение» / web анимации нет вовсе — сразу конечное значение.
   */
  const crossfadeFlip = useFcCrossfadeFlip();
  const focusMotionOn = usePackFace && !!focusedIndexSV;
  const focusSV = focusedIndexSV;
  const focusProgress = useDerivedValue(() => {
    if (!focusMotionOn || !focusSV) return 1;
    const focused = focusSV.value === itemIdx ? 1 : 0;
    if (crossfadeFlip) return focused;
    return withTiming(focused, { duration: 160 });
  }, [focusMotionOn, focusSV, itemIdx, crossfadeFlip]);
  const focusDimStyle = useAnimatedStyle(() => {
    const p = focusProgress.value;
    return {
      opacity: interpolate(p, [0, 1], [0.68, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(p, [0, 1], [0.985, 1], Extrapolation.CLAMP) }],
    };
  });
  /** E7: ряд действий (редактировать / удалить) в деталях — детали появляются даже без описания. */
  const hasDetailsActions = !!(onEditCard || onDeleteFromDetails);
  const hasDetails = !isModernAbbrevCard && (cardHasDetails(item) || hasDetailsActions);
  const { height: winH } = useWindowDimensions();
  /** Backup height if layout measure fails (should be rare) */
  const expandSectionMax = Math.min(Math.round(winH * 0.92), 4000);
  const expandMaxSV = useSharedValue(expandSectionMax);
  useEffect(() => {
    expandMaxSV.value = expandSectionMax;
  }, [expandSectionMax, expandMaxSV]);

  /** Reanimated: висота/щілина на UI thread — RN Animated maxHeight (JS driver) давав лаги на довгому тексті. */
  const expandSV = useSharedValue(0);
  /** 0 = панель під карткою; 1 = візуальний розрив між «бульбашками» */
  const splitSV = useSharedValue(0);
  const detailsTargetSV = useSharedValue(0);

  /** Natural height of details body; kept after first measure for smooth re-open */
  const [detailsNatH, setDetailsNatH] = useState(0);
  const detailsNatHRef = useRef(0);
  useEffect(() => {
    detailsNatHRef.current = detailsNatH;
  }, [detailsNatH]);

  const [premeasuring, setPremeasuring] = useState(false);
  /** Panel is only mounted when non-collapsed; avoids 0-height borders showing as a line */
  const [detailsPanelMounted, setDetailsPanelMounted] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  /** Height phase finished — allow full layout; then split spring runs */
  const [expandHeightComplete, setExpandHeightComplete] = useState(false);
  const hintY = useRef(new Animated.Value(0)).current;
  const hintLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const cAnim = getCardFlipAnim(item.id);
  const flipDrivingAnim = cAnim;
  /**
   * cards-2.0: настоящий 3D-флип (perspective + rotateY, флип-движок PhraseCard)
   * вместо scaleX-псевдофлипа. Анимацией по-прежнему владеет родитель (Animated.Value
   * 0↔1, useNativeDriver) — массовый флип и бейджи/удаление не меняются.
   * web / reduceMotion / lowPower → кроссфейд; opacity-переключение на 90° —
   * фолбэк backfaceVisibility для старых Android.
   */
  const flipFaces = useMemo(
    () => buildLegacyFlipFaceStyles(flipDrivingAnim, !crossfadeFlip),
    [flipDrivingAnim, crossfadeFlip],
  );
  const cFrontOp = flipFaces.frontOpacity;
  const cBackOp = flipFaces.backOpacity;

  const cardSplitEdgeStyle = useAnimatedStyle(() => {
    if (!hasDetails) return {};
    const showEdge = expandSV.value > 0.001 || splitSV.value > 0.35;
    if (!showEdge) return {};
    return {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderBottomWidth: interpolate(splitSV.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  }, [hasDetails]);

  const detailsGapSpacerStyle = useAnimatedStyle(() => ({
    height: interpolate(splitSV.value, [0, 1], [0, DETAILS_SPLIT_GAP], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const detailsPanelSizeStyle = useAnimatedStyle(() => {
    const target = detailsTargetSV.value > 0 ? detailsTargetSV.value : expandMaxSV.value;
    const h = interpolate(expandSV.value, [0, 1], [0, Math.max(target, 1)], Extrapolation.CLAMP);
    return {
      maxHeight: h,
      minHeight: 0,
      overflow: 'hidden' as const,
      borderTopWidth: interpolate(splitSV.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  const chevronRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandSV.value, [0, 1], [0, 180], Extrapolation.CLAMP)}deg` }],
  }));

  /**
   * Flip uses `useNativeDriver: true` (scaleX). Split edge + details height — Reanimated (UI thread).
   * Outer = native flip only; inner = card chrome + `cardSplitEdgeStyle`.
   */
  const cardFaceNativeFlipStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  const afterSplitOpenOnJS = useCallback(() => {
    setExpandHeightComplete(true);
    onDetailsScrollSettled?.({ itemId: item.id, itemIndex: itemIdx });
  }, [item.id, itemIdx, onDetailsScrollSettled]);

  const finishOpenDetailsPhase = useCallback(() => {
    cancelAnimation(splitSV);
    splitSV.value = 0;
    splitSV.value = withTiming(1, { duration: SPLIT_DETAILS_OPEN_MS, easing: REasing.out(REasing.quad) }, (finished) => {
      if (!finished) return;
      runOnJS(afterSplitOpenOnJS)();
    });
  }, [afterSplitOpenOnJS, splitSV]);

  const finishCloseUnmount = useCallback(() => {
    setDetailsExpanded(false);
    setDetailsPanelMounted(false);
    setExpandHeightComplete(false);
  }, []);

  const runOpenDetailsAnimation = useCallback(
    (measuredHeightPx?: number) => {
      cancelAnimation(expandSV);
      onDetailsOpenAnimStarted?.({ itemId: item.id, itemIndex: itemIdx });
      setExpandHeightComplete(false);
      splitSV.value = 0;
      if (measuredHeightPx != null && measuredHeightPx > 0) {
        const nat = Math.ceil(measuredHeightPx) + DETAILS_H_PAD;
        detailsTargetSV.value = Math.max(detailsTargetSV.value, nat);
        setDetailsNatH((prev) => Math.max(prev, nat));
      } else {
        const nat = detailsNatHRef.current;
        detailsTargetSV.value = nat > 0 ? nat : expandMaxSV.value;
      }
      setDetailsPanelMounted(true);
      setDetailsExpanded(true);
      expandSV.value = 0;
      expandSV.value = withTiming(1, { duration: OPEN_DETAILS_MS, easing: OPEN_DETAILS_EASING }, (finished) => {
        if (finished) runOnJS(finishOpenDetailsPhase)();
      });
    },
    [
      detailsTargetSV,
      expandMaxSV,
      expandSV,
      finishOpenDetailsPhase,
      item.id,
      itemIdx,
      onDetailsOpenAnimStarted,
      splitSV,
    ],
  );

  const onPremeasureLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h < 4) return;
      setPremeasuring(false);
      runOpenDetailsAnimation(h);
    },
    [runOpenDetailsAnimation],
  );

  const onVisibleDetailsLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h < 2) return;
      const next = Math.ceil(h) + DETAILS_H_PAD;
      /**
       * Під час розгортання `detailsTargetSV` не змінюємо — інакше ціль висоти стрибає під час анімації.
       */
      if (detailsExpanded && !expandHeightComplete) return;
      setDetailsNatH((prev) => Math.max(prev, next));
      detailsTargetSV.value = Math.max(detailsTargetSV.value, next);
    },
    [detailsExpanded, expandHeightComplete, detailsTargetSV],
  );

  const collapseDetailsHeight = useCallback(() => {
    cancelAnimation(expandSV);
    cancelAnimation(splitSV);
    splitSV.value = 0;
    expandSV.value = withTiming(0, { duration: CLOSE_DETAILS_MS, easing: CLOSE_DETAILS_EASING }, (finished) => {
      if (finished) runOnJS(finishCloseUnmount)();
    });
  }, [expandSV, finishCloseUnmount, splitSV]);

  const toggleDetails = useCallback(() => {
    if (!hasDetails) return;
    void hapticLightImpact();
    if (!detailsExpanded) {
      if (detailsNatH > 0) {
        runOpenDetailsAnimation();
      } else {
        setPremeasuring(true);
      }
      return;
    }
    // Close: merge bubbles then collapse height if height phase had finished
    if (!expandHeightComplete) {
      cancelAnimation(expandSV);
      cancelAnimation(splitSV);
      setExpandHeightComplete(false);
      splitSV.value = 0;
      collapseDetailsHeight();
      return;
    }
    cancelAnimation(expandSV);
    cancelAnimation(splitSV);
    setExpandHeightComplete(false);
    expandSV.value = withTiming(0, { duration: CLOSE_DETAILS_MS, easing: CLOSE_DETAILS_EASING }, (finished) => {
      if (finished) runOnJS(finishCloseUnmount)();
    });
    splitSV.value = withTiming(0, { duration: CLOSE_DETAILS_MS, easing: CLOSE_DETAILS_EASING });
  }, [
    hasDetails,
    detailsExpanded,
    detailsNatH,
    expandHeightComplete,
    runOpenDetailsAnimation,
    collapseDetailsHeight,
    expandSV,
    finishCloseUnmount,
    splitSV,
  ]);

  useEffect(() => {
    cancelAnimation(expandSV);
    cancelAnimation(splitSV);
    expandSV.value = 0;
    splitSV.value = 0;
    detailsTargetSV.value = 0;
    setDetailsExpanded(false);
    setDetailsPanelMounted(false);
    setPremeasuring(false);
    setExpandHeightComplete(false);
    setDetailsNatH(0);
  }, [detailsTargetSV, expandSV, item.id, splitSV]);

  // Subtle “nudge down” on chevron = hint to tap and open.
  // E2: не вечный Animated.loop — только первая карточка, 2 цикла, одноразовый флаг fc_hint_flags_v1.
  useEffect(() => {
    if (hintLoopRef.current) {
      hintLoopRef.current.stop();
      hintLoopRef.current = null;
    }
    hintY.stopAnimation();
    hintY.setValue(0);
    if (!hasDetails || detailsExpanded || itemIdx !== 0) return;

    let cancelled = false;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const startNudge = () => {
      if (cancelled) return;
      const nudge = Animated.loop(
        Animated.sequence([
          Animated.timing(hintY, { toValue: 3.5, duration: 900, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true }),
          Animated.timing(hintY, { toValue: 0, duration: 900, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true }),
          Animated.delay(700),
        ]),
        { iterations: 2 },
      );
      hintLoopRef.current = nudge;
      nudge.start(({ finished }) => {
        if (finished) void setHintFlag('chevron_nudge');
      });
    };

    void getHintFlag('chevron_nudge').then((seen) => {
      if (cancelled || seen) return;
      if (chevronHintDelayMs > 0) {
        delayTimer = setTimeout(startNudge, chevronHintDelayMs);
      } else {
        startNudge();
      }
    });

    return () => {
      cancelled = true;
      if (delayTimer) clearTimeout(delayTimer);
      if (hintLoopRef.current) {
        hintLoopRef.current.stop();
        hintLoopRef.current = null;
      }
    };
  }, [hasDetails, detailsExpanded, hintY, item.id, chevronHintDelayMs, itemIdx]);

  const voiceTextFront = isModernAbbrevCard
    ? (parsedAbbrevEn.rest || item.en)
    : item.en;
  const voiceTextBack = tr;

  const frontSpeakLocale = useMemo(
    () => inferExpoSpeechLanguage(voiceTextFront),
    [voiceTextFront],
  );
  const detailsToggleLabel = detailsExpanded
    ? FLASHCARD_DETAILS_TOGGLE_LABELS[lang].collapse
    : FLASHCARD_DETAILS_TOGGLE_LABELS[lang].expand;
  const backSpeakLocale = useMemo(
    () => speechLocaleForFlashcardBack(lang),
    [voiceTextBack, lang],
  );
  const frontLangBadge = speechLocaleToShortLabel(frontSpeakLocale);
  const backLangBadge = speechLocaleToShortLabel(backSpeakLocale);

  const speakFront = useCallback(() => {
    onSpeak(voiceTextFront, { language: frontSpeakLocale });
  }, [frontSpeakLocale, onSpeak, voiceTextFront]);
  const speakBack = useCallback(() => {
    onSpeak(voiceTextBack, { language: backSpeakLocale });
  }, [backSpeakLocale, onSpeak, voiceTextBack]);

  const isLongPressed = longPressedId === item.id;
  const canDeleteThis = !item.isSystem;
  const isDeleting = deletingId === item.id;
  /** Область під шапкою: EN + IPA вміщаються за рахунок, без скролу */
  const frontTextMaxH = Math.max(92, cardHeight - 74);
  const overlayOpacity = getOverlayAnim(item.id);
  const delAnim = getDeleteAnim(item.id);
  const overlayBtnScale = overlayOpacity.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 1.05, 1] });

  /** E7: контент панели деталей + ряд действий — единый для премера и видимой панели (высота меряется с кнопками). */
  const detailsInner = (
    <>
      <FlashcardDetailsBody item={item} lang={lang} t={t} f={f} />
      {hasDetailsActions && (
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
          {onEditCard && (
            <TouchableOpacity
              testID="fc-details-edit"
              accessibilityLabel="qa-fc-details-edit"
              accessible
              onPress={() => onEditCard(item)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${t.accent}66`,
                backgroundColor: `${t.accent}14`,
                paddingVertical: 11,
              }}
            >
              <Ionicons name="pencil-outline" size={16} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '700' }} numberOfLines={1}>
                {editLabel}
              </Text>
            </TouchableOpacity>
          )}
          {onDeleteFromDetails && (
            <TouchableOpacity
              testID="fc-details-delete"
              accessibilityLabel="qa-fc-details-delete"
              accessible
              onPress={() => onDeleteFromDetails(item, itemIdx)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: `${t.wrong}66`,
                backgroundColor: `${t.wrong}12`,
                paddingVertical: 11,
              }}
            >
              <Ionicons name="trash-outline" size={16} color={t.wrong} />
              <Text style={{ color: t.wrong, fontSize: f.sub, fontWeight: '700' }} numberOfLines={1}>
                {deleteLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  return (
    <Animated.View
      onLayout={(e) => onRowLayout?.(item.id, e.nativeEvent.layout.height)}
      style={{
        width: '100%',
        opacity: isDeleting ? delAnim.opacity : 1,
        transform: isDeleting ? [{ scale: delAnim.scale }] : [],
      }}
    >
      <Reanimated.View style={focusDimStyle}>
      <View
        collapsable={false}
        style={{ position: 'relative' }}
      >
        {hasDetails && premeasuring && detailsNatH === 0 && (
          <View
            style={{ position: 'absolute', left: 0, right: 0, top: 8000, opacity: 0 }}
            pointerEvents="none"
            collapsable={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View onLayout={onPremeasureLayout}>
              {detailsInner}
            </View>
          </View>
        )}

        <View style={{ height: cardHeight, position: 'relative' }}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPressIn={() => {
              if (flipOnPressIn && !isLongPressed) onFlipCard(item.id);
            }}
            onPress={() => {
              if (isLongPressed) {
                onCloseDelete();
                return;
              }
              if (!flipOnPressIn) onFlipCard(item.id);
            }}
            onLongPress={() => {
              if (isLongPressed) {
                onCloseDelete();
                return;
              }
              if (canDeleteThis) {
                void hapticMediumImpact();
                onOpenDelete(item.id);
              }
            }}
            delayLongPress={400}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 20 }}
          >
            <Animated.View
              style={[
                cardFaceNativeFlipStyle,
                flipFaces.front,
              ]}
            >
              <Reanimated.View
                style={[
                  cardStyle,
                  cardSplitEdgeStyle,
                  { overflow: 'hidden' },
                  usePackFace
                    ? { backgroundColor: 'transparent', borderWidth: 0 }
                    : { backgroundColor: t.bgCard, borderColor: t.border },
                ]}
              >
              {usePackFace && packCardTheme && (
                <LinearGradient
                  colors={[...packCardTheme.frontGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { borderRadius: 20, borderWidth: 1, borderColor: packCardTheme.borderAccent },
                  ]}
                />
              )}
              {!usePackFace && (
                <LinearGradient
                  pointerEvents="none"
                  colors={t.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text
                style={
                  voiceSpeakOnRight
                    ? {
                        position: 'absolute',
                        top: 14,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        color: t.textGhost,
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                      }
                    : {
                        position: 'absolute',
                        top: 14,
                        left: 44,
                        color: t.textGhost,
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                      }
                }
              >
                {frontLangBadge}
              </Text>
              {showDevPackCornerBadge && (
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: voiceSpeakOnRight ? 46 : 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: `${t.accent}77`,
                    backgroundColor: `${t.accent}1F`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: t.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>DEV PACK</Text>
                </View>
              )}
              {showSourceBadge && (
                <View
                  style={[
                    sourceBadgeStyle,
                    voiceSpeakOnRight
                      ? { backgroundColor: `${srcBadgeColor}22`, borderColor: `${srcBadgeColor}55` }
                      : { left: 48, backgroundColor: `${srcBadgeColor}22`, borderColor: `${srcBadgeColor}55` },
                  ]}
                >
                  <Text style={[sourceBadgeTextStyle, { color: srcBadgeColor }]}>
                    {srcLabel}
                    {item.sourceId ? ` ${item.sourceId}` : ''}
                  </Text>
                </View>
              )}
              <View
                style={{
                  height: frontTextMaxH,
                  width: '100%',
                  justifyContent: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                }}
              >
                {isModernAbbrevCard ? (
                  <>
                    <Text
                      maxFontSizeMultiplier={1.35}
                      numberOfLines={2}
                      style={{
                        color: t.textPrimary,
                        fontSize: f.h1 + 4,
                        fontWeight: '800',
                        textAlign: 'center',
                        letterSpacing: 0.5,
                        width: '100%',
                      }}
                    >
                      {parsedAbbrevEn.head}
                    </Text>
                    {parsedAbbrevEn.rest ? (
                      <Text
                        maxFontSizeMultiplier={1.35}
                        numberOfLines={3}
                        style={{
                          color: t.textMuted,
                          fontSize: f.body,
                          fontWeight: '500',
                          marginTop: 8,
                          textAlign: 'center',
                          width: '100%',
                        }}
                      >
                        {parsedAbbrevEn.rest}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text
                      maxFontSizeMultiplier={1.35}
                      numberOfLines={item.transcription?.trim() ? 4 : 6}
                      style={{
                        color: t.textPrimary,
                        fontSize: f.h1 + 2,
                        fontWeight: '700',
                        textAlign: 'center',
                        width: '100%',
                      }}
                    >
                      {item.en}
                    </Text>
                    {item.transcription?.trim() ? (
                      <Text
                        maxFontSizeMultiplier={1.35}
                        numberOfLines={4}
                        style={{
                          color: t.textMuted,
                          fontSize: f.sub,
                          marginTop: 4,
                          textAlign: 'center',
                          fontStyle: 'italic',
                          letterSpacing: 0.25,
                          width: '100%',
                        }}
                      >
                        {item.transcription.trim()}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              </Reanimated.View>
            </Animated.View>

            <Animated.View
              style={[
                cardFaceNativeFlipStyle,
                flipFaces.back,
              ]}
            >
              <Reanimated.View
                style={[
                  cardStyle,
                  cardSplitEdgeStyle,
                  { overflow: 'hidden' },
                  usePackFace
                    ? { backgroundColor: 'transparent', borderWidth: 0 }
                    : { backgroundColor: t.bgSurface, borderColor: `${t.accent}80` },
                ]}
              >
              {usePackFace && packCardTheme && (
                <LinearGradient
                  colors={[...packCardTheme.backGradient]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { borderRadius: 20, borderWidth: 1, borderColor: packCardTheme.borderAccent },
                  ]}
                />
              )}
              {!usePackFace && (
                <LinearGradient
                  pointerEvents="none"
                  colors={[t.cardGradient[1], t.cardGradient[0]]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text
                maxFontSizeMultiplier={1.35}
                style={
                  voiceSpeakOnRight
                    ? {
                        position: 'absolute',
                        top: 14,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        color: t.accent,
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                      }
                    : {
                        position: 'absolute',
                        top: 14,
                        left: 44,
                        color: t.accent,
                        fontSize: 10,
                        fontWeight: '800',
                        letterSpacing: 1.5,
                      }
                }
              >
                {backLangBadge}
              </Text>
              {showDevPackCornerBadge && (
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: `${t.accent}77`,
                    backgroundColor: `${t.accent}1F`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: t.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>DEV PACK</Text>
                </View>
              )}
              {showSourceBadge && (
                <View style={[sourceBadgeStyle, { backgroundColor: `${srcBadgeColor}22`, borderColor: `${srcBadgeColor}55` }]}>
                  <Text style={[sourceBadgeTextStyle, { color: srcBadgeColor }]}>
                    {srcLabel}
                    {item.sourceId ? ` ${item.sourceId}` : ''}
                  </Text>
                </View>
              )}
              <ScrollView decelerationRate="fast"
                style={{ maxHeight: frontTextMaxH, width: '100%' }}
                contentContainerStyle={{
                  paddingHorizontal: 2,
                  paddingVertical: 2,
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                showsVerticalScrollIndicator={tr.length > 72}
                scrollEnabled={tr.length > 72}
                bounces={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <>
                  {tr.includes('≠') ? (
                    <>
                      <Text
                        maxFontSizeMultiplier={1.35}
                        style={{ color: t.correct, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center', width: '100%' }}
                      >
                        {tr.split('≠')[0].trim()}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.35}
                        style={{
                          color: t.wrong,
                          fontSize: f.body,
                          fontWeight: '600',
                          textAlign: 'center',
                          marginTop: 8,
                          textDecorationLine: 'line-through',
                          width: '100%',
                        }}
                      >
                        {tr.split('≠')[1].trim()}
                      </Text>
                    </>
                  ) : (
                    <Text
                      maxFontSizeMultiplier={1.35}
                      style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center', width: '100%' }}
                    >
                      {tr}
                    </Text>
                  )}
                </>
              </ScrollView>
              </Reanimated.View>
            </Animated.View>
          </TouchableOpacity>

          {/* E13: точки силы слова из проекции ошибок — только на лице. */}
          {strength ? (
            <Animated.View
              pointerEvents="none"
              style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 5, opacity: cFrontOp }}
            >
              <WordStrengthDots strength={strength} t={t} testID={`fc-strength-${item.id}`} />
            </Animated.View>
          ) : null}

          <View
            onStartShouldSetResponder={() => true}
            style={
              voiceSpeakOnRight
                ? { position: 'absolute', top: 8, right: 8, zIndex: 5 }
                : { position: 'absolute', top: 8, left: 8, zIndex: 5 }
            }
          >
            {isModernAbbrevCard ? (
              <>
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: voiceSpeakOnRight ? undefined : 0,
                    right: voiceSpeakOnRight ? 0 : undefined,
                    opacity: cFrontOp,
                  }}
                >
                  <TouchableOpacity
                    onPress={speakFront}
                    disabled={voiceDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={voiceLabel}
                    accessibilityState={{ disabled: voiceDisabled }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${t.bgSurface}F0`,
                      borderWidth: 1,
                      borderColor: t.border,
                      opacity: voiceDisabled ? 0.42 : 1,
                    }}
                  >
                    <Ionicons name="volume-medium" size={15} color={t.accent} />
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: voiceSpeakOnRight ? undefined : 0,
                    right: voiceSpeakOnRight ? 0 : undefined,
                    opacity: cBackOp,
                  }}
                >
                  <TouchableOpacity
                    onPress={speakBack}
                    disabled={voiceDisabled}
                    accessibilityRole="button"
                    accessibilityLabel={voiceLabel}
                    accessibilityState={{ disabled: voiceDisabled }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${t.bgSurface}F0`,
                      borderWidth: 1,
                      borderColor: t.border,
                      opacity: voiceDisabled ? 0.42 : 1,
                    }}
                  >
                    <Ionicons name="volume-medium" size={15} color={t.accent} />
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <Animated.View style={{ opacity: cFrontOp }}>
                <TouchableOpacity
                  onPress={speakFront}
                  disabled={voiceDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={voiceLabel}
                  accessibilityState={{ disabled: voiceDisabled }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${t.bgSurface}F0`,
                    borderWidth: 1,
                    borderColor: t.border,
                    opacity: voiceDisabled ? 0.42 : 1,
                  }}
                >
                  <Ionicons name="volume-medium" size={15} color={t.accent} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {hasDetails && (
            <View
              onStartShouldSetResponder={() => true}
              style={{ position: 'absolute', bottom: 8, left: 0, right: 0, zIndex: 6, alignItems: 'center' }}
            >
              <TouchableOpacity
                onPress={toggleDetails}
                hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsExpanded }}
                accessibilityLabel={detailsToggleLabel}
                style={{ padding: 4 }}
              >
                <Animated.View style={{ transform: [{ translateY: hintY }] }}>
                  <Reanimated.View style={chevronRotateStyle}>
                    <Ionicons
                      name="chevron-down"
                      size={22}
                      color={usePackFace && packCardTheme ? packCardTheme.borderAccent : t.accent}
                    />
                  </Reanimated.View>
                </Animated.View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {hasDetails && detailsPanelMounted && (
          <Reanimated.View pointerEvents="none" style={detailsGapSpacerStyle} collapsable={false} />
        )}

        {hasDetails && detailsPanelMounted && (
          <Reanimated.View
            collapsable={false}
            renderToHardwareTextureAndroid={effectiveOs === 'android'}
            style={[
              {
                backgroundColor: t.bgSurface,
                borderColor: t.border,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                elevation: 0,
                shadowOpacity: 0,
                shadowColor: 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 0,
              },
              detailsPanelSizeStyle,
            ]}
          >
            <View
              style={{
                borderRadius: 20,
                overflow: 'hidden',
              }}
              collapsable={false}
            >
              <View onLayout={onVisibleDetailsLayout} collapsable={false}>
                {detailsInner}
              </View>
            </View>
          </Reanimated.View>
        )}

        <Animated.View
          pointerEvents={isLongPressed ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 20,
            zIndex: 10,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: overlayOpacity,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={onCloseDelete}
            onLongPress={onCloseDelete}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}
          >
            <View onStartShouldSetResponder={() => true}>
              <Animated.View style={{ transform: [{ scale: overlayBtnScale }] }}>
                <TouchableOpacity
                  onPress={() => onDeleteCard(item, itemIdx)}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#D32F2F', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>{deleteLabel}</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
      </Reanimated.View>
    </Animated.View>
  );
}

const FlashcardListItem = React.memo(FlashcardListItemImpl);

export default FlashcardListItem;
