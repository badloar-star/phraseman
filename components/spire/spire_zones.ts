// зачем (D190): зоны «Всех участников» — чистая функция в лёгком модуле, чтобы сторож проверял её без экранного кода.
import { SPIRE_ZONE_RATIO, isSpireResidentUid } from '../../modules/spire/residents';
import { spireCoinsZonesFor } from '../../shared/spire_coins_zones';
import { spireMemberScored, type SpireMemberRow, type SpireRankByView } from './spire_room_types';

export type SpireZone = 'up' | 'stay' | 'down';

/** Раскладывает отсортированных участников по зонам (чистая функция — удобно тестировать). */
export function spireZonesFor(sorted: readonly SpireMemberRow[], rankBy: SpireRankByView = 'steps'): readonly SpireZone[] {
  if (rankBy === 'coins') {
    // зачем (D190): экран обязан показывать ту же зону, что даст итог недели, — считаем только по живым, боты «остаются».
    const live = sorted.filter((m) => !isSpireResidentUid(m.uid));
    const cmp = (a: SpireMemberRow, b: SpireMemberRow) => ((b.weekCoins ?? 0) - (a.weekCoins ?? 0)) || (b.steps - a.steps);
    const liveZones = spireCoinsZonesFor(live, cmp, (m) => spireMemberScored(m, 'coins'));
    const byUid = new Map(live.map((m, i) => [m.uid, liveZones[i]]));
    return sorted.map((m) => byUid.get(m.uid) ?? 'stay');
  }
  const size = Math.max(1, Math.round(sorted.length * SPIRE_ZONE_RATIO));
  return sorted.map((m, i) => {
    const scored = spireMemberScored(m, rankBy);
    if (i < size && scored) return 'up';
    if (i >= sorted.length - size || !scored) return 'down';
    return 'stay';
  });
}
