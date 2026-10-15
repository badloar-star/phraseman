// зачем: владелец 2026-10-15 выбрал вариант C «Живые темы» и попросил макет АБСОЛЮТНО ВСЕХ экранов сайта
// со всеми состояниями — только новый дизайн, содержимое текущего сайта не убирать и не заменять.
// Здесь общая оболочка всех страниц: шапка с выбором темы (тема помнится между страницами),
// подвал, переключатель состояний макета и общие детали (поля, строки, цены, текст документов).
import { THEMES, SPRITE, ic, CSS, CSS_C, JS } from './_build.mjs';

export { ic };
const APP = '../../../../assets';
const SITE = '../../../../knowly-www/assets';
export const ASSET = { APP, SITE };

// Карта страниц макета: адрес живого сайта → файл макета.
export const NAV = [
  ['app.html', 'Приложение', 'The app'],
  ['english-level-test.html', 'Тест уровня', 'Level test'],
  ['guides.html', 'Журнал', 'Journal'],
  ['links.html', 'Каналы', 'Channels'],
  ['gift.html', 'Подарить', 'Give a gift'],
  ['contact.html', 'Поддержка', 'Support'],
];

export const SHELL_CSS = `
/* ---------- оболочка всех страниц (вариант C) ---------- */
.theme-btn { width: 40px; height: 40px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; display: grid; place-items: center; background: var(--control); flex: none; transition: transform 240ms var(--spring); }
.theme-btn:active { transform: scale(.92); }
.theme-btn i { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, var(--g1), var(--g2)); box-shadow: 0 0 0 2px var(--card-solid); }
:root[data-mode="light"] .theme-btn i { box-shadow: 0 0 0 2px #fff; }
.theme-pop { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 84px); right: max(16px, calc((100vw - var(--wrap)) / 2 + 40px)); z-index: 40; width: min(340px, calc(100vw - 32px));
  padding: 18px; border-radius: 24px; display: grid; gap: 14px; transform-origin: top right; transition: opacity 220ms var(--ease), transform 260ms var(--ease); }
.theme-pop[hidden] { display: grid !important; opacity: 0; transform: scale(.96) translateY(-6px); pointer-events: none; visibility: hidden; }
.theme-pop .swatches { grid-template-columns: repeat(6, 1fr); justify-items: center; }
.menu-btn { display: none; width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--control); color: var(--text); place-items: center; cursor: pointer; flex: none; }
.mnav { position: fixed; inset: calc(env(safe-area-inset-top, 0px) + 84px) 16px auto; z-index: 40; padding: 10px; border-radius: 24px; display: grid; gap: 2px; transition: opacity 220ms var(--ease), transform 260ms var(--ease); }
.mnav[hidden] { display: grid !important; opacity: 0; transform: translateY(-6px); pointer-events: none; visibility: hidden; }
.mnav a { padding: 14px 16px; border-radius: 14px; font-weight: 600; font-size: 17px; display: flex; justify-content: space-between; align-items: center; }
.mnav a:hover, .mnav a[aria-current="page"] { background: var(--control); }
.mtheme { display: none; border: 0; background: transparent; color: var(--text); font: 600 17px/1 var(--font); padding: 8px 8px 8px 16px; border-radius: 14px; justify-content: space-between; align-items: center; cursor: pointer; }
/* зачем: на 375 px в капсуле не помещались бренд + тема + «Начать бесплатно» + меню — тема уезжает в меню */
@media (max-width: 440px) { .bar > .theme-btn { display: none; } .mtheme { display: flex; } .bar { gap: 8px; } .bar .btn-sm { padding: 0 14px; font-size: 13px; } }
.nav a[aria-current="page"] { color: var(--text); background: var(--control); }

/* шапка страницы */
.phead { padding-block: clamp(40px, 7vw, 88px) clamp(24px, 4vw, 48px); }
.phead .wrap { display: grid; gap: 22px; }
.phead h1 { font-size: clamp(40px, 6.4vw, 80px); line-height: 1; letter-spacing: -.04em; max-width: 16ch; }
.phead h1 .l2 { display: block; color: var(--sec); }
.phead .lead { font-size: var(--t-l); color: var(--sec); max-width: 46ch; }
.phead .acts { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.crumbs { display: flex; gap: 8px; align-items: center; font-size: 14px; color: var(--sec); }
.crumbs a:hover { color: var(--text); }
.phead.center .wrap { justify-items: center; text-align: center; }
.phead.center h1, .phead.center .lead { margin-inline: auto; }

/* переключатель состояний макета — только для показа владельцу */
.states { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 84px); z-index: 20; display: flex; justify-content: center; padding-inline: 16px; margin-bottom: 8px; pointer-events: none; }
.states .in { pointer-events: auto; display: flex; gap: 4px; padding: 4px; border-radius: 999px; background: var(--bar); border: 1px dashed color-mix(in srgb, var(--fill) 45%, transparent);
  box-shadow: var(--shadow); overflow-x: auto; max-width: 100%; scrollbar-width: none; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.states .in::-webkit-scrollbar { display: none; }
.states b { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); padding: 0 8px 0 12px; align-self: center; white-space: nowrap; }
.states button { border: 0; background: transparent; color: var(--sec); font: 600 13px/1 var(--font); padding: 9px 13px; border-radius: 999px; cursor: pointer; white-space: nowrap; transition: background-color 200ms, color 200ms; }
.states button[aria-pressed="true"] { background: var(--cta); color: var(--cta-ink); }
[data-state][data-hidden] { display: none !important; }
[data-state] { animation: stIn 420ms var(--ease); }
@keyframes stIn { from { opacity: .001; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* поля ввода 2.0: заливка тоном, без рамок, кромка только в фокусе */
.field { display: grid; gap: 8px; }
.field > span { font-size: 13px; font-weight: 600; color: var(--sec); }
.input, .select, .textarea { width: 100%; min-height: 52px; padding: 0 16px; border-radius: 14px; border: 1px solid transparent; background: var(--control); color: var(--text);
  font: 500 16px/1.4 var(--font); outline: none; transition: border-color 160ms, background-color 160ms, box-shadow 160ms; }
.textarea { padding: 14px 16px; min-height: 130px; resize: vertical; }
.input::placeholder, .textarea::placeholder { color: var(--muted); }
.input:focus, .select:focus, .textarea:focus { border-color: color-mix(in srgb, var(--fill) 60%, transparent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--fill) 16%, transparent); }
.input.err { border-color: #F2766B; box-shadow: 0 0 0 4px rgba(242,118,107,.16); }
.hint { font-size: 13px; color: var(--muted); }
.hint.err { color: #F2766B; }
:root[data-mode="light"] .hint.err, :root[data-mode="light"] .input.err { color: #C2382C; }
.check { display: flex; gap: 12px; align-items: flex-start; font-size: 14px; color: var(--sec); cursor: pointer; }
.check input { appearance: none; width: 22px; height: 22px; border-radius: 7px; background: var(--control); flex: none; margin: 0; display: grid; place-items: center; cursor: pointer; transition: background-color 200ms; }
.check input:checked { background: var(--cta); }
.check input:checked::after { content: ""; width: 10px; height: 6px; border: 2px solid var(--cta-ink); border-top: 0; border-right: 0; transform: rotate(-45deg) translate(1px, -1px); }
.form { display: grid; gap: 16px; }
.form-card { padding: clamp(22px, 4vw, 36px); border-radius: 28px; }
.row2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }

/* сегменты-выбор (язык теста, тариф, дизайн) */
.choice { display: grid; gap: 10px; }
.choice.cols2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.choice.cols3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.opt { position: relative; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 18px; background: var(--card); border: 1px solid var(--edge); cursor: pointer; text-align: left; color: var(--text); font: inherit;
  transition: transform 240ms var(--spring), background-color 200ms, box-shadow 200ms; }
.opt:active { transform: scale(.98); }
.opt[aria-pressed="true"], .opt.on { background: color-mix(in srgb, var(--fill) 14%, var(--card-solid)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fill) 70%, transparent); }
.opt .tx { flex: 1; min-width: 0; }
.opt .tt { font-weight: 700; font-size: 16px; display: block; }
.opt .st { font-size: 13px; color: var(--sec); display: block; margin-top: 2px; }
.opt .flag { width: 34px; height: 34px; border-radius: 50%; background: var(--tile); display: grid; place-items: center; font-size: 13px; font-weight: 800; flex: none; }
.radio { width: 22px; height: 22px; border-radius: 50%; background: var(--control); flex: none; display: grid; place-items: center; }
.opt[aria-pressed="true"] .radio, .opt.on .radio { background: var(--cta); }
.opt[aria-pressed="true"] .radio::after, .opt.on .radio::after { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--cta-ink); }

/* карточки-тарифы */
.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
.plan { padding: 26px; border-radius: 26px; display: grid; gap: 14px; align-content: start; }
.plan.hl { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fill) 60%, transparent), var(--shadow); }
.plan .ov { font-size: 12px; }
.plan h3 { font-size: 24px; letter-spacing: -.02em; }
.plan .price { font-size: 40px; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.plan .price small { font-size: 15px; color: var(--sec); font-weight: 600; letter-spacing: 0; }
.plan ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.plan li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; color: var(--sec); }
.plan li svg { color: var(--fill); margin-top: 2px; }
.plan .btn { margin-top: 6px; width: 100%; }
.badge { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: var(--control); font-size: 12px; font-weight: 700; color: var(--text); white-space: nowrap; }
.badge.acc { background: var(--cta); color: var(--cta-ink); }

/* строки-списки (как шторка режимов) */
.list { border-radius: 24px; padding: 6px 0; }
.lrow { display: flex; align-items: center; gap: 16px; padding: 16px 22px; position: relative; }
.lrow + .lrow::before { content: ""; position: absolute; top: 0; left: 84px; right: 22px; height: 1px; background: var(--track); }
.lrow .tx { flex: 1; min-width: 0; }
.lrow .tt { font-weight: 700; font-size: 16px; display: block; }
.lrow .st { font-size: 14px; color: var(--sec); display: block; margin-top: 2px; }
.lrow .ch { color: var(--sec); }
a.lrow:hover .ch { color: var(--text); transform: translateX(2px); }
.lrow .ch { transition: transform 240ms var(--ease); }

/* шаги-инструкция */
.howto { display: grid; gap: 12px; counter-reset: st; }
.howto li { list-style: none; display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 16px; padding: 20px 22px; border-radius: 22px; background: var(--card); border: 1px solid var(--edge); box-shadow: var(--shadow); }
.howto li::before { counter-increment: st; content: counter(st); width: 44px; height: 44px; border-radius: 13px; background: var(--tile); display: grid; place-items: center; font-weight: 800; font-size: 18px; font-variant-numeric: tabular-nums; }
.howto b { display: block; font-size: 17px; margin-top: 10px; }
.howto p { color: var(--sec); font-size: 15px; margin-top: 4px; }
.howto { padding: 0; margin: 0; }

/* длинные документы и статьи */
.doc-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: clamp(28px, 5vw, 64px); align-items: start; }
.toc { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 96px); padding: 18px; border-radius: 22px; display: grid; gap: 2px; max-height: calc(100vh - 120px); overflow: auto; }
.toc b { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); padding: 4px 10px 10px; }
.toc a { font-size: 14px; color: var(--sec); padding: 8px 10px; border-radius: 10px; line-height: 1.35; transition: background-color 160ms, color 160ms; }
.toc a:hover, .toc a.on { background: var(--control); color: var(--text); }
.prose { max-width: 70ch; font-size: 17px; line-height: 1.7; }
.prose h2 { font-size: clamp(24px, 2.6vw, 30px); letter-spacing: -.025em; line-height: 1.2; margin: 48px 0 14px; scroll-margin-top: 110px; }
.prose h2:first-child { margin-top: 0; }
.prose h3 { font-size: 19px; margin: 28px 0 10px; }
.prose p, .prose li { color: color-mix(in srgb, var(--text) 82%, var(--sec)); }
.prose p + p { margin-top: 14px; }
.prose ul, .prose ol { padding-left: 22px; display: grid; gap: 8px; margin: 14px 0; }
.prose a { color: var(--fill); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
.callout { margin: 22px 0; padding: 20px 22px; border-radius: 20px; background: var(--card); border: 1px solid var(--edge); }
.callout .ov { display: block; margin-bottom: 6px; font-size: 12px; }
.phrases { margin: 22px 0; border-radius: 20px; background: var(--card); border: 1px solid var(--edge); overflow: hidden; }
.phrases div { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; padding: 14px 20px; font-size: 15px; }
.phrases div + div { border-top: 1px solid var(--track); }
.phrases b { font-weight: 700; color: var(--text); }
.phrases span { color: var(--sec); }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 15px; }
.tbl-wrap { overflow-x: auto; border-radius: 20px; background: var(--card); border: 1px solid var(--edge); margin: 18px 0; }
.tbl th, .tbl td { text-align: left; padding: 12px 16px; vertical-align: top; }
.tbl th { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); font-weight: 700; }
.tbl tr + tr td { border-top: 1px solid var(--track); }

/* статьи-плитки журнала */
.cards3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.acard { display: grid; border-radius: 24px; overflow: hidden; transition: transform 300ms var(--ease); }
.acard:hover { transform: translateY(-3px); }
.acard .img { aspect-ratio: 16 / 10; background: var(--tile); overflow: hidden; }
.acard .img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 600ms var(--ease); filter: saturate(.85); }
.acard:hover .img img { transform: scale(1.04); }
.acard .bd { padding: 20px 22px 24px; display: grid; gap: 8px; }
.acard .bd b { font-size: 19px; line-height: 1.3; letter-spacing: -.01em; }
.acard .bd span { color: var(--sec); font-size: 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { border: 0; cursor: pointer; font: 600 14px/1 var(--font); padding: 10px 16px; border-radius: 999px; background: var(--control); color: var(--sec); transition: background-color 200ms, color 200ms; }
.chip[aria-pressed="true"] { background: var(--cta); color: var(--cta-ink); }

/* пустые/ошибочные/успешные состояния */
.state-card { padding: clamp(32px, 6vw, 64px) 24px; border-radius: 30px; display: grid; justify-items: center; gap: 18px; text-align: center; }
.state-card .big-ic { width: 72px; height: 72px; border-radius: 22px; background: var(--tile); display: grid; place-items: center; }
.state-card .big-ic svg { width: 32px; height: 32px; }
.state-card h2 { font-size: clamp(26px, 3.4vw, 38px); letter-spacing: -.03em; line-height: 1.1; }
.state-card p { color: var(--sec); max-width: 44ch; }
.ok-ic { color: var(--fill); }
.toast { position: fixed; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); transform: translateX(-50%); z-index: 50; padding: 14px 20px; border-radius: 18px; background: var(--card-solid); box-shadow: var(--shadow); border: 1px solid var(--edge); font-weight: 600; font-size: 15px; display: flex; gap: 10px; align-items: center; }
.spinner { width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid var(--track); border-top-color: var(--fill); animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.skel { border-radius: 12px; background: linear-gradient(90deg, var(--control) 0%, color-mix(in srgb, var(--control) 60%, var(--text) 8%) 50%, var(--control) 100%); background-size: 200% 100%; animation: sk 1.4s linear infinite; }
@keyframes sk { to { background-position: -200% 0; } }

/* окно/шторка */
.modal-back { position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,.55); display: grid; place-items: end center; padding: 16px; }
.modal { width: min(560px, 100%); border-radius: 28px; padding: 26px; display: grid; gap: 16px; background: var(--sheet); border: 1px solid var(--edge); box-shadow: var(--shadow); }
@media (min-width: 700px) { .modal-back { place-items: center; } }
.cookie { position: fixed; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); z-index: 44; max-width: 560px; margin-inline: auto; padding: 18px 20px; border-radius: 24px; display: grid; gap: 14px; }
.cookie .acts { display: flex; flex-wrap: wrap; gap: 10px; }

/* вопрос теста */
.qcard { padding: clamp(22px, 4vw, 40px); border-radius: 30px; display: grid; gap: 22px; }
.qtop { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; color: var(--sec); font-variant-numeric: tabular-nums; }
.qtrk { height: 6px; border-radius: 3px; background: var(--track); overflow: hidden; }
.qtrk b { display: block; height: 100%; width: var(--w); background: var(--fill); border-radius: 3px; transition: width 500ms var(--ease); }
.qtext { font-size: clamp(22px, 2.6vw, 30px); font-weight: 700; letter-spacing: -.02em; line-height: 1.3; }
.qtext u { text-decoration: none; display: inline-block; min-width: 90px; border-bottom: 2px solid var(--fill); }
.answers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.answers .opt { min-height: 60px; font-weight: 600; }
.opt.right { background: color-mix(in srgb, #6FD08C 18%, var(--card-solid)); box-shadow: inset 0 0 0 1.5px rgba(111,208,140,.8); }
.opt.wrong { background: color-mix(in srgb, #F2766B 16%, var(--card-solid)); box-shadow: inset 0 0 0 1.5px rgba(242,118,107,.75); }
.level-big { font-size: clamp(88px, 14vw, 168px); font-weight: 800; letter-spacing: -.06em; line-height: .9; }
.cefr-scale { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; width: 100%; max-width: 520px; }
.cefr-scale span { display: grid; place-items: center; height: 40px; border-radius: 12px; background: var(--control); font-weight: 700; font-size: 14px; color: var(--sec); }
.cefr-scale span.on { background: var(--cta); color: var(--cta-ink); }

/* сертификат */
.certs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.cert-thumb { aspect-ratio: 1.42; border-radius: 14px; border: 0; cursor: pointer; padding: 0; position: relative; overflow: hidden; transition: transform 240ms var(--spring); }
.cert-thumb:active { transform: scale(.96); }
.cert-thumb[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--fill); }
.cert-thumb span { position: absolute; left: 8px; bottom: 6px; font-size: 11px; font-weight: 700; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
.cert-big { aspect-ratio: 1.414; width: 100%; border-radius: 22px; padding: clamp(20px, 4vw, 44px); display: grid; align-content: space-between; color: #fff; position: relative; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.4); transition: background 500ms var(--ease); }
.cert-big::after { content: ""; position: absolute; inset: 14px; border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.28); pointer-events: none; }
.cert-big .nm { font-size: clamp(24px, 3.6vw, 44px); font-weight: 800; letter-spacing: -.03em; line-height: 1.05; }
.cert-big .lv { font-size: clamp(54px, 9vw, 110px); font-weight: 800; letter-spacing: -.05em; line-height: .9; }
.cert-big .sm { font-size: 13px; opacity: .8; }

/* 404 */
.nf { font-size: clamp(120px, 22vw, 260px); font-weight: 800; letter-spacing: -.07em; line-height: .85;
  color: transparent; -webkit-text-stroke: 2px color-mix(in srgb, var(--text) 30%, transparent); }

/* витрина всех экранов */
.gal { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.gcard { padding: 22px; border-radius: 24px; display: grid; gap: 12px; align-content: start; transition: transform 300ms var(--ease); }
.gcard:hover { transform: translateY(-3px); }
.gcard .r { display: flex; align-items: center; gap: 14px; }
.gcard b { font-size: 18px; letter-spacing: -.01em; }
.gcard .path { font-size: 13px; color: var(--muted); }
.gcard .sts { display: flex; flex-wrap: wrap; gap: 6px; }
.gcard .sts a { font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 999px; background: var(--control); color: var(--sec); }
.gcard .sts a:hover { color: var(--text); }
.gsec { margin-top: 48px; }
.gsec h2 { font-size: 22px; margin-bottom: 16px; }

@media (max-width: 980px) {
  .menu-btn { display: grid; }
  .plans, .cards3, .gal { grid-template-columns: minmax(0, 1fr); }
  .doc-layout { grid-template-columns: minmax(0, 1fr); }
  .toc { position: static; max-height: none; }
  .certs { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 540px) {
  .row2, .answers, .choice.cols2, .choice.cols3 { grid-template-columns: minmax(0, 1fr); }
  .phrases div { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .lrow { padding: 14px 18px; }
  .lrow + .lrow::before { left: 18px; right: 18px; }
  .theme-btn { width: 36px; height: 36px; }
}
`;

