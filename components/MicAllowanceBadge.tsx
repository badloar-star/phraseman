// MicAllowanceBadge.tsx — цифра «осталось голосовых попыток сегодня» поверх ЛЮБОГО микрофона приложения (решение владельца 15.10 ~11:10).
//
// зачем: «у Free на микрофоне ВЕЗДЕ, где есть иконка, цифра — сколько осталось на сегодня», общий счётчик 3 в день (app/voice_daily_allowance.ts, Ядро).
// Компонент самодостаточный: сам читает остаток (useVoiceDailyAllowance), сам берёт цвета из активной темы и рисуется только когда есть что показать:
// Plus — без цифры, `unknown` (доступ или счётчик ещё не известны) — не рисуем и не мигаем. При 0 внутри — «PLUS» (VoiceAllowanceBadge), а сам тап по микрофону
// ведёт на пейвол ai_voice_input через гейт поверхности — это не дело значка (он pointerEvents="none").
// Как ставить: положить ВНУТРЬ контейнера, равного кругу микрофона (position: relative); значок прилипает к его правому верхнему углу (top −6, right −10).
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useVoiceDailyAllowance } from '../app/voice_daily_allowance';
import { useTheme } from './ThemeContext';
import VoiceAllowanceBadge, { type VoiceAllowanceColors } from './VoiceAllowanceBadge';

type Props = Readonly<{
  /** Свои цвета (редкие экраны с особым микрофоном); по умолчанию — токены темы. */
  colors?: VoiceAllowanceColors;
  /** sm — для малых кнопок (поле ввода диалогов); по умолчанию md. */
  size?: 'md' | 'sm';
  testID?: string;
}>;

function MicAllowanceBadge({ colors, size = 'md', testID = 'mic-allowance-badge' }: Props) {
  const allowance = useVoiceDailyAllowance();
  const { liquidGlassThemeId } = useTheme();
  const reduceMotion = useReducedMotion();
  const themed = useMemo<VoiceAllowanceColors>(() => {
    const g = liquidGlassTokens(liquidGlassThemeId);
    // та же раскладка, что у микрофона курса V2: цифра цвета cta на тёмной пилюле, кольцо — цвет фона страницы
    return { fill: g.ctaInk, ink: g.cta, ring: g.bg, plusFill: g.cta, plusInk: g.ctaInk, spentFill: g.opaqueControl, spentInk: g.secondary };
  }, [liquidGlassThemeId]);
  if (allowance.kind !== 'limited' || allowance.remaining === null) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <VoiceAllowanceBadge remaining={allowance.remaining} colors={colors ?? themed} reduceMotion={reduceMotion} size={size} testID={testID} />
    </View>
  );
}

export default memo(MicAllowanceBadge);
