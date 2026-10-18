import Ionicons from '@expo/vector-icons/Ionicons';
import { fitPhraseFontSize } from './fit_phrase_font';
import { VideoCardSaveSlot } from '../../components/cards-grid/VideoCardSaveSlot';
import { useVideoCardSaveContext } from './use_video_card_save';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../components/ThemeContext';
import { FlowText } from '../../components/text-integrity/FlowText';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../../components/v2/ShadowSurface';
import { hapticMediumImpact } from '../../hooks/use-haptics';
import { DEV_CONTENT_UNLOCK } from '../config';
import { useEffectivePlatformOS } from '../platform_ui_preview';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
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
import { computeHeightScale } from '../../constants/layout-scale';
import { inferExpoSpeechLanguage, type SpeakOpts } from '../../hooks/use-audio';
import { packLanguageHasVoice } from './pack_languages';
import FlashcardDetailsBody from './FlashcardDetailsBody';
import { buildLegacyFlipFaceStyles, useFcCrossfadeFlip } from './PhraseCard';
import WordStrengthDots from './WordStrengthDots';
import { formatVideoMoment } from './video_moment';
import type { WordStrength } from './word_strength';
import { CardItem, CategoryId, cardHasDetails, resolveFlashcardBackText, type FlashcardContentLang } from './types';
import { noteSkeletonGeom } from '../skeleton_geom_log';

const EXEMPT_COLOR_1 = '#D32F2F'; // theme-exempt: скрим и белый значок на красном действии «Удалить» — постоянные
const EXEMPT_COLOR_2 = '#fff'; // theme-exempt: скрим и белый значок на красном действии «Удалить» — постоянные
const EXEMPT_COLOR_3 = '#fff'; // theme-exempt: скрим и белый значок на красном действии «Удалить» — постоянные


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
  savedCollectionSurface?: boolean;
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
  /**
   * D131/PM-288: набор из видео — открыть ролик на секунде фразы.
   * null/undefined (обычный набор, раздел закрыт) — кнопки момента нет вовсе.
   */
  onOpenVideoMoment?: ((item: CardItem) => void) | null;
  /** Подпись кнопки момента для экранного диктора (язык интерфейса). */
  videoMomentLabel?: string;
};

