// ═══════════════════════════════════════════════════════════════════════════
// SpirePositionMomentsHost.tsx — показ окон m05 Пика по готовым решениям Ядра (position_moments_contract): «Позиция выросла», «Тебя обогнали», «Последний шанс».
//
// зачем (координатор 15.10: «каждое — лог показа с причиной, тест «показ 1 раз»; сначала закрыть окно, потом переход/запись; Plus — только общий пейвол D115»): здесь нет логики «когда» — только «как».
// Одновременно одно окно (rise → overtake → lastChance), пока открыт итог ступени (blocked) — ждём. Каждое окно в момент показа сообщает consume(kind, key) (Ядро больше не отдаёт этот key) и пишет [SPIRE-POSITION]
// с ключом и причиной. «Играть» = СНАЧАЛА закрыть окно (локальное состояние), потом onClimb; «Plus» — закрыть шторку и открыть общий пейвол (premium_modal, context no_energy) через защищённую навигацию.
// Показ идёт из памяти решений (0 чтений сети); непоказанное не копится (хук Ядра пересчитывает по текущим данным).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { useGuardedNav } from '../../../hooks/use-guarded-nav';
import { useOverlayVisible } from '../../OverlayArbiter';
import { SheetSwipeRoot } from '../../modal_fx/SheetSwipeClose';
import SpireLastChanceSheet from './SpireLastChanceSheet';
import SpireOvertakeToast from './SpireOvertakeToast';
import SpirePositionRiseMoment from './SpirePositionRiseMoment';
import type { SpirePositionMomentKind, SpirePositionMoments } from './position_moments_contract';
import { recordPeakLastChanceStory, recordPeakOvertakeStory, recordPeakRiseStory, storiesReplaceWindows } from '../../../modules/story_events/story_instead_sources';

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

type Shown = Readonly<{ kind: SpirePositionMomentKind; key: string; owner: string | null }>;
/** зачем (F17): ключи окон не содержат uid — «закрыто» и «показано» считаем в паре с владельцем решений. */
const closedMark = (owner: string | null, kind: SpirePositionMomentKind, key: string): string => `${owner ?? '-'}|${kind}:${key}`;