export const header = (current) => `
<header class="top"><div class="wrap"><div class="bar">
  <a class="brand" href="index.html" aria-label="Phraseman — главная">phrase<span class="tail">man</span></a>
  <nav class="nav" aria-label="Главная навигация">
    ${NAV.map(([f, ru, en]) => `<a href="${f}" data-en="${en}"${f === current ? ' aria-current="page"' : ''}>${ru}</a>`).join('')}
  </nav>
  <div class="lang" role="group" aria-label="Язык сайта"><button type="button" data-lang="ru" aria-pressed="true">RU</button><button type="button" data-lang="en" aria-pressed="false">EN</button></div>
  <button type="button" class="theme-btn" data-theme-open aria-label="Тема сайта" aria-expanded="false"><i></i></button>
  <a class="btn btn-primary btn-sm" href="download.html" data-en="Start for free">Начать бесплатно</a>
  <button type="button" class="menu-btn" data-menu-open aria-label="Открыть меню" aria-expanded="false">${ic('menu', 's18')}</button>
</div></div></header>
<div class="glass theme-pop" id="themePop" hidden role="dialog" aria-label="Тема сайта">
  <span class="ov" style="font-size:12px">Тема приложения</span>
  <div class="swatches" data-swatches role="group" aria-label="Темы"></div>
  <div class="seg" role="group" aria-label="Оформление">
    <button type="button" data-mode-btn="dark" aria-pressed="true">${ic('moon', 's16')}Тёмная</button>
    <button type="button" data-mode-btn="light" aria-pressed="false">${ic('sun', 's16')}Светлая</button>
  </div>
  <div class="range"><label for="kSlider" class="lbl" style="font-size:13px;font-weight:700;color:var(--sec)">Насыщенность</label><input id="kSlider" type="range" min="0" max="100" step="5" value="60"><b id="kVal">60%</b></div>
</div>
<nav class="glass mnav" id="mnav" hidden aria-label="Меню">
  ${NAV.map(([f, ru]) => `<a href="${f}"${f === current ? ' aria-current="page"' : ''}>${ru}${ic('chev', 's18')}</a>`).join('')}
  <a href="faq.html">Частые вопросы${ic('chev', 's18')}</a>
  <button type="button" class="mtheme" data-theme-open2>Тема сайта<span class="theme-btn" aria-hidden="true"><i></i></span></button>
</nav>`;

