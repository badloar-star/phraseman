// зачем (владелец 11.11: «сделай макет, где сцена всех разделов, где есть сцена, будет "Рассвет", а всё остальное — Аврора»):
// страница aurora_rassvet.html = «Аврора» на всех семи экранах (index.html), но блок сцены целиком взят из «Рассвета»: небо-рассвет в два соседних оттенка
// с тёплым светом снизу справа, пройденные дни «солнечным» цветом, тёмная главная кнопка; лент и звёзд «Авроры» на сцене нет.
// В макете сцена есть только у Главной — так же, как в коде вкладок («Обучение», «Видео», «Сообщество», «Настройки» сцены не имеют).
// Плитки под сценой остаются стеклом «Авроры», но их верх теперь повторяет низ рассветной сцены, чтобы шов под ними не читался.
// Собирается из index.html; запуск: node make_aurora_rassvet.cjs
const fs = require('fs');
const path = require('path');
let s = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const must = (c, m) => { if (!c) throw new Error(m); };
const cut = (from, to, repl) => { const a = s.indexOf(from); must(a >= 0, 'нет начала: ' + from.slice(0, 60)); const b = s.indexOf(to, a + from.length); must(b >= 0, 'нет конца: ' + to.slice(0, 60)); s = s.slice(0, a) + repl + s.slice(b); };
const rep = (a, b) => { must(s.includes(a), 'нет фрагмента: ' + a.slice(0, 80)); s = s.replace(a, () => b); };

rep('<title>Аврора: все разделы</title>', '<title>Аврора + сцена Рассвет</title>');
rep('<h1>«Аврора» на всех разделах</h1>', '<h1>«Аврора» со сценой «Рассвет»</h1>');
cut('<p class="lead">', '<div class="panel">', `<p class="lead">Всё оформление — «Аврора», а сцена взята из «Рассвета»: небо в два соседних оттенка с тёплым светом, «солнечные» дни и тёмная кнопка. Сцена в приложении есть только у Главной, остальные вкладки без неё. Ползунки работают как на экране «Оформление».</p>
  `);

rep('@media (prefers-reduced-motion: reduce) {', `/* ═════════ сцена «Рассвет» внутри «Авроры» ═════════ */
.vA .scene .fx, .vA [data-stars] { display: none; } /* ленты и звёзды «Авроры» на рассветной сцене не рисуются */
.vA .scene .cta { background: var(--ink); color: #fff; box-shadow: 0 14px 26px -12px var(--inkSh); }
.vA .scene .wk { background: rgba(255, 255, 255, .13); }
.vA .scene .pill, .vA .scene .bell { background: rgba(255, 255, 255, .16); }

@media (prefers-reduced-motion: reduce) {`);

rep(`  const checks = { sepCard, sepCtl,`, `  /* сцена «Рассвет» — тот же расчёт, что в designer.html: три тона вокруг оттенка темы и тёплый свет; страж держит белые подписи дней ≥ 4,6 */
  const Cs = Math.min(.11, Cv * .7);
  const sun = ok(.88, Math.min(.10, Cv * .6), SH + 55); const sun2 = ok(.80, Math.min(.13, Cv * .75), SH + 38);
  const sA = ok(.34, Cs, SH - 18); const sB = ok(.46, Cs, SH + 14); const sC = ok(.56, Cs * .9, SH + 40);
  let orbA = .62; while (whiteOn(mix(sB, sun, orbA * .45)) < 4.6 && orbA > .1) orbA -= .04;
  const ink = ok(.17, Cs * .5, SH); const rsTileTop = mix(sC, sun, orbA * .35);
  const rs = { base: sA, sky: \`radial-gradient(78% 76% at 84% 104%, \${hexA(sun, orbA)}, transparent 70%), linear-gradient(168deg, \${sA} 0%, \${sB} 55%, \${sC} 100%)\`,
    scene: { cta1: sun, cta2: sun2, ctaInkV: ok(.22, Cs * .6, SH + 30), ctaGlow: hexA(sun2, .5), aTop: sA, avaGap: sA, aShadow: hexA(sA, dark ? .9 : .5), ink, inkSh: hexA(ink, .8) },
    // стекло плиток: верх — низ рассветной сцены, низ — прежний тон плашки «Авроры»
    fr1: hexA(rsTileTop, .96), frM: hexA(mix(rsTileTop, frBot, .5), .96), white: +whiteOn(mix(sB, sun, orbA * .45)).toFixed(2) };
  const checks = { rsScene: rs.white, sepCard, sepCtl,`);
rep(`  return { id, g, sc, v, skyNow, checks };`, `  return { id, g, sc, v, skyNow, checks, rs };`);
rep(`    ph.querySelectorAll('[data-tile]').forEach((cv) => { drawTile(cv, st.ap, g.accentGraphic); });`, `    if (ph.classList.contains('vA')) {
      ph.style.setProperty('--fr1', r.rs.fr1); ph.style.setProperty('--frM', r.rs.frM);
      ph.querySelectorAll('.scene').forEach((sn) => { for (const k in r.rs.scene) sn.style.setProperty('--' + k, r.rs.scene[k]); sn.style.background = r.rs.base; const sky = sn.querySelector('[data-sky]'); if (sky) sky.style.background = r.rs.sky; else console.warn(LOG, 'у сцены нет слоя неба — рассвет не нарисован', ph.id); });
    }
    ph.querySelectorAll('[data-tile]').forEach((cv) => { drawTile(cv, st.ap, g.accentGraphic); });`);
rep(`Белый текст на сцене «Авроры»: <b>\${checks.aurora}:1</b>`, `Белый текст на сцене «Рассвет»: <b>\${checks.rsScene}:1</b>`);
fs.writeFileSync(path.join(__dirname, 'aurora_rassvet.html'), s);
console.log('ok', Math.round(s.length / 1024) + ' КБ');
