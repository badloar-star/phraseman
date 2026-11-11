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
  /** elevate-games.js `hunt()`: реплики поднимаются лесенкой по 140 мс; «сканер» высотой 70 идёт сверху вниз 2600 мс
   *  линейно, по кругу, проявляясь к 15 % пути и угасая после 85 %; промах держит красный тон 700 мс. */
  huntStaggerMs: 140,
  huntScanMs: 2600,
  huntScanHeight: 70,
  huntScanBleed: 20,
  huntScanFadeIn: 0.15,
  huntScanFadeOut: 0.85,
  huntMissHoldMs: 700,
  /** elevate-mechanics.css:151–152 `.why`: прозрачность 360 мс, сдвиг 14 → 0 за 520 мс `--out`. */
  whyFadeMs: 360,
  whyShiftMs: 520,
  whyShift: 14,
  /** elevate-mechanics.app.js `cut()` + elevate-mechanics.css:139–150 — «Лишнее слово». */
  oddRiseStaggerMs: 60,
  oddTintMs: 220,
  oddDropMs: 520,
  oddDropEase: [0.45, 0, 0.9, 0.5],
  oddDropY: 240,
  oddDropRotate: 26,
  oddDropFadeFrom: 0.45,
  oddFlipMs: 520,
  oddFlipDelayMs: 180,
  oddRevealDelayMs: 480,
  oddNextMs: 2900,
  oddGlowMs: 900,
  oddGlowPeakAt: 0.3,
  oddGlowShift: -3,
  oddGlowRadius: 22,
  oddGlowStaggerMs: 70,
  coinMoveMs: 900,
  coinMoveEase: [0.2, 0.9, 0.2, 1],
  coinHopPeakAt: 0.4,
  coinHopShift: -16,
  coinHopScale: 1.12,
  /** elevate-mechanics.css:159–183 + `sort()` — «Сортировка». */
  sortCardMoveMs: 520,
  sortCardFadeMs: 360,
  sortDepthShift: [0, 18, 34, 44],
  sortDepthScale: [1, 0.93, 0.86, 0.8],
  sortTextFadeMs: 260,
  sortTextDelayMs: 120,
  sortHintMs: 300,
  sortDragYShare: 0.3,
  sortRotateDivisor: 14,
  sortFlyX: 150,
  sortFlyY: 330,
  sortFlyRotate: 18,
  sortFlyScale: 0.3,
  sortFinishDelayMs: 500,
  binHotScale: 1.04,
  binHotMs: 300,
  binHotFillMs: 260,
  binHotFill: 0.22,
  binYesMs: 620,
  binYesScale: 1.06,
  binNoMs: 520,
  binPeakAt: 0.3,
} as const;
