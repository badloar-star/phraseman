/**
 * DialogScenarioTile — крупная строка сценария внутри карточки-мира Диалогов.
 *
 * зачем (стиль 2.0, владелец 24.09): строка теперь — «приподнятая» стеклянная
 * плашка (glassRaised) внутри уже стеклянной карточки-мира, ровно как на
 * референсе экрана B («Закажи кофе», уровень-пилюль справа). Медальон значка
 * и пилюля уровня используют палитру V2 (тёплое стекло + тонкая кромка), но
 * логика статусов (done/available/locked) и вся раскладка не изменились —
 * только визуальный слой.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Text, View } from 'react-native';

import type { DialogSceneTheme } from '../constants/dialogSceneThemes';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { PressableScale } from './feedback/PressableScale';
import { useV2Palette } from './v2/useV2Palette';
import { nestedBoxShadow, useShadowGlass } from './v2/ShadowSurface';

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
  scene: _scene,
  onPress,
  onLongPress,
  colors: _colors,
  fontSizes,
  accessibilityLabel,
  accessibilityHint,
}: DialogScenarioTileProps) {
  const p = useV2Palette();
  const shadowGlass = useShadowGlass();
  const reduceMotion = useReduceMotion();
  const locked = status === 'locked';
  const done = status === 'done';
  const entering = reduceMotion ? undefined : FadeInDown.delay(Math.min(index, 10) * 40).duration(220);
  const glyphColor = locked ? p.textMuted : p.iconTint;

  return (
    <Reanimated.View entering={entering} style={{ position: 'relative', overflow: 'visible' }}>
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
          borderRadius: 14,
          backgroundColor: p.glassRaised,
          boxShadow: nestedBoxShadow(shadowGlass), // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (строка внутри карточки-мира)
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
            backgroundColor: p.control,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={(locked ? 'lock-closed' : icon) as never} size={21} color={glyphColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0, opacity: locked ? 0.62 : 1 }}>
          <Text
            style={{
              color: locked ? p.textSecondary : p.text,
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
              style={{ color: p.textMuted, fontSize: fontSizes.sub, fontWeight: '700', marginTop: 3 }}
              maxFontSizeMultiplier={1.2}
            >
              {statusLabel}
            </Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: p.control, // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (пилюля уровня A1/A2/B1)
            borderRadius: 9,
            paddingHorizontal: 9,
            paddingVertical: 4,
          }}
        >
          <Text style={{ color: p.text, fontSize: fontSizes.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
            {levelChip}
          </Text>
        </View>
        {done ? (
          <Ionicons name="checkmark-circle" size={22} color={p.iconTint} />
        ) : locked ? null : (
          <Ionicons name="chevron-forward" size={18} color={p.textMuted} />
        )}
      </PressableScale>
      {/* зачем энергии здесь БОЛЬШЕ НЕТ (владелец 2026-09-17): цена входа висела
          на плитках списка (у пройденных сценариев) и сообщала её раньше, чем
          человек вообще решил играть — список читался как прайс-лист. Теперь
          цена живёт ровно в точке решения: на кнопке «Начать» экрана-задания
          (AiDialogBriefingScreen), через который теперь проходит КАЖДЫЙ вход. */}
    </Reanimated.View>
  );
}
