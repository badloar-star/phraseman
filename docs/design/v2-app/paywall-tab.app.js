/* paywall-tab.app.js — макет «таб Plus в нижней панели и страница-пейвол» (владелец 29.10 через координатора: «как у Duolingo — не
   модальное окно, а страница-экран, оформленная как пейвол»). На настоящих кадрах Главной (HEAD графит тёмное; остальные темы и
   оформления — реальные кадры 28.10 из описи):
   (1) «Главная · таб Plus» — нижняя панель кадра перерисована HTML-слоем в тех же местах и цветах: для Free — шесть табов, новый
       (только значок — бриллиант Plus из бейджа аватарки, без подписи) стоит сразу после «Сообщества»; для Plus — пять, как сейчас.
       Значки — маски, снятые с кадра HEAD (assets/paywall-tab/*_mask.png), цвета панели — с самого кадра.
   (2) «Страница Plus» — полноэкранная вкладка: статус-бар кадра, фон страницы темы, панель внизу (таб Plus подсвечен); содержимое —
       как у окна подписки приложения (реальный кадр assets/paywall-tab/plus_sheet_now.png — тексты, порядок, цены ≈ €39,99 / €4,99,
       мятная кнопка #7ef0c8): заголовок, «что входит», тарифы, кнопка покупки, «закрыть» и «восстановить».
   (3) Переключатели: тема (Затмение, Сумерки, Океан), тёмное/светлое, «Для Free» (таб есть) / «Для Plus» (таба нет). Тап по табу Plus
       на Главной подсвечивает страницу, «×» на странице — Главную. Служебного текста внутри телефонов нет. Журнал — [PT]. */
