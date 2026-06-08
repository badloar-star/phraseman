import React, { memo, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable, useWindowDimensions } from 'react-native';
import { useTheme } from './ThemeContext';
import EnergyIcon from './EnergyIcon';
import { getAdaptiveEnergyIconLayout } from './energyIconLayout';
import { useEnergy } from './EnergyContext';
import { usePremium } from './PremiumContext';
import { getTimeUntilNextRecovery, formatTimeUntilRecovery } from '../app/energy_system';

const ENERGY_ICON_SIZE = 30;

interface Props {
  energyCount: number; // 0-5
  maxEnergy?: number; // default 5
  shouldShake?: boolean; // Trigger shake animation when energy runs out
}

/**
 * LessonEnergyLightning component
 * Displays 5 stacked energy icons representing energy units
 * Icons overlap for compact layout (50% offset)
 */
function LessonEnergyLightning({ energyCount, maxEnergy = 5, shouldShake = false }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { isUnlimited } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { width: windowWidth } = useWindowDimensions();

  const filledColor = t.gold;
  const [timeUntilNextEnergy, setTimeUntilNextEnergy] = useState<string | null>(null);
  const energyLayout = getAdaptiveEnergyIconLayout({
    slotCount: maxEnergy,
    iconSize: ENERGY_ICON_SIZE,
    maxWidth: Math.min(156, Math.max(ENERGY_ICON_SIZE, windowWidth * 0.38)),
  });

  // Update timer every second when energy is not at max
  useEffect(() => {
    if (hasPremiumAccess || energyCount >= maxEnergy) {
      setTimeUntilNextEnergy(null);
      return;
    }

    const updateTimer = async () => {
      const timeMs = await getTimeUntilNextRecovery();
      if (timeMs !== null) {
        const formatted = formatTimeUntilRecovery(timeMs);
        setTimeUntilNextEnergy(formatted);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [energyCount, hasPremiumAccess, maxEnergy]);

  if (hasPremiumAccess) return null;

  return (
    <View style={styles.container}>
      {/* Horizontal energy icons with slight overlap */}
      <Pressable
      >
      <View style={[styles.stackContainer, { width: energyLayout.width, maxWidth: energyLayout.maxWidth }]}>
        {Array.from({ length: maxEnergy }).map((_, i) => (
          <View key={i} style={{ marginLeft: i > 0 ? energyLayout.marginLeft : 0 }}>
            <EnergyIcon
              filled={i < energyCount}
              themeColor={i < energyCount ? filledColor : t.textGhost}
              size={energyLayout.iconSize}
              animateChange={true}
              shouldShake={shouldShake}
              themeMode={themeMode}
            />
          </View>
        ))}
      </View>
      </Pressable>

      {/* Recovery timer (shown only when energy < max) */}
      {!isUnlimited && energyCount < maxEnergy && timeUntilNextEnergy && (
        <View style={styles.timerContainer}>
          <Text style={[styles.timerText, { color: t.textMuted }]}>
            {timeUntilNextEnergy}
          </Text>
        </View>
      )}
    </View>
  );
}

export default memo(LessonEnergyLightning);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  stackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    marginTop: 4,
  },
  timerText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
