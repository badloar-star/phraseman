/* knowlyapps.com — анимации лендинга. Ванильные порты React Bits:
   SideRays (WebGL-лучи), RotatingText (ротация слова), счётчики цифр,
   липкая шапка + подсветка раздела, наклон телефона, мобильная CTA-панель.
   Правила: ни один эффект не должен ломать страницу (всё в try/catch),
   prefers-reduced-motion отключает движение, оффскрин — паузу. */
(function () {
  'use strict';

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) { /* noop */ }

  /* ── 1. Лучи (порт SideRays: тот же фрагментный шейдер, чистый WebGL) ── */
  function initRays() {
    if (reduceMotion) return;
    var host = document.querySelector('.hero-rays');
    if (!host) return;

    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    host.appendChild(canvas);

    var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FRAG =
      'precision highp float;' +
      'uniform float uT;uniform vec2 uR;' +
      'float rs(vec2 s,vec2 d,vec2 c,float a,float b,float sp){' +
      'vec2 sc=c-s;float ca=dot(normalize(sc),d);' +
      'return clamp((.45+.15*sin(ca*a+uT*sp))+(.3+.2*cos(-ca*b+uT*sp)),0.,1.)*' +
      'clamp((uR.x-length(sc))/uR.x,.5,1.);}' +
      'void main(){' +
      'vec2 fc=gl_FragCoord.xy;' +
      'vec2 c=vec2(fc.x,uR.y-fc.y);' +
      'vec2 rp=vec2(uR.x*1.1,-.5*uR.y);' +
      'float hs=.41;' + /* spread 1.5 → halfSpread ≈ 0.41 */
      'vec2 d1=normalize(vec2(cos(.785398+hs),sin(.785398+hs)));' +
      'vec2 d2=normalize(vec2(cos(.785398-hs),sin(.785398-hs)));' +
      'vec3 g1=vec3(.976,.871,.545);' + /* #f9de8b — светлое золото */
      'vec3 g2=vec3(.827,.671,.290);' + /* #d3ab4a — глубокое золото */
      'vec4 r1=vec4(g1,1.)*rs(rp,d1,c,36.2214,21.11349,1.1);' +
      'vec4 r2=vec4(g2,1.)*rs(rp,d2,c,22.3991,18.0234,.22);' +
      'vec4 col=r1*.4*.9+r2*.6*.9;' +
      'float dl=length(fc-vec2(rp.x,uR.y-rp.y))/uR.y;' +
      'col.rgb*=1.1*.4/pow(max(dl,.001),1.7);' +
      'float gr=dot(col.rgb,vec3(.299,.587,.114));' +
      'col.rgb=mix(vec3(gr),col.rgb,1.15);' +
      'col.a=max(col.r,max(col.g,col.b));' +
      'gl_FragColor=col;}';

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VERT);
    var fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uT = gl.getUniformLocation(prog, 'uT');
    var uR = gl.getUniformLocation(prog, 'uR');

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uR, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    var visible = true, raf = 0;
    function frame(t) {
      gl.uniform1f(uT, t * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible ? requestAnimationFrame(frame) : 0;
    }
    function play() {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    try {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        visible ? play() : stop();
      }, { threshold: 0.02 }).observe(host);
    } catch (_) { play(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });
  }

  /* ── 2. Ротация слова в h1 (порт RotatingText: стаггер по буквам) ── */
  function initRotor() {
    var el = document.querySelector('.rotor');
    if (!el) return;
    var words = (el.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;

    var idx = 0;
    function render(word, entering) {
      el.textContent = '';
      var frag = document.createDocumentFragment();
      for (var i = 0; i < word.length; i++) {
        var ch = document.createElement('span');
        ch.className = entering ? 'ch pre' : 'ch';
        ch.textContent = word[i];
        ch.style.transitionDelay = (i * 28) + 'ms';
        frag.appendChild(ch);
      }
      el.appendChild(frag);
    }
    render(words[0], false);
    function measure(word) {
      var cs = getComputedStyle(el);
      var probe = document.createElement('span');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.whiteSpace = 'nowrap';
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontSize = cs.fontSize;
      probe.style.fontStyle = cs.fontStyle;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.textContent = word;
      el.parentNode.appendChild(probe);
      var w = probe.offsetWidth + 3; /* запас под свес курсива */
      probe.remove();
      return w;
    }
    el.style.width = measure(words[0]) + 'px';
    if (reduceMotion) return;

    function rotate() {
      if (document.hidden) return;
      var chs = el.querySelectorAll('.ch');
      for (var i = 0; i < chs.length; i++) chs[i].classList.add('out');
      setTimeout(function () {
        idx = (idx + 1) % words.length;
        render(words[idx], true);
        el.style.width = measure(words[idx]) + 'px';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            var next = el.querySelectorAll('.ch');
            for (var i = 0; i < next.length; i++) next[i].classList.remove('pre');
          });
        });
      }, 380);
    }
    setInterval(rotate, 2800);
  }

  /* ── 3. Счётчики цифр (10 000+ и т.п.) ── */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function fmt(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (!target || reduceMotion) {
        el.textContent = fmt(target) + suffix;
        return;
      }
      var t0 = null, DUR = 1300;
      function tick(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / DUR, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    try {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            run(e.target);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      els.forEach(function (el) { io.observe(el); });
    } catch (_) {
      els.forEach(function (el) {
        el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
      });
    }
  }

  /* ── 4. Липкая шапка + подсветка активного раздела ── */
  function initTopbar() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        bar.classList.toggle('scrolled', window.scrollY > 8);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute('href'));
      if (sec) map[sec.id] = a;
    });
    try {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && map[e.target.id]) {
            links.forEach(function (a) { a.classList.remove('active'); });
            map[e.target.id].classList.add('active');
          }
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      Object.keys(map).forEach(function (id) {
        spy.observe(document.getElementById(id));
      });
    } catch (_) { /* noop */ }
  }

  /* ── 5. Наклон телефона за курсором (только мышь, деликатно) ── */
  function initTilt() {
    if (reduceMotion) return;
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (_) { /* noop */ }
    if (!fine) return;
    var device = document.querySelector('.device');
    var zone = document.querySelector('.hero-visual');
    if (!device || !zone) return;
    zone.addEventListener('mousemove', function (e) {
      var r = zone.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      device.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      device.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
    });
    zone.addEventListener('mouseleave', function () {
      device.style.setProperty('--ry', '0deg');
      device.style.setProperty('--rx', '0deg');
    });
  }

  /* ── 6. Мобильная CTA-панель: появляется после hero ── */
  function initMobileCta() {
    var bar = document.querySelector('.mcta');
    var hero = document.querySelector('.hero');
    if (!bar || !hero) return;
    document.body.classList.add('mcta-on');
    try {
      new IntersectionObserver(function (es) {
        bar.classList.toggle('show', !es[0].isIntersecting);
      }, { threshold: 0.1 }).observe(hero);
    } catch (_) {
      bar.classList.add('show');
    }
  }

  /* ── 7. Каскад появления карточек: раздаём задержки ── */
  function initStagger() {
    document.querySelectorAll('.reveal').forEach(function (sec) {
      var items = sec.querySelectorAll('.fcard, .step, .quote, .gcard, .proof-item');
      for (var i = 0; i < items.length; i++) {
        items[i].style.setProperty('--stagger', String(i));
      }
    });
  }

  function boot() {
    [initRays, initRotor, initCounters, initTopbar, initTilt, initMobileCta, initStagger].forEach(
      function (fn) {
        try { fn(); } catch (_) { /* эффект не должен ломать страницу */ }
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
