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

export type SpireMomentsLayerProps = Readonly<{
  lang: Lang;
  /** Итог ступени для окна m06/m07; null — окна итога нет. */
  outcome: SpireStepOutcome | null;
  coins: SpireCoinsConfig;
  coinRank: number | null;
  busy: boolean;
  onClimb: () => void;
  onLater: () => void;
}>;

function SpireMomentsLayer({ lang, outcome, coins, coinRank, busy, onClimb, onLater }: SpireMomentsLayerProps) {
  const positions = useSpirePositionMoments();
  return (
    <>
      {outcome ? <SpireOutcomeMomentHost lang={lang} outcome={outcome} coins={coins} coinRank={coinRank} busy={busy} onClimb={onClimb} onLater={onLater} /> : null}
      <SpirePositionMomentsHost lang={lang} coinRank={coinRank} positions={positions} blocked={outcome !== null} busy={busy} onClimb={onClimb} />
    </>
  );
}

export default memo(SpireMomentsLayer);
