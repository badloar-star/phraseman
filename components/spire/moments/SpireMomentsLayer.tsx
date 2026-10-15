// ═══════════════════════════════════════════════════════════════════════════
// SpireMomentsLayer.tsx — единый ленивый слой «моментов вовлечения» поверх экрана Пика (moments_v3): итог ступени/этажа (m06/m07) и позиционные окна (m05).
//
// зачем (координатор 15.10; Авторизация №11: экран Пика ≤ 400 строк): SpireHomeScreen монтирует ОДИН ленивый компонент вместо двух, а все решения «когда показывать позиционные окна» идут из хука Ядра
// useSpirePositionMoments() (app/spire/use_spire_position_moments.ts, договор — position_moments_contract). Слой грузится только при включённом флаге; пока открыт итог ступени, позиционные окна ждут.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import type { Lang } from '../../../constants/i18n';
import type { SpireStepOutcome } from '../../../app/spire/use_spire_game';
import { useSpirePositionMoments } from '../../../app/spire/use_spire_position_moments';
import type { SpireCoinsConfig } from '../../../modules/spire/config_contract';
import SpireOutcomeMomentHost from './SpireOutcomeMomentHost';
import SpirePositionMomentsHost from './SpirePositionMomentsHost';
import { useTabNav } from '../../../app/TabContext';
import { useIsScreenFocused } from '../../../hooks/use_is_screen_focused';

export type SpireMomentsLayerProps = Readonly<{
  lang: Lang;
  /** Итог ступени для окна m06/m07; null — окна итога нет. */
  outcome: SpireStepOutcome | null;
  coins: SpireCoinsConfig;
  coinRank: number | null;
  busy: boolean;
  /** Ступень идёт или готовится («Готовим ступень…» / сессия ступени) или открыта прежняя панель итога при save_failed (слою тогда идёт outcome=null) — позиционные окна ждут (Ревизор, P17). */
  stepActive?: boolean;
  onClimb: () => void;
  onLater: () => void;
}>;

function SpireMomentsLayer({ lang, outcome, coins, coinRank, busy, stepActive = false, onClimb, onLater }: SpireMomentsLayerProps) {
  const positions = useSpirePositionMoments();
  // зачем (Ревизор P17, 15.10): окна m05 ждали только закрытия итога ступени — после «Ещё раз» итог гас, и «Позиция выросла» всплывала поверх
  // «Готовим ступень…» при идущем таймере ступени. Теперь окно ждёт, пока закрыт итог И нет идущей/готовящейся ступени.
  // зачем (Ревизор C2, 15.10): раздел Пика остаётся смонтированным, когда вкладка скрыта, — окна m05 (lastChance/overtake) всплывали бы поверх Главной.
  // Показываем их только когда раздел Пика на экране (runtimeOwnerId === 'spire') и экран в фокусе (не перекрыт push-экраном).
  const { runtimeOwnerId } = useTabNav();
  const screenFocused = useIsScreenFocused();
  const onScreen = screenFocused && runtimeOwnerId === 'spire';
  const blocked = outcome !== null || stepActive || busy || !onScreen;
  const blockReason = outcome !== null ? 'outcome' : stepActive ? 'step' : busy ? 'starting' : !onScreen ? 'hidden' : 'free';
  const lastLoggedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastLoggedRef.current === blockReason) return;
    lastLoggedRef.current = blockReason;
    console.log(`[SPIRE-RISE-QUEUE] позиционные окна ${blocked ? 'ждут' : 'свободны'}: причина=${blockReason === 'outcome' ? 'открыт итог ступени' : blockReason === 'step' ? 'идёт или готовится ступень' : blockReason === 'starting' ? 'старт ступени' : blockReason === 'hidden' ? `Пик не на экране (вкладка=${runtimeOwnerId}, фокус=${String(screenFocused)})` : 'нет'} (итог=${String(outcome !== null)} ступень=${String(stepActive)} старт=${String(busy)}) решение Ядра: rise=${positions.rise?.key ?? '—'} overtake=${positions.overtake?.key ?? '—'} lastChance=${positions.lastChance?.key ?? '—'}`); // guard-ok: журнал смены очереди
  }, [blockReason, blocked, busy, outcome, positions.lastChance?.key, positions.overtake?.key, positions.rise?.key, stepActive]);
  return (
    <>
      {outcome ? <SpireOutcomeMomentHost lang={lang} outcome={outcome} coins={coins} coinRank={coinRank} busy={busy} onClimb={onClimb} onLater={onLater} /> : null}
      <SpirePositionMomentsHost lang={lang} coinRank={coinRank} positions={positions} blocked={blocked} busy={busy} onClimb={onClimb} />
    </>
  );
}

export default memo(SpireMomentsLayer);