function SpirePositionMomentsHost({ lang, coinRank, positions, blocked, busy, onClimb }: SpirePositionMomentsHostProps) {
  const nav = useGuardedNav();
  const owner = positions.owner ?? null;
  const [closed, setClosed] = useState<readonly string[]>([]);
  const candidate = useMemo<Shown | null>(() => {
    if (blocked) return null;
    const pick = (kind: SpirePositionMomentKind, key: string | undefined): Shown | null => (key && !closed.includes(closedMark(owner, kind, key)) ? { kind, key, owner } : null);
    return pick('rise', positions.rise?.key) ?? pick('overtake', positions.overtake?.key) ?? pick('lastChance', positions.lastChance?.key);
  }, [blocked, closed, owner, positions.lastChance?.key, positions.overtake?.key, positions.rise?.key]);

  // зачем: показ засчитывается в момент появления; запоминаем показанное локально, чтобы окно не пропадало, когда Ядро после consume перестанет отдавать решение
  const [heldActive, setActive] = useState<Shown | null>(null);
  const [heldFrozen, setFrozen] = useState<SpirePositionMoments | null>(null);
  // зачем (F17, владелец 11.11): хост живёт дольше аккаунта. Окно прошлого владельца (с его строками в frozen) новому не
  // показываем ни на кадр; а «закрыто» прошлого не глушит то же окно новому («Последний шанс» одной недели — один ключ на всех).
  const active = heldActive && heldActive.owner === owner ? heldActive : null;
  const frozen = active ? heldFrozen : null;
  useEffect(() => {
    if (!heldActive || heldActive.owner === owner) return; // guard-ok: чужого окна нет — убирать нечего
    console.log(`[SPIRE-POSITION] владелец сменился — убираем окно прошлого kind=${heldActive.kind} key=${heldActive.key}`); // guard-ok: единичный журнал смены владельца
    setActive(null);
    setFrozen(null);
  }, [heldActive, owner]);
  useEffect(() => {
    if (active || !candidate) return;
    // зачем (владелец 11.11: «никаких модальных окон совсем»; макет stories-peak-position — «Да, в приложение»): при включённых историях
    // решение Ядра пишется кадром истории, окно над башней не рисуется. consume и отметка «закрыто» — как у показанного и закрытого
    // окна, поэтому следующее решение идёт той же очередью. Истории выключены (флаг stories_v1) — окно как раньше.
    if (storiesReplaceWindows()) {
      const fail = (e: unknown) => console.warn(`[SPIRE-POSITION] история не записана kind=${candidate.kind}: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch пишет причину
      if (candidate.kind === 'rise' && positions.rise) {
        void recordPeakRiseStory({ key: candidate.key, fromIndex: positions.rise.fromIndex, toIndex: positions.rise.toIndex, coinsGained: positions.rise.coinsGained }).catch(fail);
      } else if (candidate.kind === 'overtake' && positions.overtake) {
        const o = positions.overtake;
        void recordPeakOvertakeStory({ key: candidate.key, rivalName: o.rivalName, rivalCoinRank: o.rivalCoinRank, gapCoins: o.gapCoins, gapSteps: o.gapSteps ?? null }).catch(fail);
      } else if (candidate.kind === 'lastChance' && positions.lastChance) {
        const l = positions.lastChance;
        void recordPeakLastChanceStory({ key: candidate.key, weekEndsAtMs: l.weekEndsAtMs, energyReadyAtMs: l.energyReadyAtMs, gapCoins: l.gapCoins ?? null, gapSteps: l.gapSteps ?? null }).catch(fail);
      }
      console.log(`[SPIRE-POSITION] история вместо окна kind=${candidate.kind} key=${candidate.key}`); // guard-ok: единичный журнал решения
      positions.consume(candidate.kind, candidate.key);
      setClosed((prev) => [...prev, closedMark(candidate.owner, candidate.kind, candidate.key)]);
      return;
    }
    console.log(`[SPIRE-POSITION] показ kind=${candidate.kind} key=${candidate.key} причина=решение Ядра, окно свободно (итог ступени закрыт)`); // guard-ok: единичный журнал показа
    setFrozen(positions);
    setActive(candidate);
    positions.consume(candidate.kind, candidate.key);
  }, [active, candidate, positions]);

  // зачем (аудит Optimistic UI 17.10, п.12): `active` из замыкания — два тапа в одном кадре (или «назад» мимо fire()) оба проходили и onClimb шёл дважды; защёлка по ключу окна
  const finishedKeyRef = useRef<string | null>(null);
  const finish = useCallback((reason: string, then?: () => void) => {
    if (!active) {
      console.log(`[SPIRE-POSITION] закрыть: окна нет причина=${reason}`); // guard-ok: ранний выход
      return;
    }
    const windowKey = closedMark(active.owner, active.kind, active.key);
    if (finishedKeyRef.current === windowKey) {
      console.log(`[SPIRE-POSITION] закрыть повторно — пропуск key=${windowKey} причина=${reason}`); // guard-ok: ранний выход — двойной тап
      return;
    }
    finishedKeyRef.current = windowKey;
    console.log(`[SPIRE-POSITION] закрыто kind=${active.kind} key=${active.key} причина=${reason}`); // guard-ok: единичный журнал закрытия
    setClosed((prev) => [...prev, windowKey]);
    setActive(null);
    setFrozen(null);
    then?.();
  }, [active]);

  const shown = frozen ?? positions;
  // зачем: страховка — если по какой-то причине данных окна нет, окно закрывается и не блокирует очередь
  const missing = active !== null && !((active.kind === 'rise' && shown.rise) || (active.kind === 'overtake' && shown.overtake) || (active.kind === 'lastChance' && shown.lastChance));
  useEffect(() => { if (missing) finish('data_missing'); }, [missing, finish]);
  // зачем (владелец 05.11: два полноэкранных окна на одном кадре — «такое нельзя допускать»): позиционные окна (rise/overtake/lastChance) ждут слот арбитра (ключ spirePosition); показ уже засчитан, окно просто ждёт очереди.
  const slot = useOverlayVisible('spirePosition', active !== null);
  if (!active || !slot) return null;
  if (active.kind === 'rise' && shown.rise) {
    const rise = shown.rise;
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => finish('back')}>
        <SheetSwipeRoot>
          <SpirePositionRiseMoment lang={lang} rows={rise.rows} fromIndex={rise.fromIndex} toIndex={rise.toIndex} coinsGained={rise.coinsGained} metric={rise.metric} busy={busy} onPlay={() => finish('play_more', onClimb)} onLater={() => finish('to_tower')} />
        </SheetSwipeRoot>
      </Modal>
    );
  }
  if (active.kind === 'overtake' && shown.overtake) {
    const o = shown.overtake;
    return <SpireOvertakeToast lang={lang} rivalName={o.rivalName} rivalCoinRank={o.rivalCoinRank} myCoinRank={coinRank} gapCoins={o.gapCoins} gapSteps={o.gapSteps} onPlay={() => finish('play', onClimb)} onDismiss={() => finish('toast_gone')} />;
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
        gapSteps={l.gapSteps}
        onPlus={() => finish('plus', () => { nav.push({ pathname: '/premium_modal', params: { context: 'no_energy', source: 'spire_last_chance' } } as never); })}
        onClose={() => finish('closed')}
      />
    );
  }
  return null;
}

export default memo(SpirePositionMomentsHost);
