// ─── Церемония «Монетный двор» · монета с флипом (и её отражение) ────────────
// зачем (PM-077): флип сделан в 2.5D, как предписано COIN_ASSET_PROMPTS.md
// («ребро и вращение делаются в коде (scaleX)»): грань сжимается по ширине на |cos θ|,
// а ребро — эллипсы цвета металла между передней и задней гранью, сдвинутые на
// (толщина/2)·sin θ. Так флип одинаков на iOS и Android и не зависит от капризов
// backfaceVisibility. Отражение — тот же компонент с mirrored: зеркальные знаки по Y.
import React, { memo } from 'react';
import { type ImageSourcePropType, StyleSheet } from 'react-native';
import Animated, { type DerivedValue, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import CoinFaceArt from './CoinFaceArt';
import type { CoinMetal } from './coin_metal_palette';
import { MINT_TIMELINE, type MintFrame } from './level_up_mint_timeline';

/** Толщина монеты относительно диаметра (14 px при 220 px в эталоне). */
export const MINT_COIN_DEPTH = 0.064;
const DEG = Math.PI / 180;

type Props = Readonly<{
  frame: DerivedValue<MintFrame>;
  /** 0…1…0 бесконечного парения после чеканки. */
  idle: SharedValue<number>;
  size: number;
  mirrored: boolean;
  fromMetal: CoinMetal;
  toMetal: CoinMetal;
  fromSource?: ImageSourcePropType;
  toSource?: ImageSourcePropType;
}>;

function MintCoin({ frame, idle, size, mirrored, fromMetal, toMetal, fromSource, toSource }: Props) {
  const k = mirrored ? -1 : 1;
  const half = (MINT_COIN_DEPTH * size) / 2;
  const fromEdge = fromMetal.lo;
  const toEdge = toMetal.lo;

  // Положение и масштаб всей монеты: подъём, кивок, наезд, чеканка, парение.
  const groupStyle = useAnimatedStyle(() => {
    const f = frame.value;
    const y = (f.coinY + idle.value * MINT_TIMELINE.idle.amp) * size * k;
    return {
      // perspective обязан идти первым, иначе RN применяет его не ко всем шагам трансформа.
      transform: [
        { perspective: 900 },
        { translateY: y },
        { rotateX: `${f.tiltDeg * k}deg` },
        { scaleX: f.coinScale },
        { scaleY: f.coinScale * k },
      ],
    };
  });

  // Передняя грань (текущий уровень) видна до ребра и смещена на +h.
  const oldFace = useAnimatedStyle(() => {
    const f = frame.value;
    const theta = f.flipDeg * DEG;
    return {
      opacity: 1 - f.newFaceOpacity,
      transform: [{ translateX: half * Math.sin(theta) }, { scaleX: Math.max(0.002, Math.abs(Math.cos(theta))) }],
    };
  });

  // Задняя грань (новый уровень) видна после ребра и смещена на -h.
  const newFace = useAnimatedStyle(() => {
    const f = frame.value;
    const theta = f.flipDeg * DEG;
    return {
      opacity: f.newFaceOpacity,
      transform: [{ translateX: -half * Math.sin(theta) }, { scaleX: Math.max(0.002, Math.abs(Math.cos(theta))) }],
    };
  });

  // Ребро: один эллипс на каждой грани и один посередине закрывают полосу между ними.
  // Цвет — металл той стороны, что сейчас смотрит на зрителя.
  const edgeFar = useAnimatedStyle(() => edgeFrame(frame.value, half, -1, fromEdge, toEdge));
  const edgeMid = useAnimatedStyle(() => edgeFrame(frame.value, half, 0, fromEdge, toEdge));
  const edgeNear = useAnimatedStyle(() => edgeFrame(frame.value, half, 1, fromEdge, toEdge));
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Animated.View style={[{ width: size, height: size }, groupStyle]} pointerEvents="none">
      <Animated.View style={[styles.layer, round, edgeFar]} />
      <Animated.View style={[styles.layer, round, edgeMid]} />
      <Animated.View style={[styles.layer, round, edgeNear]} />
      <Animated.View style={[styles.layer, oldFace]}>
        <CoinFaceArt metal={fromMetal} size={size} source={fromSource} />
      </Animated.View>
      <Animated.View style={[styles.layer, newFace]}>
        <CoinFaceArt metal={toMetal} size={size} source={toSource} />
      </Animated.View>
    </Animated.View>
  );
}

function edgeFrame(f: MintFrame, half: number, pos: number, fromEdge: string, toEdge: string) {
  'worklet';
  const theta = f.flipDeg * DEG;
  return {
    backgroundColor: f.newFaceOpacity >= 0.5 ? toEdge : fromEdge,
    // Ребро есть только пока монета повёрнута: в анфас оно целиком закрыто гранью.
    opacity: f.flipDeg > 0.5 && f.flipDeg < 179.5 ? 1 : 0,
    transform: [{ translateX: half * Math.sin(theta) * pos }, { scaleX: Math.max(0.002, Math.abs(Math.cos(theta))) }],
  };
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});

export default memo(MintCoin);
