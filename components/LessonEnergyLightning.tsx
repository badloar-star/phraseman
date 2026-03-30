import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from './ThemeContext';
import EnergyIcon from './EnergyIcon';
import { getTimeUntilNextRecovery, formatTimeUntilRecovery } from '../app/energy_system';

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
  const { theme: t } = useTheme();
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
              themeColor={i < energyCount ? t.gold : t.textGhost}
              size={20}
              animateChange={true}
              shouldShake={shouldShake}
            />
          </View>
        ))}
      </View>

      {/* Recovery timer (shown only when energy < max) */}
      {energyCount < maxEnergy && timeUntilNextEnergy && (
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
