// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusTotalCounter.tsx — большое число «Итого» окна «Встречайте PhraseMan 2.0».
//
// зачем (макет Q9jqpBbjwJEFV1DpdEGx2h, bumpTarget): каждая прилетевшая монета перезапускает отсчёт от текущего значения, цифра бежит
// непрерывно — easeOutExpo за 900 мс, расчёт по времени (не по кадрам), поэтому просадки fps не растягивают счёт. Число и подпись-слово
// живут ЗДЕСЬ, в собственном состоянии: перерисовывается только этот маленький узел, а не шторка (аудит скорости окон моментов, 15.10).
// Управление — императивно (ref.bump / ref.settle), чтобы летящие монеты не гоняли состояние родителя.
// ═══════════════════════════════════════════════════════════════════════════
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { easeOutExpo, formatBonusNumber } from '../../modules/legacy_bonus/legacy_bonus_view';
import { legacyBonusCoinWord } from '../../modules/legacy_bonus/legacy_bonus_strings';

/** Длительность отсчёта между «подпрыгиваниями» цели (макет COUNT_DUR). */
export const LEGACY_BONUS_COUNT_MS = 900;
const TICK_MS = 33;

export type LegacyBonusTotalCounterHandle = Readonly<{
  /** Прилетела монета: поднять цель на add, отсчёт идёт от текущего значения. */
  bump: (add: number) => void;
  /** Показать итог сразу (уменьшить движение / повторный показ). */
  settle: (value: number) => void;
}>;

type Props = Readonly<{
  lang: Lang;
  /** Итог — к нему сходится счётчик; вызывается один раз, когда цель достигнута и больше не растёт. */
  total: number;
  onReachedTotal: () => void;
  color: string;
  unitColor: string;
  testID?: string;
}>;

const LegacyBonusTotalCounter = forwardRef<LegacyBonusTotalCounterHandle, Props>(function LegacyBonusTotalCounter(
  { lang, total, onReachedTotal, color, unitColor, testID = 'legacy-bonus-total' },
  ref,
) {
  const [shown, setShown] = useState(0);
  const targetRef = useRef(0);
  const anchorRef = useRef(0);
  const shownRef = useRef(0);
  const t0Ref = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reachedRef = useRef(false);
  const onReachedRef = useRef(onReachedTotal);
  onReachedRef.current = onReachedTotal;

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const put = useCallback((value: number) => {
    shownRef.current = value;
    setShown(value);
  }, []);

  const tick = useCallback(() => {
    const p = Math.min(1, (Date.now() - t0Ref.current) / LEGACY_BONUS_COUNT_MS);
    if (p >= 1) {
      stop();
      put(targetRef.current);
      if (targetRef.current >= total && !reachedRef.current) {
        reachedRef.current = true;
        console.log(`[LEGACY-BONUS] счётчик дошёл до итога ${targetRef.current}`); // guard-ok: одна строка на показ
        onReachedRef.current();
      }
      return;
    }
    put(Math.round(anchorRef.current + (targetRef.current - anchorRef.current) * easeOutExpo(p)));
  }, [put, stop, total]);

  useImperativeHandle(ref, () => ({
    bump: (add: number) => {
      targetRef.current += add;
      anchorRef.current = shownRef.current;
      t0Ref.current = Date.now();
      if (!timerRef.current) timerRef.current = setInterval(tick, TICK_MS);
    },
    settle: (value: number) => {
      stop();
      targetRef.current = value;
      anchorRef.current = value;
      reachedRef.current = true;
      put(value);
    },
  }), [put, stop, tick]);

  useEffect(() => stop, [stop]);

  return (
    <>
      <Text style={[s.num, { color }]} testID={testID} accessibilityLabel={`${formatBonusNumber(shown)} ${legacyBonusCoinWord(lang, shown)}`}>
        {formatBonusNumber(shown)}
      </Text>
      <Text style={[s.unit, { color: unitColor }]}>{legacyBonusCoinWord(lang, shown)}</Text>
    </>
  );
});

const s = StyleSheet.create({
  // макет `.hnum .num`: 34/40, 800, −0.6, цифры одной ширины
  num: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  // `.hnum .unit`: 13/18, поднят на 2
  unit: { fontSize: 13, lineHeight: 18, marginTop: -2 },
});

export default memo(LegacyBonusTotalCounter);
