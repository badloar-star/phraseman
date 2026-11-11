// зачем (владелец 11.11: «верни те макеты, где были все варианты — Аврора и все остальные, последний»): одна страница all.html со ВСЕМИ пятью вариантами Главной
// в их последнем виде — Аврора, Титан, Самоцветы, Тишина, Рассвет — и Главной «как сейчас». Титан и Самоцветы возвращены из круга 2 (коммит 4ecdc56db) и посажены
// на нынешнюю разметку (блок дней, таб-бар, сцена без заголовка урока). Собирается из designer.html; запуск: node make_all.cjs
const fs = require('fs');
const path = require('path');
let s = fs.readFileSync(path.join(__dirname, 'designer.html'), 'utf8');
const must = (c, m) => { if (!c) throw new Error(m); };
const cut = (from, to, repl) => { const a = s.indexOf(from); must(a >= 0, 'нет начала: ' + from.slice(0, 60)); const b = s.indexOf(to, a + from.length); must(b >= 0, 'нет конца: ' + to.slice(0, 60)); s = s.slice(0, a) + repl + s.slice(b); };
const rep = (a, b) => { must(s.includes(a), 'нет фрагмента: ' + a.slice(0, 80)); s = s.replace(a, () => b); };

rep('<title>Два направления</title>', '<title>Все варианты Главной</title>');
rep('<h1>Два направления: «Тишина» и «Рассвет»</h1>', '<h1>Все варианты Главной</h1>');
cut('<p class="lead">', '<div class="panel">', `<p class="lead">Все пять вариантов оформления в последнем виде и Главная как сейчас. Ползунки красят все экраны сразу; «Засчитать день» зажигает огонёк на сегодняшнем дне. Полные страницы по разделам: <a href="index.html">Аврора</a>, <a href="tishina.html">Тишина</a>, <a href="designer.html">Тишина и Рассвет</a>.</p>
  `);
cut('<div class="wrap">', '<p class="note" id="note">', `<div class="wrap">
    <div class="cell"><div class="cap">A · Аврора</div><div class="zw"><div class="ph vA" id="phHome"></div></div></div>
    <div class="cell"><div class="cap">B · Титан</div><div class="zw"><div class="ph vB" data-v="b" id="bHome"></div></div></div>
    <div class="cell"><div class="cap">C · Самоцветы</div><div class="zw"><div class="ph vC" data-v="c" id="cHome"></div></div></div>
    <div class="cell"><div class="cap">D · Тишина</div><div class="zw"><div class="ph vX vQ" data-v="q" id="qHome"></div></div></div>
    <div class="cell"><div class="cap">E · Рассвет</div><div class="zw"><div class="ph vX vS" data-v="s" id="sHome"></div></div></div>
    <div class="cell"><div class="cap">Сейчас <span>по коду приложения</span></div><div class="zw"><div class="ph now" id="phNow"></div></div></div>
  </div>
  `);
rep('.lead { font-size: 15px;', '.lead a { color: inherit; font-weight: 600; } .lead { font-size: 15px;');

