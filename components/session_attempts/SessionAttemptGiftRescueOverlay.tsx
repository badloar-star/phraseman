/**
 * Сцена «Второй шанс» — подарок вернул попытки после третьей ошибки.
 *
 * зачем: работа владельца от 2026-08-30/31 была спрятана при подготовке
 * релиза 1.6.15 и не вернулась в дерево. В слепке (c0390bf2b) уцелели HUD,
 * который этот оверлей вызывает, тексты (`session_attempts_copy`) и тайминги
 * (`SECOND_CHANCE_RESCUE_MOTION`), а сам файл в слепок не попал и в истории
 * репозитория его нет — восстановлен по контракту вызова из HUD:
 * `sequence` — счётчик спасений (смена значения = новая сцена),
 * `errorCode` — причина отказа (null = успех), `onRetry` — необязательный повтор.
 *
 * Правила владельца, соблюдённые здесь:
 * — никаких обводок контейнеров: разделяем тоном и тенью;
 * — нет подписи-расшифровки мелким шрифтом под заголовком;
 * — сцена конечная (lifetimeMs) и уходит сама, не висит поверх урока;
 * — reduceMotion уважается: короткий показ без разгона.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SECOND_CHANCE_RESCUE_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import LevelSpinRewardArt from '../LevelSpinRewardArt';

type Props = {
  /** Счётчик спасений: смена значения запускает новую сцену. */
  sequence: number;
  locale: string;
  /** Код отказа сервера; null — подарок применён успешно. */
  errorCode: string | null;
  onRetry?: () => void;
  /** Координаты HUD в окне: родитель строки не должен ограничивать сцену. */
  anchorFrame: { x: number; y: number; width: number; height: number };
};

const M = SECOND_CHANCE_RESCUE_MOTION;

function SessionAttemptGiftRescueOverlay({ sequence, locale, errorCode, onRetry, anchorFrame }: Props) {
  const t = useTheme().theme;
  const reduceMotion = useReduceMotion();
  const copy = getSessionAttemptsCopy(locale);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [visible, setVisible] = useState(false);
  const scrim = useRef(new Animated.Value(0)).current;
  const giftScale = useRef(new Animated.Value(M.shieldStartScale)).current;
  const giftTranslateX = useRef(new Animated.Value(0)).current;
  const giftTranslateY = useRef(new Animated.Value(0)).current;
  const giftOpacity = useRef(new Animated.Value(1)).current;
  const copyShift = useRef(new Animated.Value(M.copyStartY)).current;
  const copyFade = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSequenceRef = useRef(sequence);
  const failed = Boolean(errorCode);
  // Layout measurements are presentation data, never a new rescue event.
  // Snapshot them when sequence advances so remeasurement cannot replay or
  // cancel an in-flight scene (including the initial zero-sized HUD layout).
  const presentationRef = useRef({ anchorFrame, windowWidth, windowHeight, reduceMotion, failed });
  presentationRef.current = { anchorFrame, windowWidth, windowHeight, reduceMotion, failed };

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const previousSequence = lastSequenceRef.current;
    lastSequenceRef.current = sequence;
    if (!Number.isSafeInteger(sequence) || sequence <= Math.max(0, previousSequence)) return;
    const { anchorFrame, windowWidth, windowHeight, reduceMotion, failed } = presentationRef.current;

    clearHideTimer();
    setVisible(true);
    scrim.setValue(0);
    giftScale.setValue(reduceMotion ? 1 : M.shieldStartScale);
    giftTranslateX.setValue(0);
    giftTranslateY.setValue(0);
    giftOpacity.setValue(1);
    copyShift.setValue(reduceMotion ? 0 : M.copyStartY);
    copyFade.setValue(0);

    const targetX = anchorFrame.x + anchorFrame.width / 2 - windowWidth / 2;
    const targetY = anchorFrame.y + anchorFrame.height / 2 - windowHeight / 2;
    const giftMotion = failed || reduceMotion
      ? Animated.timing(giftScale, {
        toValue: 1,
        duration: M.shieldInMs,
        useNativeDriver: true,
      })
      : Animated.sequence([
        Animated.timing(giftScale, {
          toValue: 1,
          delay: M.shieldDelayMs,
          duration: M.shieldInMs,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.delay(M.heartFlightDelayMs),
        Animated.parallel([
          Animated.timing(giftTranslateX, {
            toValue: targetX,
            duration: M.heartFlightMs,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(giftTranslateY, {
            toValue: targetY,
            duration: M.heartFlightMs,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(giftScale, {
            toValue: 0.42,
            duration: M.heartFlightMs,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(giftOpacity, {
            toValue: 0,
            duration: 160,
            delay: M.heartFlightMs - 160,
            useNativeDriver: true,
          }),
        ]),
      ]);

    const enter = Animated.parallel([
      Animated.timing(scrim, {
        toValue: 1,
        duration: M.scrimInMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      giftMotion,
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
  }, [copyFade, copyShift, giftOpacity, giftScale, giftTranslateX, giftTranslateY, clearHideTimer, scrim, sequence]);

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
  }, [visible, errorCode, reduceMotion, scrim, clearHideTimer, sequence]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const handleRetry = useCallback(() => {
    clearHideTimer();
    onRetry?.();
  }, [clearHideTimer, onRetry]);

  if (!visible) return null;

  const centeredLayerStyle = {
    width: windowWidth,
    height: windowHeight,
    left: -anchorFrame.x,
    // The layer itself is window-height tall. Its local top must place the
    // layer center at the window center, not add the window half-height again.
    top: -anchorFrame.y,
  } as const;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, centeredLayerStyle, { opacity: scrim }]}
      testID="session-attempt-gift-rescue"
    >
      <Animated.View
        pointerEvents={failed ? 'auto' : 'none'}
        style={[
          styles.card,
          !failed && styles.successCard,
          // Тон + тень вместо обводки — запрет владельца на рамки контейнеров.
          { backgroundColor: failed ? t.bgCard : 'transparent', shadowColor: t.cardShadow },
        ]}
      >
        <Animated.View
          style={{
            opacity: giftOpacity,
            transform: [
              { translateX: giftTranslateX },
              { translateY: giftTranslateY },
              { scale: giftScale },
            ],
          }}
        >
          {failed ? (
            <Ionicons name="alert-circle" size={30} color={t.wrong} />
          ) : (
            <LevelSpinRewardArt
              rewardId="attempt_restore_all"
              size={72}
              accessibilityLabel={copy.giftAppliedTitle}
              fallbackColor={t.correct}
            />
          )}
        </Animated.View>
        {failed ? (
          <Animated.View style={{ opacity: copyFade, transform: [{ translateY: copyShift }] }}>
            <Text style={[styles.title, { color: t.textOnCard }]}>
              {copy.giftRecoveryFailed}
            </Text>
          </Animated.View>
        ) : null}
        {failed && onRetry ? (
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
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
  successCard: {
    backgroundColor: 'transparent',
    elevation: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOpacity: 0,
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