export const footer = `
<footer><div class="wrap">
  <div class="foot-top">
    <div><a class="brand" href="index.html">phrase<span class="tail">man</span></a><p>Чуть больше языка.<br>Чуть больше свободы.</p></div>
    <div class="foot-col"><b>Практиковаться</b><a href="app.html">О приложении</a><a href="download.html">Скачать Phraseman</a><a href="english-level-test.html">Определить уровень</a></div>
    <div class="foot-col"><b>Открывать больше</b><a href="guides.html">Гайды и истории</a><a href="premium.html">Plus и Pro</a><a href="gift.html">Подарить доступ</a><a href="russia.html">Оплата в России</a></div>
    <div class="foot-col"><b>Мы рядом</b><a href="contact.html">Поддержка</a><a href="faq.html">Частые вопросы</a><a href="index.html#reviews">Отзывы</a></div>
  </div>
  <div class="foot-bottom"><span>© 2026 Knowly · Phraseman</span><div><a href="legal-privacy.html">Конфиденциальность</a><a href="legal-terms.html">Условия</a><a href="legal-data-deletion.html">Удаление данных</a><a href="#cookie" data-cookie-open>Настройки cookies</a></div></div>
</div></footer>`;

// Общий скрипт оболочки: тема из памяти браузера, всплывашка темы, меню, состояния макета, cookies.
export const SHELL_JS = `
(function () {
  var T = window.__pmTheme; if (!T) { console.warn('[SITE-2.0] нет движка темы'); return; }
  var KEY = 'pm-site-theme-v1';
  // зачем: тема, выбранная на одной странице макета, сохраняется при переходе на другую
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved.theme === 'number') { T.state.mode = saved.mode; T.state.theme = saved.theme; T.state.k = saved.k; T.apply(); } }
  catch (e) { console.warn('[SITE-2.0] тема из памяти не прочитана:', e && e.message); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(T.state)); } catch (e) { console.warn('[SITE-2.0] тема не сохранена:', e && e.message); } }
  function sync() {
    // зачем: наборов цветов может быть два (шапка и студия на главной) — отмечаем выбор в каждом
    document.querySelectorAll('[data-swatches]').forEach(function (box) { [].forEach.call(box.children, function (x, j) { x.setAttribute('aria-pressed', String(j === T.state.theme)); }); });
    document.querySelectorAll('[data-mode-btn]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.modeBtn === T.state.mode)); });
    document.querySelectorAll('#kSlider').forEach(function (s) { s.value = Math.round(T.state.k * 100); });
    document.querySelectorAll('#kVal').forEach(function (v) { v.textContent = Math.round(T.state.k * 100) + '%'; });
  }
  document.querySelectorAll('[data-swatches]').forEach(function (box) {
    if (box.children.length) return;
    T.themes.forEach(function (t, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.title = t[0]; b.setAttribute('aria-label', 'Тема ' + t[0]);
      b.style.background = t[1] ? 'linear-gradient(135deg,' + t[1] + ',' + t[2] + ')' : '#2A2A2C';
      b.addEventListener('click', function () { T.state.theme = i; T.apply(); sync(); save(); });
      box.appendChild(b);
    });
  });
  document.querySelectorAll('[data-mode-btn]').forEach(function (b) { b.addEventListener('click', function () { T.state.mode = b.dataset.modeBtn; T.apply(); sync(); save(); }); });
  document.querySelectorAll('#kSlider').forEach(function (s) { s.addEventListener('input', function () { T.state.k = s.value / 100; T.apply(); sync(); save(); }); });
  sync();

  function toggler(btnSel, popId) {
    var btn = document.querySelector(btnSel), pop = document.getElementById(popId);
    if (!btn || !pop) return;
    btn.addEventListener('click', function (e) { e.stopPropagation(); var open = pop.hidden; closeAll(); pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  function closeAll() { ['themePop', 'mnav'].forEach(function (id) { var p = document.getElementById(id); if (p) p.hidden = true; }); document.querySelectorAll('[aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); }
  toggler('[data-theme-open]', 'themePop'); toggler('[data-menu-open]', 'mnav');
  var t2 = document.querySelector('[data-theme-open2]');
  if (t2) t2.addEventListener('click', function (e) { e.stopPropagation(); closeAll(); var p = document.getElementById('themePop'); if (p) p.hidden = false; });
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  // состояния макета: кнопки + #якорь (например english-level-test.html#result)
  var groups = {};
  document.querySelectorAll('[data-state]').forEach(function (el) { groups[el.dataset.state] = true; });
  function show(name) {
    if (!groups[name]) return false;
    document.querySelectorAll('[data-state]').forEach(function (el) { if (el.dataset.state === name) el.removeAttribute('data-hidden'); else el.setAttribute('data-hidden', ''); });
    document.querySelectorAll('[data-show]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.show === name)); });
    return true;
  }
  window.__pmShow = show;
  document.querySelectorAll('[data-show]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.show); try { history.replaceState(null, '', '#' + b.dataset.show); } catch (e) { console.warn('[SITE-2.0] якорь не записан:', e && e.message); } }); });
  document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function (e) { if (b.tagName === 'A') e.preventDefault(); show(b.dataset.go); scrollTo({ top: 0, behavior: 'smooth' }); }); });
  var first = document.querySelector('[data-show]');
  if (!(location.hash && show(location.hash.slice(1))) && first) show(first.dataset.show);

  // cookies: баннер по ссылке «Настройки cookies»
  var ck = document.getElementById('cookie');
  document.querySelectorAll('[data-cookie-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); if (ck) ck.hidden = false; }); });
  document.querySelectorAll('[data-cookie-close]').forEach(function (b) { b.addEventListener('click', function () { if (ck) ck.hidden = true; }); });
})();`;

