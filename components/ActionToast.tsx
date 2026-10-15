import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import { onAppEvent, type AppEventMap } from '../app/events';
import { streakDayToastPayload } from '../app/streak_day_toast';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticError, hapticWarning, hapticSoftImpact, hapticSuccess } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { LUM, SUITE, TOAST } from '../constants/motionHybrid';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { useOverlayActiveKey, useOverlayVisible } from './OverlayArbiter';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from './animationScheduling';
import { themedToastChrome } from '../constants/themedToastChrome';
import { noAndroidOutline } from '../constants/androidGlow';
import { soundDirector } from '../modules/audio/sound_director';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { SoundEventId } from '../modules/audio/sound_events';
import { actionToastToneLabel, resolveActionToastActionLabel, resolveActionToastMessage } from './action_toast_copy';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

type ToastPayload = {
  type: ToastType;
  layout?: AppEventMap['action_toast']['layout'];
  lineIcon?: AppEventMap['action_toast']['lineIcon'];
  soundEventId?: SoundEventId;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
  messageRu: string;
  messageUk?: string;
  messageEn?: string;
  /** ES (UI en español). Si falta y `lang === "es"`, se usa un texto breve según `type`. */
  messageEs?: string;
  messagePtBr?: string;
  messageVi?: string;
  messageId?: string;
  messageTr?: string;
  messagePl?: string;
  /**
   * Действие прямо в тосте (аудит 2026-09-21). Опционально: без него тост
   * остаётся сквозным для тапов и ведёт себя ровно как раньше.
   * Полное описание — у события `action_toast` в app/events.ts.
   */
  action?: AppEventMap['action_toast']['action'];
};

/**
 * зачем: 'warning' — отдельный тон между info и error. Предупреждение («оплата
 * слетит», «цепочка сгорит в полночь») — это не ошибка (ничего не сломалось) и
 * не просто инфо (есть срок и цена бездействия). Раньше такие тосты приходилось
 * маскировать под error/info, и звук у них был чужой.
 */
type ToastType = 'success' | 'error' | 'info' | 'warning' | 'reward';

const TOAST_SOUND_EVENTS: Record<ToastType, SoundEventId> = {
  success: 'pm.system.success',
  error: 'pm.system.error_recoverable',
  info: 'pm.system.info',
  warning: 'pm.system.warning',
  reward: 'pm.reward.small',
};

/**
 * зачем: тост рисует из тона только `icon` и `label`. Все цвета берутся из
 * themedToastChrome(themeMode) и зависят от ТЕМЫ, а не от типа тоста. Поля
 * accent/accentSoft/border остались от старой схемы, ничего не красили и
 * расходились с реальным видом — удалены, чтобы следующий, кто добавит тон,
 * не подбирал палитру, которая никуда не попадёт.
 */
type ToastTone = {
  icon: keyof typeof Ionicons.glyphMap;
  label: Record<string, string>;
};

const TOAST_TONES: Record<ToastType, ToastTone> = {
  // зачем (R1_DIFF_ONE_FIX, paywall-gap-011; образец paywall-gaps-states.html `.wtoast .tb`, `IC.checkC / alertC`): значок тона — контурное кольцо с галочкой/«!» на тёмной плитке,
  // а не белый заливной круг. Семейство контурных значков единое для всех тонов.
  success: { icon: 'checkmark-circle-outline', label: actionToastToneLabel('success') },
  error: { icon: 'alert-circle-outline', label: actionToastToneLabel('error') },
  info: { icon: 'information-circle-outline', label: actionToastToneLabel('info') },
  warning: { icon: 'warning-outline', label: actionToastToneLabel('warning') },
  reward: { icon: 'gift', label: actionToastToneLabel('reward') },
};

