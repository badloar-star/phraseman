/**
 * Общий объёмный 3D-сундук подарка за уровень + палитра по редкости.
 * Используется одиночным (LevelGiftModal) и двойным (LevelGiftDualModal)
 * модалами, чтобы оба говорили на одном визуальном языке (без конфетти).
 *
 * Сундук — слои-вьюхи (низ/лента/крышка/бант) с глубиной, без растрового
 * ассета. В фазе box парит и покачивается; при открытии крышка отлетает с
 * поворотом, низ оседает (через переданные Animated-значения).
 */

import { LinearGradient } from './SafeLinearGradient';
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/** Регистр анимации/палитры по редкости подарка. */
export type GiftRegister = 'energy' | 'glow' | 'gold';

export const registerForRarity = (r: string): GiftRegister =>
  r === 'epic' ? 'gold' : r === 'rare' ? 'glow' : 'energy';

/** Палитра по регистру — единый источник всех цветов модала по редкости. */
export interface RegisterPalette {
  accent: string;          // основной цвет редкости (плашка, рамка, кнопка)
  accentSoft: string;      // полупрозрачный акцент (тинт, верхняя линия)
  panelTop: string;        // верх декоративного градиента панели
  panelBottom: string;     // низ декоративного градиента панели
  boxBase: [string, string];
  boxLid: [string, string];
  ribbon: string;
  orb: [string, string];
  orbInk: string;          // цвет иконки внутри орба
  button: [string, string];
  buttonInk: string;
}

export const GIFT_PALETTES: Record<GiftRegister, RegisterPalette> = {
  energy: {
    accent: '#7DD3FC',
    accentSoft: 'rgba(56,189,248,0.14)',
    panelTop: '#0F1D2E',
    panelBottom: '#0A1320',
    boxBase: ['#2C6E9E', '#16466E'],
    boxLid: ['#5BB6E6', '#2C6E9E'],
    ribbon: '#D7F2FF',
    orb: ['#BFE9FF', '#38BDF8'],
    orbInk: '#0A3550',
    button: ['#BFE9FF', '#38BDF8'],
    buttonInk: '#0A3550',
  },
  glow: {
    accent: '#C4B5FD',
    accentSoft: 'rgba(124,58,237,0.14)',
    panelTop: '#1B1533',
    panelBottom: '#120E22',
    boxBase: ['#7C6BD6', '#4A3C9E'],
    boxLid: ['#9B8BE8', '#6A57C4'],
    ribbon: '#EDE7FF',
    orb: ['#C4B5FD', '#7C3AED'],
    orbInk: '#FFFFFF',
    button: ['#C4B5FD', '#7C3AED'],
    buttonInk: '#FFFFFF',
  },
  gold: {
    accent: '#FBD46A',
    accentSoft: 'rgba(224,161,36,0.16)',
    panelTop: '#261C0D',
    panelBottom: '#171008',
    boxBase: ['#C99A35', '#8A5E12'],
    boxLid: ['#F0CD6B', '#C99A35'],
    ribbon: '#FFF1CC',
    orb: ['#FFE7A6', '#E0A124'],
    orbInk: '#5A3C06',
    button: ['#FFE7A6', '#E0A124'],
    buttonInk: '#3A2606',
  },
};

export function paletteForRarity(rarity: string): RegisterPalette {
  return GIFT_PALETTES[registerForRarity(rarity)];
}

interface GiftBox3DProps {
  palette: RegisterPalette;
  size: number;
  /** true → сундук парит и качается (idle); false → статичен (открывается). */
  idle: boolean;
  floatY: Animated.Value;
  rock: Animated.AnimatedInterpolation<string>;
  scale: Animated.Value;
  shakeX: Animated.Value;
  /** 0 закрыт → 1 крышка отлетела. */
  lidLift: Animated.Value;
  /** Показывать свечение из щели при открытии. */
  opening?: boolean;
}

export function GiftBox3D({ palette, size, idle, floatY, rock, scale, shakeX, lidLift, opening = false }: GiftBox3DProps) {
  const baseW = size * 0.62;
  const baseH = size * 0.46;
  const lidH = size * 0.26;
  const lidW = size * 0.72;

  const lidTranslate = lidLift.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.42] });
  const lidRotate = lidLift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '24deg'] });
  const lidOpacity = lidLift.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const ribbonOpacity = lidLift.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0.3, 0] });
  const baseSink = lidLift.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.06] });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [
          { translateY: idle ? floatY : 0 },
          { rotateZ: idle ? rock : '0deg' },
          { scale },
          { translateX: shakeX },
        ],
      }}
    >
      {/* Падающая тень под сундуком */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: size * 0.12,
          width: baseW * 0.92,
          height: 14,
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity: 0.5,
        }}
      />

      {/* Низ коробки */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: size * 0.2,
          width: baseW,
          height: baseH,
          borderRadius: 12,
          overflow: 'hidden',
          transform: [{ translateY: baseSink }],
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <LinearGradient colors={palette.boxBase} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: '50%', marginLeft: -7, top: 0, bottom: 0, width: 14, backgroundColor: palette.ribbon, opacity: 0.9 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: 'rgba(0,0,0,0.25)' }} />
      </Animated.View>

      {/* Крышка */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: size * 0.2 + baseH - lidH * 0.5,
          width: lidW,
          height: lidH,
          borderRadius: 11,
          overflow: 'hidden',
          opacity: lidOpacity,
          transform: [{ translateY: lidTranslate }, { rotateZ: lidRotate }],
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <LinearGradient colors={palette.boxLid} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: 'rgba(255,255,255,0.28)' }} />
      </Animated.View>

      {/* Лента+бант поверх крышки */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: size * 0.2 + baseH - lidH * 0.5,
          width: 14,
          height: lidH,
          backgroundColor: palette.ribbon,
          opacity: ribbonOpacity,
          transform: [{ translateY: lidTranslate }, { rotateZ: lidRotate }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: size * 0.2 + baseH + lidH * 0.3,
          width: size * 0.26,
          height: size * 0.16,
          borderRadius: size * 0.13,
          backgroundColor: palette.ribbon,
          opacity: ribbonOpacity,
          transform: [{ translateY: lidTranslate }],
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
      />

      {/* мягкое свечение из щели при открытии */}
      {opening && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: size * 0.2 + baseH - 6,
            width: baseW * 0.7,
            height: 18,
            borderRadius: 12,
            backgroundColor: palette.accent,
            opacity: lidLift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 0.2] }),
          }}
        />
      )}
    </Animated.View>
  );
}