export const cookieBanner = `
<div class="glass cookie" id="cookie" hidden role="dialog" aria-label="Согласие на куки">
  <p style="font-size:15px">Используем куки, чтобы понимать, какая реклама работает. <a href="legal-privacy.html" style="color:var(--fill);text-decoration:underline;text-underline-offset:3px">Подробнее</a></p>
  <div class="acts"><button type="button" class="btn btn-primary btn-sm" data-cookie-close>Хорошо</button><button type="button" class="btn btn-ghost btn-sm" data-cookie-close>Нет</button></div>
</div>`;

export const statesBar = (items) => `
<div class="states" aria-label="Состояния макета"><div class="in"><b>Макет</b>${items.map(([id, label]) => `<button type="button" data-show="${id}" aria-pressed="false">${label}</button>`).join('')}</div></div>`;

export const pageHead = ({ ov, h1, l2, lead, acts = '', crumbs = '', center = false }) => `
<section class="phead${center ? ' center' : ''}"><div class="wrap">
  ${crumbs}${ov ? `<span class="ov">${ov}</span>` : ''}
  <h1>${h1}${l2 ? `<span class="l2">${l2}</span>` : ''}</h1>
  ${lead ? `<p class="lead">${lead}</p>` : ''}
  ${acts ? `<div class="acts">${acts}</div>` : ''}
</div></section>`;

