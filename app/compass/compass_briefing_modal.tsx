/**
 * Компас — модал брифинга дня. ОБОЛОЧКА, Волна «плоский лист» (2026-07-03).
 *
 * Один тёплый лист при входе. ЕДИНЫЙ дизайн-язык Компаса (compass_sheet_kit):
 * секции делит воздух и тонкая линия, НЕ рамки-коробки; голос Компаса — крупный
 * заголовок-герой; один акцент из активной темы. ВСЕ тексты — через triLang из
 * compass_copy (канон Библии). Никакой собственной логики выбора дня — получает
 * готовый CompassDay из мозга.
 *
 * ВЕТКИ:
 *  • day_closing → вечерний ритуал (DayClosingPanel, свой CTA внутри);
 *  • welcome (first_day / comeback) → живое приветствие Компаса + список первых
 *    шагов (тап ведёт в фичу) + «Поехали» (осмысленный старт) + «Позже»;
 *  • обычный день → голос + задачи-ВЫБОР (тап по задаче = переход, БЕЗ отдельной
 *    кнопки «Начать день» — она была непонятной) + мягкие секции + «Позже».
 *
 * «Позже» — маленький серый нажимаемый текст, НЕ широкая кнопка (правило юзера).
 *
 * ИЗОЛЯЦИЯ: компонент рендерит null, если Компас выключен или дня нет. Вызывающий
 * экран (home) монтирует его за флагом — при off ничего не появляется.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import type { Theme } from '../../constants/theme';
import { compassOn } from './compass_flags';
import type { CompassDay, CompassTask, CompassTaskKind } from './compass_brain';
import DayClosingPanel from './compass_day_closing_panel';
import { useCompassVoice } from './use_compass_voice';
import {
  CompassGrabber,
  CompassEyebrow,
  CompassVoice,
  CompassPickList,
  CompassPickRow,
  CompassSoftSection,
  CompassLaterLink,
  compassOnAccentColor,
} from './compass_sheet_kit';
import {
  COMPASS_BRIEFING_TITLE,
  COMPASS_LETS_GO,
  COMPASS_LATER,
  COMPASS_TASK_TITLE,
  COMPASS_TASK_MINUTES,
  COMPASS_DAY_CLOSING_TITLE,
  buildCompassGreeting,
  buildCompassInduction,
  compassKnownFocusCategoryLabel,
} from './compass_copy';
import { COMPASS_SOCIAL_COLLAPSE, COMPASS_SOCIAL_HEADER, COMPASS_SOCIAL_SHOW_ALL } from './compass_social_copy';
import { compassIconSource } from '../../constants/weeklyCompassIcons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TASK_ICON: Record<CompassTaskKind, IoniconName> = {
  lesson_dive: 'book-outline',
  mistake_repair: 'bandage-outline',
  flashcards_review: 'albums-outline',
  pronunciation: 'mic-outline',
  plan_continue: 'navigate-outline',
};

const INDUCTION_ICON: Record<NonNullable<CompassDay['inductionFeature']>, IoniconName> = {
  level_test: 'flag-outline',
  dialogs: 'chatbubbles-outline',
  flashcards: 'albums-outline',
  lessons: 'book-outline',
  daily_tasks: 'sparkles-outline',
};

/**
 * Голос Компаса с мягким кросс-фейдом при подмене текста: живой ИИ-комментарий
 * приходит асинхронно и раньше «прыгал» посреди чтения. One-shot анимации по
 * событию смены текста, без фоновых циклов (перф-канон).
 */
