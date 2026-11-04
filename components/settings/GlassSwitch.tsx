// зачем (слово владельца, волна UX 2, 04.11): один общий переключатель вместо самодельных дорожек. Тумблер — управляющий элемент: лёгкий хаптик на тап;
// бегунок и дорожка анимируются на UI-потоке (Reanimated: translateX и кроссфейд двух дорожек, без setState в кадрах); «Уменьшить движение» — мгновенно.
// Цвета — только из токенов темы (switchOnTone / switchOffTrackTone), без обводок. Размеры как у SettingsGlassSwitch: дорожка 48×29, бегунок 21, зона нажатия ≥ 44.
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import PressableHybrid from '../PressableHybrid';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { switchOffTrackTone, switchOnTone } from './switch_chrome';

/** Длительность переключения (мс): короткая, отклик мгновенный. */
export const GLASS_SWITCH_MS = 180;

type Glass = ReturnType<typeof liquidGlassTokens>;
export type GlassSwitchProps = Readonly<{
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  glass: Glass;
  disabled?: boolean;
  testID?: string;
}>;

export function GlassSwitch({ value, onValueChange, accessibilityLabel, glass, disabled = false, testID }: GlassSwitchProps) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(value ? 1 : 0);
  // зачем: прогресс догоняет значение; при «Уменьшить движение» — сразу, без анимации.
  useEffect(() => {
    const target = value ? 1 : 0;
    progress.value = reduce ? target : withTiming(target, { duration: GLASS_SWITCH_MS, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, progress]);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * 19 }] }));
  const onTrackStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const onTone = switchOnTone(glass);
  const offTone = switchOffTrackTone(glass);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => { hapticTap(); onValueChange(!value); }}
      withHaptic={false}
      withSound={false}
      variant="chip"
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{ width: 48, minWidth: 48, minHeight: 36, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 36, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={{ width: 48, height: 29, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: offTone.track }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, backgroundColor: onTone.track }, onTrackStyle]} />
        <Animated.View style={[{ width: 21, height: 21, borderRadius: 11, backgroundColor: value ? onTone.knob : offTone.knob }, knobStyle]} />
      </View>
    </PressableHybrid>
  );
}

export default GlassSwitch;
