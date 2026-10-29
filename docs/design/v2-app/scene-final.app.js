/* scene-final.app.js — чистый макет «Сцена 2.0 — утверждённый вид»: ТОЛЬКО утверждённое владельцем 29.10 (тёмное — «Глубокое небо»,
   светлое — «А — тон темы ярче и глубже», вечер Главной — небо + тёплый янтарный край), переключатель темы и оформления сверху, каждый
   экран на реальном кадре Сверки: Главная, Главная вечером, Диалоги, Пик, Уроки (вкладка «Уроки» — обложка курса). Без вариантов,
   чипов трактовок, свёрнутых прежних видов, пояснений и служебных строк (владелец 29.10 ~10:40: «жду обновлённый макет, где всё лишнее
   убрано»). Формулы и задания — те же, что в dark-themes.app.js (window.__dt: approvedVariant / eveningVariant / oldSpecFor), чтобы
   макет и спецификация scene-approved.js оставались одним кодом.
   Герой Главной (владелец: «иконки … должны быть большие и не под самый верх, а посредине справа»): картинка героя убирается со старого
   места и рисуется заново 144 dp справа по центру сцены (SceneApproved.heroHome); заголовок урока перерисован в две строки шириной
   ≤ 58 %, чтобы герой на него не ложился. Журнал — [SF]. */
