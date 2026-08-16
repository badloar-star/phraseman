import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
import { onAppEvent } from '../app/events';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticError, hapticWarning, hapticSoftImpact, hapticSuccess } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { LUM, SUITE, TOAST } from '../constants/motionHybrid';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { useOverlayVisible } from './OverlayArbiter';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from './animationScheduling';
import { themedToastChrome } from '../constants/themedToastChrome';
import { noAndroidOutline } from '../constants/androidGlow';
import { soundDirector } from '../modules/audio/sound_director';
import type { SoundEventId } from '../modules/audio/sound_events';
import { actionToastToneLabel } from './action_toast_copy';

type ToastPayload = {
  type: ToastType;
  soundEventId?: SoundEventId;
  /** dev-only: витрина движения запускает гибрид рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
  messageRu: string;
  messageUk?: string;
  /** ES (UI en español). Si falta y `lang === "es"`, se usa un texto breve según `type`. */
  messageEs?: string;
  messagePtBr?: string;
  messageVi?: string;
  messageId?: string;
  messageTr?: string;
  messagePl?: string;
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
  success: { icon: 'checkmark-circle', label: actionToastToneLabel('success') },
  error: { icon: 'alert-circle', label: actionToastToneLabel('error') },
  info: { icon: 'information-circle', label: actionToastToneLabel('info') },
  warning: { icon: 'warning', label: actionToastToneLabel('warning') },
  reward: { icon: 'gift', label: actionToastToneLabel('reward') },
};

/**
 * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
 * сцена T1/T2 «Тосты»). Вход из света — opacity+y на пружине LUM.settle, без
 * отскока. Ошибка — единственная дрожь TOAST.errorShakePx на жёсткой пружине
 * TOAST.errorSpring (закон Motion DNA: дрожь уместна только здесь). Награда —
 * bloom-подложка + микро-пульс иконки SUITE.pulse. Выход всегда короче входа
 * (LUM.exitMs < LUM.resolveMs). Полный cancelAnimation на unmount.
 */
function ActionToastHybridCard({
  type,
  toneLabel,
  message,
  icon,
  chrome,
}: {
  type: ToastType;
  toneLabel: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  chrome: ReturnType<typeof themedToastChrome>;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(-14);
  const x = useSharedValue(0);
  const bloom = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) });
    if (type === 'error' || type === 'warning') {
      y.value = withSpring(0, TOAST.errorSpring);
      x.value = withDelay(
        LUM.resolveMs - 40,
        withSequence(
          ...TOAST.errorShakePx.map((v) => withTiming(v, { duration: TOAST.errorShakeStepMs, easing: Easing.linear })),
        ),
      );
    } else {
      y.value = withSpring(0, LUM.settle);
    }
    if (type === 'reward') {
      bloom.value = withDelay(LUM.resolveMs * 0.4, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }));
      iconScale.value = withDelay(
        LUM.resolveMs + 40,
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
  }, [type]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));
  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloom.value * 0.5 }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));

  return (
    <Reanimated.View style={cardStyle}>
      <LinearGradient
        colors={chrome.cardColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.toast,
          {
            borderColor: chrome.border,
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
        <View style={[styles.accentRail, { backgroundColor: chrome.accent }]} />
        <Reanimated.View
          style={[
            styles.iconBadge,
            { backgroundColor: chrome.accentSoft, borderColor: chrome.border },
            iconStyle,
          ]}
        >
          <Ionicons name={icon} size={21} color={chrome.accent} />
        </Reanimated.View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: chrome.accent }]} numberOfLines={1}>
            {toneLabel}
          </Text>
          <Text style={[styles.message, { color: chrome.title }]} numberOfLines={3}>
            {message}
          </Text>
        </View>
      </LinearGradient>
    </Reanimated.View>
  );
}

