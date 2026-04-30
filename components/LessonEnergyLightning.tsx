import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import EnergyIcon from './EnergyIcon';
import { useEnergy } from './EnergyContext';
import { getTimeUntilNextRecovery, formatTimeUntilRecovery } from '../app/energy_system';
import EnergyRefillShardModal from './EnergyRefillShardModal';
import { triLang } from '../constants/i18n';
import { BRAND_SHARDS_ES } from '../constants/terms_es';
import { hapticTap } from '../hooks/use-haptics';

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
  const { lang } = useLang();
  const { isUnlimited } = useEnergy();
  const energyLongPressHint = triLang(lang, {
    ru: 'Долгое нажатие — восстановить энергию за осколки',
    uk: 'Довге натискання — відновити енергію за осколки',
    es: `Mantén pulsado para recuperar energía con ${BRAND_SHARDS_ES}`,
  });
  const [refillModal, setRefillModal] = useState(false);
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const premiumTint = isUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : undefined;
  const filledTint = premiumTint;
  const filledColor = isUnlimited ? (isLightTheme ? '#004F8C' : PREMIUM_BLUE) : t.gold;
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
      <Pressable
        onLongPress={() => {
          hapticTap();
          setRefillModal(true);
        }}
        delayLongPress={480}
        accessibilityHint={energyLongPressHint}
      >
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
              isPremium={isUnlimited}
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
      <EnergyRefillShardModal visible={refillModal} onClose={() => setRefillModal(false)} />
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
