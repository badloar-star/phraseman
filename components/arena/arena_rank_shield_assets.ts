import type { ImageSourcePropType } from 'react-native';
import type { ArenaTierKey } from '../../modules/arena/rank_engine';

export type ArenaRankDivision = 1 | 2 | 3;

const ASSETS: Readonly<Record<ArenaTierKey, Readonly<Record<ArenaRankDivision, ImageSourcePropType>>>> = {
  bronze: {
    3: require('../../assets/images/arena/ranks/bronze-iii.webp'),
    2: require('../../assets/images/arena/ranks/bronze-ii.webp'),
    1: require('../../assets/images/arena/ranks/bronze-i.webp'),
  },
  silver: {
    3: require('../../assets/images/arena/ranks/silver-iii.webp'),
    2: require('../../assets/images/arena/ranks/silver-ii.webp'),
    1: require('../../assets/images/arena/ranks/silver-i.webp'),
  },
  gold: {
    3: require('../../assets/images/arena/ranks/gold-iii.webp'),
    2: require('../../assets/images/arena/ranks/gold-ii.webp'),
    1: require('../../assets/images/arena/ranks/gold-i.webp'),
  },
  platinum: {
    3: require('../../assets/images/arena/ranks/platinum-iii.webp'),
    2: require('../../assets/images/arena/ranks/platinum-ii.webp'),
    1: require('../../assets/images/arena/ranks/platinum-i.webp'),
  },
  diamond: {
    3: require('../../assets/images/arena/ranks/diamond-iii.webp'),
    2: require('../../assets/images/arena/ranks/diamond-ii.webp'),
    1: require('../../assets/images/arena/ranks/diamond-i.webp'),
  },
  master: {
    3: require('../../assets/images/arena/ranks/master-iii.webp'),
    2: require('../../assets/images/arena/ranks/master-ii.webp'),
    1: require('../../assets/images/arena/ranks/master-i.webp'),
  },
  grandmaster: {
    3: require('../../assets/images/arena/ranks/grandmaster-iii.webp'),
    2: require('../../assets/images/arena/ranks/grandmaster-ii.webp'),
    1: require('../../assets/images/arena/ranks/grandmaster-i.webp'),
  },
  legend: {
    3: require('../../assets/images/arena/ranks/legend-iii.webp'),
    2: require('../../assets/images/arena/ranks/legend-ii.webp'),
    1: require('../../assets/images/arena/ranks/legend-i.webp'),
  },
};

export function arenaRankShieldAsset(
  tierKey: ArenaTierKey,
  division: ArenaRankDivision,
): ImageSourcePropType {
  return ASSETS[tierKey][division];
}
