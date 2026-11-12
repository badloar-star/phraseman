/**
 * Числа экрана «Минута знаний» — перенесены из утверждённого макета без подбора на глаз.
 * Источники: docs/design/v2-app/elevate-games.js (`minute()`, строки 77–91), elevate-extra.css (113–114, 176–181),
 * elevate-mechanics.css (108, 117–118). Владелец 11.11.2026: «все анимации с макета», «код должен быть в точности перенесён».
 * Менять значение здесь можно только вместе с макетом.
 */
export const MINUTE_MOTION = {
  /** elevate-games.js:87 — полоса времени: `duration: 20000, easing: 'linear'`; через 20 с экран уходит сам. */
  timerMs: 20000,
  /** elevate-games.js:84 — примеры поднимаются лесенкой: `--dl: 500 + i * 250`. */
  exampleFirstDelayMs: 500,
  exampleStepMs: 250,
  /** elevate-games.js:80 — отступ подписи сверху; :81 — отступ карточки; :85 — отступ под полосой. */
  askTop: 22,
  cardTop: 18,
  barBottom: 18,
  /** elevate-extra.css:176 `.theory { padding: 22px 20px }`. */
  cardPadV: 22,
  cardPadH: 20,
  /** elevate-extra.css:177 `.theory .q`. */
  formulaSize: 30,
  formulaLine: 36,
  formulaSpacing: -0.5,
  /** elevate-extra.css:178 `.theory .q em { border-radius: 8px; padding: 0 6px }`. */
  markRadius: 8,
  markPadH: 6,
  /** elevate-extra.css:179 `.theory .p`. */
  ruleSize: 16,
  ruleLine: 23,
  ruleTop: 12,
  /** elevate-extra.css:180–181 `.exm`, `.exm span`. */
  exampleGap: 12,
  examplePadV: 12,
  examplePadH: 14,
  exampleRadius: 16,
  exampleTop: 10,
  exampleSize: 16,
  exampleNoteSize: 14,
  exampleIcon: 20,
  /** elevate-extra.css:113–114 `.tbar`, `.tbar i`. */
  barHeight: 6,
  barRadius: 3,
} as const;

/**
 * Цвета подложек — ровно по макету, поверх фона экрана. Тёмный вид: elevate-extra.css (113–114, 178, 180);
 * светлый вид: elevate-light.css (24 — --soft, 45–46, 73). Свечение у заливки полосы есть только в тёмном виде.
 */
export const MINUTE_TINT = {
  dark: { mark: 'rgba(255,255,255,0.22)', example: 'rgba(0,0,0,0.16)', barTrack: 'rgba(255,255,255,0.18)', barFill: '#FFFFFF', barGlow: '0px 0px 10px rgba(255,255,255,0.7)' },
  light: { mark: 'rgba(47,74,107,0.14)', example: 'rgba(20,27,43,0.07)', barTrack: 'rgba(20,27,43,0.12)', barFill: '#2F4A6B', barGlow: null },
} as const;

/** Сколько примеров под правилом — в макете их два. */
export const MINUTE_EXAMPLES_MAX = 2;
