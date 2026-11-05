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
  // зачем (владелец 05.11, скрины TestFlight 149: «упоминаний ступеней вообще не должно быть, только ЭТАЖЕЙ! Почему не монетки, а ступени?!»): в интерфейсе Пика место и очки — ТОЛЬКО монеты недели.
  // Режим «по ступеням» в UI недостижим: что бы ни пришло в конфиге сервера или dev-подмене, клиент показывает и сортирует монеты; серверное значение остаётся в журнале.
  const serverRankBy: SpireRankBy = devRankBy ?? (config && weekId ? spireEffectiveRankBy(config, weekId) : 'coins');
  const rankBy: SpireRankBy = 'coins';
  // присваивание идемпотентно, сети нет
  setSpireTextRankBy(rankBy);
  const key = `${rankBy}:${devRankBy ?? 'none'}:${weekId ?? 'none'}`;
  if (key !== lastLogged) {
    lastLogged = key;
    DebugLogger.info('[SPIRE]', `rankBy=${rankBy} (сервер/dev: ${serverRankBy}) dev=${devRankBy ?? 'none'} week=${weekId ?? 'none'} config=${config ? 'есть' : 'нет'} (смена решения)`);
  }
  return { rankBy, devRankBy };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
