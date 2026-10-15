// ═══════════════════════════════════════════════════════════════════════════
// SpirePositionMomentsHost.tsx — показ окон m05 Пика по готовым решениям Ядра (position_moments_contract): «Позиция выросла», «Тебя обогнали», «Последний шанс».
//
// зачем (координатор 15.10: «каждое — лог показа с причиной, тест «показ 1 раз»; сначала закрыть окно, потом переход/запись; Plus — только общий пейвол D115»): здесь нет логики «когда» — только «как».
// Одновременно одно окно (rise → overtake → lastChance), пока открыт итог ступени (blocked) — ждём. Каждое окно в момент показа сообщает consume(kind, key) (Ядро больше не отдаёт этот key) и пишет [SPIRE-POSITION]
// с ключом и причиной. «Играть» = СНАЧАЛА закрыть окно (локальное состояние), потом onClimb; «Plus» — закрыть шторку и открыть общий пейвол (premium_modal, context no_energy) через защищённую навигацию.
// Показ идёт из памяти решений (0 чтений сети); непоказанное не копится (хук Ядра пересчитывает по текущим данным).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useGuardedNav } from '../../../hooks/use-guarded-nav';
import { SheetSwipeRoot } from '../../modal_fx/SheetSwipeClose';
import SpireLastChanceSheet from './SpireLastChanceSheet';
import SpireOvertakeToast from './SpireOvertakeToast';
import SpirePositionRiseMoment from './SpirePositionRiseMoment';
import type { SpirePositionMomentKind, SpirePositionMoments } from './position_moments_contract';

export type SpirePositionMomentsHostProps = Readonly<{
  lang: Lang;
  coinRank: number | null;
  positions: SpirePositionMoments;
  /** Открыт итог ступени/этажа — позиционные окна ждут. */
  blocked: boolean;
  /** Идёт старт ступени — кнопки «Играть» неактивны. */
  busy: boolean;
  /** «Играть ещё» / «Играть»: начать следующую ступень (вызывается ПОСЛЕ закрытия окна). */
  onClimb: () => void;
}>;

type Shown = Readonly<{ kind: SpirePositionMomentKind; key: string }>;

function SpirePositionMomentsHost({ lang, coinRank, positions, blocked, busy, onClimb }: SpirePositionMomentsHostProps) {
  const nav = useGuardedNav();
  const [closed, setClosed] = useState<readonly string[]>([]);
  const candidate = useMemo<Shown | null>(() => {
    if (blocked) return null;
    const pick = (kind: SpirePositionMomentKind, key: string | undefined): Shown | null => (key && !closed.includes(`${kind}:${key}`) ? { kind, key } : null);
    return pick('rise', positions.rise?.key) ?? pick('overtake', positions.overtake?.key) ?? pick('lastChance', positions.lastChance?.key);
  }, [blocked, closed, positions.lastChance?.key, positions.overtake?.key, positions.rise?.key]);

  // зачем: показ засчитывается в момент появления; запоминаем показанное локально, чтобы окно не пропадало, когда Ядро после consume перестанет отдавать решение
  const [active, setActive] = useState<Shown | null>(null);
  const [frozen, setFrozen] = useState<SpirePositionMoments | null>(null);
  useEffect(() => {
    if (active || !candidate) return;
    console.log(`[SPIRE-POSITION] показ kind=${candidate.kind} key=${candidate.key} причина=решение Ядра, окно свободно (итог ступени закрыт)`); // guard-ok: единичный журнал показа
    setFrozen(positions);
    setActive(candidate);
    positions.consume(candidate.kind, candidate.key);
  }, [active, candidate, positions]);

  const finish = useCallback((reason: string, then?: () => void) => {
    if (!active) return;
    console.log(`[SPIRE-POSITION] закрыто kind=${active.kind} key=${active.key} причина=${reason}`); // guard-ok: единичный журнал закрытия
    setClosed((prev) => [...prev, `${active.kind}:${active.key}`]);
    setActive(null);
    setFrozen(null);
    then?.();
  }, [active]);

  const shown = frozen ?? positions;
  // зачем: страховка — если по какой-то причине данных окна нет, окно закрывается и не блокирует очередь
  const missing = active !== null && !((active.kind === 'rise' && shown.rise) || (active.kind === 'overtake' && shown.overtake) || (active.kind === 'lastChance' && shown.lastChance));
  useEffect(() => { if (missing) finish('data_missing'); }, [missing, finish]);
  if (!active) return null;
  if (active.kind === 'rise' && shown.rise) {
    const rise = shown.rise;
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => finish('back')}>
        <SheetSwipeRoot>
          <SpirePositionRiseMoment lang={lang} rows={rise.rows} fromIndex={rise.fromIndex} toIndex={rise.toIndex} coinsGained={rise.coinsGained} busy={busy} onPlay={() => finish('play_more', onClimb)} onLater={() => finish('to_tower')} />
        </SheetSwipeRoot>
      </Modal>
    );
  }
  if (active.kind === 'overtake' && shown.overtake) {
    const o = shown.overtake;
    return <SpireOvertakeToast lang={lang} rivalName={o.rivalName} rivalCoinRank={o.rivalCoinRank} myCoinRank={coinRank} gapCoins={o.gapCoins} onPlay={() => finish('play', onClimb)} onDismiss={() => finish('toast_gone')} />;
  }
  if (active.kind === 'lastChance' && shown.lastChance) {
    const l = shown.lastChance;
    return (
      <SpireLastChanceSheet
        lang={lang}
        visible
        weekEndsAtMs={l.weekEndsAtMs}
        energyReadyAtMs={l.energyReadyAtMs}
        gapCoins={l.gapCoins}
        onPlus={() => finish('plus', () => { nav.push({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'spire_last_chance' } } as never); })}
        onClose={() => finish('closed')}
      />
    );
  }
  return null;
}

export default memo(SpirePositionMomentsHost);
