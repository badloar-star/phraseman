// ════════════════════════════════════════════════════════════════════════════
//  Синтетические итоги недели для DEV-центра.
//
//  зачем: настоящую модалку «Итоги недели» видно только в понедельник после
//  ролловера — проверить повышение, понижение и «остаёшься» на живом устройстве
//  было почти невозможно. Здесь собираем правдоподобный LeagueResult целиком в
//  памяти: ни AsyncStorage, ни сети, ни записи pending. Модалка получает его
//  через previewMode и НЕ трогает настоящий результат недели.
// ════════════════════════════════════════════════════════════════════════════

import { getLeagueResultZoneSize, type GroupMember, type LeagueResult } from '../../app/league_engine';

export type LeagueDevSeedId =
  | 'promoted'
  | 'demoted'
  | 'stay'
  | 'rank-mismatch';

/** Размер комнаты в сидах — как в живой лиге. */
const SEED_GROUP_SIZE = 29;

/**
 * Фиксированные ники соперников. Детерминированные: одинаковый кадр при каждом
 * открытии, поэтому скриншоты «до/после» сравнимы между собой.
 */
const OPPONENT_NAMES = [
  'stonepetal', 'DuskWillow', 'IronBirch', 'QuietFern', 'amberloop',
  'NorthMoss', 'palefox', 'GlassHeron', 'slowriver', 'TinCedar',
  'harborlark', 'DimSorrel', 'nightclover', 'SaltWren', 'brasswood',
  'LowTide', 'emberquill', 'GreyThistle', 'softlichen', 'PineAsh',
  'coldmarrow', 'FlintReed', 'duskpine', 'HollowOat', 'stillbriar',
  'MossGable', 'farvane', 'ClayHeath',
] as const;

const MY_NAME = 'QA Monday';

/** Псевдослучайное, но детерминированное число из индекса. */
const jitter = (index: number, span: number): number =>
  Math.floor(((index * 977) % 100) / 100 * span);

/**
 * Собирает комнату так, что моя строка стоит ровно на myRank, а очки убывают
 * сверху вниз — то есть «правильный» согласованный случай.
 */
function buildGroup(myRank: number, size = SEED_GROUP_SIZE): GroupMember[] {
  const rows: GroupMember[] = [];
  let opponentIndex = 0;

  for (let place = 1; place <= size; place += 1) {
    // Очки честно убывают с местом, с небольшим разбросом внутри шага.
    const points = 9200 - (place - 1) * 290 - jitter(place, 120);
    const totalXp = 26_000 - (place - 1) * 620 - jitter(place, 400);

    if (place === myRank) {
      rows.push({
        uid: 'dev-me',
        name: MY_NAME,
        points,
        isMe: true,
        totalXp,
        streak: 21,
      });
      continue;
    }

    const name = OPPONENT_NAMES[opponentIndex % OPPONENT_NAMES.length];
    opponentIndex += 1;
    rows.push({
      uid: `dev-op-${place}`,
      name,
      points,
      isMe: false,
      totalXp,
      streak: 3 + (place % 9),
      // Пара премиум/VIP строк — чтобы проверить ауры и стиль ников.
      isPremium: place === 1 || place === 5,
      isVip: place === 3,
      isResident: place > size - 4,
    });
  }

  return rows;
}

export type LeagueDevSeed = Readonly<{
  id: LeagueDevSeedId;
  result: LeagueResult;
}>;

export function buildLeagueDevSeed(id: LeagueDevSeedId): LeagueResult {
  const total = SEED_GROUP_SIZE;
  // Зона перехода считается тем же помощником, что и в проде: подпись под
  // числом места обязана совпадать с реальным правилом лиги.
  const zoneSize = getLeagueResultZoneSize(total);

  switch (id) {
    case 'promoted': {
      const myRank = Math.max(1, zoneSize - 2);
      return {
        prevLeagueId: 3,
        newLeagueId: 4,
        myRank,
        totalInGroup: total,
        promoted: true,
        demoted: false,
        group: buildGroup(myRank),
      };
    }

    case 'demoted': {
      const myRank = total - 1;
      return {
        prevLeagueId: 3,
        newLeagueId: 2,
        myRank,
        totalInGroup: total,
        promoted: false,
        demoted: true,
        group: buildGroup(myRank),
      };
    }

    case 'rank-mismatch': {
      // Репро бага 13.08.2026: сервер сказал «ты второй», а снимок комнаты
      // отстал и держит мои старые очки — по ним я где-то в середине.
      // Правильное поведение: модалка всё равно ставит меня на второе место.
      const group = buildGroup(14).map((member) => (
        member.isMe ? { ...member, points: 900 } : member
      ));
      return {
        prevLeagueId: 1,
        newLeagueId: 1,
        myRank: 2,
        totalInGroup: total,
        promoted: false,
        demoted: false,
        group,
      };
    }

    case 'stay':
    default: {
      // Место сразу за зоной повышения — самый частый живой случай.
      const myRank = zoneSize + 2;
      return {
        prevLeagueId: 1,
        newLeagueId: 1,
        myRank,
        totalInGroup: total,
        promoted: false,
        demoted: false,
        group: buildGroup(myRank),
      };
    }
  }
}
