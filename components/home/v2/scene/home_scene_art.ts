// ═══════════════════════════════════════════════════════════════════════════
// home_scene_art.ts — картинка героя «Сцены» для состояния.
//
// зачем (владелец 21.10 ~23:50: сам нарисует 3D-героя «Сцены» в двух цветовых схемах под каждое состояние): когда имя
// home_scene_<state> появится в реестре картинок (themed_art_registry.ts, файлы в assets/images/v2art/{light,dark}/), сцена
// возьмёт его сама; до тех пор — заглушка из нынешних картинок Главной (continue / today / lessons). Источник пишется в журнал.
// зачем (координатор 22.10, ускорение первого кадра): герой показывается в 160 dp (≈ 480 px на 3×), а оригиналы — 1024×1024. Сцена
// берёт копию 512 px (scripts/gen_home_hero_512.mjs → home_scene_hero512.generated.ts) той же яркости, из которой взят оригинал; нет
// копии (владелец положил новый арт и не пересобрал) — оригинал, причина в журнал [HOME-HERO]. У заглушек копий нет.
// ═══════════════════════════════════════════════════════════════════════════
import type { ImageSourcePropType } from 'react-native';

import {
  resolveThemedArt,
  THEMED_ART_ALL_NAMES,
  type ThemedArtBrightness,
  type ThemedArtName,
  type ThemedArtResolved,
  type ThemedArtSlots,
} from '../../../theme/themed_art_registry';
import { HOME_HERO_512 } from './home_scene_hero512.generated';
import { HOME_SCENE_HERO, type HomeSceneState } from './home_scene_state';

export type HomeSceneArt = Readonly<{ base: ImageSourcePropType | null; accent: ImageSourcePropType | null; name: string; origin: string; hero512: boolean }>;
export type HomeHero512Pick = Readonly<{ small: Readonly<{ base: ImageSourcePropType; accent: ImageSourcePropType | null }> | null; reason: string }>;

const REGISTERED: ReadonlySet<string> = new Set(THEMED_ART_ALL_NAMES as readonly string[]);
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

/** Копия 512 той же яркости, из которой взят оригинал (v2art → своя, v2art_other_brightness → другая); нет — small: null и причина. */
export function pickHomeHero512(
  table: Readonly<Partial<Record<string, ThemedArtSlots>>>,
  name: string,
  resolved: Pick<ThemedArtResolved, 'brightness' | 'origin' | 'accent'>,
): HomeHero512Pick {
  const other: ThemedArtBrightness = resolved.brightness === 'dark' ? 'light' : 'dark';
  const from = resolved.origin === 'v2art' ? resolved.brightness : resolved.origin === 'v2art_other_brightness' ? other : null;
  if (!from) return { small: null, reason: `origin_${resolved.origin}` };
  const slots = table[name];
  const base = slots?.[from];
  if (!base) return { small: null, reason: `no_512_${from}` };
  const accent = resolved.accent ? slots?.[`${from}Accent`] ?? null : null;
  // слой без копии при копии основы — не смешиваем размеры, берём оригиналы целиком
  if (resolved.accent && !accent) return { small: null, reason: `no_512_${from}_accent` };
  return { small: { base, accent }, reason: `512_${from}` };
}

export function resolveHomeSceneArt(state: HomeSceneState, brightness: ThemedArtBrightness): HomeSceneArt {
  const hero = HOME_SCENE_HERO[state];
  const own = REGISTERED.has(hero.file);
  const name = (own ? hero.file : hero.placeholder) as ThemedArtName;
  const resolved = resolveThemedArt(name, brightness);
  const pick = own ? pickHomeHero512(HOME_HERO_512, name, resolved) : null;
  if (IS_DEV && pick && !pick.small) console.log('[HOME-HERO] без копии 512 — оригинал', JSON.stringify({ state, name, brightness, origin: resolved.origin, reason: pick.reason }));
  const small = pick?.small ?? null;
  return Object.freeze({
    base: small ? small.base : resolved.base,
    accent: small ? small.accent : resolved.accent,
    name,
    origin: own ? resolved.origin : `placeholder:${resolved.origin}`,
    hero512: small !== null,
  });
}
