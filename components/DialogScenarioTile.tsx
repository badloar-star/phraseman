/**
 * DialogScenarioTile — крупная строка сценария внутри карточки-мира Диалогов.
 *
 * зачем: владелец задал эталон — раздел «Статистика»: никаких мелких плиток и
 * мелких подписей, всё крупное. Строка ровно как ряды эталона: медальон 44,
 * заголовок bodyLg, чип уровня f.sub; статус — иконкой (✓ пройдено / › открыто /
 * замок), текстовая причина остаётся только у закрытых. Полки 128px из первой
 * версии редизайна удалены сознательно (2026-08-23, «делать как в эталоне»).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Text, View } from 'react-native';

import type { DialogSceneTheme } from '../constants/dialogSceneThemes';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { PressableScale } from './feedback/PressableScale';

type ScenarioStatus = 'done' | 'available' | 'locked';

interface DialogScenarioTileProps {
  index: number;
  icon: string;
  title: string;
  levelChip: string;
  status: ScenarioStatus;
  statusLabel: string;
  lockedText: string;
  /** Световая палитра мира (категория/challenge). */
  scene: DialogSceneTheme;
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
  fontSizes: { body: number; bodyLg: number; sub: number; label: number };
  accessibilityLabel: string;
  accessibilityHint: string;
}

export default function DialogScenarioTile({
  index,
  icon,
  title,
  levelChip,
  status,
  statusLabel,
  lockedText: _lockedText,
  scene,
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
  const glyphColor = locked ? colors.textMuted : scene.hue;

  return (
    <Reanimated.View entering={entering}>
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        delayLongPress={550}
        onLongPress={onLongPress}
        onPress={onPress}
        variant="flat"
        style={{
          minHeight: 64,
          marginTop: index === 0 ? 0 : 6,
          borderRadius: 16,
          backgroundColor: colors.bgSurface,
          paddingHorizontal: 10,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            backgroundColor: locked ? colors.bgCard : scene.hue + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={(locked ? 'lock-closed' : icon) as never} size={21} color={glyphColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0, opacity: locked ? 0.62 : 1 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: fontSizes.bodyLg,
              fontWeight: '700',
              lineHeight: Math.round(fontSizes.bodyLg * 1.25),
            }}
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </Text>
          {/* Причина замка — только у закрытых, крупным f.sub (не мелкая подпись). */}
          {locked && (
            <Text
              style={{ color: colors.textMuted, fontSize: fontSizes.sub, fontWeight: '700', marginTop: 3 }}
              maxFontSizeMultiplier={1.2}
            >
              {statusLabel}
            </Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: locked ? colors.bgCard : scene.hue + '22',
            borderRadius: 9,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: glyphColor, fontSize: fontSizes.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
            {levelChip}
          </Text>
        </View>
        {done ? (
          <Ionicons name="checkmark-circle" size={22} color={scene.hue} />
        ) : locked ? null : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </PressableScale>
    </Reanimated.View>
  );
}
