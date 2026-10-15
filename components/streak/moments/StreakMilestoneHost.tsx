// ═══════════════════════════════════════════════════════════════════════════
// StreakMilestoneHost.tsx — окно рубежа серии поверх итога урока, разговора, карточек и «Моих ошибок».
//
// зачем (координатор 15.10): подключение рубежей к настоящему событию роста серии. Экран грузит этот файл ЛЕНИВО и только когда есть ожидающий рубеж
// (streak_milestone_pending) при включённом moments_v3 — в бандле запуска ничего нового нет. Решение принимает streak_milestone_gate (флаг, сегодняшний день,
// число дней — поздравление только фактом) + «уже показан на диске» (streak_milestone_shown_store: после перезапуска тот же рубеж не повторяется).
// Тост (малый рубеж) — наложением без блокировки касаний, сцены — в Modal. Очередь: пока рубеж ожидает или открыт, остальные моменты экрана ждут
// (useStreakMilestoneHold); «открыто» ставится ДО того, как ожидающий забран, — пауза не мигает.
// Журнал: [STREAK-MILESTONE] — решение (рубеж, день, сегодня, флаг, диск, причина), показ, закрытие.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { getLocalDayKey } from '../../../app/local_date';
import { consumeStreakMilestonePending, markStreakMilestoneOpen, peekStreakMilestonePending } from '../../../app/streak_milestone_pending';
import { markStreakMilestoneShownOnDisk, wasStreakMilestoneShown } from '../../../app/streak_milestone_shown_store';
import { peekStreakDayState } from '../../../app/streak_day_signal';
import { useMyCoinRank } from '../../../hooks/use_my_coin_rank';
import { useFireOnce } from '../../moments/use_fire_once';
import StreakMilestoneMoment from './StreakMilestoneMoment';
import { decideStreakMilestone } from './streak_milestone_gate';
import { streakMomentKind, type StreakMilestone } from './streak_milestones';

export type StreakMilestoneHostProps = Readonly<{
  lang: Lang;
  onOpenChange?: (open: boolean) => void;
}>;

function StreakMilestoneHost({ lang, onOpenChange }: StreakMilestoneHostProps) {
  const coinRank = useMyCoinRank();
  const fire = useFireOnce('STREAK-MILESTONE-HOST');
  const [milestone, setMilestone] = useState<StreakMilestone | null>(null);
  const [open, setOpen] = useState(false);
  const openedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pending = peekStreakMilestonePending();
      const today = getLocalDayKey();
      const decision = decideStreakMilestone({ momentsV3: true, pending, today, fact: peekStreakDayState() });
      let show = decision.show;
      let reason = decision.reason;
      const key = pending ? `${pending.days}:${pending.dayKey}` : null;
      if (decision.show && key !== null && await wasStreakMilestoneShown(key)) {
        show = false;
        reason = `already_shown_on_disk key=${key}`;
      }
      if (cancelled) return;
      console.log(`[STREAK-MILESTONE] gate: рубеж=${pending ? pending.days : 'нет'} день=${pending ? pending.dayKey : '—'} сегодня=${today} флаг=true решение=${show ? 'показать' : 'не показывать'} причина=${reason}`); // guard-ok: журнал решения [STREAK-MILESTONE] нужен и в сборке (правило владельца: логи на ветвлениях)
      if (show && decision.show && key !== null) {
        // зачем (Дизайн 15.10): пауза для окон m09/m17 не должна мигать — сначала «открыто», потом забираем ожидающий (hold непрерывно true)
        markStreakMilestoneOpen(decision.milestone);
        openedRef.current = true;
        consumeStreakMilestonePending();
        void markStreakMilestoneShownOnDisk(key);
        setMilestone(decision.milestone);
        setOpen(true);
        onOpenChange?.(true);
        console.log(`[STREAK-MILESTONE] показ рубеж=${decision.milestone} вид=${streakMomentKind(decision.milestone)} монета=${String(coinRank)}`); // guard-ok: единичный журнал показа
      } else {
        // устаревший или уже показанный рубеж не должен висеть и держать другие окна
        consumeStreakMilestonePending();
      }
    })();
    return () => {
      cancelled = true;
      if (openedRef.current) {
        openedRef.current = false;
        markStreakMilestoneOpen(null);
        onOpenChange?.(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: решение принимается один раз на показ
  }, []);

  const done = useCallback(() => {
    fire(() => {
      console.log(`[STREAK-MILESTONE] закрыто рубеж=${String(milestone)}`); // guard-ok: единичный журнал закрытия
      setOpen(false);
      if (openedRef.current) {
        openedRef.current = false;
        markStreakMilestoneOpen(null);
        onOpenChange?.(false);
      }
    }, 'done');
  }, [fire, milestone, onOpenChange]);

  if (!open || milestone === null) return null;
  const moment = <StreakMilestoneMoment lang={lang} milestone={milestone} coinRank={coinRank} onDone={done} />;
  if (streakMomentKind(milestone) === 'toast') {
    return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{moment}</View>;
  }
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={done}>
      {moment}
    </Modal>
  );
}

export default memo(StreakMilestoneHost);
