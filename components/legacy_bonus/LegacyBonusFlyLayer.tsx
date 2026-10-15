// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusFlyLayer.tsx — слой «летящих монет» окна «Встречайте PhraseMan 2.0».
//
// зачем (макет Q9jqpBbjwJEFV1DpdEGx2h, flyCoin): из значения строки по дуге в большую монету летят шесть монет, по 70 мс друг за другом,
// 640 мс каждая (easeInOut cubic), с лёгким поворотом дуги в разные стороны; у монеты масштаб .4→1 за первые 18 % пути и 1→.5 в последних 20 %.
// Слой держит свой список монет в СОБСТВЕННОМ состоянии и управляется императивно (launch): шторка не перерисовывается на каждую монету.
// Движение — Reanimated (UI-тред), прилёт сообщается в JS один раз на монету.
// ═══════════════════════════════════════════════════════════════════════════
import { Image } from 'expo-image';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { HOME_RUNE_ICON_SOURCE } from '../home/homeRuneAsset';

export const LEGACY_BONUS_FLY_MS = 640;
export const LEGACY_BONUS_FLY_STAGGER_MS = 70;
const COIN = 18;

export type FlyPoint = Readonly<{ x: number; y: number }>;
export type FlyBatch = Readonly<{ from: FlyPoint; to: FlyPoint; count: number; onArrive: (index: number) => void }>;
export type LegacyBonusFlyLayerHandle = Readonly<{ launch: (batch: FlyBatch) => void; clear: () => void }>;

type CoinSpec = Readonly<{
  id: number;
  from: FlyPoint;
  to: FlyPoint;
  /** Контрольная точка дуги: в сторону (±) от середины пути и выше обеих точек. */
  control: FlyPoint;
  delayMs: number;
  onArrive: () => void;
}>;

/** Кривая macet easeInOut: t<.5 ? 4t³ : 1 − (−2t+2)³/2. */
const easeInOut = (t: number): number => {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function FlyCoin({ spec, onDone }: Readonly<{ spec: CoinSpec; onDone: (id: number) => void }>) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delayMs, withTiming(1, { duration: LEGACY_BONUS_FLY_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onDone)(spec.id);
    }));
  }, [onDone, spec.delayMs, spec.id, t]);
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const e = easeInOut(p);
    const u = 1 - e;
    const x = u * u * spec.from.x + 2 * u * e * spec.control.x + e * e * spec.to.x;
    const y = u * u * spec.from.y + 2 * u * e * spec.control.y + e * e * spec.to.y;
    const sc = p < 0.18 ? 0.4 + (p / 0.18) * 0.6 : 1 - Math.max(0, (p - 0.8) / 0.2) * 0.5;
    // до старта (p = 0, задержка) монета невидима — иначе вся шестёрка стояла бы кучкой у значения
    const opacity = p <= 0 ? 0 : p < 0.1 ? p / 0.1 : 1;
    return { opacity, transform: [{ translateX: x - COIN / 2 }, { translateY: y - COIN / 2 }, { scale: sc }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[s.coin, style]}>
      <Image source={HOME_RUNE_ICON_SOURCE} style={s.img} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

const LegacyBonusFlyLayer = forwardRef<LegacyBonusFlyLayerHandle>(function LegacyBonusFlyLayer(_props, ref) {
  const [coins, setCoins] = useState<readonly CoinSpec[]>([]);
  const idRef = useRef(0);
  const arriveRef = useRef(new Map<number, () => void>());

  const onDone = useCallback((id: number) => {
    arriveRef.current.get(id)?.();
    arriveRef.current.delete(id); // guard-ok: Map в памяти окна, не данные пользователя
    setCoins((cur) => cur.filter((c) => c.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    launch: (batch: FlyBatch) => {
      const next: CoinSpec[] = [];
      for (let k = 0; k < batch.count; k += 1) {
        const id = (idRef.current += 1);
        const side = k % 2 ? 1 : -1;
        const control: FlyPoint = {
          x: (batch.from.x + batch.to.x) / 2 + side * (70 + Math.random() * 40),
          y: Math.min(batch.from.y, batch.to.y) - 30 - Math.random() * 30,
        };
        const onArrive = (): void => batch.onArrive(k);
        arriveRef.current.set(id, onArrive); // guard-ok: Map в памяти окна, не данные пользователя
        next.push({ id, from: batch.from, to: batch.to, control, delayMs: k * LEGACY_BONUS_FLY_STAGGER_MS, onArrive });
      }
      setCoins((cur) => [...cur, ...next]);
    },
    clear: () => { arriveRef.current.clear(); setCoins([]); },
  }), []);

  return (
    <View pointerEvents="none" style={s.layer}>
      {coins.map((spec) => <FlyCoin key={spec.id} spec={spec} onDone={onDone} />)}
    </View>
  );
});

const s = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coin: { position: 'absolute', top: 0, left: 0, width: COIN, height: COIN },
  img: { width: COIN, height: COIN },
});

export default memo(LegacyBonusFlyLayer);