function FadingVoiceComment({ t, text }: { t: Theme; text: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(text);
  const shownRef = useRef(text);
  useEffect(() => {
    if (text === shownRef.current) return;
    Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      shownRef.current = text;
      setShown(text);
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  }, [text, opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <CompassVoice t={t}>{shown}</CompassVoice>
    </Animated.View>
  );
}

interface CompassBriefingModalProps {
  visible: boolean;
  day: CompassDay | null;
  onStart: () => void;
  onLater: () => void;
  /**
   * Тап по конкретной задаче дня (открыть её экран). Необязателен: если не задан —
   * строки задач остаются некликабельными (поведение «только просмотр»).
   */
  onTaskPress?: (task: CompassTask) => void;
  /** Тап по индакшн-подсказке «попробуй первым» (открыть фичу). Необязателен. */
  onInductionPress?: (feature: NonNullable<CompassDay['inductionFeature']>) => void;
  /**
   * Локализованные строки соц-сводки «Кстати…» (заявки/принятия/лайки).
   * Необязательно: пусто/нет — блок не рендерится.
   */
  socialLines?: string[];
  socialAllLines?: string[];
  /** Мост к полному доступу с запертого вечернего ритуала (free-tier). */
  onDayClosingUpgrade?: () => void;
  /** Тап по «Фокусу на завтра» в полном вечернем ритуале (открыть экран шага). */
  onDayClosingFocusPress?: () => void;
  accountReminder?: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  } | null;
  onAccountLinkPress?: () => void;
  /** Только для dev/QA лабораторий: показать превью, даже если remote flag Компаса выключен. */
  ignoreCompassFlag?: boolean;
}

export default function CompassBriefingModal({
  visible,
  day,
  onStart,
  onLater,
  onTaskPress,
  onInductionPress,
  onDayClosingUpgrade,
  onDayClosingFocusPress,
  socialLines,
  socialAllLines,
  accountReminder,
  onAccountLinkPress,
  ignoreCompassFlag = false,
}: CompassBriefingModalProps) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const accent = t.accent;
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const sheetBottomGap = Math.max(18, bottomInset + 10);
  const dayClosing = day?.type === 'day_closing' ? day.dayClosing : undefined;
  const isDayClosing = !!dayClosing;
  const [socialExpanded, setSocialExpanded] = useState(false);

  // ── Смахни-вниз-чтобы-закрыть (жест + «дорогая» анимация ухода) ──────────
  // Лист живёт под пальцем: тянешь вниз — едет за пальцем, фон гаснет; вверх (за
  // grabber) — резиновое сопротивление. На отпускании: утащил за порог ИЛИ бросил
  // с ускорением — лист чуть приподнимается и увесисто уезжает вниз (onLater);
  // иначе упруго пружинит на место. Перф-канон: анимации one-shot, без фоновых
  // циклов. Жест обёрнут в свой GestureHandlerRootView — RN Modal рендерит
  // отдельный корень (приём из CardPackShardPaywallModal).
  //
  // ДВА жеста-источника:
  //  • grabber-зона (как раньше): вниз 1:1, вверх резина;
  //  • ВЕСЬ лист, когда скролл задач стоит вверху: привычный жест «потянуть лист
  //    из любого места». Работает одновременно с нативным скроллом
  //    (Gesture.Native + simultaneousWithExternalGesture): скролл не вверху или
  //    палец идёт вверх → жест листа молчит и скролл живёт как обычно.
  const dragY = useSharedValue(0);
  const scrollAtTop = useSharedValue(true);
  const dragFromTop = useSharedValue(false);
  // Дистанция ухода: гарантированно за нижнюю кромку самого высокого листа.
  const swipeOffDistance = useMemo(() => Math.max(560, winH * 0.9), [winH]);
  const onLaterRef = useRef(onLater);
  onLaterRef.current = onLater;
  const dismissBySwipe = useCallback(() => {
    void hapticTap();
    onLaterRef.current();
  }, []);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-28, 28])
        .onUpdate((e) => {
          'worklet';
          // Вниз — 1:1 за пальцем; вверх — сильное сопротивление (резина).
          dragY.value = e.translationY < 0 ? e.translationY * 0.14 : e.translationY;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragY.value > 90 || e.velocityY > 850;
          if (shouldClose) {
            // «Дорого»: подскок вверх на 22px (130мс), затем увесистый уход вниз.
            dragY.value = withSequence(
              withTiming(-22, { duration: 130, easing: REasing.out(REasing.cubic) }),
              withTiming(swipeOffDistance, { duration: 300, easing: REasing.in(REasing.cubic) }, (finished) => {
                if (finished) runOnJS(dismissBySwipe)();
              }),
            );
          } else {
            // Не дотянул — упруго возвращается (лёгкий перелёт, как easeOutBack).
            dragY.value = withSpring(0, { damping: 16, stiffness: 180, mass: 0.9 });
          }
        }),
    [dragY, dismissBySwipe, swipeOffDistance],
  );

  // Нативный жест скролла задач — «внешний» для листового пана (см. ниже).
  const scrollNativeGesture = useMemo(() => Gesture.Native(), []);
  const sheetSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(14)
        .failOffsetX([-28, 28])
        .simultaneousWithExternalGesture(scrollNativeGesture)
        .onStart(() => {
          'worklet';
          // Жест листа засчитывается, только если начался при скролле вверху.
          dragFromTop.value = scrollAtTop.value;
        })
        .onUpdate((e) => {
          'worklet';
          if (!dragFromTop.value) return;
          // Только вниз и только пока скролл вверху; движение вверх — скроллу.
          dragY.value = e.translationY > 0 && scrollAtTop.value ? e.translationY : 0;
        })
        .onEnd((e) => {
          'worklet';
          if (!dragFromTop.value) return;
          const shouldClose = dragY.value > 90 || (dragY.value > 0 && e.velocityY > 850);
          if (shouldClose) {
            dragY.value = withSequence(
              withTiming(-22, { duration: 130, easing: REasing.out(REasing.cubic) }),
              withTiming(swipeOffDistance, { duration: 300, easing: REasing.in(REasing.cubic) }, (finished) => {
                if (finished) runOnJS(dismissBySwipe)();
              }),
            );
          } else if (dragY.value !== 0) {
            dragY.value = withSpring(0, { damping: 16, stiffness: 180, mass: 0.9 });
          }
        }),
    [dragY, scrollAtTop, dragFromTop, dismissBySwipe, swipeOffDistance, scrollNativeGesture],
  );

  const sheetSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));
  const backdropSwipeStyle = useAnimatedStyle(() => {
    // Фон гаснет пропорционально уводу вниз (0..1 по высоте листа).
    const frac = Math.min(1, Math.max(0, dragY.value / (winH * 0.5)));
    return { opacity: 1 - frac * 0.9 };
  });

  // Тип дня как идентичность контента: эффекты показа привязаны к НЕМУ, а не к
  // объекту day — мигание hasPremiumAccess при фоновом cloud-refresh пересоздавало
  // объект и перезапускало reveal-каскад с хаптиком прямо на глазах у читающего.
  const dayKind = day?.type ?? null;

  // Сброс сдвига на каждый показ (иначе после ухода лист остался бы уехавшим).
  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      scrollAtTop.value = true;
    }
  }, [visible, dayKind, dragY, scrollAtTop]);
  // Гибрид-голос: текст Библии сразу, живой ИИ-текст подменяет когда придёт
  // (с мягким кросс-фейдом в FadingVoiceComment и анти-поздней подменой в хуке).
  // Хук вызывается всегда (правила хуков) и сам безопасно обрабатывает day=null.
  const comment = useCompassVoice(visible && !isDayClosing ? day : null);

  // Тактильный «стук» Компаса при появлении брифинга: мягкий tap. Один раз на показ.
  useEffect(() => {
    if (visible && dayKind) void hapticTap();
  }, [visible, dayKind]);

  // ОДНОРАЗОВАЯ анимация показа (перф-канон: без циклов на фоне): содержимое
  // проявляется каскадом (голос → блоки → задачи). Сброс на каждый показ.
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || !dayKind) return;
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 720,
      delay: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, dayKind, reveal]);

  useEffect(() => {
    if (!visible || isDayClosing) setSocialExpanded(false);
  }, [visible, isDayClosing, socialLines, socialAllLines]);

  if ((!ignoreCompassFlag && !compassOn()) || !day) return null;

  const title = triLang(lang, isDayClosing ? COMPASS_DAY_CLOSING_TITLE : COMPASS_BRIEFING_TITLE);
  // Надзаголовок — только имя Компаса, без «· День N» (правило юзера: убрать день из модалов).
  const dayLabel = title;

  // Приветственные дни (первый день / возврат) — живое обращение Компаса.
  const greeting = isDayClosing ? [] : buildCompassGreeting(day, lang);
  const induction = isDayClosing ? null : buildCompassInduction(day.inductionFeature, lang);
  const isWelcome = greeting.length > 0;
  const social = isDayClosing ? [] : (socialLines ?? []).filter((line) => line.trim().length > 0);
  const socialFull = isDayClosing ? [] : (socialAllLines ?? social).filter((line) => line.trim().length > 0);
  const socialHasMore = socialFull.length > social.length;
  const socialShown = socialExpanded && socialHasMore ? socialFull : social;
  const socialHeader = triLang(lang, COMPASS_SOCIAL_HEADER);
  const socialToggleText = socialExpanded
    ? triLang(lang, COMPASS_SOCIAL_COLLAPSE)
    : triLang(lang, COMPASS_SOCIAL_SHOW_ALL).replace('{count}', String(socialFull.length));
  const laterLabel = triLang(lang, COMPASS_LATER);
  const letsGoLabel = triLang(lang, COMPASS_LETS_GO);
  const minutesLabel = triLang(lang, COMPASS_TASK_MINUTES);

  const revealHead = {
    opacity: reveal.interpolate({ inputRange: [0, 0.55], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 0.55], outputRange: [10, 0], extrapolate: 'clamp' as const }) }],
  };
  const revealBody = {
    opacity: reveal.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{ translateY: reveal.interpolate({ inputRange: [0.3, 1], outputRange: [12, 0], extrapolate: 'clamp' as const }) }],
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onLater}>
      <GestureHandlerRootView style={styles.root}>
        <Reanimated.View style={[styles.backdrop, { paddingBottom: sheetBottomGap }, backdropSwipeStyle]}>
          <GestureDetector gesture={sheetSwipeGesture}>
          <Reanimated.View style={[styles.sheet, { backgroundColor: t.bgCard, borderColor: t.border }, sheetSwipeStyle]}>
            {/* Хват-полоска + шапка = приоритетная зона свайпа (с резиной вверх). */}
            {/* Плюс ВЕСЬ лист тянется вниз, пока скролл задач стоит вверху — жест */}
            {/* «потянуть лист из любого места» работает привычно. День-закрытие */}
            {/* свой grabber не рисует — тонкая невидимая зона-хват сверху панели. */}
            <GestureDetector gesture={swipeGesture}>
              <View style={styles.grabZone}>
                {!isDayClosing ? <CompassGrabber t={t} /> : <View style={styles.grabZoneClosing} />}
              </View>
            </GestureDetector>

          <GestureDetector gesture={scrollNativeGesture}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollAtTop.value = e.nativeEvent.contentOffset.y <= 1;
            }}
          >
            {isDayClosing && dayClosing ? (
              <Animated.View style={revealHead}>
                <DayClosingPanel
                  dayClosing={dayClosing}
                  onClose={onStart}
                  onUpgrade={onDayClosingUpgrade}
                  onLater={onLater}
                  onFocusPress={onDayClosingFocusPress}
                  preview={ignoreCompassFlag}
                />
              </Animated.View>
            ) : (
              <Animated.View style={revealHead}>
                <CompassEyebrow t={t} icon="compass-outline" iconSource={compassIconSource(themeMode)} text={dayLabel} accent={accent} />

                {isWelcome ? (
                  <View style={styles.greeting}>
                    {greeting.map((line, i) => (
                      <Text
                        key={`greet-${i}`}
                        style={[i === 0 ? styles.greetLead : styles.greetLine, { color: i === 0 ? t.textPrimary : t.textSecond }]}
                      >
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <FadingVoiceComment t={t} text={comment} />
                )}
              </Animated.View>
            )}

            {!isDayClosing && (
              <Animated.View style={revealBody}>
                {/* Индакшн «с чего здорово начать» — как строка-выбор в списке. */}
                {induction && day.inductionFeature && (
                  <CompassPickList t={t} accent={accent} style={styles.pickTop}>
                    <CompassPickRow
                      t={t}
                      accent={accent}
                      first
                      icon={INDUCTION_ICON[day.inductionFeature]}
                      title={induction.cta}
                      meta={induction.text}
                      onPress={onInductionPress ? () => onInductionPress(day.inductionFeature!) : undefined}
                    />
                  </CompassPickList>
                )}

                {/* Задачи дня — плоский список-ВЫБОР. Только обычные дни (в welcome */}
                {/* ведёт живой текст + индакшн). Тап по задаче = переход в её экран. */}
                {/* Метка: минуты + ЛИЧНАЯ тема задачи (слабое место), когда она есть — */}
                {/* иначе строки выглядели одинаковым шаблоном каждый день. */}
                {!isWelcome && day.tasks.length > 0 && (
                  <CompassPickList t={t} accent={accent} style={styles.pickTop}>
                    {day.tasks.map((task, i) => {
                      const topicLabel = compassKnownFocusCategoryLabel(task.weakTopic, lang);
                      return (
                        <CompassPickRow
                          key={`${task.kind}-${i}`}
                          t={t}
                          accent={accent}
                          first={i === 0}
                          icon={TASK_ICON[task.kind]}
                          title={triLang(lang, COMPASS_TASK_TITLE[task.kind])}
                          meta={topicLabel ? `${task.minutes} ${minutesLabel} · ${topicLabel}` : `${task.minutes} ${minutesLabel}`}
                          onPress={onTaskPress ? () => onTaskPress(task) : undefined}
                        />
                      );
                    })}
                  </CompassPickList>
                )}

                {/* «Кстати…» — тёплая соц-сводка за линией (не рамка). */}
                {social.length > 0 && (
                  <CompassSoftSection testID="compass-social-summary" t={t} accent={accent} eyebrow={socialHeader} eyebrowIcon="people-outline">
                    {socialHasMore && (
                      <TouchableOpacity
                        activeOpacity={0.78}
                        onPressIn={() => hapticTap()}
                        onPress={() => setSocialExpanded((v) => !v)}
                        accessibilityRole="button"
                        accessibilityLabel={socialToggleText}
                        style={styles.socialToggle}
                      >
                        <Text style={[styles.socialToggleText, { color: accent }]}>
                          {socialToggleText}
                        </Text>
                        <Ionicons name={socialExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={accent} />
                      </TouchableOpacity>
                    )}
                    {socialShown.map((line, i) => (
                      <Text key={`social-${i}`} style={[styles.softLine, { color: t.textPrimary }]}>
                        {line}
                      </Text>
                    ))}
                  </CompassSoftSection>
                )}

                {/* Напоминание привязать аккаунт — за линией; testID'ы сохранены (контракт). */}
                {accountReminder && (
                  <CompassSoftSection
                    testID="compass-account-link-reminder"
                    t={t}
                    accent={accent}
                    eyebrow={accountReminder.eyebrow}
                    eyebrowIcon="cloud-upload-outline"
                  >
                    <Text style={[styles.accountTitle, { color: t.textPrimary }]}>{accountReminder.title}</Text>
                    <Text style={[styles.accountBody, { color: t.textSecond }]}>{accountReminder.body}</Text>
                    {onAccountLinkPress && (
                      <TouchableOpacity
                        testID="compass-account-link-cta"
                        activeOpacity={0.84}
                        onPressIn={() => hapticTap()}
                        onPress={onAccountLinkPress}
                        style={[styles.accountCta, { backgroundColor: accent }]}
                      >
                        <Text style={[styles.accountCtaText, { color: compassOnAccentColor(accent) }]}>{accountReminder.cta}</Text>
                      </TouchableOpacity>
                    )}
                  </CompassSoftSection>
                )}

              </Animated.View>
            )}
          </ScrollView>
          </GestureDetector>

          {/* Низ листа — только для брифинга (вечерний ритуал носит свои внутри панели). */}
          {/* Welcome-дни: «Поехали» осмысленный старт (CTA-текст) + «Позже». */}
          {/* Обычный день: только «Позже» — задачи выше и есть сам выбор. */}
          {!isDayClosing && (
            <>
              {isWelcome && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPressIn={() => hapticTap()}
                  onPress={onStart}
                  style={[styles.letsGo, { backgroundColor: accent }]}
                >
                  <Text style={[styles.letsGoText, { color: compassOnAccentColor(accent) }]}>{letsGoLabel}</Text>
                </TouchableOpacity>
              )}
              <CompassLaterLink t={t} label={laterLabel} onPress={onLater} />
            </>
          )}
          </Reanimated.View>
          </GestureDetector>
        </Reanimated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '88%', alignSelf: 'center', borderRadius: 26, borderWidth: 0, paddingHorizontal: 22, paddingBottom: 18 },
  // Зона хвата сверху листа — широкая мишень для пальца (тянуть вниз). Внутри —
  // видимый grabber (брифинг) или тонкая невидимая полоса (день-закрытие).
  grabZone: { paddingTop: 12, paddingBottom: 2, alignItems: 'center' },
  grabZoneClosing: { height: 12, alignSelf: 'stretch' },
  scroll: { flexGrow: 0 },
  scrollBody: { paddingBottom: 2 },
  greeting: { gap: 9, marginTop: 15 },
  greetLead: { fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.2 },
  greetLine: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  pickTop: { marginTop: 20 },
  socialToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8 },
  socialToggleText: { fontSize: 11.5, fontWeight: '800' },
  softLine: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginTop: 2 },
  accountTitle: { fontSize: 15.5, lineHeight: 21, fontWeight: '900' },
  accountBody: { fontSize: 13.5, lineHeight: 19, fontWeight: '600', marginTop: 5 },
  accountCta: { marginTop: 12, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  accountCtaText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  letsGo: { marginTop: 8, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  letsGoText: { fontSize: 16, fontWeight: '800' },
});
