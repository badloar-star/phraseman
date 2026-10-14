// зачем (D162/D190; сторож «use_spire_game ≤ 400 строк»): чем ранжирована комната — рубильник config/spire_v1.rankBy из уже
// кэшируемого конфига (0 чтений; монеты — с недели W43), dev-подмена кадров Сверки (dev_state?spireRankBy; в стор-сборке null)
// и текст правила тура «кто спускается» (D190) — в одном месте, вне хука игры.
import { spireEffectiveRankBy, type SpireConfigDoc, type SpireRankBy } from '../../modules/spire/config_contract';
import { setSpireTextRankBy } from '../../components/spire/spire_game_strings';
import { getDevSpireRankByOverride } from '../dev_spire_tier';
import { DebugLogger } from '../debug-logger';

let lastLogged: string | null = null;

export function spireResolveRankBy(config: SpireConfigDoc | null, weekId: string | null): Readonly<{ rankBy: SpireRankBy; devRankBy: SpireRankBy | null }> {
  const devRankBy = getDevSpireRankByOverride();
  const rankBy: SpireRankBy = devRankBy ?? (config && weekId ? spireEffectiveRankBy(config, weekId) : 'steps');
  // присваивание идемпотентно, сети нет
  setSpireTextRankBy(rankBy);
  const key = `${rankBy}:${devRankBy ?? 'none'}:${weekId ?? 'none'}`;
  if (key !== lastLogged) {
    lastLogged = key;
    DebugLogger.info('[SPIRE]', `rankBy=${rankBy} dev=${devRankBy ?? 'none'} week=${weekId ?? 'none'} config=${config ? 'есть' : 'нет'} (смена решения)`);
  }
  return { rankBy, devRankBy };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
