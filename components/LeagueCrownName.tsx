import React, { memo, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { LEAGUE_CROWN_NICK_COLOR } from '../app/services/league_chest_rewards';
import { GOLD_RICH } from '../constants/goldTheme';
import { useTheme } from './ThemeContext';
import { LUM, SUITE } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';

type Props = {
  text: string;
  fontSize: number;
  active?: boolean;
  fontWeight?: '700' | '800' | '900';
  iconScale?: number;
  count?: number;
  /**
   * Гибрид «Световод + Чекан» (owner-инициатива, семья «Отклик» B6): bloom
   * за короной + микро-пульс SUITE.pulse ОДИН раз, ровно на повышение лиги
   * (изменился на true, либо родитель передаёт растущий tier через смену
   * этого прописа). По умолчанию выключен — прежний статичный вид короны
   * во всех существующих местах вызова сохраняется без изменений.
   */
  celebrate?: boolean;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');

function LeagueCrownName({
  text,
  fontSize,
  active = true,
  fontWeight = '900',
  iconScale = 1.25,
  count,
  celebrate = false,
}: Props) {
  const { themeMode } = useTheme();
  const crownColor = themeMode === 'gold'
    ? GOLD_RICH.metalGold
    : LEAGUE_CROWN_NICK_COLOR;

  const reduceMotion = useReduceMotion();
  const bloomOpacity = useSharedValue(0);
  const crownPulse = useSharedValue(1);
  const prevCelebrateRef = useRef(celebrate);
  useEffect(() => {
    const prev = prevCelebrateRef.current;
    prevCelebrateRef.current = celebrate;
    if (prev || !celebrate) return; // реагируем только на реальный переход false→true, не на монтирование
    if (reduceMotion) return; // reduce motion = статичный кадр, без bloom/пульса
    bloomOpacity.value = 0;
    bloomOpacity.value = withTiming(0.32, { duration: LUM.bloomMs, easing: Easing.out(Easing.cubic) }, () => {
      bloomOpacity.value = withTiming(0.12, { duration: LUM.rimMs, easing: Easing.out(Easing.cubic) });
    });
    crownPulse.value = 0.92;
    crownPulse.value = withSpring(1, SUITE.pulse);
  }, [bloomOpacity, celebrate, crownPulse, reduceMotion]);
  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloomOpacity.value }));
  const crownPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: crownPulse.value }] }));

  if (!active) {
    return (
      <Text numberOfLines={1} style={{ fontSize, fontWeight, flexShrink: 1 }}>
        {text}
      </Text>
    );
  }

  const iconSize = Math.max(18, Math.round(fontSize * iconScale));
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, maxWidth: '100%', overflow: 'hidden', alignSelf: 'flex-start' }}>
      <Reanimated.View style={crownPulseStyle}>
        <Reanimated.View
          pointerEvents="none"
          style={[
            bloomStyle,
            {
              position: 'absolute',
              width: iconSize * 1.8,
              height: iconSize * 1.8,
              left: -iconSize * 0.4,
              top: -iconSize * 0.4,
              borderRadius: iconSize,
              backgroundColor: crownColor,
            },
          ]}
        />
        {/* guard-ok: декоративная корона — смысл несёт соседний Text (имя/счётчик),
            сама иконка не нужна скринридеру отдельно. */}
        <Image
          source={LEAGUE_CROWN_ICON}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
          style={{
            width: iconSize,
            height: iconSize,
          }}
        />
      </Reanimated.View>
      <Text
        numberOfLines={1}
        style={{
          fontSize,
          color: crownColor,
          fontWeight,
          // Раньше flex:1: в схлопнутом (по контенту) родительском ряду это давало
          // Text нулевую ширину → имя коронованных ПРОПАДАЛО. flexShrink берёт
          // естественную ширину по тексту и ужимается только при нехватке места.
          flexShrink: 1,
        }}
      >
        {text}
      </Text>
      {safeCount > 0 ? (
        <Text
          numberOfLines={1}
          style={{
            fontSize: Math.max(11, Math.round(fontSize * 0.74)),
            color: crownColor,
            fontWeight: '900',
            flexShrink: 0,
          }}
        >
          x{safeCount}
        </Text>
      ) : null}
    </View>
  );
}

export default memo(LeagueCrownName);

