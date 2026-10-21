// ═══════════════════════════════════════════════════════════════════════════
// home_scene_art.ts — картинка героя «Сцены» для состояния.
//
// зачем (владелец 21.10 ~23:50: сам нарисует 3D-героя «Сцены» в двух цветовых схемах под каждое состояние): когда имя
// home_scene_<state> появится в реестре картинок (themed_art_registry.ts, файлы в assets/images/v2art/{light,dark}/), сцена
// возьмёт его сама; до тех пор — заглушка из нынешних картинок Главной (continue / today / lessons). Источник пишется в журнал.
// ═══════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';

import { resolveThemedArt, THEMED_ART_ALL_NAMES, type ThemedArtBrightness, type ThemedArtName } from '../../../theme/themed_art_registry';
import { HOME_SCENE_HERO, type HomeSceneState } from './home_scene_state';

export type HomeSceneArt = Readonly<{ base: ImageSourcePropType | null; accent: ImageSourcePropType | null; name: string; origin: string }>;

const REGISTERED: ReadonlySet<string> = new Set(THEMED_ART_ALL_NAMES as readonly string[]);

export function resolveHomeSceneArt(state: HomeSceneState, brightness: ThemedArtBrightness): HomeSceneArt {
  const hero = HOME_SCENE_HERO[state];
  const own = REGISTERED.has(hero.file);
  const name = (own ? hero.file : hero.placeholder) as ThemedArtName;
  const resolved = resolveThemedArt(name, brightness);
  return Object.freeze({ base: resolved.base, accent: resolved.accent, name, origin: own ? resolved.origin : `placeholder:${resolved.origin}` });
}
