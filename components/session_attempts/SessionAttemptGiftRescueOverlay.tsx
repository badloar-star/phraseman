/**
 * Сцена «Второй шанс» — подарок вернул попытки после третьей ошибки.
 *
 * зачем: работа владельца от 2026-08-30/31 была спрятана при подготовке
 * релиза 1.6.15 и не вернулась в дерево. В слепке (c0390bf2b) уцелели HUD,
 * который этот оверлей вызывает, тексты (`session_attempts_copy`) и тайминги
 * (`SECOND_CHANCE_RESCUE_MOTION`), а сам файл в слепок не попал и в истории
 * репозитория его нет — восстановлен по контракту вызова из HUD:
 * `sequence` — счётчик спасений (смена значения = новая сцена),
 * `errorCode` — причина отказа (null = успех), `onRetry` — повтор.
 *
 * Правила владельца, соблюдённые здесь:
 * — никаких обводок контейнеров: разделяем тоном и тенью;
 * — нет подписи-расшифровки мелким шрифтом под заголовком;
 * — сцена конечная (lifetimeMs) и уходит сама, не висит поверх урока;
 * — reduceMotion уважается: короткий показ без разгона.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SECOND_CHANCE_RESCUE_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';

type Props = {
  /** Счётчик спасений: смена значения запускает новую сцену. */
  sequence: number;
  locale: string;
  /** Код отказа сервера; null — подарок применён успешно. */
  errorCode: string | null;
  onRetry: () => void;
};

const M = SECOND_CHANCE_RESCUE_MOTION;

function SessionAttemptGiftRescueOverlay({ sequence, locale, errorCode, onRetry }: Props) {
  const t = useTheme().theme;
  const reduceMotion = useReduceMotion();
  const copy = getSessionAttemptsCopy(locale);

  const [visible, setVisible] = useState(false);
  const scrim = useRef(new Animated.Value(0)).current;
  const shieldScale = useRef(new Animated.Value(M.shieldStartScale)).current;
  const copyShift = useRef(new Animated.Value(M.copyStartY)).current;
  const copyFade = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    // Первый рендер не считается спасением: HUD монтируется вместе с экраном,
    // а сцена обязана появляться только на реальное событие.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    clearHideTimer();
    setVisible(true);
    scrim.setValue(0);
    shieldScale.setValue(reduceMotion ? 1 : M.shieldStartScale);
    copyShift.setValue(reduceMotion ? 0 : M.copyStartY);
    copyFade.setValue(0);

    const enter = Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: M.scrimInMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(shieldScale, {
        toValue: 1,
        delay: reduceMotion ? 0 : M.shieldDelayMs,
        duration: M.shieldInMs,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(copyFade, {
          toValue: 1,
          delay: reduceMotion ? 0 : M.copyDelayMs,
          duration: M.copyInMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(copyShift, {
          toValue: 0,
          delay: reduceMotion ? 0 : M.copyDelayMs,
          duration: M.copyInMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    enter.start();

    return () => {
      enter.stop();
    };
  }, [sequence, reduceMotion, clearHideTimer, scrim, shieldScale, copyFade, copyShift]);

  // Уход по таймеру — только при успехе. Отказ ждёт решения человека.
  useEffect(() => {
    if (!visible) return;
    if (errorCode) {
      clearHideTimer();
      return;
    }
    const lifetime = reduceMotion ? M.reducedMotionLifetimeMs : M.lifetimeMs;
    clearHideTimer();
    hideTimer.current = setTimeout(() => {
      Animated.timing(scrim, {
        toValue: 0,
        duration: M.scrimOutMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, lifetime);
    return clearHideTimer;
  }, [visible, errorCode, reduceMotion, scrim, clearHideTimer]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const handleRetry = useCallback(() => {
    clearHideTimer();
    onRetry();
  }, [clearHideTimer, onRetry]);

  if (!visible) return null;

  const failed = Boolean(errorCode);

  return (
    <Animated.View
      pointerEvents={failed ? 'auto' : 'none'}
      style={[styles.root, { opacity: scrim }]}
      testID="session-attempt-gift-rescue"
    >
      <Animated.View
        style={[
          styles.card,
          // Тон + тень вместо обводки — запрет владельца на рамки контейнеров.
          { backgroundColor: t.bgCard, shadowColor: t.cardShadow },
          { transform: [{ scale: shieldScale }] },
        ]}
      >
        <Ionicons
          name={failed ? 'alert-circle' : 'shield-checkmark'}
          size={30}
          color={failed ? t.wrong : t.correct}
        />
        <Animated.View style={{ opacity: copyFade, transform: [{ translateY: copyShift }] }}>
          <Text style={[styles.title, { color: t.textOnCard }]} numberOfLines={2}>
            {failed ? copy.giftRecoveryFailed : copy.giftAppliedTitle}
          </Text>
          {!failed ? (
            <Text style={[styles.note, { color: t.textMuted }]} numberOfLines={1}>
              {copy.giftAppliedRunesSaved}
            </Text>
          ) : null}
        </Animated.View>
        {failed ? (
          <Pressable
            onPress={handleRetry}
            accessibilityRole="button"
            accessibilityLabel={copy.retryGiftRecovery}
            hitSlop={10}
            style={({ pressed }) => [
              styles.retry,
              { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="session-attempt-gift-rescue-retry"
          >
            <Text style={[styles.retryText, { color: t.textOnCard }]}>
              {copy.retryGiftRecovery}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    borderRadius: 20,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  retry: {
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default memo(SessionAttemptGiftRescueOverlay);