/** Local-only passive chrome: actions keep their legacy color and touch contract. */
function actionToastGlassChrome(glass: ReturnType<typeof liquidGlassTokens>) {
  return {
    // зачем (overlays.html `.ov-action-toast`, кадры 48–57): сплошная графитовая карточка (#242529) с тонкой
    // кромкой; планка тона — светлая (#d9dbe1), значок и подпись тона — цветом текста, сообщение — вторичным.
    // зачем (сверка 15.10, paywall-gap-011; правило «стекло непрозрачное, альфа ≥ 0,9»): верх карточки тоста — opaqueCard, а не полупрозрачный card: сквозь тост поверх пейвола читался текст под ним
    cardColors: [glass.opaqueCard, glass.opaqueControl, glass.opaqueControl] as [string, string, string],
    accent: glass.cta,
    accentSoft: glass.selected,
    border: glass.glassEdge,
    title: glass.text,
    body: glass.secondary,
    closeBg: glass.selected,
    shadowColor: glass.bg,
    radius: 20,
  };
}

/**
 * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
 * сцена T1/T2 «Тосты»). Вход из света — opacity+y на пружине LUM.settle, без
 * отскока. Ошибка — единственная дрожь TOAST.errorShakePx на жёсткой пружине
 * TOAST.errorSpring (закон Motion DNA: дрожь уместна только здесь). Награда —
 * bloom-подложка + микро-пульс иконки SUITE.pulse. Выход всегда короче входа
 * (TOAST.exitMs < TOAST.enterMs). Полный cancelAnimation на unmount.
 */