(() => {
  const LOG = '[PT]'; const RF = window.RF; const SP = window.__sp; const REAL = window.__REAL || {}; const NAMES = window.__THEME_NAMES || {};
  if (!RF || !SP) { console.log(LOG, 'нет движков:', JSON.stringify({ rf: !!RF, sp: !!SP })); return; }
  const THEMES = SP.THEMES; const W = 1080; const H = 2400; const K = RF.K; const px = RF.px;
  const THEME_IDS = ['graphite', 'ink', 'marine']; const q = new URLSearchParams(location.search);
  let THEME = THEME_IDS.includes(q.get('theme')) ? q.get('theme') : 'graphite'; let AP = q.get('ap') === 'light' ? 'light' : 'dark'; let PLAN = q.get('plan') === 'plus' ? 'plus' : 'free';
  const PLUS_MINT = '#7ef0c8'; // мятная кнопка и обводка выбранного тарифа — с реального кадра окна Plus
  /* панель кадра HEAD (замер): плашка x 32…1048, строки 2146…2322 (скругление ≈ 88 px), значки 110 px по центрам 153/347/541/734/928
     (строки 2201…2266), подсветка активного — скруглённый прямоугольник 190 × 140 за значком */
  const BAR = { x0: 32, x1: 1048, y0: 2146, y1: 2322, r: 88, icon: 110, iconCy: 2234, hi: { w: 190, h: 140, r: 44 }, five: [153, 347, 541, 734, 928], six: [153, 308, 463, 618, 773, 928] };
  const TABS5 = ['home', 'book', 'play', 'people', 'gear']; const TABS6 = ['home', 'book', 'play', 'people', 'diamond', 'gear'];
  const HEAD_HOME = { file: 'assets/real/head_home_graphite_dark.png', status: 100 };
  const homeFrame = (theme, ap) => { if (theme === 'graphite' && ap === 'dark') return HEAD_HOME; const m = Object.values(REAL).find((r) => r && r.ok !== false && r.screen === 'home' && r.theme === theme && r.ap === ap && (r.state || 'day') === 'day'); return m ? { file: `assets/real/${m.file}`, status: m.status || 100 } : null; };
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('не открылась ' + src)); im.src = src; });
  const hex = (d) => '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  const SAMPLES = {};
  /* цвета панели — с самого кадра: верх/низ плашки (x 250, между значками), подсветка активного (80/2290), фон страницы (16/1100) */
  const sampleFrame = async (m) => { if (SAMPLES[m.file]) return SAMPLES[m.file]; const im = await loadImg(m.file); const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const at = (x, y) => hex(g.getImageData(x, y, 1, 1).data); const s = { barTop: at(250, 2152), barBot: at(250, 2316), hi: at(80, 2290), page: at(16, 1100) }; SAMPLES[m.file] = s; console.log(LOG, 'цвета кадра', JSON.stringify({ file: m.file, ...s })); return s; }; // guard-ok
  const tok = () => THEMES[THEME][AP];
  /* панель HTML-слоем в координатах кадра: табы 5 (Plus) или 6 (Free), активный — подсветка + светлый значок */
  const barHtml = (s, active) => {
    const tabs = PLAN === 'free' ? TABS6 : TABS5; const cx = PLAN === 'free' ? BAR.six : BAR.five; const inactive = AP === 'dark' ? '#a3a8ad' : '#5c6064'; const act = AP === 'dark' ? '#ffffff' : tok().text; const sz = Math.round(BAR.icon * K);
    const items = tabs.map((t, i) => { const on = t === active; const left = Math.round(cx[i] * K) - Math.round(BAR.x0 * K); const top = Math.round((BAR.iconCy - BAR.y0) * K); const dia = t === 'diamond'; const isz = dia ? Math.round(sz * 0.8) : sz; return `${on ? `<i class="pt-hi" style="left:${left - Math.round(BAR.hi.w * K / 2)}px;top:${top - Math.round(BAR.hi.h * K / 2)}px;width:${Math.round(BAR.hi.w * K)}px;height:${Math.round(BAR.hi.h * K)}px;border-radius:${Math.round(BAR.hi.r * K)}px;background:${s.hi}"></i>` : ''}<i class="pt-ic${dia ? ' pt-ic-dia' : ''}" data-pt-tab="${t}" style="left:${left - isz / 2}px;top:${top - isz / 2}px;width:${isz}px;height:${isz}px;-webkit-mask-image:url(assets/paywall-tab/${t}_mask.png);mask-image:url(assets/paywall-tab/${t}_mask.png);background:${on ? act : inactive}"></i>`; }).join('');
    return `<div class="pt-bar" style="left:${px(BAR.x0)}px;top:${px(BAR.y0)}px;width:${px(BAR.x1 - BAR.x0)}px;height:${px(BAR.y1 - BAR.y0)}px;border-radius:${Math.round(BAR.r * K)}px;background:linear-gradient(${s.barTop},${s.barBot})">${items}</div>`;
  };
  /* страница Plus: фон темы, содержимое как у окна подписки приложения (реальный кадр plus_sheet_now.png), панель внизу с подсвеченным табом */
  const pageHtml = (s) => {
    const t = tok(); const dark = AP === 'dark'; const card = t.opaqueCard; const sub = t.secondary; const text = t.text;
    const ben = (icon, h, p) => `<div class="pt-ben"><span class="pt-ben-ic" style="background:${t.opaqueControl};color:${text}">${icon}</span><div><b style="color:${text}">${h}</b><small style="color:${sub}">${p}</small></div></div>`;
    const svgCards = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="7" width="13" height="13" rx="2.5"/><path d="M17 7V5.5A2.5 2.5 0 0 0 14.5 3h-9A2.5 2.5 0 0 0 3 5.5v9A2.5 2.5 0 0 0 5.5 17H7"/></svg>';
    const svgBook = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 6.5c-1.6-1.4-4-2-8-2v13c4 0 6.4.6 8 2 1.6-1.4 4-2 8-2v-13c-4 0-6.4.6-8 2z"/><path d="M12 6.5v13"/></svg>';
    const svgFlash = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>';
    return `<div class="pt-page" style="background:${s.page};color:${text}">
      <div class="pt-head"><span class="pt-brand" style="color:${sub}">PHRASEMAN PLUS</span><button class="pt-close" data-pt-close style="background:${t.opaqueControl};color:${text}" aria-label="Закрыть">×</button></div>
      <h2 class="pt-h1">Открой полный доступ<br>Phraseman Plus</h2>
      <div class="pt-label" style="color:${sub}">ЧТО ВХОДИТ</div>
      ${ben(svgCards, 'Карточки без ограничений', 'Сохраняй, создавай наборы, тренируйся')}${ben(svgBook, 'Все 32 урока курса', 'Бесплатно — уроки 1–3')}${ben(svgFlash, 'Энергия не тратится', 'Учись без пауз')}
      <div class="pt-plans">
        <div class="pt-plan pt-plan-on" style="background:${card};box-shadow:inset 0 0 0 2px ${PLUS_MINT}"><span class="pt-badge" style="background:${PLUS_MINT};color:#04261d">Выгоднее всего</span><b>Год</b><span class="pt-price">≈ €39,99</span><small style="color:${sub}">в год</small><small style="color:${sub}">≈ €3,33 в месяц</small></div>
        <div class="pt-plan" style="background:${card}"><b>Месяц</b><span class="pt-price">≈ €4,99</span><small style="color:${sub}">в месяц</small></div>
      </div>
      <button class="pt-cta" style="background:${PLUS_MINT};color:#04261d">Оформить за ≈ €39,99 в год</button>
      <div class="pt-note" style="color:${sub}">Продлевается каждый год · Отмена в любой момент</div>
      <div class="pt-links" style="color:${dark ? '#e6e9ee' : text}"><span>Восстановить</span><span>Условия</span><span>Конфиденциальность</span></div>
    </div>`;
  };
  const col = (label, html) => `<div class="col"><div class="lbl">${label}</div>${html}</div>`;
  const render = async () => {
    const root = document.getElementById('pt'); if (!root) return; window.__ptDone = false;
    const ctl = (id, items, cur, key) => { const el = document.getElementById(id); if (el) el.innerHTML = items.map(([k, n]) => `<span class="chp${cur === k ? ' on' : ''}" data-${key}="${k}">${n}</span>`).join(''); };
    ctl('ptTheme', THEME_IDS.map((id) => [id, NAMES[id] || (THEMES[id] && THEMES[id].name) || id]), THEME, 'pt-theme'); ctl('ptAp', [['dark', 'Тёмная'], ['light', 'Светлая']], AP, 'pt-ap'); ctl('ptPlan', [['free', 'Для Free'], ['plus', 'Для Plus']], PLAN, 'pt-plan');
    const m = homeFrame(THEME, AP); if (!m) { root.innerHTML = '<p class="pt-empty">Кадры ещё не сняты</p>'; window.__ptDone = true; console.log(LOG, 'нет кадра', JSON.stringify({ theme: THEME, ap: AP })); return; }
    let s; try { s = await sampleFrame(m); } catch (e) { console.log(LOG, 'кадр не прочитался:', e.message); root.innerHTML = '<p class="pt-empty">Кадр не открылся</p>'; window.__ptDone = true; return; }
    const homePh = RF.phone({ src: m.file, exists: true, cls: 'sp-rf', status: m.status, tab: H, overlays: barHtml(s, 'home') }); // tab: H — полоса панели внутри тела, её накрывает HTML-панель
    const pagePh = PLAN === 'free' ? RF.phone({ src: m.file, exists: true, cls: 'sp-rf', status: m.status, tab: H, overlays: pageHtml(s) + barHtml(s, 'diamond') }) : '';
    const refPh = '<div class="ph pt-ref"><img src="assets/paywall-tab/plus_sheet_now.png" alt=""></div>';
    root.innerHTML = `<div class="sp-real-row"><div class="phones pt-phones">${col(PLAN === 'free' ? 'Главная · таб Plus после «Сообщества»' : 'Главная · у Plus таба нет', homePh)}${PLAN === 'free' ? col('Страница Plus · по тапу на таб', pagePh) : ''}${col('Окно Plus сейчас · кадр приложения', refPh)}</div></div>`;
    const u = new URL(location.href); u.searchParams.set('theme', THEME); u.searchParams.set('ap', AP); u.searchParams.set('plan', PLAN); history.replaceState(null, '', u);
    window.__ptDone = true; console.log(LOG, 'render', JSON.stringify({ theme: THEME, ap: AP, plan: PLAN, file: m.file, tabs: PLAN === 'free' ? 6 : 5 })); // guard-ok
  };
  const flash = (sel, why) => { const ph = document.querySelector(sel); if (ph) { ph.classList.add('pt-flash'); setTimeout(() => ph.classList.remove('pt-flash'), 700); ph.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } console.log(LOG, why); }; // guard-ok
  document.body.addEventListener('click', (e) => {
    const pick = (attr, prop) => { const el = e.target.closest(`.chp[data-${attr}]`); return el ? el.dataset[prop] : null; };
    const t = pick('pt-theme', 'ptTheme'); if (t) { THEME = t; render(); return; }
    const a = pick('pt-ap', 'ptAp'); if (a) { AP = a; render(); return; }
    const p = pick('pt-plan', 'ptPlan'); if (p) { PLAN = p; render(); return; }
    if (e.target.closest('.pt-ic[data-pt-tab="diamond"]')) { flash('.pt-phones .col:nth-child(2) .ph', 'тап по табу Plus → страница'); return; }
    if (e.target.closest('[data-pt-close]')) flash('.pt-phones .col:nth-child(1) .ph', '× на странице → Главная');
  });
  render();
  window.__pt = { render, BAR, setTheme: (t) => { THEME = t; return render(); }, setAp: (a) => { AP = a; return render(); }, setPlan: (p) => { PLAN = p; return render(); } };
})();
