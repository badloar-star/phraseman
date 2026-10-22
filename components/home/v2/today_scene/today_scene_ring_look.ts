// ═══════════════════════════════════════════════════════════════════════════
// today_scene_ring_look.ts — цвета колец «Сегодня» из токенов темы: кольца-герой на сцене, ✓ «Заданий дня» и мини-кольца «Недели» на карточке.
//
// зачем (закон владельца 22.10: «КРУЖОЧКИ ДОЛЖНЫ БЫТЬ СТРОГО В ЦВЕТАХ ТЕМЫ!! ОТТЕНКИ ТЕМЫ КАЖДОЙ»; токены 4 · ТЕМЫ b06c6a399): прежние цвета
// эталона (красное / зелёное / синее) красили мимо темы. На сцене — три светлых оттенка акцента (≥ 3:1 на сцене во всех темах), дорожка —
// свой токен. Карточка темы в светлом оформлении почти белая, светлые кольца на ней пропадают (≈ 1,1:1), поэтому там тот же оттенок
// углубляется к акцентному тексту карточки лесенкой 4,4 / 3,6 / 3 — внешнее заметнее всех, как на сцене, и все три различимы светлотой;
// в тёмных темах цвета остаются как на сцене. Чистые функции без React — их проверяет tests/today_scene_ring_look_2026_10_22.
// ═══════════════════════════════════════════════════════════════════════════
import { legibleOn } from '../../../../constants/liquidGlassSurfaceRoles';
import type { HomeSceneStageTokens } from '../scene/home_scene_tokens';

/**
 * Вид колец-героя — та же форма, что TodayRingsLook у колец; свой тип, чтобы модуль не импортировал моменты серии
 * (сторож streak_moments_v3_contract: новый импортёр components/streak/moments — решение Ядра).
 */
export type TodaySceneRingLook = Readonly<{ colors: readonly [string, string, string]; trackColor: string; trackOpacity: number; zeroDot: boolean }>;

/** Кольца-герой сцены: оттенки акцента темы, дорожка — токен темы (уже с прозрачностью), точка начала у пустого кольца. */
export function todaySceneRingLook(t: Pick<HomeSceneStageTokens, 'todayRing' | 'todayRingTrack'>): TodaySceneRingLook {
  return Object.freeze({ colors: t.todayRing, trackColor: t.todayRingTrack, trackOpacity: 1, zeroDot: true });
}

/** Пороги контраста колец на карточке темы: внешнее кольцо заметнее всех; значок — не меньше 3:1. */
export const TODAY_RING_ON_CARD_MIN = Object.freeze([4.4, 3.6, 3] as const);

type CardTone = Readonly<{ accentText: string; opaqueCard: string }>;

/** Оттенок кольца на карточке темы: светлый оттенок со сцены, углублённый к акцентному тексту карточки до контраста ≥ min. */
export function todayRingOnCard(ring: string, card: CardTone, min: number): string {
  return legibleOn(ring, card.accentText, [card.opaqueCard], min);
}

/** Три мини-кольца на карточке темы — по лесенке TODAY_RING_ON_CARD_MIN. */
export function todayRingsOnCard(rings: readonly [string, string, string], card: CardTone): readonly [string, string, string] {
  const [a, b, c] = TODAY_RING_ON_CARD_MIN;
  return Object.freeze([todayRingOnCard(rings[0], card, a), todayRingOnCard(rings[1], card, b), todayRingOnCard(rings[2], card, c)] as const);
}
