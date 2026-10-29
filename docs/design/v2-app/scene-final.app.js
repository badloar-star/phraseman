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
     колонку ≤ 47 % — иначе широкий вечерний заголовок ложится под героя; кнопка «Продолжить» (740+) остаётся на месте */
  const EVENING = { x0: 40, y0: 612, x1: 1040, y1: 830, top: 556, label: 'Серия 5 дней', title: 'До полуночи 3 ч 30 мин', sub: 'Одно занятие — и серия спасена' }; // замер: подпись 620…650, заголовок 681…745, строка 782…822; кнопка 867+ остаётся
  /* вечерние кадры: опись не нашла героя (календарь тонет в красной шапке) у 20 тем из 28 — берём место стандартной раскладки, снятое
     с кадров, где он найден (873, 296, 215); иначе маленький календарь остался бы в углу, а владелец ждёт героя крупно справа */
  const EVENING_PRIOR = { x: 873, y: 296, size: 215, art: 'home_scene_streak_risk', dir: 'hero512', opacity: 0.96, byPrior: true };  const heroOf = (m) => m.hero || (m.screen === 'home' && (m.state || 'day') === 'evening' ? EVENING_PRIOR : null);
  /* шапка Главной (замер кадров 29.10 — одинаков у всех тем и оформлений): аватар с кольцом — круг (953.5, 226) r 85 (кольцо 870…1037 ×
     152…300), бейдж-ромб у кольца — круг (1018, 279) r 31. Эти круги движок не трогает: на вечернем кадре медь аватара по оттенку совпадает
     с красной шапкой и перекрашивалась в цвет неба (координатор 29.10: «аватар и кольцо не перекрашивать, только сцену») */
  const KEEP_AVATAR = [{ cx: 953.5, cy: 226, r: 85 }, { cx: 1018, cy: 279, r: 31 }];
  /* вечерний календарь на кадре занимает 879…1079 × 306…619 px — больше места стандартной раскладки (873, 296, 215), поэтому из-под маски
     героя оставался бледный след металлических колец; весь прямоугольник закрашивается новым небом с запасом, герой рисуется заново правее */
  const EVENING_CAL = { x0: 862, y0: 304, x1: 1080, y1: 632 };
  /* колонка перерисованного текста — от левого поля кадра (40 px) до левого края ВИДИМОЙ картинки героя (бокс + отступ ресурса) минус
     зазор 8 px: при 47 % строка «Одно занятие — и серия спасена» переносилась (координатор 29.10: «колонка шире до края героя, не трогая героя») */  /* ширина — для подписи и заголовка; строка серии (span) под заголовком лежит ниже видимой картинки героя и идёт на всю ширину (scene-final.css) */
  const copyWidth = (job) => { const art = (job.hero && job.hero.art) || 'home_scene_continue'; const pad = (SA.HERO_HOME.assetPad[art] || { left: 0 }).left; return RF.px(job.heroMove.x + pad * job.heroMove.size - 40) - 8; };
  const heroOverlay = (m, job) => {
    if (m.screen !== 'home' || !job.hero) return '';    job.heroMove = SA.heroHome(W, job.sceneH, DPX); job.keep = KEEP_AVATAR; const cw = copyWidth(job); // бокс 160 dp (как у Диалогов), справа 20 dp без выступа, центр бокса = центр сцены
    if ((m.state || 'day') === 'day') { job.clear = [TITLE]; return `<div class="sf-copy" style="top:${RF.px(TITLE.top)}px;width:${cw}px"><small>${TITLE.label}</small><b>${TITLE.text}</b></div>`; }
    job.clear = [EVENING, EVENING_CAL]; return `<div class="sf-copy" style="top:${RF.px(EVENING.top)}px;width:${cw}px"><small>${EVENING.label}</small><b>${EVENING.title}</b><span><i class="sf-io">&#xf313;</i>${EVENING.sub}</span></div>`;
  };  const row = (key, m, variant, title, borrowed) => {
    const job = { file: m.file, src: `assets/real/${m.file}`, sceneH: m.sceneH || 1082, status: m.status || 100, tab: m.tab || 2140, hero: heroOf(m), ap: m.ap, radius: 32 * DPX, old: DT.oldSpecFor(m), keepMax: m.screen === 'peak' ? 0.5 : 0.12, strats: [{ key: variant.key, spec: variant.spec }] };
    if (m.screen === 'dialogs' && m.ap === 'light') { job.ink = SP.color.hx(THEMES[m.theme][m.ap].text); job.cta = SP.color.hx(THEMES[m.theme][m.ap].cta); } /* цвета надписи и кнопки — темы КАДРА: он может быть одолжен у соседней темы */ // светлые Диалоги: надписи → белые, кнопки → как в тёмном
    const overlay = heroOverlay(m, job); JOBS[key] = job;
    const now = RF.phone({ src: job.src, exists: true, cls: 'sp-rf', status: job.status, tab: job.tab });
    const will = RF.phone({ src: job.src, exists: true, cls: 'sp-rf sp-rf-will', status: job.status, tab: job.tab, overlays: overlay }).replace('data-ph="sp-rf sp-rf-will"', `data-ph="sp-rf-will" data-strat="${variant.key}"`);    const h3 = borrowed ? `${title} <span class="sf-borrowed">· кадр снят в теме «${THEMES[m.theme].name}», сцена — в текущей</span>` : title;
    return `<div class="sp-real-row" data-frame="${key}"><h3>${h3}</h3><div class="phones">${col('Сейчас', now)}${col('Как будет', will)}</div></div>`;
  };  /* ряд без кадра текущей темы (Пик и Уроки сняты у трёх тем): кадр ближайшей по тону снятой темы — расстояние акцентов в OKLab (L, a, b);
     сцена красится в текущую тему, старый фон считается по теме кадра (координатор 29.10: «показывать ближайшую снятую тему, а не пустоту») */
  const labOf = (id, ap) => { const t = THEMES[id] && THEMES[id][ap]; const [L, C, H] = SA.color.oklchOf(SA.color.hx((t && (t.accent || t.cta)) || '#808080')); const r = (H * Math.PI) / 180; return [L, C * Math.cos(r), C * Math.sin(r)]; };
  const nearestFrame = (screen, state) => {
    const c = frames.filter((m) => m.screen === screen && m.ap === AP && (m.state || 'day') === state); if (!c.length) return null;
    const a = labOf(THEME, AP); let best = null; let bd = Infinity;
    for (const m of c) { const b = labOf(m.theme, AP); const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (d < bd) { bd = d; best = m; } }
    console.log(LOG, 'кадр одолжен', JSON.stringify({ screen, state, theme: THEME, from: best.theme, dist: Math.round(bd * 1000) / 1000, among: c.map((m) => m.theme) })); // guard-ok
    return best;
  };
  const controls = () => {
    const th = document.getElementById('sfThemes'); if (th) th.innerHTML = DT.THEME_LIST.filter((id) => frames.some((m) => m.theme === id)).map((id) => `<span class="chp${THEME === id ? ' on' : ''}${hasFrame(id, AP) ? '' : ' off'}" data-sf-th="${id}">${THEMES[id].name}</span>`).join('');
    const ap = document.getElementById('sfAp'); if (ap) ap.innerHTML = [['dark', 'Тёмное'], ['light', 'Светлое']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-sf-ap="${k}">${n}</span>`).join('');
  };
  const release = (root) => root.querySelectorAll('.ph[data-will]').forEach((ph) => { try { URL.revokeObjectURL(ph.dataset.will); } catch (e) { console.log(LOG, 'revoke', e.message); } });
  const render = () => {
    const root = document.getElementById('sf'); if (!root) return; release(root); JOBS = {};    DT.setTheme(THEME, AP); DT.setWarm('band'); DT.setWarmStrength('bright'); /* сила `bright` (координатор 29.10: «еле виден») — на утверждение, умолчание функции пока `soft` */ // та же тема/оформление в сборщиках заданий; вечер — тёплый янтарь, других трактовок нет
    const t0 = performance.now();
    const rows = ROWS.map(([screen, title, state]) => { let m = frameOf(screen, state); let borrowed = false; if (!m) { m = nearestFrame(screen, state); borrowed = !!m; } if (!m) { console.log(LOG, 'нет кадра', screen, state, THEME, AP); return ''; } const v = state === 'evening' ? DT.eveningVariant(m) : DT.approvedVariant(m); return row(`${m.file}#final`, m, v, title, borrowed); }).join('');
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
