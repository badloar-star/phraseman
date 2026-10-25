/**
 * [SPIRE-GOLD] Награда «золотого задания»: плашка «+N» в шапке ступени и две монеты, летящие к ней от «×2»
 * (живой макет docs/design/v2-app/spire-step-live.html, сцена «Золотое задание ×2»; координатор 25.10 — доделка ec03e9e58).
 *
 * зачем: верный ответ на золотом задании должен «звенеть» и визуально — плашка выходит из 0,9 (180 мс), две монеты летят по
 * дуге (420 мс, вторая с задержкой 80 мс), с каждой цифра подрастает (+ставка → +2 ставки), плашка подпрыгивает 1 → 1,08 → 1
 * (200 мс) и через 1,7 с тает (220 мс). Только transform/opacity на UI-треде (reanimated), слой не ловит касания.
 * «Уменьшить движение» — без полёта: плашка сразу с итоговой цифрой. Вибрация и звон — в use_spire_gold (событие награды).
 * Ставка ступени — из конфига Пика в памяти (peekSpireConfig), без сети.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { HOME_RUNE_ICON_SOURCE } from '../home/homeRuneAsset';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';

export type SpireGoldLaunch = Readonly<{ seq: number; x: number; y: number }>;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const COIN = 32;

type Pt = Readonly<{ x: number; y: number }>;

function Coin({ from, to, delay, onLand }: Readonly<{ from: Pt; to: Pt; delay: number; onLand: () => void }>) {
  const t = useSharedValue(0);
  const landRef = useRef(onLand); landRef.current = onLand;
  // зачем: полёт стартует один раз на монету — перерисовка плашки (новая цифра) не должна перезапускать дугу
  useEffect(() => {
    const fire = () => landRef.current();
    t.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }, (done) => { if (done) runOnJS(fire)(); }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p1 = { x: from.x + 40, y: from.y - 90 };
  const p2 = { x: to.x + 80, y: to.y + 50 };
  const style = useAnimatedStyle(() => {
    const k = t.value;
    const u = 1 - k;
    const x = u * u * u * from.x + 3 * u * u * k * p1.x + 3 * u * k * k * p2.x + k * k * k * to.x;
    const y = u * u * u * from.y + 3 * u * u * k * p1.y + 3 * u * k * k * p2.y + k * k * k * to.y;
    return { opacity: k > 0 && k < 0.92 ? 1 : 0, transform: [{ translateX: x - COIN / 2 }, { translateY: y - COIN / 2 }, { scale: 1 - 0.25 * k }] }; // guard-ok: масштаб монеты в полёте, не баланс
  });
  return <Animated.View pointerEvents="none" style={[s.coin, style]}><Image source={HOME_RUNE_ICON_SOURCE} style={s.coinImg} contentFit="cover" accessible={false} /></Animated.View>;
}

function bump(v: SharedValue<number>): void {
  v.value = withSequence(withTiming(1.08, { duration: 100, easing: EASE_OUT }), withTiming(1, { duration: 100, easing: EASE_OUT }));
}

function SpireGoldReward({ launch, perStep, top, right }: Readonly<{ launch: SpireGoldLaunch | null; perStep: number; top: number; right: number }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const reduce = useReducedMotion();
  const rootRef = useRef<View>(null);
  const chipRef = useRef<View>(null);
  const [flight, setFlight] = useState<Readonly<{ seq: number; from: Pt; to: Pt }> | null>(null);
  const [value, setValue] = useState(perStep);
  const chip = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!launch) return;
    setValue(reduce ? perStep * 2 : perStep);
    chip.value = withSequence(withTiming(1, { duration: 180, easing: EASE_OUT }), withDelay(reduce ? 2000 : 2400, withTiming(0, { duration: 220 })));
    if (reduce) { console.log(`[SPIRE-GOLD] награда без полёта (Уменьшить движение): +${perStep * 2}`); return; } // guard-ok: ветка показа
    // координаты: и «×2», и плашка — в окне; слой награды тоже меряем в окне, чтобы перевести в свои
    rootRef.current?.measureInWindow((rx, ry) => {
      chipRef.current?.measureInWindow((cx, cy, cw, chh) => {
        const to = { x: cx - rx + 6 + 13, y: cy - ry + chh / 2 };
        const from = { x: launch.x - rx, y: launch.y - ry };
        console.log(`[SPIRE-GOLD] полёт монет: от (${Math.round(from.x)},${Math.round(from.y)}) к (${Math.round(to.x)},${Math.round(to.y)}) ширина плашки ${Math.round(cw)}`); // guard-ok: трасса полёта
        setFlight({ seq: launch.seq, from, to });
      });
    });
  }, [chip, launch, perStep, reduce]);

  const land = (amount: number) => () => { setValue(amount); bump(scale); };
  const chipStyle = useAnimatedStyle(() => ({ opacity: chip.value, transform: [{ scale: (0.9 + 0.1 * Math.min(1, chip.value)) * scale.value }] }));

  if (!launch) return null;
  return (
    <View ref={rootRef} pointerEvents="none" style={StyleSheet.absoluteFill} testID="spire-gold-reward">
      <Animated.View ref={chipRef} style={[s.chip, { top, right, backgroundColor: p.control }, sh.nested, chipStyle]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Image source={HOME_RUNE_ICON_SOURCE} style={s.chipImg} contentFit="cover" accessible={false} />
        <Text style={[s.chipText, { color: p.text }]}>{`+${value}`}</Text>
      </Animated.View>
      {flight ? (
        <>
          <Coin key={`${flight.seq}:a`} from={flight.from} to={flight.to} delay={0} onLand={land(Math.round(perStep * 1.5))} />
          <Coin key={`${flight.seq}:b`} from={flight.from} to={flight.to} delay={80} onLand={land(perStep * 2)} />
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { position: 'absolute', height: 37, borderRadius: 19, paddingLeft: 6, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipImg: { width: 26, height: 26, borderRadius: 13 },
  chipText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  coin: { position: 'absolute', left: 0, top: 0, width: COIN, height: COIN, borderRadius: COIN / 2, overflow: 'hidden' },
  coinImg: { width: COIN, height: COIN },
});

export default memo(SpireGoldReward);