/* ── стили Титана и Самоцветов (круг 2), посаженные на нынешнюю разметку ── */
rep('/* ═════════ общее у «Тишины» и «Рассвета»', `/* ═════════ B · «ТИТАН»: анодированный металл, гравировка, хромированная кнопка ═════════ */
.vB .tile, .vB .today, .vB .pod, .vB .tabbar, .vB .vc, .vC .tile, .vC .today, .vC .pod, .vC .tabbar, .vC .vc { box-shadow: var(--shV); }
.vB .vc, .vC .vc { border-radius: 18px; } .vB .pod, .vC .pod { border-radius: 22px; }
.vB .scr { background: linear-gradient(180deg, var(--bgTop) 0%, var(--bg) 60%, var(--bgBottom) 100%); }
.vB .scene { background: var(--m3); box-shadow: 0 26px 44px -24px rgba(0, 0, 0, .8); }
.vB .scene .fx { background: radial-gradient(circle at 88% 22%, transparent 0 63px, var(--ring) 64px 65px, transparent 66px 107px, var(--ringAcc) 108px 110px, transparent 111px 159px, var(--ring) 160px 161px, transparent 162px 219px, var(--ring2) 220px 221px, transparent 222px); }
.vB .scene::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--ringAcc) 30%, var(--ringAcc) 70%, transparent); z-index: 2; }
.vB .pill, .vB .bell { background: linear-gradient(180deg, rgba(255, 255, 255, .17), rgba(255, 255, 255, .05)); box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .25), 0 6px 12px -8px rgba(0, 0, 0, .6); }
.vB .wk { background: rgba(255, 255, 255, .08); }
.vB .cta { background: linear-gradient(180deg, var(--chrome0) 0%, var(--chrome1) 46%, var(--chromeLo) 52%, var(--chrome2) 100%); box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .18), 0 14px 26px -12px rgba(0, 0, 0, .75); }
.vB .cta::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; background: linear-gradient(100deg, transparent, rgba(255, 255, 255, .9), transparent); transform: skewX(-18deg); animation: sweep 8s var(--ease-out) 1.4s infinite; }
@keyframes sweep { 0% { left: -40%; } 14%, 100% { left: 120%; } }
.vB .tile, .vB .today, .vB .pod, .vB .tabbar { background: repeating-linear-gradient(90deg, var(--brush) 0 1px, transparent 1px 3px), linear-gradient(180deg, var(--mt0) 0%, var(--mt1) 44%, var(--mt2) 100%); }
.vB .row .ri { background: var(--well); box-shadow: inset 0 2px 5px var(--wellSh); color: var(--acc); }
.vB .row .tick { width: 26px; height: 26px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #121318; background: linear-gradient(180deg, var(--chrome0), var(--chromeLo)); }
.vB .tile .art { margin: 0 4px 4px; width: calc(100% - 8px); border-radius: 14px; background: var(--well); box-shadow: inset 0 2px 5px var(--wellSh); }
.vB .poster { background: radial-gradient(circle at 86% 20%, transparent 0 39px, var(--ring) 40px 41px, transparent 42px 73px, var(--ringAcc) 74px 75px, transparent 76px), repeating-linear-gradient(90deg, rgba(255, 255, 255, .03) 0 1px, transparent 1px 3px), linear-gradient(180deg, var(--m1), var(--m3)); }
.vB .tabbar .tb.on { color: var(--acc); } .vB .tabbar .tb.on i { background: var(--well); box-shadow: inset 0 2px 5px var(--wellSh); }

/* ═════════ C · «САМОЦВЕТЫ»: двухтоновая сцена с планетой, цветные плитки-камни ═════════ */
.vC .scr { background: radial-gradient(80% 28% at 100% 42%, var(--cBg1), transparent 72%), radial-gradient(70% 26% at 0% 78%, var(--cBg2), transparent 72%), linear-gradient(180deg, var(--bgTop) 0%, var(--bg) 60%, var(--bgBottom) 100%); }
.vC .scene { background: var(--c1); box-shadow: 0 26px 46px -24px var(--cShadow); }
.vC .scene .fx { background: radial-gradient(circle at 106% 44%, var(--orbHi) 0 60px, var(--orb) 118px, transparent 119px), radial-gradient(circle at 106% 44%, transparent 0 149px, var(--orbit) 150px 151px, transparent 152px 199px, var(--orbit2) 200px 201px, transparent 202px), radial-gradient(circle at 106% 44%, var(--orbHalo), transparent 260px); }
.vC .pill, .vC .bell { background: rgba(0, 0, 0, .22); }
.vC .wk { background: rgba(0, 0, 0, .2); }
.vC .cta { background: linear-gradient(98deg, #fff 0%, var(--gemLight) 100%); box-shadow: 0 16px 30px -12px var(--cShadow); }
.vC .today, .vC .tabbar { background: linear-gradient(160deg, var(--cC1) 0%, var(--cC2) 60%); }
.vC .tile { color: #fff; background: linear-gradient(158deg, var(--ja) 0%, var(--jb) 100%); box-shadow: 0 16px 24px -14px var(--jb); }
.vC .tile::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(90% 70% at 16% 0%, var(--jhi), transparent 70%); }
.vC .tile:nth-child(1), .vC .row:nth-child(2) .ri { --ja: var(--j1a); --jb: var(--j1b); --jhi: var(--j1h); }
.vC .tile:nth-child(2), .vC .row:nth-child(3) .ri { --ja: var(--j2a); --jb: var(--j2b); --jhi: var(--j2h); }
.vC .tile:nth-child(3), .vC .row:nth-child(4) .ri { --ja: var(--j3a); --jb: var(--j3b); --jhi: var(--j3h); }
.vC .tile:nth-child(4) { --ja: var(--j4a); --jb: var(--j4b); --jhi: var(--j4h); }
.vC .row .ri { background: linear-gradient(158deg, var(--ja), var(--jb)); color: #fff; box-shadow: 0 8px 14px -8px var(--jb); }
.vC .row .tick { width: 26px; height: 26px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; background: linear-gradient(158deg, var(--j1a), var(--j1b)); }
.vC .vc:nth-child(1) .poster { background: linear-gradient(152deg, var(--j1a), var(--j2b)); } .vC .vc:nth-child(2) .poster { background: linear-gradient(152deg, var(--j3a), var(--j2b)); } .vC .vc:nth-child(3) .poster { background: linear-gradient(152deg, var(--j4a), var(--j3b)); }
.vC .pod { background: linear-gradient(120deg, var(--j2b) 0%, var(--j3b) 100%); color: #fff; box-shadow: 0 16px 24px -14px var(--j3b); } .vC .pod small, .vC .pod em, .vC .pod > .io { color: rgba(255, 255, 255, .86); }
.vC .tabbar .tb.on { color: #fff; } .vC .tabbar .tb.on i { background: linear-gradient(158deg, var(--j2a), var(--j2b)); }

/* ═════════ общее у «Тишины» и «Рассвета»`);
rep(`@media (prefers-reduced-motion: reduce) { .vA .scene .fx::before,`, `@media (prefers-reduced-motion: reduce) { .vB .cta::after { animation: none; display: none; } .vA .scene .fx::before,`);

