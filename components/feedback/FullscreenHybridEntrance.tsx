// ─── ГИБРИД «Световод + Чекан»: вход полноэкранных модалок ──────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html — семья
// «Полноэкранные»: сцена входит из света (bloom → контент каскадом), CTA
// последним по неравномерной лестнице LUM.ladder (закон №2 — не метроном).
// Общая обёртка живёт РЯДОМ со старым animationType="fade" каждой модалки под
// motionVariant='hybrid' — боевой путь (classic) не тронут ни на бит.
//
// Устройство сцены (перенесено вточности из макета):
//  1. bloomMs (420) — источник света вспыхивает в центре (радиальное гало).
//  2. resolveMs (380), задержка LUM.ladder[1] — карточка выходит из света
//     (opacity + settle без отскока LUM.settle, лёгкий translateY 14→0).
//  3. Каждый ребёнок (children как массив слотов) появляется по следующей
//     ступени LUM.ladder — каскад, не единый блок.
//  4. Выход короче входа: LUM.exitMs (260), без каскада (один блок).
//
// Reduce Motion = один финальный кадр (закон Motion DNA), cancelAnimation на
// unmount, только transform/opacity — без BlurView и animate-height.
import React, { memo, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type Props = {
  visible: boolean;
  /** Цвет вспышки-источника света (обычно акцент темы/палитры модалки). */
  bloomColor: string;
  /** Слоты контента: каждый появляется по следующей ступени LUM.ladder. */
  slots: readonly React.ReactNode[];
  style?: StyleProp<ViewStyle>;
};

const SLOT_KEYS = ['fs-slot-0', 'fs-slot-1', 'fs-slot-2', 'fs-slot-3', 'fs-slot-4', 'fs-slot-5'] as const;

/** Один слот каскада: opacity + translateY(10→0), settle без отскока. */
function CascadeSlot({
  index,
  visible,
  reduceMotion,
  children,
}: {
  index: number;
  visible: boolean;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(10);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = 0;
    y.value = 10;
    const delay = LUM.ladder[Math.min(index, LUM.ladder.length - 1)];
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withTiming(0, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function FullscreenHybridEntrance({ visible, bloomColor, slots, style }: Props) {
  const reduceMotion = useReduceMotion();
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      bloomOpacity.value = 0;
      return;
    }
    bloomOpacity.value = 0;
    bloomScale.value = 0.6;
    bloomOpacity.value = withTiming(0.5, { duration: LUM.bloomMs * 0.42, easing: Easing.out(Easing.cubic) }, () => {
      bloomOpacity.value = withTiming(0, { duration: LUM.bloomMs * 0.58, easing: Easing.out(Easing.cubic) });
    });
    bloomScale.value = withTiming(1.4, { duration: LUM.bloomMs, easing: Easing.out(Easing.cubic) });
    return () => {
      cancelAnimation(bloomOpacity);
      cancelAnimation(bloomScale);
    };
  }, [visible, reduceMotion, bloomOpacity, bloomScale]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));

  return (
    <View style={style}>
      <Animated.View pointerEvents="none" style={[styles.bloom, { backgroundColor: bloomColor }, bloomStyle]} />
      {slots.map((slot, index) => (
        <CascadeSlot key={SLOT_KEYS[Math.min(index, SLOT_KEYS.length - 1)]} index={index} visible={visible} reduceMotion={reduceMotion}>
          {slot}
        </CascadeSlot>
      ))}
    </View>
  );
}

export default memo(FullscreenHybridEntrance);

const styles = StyleSheet.create({
  bloom: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderRadius: 110,
  },
});
