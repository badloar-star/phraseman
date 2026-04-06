import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useEnergy, MAX_ENERGY } from './EnergyContext';
import { useTheme } from './ThemeContext';
import EnergyIcon from './EnergyIcon';

const PREMIUM_BLUE = '#4FC3F7';

interface Props {
  size?: number; // icon size, default 16
}

/**
 * EnergyBar — compact energy indicator for any screen header.
 * Uses EnergyContext — always synced globally. No local state needed.
 */
export default function EnergyBar({ size = 16 }: Props) {
  const { energy, formattedTime, isUnlimited, restoringPremium } = useEnergy();
  const { theme: t, themeMode } = useTheme();

  // Scale bounce when a new energy icon fills during restore
  const scaleAnims = useRef(
    Array.from({ length: MAX_ENERGY }, () => new Animated.Value(1))
  ).current;

  const prevEnergyRef = useRef(energy);
  useEffect(() => {
    const prev = prevEnergyRef.current;
    prevEnergyRef.current = energy;
    if (energy > prev && energy <= MAX_ENERGY) {
      const idx = energy - 1;
      Animated.sequence([
        Animated.timing(scaleAnims[idx], { toValue: 1.5, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnims[idx], { toValue: 1, useNativeDriver: true }),
      ]).start();
    }
  }, [energy, scaleAnims]);

  const filledTint = isUnlimited ? PREMIUM_BLUE : undefined;
  const filledColor = isUnlimited ? PREMIUM_BLUE : t.gold;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {Array.from({ length: MAX_ENERGY }).map((_, i) => (
          <Animated.View key={i} style={{ marginLeft: i > 0 ? -6 : 0, transform: [{ scale: scaleAnims[i] }] }}>
            <EnergyIcon
              filled={i < energy}
              themeColor={i < energy ? filledColor : t.textGhost}
              size={size}
              animateChange={true}
              shouldShake={false}
              themeMode={themeMode}
              tintColor={i < energy ? filledTint : undefined}
            />
          </Animated.View>
        ))}
      </View>
      {!isUnlimited && energy < MAX_ENERGY && !!formattedTime && (
        <Text style={{ color: t.textMuted, fontSize: 10, marginTop: 2 }}>
          {formattedTime}
        </Text>
      )}
    </View>
  );
}
