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
    /* Меряем НАСТОЯЩУЮ разметку ротора (буквы = inline-block спаны с
       padding/letter-spacing), а не сплошной текст — иначе ширина занижена
       и слово режется. Клон ротора со всеми классами, width:auto. */
    function measure(word) {
      var clone = el.cloneNode(false);        // копия с классом .rotor и стилями
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = 'auto';
      clone.style.visibility = 'hidden';
      clone.style.transition = 'none';
      for (var i = 0; i < word.length; i++) {
        var ch = document.createElement('span');
        ch.className = 'ch';
        ch.textContent = word[i];
        clone.appendChild(ch);
      }
      el.parentNode.appendChild(clone);
      var w = Math.ceil(clone.getBoundingClientRect().width) + 2;
      clone.remove();
      return w;
    }
    el.style.width = measure(words[0]) + 'px';
    /* веб-шрифт догружается позже — после него глифы шире, пересчитываем */
    try {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          el.style.width = measure(words[idx]) + 'px';
        });
      }
    } catch (_) { /* noop */ }
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

  /* ── 5. iPhone: слои толщины корпуса (настоящее 3D) + наклон за курсором ── */
  function initPhone3d() {
    var ph = document.querySelector('.iphone');
    if (!ph) return;
    /* 12 слоёв по -1.6px по Z = ~19px титановой боковины, видимой при повороте */
    var SLICES = 12;
    for (var i = 1; i <= SLICES; i++) {
      var s = document.createElement('i');
      s.className = 'iph-slice' + (i === SLICES ? ' iph-back' : '');
      s.style.transform = 'translateZ(' + (-i * 1.6).toFixed(1) + 'px)';
      ph.insertBefore(s, ph.firstChild);
    }
  }

  function initTilt() {
    if (reduceMotion) return;
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (_) { /* noop */ }
    if (!fine) return;
    var device = document.querySelector('.iphone');
    var zone = document.querySelector('.hero-visual');
    if (!device || !zone) return;
    zone.addEventListener('mousemove', function (e) {
      var r = zone.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      device.style.setProperty('--ry', (x * 16).toFixed(2) + 'deg');
      device.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
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

  /* ── 6b. Док (порт Dock): увеличение иконок у курсора ── */
  function initDock() {
    var dock = document.querySelector('.dock');
    if (!dock) return;

    var top = dock.querySelector('[data-top]');
    if (top) {
      top.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    var hero = document.querySelector('.hero');
    var threshold = hero ? Math.max(300, hero.offsetHeight * 0.9) : 500;
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        dock.classList.toggle('show', window.scrollY > threshold);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (reduceMotion) return;
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (_) { /* noop */ }
    if (!fine) return;

    var items = Array.prototype.slice.call(dock.querySelectorAll('a'));
    var BASE = 46, MAG = 66, DIST = 130;
    dock.addEventListener('mousemove', function (e) {
      items.forEach(function (a) {
        var r = a.getBoundingClientRect();
        var d = Math.abs(e.clientX - (r.left + r.width / 2));
        var t = Math.max(0, 1 - d / DIST);
        var s = Math.round(BASE + (MAG - BASE) * t * t * (3 - 2 * t)); /* smoothstep */
        a.style.width = s + 'px';
        a.style.height = s + 'px';
      });
    });
    dock.addEventListener('mouseleave', function () {
      items.forEach(function (a) {
        a.style.width = BASE + 'px';
        a.style.height = BASE + 'px';
      });
    });
  }

  /* ── 6c. Бейдж на ленте (порт Lanyard): маятник + перетаскивание ── */
  function initLanyard() {
    var el = document.querySelector('.lanyard');
    if (!el) return;
    if (reduceMotion) return; /* висит статично */

    var theta = 0.12, omega = 0; /* стартовое отклонение — лёгкое покачивание */
    var G = 3.2, DAMP = 0.012, MAX = 0.55;
    var dragging = false, lastX = 0, lastT = 0;
    var visible = true, raf = 0, prev = 0;

    function pivotPoint() {
      var pr = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
      return {
        x: pr.left + el.offsetLeft + el.offsetWidth / 2,
        y: pr.top + el.offsetTop
      };
    }

    function frame(t) {
      if (!prev) prev = t;
      var dt = Math.min((t - prev) / 1000, 0.05);
      prev = t;
      if (!dragging) {
        var accel = -G * Math.sin(theta) - DAMP * omega * 60 + 0.06 * Math.cos(t * 0.0006);
        omega += accel * dt;
        theta += omega * dt;
        if (theta > MAX) { theta = MAX; omega = -Math.abs(omega) * 0.5; }
        if (theta < -MAX) { theta = -MAX; omega = Math.abs(omega) * 0.5; }
      }
      el.style.transform = 'rotate(' + theta.toFixed(4) + 'rad)';
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function play() {
      if (!raf && visible && !document.hidden) {
        prev = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    var badge = el.querySelector('.badge');
    if (badge) {
      badge.addEventListener('pointerdown', function (e) {
        dragging = true;
        el.classList.add('dragging');
        lastX = e.clientX;
        lastT = performance.now();
        try { badge.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
        e.preventDefault();
      });
      badge.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var p = pivotPoint();
        var target = Math.atan2(e.clientX - p.x, Math.max(40, e.clientY - p.y));
        theta = Math.max(-MAX, Math.min(MAX, target));
        var now = performance.now();
        var dtm = Math.max(now - lastT, 1);
        omega = ((e.clientX - lastX) / dtm) * 0.35; /* скорость отпускания */
        lastX = e.clientX;
        lastT = now;
      });
      function release() {
        dragging = false;
        el.classList.remove('dragging');
      }
      badge.addEventListener('pointerup', release);
      badge.addEventListener('pointercancel', release);
    }

    try {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        visible ? play() : stop();
      }, { threshold: 0.05 }).observe(el.offsetParent || el);
    } catch (_) { /* noop */ }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });
    play();
  }

  /* ── 6d. Лента фраз (порт Scroll Velocity) ── */
  function initRibbon() {
    var wrap = document.querySelector('.ribbon');
    if (!wrap) return;
    var track = wrap.querySelector('.ribbon-track');
    var seg = track && track.querySelector('.ribbon-seg');
    if (!track || !seg) return;
    /* вторая копия — для бесшовного цикла */
    track.appendChild(seg.cloneNode(true));
    if (reduceMotion) return;

    var pos = 0, lastY = window.scrollY, vel = 0, dir = -1;
    var visible = true, raf = 0;
    function frame() {
      var y = window.scrollY;
      var dyRaw = y - lastY;
      lastY = y;
      vel += (dyRaw - vel) * 0.1; /* сглаженная скорость скролла */
      if (vel > 0.6) dir = -1;
      else if (vel < -0.6) dir = 1;
      var speed = 0.85 + Math.min(Math.abs(vel) * 0.55, 14);
      pos += dir * speed;
      var w = seg.offsetWidth;
      if (w > 0) {
        if (pos <= -w) pos += w;
        if (pos > 0) pos -= w;
      }
      track.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)';
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function play() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    try {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        visible ? play() : stop();
      }, { threshold: 0.02 }).observe(wrap);
    } catch (_) { play(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });
  }

  /* ── 6e. Магнитные кнопки (порт Magnet) ── */
  function initMagnet() {
    if (reduceMotion) return;
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (_) { /* noop */ }
    if (!fine) return;
    document.querySelectorAll('[data-magnet]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * 0.14).toFixed(1) + 'px,' + (dy * 0.22).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ── 6f. Искры при клике (порт Click Spark) ── */
  function initSparks() {
    if (reduceMotion) return;
    var canvas = document.createElement('canvas');
    canvas.className = 'spark-canvas';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    }
    size();
    window.addEventListener('resize', size);

    var sparks = [], raf = 0;
    var DUR = 420, LEN = 11, DIST = 26, RAYS = 8;
    function gold() {
      try {
        return (getComputedStyle(document.documentElement).getPropertyValue('--gold') || '#e8c566').trim();
      } catch (_) { return '#e8c566'; }
    }
    document.addEventListener('click', function (e) {
      var now = performance.now();
      for (var i = 0; i < RAYS; i++) {
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          a: (Math.PI * 2 * i) / RAYS + Math.random() * 0.35,
          t: now,
          c: gold()
        });
      }
      if (!raf) raf = requestAnimationFrame(draw);
    }, true);

    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      sparks = sparks.filter(function (s) { return now - s.t < DUR; });
      sparks.forEach(function (s) {
        var p = (now - s.t) / DUR;
        var ease = 1 - Math.pow(1 - p, 3);
        var d0 = DIST * ease;
        var d1 = d0 + LEN * (1 - p);
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = s.c;
        ctx.beginPath();
        ctx.moveTo((s.x + Math.cos(s.a) * d0) * dpr, (s.y + Math.sin(s.a) * d0) * dpr);
        ctx.lineTo((s.x + Math.cos(s.a) * d1) * dpr, (s.y + Math.sin(s.a) * d1) * dpr);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      raf = sparks.length ? requestAnimationFrame(draw) : 0;
      if (!sparks.length) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ── 6g. Золотая пыль в hero (частицы) ── */
  function initDust() {
    if (reduceMotion) return;
    var host = document.querySelector('.hero-dust');
    if (!host) return;
    var canvas = document.createElement('canvas');
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0;
    function size() {
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    size();
    window.addEventListener('resize', size);

    var N = 36, ps = [];
    for (var i = 0; i < N; i++) {
      ps.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.7 + Math.random() * 1.4,
        s: 0.00012 + Math.random() * 0.00028, /* доля высоты за кадр */
        ph: Math.random() * 6.283
      });
    }
    var visible = true, raf = 0;
    function frame(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e8c566';
      for (var i = 0; i < N; i++) {
        var p = ps[i];
        p.y -= p.s;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.globalAlpha = 0.14 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.0012 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * W * dpr, p.y * H * dpr, p.r * dpr, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    function play() {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
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
    [initRays, initRotor, initCounters, initTopbar, initPhone3d, initTilt, initMobileCta, initDock, initLanyard, initRibbon, initMagnet, initSparks, initDust, initStagger].forEach(
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
