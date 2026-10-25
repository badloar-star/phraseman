// SceneStatusBarControllers.tsx — значки строки состояния над тёмной «Сценой» Главной и обложкой Сезона, в листовых компонентах без разметки.
// зачем (срочно, владелец 25.10: «скролл стал дёрганым, на главной смотри»; замер Сверки: Главная janky 81 %, на каждый бросок [SCENE-STATUSBAR] on/off):
// хуки useAnimatedAtTop / useSeasonCoverTop делают setState на пересечении порога прокрутки (1 dp у верха!). Они жили в корне оболочки вкладок
// (app/(tabs)/_layout.tsx), поэтому каждое касание «от верха» и каждый возврат наверх перерисовывали ВЕСЬ корень оболочки: страницы, таббар, маски.
// Здесь те же хуки в листьях, которые ничего не рисуют, — перерисовывается только лист. Поведение прежнее: вход в стек строки состояния светлый,
// пока сцена у верха и вкладка видна; ушла — вход снят.
import React, { memo } from 'react';
import type { Animated } from 'react-native';

import { useAnimatedAtTop, useSceneStatusBar, useSeasonCoverTop } from '../../../../hooks/use_scene_status_bar';
import { useHomeSceneStatusTint } from './home_scene_status_tint';

export const HomeSceneStatusBarController = memo(function HomeSceneStatusBarController({ scrollY, enabled }: Readonly<{ scrollY: Animated.Value | null | undefined; enabled: boolean }>): React.ReactElement | null {
  const tint = useHomeSceneStatusTint();
  const atTop = useAnimatedAtTop(scrollY);
  useSceneStatusBar('home', enabled && tint !== null && atTop, 'home_scene_under_clock', tint);
  return null;
});

export const SeasonStatusBarController = memo(function SeasonStatusBarController({ enabled }: Readonly<{ enabled: boolean }>): React.ReactElement | null {
  const cover = useSeasonCoverTop();
  useSceneStatusBar('season', enabled && cover.mounted && cover.atTop, 'season_cover_under_clock');
  return null;
});
