/**
 * Числа игры «Гонка с собой» — перенесены из утверждённого макета без подбора на глаз.
 * Владелец 11.11.2026: «все анимации с макета», «код должен быть в точности перенесён».
 * Источники:
 *  • docs/design/v2-app/elevate-modes.js, `blitz(ph, auto, ghost)` — ход игры (на неё ссылается elevate-games.js, `race`);
 *  • docs/design/v2-app/elevate-extra.css:110–126 — `.hearts`, `.tbar`, `.qcard`, `.race`;
 *  • docs/design/v2-app/elevate-mechanics.css:52, 57–58, 194–208 — `.gpill`, `.top`, `.panel2`, `.bar`;
 *  • docs/design/v2-app/elevate-extra.css:44–47 — `.rec` (панель рекорда `P.record`, elevate-core.js:39);
 *  • docs/design/v2-app/elevate-flow.js:76 — строки панели: «Сегодня 23 / .77», «Вчера 19 / .63», «Рекорд 26 / .87».
 * Менять значение здесь можно только вместе с макетом.
 */

export const RACE_MOTION = {
  // ── ход игры (elevate-modes.js, `blitz`) ──
  /** `bar.animate(…, { duration: 60000, easing: 'linear' })` и `sec = 60`. */
  durationMs: 60000,
  /** `setInterval(…, 1000)` — счётчик времени и шаг «вчерашней» монеты. */
  tickMs: 1000,
  /** `lives = 3`; в гонке три ошибки заканчивают заход. */
  lives: 3, // guard-ok: сердца одного захода в памяти экрана, не баланс и не опыт — на диск и в сеть не идут
  /** `G.after(ok ? 800 : 1500, …)` — пауза до следующего вопроса. */
  afterOkMs: 800,
  afterMissMs: 1500,
  /** `G.after(900, …)` — пауза перед «Минута вышла». */
  endDelayMs: 900,
  /** `G.after(300, …)` — «вчерашняя» монета трогается через 300 мс после старта. */
  ghostStartMs: 300,
  /** Четыре варианта ответа: `BL[…].o` — по четыре перевода. */
  options: 4,

  // ── дорожки (elevate-extra.css:119–126, `.race`) ──
  raceHeight: 58,
  raceMarginTop: 16,
  laneInset: 22,
  laneHeight: 3,
  laneRadius: 2,
  laneTopToday: 14,
  laneTopYesterday: 44,
  /** `.race .rn { width: 28px; height: 28px; margin-top: -13px }`, монета `K.coinImg(7, 28)`. */
  coinSize: 28,
  coinShiftY: -13,
  coinRank: 7,
  /** `.race .rn { transition: transform 600ms var(--out) }`. */
  meMoveMs: 600,
  /** `.race .rn.gh { opacity: .5; filter: grayscale(1); transition: transform 1000ms linear }`. */
  ghostMoveMs: 1000,
  ghostOpacity: 0.5,
  /** `.race .lb2 { font-size: 12px; font-weight: 700 }`, `.a { top: -4px }`, `.b { top: 26px }`. */
  labelSize: 12,
  labelTopToday: -4,
  labelTopYesterday: 26,

  // ── полоса времени (elevate-extra.css:113–114, `.tbar`) ──
  barHeight: 6,
  barRadius: 3,
  barMarginTop: 14,
  barGlowRadius: 10,
  barGlowOpacity: 0.7,

  // ── карточка вопроса (elevate-extra.css:115–118, `.qcard`) ──
  cardPadV: 26,
  cardPadH: 22,
  cardMarginTop: 24,
  cardMinHeight: 150,
  kickerSize: 15,
  questionSize: 32,
  questionLine: 38,
  questionLetter: -0.6,
  questionMarginTop: 12,
  /** `.qcard.swap .q { animation: rise 420ms var(--out) both }` — новый вопрос поднимается за 420 мс. */
  swapMs: 420,

  // ── сердца (elevate-extra.css:110–112, `.hearts`) ──
  heartSize: 17,
  heartGap: 5,
  /** `.hearts svg.lost { opacity: .25; transform: scale(.7) }`, `transition: opacity 300ms, transform 400ms var(--spring)`. */
  heartLostOpacity: 0.25,
  heartLostScale: 0.7,
  heartFadeMs: 300,
  heartScaleMs: 400,

  // ── плашки в шапке (elevate-mechanics.css:52, 57–58) ──
  pillHeight: 34,
  pillPadH: 14,
  pillRadius: 17,
  pillTextSize: 15,
  topHeight: 44,
  topGap: 12,
  titleSize: 20,

  // ── панель рекорда (elevate-mechanics.css:194–208, elevate-extra.css:44–47, elevate-core.js:39 и :56) ──
  panelPadV: 16,
  panelPadH: 18,
  panelTitleSize: 17,
  panelTitleLine: 22,
  recordLabelWidth: 78,
  recordGap: 10,
  recordRowMarginTop: 12,
  recordTextSize: 14,
  recordValueSize: 16,
  recordBarHeight: 8,
  recordBarRadius: 4,
  /** `.rec.old .bar i { background: rgba(255,255,255,.4) }` — прошлые строки тише. */
  recordOldOpacity: 0.4,
  /** `.bar i { transition: transform 1100ms cubic-bezier(.2,.8,.2,1) }`, заполнение — через 900 мс после показа итога. */
  recordFillMs: 1100,
  recordFillDelayMs: 900,
  /**
   * Масштаб полос: в макете 23 → .77, 19 → .63, 26 → .87 — это ровно «верных / 30». Тот же масштаб у дорожек:
   * монета доходит до финиша на тридцатом верном ответе.
   */
  scale: 30,
} as const;

/** elevate-mechanics.css:12 `--out` и elevate-mechanics.css:207 — кривая заполнения полосы рекорда. */
export const RACE_EASE = {
  out: [0.2, 1, 0.3, 1],
  spring: [0.3, 1.4, 0.5, 1],
  fill: [0.2, 0.8, 0.2, 1],
} as const;