export function ActionToastHybridCard({
  type,
  toneLabel,
  message,
  icon,
  chrome,
  actionLabel,
  onActionPress,
}: {
  type: ToastType;
  toneLabel: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  chrome: ReturnType<typeof themedToastChrome>;
  /** Подпись кнопки действия; null — тост без действия (карточка остаётся сквозной для тапов). */
  actionLabel?: string | null;
  onActionPress?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const y = useSharedValue(-14);
  const x = useSharedValue(0);
  const bloom = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      x.value = 0;
      bloom.value = 0;
      iconScale.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: TOAST.enterMs, easing: Easing.out(Easing.cubic) });
    if (type === 'error' || type === 'warning') {
      y.value = withSpring(0, TOAST.errorSpring);
      x.value = withDelay(
        TOAST.enterMs - 40,
        withSequence(
          ...TOAST.errorShakePx.map((v) => withTiming(v, { duration: TOAST.errorShakeStepMs, easing: Easing.linear })),
        ),
      );
    } else {
      y.value = withSpring(0, LUM.settle);
    }
    if (type === 'reward') {
      bloom.value = withDelay(TOAST.enterMs * 0.4, withTiming(1, { duration: LUM.contentMs, easing: Easing.out(Easing.cubic) }));
      iconScale.value = withDelay(
        TOAST.enterMs + 40,
        withSequence(
          withSpring(1.14, SUITE.pulse),
          withSpring(1, SUITE.pulse),
        ),
      );
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
      cancelAnimation(x);
      cancelAnimation(bloom);
      cancelAnimation(iconScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, type]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloom.value * 0.5 }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  return (
    <Reanimated.View style={[styles.toastMotion, cardStyle]}>
      <LinearGradient
        colors={chrome.cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.toast,
          {
            borderRadius: chrome.radius,
            shadowColor: chrome.shadowColor,
          },
        ]}
      >
        {type === 'reward' && (
          <Reanimated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: chrome.accentSoft, borderRadius: chrome.radius },
              bloomStyle,
            ]}
          />
        )}
        {/* зачем (владелец 14.10, «минимум ненужных элементов»; Макеты MOCKUP_REQUIREMENTS §1): значок и одна строка — без рейла, плитки под значком и капс-заголовка тона; смысл тона читает диктор (accessibilityLabel) */}
        <Reanimated.View style={[styles.iconBare, iconStyle]}>
          <Ionicons name={icon} size={24} color={chrome.title} />
        </Reanimated.View>
        <View style={styles.copy} accessible accessibilityLabel={`${toneLabel}. ${message}`}>
          <Text style={[styles.message, { color: chrome.title }]}>
            {message}
          </Text>
        </View>
        {actionLabel && onActionPress ? (
          // зачем (находка Макетов 7976ddef6, 12.10): гибрид — карточка по умолчанию, а действие тоста рисовалось только у classic: «Повторить» у ошибки
          // сохранения и действие в тосте подписки были невидимы. Та же капсула `.ov-toast-action`, что у классической карточки (тон — токен «Тени», без рамки).
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={8}
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: chrome.closeBg,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
            testID="action-toast-action"
          >
            <Text style={[styles.actionLabel, { color: chrome.title }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </LinearGradient>
    </Reanimated.View>
  );
}

const AUTO_DISMISS_MS = 3200;
/** Тост с кнопкой действия («Повторить», «Вернуть») живёт дольше обычного — 3,2 с мало, чтобы прочитать сбой и нажать. */
const AUTO_DISMISS_WITH_ACTION_MS = 5500;
/** Запас поверх самой длинной анимации выхода, после которого тост снимается
 *  принудительно, даже если Animated-колбэк не пришёл. */
const HARD_DISMISS_GRACE_MS = 900;
/** Сколько ждём слот арбитра, прежде чем отпустить очередь тостов. */
const PENDING_SLOT_TIMEOUT_MS = 6000;
/** Не копить длинный хвост из разных тостов после спама. */
const MAX_QUEUE = 2;
/**
 * Один и тот же текст по RU после скрытия — игнор (отложенные колбэки / мульти-тап).
 * Украинский текст может отличаться полем messageUk; для пользователя это тот же тост.
 */
const SAME_TOAST_COOLDOWN_MS = 1600;

function toastKey(p: ToastPayload): string {
  const ru = p.messageRu.replace(/\s+/g, ' ').trim();
  return `${p.type}\u0001${ru}`;
}

function ActionToast() {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const toastInsets = useStableSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [overlayWanted, setOverlayWanted] = useState(false);
  const overlayVisible = useOverlayVisible('actionToast', overlayWanted);
  // зачем (координатор 12.10, «сперва логи»: dev_state?toast=… не показывает тост на Главной): кто держит слот арбитра окон — главная причина «тост не показан».
  const slotHolder = useOverlayActiveKey();
  useEffect(() => {
    if (__DEV__) console.log(`[DEV-STATE] toast: хост смонтирован lang=${lang}`); // guard-ok: единичный лог монтирования
    return () => { if (__DEV__) console.log('[DEV-STATE] toast: хост размонтирован'); }; // guard-ok: единичный лог размонтирования
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: только момент монтирования/размонтирования хоста
  }, []);
  useEffect(() => {
    if (__DEV__) console.log(`[DEV-STATE] toast: слот хоста wanted=${String(overlayWanted)} visible=${String(overlayVisible)} слотДержит=${slotHolder ?? 'никто'}`); // guard-ok: смена состояния слота
  }, [overlayWanted, overlayVisible, slotHolder]);
  const y = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ToastPayload[]>([]);
  const pendingStartRef = useRef<ToastPayload | null>(null);
  const busyRef = useRef(false);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Ключ текущего показа — глушим повторы того же текста, пока он на экране или уже в очереди. */
  const showingKeyRef = useRef<string | null>(null);
  /**
   * Действие текущего тоста. Живёт в ref, а не в state: обнуление после нажатия
   * не должно перерисовывать тост и дёргать его анимацию. Обнуляется и при
   * закрытии — иначе кнопка следующего тоста запустила бы действие прошлого.
   */
  const toastActionRef = useRef<(() => void) | null>(null);
  const lastDismissedKeyRef = useRef<string | null>(null);
  const lastDismissedAtRef = useRef(0);
  /** rAF id для отложенного старта анимации появления.
   *  Нужен под New Architecture (Fabric): если стартовать Animated.start() в той же
   *  синхронной паузе, где `setToast(payload)` ставит <Animated.View> на маунт,
   *  native сторона ещё не закоммитила view-тег и connectAnimatedNodeToView
   *  кидает JSApplicationIllegalArgumentException (RedBox в dev, non-fatal в prod). */
  const rafIn = useRef<number | null>(null);
  const rafOut = useRef<number | null>(null);
  /** зачем: жёсткий предохранитель от залипшего тоста. Скрытие раньше жило
   *  ТОЛЬКО в колбэке Animated.start(finishDismiss). Если хост в этот момент
   *  переставал рендериться (арбитр отобрал слот у actionToast — например под
   *  нативной модалкой награды), Animated-колбэк на размонтированной вьюхе не
   *  приходил, и плашка «Подарок применён» оставалась на экране навсегда.
   *  Этот таймер снимает тост независимо от анимации. */
  const hardDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runHaptics = (payload: ToastPayload) => {
    // зачем: предупреждение ощущается как ошибка (что-то требует внимания),
    // но не является ею — берём тот же «жёсткий» отклик, что и error, чтобы
    // тост про сгорающую цепочку не проходил мимо как обычная инфо-плашка.
    // зачем: предупреждение — не ошибка пользователя; тон хаптики мягче
    if (payload.type === 'error') hapticError();
    else if (payload.type === 'warning') hapticWarning();
    else if (payload.type === 'success' || payload.type === 'reward') hapticSuccess();
    else hapticSoftImpact();
  };

  const startCycle = useCallback((payload: ToastPayload) => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    if (timer.current) clearTimeout(timer.current);
    if (hardDismissTimer.current) clearTimeout(hardDismissTimer.current);
    if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
    if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
    showingKeyRef.current = toastKey(payload);
    // Действие принадлежит КОНКРЕТНОМУ тосту: перезаписываем на каждом показе,
    // чтобы кнопка нового тоста не выполнила действие предыдущего.
    toastActionRef.current = payload.action?.onPress ?? null;
    soundDirector.request(payload.soundEventId ?? TOAST_SOUND_EVENTS[payload.type], {
      scope: 'action-toast',
      dedupeKey: toastKey(payload),
      deferAfterVoice: true,
      queueIfBusy: true,
      rateLimit: { maxStarts: 4, windowMs: 1000 },
    });
    // зачем: строка сверху (layout 'top_line') анимируется хостом — въезд сверху и уход вверх (translateY × −1).
    const hybrid = payload.motionVariant !== 'classic' && payload.layout !== 'top_line';
    // Reset animated values before mounting the Animated.View. On Fabric, doing
    // setValue immediately after setToast can trip the React insertion-effect
    // update warning while native animated props are being attached.
    // Гибрид: вход/выход рисует ActionToastHybridCard на Reanimated — хост
    // остаётся статичным (opacity 1, без translateY), чтобы не задваивать анимацию.
    y.setValue(hybrid ? 0 : 120);
    opacity.setValue(hybrid ? 1 : 0);
    setToast(payload);
    if (!hybrid) {
      /** Откладываем старт на следующий кадр: даём Fabric закоммитить
       *  Animated.View, иначе connectAnimatedNodeToView падает. */
      rafIn.current = requestAnimationFrame(() => {
        rafIn.current = null;
        Animated.parallel([
          Animated.spring(y, {
            toValue: 0,
            useNativeDriver: true,
            tension: MOTION_SPRING.toast.tension,
            friction: MOTION_SPRING.toast.friction,
          }),
          Animated.timing(opacity, { toValue: 1, duration: MOTION_DURATION.normal, useNativeDriver: true }),
        ]).start();
      });
    }
    runHaptics(payload);
    timer.current = setTimeout(() => {
      let dismissed = false;
      const finishDismiss = () => {
        if (dismissed) return;
        dismissed = true;
        if (hardDismissTimer.current) clearTimeout(hardDismissTimer.current);
        hardDismissTimer.current = null;
        scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
          setToast(null);
          // Тост ушёл — действие вместе с ним. Иначе оно пережило бы свой тост.
          toastActionRef.current = null;
          const dismissedKey = showingKeyRef.current;
          const next = queueRef.current.shift();

          if (dismissedKey) {
            lastDismissedKeyRef.current = dismissedKey;
            lastDismissedAtRef.current = Date.now();
            queueRef.current = queueRef.current.filter((p) => toastKey(p) !== dismissedKey);
          }

          if (next) {
            showingKeyRef.current = toastKey(next);
            /** Следующий маунт тоже на новом кадре — иначе пара unmount→mount
             *  в одном кадре снова ловит Fabric race. */
            rafOut.current = requestAnimationFrame(() => {
              rafOut.current = null;
              startCycle(next);
            });
          } else {
            busyRef.current = false;
            showingKeyRef.current = null;
            setOverlayWanted(false);
          }
        });
      };
      // Предохранитель: если Animated-колбэк не придёт (хост размонтирован,
      // пока слот арбитра занят), тост всё равно снимется по этому таймеру.
      hardDismissTimer.current = setTimeout(finishDismiss, HARD_DISMISS_GRACE_MS);
      if (hybrid) {
        // Выход короче входа (закон №15): TOAST.exitMs вместо MOTION_DURATION.normal.
        Animated.timing(opacity, { toValue: 0, duration: TOAST.exitMs, useNativeDriver: true }).start(finishDismiss);
      } else {
        Animated.parallel([
          Animated.timing(y, { toValue: 120, duration: MOTION_DURATION.normal, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }),
        ]).start(finishDismiss);
      }
    }, payload.action && payload.layout !== 'top_line' ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);
  }, [opacity, y]);

  const enqueue = useCallback((payload: ToastPayload) => {
    const k = toastKey(payload);
    const cooledUntil = lastDismissedAtRef.current + SAME_TOAST_COOLDOWN_MS;
    if (__DEV__) console.log(`[DEV-STATE] toast: хост получил type=${payload.type} текст="${String(payload.messageRu ?? '').slice(0, 60)}" busy=${String(busyRef.current)} очередь=${queueRef.current.length}`); // guard-ok: вход приёма
    if (
      lastDismissedKeyRef.current !== null &&
      k === lastDismissedKeyRef.current &&
      Date.now() < cooledUntil
    ) {
      if (__DEV__) console.log(`[DEV-STATE] toast: отброшен — охлаждение после показа ещё ${cooledUntil - Date.now()}мс`); // guard-ok: ранний выход называет причину
      return;
    }
    if (showingKeyRef.current === k) {
      if (__DEV__) console.log('[DEV-STATE] toast: отброшен — такой тост уже на экране'); // guard-ok: ранний выход называет причину
      return;
    }
    if (queueRef.current.some((p) => toastKey(p) === k)) {
      if (__DEV__) console.log('[DEV-STATE] toast: отброшен — такой тост уже в очереди'); // guard-ok: ранний выход называет причину
      return;
    }

    if (!busyRef.current) {
      busyRef.current = true;
      showingKeyRef.current = k;
      pendingStartRef.current = payload;
      setOverlayWanted(true);
      if (__DEV__) console.log('[DEV-STATE] toast: принят к показу, запрошен слот окон'); // guard-ok: ветвление приёма
      return;
    }
    if (queueRef.current.length >= MAX_QUEUE) queueRef.current.shift();
    queueRef.current.push(payload);
    if (__DEV__) console.log(`[DEV-STATE] toast: хост занят, тост поставлен в очередь (длина ${queueRef.current.length})`); // guard-ok: ветвление приёма
  }, []);

  useEffect(() => {
    if (!overlayVisible || toast || !pendingStartRef.current) return;
    const next = pendingStartRef.current;
    pendingStartRef.current = null;
    startCycle(next);
  }, [overlayVisible, startCycle, toast]);

  // зачем: busyRef выставляется в enqueue ДО получения слота арбитра, а таймер
  // авто-скрытия ставится только внутри startCycle. Если слот не дали (сверху
  // висит нативная модалка), очередь оставалась «занятой» навсегда: ни этот
  // тост, ни следующие больше не показывались. Ждём слот ограниченное время и
  // освобождаем очередь, чтобы хост не залипал.
  useEffect(() => {
    if (overlayVisible || !pendingStartRef.current) return undefined;
    const giveUp = setTimeout(() => {
      if (!pendingStartRef.current) return;
      console.warn(`[DEV-STATE] toast: слот окон не дали за ${PENDING_SLOT_TIMEOUT_MS}мс, тост сброшен — слот держит ${slotHolder ?? 'никто'}`); // guard-ok: причина потери тоста
      pendingStartRef.current = null;
      busyRef.current = false;
      showingKeyRef.current = null;
      setOverlayWanted(false);
    }, PENDING_SLOT_TIMEOUT_MS);
    return () => clearTimeout(giveUp);
  }, [overlayVisible, slotHolder]);

  // зачем (§137): «День засчитан 🔥 N» в момент первого учебного действия дня — сигнал Ядра streak_day_counted
  // (локально, без сети); текст и фильтр (только activity:*) — в app/streak_day_toast.ts.
  useEffect(() => {
    const sub = onAppEvent('streak_day_counted', (event) => {
      const payload = streakDayToastPayload(event);
      if (__DEV__) console.log('[STREAK-DAY] toast', JSON.stringify({ source: event.source, days: event.days, shown: payload !== null }));
      if (payload) enqueue(payload);
    });
    return () => sub.remove();
  }, [enqueue]);

  useEffect(() => {
    const sub = onAppEvent('action_toast', (payload) => enqueue(payload));
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
      if (hardDismissTimer.current) clearTimeout(hardDismissTimer.current);
      if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
      if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
      cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    };
  }, [enqueue]);

  // зачем: хук обязан вызываться ДО раннего возврата — иначе при появлении
  // тоста порядок хуков меняется и React падает.
  // Защита от двойного тапа: повторное нажатие по уже сработавшей кнопке
  // игнорируется, иначе один тост мог бы запустить действие дважды.
  const handleActionPress = useCallback(() => {
    const pending = toastActionRef.current;
    if (!pending) {
      // guard-ok: ранний выход объясняет причину навсегда — иначе «кнопка в
      // тосте не работает» выглядит как мистика.
      console.warn('[ACTION-TOAST] action:ignored_no_pending');
      return;
    }
    toastActionRef.current = null;
    hapticSoftImpact();
    try {
      pending();
    } catch (err: unknown) {
      // guard-ok: немой catch запрещён — действие тоста часто денежное.
      console.warn('[ACTION-TOAST] action:threw', err instanceof Error ? err.message : String(err));
    }
  }, []);

  if (!toast || !overlayVisible) return null;

  const message = resolveActionToastMessage(toast, lang);
  const tone = TOAST_TONES[toast.type];
  const toneLabel = tone.label[lang] ?? tone.label.ru;
  const actionToastGlass = liquidGlassTokens(liquidGlassThemeId);
  const chrome = actionToastGlassChrome(actionToastGlass);
  const isHybrid = toast.motionVariant !== 'classic';
  // зачем (12.10, находка Макетов 7976ddef6): раньше действие было ТОЛЬКО у classic, а гибрид (вариант по умолчанию) его молча отбрасывал — человек видел
  // ошибку без «Повторить». Теперь действие рисуют обе карточки; без кнопки остаётся только сквозная строка `top_line` (по макету overlays-runtime).
  const toastAction = toast.layout === 'top_line' ? undefined : toast.action;
  const actionLabel = toastAction ? resolveActionToastActionLabel(toastAction, lang) : null;

  if (toast.layout === 'top_line') {
    // `.or-toast` (overlays-runtime): 14 от краёв, сразу под статус-баром, высота 58, поля 12/14, радиус 19,
    // плитка 41 со значком, одна строка 13/18; сквозной для тапов, действия нет. Смысл тона — в подписи для диктора.
    const lineIconName = (toast.lineIcon && toast.lineIcon in Ionicons.glyphMap ? toast.lineIcon : tone.icon) as keyof typeof Ionicons.glyphMap;
    return (
      <View style={[styles.lineAnchor, { top: Math.max(54, toastInsets.top + 8) }]} pointerEvents="none">
        <Animated.View
          testID="action-toast-top-line"
          style={[styles.line, { backgroundColor: actionToastGlass.opaqueControl, shadowColor: chrome.shadowColor, opacity, transform: [{ translateY: Animated.multiply(y, -1) }] }]}
          accessible
          accessibilityLabel={`${toneLabel}. ${message}`}
        >
          <View style={[styles.lineTile, { backgroundColor: actionToastGlass.opaqueCard }]}>
            <Ionicons name={lineIconName} size={20} color={chrome.title} />
          </View>
          <Text style={[styles.lineCopy, { color: chrome.title }]}>{message}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    // зачем: аудит 2026-08-17 (скрин владельца, iPhone) — тост показывался
    // обрезанным слева, хотя host уже имел left:0/right:0. Внешняя обёртка
    // задаёт геометрию БЕЗ transform (top/left/right/bottom одним куском,
    // ничем не тронутые), а translateY уезжает во внутренний слой — так
    // left/right гарантированно резолвятся от полной ширины экрана, а не
    // пересчитываются вместе со сдвигом анимации на некоторых версиях Fabric.
    <View
      style={[styles.hostAnchor, { bottom: bottomOffset }]}
      // зачем: тост исторически сквозной для тапов, чтобы не перехватывать
      // касания по экрану под собой. Перехват включается ТОЛЬКО когда у тоста
      // есть кнопка: box-none пропускает тапы мимо карточки, но даёт нажать
      // саму кнопку. Тосты без действия ведут себя ровно как раньше.
      pointerEvents={actionLabel ? 'box-none' : 'none'}
    >
    <Animated.View
      style={[
        styles.host,
        {
          transform: [{ translateY: y }],
          opacity,
        },
      ]}
      // Тот же принцип, что у внешней обёртки: перехват только ради кнопки.
      pointerEvents={actionLabel ? 'box-none' : 'none'}
    >
      {isHybrid ? (
        <ActionToastHybridCard
          type={toast.type}
          toneLabel={toneLabel}
          message={message}
          icon={tone.icon}
          chrome={chrome}
          actionLabel={actionLabel}
          onActionPress={handleActionPress}
        />
      ) : (
        <LinearGradient
          colors={chrome.cardColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.toast,
            {
              borderRadius: chrome.radius,
              shadowColor: chrome.shadowColor,
            },
          ]}
        >
          <View style={styles.iconBare}>
            <Ionicons name={tone.icon} size={24} color={chrome.title} />
          </View>
          <View style={styles.copy} accessible accessibilityLabel={`${toneLabel}. ${message}`}>
            <Text style={[styles.message, { color: chrome.title }]}>
              {message}
            </Text>
          </View>
          {actionLabel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              hitSlop={8}
              onPress={handleActionPress}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: chrome.closeBg,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
              testID="action-toast-action"
            >
              <Text style={[styles.actionLabel, { color: chrome.title }]}>{actionLabel}</Text>
            </Pressable>
          ) : null}
        </LinearGradient>
      )}
    </Animated.View>
    </View>
  );
}

