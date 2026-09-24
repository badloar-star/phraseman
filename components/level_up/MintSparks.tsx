// ─── Церемония «Монетный двор» · искры металла при чеканке ───────────────────
// зачем (PM-077): короткие тёплые штрихи вылетают из точки удара и оседают — эталон
// variant-b.html. Параметры каждой искры считаются один раз (buildMintSparks), в кадре
// меняются только transform/opacity на UI-потоке.
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { type MintSpark, sampleSpark } from './level_up_mint_timeline';

type SparkProps = Readonly<{ spark: MintSpark; clock: SharedValue<number>; size: number; color: string }>;

const Spark = memo(function Spark({ spark, clock, size, color }: SparkProps) {
  const style = useAnimatedStyle(() => {
    const s = sampleSpark(spark, clock.value);
    return {
      opacity: s.opacity,
      transform: [
        { translateX: s.x * size },
        { translateY: s.y * size },
        { rotate: `${spark.angle}rad` },
        { scaleX: s.stretch },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.spark,
        { width: spark.len, height: spark.thick, marginLeft: -spark.len / 2, marginTop: -spark.thick / 2, backgroundColor: color },
        style,
      ]}
    />
  );
});

type Props = Readonly<{
  sparks: readonly MintSpark[];
  clock: SharedValue<number>;
  size: number;
  color: string;
  cx: number;
  cy: number;
}>;

function MintSparks({ sparks, clock, size, color, cx, cy }: Props) {
  return (
    <View style={[styles.origin, { left: cx, top: cy }]} pointerEvents="none">
      {/* ключ по позиции осознанно: массив фиксированной длины, не сортируется и не вставляется */}
      {sparks.map((spark, i) => <Spark key={`spark-${i}`} spark={spark} clock={clock} size={size} color={color} />)}{/* guard-ok */}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0 },
  spark: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 2,
    // Тёплое свечение штриха (на Android цветная тень не рисуется — там искра просто светлая).
    shadowColor: 'rgb(255,190,120)',
    shadowOpacity: 0.7,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default memo(MintSparks);
