// ─── Сторона церемонии чеканки по рангу монеты (PM-073) ─────────────────────
// зачем: церемония (LevelUpMintCeremony) не знает о рангах — ей дают номер, название,
// металл и картинку. Собирать их по рангу из ЕДИНОЙ таблицы (app/coin_rank_table_v1.ts)
// должен один помощник: иначе витрина, кнопка повышения и будущие экраны разошлись бы
// в названиях и картинках.
import { coinRankRowForDisplay, coinRankTitle } from '../../app/coin_rank_table_v1';
import type { Lang } from '../../constants/i18n';
import { coinMetalForRank } from './coin_metal_palette';
import type { LevelUpMintSide } from './LevelUpMintCeremony';

export function coinRankMintSide(rank: number, lang: Lang = 'ru'): LevelUpMintSide {
  const row = coinRankRowForDisplay(rank);
  return Object.freeze({
    level: row.rank,
    // зачем (PM-128): звание на языке интерфейса (по умолчанию русское — витрина dev-раздела).
    name: coinRankTitle(row.rank, lang) || row.levelTitle,
    metal: coinMetalForRank(row.rank),
    coinSource: row.source,
  });
}