const AUTO_DISMISS_MS = 3200;
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
  const { theme: t, themeMode } = useTheme();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [overlayWanted, setOverlayWanted] = useState(false);
  const overlayVisible = useOverlayVisible('actionToast', overlayWanted);
  const y = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ToastPayload[]>([]);
  const pendingStartRef = useRef<ToastPayload | null>(null);
  const busyRef = useRef(false);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Ключ текущего показа — глушим повторы того же текста, пока он на экране или уже в очереди. */
  const showingKeyRef = useRef<string | null>(null);
  const lastDismissedKeyRef = useRef<string | null>(null);
  const lastDismissedAtRef = useRef(0);
  /** rAF id для отложенного старта анимации появления.
   *  Нужен под New Architecture (Fabric): если стартовать Animated.start() в той же
   *  синхронной паузе, где `setToast(payload)` ставит <Animated.View> на маунт,
   *  native сторона ещё не закоммитила view-тег и connectAnimatedNodeToView
   *  кидает JSApplicationIllegalArgumentException (RedBox в dev, non-fatal в prod). */
  const rafIn = useRef<number | null>(null);
  const rafOut = useRef<number | null>(null);

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
    if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
    if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
    showingKeyRef.current = toastKey(payload);
    soundDirector.request(payload.soundEventId ?? TOAST_SOUND_EVENTS[payload.type], {
      scope: 'action-toast',
      dedupeKey: toastKey(payload),
      deferAfterVoice: true,
      queueIfBusy: true,
      rateLimit: { maxStarts: 4, windowMs: 1000 },
    });
    const hybrid = payload.motionVariant === 'hybrid';
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
      const finishDismiss = () => {
        scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
          setToast(null);
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
      if (hybrid) {
        // Выход короче входа (закон №15): TOAST.exitMs вместо MOTION_DURATION.normal.
        Animated.timing(opacity, { toValue: 0, duration: TOAST.exitMs, useNativeDriver: true }).start(finishDismiss);
      } else {
        Animated.parallel([
          Animated.timing(y, { toValue: 120, duration: MOTION_DURATION.normal, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }),
        ]).start(finishDismiss);
      }
    }, AUTO_DISMISS_MS);
  }, [opacity, y]);

  const enqueue = useCallback((payload: ToastPayload) => {
    const k = toastKey(payload);
    const cooledUntil = lastDismissedAtRef.current + SAME_TOAST_COOLDOWN_MS;
    if (
      lastDismissedKeyRef.current !== null &&
      k === lastDismissedKeyRef.current &&
      Date.now() < cooledUntil
    ) {
      return;
    }
    if (showingKeyRef.current === k) return;
    if (queueRef.current.some((p) => toastKey(p) === k)) return;

    if (!busyRef.current) {
      busyRef.current = true;
      showingKeyRef.current = k;
      pendingStartRef.current = payload;
      setOverlayWanted(true);
      return;
    }
    if (queueRef.current.length >= MAX_QUEUE) queueRef.current.shift();
    queueRef.current.push(payload);
  }, []);

  useEffect(() => {
    if (!overlayVisible || toast || !pendingStartRef.current) return;
    const next = pendingStartRef.current;
    pendingStartRef.current = null;
    startCycle(next);
  }, [overlayVisible, startCycle, toast]);

  useEffect(() => {
    const sub = onAppEvent('action_toast', (payload) => enqueue(payload));
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
      if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
      if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
      cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    };
  }, [enqueue]);

  if (!toast || !overlayVisible) return null;

  const esFallback =
    toast.type === 'error'
      ? 'Algo salió mal.'
      : toast.type === 'success'
        ? 'Hecho.'
        : toast.type === 'reward'
          ? '¡Premio!'
          : toast.type === 'warning'
            ? 'Atención.'
            : 'Listo.';
  const message =
    lang === 'uk' ? (toast.messageUk ?? toast.messageRu)
      : lang === 'es' ? (toast.messageEs ?? esFallback)
        : lang === 'pt-BR' ? (toast.messagePtBr ?? toast.messageRu)
          : lang === 'vi' ? (toast.messageVi ?? toast.messageRu)
            : lang === 'id' ? (toast.messageId ?? toast.messageRu)
              : lang === 'tr' ? (toast.messageTr ?? toast.messageRu)
                : lang === 'pl' ? (toast.messagePl ?? toast.messageRu)
                  : toast.messageRu;
  const tone = TOAST_TONES[toast.type];
  const toneLabel = tone.label[lang] ?? tone.label.ru;
  const chrome = themedToastChrome(themeMode, t);
  const isHybrid = toast.motionVariant === 'hybrid';

  return (
    <Animated.View
      style={[
        styles.host,
        {
          bottom: bottomOffset,
          transform: [{ translateY: y }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      {isHybrid ? (
        <ActionToastHybridCard
          type={toast.type}
          toneLabel={toneLabel}
          message={message}
          icon={tone.icon}
          chrome={chrome}
        />
      ) : (
        <LinearGradient
          colors={chrome.cardColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.toast,
            {
              borderColor: chrome.border,
              borderRadius: chrome.radius,
              shadowColor: chrome.shadowColor,
            },
          ]}
        >
          <View style={[styles.accentRail, { backgroundColor: chrome.accent }]} />
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: chrome.accentSoft,
                borderColor: chrome.border,
              },
            ]}
          >
            <Ionicons name={tone.icon} size={21} color={chrome.accent} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: chrome.accent }]} numberOfLines={1}>
              {toneLabel}
            </Text>
            <Text style={[styles.message, { color: chrome.title }]} numberOfLines={3}>
              {message}
            </Text>
          </View>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

export default memo(ActionToast);

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9997,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 560,
    minHeight: 66,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    // зачем: фон тоста задаёт themedToastChrome (там все shadowColor — rgba
    // с alpha < 1), поэтому Android не выводил скруглённый outline и рисовал
    // квадрат вокруг радиуса 16.
    ...noAndroidOutline,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 11,
    bottom: 11,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
