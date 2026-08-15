/* ============================================================================
   SHELL — каталог поверхностей, телефонный фрейм, воспроизведение, замедление.
   Дизайн-файл поставляет DESIGN = { slug, name, tagline, brand, themes, css,
                                     surfaces: [...] }
   ========================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const A  = ENGINE;

let CURRENT = null;
let THEME = DESIGN.defaultTheme || 'midnight';
let LOOP = false;
let loopTimer = null;

/* ---------- построение интерфейса ---------- */
function build() {
  document.title = `${DESIGN.name} — макеты Phraseman`;
  const st = document.documentElement.style;
  st.setProperty('--brand', DESIGN.brand);
  st.setProperty('--brand-dim', DESIGN.brandDim || DESIGN.brand + '26');

  $('.nav-head').innerHTML =
    `<div class="badge">Направление ${DESIGN.letter || ''}</div>
     <div class="dn">${DESIGN.name}</div>
     <div class="dt">${DESIGN.tagline}</div>`;

  const cats = {};
  DESIGN.surfaces.forEach(s => (cats[s.cat] = cats[s.cat] || []).push(s));
  $('.list').innerHTML = Object.entries(cats).map(([c, arr]) =>
    `<div class="cat">${c} · ${arr.length}</div>` +
    arr.map(s => `<div class="item" data-id="${s.id}"><span class="id">${s.id}</span><span class="tx">${s.title}</span></div>`).join('')
  ).join('');

  $('.list').addEventListener('click', e => {
    const it = e.target.closest('.item');
    if (it) select(it.dataset.id);
  });

  $('#q').addEventListener('input', e => {
    const v = e.target.value.trim().toLowerCase();
    $$('.item').forEach(it => {
      const s = DESIGN.surfaces.find(x => x.id === it.dataset.id);
      it.style.display = !v || (s.title + s.id + (s.sub || '')).toLowerCase().includes(v) ? '' : 'none';
    });
    $$('.cat').forEach(c => {
      let n = c.nextElementSibling, vis = false;
      while (n && n.classList.contains('item')) { if (n.style.display !== 'none') vis = true; n = n.nextElementSibling; }
      c.style.display = vis ? '' : 'none';
    });
  });

  // темы — реальные из constants/theme.ts
  {
    const list = DESIGN.themeList || Object.keys(THEMES);
    $('#themes').innerHTML = list
      .map(k => `<button data-t="${k}" class="${k === THEME ? 'on' : ''}">${THEMES[k].label}</button>`).join('');
    $('#themes').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#themes button').forEach(x => x.classList.toggle('on', x === b));
      THEME = b.dataset.t; applyTheme(); if (CURRENT) play();
    });
  }

  $('#speed').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#speed button').forEach(x => x.classList.toggle('on', x === b));
    A.speed = parseFloat(b.dataset.s);
  });

  $('#replay').addEventListener('click', () => play());
  $('#loop').addEventListener('click', e => {
    LOOP = !LOOP; e.currentTarget.classList.toggle('pri', LOOP);
    e.currentTarget.querySelector('span').textContent = LOOP ? 'Цикл вкл' : 'Цикл';
    if (LOOP) play();
  });
  $('#codebtn').addEventListener('click', () => $('.app').classList.toggle('show-code'));

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); play(); }
    const list = DESIGN.surfaces.filter(s => $(`.item[data-id="${s.id}"]`).style.display !== 'none');
    const i = list.findIndex(s => s.id === (CURRENT && CURRENT.id));
    if (e.key === 'ArrowDown' && i < list.length - 1) select(list[i + 1].id);
    if (e.key === 'ArrowUp' && i > 0) select(list[i - 1].id);
  });

  applyTheme();
  select(DESIGN.surfaces[0].id);
}

function applyTheme() {
  const t = THEMES[THEME]; if (!t) return;
  const st = $('.screen').style;
  st.cssText = '';
  Object.entries(t.vars).forEach(([k, v]) => st.setProperty('--' + k, v));
}

/* ---------- выбор и воспроизведение ---------- */
function select(id) {
  const s = DESIGN.surfaces.find(x => x.id === id);
  if (!s) return;
  CURRENT = s;
  $$('.item').forEach(it => it.classList.toggle('on', it.dataset.id === id));
  $('.stage-top').innerHTML = `<h2>${s.title}</h2><span class="sub">${s.sub || ''}</span>`;
  $('.code-h').textContent = `React Native · ${s.id}`;
  $('.code pre').innerHTML = hl(s.rn || '// спецификация в разработке');
  play();
}

function play() {
  clearTimeout(loopTimer);
  A.killAll();
  const s = CURRENT; if (!s) return;
  const scr = $('.screen');
  scr.innerHTML = (s.base ? BASES[s.base](THEME) : '') + s.html(THEMES[THEME].vars, THEME);
  // перерисовка перед стартом, чтобы не смазать первый кадр
  void scr.offsetHeight;
  drawTimeline(s.timeline || []);
  const ctx = {
    $:  (q) => scr.querySelector(q),
    $$: (q) => [...scr.querySelectorAll(q)],
    A, E: A.EASE, scr,
    T: THEMES[THEME].vars, theme: THEME,
    tokens: DESIGN.tokens || {},
  };
  try { s.play(ctx); } catch (err) { console.error(err); }
  runPlayhead(s.duration || 2600);
  if (LOOP) loopTimer = setTimeout(play, ((s.duration || 2600) + 700) / A.speed);
}

/* ---------- таймлайн ---------- */
function drawTimeline(marks) {
  const tl = $('.tl');
  const dur = (CURRENT && CURRENT.duration) || 2600;
  let lastPct = -99, row = 0;
  tl.innerHTML = `<div class="head"></div>` + marks.map(m => {
    const pct = m.t / dur * 100;
    row = (pct - lastPct) < 26 ? (row + 1) % 2 : 0;
    lastPct = pct;
    return `<div class="mk r${row}" style="left:${pct.toFixed(2)}%">${m.t}мс · ${m.label}</div>`;
  }).join('');
}

function runPlayhead(dur) {
  const h = $('.tl .head'); if (!h) return;
  h.style.opacity = 1;
  const t0 = performance.now();
  (function step(ts) {
    const p = (performance.now() - t0) * A.speed / dur;
    h.style.left = Math.min(100, p * 100) + '%';
    if (p < 1 && CURRENT) requestAnimationFrame(step);
    else h.style.opacity = .25;
  })();
}

/* ---------- подсветка кода ---------- */
function hl(src) {
  return src
    .replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
    .replace(/('[^']*')/g, '<span class="str">$1</span>')
    .replace(/\b(const|let|function|return|import|from|export|default|new|if|else|await|async)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(withSpring|withTiming|withDelay|withSequence|withRepeat|useSharedValue|useAnimatedStyle|runOnJS|interpolate|Easing)\b/g, '<span class="fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
}

document.addEventListener('DOMContentLoaded', build);
