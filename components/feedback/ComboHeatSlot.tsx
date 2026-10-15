// ═══════════════════════════════════════════════════════════════════════════
// ComboHeatSlot.tsx — m08 «Молния» в шапке урока: кольцо серии «греется» на 3 → 5 → 10, над ним плашка «N подряд», на 10 — встряска, при ошибке — «серия сброшена».
//
// зачем (владелец 15.10: «ДА ДЕЛАЙ, НА КОЛЬЦЕ»): в эталоне греется сплошная полоска прогресса, а в уроке прогресс — сетка ячеек; поэтому эффекты эталона перенесены на кольцо
// серии, которое уже стоит в шапке. Цвет нагрева по эталону (app.css `.heat`): «Искра» — акцент, «Молния» — тёплый (золото темы), «Гроза» — горячий (цвет ошибки темы).
// Без флага кольцо в шапке прежнее (появляется с 3 подряд и исчезает при ошибке); этот блок грузится require'ом только при moments_v3 и после обрыва держит «серия сброшена»
// ещё 1,6 с. Звук порога уже играет ComboRing (lightning), здесь только хаптик. reduced-motion — без встряски и пружины. Журнал [MOMENT-m08].
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { Lang } from '../../constants/i18n';
import { comboLevelFor } from '../../app/feedback/combo_engine';
import { hapticHeavyImpact, hapticLightImpact, hapticMediumImpact } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';
import ComboRing from './ComboRing';
import { COMBO_MOMENT_LOG, COMBO_MOMENT_TIMELINE as T, COMBO_TRACE, deriveComboBeat, type ComboBeat } from './combo_moment_gate';
import { comboMomentText } from './combo_moment_strings';

const EASE_POP = Easing.bezier(0.3, 1.6, 0.5, 1);

function haptic(beat: ComboBeat): void {
  const run = beat === 'storm' ? hapticHeavyImpact : beat === 'lightning' ? hapticMediumImpact : hapticLightImpact;
  run().catch((error: unknown) => console.warn(`${COMBO_MOMENT_LOG} хаптик ${beat} не сработал (${error instanceof Error ? error.message : String(error)})`)); // guard-ok: причина отказа хаптика
}

export type ComboHeatSlotProps = Readonly<{ comboCount: number; lang: Lang; size?: number }>;

function ComboHeatSlot({ comboCount, lang, size = 34 }: ComboHeatSlotProps) {
  const { theme: t } = useTheme();
  const reduced = useReducedMotion();
  const prevRef = useRef(comboCount);
  const [broken, setBroken] = useState<number | null>(null);
  const [tipKey, setTipKey] = useState(0);
  const tip = useSharedValue(comboCount >= 3 ? 1 : 0);
  const shake = useSharedValue(0);
  // зачем (Ревизор 15.10, баг «серия сброшена» залипает): таймер снятия надписи живёт в ref, а не в cleanup эффекта — иначе следующий
  // быстрый ответ (0 → 1) отменял таймер и выходил рано, надпись оставалась в шапке. Сбрасывает его только новый удар или размонтирование.
  const brokenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (brokenTimerRef.current === null) return;
    clearTimeout(brokenTimerRef.current);
    brokenTimerRef.current = null;
    console.log(`${COMBO_TRACE} кольцо: таймер «серия сброшена» отменён — урок закрыт (размонтирование)`); // guard-ok: журнал отмены таймера
  }, []);
  const clearBrokenTimer = (why: ComboBeat) => {
    if (brokenTimerRef.current === null) return;
    clearTimeout(brokenTimerRef.current);
    brokenTimerRef.current = null;
    console.log(`${COMBO_TRACE} кольцо: таймер «серия сброшена» отменён — ${why === 'break' ? 'повторный обрыв' : `новая серия, удар «${why}»`}`); // guard-ok: журнал отмены таймера
  };

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = comboCount;
    const beat = deriveComboBeat(prev, comboCount);
    if (!beat) {
      if (prev !== comboCount) console.log(`${COMBO_TRACE} кольцо: ${prev} → ${comboCount} без удара — «серия сброшена» ${brokenTimerRef.current ? 'дожидается своего таймера' : 'не показана'}`); // guard-ok: ранний выход логируется
      return;
    }
    console.log(`${COMBO_MOMENT_LOG} серия ${prev} → ${comboCount}: удар «${beat}» reducedMotion=${String(reduced)}`); // guard-ok: журнал удара
    haptic(beat);
    setTipKey((k) => k + 1);
    tip.value = reduced ? 1 : withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: T.tipPop, easing: EASE_POP }));
    if (beat === 'storm' && !reduced) {
      const q = T.shake / 5;
      shake.value = withSequence(withTiming(-5, { duration: q }), withTiming(5, { duration: q }), withTiming(-3, { duration: q }), withTiming(3, { duration: q }), withTiming(0, { duration: q }));
    }
    if (beat !== 'break') {
      clearBrokenTimer(beat);
      setBroken(null);
      return;
    }
    clearBrokenTimer(beat);
    setBroken(prev);
    console.log(`${COMBO_TRACE} кольцо: показ «серия сброшена» (была ${prev}) на ${T.brokenHold} мс`); // guard-ok: журнал показа
    brokenTimerRef.current = setTimeout(() => {
      brokenTimerRef.current = null;
      setBroken(null);
      console.log(`${COMBO_TRACE} кольцо: «серия сброшена» снята по таймеру`); // guard-ok: журнал скрытия
    }, T.brokenHold);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: удар решается только сменой серии
  }, [comboCount]);

  const tipStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, tip.value * 1.4), transform: [{ scale: 0.4 + 0.6 * tip.value }] }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  if (comboCount < 3 && broken == null) return null;
  const level = comboLevelFor(comboCount);
  // зачем (эталон `.heat.h1/h2/h3`): акцент → тёплый → горячий; токены темы, работает во всех темах
  const heat = level >= 3 ? t.wrong : level >= 2 ? t.gold : (t.accentGraphic ?? t.accent);
  const label = broken != null ? comboMomentText(lang, 'broken') : comboMomentText(lang, 'inRow', comboCount);
  return (
    <Reanimated.View style={[s.wrap, shakeStyle]} testID="lesson1-combo-heat" accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <ComboRing value={broken != null ? 0 : comboCount} level={broken != null ? 0 : level} size={size} heatColor={broken != null ? t.textMuted : heat} />
      <Reanimated.View key={tipKey} pointerEvents="none" style={[s.tip, { top: size + 4, backgroundColor: t.bgSurface2 ?? t.bgCard }, tipStyle]}>
        <Text numberOfLines={1} style={[s.tipText, { color: t.textPrimary }]} testID="lesson1-combo-tip">{label}</Text>
      </Reanimated.View>
    </Reanimated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', zIndex: 5 },
  // `.heat .tip`: padding 4/9, радиус 10, 12/800, без переноса
  tip: { position: 'absolute', paddingVertical: 4, paddingHorizontal: 9, borderRadius: 10 },
  tipText: { fontSize: 13, lineHeight: 17, fontWeight: '800' }, // D145: шкала 13/16 (в эталоне 12)
});

export default memo(ComboHeatSlot);
