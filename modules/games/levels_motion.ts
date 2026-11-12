/**
 * Числа и цвета экрана «Уровни игры» — перенесены из утверждённого макета без подбора на глаз.
 * Источники: docs/design/v2-app/elevate-games.js (`levels()`, строки 92–104), elevate-extra.css (59, 182–189),
 * elevate-mechanics.css (57–61), elevate-light.css (24, 34, 45–46). Владелец 11.11.2026: «все анимации с макета».
 * Менять значение здесь можно только вместе с макетом.
 */
export const LEVELS_MOTION = {
  /** elevate-extra.css:183 `.lv { transition: opacity 400ms, background 400ms, transform 500ms var(--out) }`. */
  rowFadeMs: 400,
  rowTintMs: 400,
  rowScaleMs: 500,
  /** elevate-extra.css:186 — прозрачность строк: прочие .5, пройденные .85, текущая 1; текущая крупнее в 1,03. */
  rowOpacity: 0.5,
  rowOpacityDone: 0.85,
  rowScaleCur: 1.03,
  /** elevate-extra.css:187 `.lv .cn { transition: opacity 300ms }`. */
  coinFadeMs: 300,
  /** elevate-extra.css:189 `.pips i { transition: background 300ms }`. */
  pipMs: 300,
  /** elevate-games.js:95 — отступы блока сверху: 20, крупная надпись 6, пояснение 8, деления 14; :97 — 8 под лестницей. */
  heroTop: 20,
  bigTop: 6,
  subTop: 8,
  pipsTop: 14,
  ladderBottom: 8,
  /** elevate-mechanics.css:58–61 `.top .ttl`, `.big`, `.over`, `.sub`. */
  titleSize: 20,
  bigSize: 38,
  bigLine: 42,
  bigSpacing: -0.8,
  overSize: 14,
  overLine: 18,
  subSize: 15,
  subLine: 20,
  /** elevate-extra.css:182–188 `.lad`, `.lv`, `.lv .n`, `.lv .tx`, `.lv .cn`. */
  ladderGap: 10,
  rowHeight: 62,
  rowPadH: 16,
  rowRadius: 20,
  rowGap: 14,
  numSize: 34,
  textSize: 16,
  noteSize: 13,
  coinSize: 34,
  /** elevate-extra.css:189 `.pips`, `.pips i`. */
  pipGap: 6,
  pipWidth: 26,
  pipHeight: 6,
  pipRadius: 3,
} as const;

/** Цвета поверх фона экрана: тёмный вид — elevate-extra.css:184, 186, 189; светлый — elevate-light.css:24, 34, 45–46. */
export const LEVELS_TINT = {
  dark: { cur: 'rgba(255,255,255,0.24)', curRing: null, num: 'rgba(255,255,255,0.14)', pip: 'rgba(255,255,255,0.2)', pipOn: '#FFFFFF' },
  light: {
    cur: '#FFFFFF',
    curRing: '0px 0px 0px 2px #2F4A6B, 0px 12px 28px -14px rgba(40,56,96,0.4), 0px 1px 2px rgba(40,56,96,0.08)',
    num: 'rgba(20,27,43,0.07)',
    pip: 'rgba(20,27,43,0.12)',
    pipOn: '#2F4A6B',
  },
} as const;
