import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import { onAppEvent } from '../app/events';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticError, hapticSoftImpact, hapticSuccess } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';
import { useOverlayVisible } from './OverlayArbiter';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from './animationScheduling';
import { themedToastChrome } from '../constants/themedToastChrome';

type ToastPayload = {
  type: ToastType;
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

type ToastType = 'success' | 'error' | 'info' | 'reward';

type ToastTone = {
  icon: keyof typeof Ionicons.glyphMap;
  label: Record<string, string>;
  accent: string;
  accentSoft: string;
  border: string;
};

const TOAST_TONES: Record<ToastType, ToastTone> = {
  success: {
    icon: 'checkmark-circle',
    label: {
      ru: 'Готово',
      uk: 'Готово',
      es: 'Listo',
      'pt-BR': 'Pronto',
      vi: 'Xong',
      id: 'Selesai',
      tr: 'Tamam',
      pl: 'Gotowe',
    },
    accent: '#65E49A',
    accentSoft: 'rgba(101,228,154,0.14)',
    border: 'rgba(101,228,154,0.34)',
  },
  error: {
    icon: 'alert-circle',
    label: {
      ru: 'Что-то пошло не так',
      uk: 'Щось пішло не так',
      es: 'Algo salió mal',
      'pt-BR': 'Algo deu errado',
      vi: 'Có lỗi xảy ra',
      id: 'Ada yang salah',
      tr: 'Bir şeyler ters gitti',
      pl: 'Błąd',
    },
    accent: '#FF6E78',
    accentSoft: 'rgba(255,110,120,0.14)',
    border: 'rgba(255,110,120,0.36)',
  },
  info: {
    icon: 'information-circle',
    label: {
      ru: 'Инфо',
      uk: 'Інфо',
      es: 'Info',
      'pt-BR': 'Info',
      vi: 'Tin',
      id: 'Info',
      tr: 'Bilgi',
      pl: 'Info',
    },
    accent: '#74A7FF',
    accentSoft: 'rgba(116,167,255,0.14)',
    border: 'rgba(116,167,255,0.34)',
  },
  reward: {
    icon: 'gift',
    label: {
      ru: 'Награда',
      uk: 'Нагорода',
      es: 'Premio',
      'pt-BR': 'Prêmio',
      vi: 'Phần thưởng',
      id: 'Hadiah',
      tr: 'Ödül',
      pl: 'Nagroda',
    },
    accent: '#F2C56A',
    accentSoft: 'rgba(242,197,106,0.14)',
    border: 'rgba(242,197,106,0.36)',
  },
};

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
    if (payload.type === 'error') hapticError();
    else if (payload.type === 'success' || payload.type === 'reward') hapticSuccess();
    else hapticSoftImpact();
  };

  const startCycle = useCallback((payload: ToastPayload) => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    if (timer.current) clearTimeout(timer.current);
    if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
    if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
    showingKeyRef.current = toastKey(payload);
    // Reset animated values before mounting the Animated.View. On Fabric, doing
    // setValue immediately after setToast can trip the React insertion-effect
    // update warning while native animated props are being attached.
    y.setValue(120);
    opacity.setValue(0);
    setToast(payload);
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
    runHaptics(payload);
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: 120, duration: MOTION_DURATION.normal, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: MOTION_DURATION.fast, useNativeDriver: true }),
      ]).start(() => {
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
      });
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
    borderWidth: 0,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    elevation: 8,
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