const EXTRA_SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
<symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></symbol>
<symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></symbol>
<symbol id="i-telegram" viewBox="0 0 24 24"><path d="M21 4.5L3 11.5l5.5 2 2 6 3-3.5 5 3.5z"/><path d="M8.5 13.5l12-9"/></symbol>
<symbol id="i-youtube" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/></symbol>
<symbol id="i-insta" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/></symbol>
<symbol id="i-tiktok" viewBox="0 0 24 24"><path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3.5a4.5 4.5 0 0 0 4.5 4.5"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.3-7.5 9.5-4.3-1.2-7.5-5-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></symbol>
<symbol id="i-card" viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.2"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5V20h-5.5v-5.5h-5V20H4z"/></symbol>
<symbol id="i-swords" viewBox="0 0 24 24"><path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M7 15l-3 3 2 2 3-3M17 15l3 3-2 2-3-3"/></symbol>
<symbol id="i-link" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/></symbol>
<symbol id="i-qr" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h2v2h-2zM18.5 18.5h2v2h-2zM18.5 14.5h2M14.5 18.5v2"/></symbol>
</svg>`;

// Сборка страницы: общий CSS вариантов + оболочка + свой CSS страницы.
export function buildPage({ file, title, body, css = '', js = '', states = null }) {
  const v = { mode: 'dark', theme: 1, k: 0.6, studio: false };
  return `<!doctype html><meta charset="utf-8">
<html lang="ru" data-mode="dark">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} · Phraseman</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
/* Макет «${title}» — вариант C «Живые темы». Сгенерировано docs/design/site-2.0/_pages.mjs — правь шаблон, не этот файл. */
${CSS}${CSS_C}${SHELL_CSS}${css}
</style>
</head>
<body>
<a class="skip" href="#content">К содержанию</a>
${SPRITE}${EXTRA_SPRITE}
<div class="page">
<div class="glow g-top" aria-hidden="true"></div><div class="glow g-mid" aria-hidden="true"></div><div class="glow g-end" aria-hidden="true"></div>
${header(file)}
${states ? statesBar(states) : ''}
<main id="content">
${body}
</main>
${footer}
${cookieBanner}
</div>
<script>${JS(v)}</script>
<script>${SHELL_JS}</script>
${js ? `<script>${js}</script>` : ''}
</body>
</html>
`;
}
