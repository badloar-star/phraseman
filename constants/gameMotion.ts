/**
 * Числа движения игр — перенесены из утверждённого макета без подбора на глаз.
 * Источники: docs/design/v2-app/elevate-mechanics.css, docs/design/v2-app/kit.css.
 * Владелец 11.11.2026: «все анимации с макета», «код должен быть в точности перенесён».
 * Менять значение здесь можно только вместе с макетом.
 */

/** elevate-mechanics.css:12 — `--spring` и `--out`. */
export const GAME_EASE = {
  spring: [0.3, 1.4, 0.5, 1],
  out: [0.2, 1, 0.3, 1],
  /** CSS `ease-out`. */
  easeOut: [0, 0, 0.58, 1],
  /** CSS `ease` — кривая по умолчанию у анимаций без указанной кривой. */
  ease: [0.25, 0.1, 0.25, 1],
  /** elevate-mechanics.css:67 — заполнение деления прогресса. */
  progress: [0.2, 0.8, 0.2, 1],
} as const;

export const GAME_MOTION = {
  /** kit.css:70–71 `.t` / `.t.down`. */
  pressDownMs: 90,
  pressUpMs: 240,
  pressOpacityMs: 160,
  pressScale: 0.97,
  pressOpacity: 0.86,
  /** elevate-mechanics.css:117–118 `.rise`. */
  riseMs: 520,
  riseShift: 18,
  /** Лесенка появления вариантов ответа: `--dl: i * 70ms` (elevate-mechanics.app.js, `flow()`). */
  answerStaggerMs: 70,
  /** elevate-mechanics.css:116 `@keyframes shake` — 380 мс. */
  shakeMs: 380,
  shakeStops: [
    { at: 0.2, x: -7 },
    { at: 0.45, x: 6 },
    { at: 0.7, x: -3 },
    { at: 1, x: 0 },
  ],
  /** elevate-mechanics.css:110–115 `.at`: фон и цвет 260 мс, прозрачность 300 мс, погашенная плитка .34. */
  tileColorMs: 260,
  tileFadeMs: 300,
  tileOffOpacity: 0.34,
  /** elevate-mechanics.css:11 — `--ok-bg` и `--no-bg`: заливка исхода на 20 %. */
  tileTintOpacity: 0.2,
  /** elevate-mechanics.css:67 `.segs i::after`. */
  segmentMs: 800,
  /** kit.css:137 `@keyframes numup` + elevate-mechanics.css:56 `.bump` — 650 мс. */
  bumpMs: 650,
  bumpPeakAt: 0.35,
  bumpShift: -5,
  bumpScale: 1.22,
  /** elevate-mechanics.css:119 `.fade`. */
  fadeMs: 320,
  /** elevate-mechanics.css:124 `.tempo i`. */
  tempoBarMs: 300,
  /** elevate-mechanics.css:128–132 — слово «Потока» и полоса под фразой. */
  flowWordShift: 8,
  flowWordBlurIn: 8,
  flowWordBlurOut: 10,
  flowWordFadeShare: 0.55,
  flowStillMs: 300,
  flowBeamHideMs: 300,
  /** elevate-games.js `order()`: перелёт реплики 480 мс `--out` из прозрачности .6; красный тон промаха держится 500 мс. */
  orderFlyMs: 480,
  orderFlyFromOpacity: 0.6,
  orderMissHoldMs: 500,
} as const;