/* ── расчёт Титана и Самоцветов ── */
rep(`  const variants = { q: { vars: q, sky: qSky }, s: { vars: sV, sky: sSky } };`, `  // страж контраста: цвет темнеет, пока белый текст на нём не даст нужное отношение
  const deepen = (L, C, h, need) => { let l = L; let c = ok(l, C, h); while (whiteOn(c) < need && l > .12) { l -= .01; c = ok(l, C, h); } return c; };
  const shVdark = \`0 18px 30px -16px \${hexA(ok(.10, Cb * .5, SH), .9)}\`; const shVbc = dark ? shVdark : shadowCss(PM.plateShadowStyle(g));
  // B · Титан
  const Cm = Cv * .3; const mL = dark ? [.22, .36, .28, .38] : [.36, .48, .41, .47];
  const bM = [ok(mL[0], Cm, SH), ok(mL[1], Cm, SH), ok(mL[2], Cm, SH), deepen(mL[3], Cm, SH, 4.8)];
  const B = { m0: bM[0], m1: bM[1], m2: bM[2], m3: bM[3], avaGap: bM[0], aTop: bM[0], scNow: bM[3], shV: shVbc,
    ring: 'rgba(255,255,255,.10)', ring2: 'rgba(255,255,255,.06)', ringAcc: hexA(ok(.82, Math.min(.14, Cv), SH), .75),
    chrome0: ok(.995, .003, SH), chrome1: ok(.90, .012, SH), chromeLo: ok(.80, .018, SH), chrome2: ok(.94, .010, SH),
    cta1: ok(.995, .003, SH), cta2: ok(.80, .018, SH), ctaInkV: '#121318', ctaGlow: 'transparent',
    mt0: dark ? ok(.27, Cm * .7, SH) : ok(.995, .003, SH), mt1: dark ? ok(.20, Cm * .7, SH) : ok(.955, .008, SH), mt2: dark ? ok(.155, Cm * .7, SH) : ok(.905, .013, SH),
    brush: dark ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.022)', well: dark ? ok(.12, Cm * .6, SH) : ok(.885, .014, SH), wellSh: dark ? 'rgba(0,0,0,.75)' : 'rgba(40,50,70,.28)' };
  const bSky = \`linear-gradient(116deg, transparent 32%, rgba(255,255,255,.11) 46%, rgba(255,255,255,.03) 53%, transparent 66%), repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), linear-gradient(180deg, \${bM[0]} 0%, \${bM[1]} 40%, \${bM[2]} 66%, \${bM[3]} 100%)\`;
  // C · Самоцветы
  const c0 = ok(dark ? .40 : .44, Cv, SH - 32); const c1 = ok(dark ? .29 : .34, Cv * .9, SH + 16); const c2 = deepen(dark ? .37 : .41, Cv, SH + 72, 4.8);
  const gemLight = ok(.90, Math.min(.09, Cv * .5), SH + 72);
  const Cg = { c0, c1, c2, avaGap: c0, aTop: c0, scNow: c1, shV: shVbc, cShadow: hexA(ok(.14, Cv * .6, SH + 16), dark ? .95 : .5),
    orbHi: ok(.64, Cv, SH + 82), orb: deepen(.56, Cv, SH + 72, 3.2), orbit: 'rgba(255,255,255,.16)', orbit2: 'rgba(255,255,255,.08)', orbHalo: hexA(ok(.62, Cv, SH + 72), .30), gemLight,
    cta1: '#FFFFFF', cta2: gemLight, ctaInkV: c1, ctaGlow: hexA(gemLight, .4),
    cBg1: hexA(ok(dark ? .40 : .86, Cv * .8, SH + 72), dark ? .28 : .5), cBg2: hexA(ok(dark ? .38 : .86, Cv * .8, SH - 32), dark ? .26 : .5),
    cC1: dark ? mix(g.plateFillFrom, ok(.40, Cv, SH + 50), .22) : ok(.995, Math.min(.004, Cv), SH), cC2: dark ? g.plateFillTo : ok(.96, Math.min(.025, Cv * .15), SH + 40) };
  [0, 1, 2, 3].forEach((i) => { const h = SH + [-36, 0, 36, 72][i]; Cg[\`j\${i + 1}a\`] = ok(.55, Cv, h); Cg[\`j\${i + 1}b\`] = deepen(.36, Cv, h + 14, 5); Cg[\`j\${i + 1}h\`] = hexA(ok(.74, Cv * .8, h), .55); });
  const cSky = \`linear-gradient(152deg, \${c0} 0%, \${c1} 50%, \${c2} 100%)\`;
  // у Титана и Самоцветов фон и вложенные плашки — токены приложения (как в круге 2), а не усиленные тона «Авроры»
  const appBase = { bgTop: g.bgTop, bg: g.bg, bgBottom: g.bgBottom, ctl: g.opaqueControl, sec: g.secondary, mut: g.mutedText };
  const variants = { q: { vars: q, sky: qSky }, s: { vars: sV, sky: sSky }, b: { vars: { ...appBase, ...B }, sky: bSky }, c: { vars: { ...appBase, ...Cg }, sky: cSky, art: 'dark', tint: '#FFFFFF' } };`);

