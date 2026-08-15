/* ============================================================================
   DUEL — несколько вариантов одной поверхности бок о бок, синхронный запуск.
   Используется для выбора модалки повышения уровня.
   ========================================================================== */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const A  = ENGINE;

let THEME = DUEL.defaultTheme || Object.keys(DUEL.themes)[0];
let LOOP = false, loopT = null;
let FOCUS = null;

function build() {
  document.title = DUEL.title;
  $('#title').textContent = DUEL.title;
  $('#sub').textContent = DUEL.subtitle;

  $('#row').innerHTML = DUEL.variants.map(v => `
    <div class="col" data-id="${v.id}">
      <div class="col-h">
        <div class="col-n"><i>${v.id}</i>${v.name}</div>
        <div class="col-p">${v.pitch}</div>
      </div>
      <div class="ph"><div class="scr" id="scr-${v.id}"></div><div class="nt"></div></div>
      <div class="col-w">${v.why}</div>
      <button class="mini" data-code="${v.id}">Код RN</button>
    </div>`).join('');

  $('#themes').innerHTML = Object.entries(DUEL.themes)
    .map(([k, v]) => `<button data-t="${k}" class="${k === THEME ? 'on' : ''}">${v.label}</button>`).join('');

  $('#themes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#themes button').forEach(x => x.classList.toggle('on', x === b));
    THEME = b.dataset.t; applyTheme(); playAll();
  });
  $('#speed').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#speed button').forEach(x => x.classList.toggle('on', x === b));
    A.speed = parseFloat(b.dataset.s);
  });
  $('#play').addEventListener('click', playAll);
  $('#loop').addEventListener('click', e => {
    LOOP = !LOOP; e.currentTarget.classList.toggle('pri', LOOP);
    e.currentTarget.textContent = LOOP ? 'Цикл вкл' : 'Цикл';
    if (LOOP) playAll();
  });
  $('#row').addEventListener('click', e => {
    const b = e.target.closest('.mini');
    if (b) { showCode(b.dataset.code); return; }
    const c = e.target.closest('.col');
    if (c) { FOCUS = FOCUS === c.dataset.id ? null : c.dataset.id; applyFocus(); }
  });
  $('#closecode').addEventListener('click', () => $('#codewrap').classList.remove('on'));
  document.addEventListener('keydown', e => {
    if (e.key === ' ') { e.preventDefault(); playAll(); }
    if (e.key === 'Escape') { $('#codewrap').classList.remove('on'); FOCUS = null; applyFocus(); }
  });

  applyTheme();
  playAll();
}

function applyFocus() {
  $$('.col').forEach(c => c.classList.toggle('dim', FOCUS && c.dataset.id !== FOCUS));
  $('#row').classList.toggle('focused', !!FOCUS);
}

function applyTheme() {
  const t = DUEL.themes[THEME];
  $$('.scr').forEach(s => Object.entries(t.vars).forEach(([k, v]) => s.style.setProperty('--' + k, v)));
}

function showCode(id) {
  const v = DUEL.variants.find(x => x.id === id);
  $('#codeh').textContent = `${v.id} · ${v.name}`;
  $('#codebody').innerHTML = hl(v.rn || '');
  $('#codewrap').classList.add('on');
}

function playAll() {
  clearTimeout(loopT);
  A.killAll();
  const vars = DUEL.themes[THEME].vars;
  DUEL.variants.forEach(v => {
    const scr = $('#scr-' + v.id);
    scr.innerHTML = (v.base ? BASES[v.base](THEME) : '') + v.html(vars, THEME);
    void scr.offsetHeight;
  });
  DUEL.variants.forEach(v => {
    const scr = $('#scr-' + v.id);
    try { v.play({ $: q => scr.querySelector(q), $$: q => [...scr.querySelectorAll(q)], A, E: A.EASE, scr, T: vars }); }
    catch (err) { console.error(v.id, err); }
  });
  const maxd = Math.max(...DUEL.variants.map(v => v.duration || 3000));
  if (LOOP) loopT = setTimeout(playAll, (maxd + 900) / A.speed);
}

function hl(src) {
  return src.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
    .replace(/('[^']*')/g, '<span class="str">$1</span>')
    .replace(/\b(const|let|function|return|import|from|export|default|new|if|else|await|async)\b/g, '<span class="kw">$1</span>')
    .replace(/\b(withSpring|withTiming|withDelay|withSequence|withRepeat|useSharedValue|useAnimatedStyle|runOnJS|interpolate|Easing|cancelAnimation)\b/g, '<span class="fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
}

document.addEventListener('DOMContentLoaded', build);
