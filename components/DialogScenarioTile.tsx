import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Text, View } from 'react-native';

import { useReduceMotion } from '../hooks/use_reduce_motion';
import { PressableScale } from './feedback/PressableScale';

type ScenarioStatus = 'done' | 'available' | 'locked';

interface DialogScenarioTileProps {
  index: number;
  icon: string;
  title: string;
  levelChip: string;
  status: ScenarioStatus;
  lockedText: string;
  onPress: () => void;
  onLongPress: () => void;
  colors: {
    accent: string;
    accentBg: string;
    bgCard: string;
    bgSurface: string;
    textPrimary: string;
    textMuted: string;
    correctText: string;
  };
  fontSizes: { body: number; label: number };
  accessibilityLabel: string;
  accessibilityHint: string;
}

export default function DialogScenarioTile({
  index,
  icon,
  title,
  levelChip,
  status,
  lockedText,
  onPress,
  onLongPress,
  colors,
  fontSizes,
  accessibilityLabel,
  accessibilityHint,
}: DialogScenarioTileProps) {
  const reduceMotion = useReduceMotion();
  const locked = status === 'locked';
  const done = status === 'done';
  const entering = reduceMotion ? undefined : FadeInDown.delay(Math.min(index, 10) * 40).duration(220);
  const statusLabel = locked ? lockedText : done ? '✓' : '•';

  return (
    <Reanimated.View entering={entering}>
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        delayLongPress={550}
        onLongPress={onLongPress}
        onPress={onPress}
        style={{
          minHeight: 66,
          marginTop: index === 0 ? 0 : 8,
          marginHorizontal: 14,
          borderRadius: 16,
          backgroundColor: colors.bgCard,
          paddingHorizontal: 13,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: locked ? 0.5 : 1,
        }}
        variant="flat"
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            backgroundColor: colors.bgSurface,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name={icon as never} size={22} color={locked ? colors.textMuted : colors.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.textPrimary, fontSize: fontSizes.body, fontWeight: '700' }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: colors.accentBg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: colors.accent, fontSize: fontSizes.label, fontWeight: '700' }}>{levelChip}</Text>
            </View>
            <Text style={{ color: locked ? colors.textMuted : colors.accent, fontSize: fontSizes.label, fontWeight: '400' }}>
              {statusLabel}
            </Text>
          </View>
        </View>
        {done && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
      </PressableScale>
    </Reanimated.View>
  );
}
