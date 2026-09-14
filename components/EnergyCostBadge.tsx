import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  activityEnergyCost,
  type EnergyActivityKey,
  type EnergyActivityCost,
} from '../app/energy_contract';
import { useEnergy } from './EnergyContext';
import { useLang } from './LangContext';
import { usePremium } from './PremiumContext';
import { triLang } from '../constants/i18n';

interface EnergyCostBadgeProps {
  /** Central activity key; screens never own a numeric price. */
  activity: EnergyActivityKey;
  urgent?: boolean;
  corner?: 'topRight' | 'topLeft';
  compact?: boolean;
  micro?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function EnergyCostBadge({
  activity,
  urgent = false,
  corner = 'topRight',
  compact = false,
  micro = false,
  style,
  testID,
}: EnergyCostBadgeProps) {
  const { isUnlimited, energyReady } = useEnergy();
  const { hasPremiumAccess } = usePremium();
  const { lang } = useLang();
  const cost: EnergyActivityCost = activityEnergyCost(activity);
  if (hasPremiumAccess || !energyReady || isUnlimited || cost === 0) return null;
  const accent = urgent ? '#FF786F' : '#9187FF';
  const scaleStyle = micro ? styles.badgeMicro : compact ? styles.badgeCompact : styles.badge;
  const position = corner === 'topRight'
    ? (micro ? styles.topRightMicro : compact ? styles.topRightCompact : styles.topRight)
    : (micro ? styles.topLeftMicro : compact ? styles.topLeftCompact : styles.topLeft);

  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={triLang(lang, {
        ru: `Стоимость запуска: ${cost} энергии.`,
        uk: `Вартість запуску: ${cost} енергії.`,
        en: `Start cost: ${cost} energy.`,
        es: `Coste de inicio: ${cost} de energía.`,
        'pt-BR': `Custo para iniciar: ${cost} de energia.`,
        vi: `Chi phí bắt đầu: ${cost} năng lượng.`,
        id: `Biaya mulai: ${cost} energi.`,
        tr: `Başlatma bedeli: ${cost} enerji.`,
        pl: `Koszt rozpoczęcia: ${cost} energii.`,
      })}
      style={[scaleStyle, position, { borderColor: accent }, style]}
    >
      <Ionicons
        name="flash-outline"
        size={micro ? 12 : compact ? 14 : 16}
        color={accent}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.label, micro ? styles.labelMicro : compact ? styles.labelCompact : null]}
      >
        −{cost}
      </Text>
    </View>
  );
}

const base = {
  position: 'absolute' as const,
  zIndex: 20,
  elevation: 20,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 2,
  borderWidth: 1,
  backgroundColor: '#0D1123',
};

const styles = StyleSheet.create({
  badge: { ...base, minWidth: 50, height: 30, paddingHorizontal: 7, borderRadius: 12 },
  badgeCompact: { ...base, minWidth: 44, height: 26, paddingHorizontal: 6, borderRadius: 11 },
  badgeMicro: { ...base, minWidth: 38, height: 22, paddingHorizontal: 4, borderRadius: 9 },
  topRight: { top: -13, right: -4 },
  topLeft: { top: -13, left: -8 },
  topRightCompact: { top: -11, right: -3 },
  topLeftCompact: { top: -11, left: -6 },
  topRightMicro: { top: -9, right: -2 },
  topLeftMicro: { top: -9, left: -4 },
  label: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  labelCompact: { fontSize: 12, lineHeight: 14 },
  labelMicro: { fontSize: 10, lineHeight: 12 },
});

export default memo(EnergyCostBadge);
