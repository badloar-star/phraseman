import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { onAppEvent } from '../app/events';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticError, hapticSoftImpact, hapticSuccess } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';
import { useGlobalBottomOverlayOffset } from '../hooks/use-global-bottom-overlay-offset';

type ToastPayload = {
  type: 'success' | 'error' | 'info';
  messageRu: string;
  messageUk?: string;
  /** ES (UI en español). Si falta y `lang === "es"`, se usa un texto breve según `type`. */
  messageEs?: string;
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

export default function ActionToast() {
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const bottomOffset = useGlobalBottomOverlayOffset();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const y = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ToastPayload[]>([]);
  const busyRef = useRef(false);
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
    else if (payload.type === 'success') hapticSuccess();
    else hapticSoftImpact();
  };

  const startCycle = useCallback((payload: ToastPayload) => {
    if (timer.current) clearTimeout(timer.current);
    if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
    if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
    showingKeyRef.current = toastKey(payload);
    setToast(payload);
    y.setValue(120);
    opacity.setValue(0);
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
        setToast(null);
        const dismissedKey = showingKeyRef.current;
        const next = queueRef.current.shift();

        if (dismissedKey) {
          lastDismissedKeyRef.current = dismissedKey;
          lastDismissedAtRef.current = Date.now();
          queueRef.current = queueRef.current.filter((p) => toastKey(p) !== dismissedKey);
        }

        if (next) {
          /** Следующий маунт тоже на новом кадре — иначе пара unmount→mount
           *  в одном кадре снова ловит Fabric race. */
          rafOut.current = requestAnimationFrame(() => {
            rafOut.current = null;
            startCycle(next);
          });
        } else {
          busyRef.current = false;
          showingKeyRef.current = null;
        }
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
      startCycle(payload);
      return;
    }
    if (queueRef.current.length >= MAX_QUEUE) queueRef.current.shift();
    queueRef.current.push(payload);
  }, [startCycle]);

  useEffect(() => {
    const sub = onAppEvent('action_toast', (payload) => enqueue(payload));
    return () => {
      sub.remove();
      if (timer.current) clearTimeout(timer.current);
      if (rafIn.current != null) cancelAnimationFrame(rafIn.current);
      if (rafOut.current != null) cancelAnimationFrame(rafOut.current);
    };
  }, [enqueue]);

  if (!toast) return null;

  const border = toast.type === 'error' ? t.wrong : toast.type === 'success' ? t.correct : t.border;
  const icon = toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️';
  const messageColor = toast.type === 'error' ? t.wrong : toast.type === 'success' ? t.correct : t.textPrimary;
  const esFallback =
    toast.type === 'error'
      ? 'Algo salió mal.'
      : toast.type === 'success'
        ? 'Hecho.'
        : 'Listo.';
  const message =
    lang === 'uk'
      ? (toast.messageUk ?? toast.messageRu)
      : lang === 'es'
        ? (toast.messageEs ?? esFallback)
        : toast.messageRu;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        zIndex: 9997,
        transform: [{ translateY: y }],
        opacity,
      }}
      pointerEvents="none"
    >
      <View
        style={{
          backgroundColor: t.bgCard,
          borderColor: border,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={{ color: messageColor, fontSize: 15, fontWeight: '700', flex: 1 }}>{message}</Text>
      </View>
    </Animated.View>
  );
}
