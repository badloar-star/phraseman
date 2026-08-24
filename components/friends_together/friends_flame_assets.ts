import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../../constants/theme';

export const FRIENDS_SHARED_FLAME_THEMES = [
  'dark',
  'gold',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'indigo',
  'sagePorcelain',
] as const satisfies readonly ThemeMode[];

export type FriendsSharedFlameTheme = (typeof FRIENDS_SHARED_FLAME_THEMES)[number];
export type FriendsSharedFlameStage = 1 | 2 | 3;

type FriendsSharedFlameAssetMap = Record<
  ThemeMode,
  Record<FriendsSharedFlameStage, ImageSourcePropType>
>;

export const FRIENDS_SHARED_FLAME_ASSETS: FriendsSharedFlameAssetMap = {
  dark: {
    1: require('../../assets/images/friends-shared-flame/dark/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/dark/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/dark/stage-3.webp'),
  },
  gold: {
    1: require('../../assets/images/friends-shared-flame/gold/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/gold/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/gold/stage-3.webp'),
  },
  olive: {
    1: require('../../assets/images/friends-shared-flame/olive/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/olive/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/olive/stage-3.webp'),
  },
  midnight: {
    1: require('../../assets/images/friends-shared-flame/midnight/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/midnight/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/midnight/stage-3.webp'),
  },
  ember: {
    1: require('../../assets/images/friends-shared-flame/ember/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/ember/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/ember/stage-3.webp'),
  },
  aurora: {
    1: require('../../assets/images/friends-shared-flame/aurora/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/aurora/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/aurora/stage-3.webp'),
  },
  volt: {
    1: require('../../assets/images/friends-shared-flame/volt/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/volt/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/volt/stage-3.webp'),
  },
  indigo: {
    1: require('../../assets/images/friends-shared-flame/indigo/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/indigo/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/indigo/stage-3.webp'),
  },
  sagePorcelain: {
    1: require('../../assets/images/friends-shared-flame/sagePorcelain/stage-1.webp'),
    2: require('../../assets/images/friends-shared-flame/sagePorcelain/stage-2.webp'),
    3: require('../../assets/images/friends-shared-flame/sagePorcelain/stage-3.webp'),
  },
};

export function resolveFriendsSharedFlameAsset(
  theme: string,
  stage: number,
): ImageSourcePropType {
  const isKnownTheme = Object.prototype.hasOwnProperty.call(
    FRIENDS_SHARED_FLAME_ASSETS,
    theme,
  );
  const resolvedTheme = (isKnownTheme ? theme : 'dark') as FriendsSharedFlameTheme;
  const finiteStage = Number.isFinite(stage) ? Math.floor(stage) : 1;
  const resolvedStage = Math.min(3, Math.max(1, finiteStage)) as FriendsSharedFlameStage;

  return FRIENDS_SHARED_FLAME_ASSETS[resolvedTheme][resolvedStage];
}
