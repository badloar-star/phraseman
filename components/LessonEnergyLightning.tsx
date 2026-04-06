import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';
import EnergyIcon from './EnergyIcon';
import { useEnergy } from './EnergyContext';
import { getTimeUntilNextRecovery, formatTimeUntilRecovery } from '../app/energy_system';

const PREMIUM_BLUE = '#4FC3F7';

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
export default function LessonEnergyLightning({ energyCount, maxEnergy = 5, shouldShake = false }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { isUnlimited } = useEnergy();
  const filledTint = isUnlimited ? PREMIUM_BLUE : undefined;
  const filledColor = isUnlimited ? PREMIUM_BLUE : t.gold;
  const [timeUntilNextEnergy, setTimeUntilNextEnergy] = useState<string | null>(null);

  // Update timer every second when energy is not at max
  useEffect(() => {
    if (energyCount >= maxEnergy) {
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
  }, [energyCount, maxEnergy]);

  return (
    <View style={styles.container}>
      {/* Horizontal energy icons with slight overlap */}
      <View style={styles.stackContainer}>
        {Array.from({ length: maxEnergy }).map((_, i) => (
          <View key={i} style={{ marginLeft: i > 0 ? -8 : 0 }}>
            <EnergyIcon
              filled={i < energyCount}
              themeColor={i < energyCount ? filledColor : t.textGhost}
              size={20}
              animateChange={true}
              shouldShake={shouldShake}
              themeMode={themeMode}
              tintColor={i < energyCount ? filledTint : undefined}
            />
          </View>
        ))}
      </View>

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
