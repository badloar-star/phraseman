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
import { useOverlayActiveKey, useOverlayVisible } from '../../OverlayArbiter';
import { decideStreakMilestoneShow, shouldRequestStreakMilestoneSlot } from './streak_milestone_slot';
import { useMemMomentsTrack } from '../../moments/mem_moments_probe';
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
    // зачем (аудит Optimistic UI 17.10, п.9): без try/catch сбой чтения диска оставлял рубеж «ожидающим» навсегда — он держал паузу остальных окон
    void (async () => {
      try {
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
      if (cancelled) {
        console.log('[STREAK-MILESTONE] gate:cancelled экран ушёл до решения'); // guard-ok: ранний выход
        return;
      }
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
      } catch (error: unknown) {
        console.warn('[STREAK-MILESTONE] gate:failed — рубеж снят, окна не держим', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
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

  // зачем (R129): окно рубежа размонтируется после закрытия — журнал [MEM-MOMENTS], только отладка
  useMemMomentsTrack('host:streak-milestone', open && milestone !== null, String(milestone));
  // зачем (владелец 05.11: два полноэкранных окна на одном кадре — «такое нельзя допускать»): рубеж серии (сцены в <Modal>) ждёт слот арбитра (ключ streakMilestone); малый рубеж-тост — наложение без блокировки касаний, слота не берёт.
  const isToast = milestone !== null && streakMomentKind(milestone) === 'toast';
  // зачем (владелец 11.11, аудит окон — «Итог урока»): на итоге урока слот очереди держит сам экран (lessonResultsSequence) и не отпускает,
  // пока рубеж не закрыт, — а рубеж ждал этот же слот: взаимное ожидание, окно не показывалось никогда. Слот экрана-родителя и есть
  // слот для его рубежа; решение и причина — streak_milestone_slot. На остальных экранах окно ждёт свой слот, как раньше.
  const holder = useOverlayActiveKey();
  const shownLatchRef = useRef(false);
  if (!open) shownLatchRef.current = false;
  const slotInput = { wants: open && milestone !== null, isToast, holder, shownBefore: shownLatchRef.current };
  const slot = useOverlayVisible('streakMilestone', shouldRequestStreakMilestoneSlot(slotInput));
  const slotDecision = decideStreakMilestoneShow(slotInput, slot);
  if (slotDecision.show && !isToast) shownLatchRef.current = true;
  // Журнал решения о слоте — одна строка на смену причины; остаётся навсегда (по ней видно «ждёт» и кого именно).
  const slotReasonLoggedRef = useRef('');
  useEffect(() => {
    if (!open || milestone === null) { slotReasonLoggedRef.current = ''; return; }
    const signature = `${slotDecision.reason}|${String(holder)}`;
    if (slotReasonLoggedRef.current === signature) return;
    slotReasonLoggedRef.current = signature;
    console.log('[STREAK-MILESTONE] slot', JSON.stringify({ milestone, show: slotDecision.show, reason: slotDecision.reason, holder, ownSlot: slot, covered: slotDecision.reason === 'parent_slot' })); // guard-ok: решение о слоте, одна строка на смену
  }, [open, milestone, slotDecision.show, slotDecision.reason, holder, slot]);
  if (!open || milestone === null) return null;
  if (!slotDecision.show) return null;
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
