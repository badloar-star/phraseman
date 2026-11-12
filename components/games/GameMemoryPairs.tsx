/**
 * Пары игры «Память» — из макета в точности (docs/design/v2-app/elevate-games.js:16–20, elevate-extra.css:160–164,
 * elevate-light.css:33). Четыре карточки сеткой 2×2 поднимаются лесенкой по 70 мс; через 3200 мс у всех переводов
 * размытие 9 px и прозрачность .5 (переход 500 мс), карточки остаются целиком видны, а спрошенная подсвечивается
 * тоном темы; после ответа переводы снова чёткие. Числа — constants/gameMotion.ts (GAME_MOTION_EXTRA).
 *
 * зачем два слоя текста: у текста в React Native нет фильтра размытия. Чёткий слой гаснет, размытый проявляется —
 * это и есть переход `filter + opacity` за 500 мс. Размытый слой — копии перевода, разнесённые кольцами до 9 px
 * (дискретное приближение размытия по Гауссу), одинаково на Android и iOS.
 * Отвергнуто на эмуляторе 12.11: тень прозрачного текста — Android рисует буквы чёткими, перевод читался.
 */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import GameRise from './GameRise';
import { V2Card } from '../v2/V2Kit';
import { useV2Palette } from '../v2/useV2Palette';
import { GAME_EASE, GAME_MOTION, GAME_MOTION_EXTRA as M } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

const HIDE_EASE = Easing.bezier(GAME_EASE.ease[0], GAME_EASE.ease[1], GAME_EASE.ease[2], GAME_EASE.ease[3]);

/**
 * Копии для размытия: центр и два кольца по 8 направлений на трети и двух третях радиуса 9.
 * Вес копии убывает от центра, как у Гаусса; сумма весов ≈ 1, поэтому общая плотность как у одного слоя текста.
 */
const SMEAR = (() => {
  const rings = [
    { r: 0, n: 1, w: 0.16 },
    { r: M.memoryBlurPx / 3, n: 8, w: 0.06 },
    { r: (M.memoryBlurPx * 2) / 3, n: 8, w: 0.045 },
  ];
  return rings.flatMap(({ r, n, w }) => Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n + (r > 3 ? Math.PI / 8 : 0);
    return { dx: Math.round(Math.cos(a) * r * 10) / 10, dy: Math.round(Math.sin(a) * r * 10) / 10, w };
  }));
})();

type CardProps = Readonly<{ left: string; right: string; index: number; hidden: boolean; asked: boolean }>;

const PairCard = memo(function PairCard({ left, right, index, hidden, asked }: CardProps) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const h = useSharedValue(0);

  useEffect(() => {
    h.value = withTiming(hidden ? 1 : 0, { duration: reduceMotion ? 0 : M.memoryHideMs, easing: HIDE_EASE });
  }, [h, hidden, reduceMotion]);

  const sharpStyle = useAnimatedStyle(() => ({ opacity: 1 - h.value }));
  const blurStyle = useAnimatedStyle(() => ({ opacity: M.memoryHideOpacity * h.value }));

  return (
    <GameRise delayMs={index * GAME_MOTION.answerStaggerMs} style={s.slot}>
      <V2Card seed={index} radius={20} style={s.card}>
        {/* `.mem .mc.ask` — спрошенная карточка светлее (в светлой теме макета #DCE6F6 — тон темы) */}
        {asked ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.askTone, { backgroundColor: p.accentSoft }]} /> : null}
        <Text style={[s.left, { color: p.text }]}>{left}</Text>
        <View style={s.rightBox} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>
          <Reanimated.Text style={[s.right, { color: p.textSecondary }, sharpStyle]}>{right}</Reanimated.Text>
          <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, blurStyle]}>
            {SMEAR.map(({ dx, dy, w }, k) => (
              <Text key={`smear-${k}`} style={[s.right, s.smear, { color: p.textSecondary, opacity: w, transform: [{ translateX: dx }, { translateY: dy }] }]}>{right}</Text>
            ))}
          </Reanimated.View>
        </View>
      </V2Card>
    </GameRise>
  );
});

type Props = Readonly<{
  pairs: readonly (readonly [string, string])[];
  askIndex: number;
  /** Идёт ответ — переводы скрыты; ответ дан — снова видны. */
  answering: boolean;
  answered: boolean;
}>;

function GameMemoryPairs({ pairs, askIndex, answering, answered }: Props) {
  // зачем: в макете пары прячутся через 3200 мс показа — за 400 мс до вариантов, а не в момент их появления
  const [shownLongEnough, setShownLongEnough] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShownLongEnough(true), M.memoryHideAtMs);
    return () => clearTimeout(id);
  }, []);
  const asked = shownLongEnough || answering || answered;
  const hidden = !answered && (shownLongEnough || answering);

  return (
    <View style={s.grid}>
      {pairs.map(([left, right], i) => (
        <PairCard key={left} left={left} right={right} index={i} hidden={hidden} asked={asked && i === askIndex} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  // `.mem { grid 1fr 1fr; gap 10 }`, `.mc { height 86; radius 20; padding 12 14 }`, `b 18/800`, `span 14, отступ 3`
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot: { width: '48%', flexGrow: 1 },
  card: { height: 86, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center' },
  askTone: { borderRadius: 20 },
  left: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  rightBox: { marginTop: 3 },
  right: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  smear: { position: 'absolute', left: 0, top: 0 },
});

export default memo(GameMemoryPairs);
