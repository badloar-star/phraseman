import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "./SafeLinearGradient";
import type { ThemeMode } from "../constants/theme";
import { LUM } from "../constants/motionHybrid";
import { useReduceMotion } from "../hooks/use_reduce_motion";
import { useRuntimeActive } from "../hooks/use_runtime_active";

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number;
  animateChange?: boolean;
  shouldShake?: boolean;
  themeMode?: ThemeMode;
  tintColor?: string;
  /** Постоянный loop разрешён только для иконок, которые показывают текущую энергию. */
  animateLoop?: boolean;
  /**
   * Гибрид «Световод + Чекан» (owner-инициатива, семья «Отклик» B6): bloom
   * (свет за иконкой) при переходе empty → filled — «пополнение энергии».
   * По умолчанию выключен: filled переключается часто (открыл экран уже
   * заряженным, потрачено/восстановлено программно) — bloom нужен только там,
   * где владелец явно отмечает момент пополнения (например NoEnergyModal
   * после успешной покупки), не на каждый ре-рендер иконки.
   */
  bloomOnRefill?: boolean;
}

function EnergyIcon({
  filled,
  size = 30,
  themeColor,
  tintColor,
  animateChange = true,
  shouldShake = false,
  bloomOnRefill = false,
  animateLoop = true,
}: EnergyIconProps) {
  const emptyOpacity = 0.4;
  const opacityAnim = useRef(
    new Animated.Value(filled ? 1 : emptyOpacity),
  ).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const sweepLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive();
  const wasFilledRef = useRef(filled);
  const loopActive = animateLoop && runtimeActive && !reduceMotion;

  useEffect(() => {
    sweepLoopRef.current?.stop();
    sweepLoopRef.current = null;
    if (!loopActive) {
      sweepAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(sweepAnim, {
      toValue: 1,
      duration: 2600,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    sweepLoopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      if (sweepLoopRef.current === loop) sweepLoopRef.current = null;
    };
  }, [loopActive, sweepAnim]);

  useEffect(() => {
    if (animateChange) {
      Animated.timing(opacityAnim, {
        toValue: filled ? 1 : emptyOpacity,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(filled ? 1 : emptyOpacity);
    }
  }, [filled, animateChange, opacityAnim, emptyOpacity]);

  useEffect(() => {
    if (shouldShake) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: -3,
          duration: 52,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 3,
          duration: 72,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -2,
          duration: 60,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShake, shakeAnim]);

  useEffect(() => {
    const wasFilled = wasFilledRef.current;
    wasFilledRef.current = filled;
    if (!bloomOnRefill || wasFilled || !filled) return;
    if (reduceMotion) return; // reduce motion = один кадр, без bloom
    glowAnim.setValue(0);
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 0.8,
        duration: LUM.bloomMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: LUM.bloomMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bloomOnRefill, filled, glowAnim, reduceMotion]);

  const sweepTranslateY = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [size, -size],
  });
  const loopScale = sweepAnim.interpolate({
    inputRange: [0, 0.28, 0.46, 0.58, 1],
    outputRange: [1, 1, 1.08, 1, 1],
  });

  const icon = loopActive ? (
    <View style={[styles.iconClip, { width: size, height: size }]}>
      <Animated.View style={{ width: size, height: size, transform: [{ scale: loopScale }] }}>
        <MaskedView
          style={{ width: size, height: size }}
          maskElement={(
            <Ionicons
              name="flash-outline"
              size={size}
              color="#000"
              accessible={false}
              importantForAccessibility="no"
            />
          )}
        >
          <Animated.View style={{ width: size, height: size, backgroundColor: tintColor ?? themeColor }}>
            <Animated.View
              pointerEvents="none"
              style={[styles.sweep, { width: size, height: Math.max(6, size * 0.72), transform: [{ translateY: sweepTranslateY }] }]}
            >
              <LinearGradient
                colors={['transparent', '#FFFFFF', 'transparent']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
          </Animated.View>
        </MaskedView>
      </Animated.View>
    </View>
  ) : (
    <Ionicons
      name="flash-outline"
      size={size}
      color={tintColor ?? themeColor}
      accessible={false}
      importantForAccessibility="no"
    />
  );

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        opacity: opacityAnim,
        transform: [{ translateX: shakeAnim }],
      }}
    >
      {bloomOnRefill ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.glow,
            {
              backgroundColor: "#FFD37A",
              opacity: glowAnim,
              transform: [{ scale: 1.6 }],
            },
          ]}
        />
      ) : null}
      {icon}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { borderRadius: 999 },
  iconClip: { overflow: 'hidden' },
  sweep: { position: 'absolute', left: 0, top: 0 },
});

export default memo(EnergyIcon);
