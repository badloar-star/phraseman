import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { ThemeMode } from "../constants/theme";
import { LUM } from "../constants/motionHybrid";
import { useReduceMotion } from "../hooks/use_reduce_motion";

const ENERGY_IMAGE = require("../assets/images/energy/energy-start-cost.webp");

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number;
  animateChange?: boolean;
  shouldShake?: boolean;
  themeMode?: ThemeMode;
  tintColor?: string;
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
  animateChange = true,
  shouldShake = false,
  bloomOnRefill = false,
}: EnergyIconProps) {
  const emptyOpacity = 0.4;
  const opacityAnim = useRef(
    new Animated.Value(filled ? 1 : emptyOpacity),
  ).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const wasFilledRef = useRef(filled);

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
      {/* guard-ok: декоративная иконка энергии — значение озвучено соседним
          счётчиком/текстом во всех местах вызова, сама картинка не несёт
          самостоятельного смысла для скринридера. */}
      <Image
        source={ENERGY_IMAGE}
        style={{
          width: size,
          height: size,
        }}
        contentFit="contain"
        accessible={false}
        importantForAccessibility="no"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { borderRadius: 999 },
});

export default memo(EnergyIcon);
