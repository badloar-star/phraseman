/**
 * Глобальный «Световой перевод» подтверждённой траты энергии.
 * Заряд отделяется от верхнего счётчика, по мягкой дуге приходит в область
 * подтверждённой CTA и гаснет коротким световым ободком. Движение не меняет
 * layout: только transform/opacity, поэтому оно стабильно на слабых устройствах.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { emitAppEvent, onAppEvent } from '../app/events';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { ENERGY_SPEND_TRANSFER_HYBRID as MOTION } from '../constants/motionHybrid';

const ENERGY_START_COST_IMAGE = require('../assets/images/energy/energy-start-cost.webp');
const FLIGHT_MS = MOTION.durationMs;
const FLIGHT_ASSET_SIZE = MOTION.assetSize;
type MotionRequest = { amount: number; target?: { x: number; y: number } };

function EnergySpendFlightHost() {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(1);
  const [measuredTarget, setMeasuredTarget] = useState<{ x: number; y: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const runningRef = useRef(false);
  const queuedRequestRef = useRef<MotionRequest | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const playRef = useRef<(request: MotionRequest) => void>(() => {});

  const finish = useCallback(() => {
    animRef.current = null;
    runningRef.current = false;
    setVisible(false);
    // зачем: событие «анимация закончена» слушал только ожидатель в
    // EnergyContext, который держал старт активности до конца полёта. Владелец
    // 2026-08-24 убрал окно подтверждения, и это ожидание превратилось бы в
    // паузу после тапа — ожидатель снят, событие осталось бы без адресата.
    const queued = queuedRequestRef.current;
    queuedRequestRef.current = null;
    if (queued !== null) requestAnimationFrame(() => playRef.current(queued));
  }, []);

  const play = useCallback((request: MotionRequest) => {
    if (runningRef.current) {
      queuedRequestRef.current = request;
      return;
    }
    runningRef.current = true;
    setAmount(Math.max(1, Math.floor(request.amount)));
    setMeasuredTarget(request.target ?? null);
    setVisible(true);
    progress.setValue(0);

    const animation = reduceMotion
      ? Animated.timing(progress, { toValue: 1, duration: MOTION.reducedMotionMs, useNativeDriver: true })
      : Animated.timing(progress, {
          toValue: 1,
          duration: FLIGHT_MS,
          easing: Easing.bezier(0.2, 0.82, 0.2, 1),
          useNativeDriver: true,
        });
    animRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) finish();
    });
  }, [finish, progress, reduceMotion]);
  playRef.current = play;

  useEffect(() => () => {
    animRef.current?.stop();
    animRef.current = null;
    queuedRequestRef.current = null;
    runningRef.current = false;
  }, []);

  useEffect(() => {
    const sub = onAppEvent('energy_spent_on_start', payload => play(payload));
    return () => { sub.remove(); };
  }, [play]);

  if (!visible) return null;

  const sourceX = Math.max(18, width - MOTION.sourceRightPx - FLIGHT_ASSET_SIZE / 2);
  const sourceY = MOTION.sourceTopPx;
  const targetX = (measuredTarget?.x ?? width / 2) - FLIGHT_ASSET_SIZE / 2;
  const targetY = (measuredTarget?.y ?? Math.max(sourceY + 150, height * MOTION.targetHeightRatio)) - FLIGHT_ASSET_SIZE / 2;
  const curveY = Math.min(sourceY, targetY) - MOTION.curveLiftPx;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: reduceMotion ? [targetX, targetX] : [sourceX, targetX],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: reduceMotion ? [targetY, targetY, targetY] : [sourceY, curveY, targetY],
  });
  const chargeOpacity = progress.interpolate({
    inputRange: [0, 0.08, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });
  const chargeScale = progress.interpolate({
    inputRange: [0, 0.14, 0.72, 1],
    outputRange: [0.88, 1.16, 1.04, 0.82],
  });
  const chargeRotate = progress.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: ['-7deg', '5deg', '-2deg'],
  });
  const trailOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.62, 0.82, 1],
    outputRange: [0, 0.76, 0.5, 0, 0],
  });
  const trailScaleX = progress.interpolate({ inputRange: [0, 0.34, 0.78, 1], outputRange: [0.25, 1.25, 0.7, 0.2] });
  const impactOpacity = progress.interpolate({
    inputRange: [0, MOTION.impactStart, 0.76, 1],
    outputRange: [0, 0, 0.9, 0],
  });
  const impactScale = progress.interpolate({
    inputRange: [0, MOTION.impactStart, 1],
    outputRange: [0.58, 0.58, 2.15],
  });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      {!reduceMotion ? <Animated.View
        style={[
          styles.impactRing,
          {
            left: targetX + FLIGHT_ASSET_SIZE / 2 - 28,
            top: targetY + FLIGHT_ASSET_SIZE / 2 - 28,
            opacity: impactOpacity,
            transform: [{ scale: impactScale }],
          },
        ]}
      /> : null}
      {!reduceMotion ? <Animated.View
        style={[
          styles.trailCore,
          {
            opacity: trailOpacity,
            transform: [
              { translateX },
              { translateY },
              { translateX: -34 },
              { translateY: FLIGHT_ASSET_SIZE / 2 - 4 },
              { scaleX: trailScaleX },
              { rotate: '-16deg' },
            ],
          },
        ]}
      /> : null}
      <Animated.View
        style={[
          styles.charge,
          {
            opacity: chargeOpacity,
            transform: [
              { translateX },
              { translateY },
              { scale: chargeScale },
              { rotate: chargeRotate },
            ],
          },
        ]}
      >
        <View style={styles.chargeGlow} />
        <View style={styles.costGroup}>
          <Text style={styles.costLabel}>−{amount}</Text>
          <Image
            source={ENERGY_START_COST_IMAGE}
            style={styles.asset}
            contentFit="contain"
            accessible={false}
            importantForAccessibility="no"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 2000, elevation: 2000 },
  charge: { position: 'absolute', left: 0, top: 0, width: 126, height: FLIGHT_ASSET_SIZE, justifyContent: 'center' },
  chargeGlow: {
    position: 'absolute',
    left: 29,
    top: 4,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 196, 35, 0.30)',
  },
  costGroup: { flexDirection: 'row', alignItems: 'center' },
  costLabel: {
    color: '#FFF4C2',
    fontSize: 30,
    fontWeight: '900',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.92)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  asset: { width: FLIGHT_ASSET_SIZE, height: FLIGHT_ASSET_SIZE },
  trailCore: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 72,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 211, 83, 0.74)',
    shadowColor: '#FFC533',
    shadowOpacity: 0.9,
    shadowRadius: 11,
  },
  impactRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 219, 112, 0.86)',
    backgroundColor: 'rgba(255, 196, 35, 0.10)',
  },
});

export default memo(EnergySpendFlightHost);