(() => {
  const LOG = '[SF]'; const RF = window.RF; const SP = window.__sp; const DT = window.__dt; const SA = window.SceneApproved; const REAL = window.__REAL || {};
  if (!SP || !DT || !SA || !RF || !window.SceneReal) { console.log(LOG, 'нет движков:', JSON.stringify({ sp: !!SP, dt: !!DT, sa: !!SA, rf: !!RF, real: !!window.SceneReal })); return; }
  const THEMES = SP.THEMES; const W = 1080; const DPX = 2.625;
  const q = new URLSearchParams(location.search);
  let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let THEME = THEMES[q.get('th')] ? q.get('th') : 'graphite';
  let JOBS = {};
  const frames = Object.values(REAL).filter((m) => m && m.ok !== false && m.recolor !== false && THEMES[m.theme]);
  const frameOf = (screen, state = 'day') => frames.find((m) => m.theme === THEME && m.screen === screen && m.ap === AP && (m.state || 'day') === state) || null;
  const hasFrame = (id, ap) => frames.some((m) => m.theme === id && m.ap === ap);
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const ROWS = [['home', 'Главная', 'day'], ['home', 'Главная вечером', 'evening'], ['dialogs', 'Диалоги', 'day'], ['peak', 'Пик', 'day'], ['season', 'Уроки', 'day']];
  /* строка заголовка дневного кадра Главной (px кадра): закрашивается фоном и перерисовывается HTML-текстом в две строки под героем */
  /* дневной кадр (замер строк кадра: «Урок 1» 627…651, заголовок 688…738, «0 из 50» 792…817): двухстрочный заголовок не влезает между
     подписью и прогрессом, поэтому подпись и заголовок перерисовываются блоком чуть выше (с 560), прогресс и кнопка — на месте */
  const TITLE = { x0: 40, y0: 615, x1: 1040, y1: 765, top: 560, label: 'Урок 1', text: 'Местоимения и глагол To Be' };
  /* вечерний кадр: подпись «Серия 5 дней», заголовок и строка «Одно занятие — и серия спасена» (px кадра 505…735) перерисовываются в
     колонку ≤ 53 % — иначе широкий вечерний заголовок ложится под героя; кнопка «Продолжить» (740+) остаётся на месте */
  const EVENING = { x0: 40, y0: 612, x1: 1040, y1: 830, top: 556, label: 'Серия 5 дней', title: 'До полуночи 3 ч 30 мин', sub: 'Одно занятие — и серия спасена' }; // замер: подпись 620…650, заголовок 681…745, строка 782…822; кнопка 867+ остаётся
  /* вечерние кадры: опись не нашла героя (календарь тонет в красной шапке) у 20 тем из 28 — берём место стандартной раскладки, снятое
     с кадров, где он найден (873, 296, 215); иначе маленький календарь остался бы в углу, а владелец ждёт героя крупно справа */
  const EVENING_PRIOR = { x: 873, y: 296, size: 215, art: 'home_scene_streak_risk', dir: 'hero512', opacity: 0.96, byPrior: true };
  const heroOf = (m) => m.hero || (m.screen === 'home' && (m.state || 'day') === 'evening' ? EVENING_PRIOR : null);
  const heroOverlay = (m, job) => {
    if (m.screen !== 'home' || !job.hero) return '';
    job.heroMove = SA.heroHome(W, job.sceneH, DPX); // 144 dp, справа 20 dp, по центру сцены
    if ((m.state || 'day') === 'day') { job.clear = [TITLE]; return `<div class="sf-copy" style="top:${RF.px(TITLE.top)}px"><small>${TITLE.label}</small><b>${TITLE.text}</b></div>`; }
    job.clear = [EVENING]; return `<div class="sf-copy" style="top:${RF.px(EVENING.top)}px"><small>${EVENING.label}</small><b>${EVENING.title}</b><span><i class="sf-io">&#xf313;</i>${EVENING.sub}</span></div>`;
  };
  const row = (key, m, variant, title) => {
    const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: heroOf(m), ap: m.ap, radius: 32 * DPX, old: DT.oldSpecFor(m), keepMax: m.screen === 'peak' ? 0.5 : 0.12, strats: [{ key: variant.key, spec: variant.spec }] };
    if (m.screen === 'dialogs' && m.ap === 'light') { job.ink = SP.color.hx(THEMES[THEME][AP].text); job.cta = SP.color.hx(THEMES[THEME][AP].cta); } // светлые Диалоги: надписи → белые, кнопки → как в тёмном
    const overlay = heroOverlay(m, job); JOBS[key] = job;
    const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
    const will = RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, overlays: overlay }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${variant.key}"`);
    return `<div class="sp-real-row" data-frame="${key}"><h3>${title}</h3><div class="phones">${col('Сейчас', now)}${col('Как будет', will)}</div></div>`;
  };
  const controls = () => {
    const th = document.getElementById('sfThemes'); if (th) th.innerHTML = DT.THEME_LIST.map((id) => `<span class="chp${THEME === id ? ' on' : ''}${hasFrame(id, AP) ? '' : ' off'}" data-sf-th="${id}">${THEMES[id].name}</span>`).join('');
    const ap = document.getElementById('sfAp'); if (ap) ap.innerHTML = [['dark', 'Тёмное'], ['light', 'Светлое']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-sf-ap="${k}">${n}</span>`).join('');
  };
  const release = (root) => root.querySelectorAll('.ph[data-will]').forEach((ph) => { try { URL.revokeObjectURL(ph.dataset.will); } catch (e) { console.log(LOG, 'revoke', e.message); } });
  const render = () => {
    const root = document.getElementById('sf'); if (!root) return; release(root); JOBS = {};
    DT.setTheme(THEME, AP); DT.setWarm('band'); // та же тема/оформление в сборщиках заданий; вечер — тёплый янтарь, других трактовок нет
    const t0 = performance.now();
    const rows = ROWS.map(([screen, title, state]) => { const m = frameOf(screen, state); if (!m) { console.log(LOG, 'нет кадра', screen, state, THEME, AP); return ''; } const v = state === 'evening' ? DT.eveningVariant(m) : DT.approvedVariant(m); return row(`${m.file}#final`, m, v, title); }).join('');
    root.innerHTML = rows || '<p class="sf-empty">Кадры этой темы ещё не сняты</p>';
    controls();
    const u = new URL(location.href); u.searchParams.set('th', THEME); u.searchParams.set('ap', AP); history.replaceState(null, '', u);
    console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, rows: Object.keys(JOBS).length, ms: Math.round(performance.now() - t0) })); // guard-ok: одна строка на перерисовку
    window.SceneReal.buildAll(root, JOBS);
  };
  document.body.addEventListener('click', (e) => {
    const c = e.target.closest('.chp[data-sf-th]'); if (c) { THEME = c.dataset.sfTh; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const a = e.target.closest('.chp[data-sf-ap]'); if (a) { AP = a.dataset.sfAp; render(); }
  });
  render();
  window.__sf = { render, setTheme: (id, ap) => { THEME = id; if (ap) AP = ap; render(); }, jobs: () => JOBS, frameOf };
})();