/* ── отрисовка ── */
cut(`  for (const ph of phones) {`, `  // башня Пика`, `  for (const ph of phones) {
    for (const k in v) ph.style.setProperty('--' + k, v[k]);
    const own = ph.dataset.v ? r.variants[ph.dataset.v] : null;
    const sky = ph.querySelector('[data-sky]');
    if (own) { for (const k in own.vars) ph.style.setProperty('--' + k, own.vars[k]); if (sky) sky.style.background = own.sky; }
    else if (ph.id === 'phNow') { if (sky) sky.style.background = r.skyNow; } // «Сейчас» — только токены приложения
    else { ph.style.setProperty('--bgTop', v.pgA1); ph.style.setProperty('--bg', v.pgA2); ph.style.setProperty('--bgBottom', v.pgA3); ph.style.setProperty('--ctl', v.ctlA); ph.style.setProperty('--sec', v.secA); ph.style.setProperty('--mut', v.secA); }
    // картинки плиток: в «Самоцветах» всегда тёмный набор и белая окраска (плитки цветные); остальные — по оформлению и цвету варианта
    ph.querySelectorAll('[data-tile]').forEach((cv) => { drawTile(cv, own && own.art && cv.dataset.tile !== 'phrase_of_day' ? own.art : st.ap, (own && (own.tint || own.vars.acc)) || g.accentGraphic); });
  }
`);
rep(`const SCREENS = { qHome: () => homeHTML(true), qLessons: lessonsHTML, qSettings: settingsHTML, sHome: () => homeHTML(true), sLessons: lessonsHTML, sSettings: settingsHTML, phHome: () => homeHTML(true) };`,
    `const SCREENS = { phHome: () => homeHTML(true), bHome: () => homeHTML(true), cHome: () => homeHTML(true), qHome: () => homeHTML(true), sHome: () => homeHTML(true), phNow: () => homeHTML(false) };`);
rep(`  lastStarsKey = st.ap;`, `  if (st.ap !== lastStarsKey) { lastStarsKey = st.ap; const ns = document.querySelector('#phNow [data-stars]'); if (ns) ns.innerHTML = nowStars(sc); else console.warn(LOG, 'нет экрана «Сейчас» — звёзды сцены не рисуем'); }`);
cut(`  document.getElementById('note').innerHTML =`, `  console.log(LOG, JSON.stringify(`, `  document.getElementById('note').innerHTML = \`Тема приложения <b>\${r.id}</b>. Плашка к фону: Аврора <b>\${checks.sepCard}:1</b>, Тишина <b>\${checks.qCard}:1</b>, Рассвет <b>\${checks.sCard}:1</b>.\`;
`);
fs.writeFileSync(path.join(__dirname, 'all.html'), s);
console.log('ok', Math.round(s.length / 1024) + ' КБ');
