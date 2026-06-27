import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Text, useWindowDimensions, View } from 'react-native';
import { MOTION_DURATION, MOTION_SCALE, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { useEnergy, useEnergyCountdown } from './EnergyContext';
import { usePremium } from './PremiumContext';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import EnergyIcon from './EnergyIcon';
import { getAdaptiveEnergyIconLayout } from './energyIconLayout';

interface Props {
  size?: number; // icon size, default 30
  maxWidth?: number;
}

/**
 * EnergyBar — compact energy indicator for any screen header.
 * Uses EnergyContext — always synced globally. No local state needed.
 */
const BONUS_COLOR = '#FFD700'; // gold for bonus slots

function EnergyBar({ size = 30, maxWidth }: Props) {
  const { energy, bonusEnergy, maxEnergy, isUnlimited } = useEnergy();
  const { formattedTime } = useEnergyCountdown();
  const { hasPremiumAccess } = usePremium();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const { width: windowWidth } = useWindowDimensions();

  // Scale bounce when a new energy icon fills during restore
  // Initialize with 10 (max possible) to handle dynamic maxEnergy growth
  const scaleAnims = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(1))
  ).current;

  // Separate anims for up to 4 bonus slots
  const bonusScaleAnims = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(1))
  ).current;
  const bonusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    bonusTimersRef.current.forEach(clearTimeout);
    bonusTimersRef.current = [];
  }, []);

  const prevEnergyRef = useRef(energy);
  useEffect(() => {
    const prev = prevEnergyRef.current;
    prevEnergyRef.current = energy;
    if (energy > prev && energy <= maxEnergy) {
      const idx = energy - 1;
      Animated.sequence([
        Animated.timing(scaleAnims[idx], {
          toValue: MOTION_SCALE.energyRefill,
          duration: MOTION_DURATION.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnims[idx], {
          toValue: 1,
          useNativeDriver: true,
          friction: MOTION_SPRING.ui.friction,
          tension: MOTION_SPRING.ui.tension,
        }),
      ]).start();
    }
  }, [energy, maxEnergy, scaleAnims]);

  const prevBonusRef = useRef(bonusEnergy);
  useEffect(() => {
    const prev = prevBonusRef.current;
    prevBonusRef.current = bonusEnergy;
    if (bonusEnergy > prev) {
      // Animate each newly added bonus slot
      for (let i = prev; i < bonusEnergy && i < bonusScaleAnims.length; i++) {
        const idx = i;
        const delay = (idx - prev) * 200;
        const timer = setTimeout(() => {
          bonusTimersRef.current = bonusTimersRef.current.filter(item => item !== timer);
          Animated.sequence([
            Animated.timing(bonusScaleAnims[idx], {
              toValue: MOTION_SCALE.energyRefill,
              duration: MOTION_DURATION.normal,
              useNativeDriver: true,
            }),
            Animated.spring(bonusScaleAnims[idx], {
              toValue: 1,
              useNativeDriver: true,
              friction: MOTION_SPRING.ui.friction,
              tension: MOTION_SPRING.ui.tension,
            }),
          ]).start();
        }, delay);
        bonusTimersRef.current.push(timer);
      }
    }
  }, [bonusEnergy, bonusScaleAnims]);

  const bonusAccent = BONUS_COLOR;
  const filledColor = t.gold;
  const emptyColor = t.textGhost;

  const safeBonus = Math.min(bonusEnergy, bonusScaleAnims.length);
  const totalSlots = Math.max(1, maxEnergy + safeBonus);
  const energyLayout = getAdaptiveEnergyIconLayout({
    slotCount: totalSlots,
    iconSize: size,
    maxWidth: maxWidth ?? Math.min(156, Math.max(size, windowWidth * 0.36)),
  });
  const overlap = energyLayout.marginLeft;

  if (hasPremiumAccess) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: energyLayout.width, maxWidth: energyLayout.maxWidth }}>
        {Array.from({ length: maxEnergy }).map((_, i) => (
          <Animated.View key={i} style={{ marginLeft: i > 0 ? overlap : 0, transform: [{ scale: scaleAnims[i] }] }}>
            <EnergyIcon
              filled={i < energy}
              themeColor={i < energy ? filledColor : emptyColor}
              size={energyLayout.iconSize}
              animateChange={true}
              shouldShake={false}
              themeMode={themeMode}
            />
          </Animated.View>
        ))}
        {safeBonus > 0 && Array.from({ length: safeBonus }).map((_, i) => (
          <Animated.View
            key={`bonus_${i}`}
            style={{ marginLeft: overlap, transform: [{ scale: bonusScaleAnims[i] }] }}
          >
            <EnergyIcon
              filled={true}
              themeColor={bonusAccent}
              size={energyLayout.iconSize}
              animateChange={false}
              shouldShake={false}
              themeMode={themeMode}
              tintColor={bonusAccent}
            />
          </Animated.View>
        ))}
      </View>
      {!isUnlimited && energy < maxEnergy && !!formattedTime && (
        <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }}>
          {formattedTime}
        </Text>
      )}
    </View>
  );
}

export default memo(EnergyBar);
