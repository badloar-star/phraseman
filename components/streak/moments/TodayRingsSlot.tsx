// TodayRingsSlot.tsx — кольца дня на экране «Сегодня» (/today_tasks; с 17.10 — не на Главной): показываются только за флагом moments_v3 (выключен → null, ничего не стоит).
// зачем (координатор 14.10): кольца = три задачи блока «Сегодня» (урок, ступени Пика, карточки), монета ранга в центре; числа берутся из тех же задач, что строки блока —
// ничего не пишется и не начисляется. Монета и язык читаются только когда флаг включён (внутренний компонент), чтобы выключенный флаг не добавлял подписок на Главной.
import React, { memo, useEffect } from 'react';
import { useLang } from '../../LangContext';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { isValidCoinRank } from '../../../app/coin_rank_table_v1';
import TodayRings, { type TodayRingSize } from './TodayRings';
import { useMomentsV3Enabled } from './use_moments_v3_flag';

export type TodayRingsTask = Readonly<{ progress: number; target: number }>;
type SlotProps = Readonly<{ tasks: readonly TodayRingsTask[]; fromProgress?: readonly [number, number, number]; size?: TodayRingSize; showDayDone?: boolean }>;

const Inner = memo(function Inner({ tasks, fromProgress, size, showDayDone }: SlotProps) {
  const { lang } = useLang();
  const rank = useMyCoinRank();
  // зачем (координатор 15.10, сценарий Сверки моментов v3): что нарисовали кольца m11 — одна строка на смену чисел
  const ringsKey = tasks.map((task) => `${task.progress}/${task.target}`).join(',');
  useEffect(() => {
    console.log('[MOMENT-m11] rings', JSON.stringify({ tasks: ringsKey, drawn: tasks.length >= 3, coinRank: rank ?? null })); // guard-ok: одна строка на смену чисел
  }, [ringsKey, rank, tasks.length]);
  if (tasks.length < 3) return null; // колец три — меньше задач нечего рисовать честно
  const t = tasks;
  return (
    <TodayRings
      lang={lang}
      progress={[t[0].progress, t[1].progress, t[2].progress]}
      fromProgress={fromProgress}
      size={size}
      showDayDone={showDayDone}
      targets={[Math.max(1, t[0].target), Math.max(1, t[1].target), Math.max(1, t[2].target)]}
      coinRank={isValidCoinRank(rank) ? rank : null}
    />
  );
});

function TodayRingsSlot({ tasks, fromProgress, size, showDayDone }: SlotProps) {
  const on = useMomentsV3Enabled();
  return on ? <Inner tasks={tasks} fromProgress={fromProgress} size={size} showDayDone={showDayDone} /> : null;
}

export default memo(TodayRingsSlot);