export default memo(ActionToast);

const styles = StyleSheet.create({
  lineAnchor: { position: 'absolute', left: 14, right: 14, zIndex: 9997, alignItems: 'center' },
  line: {
    width: '100%',
    maxWidth: 560,
    minHeight: 58,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 19, // зачем (владелец 12.10, стиль «Тень»): тост без обводки — отделяют тон и тень (строка-тост `.or-toast`)
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    shadowOpacity: 0.48,
    shadowRadius: 19,
    shadowOffset: { width: 0, height: 18 },
    ...noAndroidOutline,
  },
  lineTile: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  // `.or-toast-copy` 13/18/680
  lineCopy: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  // зачем: геометрия (top/left/right) отделена от transform — см. комментарий
  // у места использования выше.
  hostAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9997,
    justifyContent: 'flex-end',
  },
  host: {
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toastMotion: {
    width: '100%',
    maxWidth: 560,
  },
  toast: {
    width: '100%',
    maxWidth: 560,
    // `.ov-action-toast`: высота 76, поля 12/14, зазор 12.
    minHeight: 76,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    // зачем: фон тоста задаёт themedToastChrome (там все shadowColor — rgba
    // с alpha < 1), поэтому Android не выводил скруглённый outline и рисовал
    // квадрат вокруг радиуса 16.
    ...noAndroidOutline,
  },
  // зачем (владелец 14.10): значок без плитки и без рейла; рамка 44 только держит размер зоны под значок
  iconBare: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  // `.message` 14/18 вторичным — шкала D145: 16/22.
  message: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  // Кнопка действия: зона тапа 44×… по вертикали набирается padding 12 + текст,
  // плюс hitSlop 8 — комфортно для пальца, но карточку не раздувает.
  // `.ov-toast-action`: капсула 36, радиус 18, поля 12.
  actionButton: {
    flexShrink: 0,
    marginLeft: 10,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
