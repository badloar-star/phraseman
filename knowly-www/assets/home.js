/* Phraseman — скрипт новой главной (редизайн 2026-07-25).
   зачем: владелец утвердил — умная кнопка (мобила сразу в нужный стор,
   десктоп — выбор платформ), живая демо-карточка, аврора и деликатное
   движение. Всё локально и мгновенно, ноль библиотек, ноль запросов.
   Клики по сторам считает существующий stats.js через [data-store]:
   на мобиле атрибут вешается на саму умную кнопку по UA. */
(function () {
  'use strict';
  document.body.classList.add('js');
  var REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var DESKTOP = matchMedia('(min-width:720px)').matches;
  var HOVER = matchMedia('(hover:hover)').matches;
  var cfg = window.KNOWLY_SITE || {};
  var IOS = cfg.storeIos || 'https://apps.apple.com/app/id6764800879';
  var AND = cfg.storeAndroid || 'https://play.google.com/store/apps/details?id=app.phraseman';
  var isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  var isAndroid = /Android/i.test(navigator.userAgent || '');
  // зачем: телефон в ландшафте шире 720px — редирект решаем по устройству,
  // а не по ширине, чтобы телефон НИКОГДА не видел поповер с QR (вопрос владельца)
  var isPhoneOrTablet = isIos || isAndroid;

  /* ===== Аврора (WebGL, только десктоп; мобила и reduced-motion — CSS-фолбэк).
     Пауза, когда сцены нет на экране или вкладка в фоне: экономим GPU. ===== */
  (function aurora() {
    if (!DESKTOP || REDUCED) return;
    var cv = document.getElementById('gl');
    if (!cv) return;
    var gl = cv.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) return;
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = 'precision mediump float;uniform vec2 r;uniform float t;'
      + 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545);}'
      + 'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);'
      + 'return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}'
      + 'float fbm(vec2 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}'
      + 'void main(){vec2 uv=gl_FragCoord.xy/r;'
      + 'float f1=fbm(vec2(uv.x*2.2+t*.05,uv.y*1.4-t*.02));'
      + 'float f2=fbm(vec2(uv.x*3.0-t*.04+7.,uv.y*1.8+t*.03));'
      + 'float b1=smoothstep(.9,.2,abs(uv.y-.36-(f1-.5)*.5)*2.4);'
      + 'float b2=smoothstep(.9,.15,abs(uv.y-.62-(f2-.5)*.6)*2.8);'
      + 'vec3 c1=vec3(.97,.87,.55);vec3 c2=vec3(1.,.8,.62);'
      + 'vec3 col=c1*b1*f1*1.1+c2*b2*f2*.8;'
      + 'float a=clamp(b1*f1+b2*f2*.7,0.,1.)*.5;'
      + 'gl_FragColor=vec4(col,a);}';
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var lp = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(lp);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    var ur = gl.getUniformLocation(pr, 'r'), ut = gl.getUniformLocation(pr, 't');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    var stage = document.getElementById('stage'), run = true, raf = 0;
    function size() {
      var dpr = Math.min(devicePixelRatio || 1, 1.5), w = stage.clientWidth, h = stage.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(ur, cv.width, cv.height);
    }
    size();
    addEventListener('resize', size);
    function loop(ts) { if (!run) return; gl.uniform1f(ut, ts * .001); gl.drawArrays(gl.TRIANGLES, 0, 3); raf = requestAnimationFrame(loop); }
    raf = requestAnimationFrame(loop);
    new IntersectionObserver(function (e) {
      var vis = e[0].isIntersecting;
      if (vis && !run) { run = true; raf = requestAnimationFrame(loop); }
      else if (!vis) { run = false; cancelAnimationFrame(raf); }
    }).observe(stage);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { run = false; cancelAnimationFrame(raf); }
      else if (!run) { run = true; raf = requestAnimationFrame(loop); }
    });
  })();

  /* ===== Заголовок по буквам + проявление подстрок (дефолт видимый без JS) ===== */
  (function splitIntro() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(' ');
      el.textContent = '';
      words.forEach(function (w, wi) {
        var ws = document.createElement('span');
        ws.style.display = 'inline-block';
        ws.style.whiteSpace = 'nowrap';
        for (var c = 0; c < w.length; c++) {
          var s = document.createElement('span');
          s.className = 'ch';
          s.textContent = w[c];
          ws.appendChild(s);
        }
        el.appendChild(ws);
        if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
    if (!REDUCED) {
      var i = 0;
      document.querySelectorAll('[data-split] .ch').forEach(function (ch) {
        ch.animate(
          [{ opacity: 0, transform: 'translateY(.5em)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
          { duration: 560, delay: 100 + i * 20, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'both' }
        );
        i++;
      });
    }
    document.querySelectorAll('.blur-in').forEach(function (el) {
      requestAnimationFrame(function () { el.classList.add('go'); });
    });
  })();

  /* ===== Живая демо-карточка: всё локально, мгновенно, без сети ===== */
  var PHRASES = [
    { en: 'Could I get a coffee, please?', ru: 'Можно мне кофе, пожалуйста?', why: '«Could I get…» звучит мягче и вежливее, чем прямое «Give me». Так просят кофе, счёт и что угодно ещё.' },
    { en: "I'm running late.", ru: 'Я опаздываю.', why: 'Буквально «бегу поздно». Готовая фраза для такси, звонка коллеге и извинения в чате.' },
    { en: 'That works for me.', ru: 'Мне подходит.', why: 'Здесь works значит «устраивает», а не «работает». Ответ на предложенное время или план.' },
  ];
  var pi = 0, demo = document.getElementById('demo');
  if (demo) {
    var dEn = document.getElementById('dEn'), dRu = document.getElementById('dRu'), dWhy = document.getElementById('dWhy');
    var renderPhrase = function () {
      dEn.textContent = PHRASES[pi].en;
      dRu.textContent = PHRASES[pi].ru;
      dWhy.textContent = PHRASES[pi].why;
    };
    document.getElementById('dNext').addEventListener('click', function () {
      pi = (pi + 1) % PHRASES.length;
      demo.classList.remove('explained');
      renderPhrase();
    });
    document.getElementById('dExplain').addEventListener('click', function () {
      demo.classList.toggle('explained');
    });
    var play = document.getElementById('dPlay');
    if ('speechSynthesis' in window) {
      play.addEventListener('click', function () {
        try {
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(PHRASES[pi].en);
          u.lang = 'en-US';
          u.rate = .95;
          speechSynthesis.speak(u);
        } catch (e) { /* озвучка не критична */ }
      });
    } else { play.style.display = 'none'; }
    renderPhrase();

    if (HOVER && !REDUCED) {
      var glare = document.getElementById('glare');
      demo.addEventListener('pointermove', function (e) {
        var r = demo.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        demo.style.setProperty('--ry', ((x - .5) * 6) + 'deg');
        demo.style.setProperty('--rx', (-(y - .5) * 6) + 'deg');
        glare.style.setProperty('--gx', (x * 100) + '%');
        glare.style.setProperty('--gy', (y * 100) + '%');
      });
      demo.addEventListener('pointerleave', function () {
        demo.style.setProperty('--ry', '0deg');
        demo.style.setProperty('--rx', '0deg');
      });
    }
  }

  /* ===== Умная кнопка: мобила сразу в нужный стор, десктоп — поповер выбора.
     На мобиле кнопки несут data-store по UA, чтобы клик посчитал stats.js
     ДО перехода (его слушатель на capture-фазе, beacon переживает уход). ===== */
  var dl = document.getElementById('dl');
  var storeUrl = isIos ? IOS : AND;
  function markMobileButtons() {
    if (isPhoneOrTablet || matchMedia('(max-width:720px)').matches) {
      document.querySelectorAll('.js-cta, #dlBtn').forEach(function (b) {
        b.setAttribute('data-store', isIos ? 'ios' : 'android');
      });
    }
  }
  markMobileButtons();

  function spark(e, btn) {
    if (REDUCED || !e.clientX) return;
    var r = btn.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var k = 0; k < 8; k++) {
      var s = document.createElement('i');
      s.className = 'spark';
      btn.appendChild(s);
      var a = k / 8 * Math.PI * 2;
      s.animate(
        [
          { transform: 'translate(' + x + 'px,' + y + 'px) rotate(' + (a * 180 / Math.PI + 90) + 'deg)', opacity: 1 },
          { transform: 'translate(' + (x + Math.cos(a) * 46) + 'px,' + (y + Math.sin(a) * 46) + 'px) rotate(' + (a * 180 / Math.PI + 90) + 'deg) scaleY(.3)', opacity: 0 },
        ],
        { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' }
      );
      (function (el) { setTimeout(function () { el.remove(); }, 540); })(s);
    }
  }

  function smart(e) {
    if (isPhoneOrTablet || matchMedia('(max-width:720px)').matches) { location.href = storeUrl; return; }
    var r = dl.getBoundingClientRect();
    if (r.top < 0 || r.top > innerHeight - 80) scrollTo({ top: 0, behavior: 'smooth' });
    dl.classList.toggle('open');
    if (e) e.stopPropagation();
  }
  var mainBtn = document.getElementById('dlBtn');
  if (mainBtn) mainBtn.addEventListener('click', function (e) { spark(e, this); smart(e); });
  var navDl = document.getElementById('navDl');
  if (navDl) navDl.addEventListener('click', function (e) { e.preventDefault(); smart(e); });
  document.querySelectorAll('.js-cta').forEach(function (b) {
    b.addEventListener('click', function (e) { spark(e, this); smart(e); });
  });
  document.addEventListener('click', function (e) { if (dl && !dl.contains(e.target)) dl.classList.remove('open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dl) dl.classList.remove('open'); });

  /* магнит главной кнопки: декоративно, напрямую в style, вне каких-либо state-циклов */
  (function magnet() {
    if (!HOVER || REDUCED || !dl || !mainBtn) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, af = 0;
    function loop() {
      cx += (tx - cx) * .16; cy += (ty - cy) * .16;
      mainBtn.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
      if (Math.abs(tx - cx) > .1 || Math.abs(ty - cy) > .1) af = requestAnimationFrame(loop); else af = 0;
    }
    dl.addEventListener('pointermove', function (e) {
      var r = mainBtn.getBoundingClientRect();
      tx = Math.max(-7, Math.min(7, (e.clientX - (r.left + r.width / 2)) * .12));
      ty = Math.max(-6, Math.min(6, (e.clientY - (r.top + r.height / 2)) * .18));
      if (!af) af = requestAnimationFrame(loop);
    });
    dl.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!af) af = requestAnimationFrame(loop); });
  })();

  /* ===== Счётчик теста: из кэша тест-лендинга, ноль новых запросов ===== */
  (function testCounter() {
    var el = document.getElementById('testCnt');
    if (!el) return;
    var value = 124000; /* публичная отправная точка самого теста */
    try {
      var parsed = JSON.parse(localStorage.getItem('english_test_completed_cache_v1'));
      if (parsed && Number.isSafeInteger(parsed.value) && parsed.value > value) value = parsed.value;
    } catch (e) { /* остаёмся на отправной точке */ }
    el.textContent = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '+';
  })();

  /* ===== Липкая кнопка: «одна кнопка на экране» (требование владельца).
     Прячем, пока в вьюпорте видна любая CTA из потока страницы. ===== */
  (function stickyBarGuard() {
    var mbar = document.querySelector('.mbar');
    if (!mbar) return;
    /* «одна кнопка» буквально: прячемся при ЛЮБОЙ видимой кнопке страницы */
    var flowCtas = [].slice.call(document.querySelectorAll('.btn')).filter(function (b) {
      return !mbar.contains(b);
    });
    if (!flowCtas.length) return;
    var visible = new Set();
    var ctaIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      mbar.classList.toggle('mbar-hidden', visible.size > 0);
    }, { threshold: .35 });
    flowCtas.forEach(function (b) { ctaIo.observe(b); });
  })();

  /* появления секций при скролле */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();
