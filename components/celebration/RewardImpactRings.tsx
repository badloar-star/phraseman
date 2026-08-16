// ─── Кольца + пыль удара — общий визуал для celebration-гибрида ────────────
// зачем: макет M3 «Сундук-награда» — ringsAndDust(x, n): 2 расширяющихся кольца
// + N частиц-View, разлетающихся веером. ≤12 частиц, isLowEndDevice→0 (закон
// владельца о частицах). Кольца/пыль сами не анимируются здесь — get styles
// приходят из useRewardImpactHybrid (ring0Style/ring1Style), пыль анимирует себя
// один раз при монтировании (короткий одноразовый разлёт, не цикл).
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

function DustMote({ index, total, color }: { index: number; total: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [progress]);

  const angle = -Math.PI + (index / Math.max(1, total - 1)) * Math.PI;
  const dist = 42 + (index % 4) * 20;
  const toX = Math.cos(angle) * dist;
  const toY = Math.sin(angle) * dist * 0.5 + 38;

  const style = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - progress.value),
    transform: [
      { translateX: toX * progress.value },
      { translateY: toY * progress.value },
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.mote, { backgroundColor: color }, style]} />;
}

interface RewardImpactRingsProps {
  show: boolean;
  dustCount: number;
  color: string;
  // зачем: тип пружинного стиля из useAnimatedStyle конфликтует с web-CSS
  // типами reanimated при явной аннотации (тот же паттерн, что и в
  // LeagueChestSlitOpen.tsx) — StyleProp<ViewStyle> принимает то, что реально
  // возвращает хук в RN-рантайме, без строгой связки к типу хука.
  ring0Style: StyleProp<ViewStyle>;
  ring1Style: StyleProp<ViewStyle>;
}

function RewardImpactRingsBase({ show, dustCount, color, ring0Style, ring1Style }: RewardImpactRingsProps) {
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.ring, { borderColor: color }, ring0Style]} />
      <Animated.View style={[styles.ring, { borderColor: color }, ring1Style]} />
      {Array.from({ length: dustCount }, (_, i) => (
        // guard-ok: фиксированный разовый разлёт частиц, список не переупорядочивается
        // и не вставляется — индекс как key безопасен (не карточки/строки данных).
        <DustMote key={i} index={i} total={dustCount} color={color} />
      ))}
    </View>
  );
}

export default memo(RewardImpactRingsBase);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 92,
    height: 92,
    marginLeft: -46,
    marginTop: -46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    // guard-ok: это не рамка контейнера — сама анимация «расширяющееся кольцо
    // удара» из макета M3 (ringsAndDust), контур И ЕСТЬ контент, не разделитель.
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
  },
  mote: {
    position: 'absolute',
    top: 46,
    left: 46,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