function FlashcardListItemImpl({
  item,
  itemIdx,
  lang,
  activeCat,
  savedCollectionSurface = false,
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
  onOpenVideoMoment = null,
  videoMomentLabel,
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный строки списка растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const effectiveOs = useEffectivePlatformOS();
  const tr = resolveFlashcardBackText(item, lang);
  /** Saved cards retain `DEV:<packId>` as their provenance; expose that provenance as a human label. */
  const isMarketplaceBundleCard = String(item.sourceId ?? '').startsWith('DEV:');
  // зачем: плашка «ИСТОЧНИК: ВИДЕО · …» на карточке убрана навсегда (владелец,
  // 22.09.2026) — она ничему не учила и перебивала саму фразу. Сама подпись
  // (buildSourceLabel) жива и нужна: по ней идёт ПОИСК в CollectionListView и
  // её показывает конструктор набора сообщества. Удалена только отрисовка тут.
  const showDevPackCornerBadge = DEV_CONTENT_UNLOCK && isMarketplaceBundleCard;
  const isModernAbbrevCard = false;
  const parsedAbbrevEn = useMemo(
    () => splitAbbrevMarketplaceEn(item.en, item.abbrevEn, item.expansionEn),
    [item.en, item.abbrevEn, item.expansionEn],
  );
  // E2: позиционного лимита-20 здесь больше нет (баг 10) — заблокированные лимитом
  // карточки не попадают в data списка; вместо замков одна секция «+N скрыто» в футере.
  /** У «Збережені» кнопка озвучки справа (як раніше); в інших вкладках — зліва, щоб не перекривати фразу. */
  const voiceSpeakOnRight = activeCat === 'saved';
  const usePackFace = !!packCardTheme && isMarketplaceBundleCard;
  const savedGlass = savedCollectionSurface && !usePackFace;
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
  const { width: winW, height: winH, fontScale } = useWindowDimensions();
  // зачем: на низких экранах (iPhone SE 667pt, Android 360x800) текст фразы почти
  // не ужимался — uiScale в ThemeContext считается от ШИРИНЫ, а она у телефонов
  // почти одинаковая (360-430 против эталона 390) и даёт всего -3%. Короткая у
  // таких устройств именно ВЫСОТА (667 против 844 = 0.79). Берём ту же
  // computeHeightScale, что уже решает этот класс бага в онбординге.
  const cardScale = computeHeightScale(winH);
  /** Кегль карточки: округляем и держим читаемый пол, чтобы фраза не стала мелкой. */
  const cardFont = useCallback(
    (base: number, floor: number) => Math.max(floor, Math.round(base * cardScale)),
    [cardScale],
  );
  /**
   * зачем: отступ грани (22 в общей геометрии) тоже ужимаем по высоте — иначе на
   * низком экране текст уменьшился, а поля остались прежними, и карточка не стала
   * компактнее. Переопределяем локально ПОСЛЕ cardStyle, чтобы не менять общий
   * FLASHCARD_LIST_ITEM_CARD_STYLE: его же использует Learning V2.
   */
  const cardFacePadStyle = useMemo(
    () => ({ padding: savedGlass ? 8 : Math.max(14, Math.round(22 * cardScale)) }),
    [cardScale, savedGlass],
  );
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
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
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
    () => inferExpoSpeechLanguage(voiceTextFront, item.packLanguage),
    [voiceTextFront, item.packLanguage],
  );
  const detailsToggleLabel = detailsExpanded
    ? FLASHCARD_DETAILS_TOGGLE_LABELS[lang].collapse
    : FLASHCARD_DETAILS_TOGGLE_LABELS[lang].expand;
  const backSpeakLocale = useMemo(
    () => speechLocaleForFlashcardBack(lang),
    [voiceTextBack, lang],
  );
  // зачем: коды языка («EN», «RU»…) над фразой владелец убрал навсегда 22.09.2026 —
  // язык и так очевиден из самой фразы, пометка только шумела. Локали озвучки
  // (frontSpeakLocale/backSpeakLocale) остаются: их читает кнопка звука.

  // зачем (D127): у карточки набора «без языка» кнопок звука нет совсем — нечего произносить.
  const voiceHidden = !packLanguageHasVoice(item.packLanguage);
  // зачем: D131 — кнопка «к моменту ролика» есть ТОЛЬКО у фразы с таймкодом в
  // наборе из видео. Без транскрипта фраза выглядит как обычная карточка.
  const videoMomentSec = onOpenVideoMoment && typeof item.videoStartSec === 'number' ? item.videoStartSec : null;
  const videoCardSave = useVideoCardSaveContext();
  const openVideoMoment = useCallback(() => {
    if (!onOpenVideoMoment) {
      console.warn(`[VIDEO-SEEK] тап по моменту ${item.id}: обработчика нет`);
      return;
    }
    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
    onOpenVideoMoment(item);
  }, [item, onOpenVideoMoment]);

  const speakFront = useCallback(() => {
    // зачем: D128 — лицевая сторона звучит клипом OpenAI языка карточки.
    onSpeak(voiceTextFront, { language: frontSpeakLocale, cardAudio: true });
  }, [frontSpeakLocale, onSpeak, voiceTextFront]);
  const speakBack = useCallback(() => {
    onSpeak(voiceTextBack, { language: backSpeakLocale });
  }, [backSpeakLocale, onSpeak, voiceTextBack]);

  const isLongPressed = longPressedId === item.id;
  const canDeleteThis = !item.isSystem;
  const isDeleting = deletingId === item.id;
  /** Область під шапкою: EN + IPA вміщаються за рахунок, без скролу */
  const frontTextMaxH = Math.max(92, cardHeight - 74);
  // зачем (владелец 18.10, координатор 10:10): длинная фраза (особенно из видео) должна ПОМЕЩАТЬСЯ на карточку — кегль уменьшается расчётом по длине (до 14), перенос по словам, без «…» и без прокрутки;
  // короткие фразы и обычные карточки получают прежний базовый размер без изменений.
  // Ревизор 4d65c8be5 (в): считаем ТОЛЬКО для наборов из видео (контекст сохранения есть) и с учётом системного масштаба шрифта (Text растёт до maxFontSizeMultiplier 1.35).
  const faceTextWidth = Math.max(120, winW - 92);
  const phraseFontScale = Math.min(Math.max(fontScale, 1), 1.35);
  const frontPhraseSize = videoCardSave
    ? fitPhraseFontSize({ text: item.en, baseSize: cardFont(f.h1 + 2, 17), widthPx: faceTextWidth, maxHeightPx: frontTextMaxH - 16 - (item.transcription?.trim() ? Math.round(24 * cardScale) : 0), fontScale: phraseFontScale })
    : cardFont(f.h1 + 2, 17);
  const backPhraseSize = videoCardSave
    ? fitPhraseFontSize({ text: tr, baseSize: cardFont(f.h1 + 2, 17), widthPx: faceTextWidth, maxHeightPx: frontTextMaxH - 8, fontScale: phraseFontScale })
    : cardFont(f.h1 + 2, 17);
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
                backgroundColor: `${t.accent}14`,
                boxShadow: nestedBoxShadow(g), // зачем (Тень 12.10): кнопка без обводки — тон и малая тень
                paddingVertical: 11,
              }}
            >
              <Ionicons name="pencil-outline" size={16} color={t.accentText} />
              <FlowText testID={`fc-details-edit-label-${item.id}`} provenance="authored" style={{ color: t.accentText, fontSize: f.sub, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>
                {editLabel}
              </FlowText>
            </TouchableOpacity>
          )}
          {onDeleteFromDetails && (
            <TouchableOpacity
              testID="fc-details-delete"
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
                backgroundColor: `${t.wrong}12`,
                boxShadow: nestedBoxShadow(g),
                paddingVertical: 11,
              }}
            >
              <Ionicons name="trash-outline" size={16} color={t.wrong} />
              <FlowText testID={`fc-details-delete-label-${item.id}`} provenance="authored" style={{ color: t.wrong, fontSize: f.sub, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>
                {deleteLabel}
              </FlowText>
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

        <View onLayout={savedGlass && itemIdx === 0 ? (event) => noteSkeletonGeom('saved', 'ready', event.nativeEvent.layout.height) : undefined} style={{ height: cardHeight, position: 'relative' }}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPressIn={() => {
              if (flipOnPressIn && !savedGlass && !isLongPressed) onFlipCard(item.id);
            }}
            onPress={() => {
              if (isLongPressed) {
                onCloseDelete();
                return;
              }
              if (savedGlass && hasDetails) {
                toggleDetails();
              } else if (!flipOnPressIn) onFlipCard(item.id);
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
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'visible', borderRadius: 20 }}
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
                  cardFacePadStyle,
                  cardSplitEdgeStyle,
                  { overflow: 'hidden' },
                  usePackFace
                    ? { backgroundColor: 'transparent', boxShadow: plateBoxShadow(g) }
                    : savedGlass ? { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }
                      : { backgroundColor: t.bgCard, boxShadow: plateBoxShadow(g) },
                ]}
              >
              {usePackFace && packCardTheme && (
                <LinearGradient
                  colors={[...packCardTheme.frontGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { borderRadius: 20, borderWidth: 1, borderColor: packCardTheme.borderAccent /* shadow-ok: рамка тематической карточки набора (арт PackCardTheme) */ },
                  ]}
                />
              )}
              {!usePackFace && (
                savedGlass ? <PlateFill g={g} radius={20} /> :
                <LinearGradient
                  pointerEvents="none"
                  colors={t.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              {showDevPackCornerBadge && (
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: voiceSpeakOnRight ? 46 : 14,
                    borderRadius: 999,
                    backgroundColor: `${t.accent}1F`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: t.accentText, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>DEV PACK</Text>
                </View>
              )}
              {savedGlass ? (
                <View style={styles.savedCompactRow}>
                  <Text testID={`fc-saved-row-number-${item.id}`} style={[styles.savedNumber, { color: g.secondary }]}>{itemIdx + 1}</Text>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.savedTextScroll} contentContainerStyle={styles.savedTextContent} decelerationRate="fast">
                    <FlowText testID={`fc-saved-row-word-${item.id}`} provenance="external" style={[styles.savedWord, { color: g.text }]}>{item.en}</FlowText>
                    {item.transcription?.trim() ? <FlowText testID={`fc-saved-row-ipa-${item.id}`} provenance="external" style={[styles.savedIpa, { color: g.secondary }]}>{item.transcription.trim()}</FlowText> : null}
                    <FlowText testID={`fc-saved-row-translation-${item.id}`} provenance="external" style={[styles.savedTranslation, { color: g.secondary }]}>{tr}</FlowText>
                    {strength ? <WordStrengthDots strength={strength} t={t} testID={`fc-strength-${item.id}`} /> : null}
                  </ScrollView>
                  <View style={styles.savedActions}>
                    {voiceHidden ? null : <TouchableOpacity testID={`fc-saved-row-play-${item.id}`} accessibilityRole="button" accessibilityLabel={voiceLabel} disabled={voiceDisabled} onPress={speakFront} style={[styles.savedAction, { backgroundColor: g.buttonFill }]}>
                      <Ionicons name="play" size={17} color={g.lightTint} />
                    </TouchableOpacity>}
                    {canDeleteThis ? <TouchableOpacity testID={`fc-saved-row-menu-${item.id}`} accessibilityRole="button" accessibilityLabel={deleteLabel} onPress={() => onOpenDelete(item.id)} style={styles.savedAction}>
                      <Ionicons name="ellipsis-horizontal" size={19} color={g.secondary} />
                    </TouchableOpacity> : null}
                  </View>
                </View>
              ) : <ScrollView nestedScrollEnabled showsVerticalScrollIndicator
                style={{ maxHeight: frontTextMaxH, width: '100%' }}
                contentContainerStyle={{ minHeight: frontTextMaxH, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6 }} decelerationRate="fast"
              >
                {isModernAbbrevCard ? (
                  <>
                    <FlowText
                      testID={`fc-card-abbrev-head-${item.id}`}
                      provenance="external"
                      maxFontSizeMultiplier={1.35}
                      style={{
                        color: t.textPrimary,
                        fontSize: cardFont(f.h1 + 4, 18),
                        fontWeight: '800',
                        textAlign: 'center',
                        letterSpacing: 0.5,
                        width: '100%',
                      }}
                    >
                      {parsedAbbrevEn.head}
                    </FlowText>
                    {parsedAbbrevEn.rest ? (
                      <FlowText
                        testID={`fc-card-abbrev-rest-${item.id}`}
                        provenance="external"
                        maxFontSizeMultiplier={1.35}
                        style={{
                          color: t.textMuted,
                          fontSize: cardFont(f.body, 12),
                          fontWeight: '500',
                          marginTop: Math.round(8 * cardScale),
                          textAlign: 'center',
                          width: '100%',
                        }}
                      >
                        {parsedAbbrevEn.rest}
                      </FlowText>
                    ) : null}
                  </>
                ) : (
                  <>
                    <FlowText
                      testID={`fc-card-front-text-${item.id}`}
                      provenance="external"
                      maxFontSizeMultiplier={1.35}
                      style={{
                        color: t.textPrimary,
                        fontSize: frontPhraseSize,
                        fontWeight: '700',
                        textAlign: 'center',
                        width: '100%',
                      }}
                    >
                      {item.en}
                    </FlowText>
                    {item.transcription?.trim() ? (
                      <FlowText
                        testID={`fc-card-transcription-${item.id}`}
                        provenance="external"
                        maxFontSizeMultiplier={1.35}
                        style={{
                          color: t.textMuted,
                          fontSize: cardFont(f.sub, 11),
                          marginTop: Math.round(4 * cardScale),
                          textAlign: 'center',
                          fontStyle: 'italic',
                          letterSpacing: 0.25,
                          width: '100%',
                        }}
                      >
                        {item.transcription.trim()}
                      </FlowText>
                    ) : null}
                  </>
                )}
              </ScrollView>}
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
                  cardFacePadStyle,
                  cardSplitEdgeStyle,
                  { overflow: 'hidden' },
                  usePackFace
                    ? { backgroundColor: 'transparent', boxShadow: plateBoxShadow(g) }
                    : savedGlass ? { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) }
                      : { backgroundColor: t.bgSurface, boxShadow: plateBoxShadow(g) },
                ]}
              >
              {usePackFace && packCardTheme && (
                <LinearGradient
                  colors={[...packCardTheme.backGradient]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    StyleSheet.absoluteFillObject,
                    { borderRadius: 20, borderWidth: 1, borderColor: packCardTheme.borderAccent /* shadow-ok: рамка тематической карточки набора (арт PackCardTheme) */ },
                  ]}
                />
              )}
              {!usePackFace && (
                savedGlass ? <PlateFill g={g} radius={20} /> :
                <LinearGradient
                  pointerEvents="none"
                  colors={[t.cardGradient[1], t.cardGradient[0]]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              {showDevPackCornerBadge && (
                <View
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    borderRadius: 999,
                    backgroundColor: `${t.accent}1F`,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: t.accentText, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 }}>DEV PACK</Text>
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
                        style={{ color: t.correct, fontSize: cardFont(f.h1 + 2, 17), fontWeight: '700', textAlign: 'center', width: '100%' }}
                      >
                        {tr.split('≠')[0].trim()}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.35}
                        style={{
                          color: t.wrong,
                          fontSize: cardFont(f.body, 12),
                          fontWeight: '600',
                          textAlign: 'center',
                          marginTop: Math.round(8 * cardScale),
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
                      style={{ color: t.textPrimary, fontSize: backPhraseSize, fontWeight: '700', textAlign: 'center', width: '100%' }}
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
          {strength && !savedGlass ? (
            <Animated.View
              pointerEvents="none"
              style={{ position: 'absolute', bottom: 12, left: 14, zIndex: 5, opacity: cFrontOp }}
            >
              <WordStrengthDots strength={strength} t={t} testID={`fc-strength-${item.id}`} />
            </Animated.View>
          ) : null}

          {!savedGlass && !voiceHidden ? <View
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
                      boxShadow: nestedBoxShadow(g),
                      opacity: voiceDisabled ? 0.42 : 1,
                    }}
                  >
                    <Ionicons name="volume-medium" size={15} color={t.accentText} />
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
                      boxShadow: nestedBoxShadow(g),
                      opacity: voiceDisabled ? 0.42 : 1,
                    }}
                  >
                    <Ionicons name="volume-medium" size={15} color={t.accentText} />
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
                    boxShadow: nestedBoxShadow(g),
                    opacity: voiceDisabled ? 0.42 : 1,
                  }}
                >
                  <Ionicons name="volume-medium" size={15} color={t.accentText} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View> : null}

          {videoMomentSec !== null && !savedGlass ? (
            <View
              onStartShouldSetResponder={() => true}
              style={[styles.videoMomentWrap, voiceSpeakOnRight ? { left: 8 } : { right: 8 }]}
            >
              <TouchableOpacity
                testID={`fc-video-moment-${item.id}`}
                onPress={openVideoMoment}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel={`${videoMomentLabel ?? 'Play video'} ${formatVideoMoment(videoMomentSec)}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.videoMomentChip, { backgroundColor: `${t.bgSurface}F0`, boxShadow: nestedBoxShadow(g) }]}
              >
                <Ionicons name="play" size={12} color={t.accentText} />
                <Text style={[styles.videoMomentText, { color: t.accentText }]}>{formatVideoMoment(videoMomentSec)}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* зачем (владелец 18.10): «Сохранить» на КАЖДОЙ карточке из видео — только нужные, а не весь набор; кнопка есть, когда экран набора из видео положил сохранение в контекст. */}
          {videoCardSave && !savedGlass ? (
            <View onStartShouldSetResponder={() => true} style={{ position: 'absolute', bottom: 8, right: 10, zIndex: 7 }}>
              <VideoCardSaveSlot
                testID={`fc-video-card-save-${item.id}`}
                save={videoCardSave}
                card={item}
                ink={t.accentText}
                backgroundColor={`${t.bgSurface}F0`}
                boxShadow={nestedBoxShadow(g)}
                size={32}
              />
            </View>
          ) : null}

          {hasDetails && !savedGlass && (
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
                      color={usePackFace && packCardTheme ? packCardTheme.borderAccent : t.accentText}
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
                // зачем (Тень 12.10): панель деталей — плашка без рамки (тень вместо borderLeft/Right/Bottom)
                backgroundColor: savedGlass ? g.plateFillFrom : t.bgSurface,
                boxShadow: plateBoxShadow(g),
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
            backgroundColor: 'rgba(0,0,0,0.55)', // theme-exempt: скрим и белый значок на красном действии «Удалить» — постоянные
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
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: EXEMPT_COLOR_1, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
                >
                  <Ionicons name="trash-outline" size={22} color={EXEMPT_COLOR_2} />
                  <Text style={{ color: EXEMPT_COLOR_3, fontSize: f.body, fontWeight: '700' }}>{deleteLabel}</Text>
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

const baseStyles = StyleSheet.create({
  savedCompactRow: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedNumber: { width: 19, alignSelf: 'flex-start', marginTop: 8, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  savedTextScroll: { flex: 1, maxHeight: 94 },
  savedTextContent: { justifyContent: 'center', paddingVertical: 4 },
  savedWord: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  savedIpa: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  savedTranslation: { fontSize: 13, lineHeight: 17, marginTop: 2 },
  savedActions: { alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' },
  savedAction: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  videoMomentWrap: { position: 'absolute', top: 8, zIndex: 5 },
  videoMomentChip: { height: 30, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoMomentText: { fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

const FlashcardListItem = React.memo(FlashcardListItemImpl);

export default FlashcardListItem;
