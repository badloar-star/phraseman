/* ============================================================================
   MOTION ENGINE — точная реализация физики Reanimated / RN Animated в браузере.
   Цель: значения, написанные в макете, переносятся в React Native БЕЗ пересчёта.

   spring({stiffness, damping, mass})  ==  Reanimated withSpring({stiffness, damping, mass})
                                       ==  Animated.spring({tension: stiffness, friction: damping})
   timing({duration, easing})          ==  withTiming(v, {duration, easing: Easing.bezier(...)})
   ========================================================================== */

const ENGINE = (() => {
  const RAF = requestAnimationFrame;
  let speed = 1;                 // 1 | 0.5 | 0.25  — глобальное замедление
  let tracks = [];               // активные треки
  let dirty = new Set();         // элементы, которым нужно пересобрать transform
  let running = false;
  let now = 0;

  // ── состояние трансформа на элемент ────────────────────────────────────────
  const STATE = new WeakMap();
  const BASE = { x: 0, y: 0, z: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, rotateX: 0, rotateY: 0, skewX: 0 };

  function st(el) {
    let s = STATE.get(el);
    if (!s) { s = Object.assign({}, BASE); STATE.set(el, s); }
    return s;
  }

  function flush(el) {
    const s = STATE.get(el);
    if (!s) return;
    el.style.transform =
      `translate3d(${s.x}px,${s.y}px,0)` +
      (s.rotate ? ` rotate(${s.rotate}deg)` : '') +
      (s.rotateX ? ` rotateX(${s.rotateX}deg)` : '') +
      (s.rotateY ? ` rotateY(${s.rotateY}deg)` : '') +
      (s.skewX ? ` skewX(${s.skewX}deg)` : '') +
      ` scale(${s.scale * s.scaleX}, ${s.scale * s.scaleY})`;
  }

  const TRANSFORM_PROPS = new Set(Object.keys(BASE));

  function apply(el, prop, v) {
    if (TRANSFORM_PROPS.has(prop)) { st(el)[prop] = v; dirty.add(el); return; }
    switch (prop) {
      case 'opacity':     el.style.opacity = v; break;
      case 'blur':        el.style.filter = v > 0.02 ? `blur(${v}px)` : ''; break;
      case 'backdrop':    el.style.backdropFilter = `blur(${v}px)`; el.style.webkitBackdropFilter = `blur(${v}px)`; break;
      case 'width':       el.style.width = v + '%'; break;
      case 'height':      el.style.height = v + '%'; break;
      case 'dash':        el.style.strokeDashoffset = v; break;
      case 'glow':        el.style.setProperty('--glow', v); break;
      case 'prog':        el.style.setProperty('--prog', v); break;
      case 'shift':       el.style.setProperty('--shift', v); break;
      default:            el.style.setProperty('--' + prop, v);
    }
  }

  // ── ПРУЖИНА: затухающий гармонический осциллятор (как в Reanimated) ────────
  // x'' = -(k/m)(x - to) - (c/m) x'
  function makeSpring({ stiffness = 100, damping = 10, mass = 1, velocity = 0, from = 0, to = 1,
                        restDelta = 0.001, restSpeed = 0.01, overshootClamping = false } = {}) {
    const delta = to - from;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    let fn;
    if (zeta < 1) {                              // недемпфированная — с отскоком
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      fn = (t) => {
        const e = Math.exp(-zeta * w0 * t);
        const A = -delta;
        const B = (velocity - zeta * w0 * delta) / wd;
        return to + e * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
      };
    } else if (zeta === 1) {                     // критическое
      fn = (t) => {
        const e = Math.exp(-w0 * t);
        return to + e * (-delta + (velocity - w0 * delta) * t);
      };
    } else {                                     // передемпфированная
      const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c2 = (velocity - r1 * -delta) / (r2 - r1);
      const c1 = -delta - c2;
      fn = (t) => to + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    }
    // длительность до покоя
    const step = 1 / 240;
    let dur = 0, prev = from;
    const span = Math.max(1e-6, Math.abs(delta));
    for (let t = step; t <= 6; t += step) {
      const v = fn(t);
      const vel = Math.abs(v - prev) / step;
      prev = v;
      if (Math.abs(v - to) / span < restDelta && vel / span < restSpeed * 100) { dur = t; break; }
      dur = t;
    }
    const clamp = overshootClamping
      ? (v) => (delta >= 0 ? Math.min(v, to) : Math.max(v, to))
      : (v) => v;
    return { at: (ms) => clamp(fn(ms / 1000)), duration: Math.round(dur * 1000) };
  }

  // ── кубическая кривая Безье (как Easing.bezier в Reanimated) ───────────────
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sdx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    return (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const d = sx(t) - x;
        if (Math.abs(d) < 1e-6) return sy(t);
        const dd = sdx(t);
        if (Math.abs(dd) < 1e-6) break;
        t -= d / dd;
      }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 20; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; v > x ? (hi = t) : (lo = t); t = (lo + hi) / 2; }
      return sy(t);
    };
  }

  const EASE = {
    linear:   (t) => t,
    std:      bezier(0.32, 0.72, 0, 1),      // основной «премиальный» вход
    out:      bezier(0.16, 1, 0.3, 1),        // резкий старт, длинный выкат
    in:       bezier(0.7, 0, 0.84, 0),
    inOut:    bezier(0.65, 0, 0.35, 1),
    exit:     bezier(0.4, 0, 1, 1),           // выход: быстро уезжает
    snap:     bezier(0.2, 0, 0, 1),
    anticip:  bezier(0.6, -0.35, 0.3, 1.3),   // с замахом
    soft:     bezier(0.4, 0, 0.2, 1),
    bezier,
  };

  // ── трек ───────────────────────────────────────────────────────────────────
  function addTrack(t) {
    tracks.push(t);
    if (!running) { running = true; last = performance.now(); RAF(loop); }
    return t;
  }

  let last = 0;
  function loop(ts) {
    const dt = Math.min(64, ts - last) * speed;
    last = ts;
    now += dt;
    for (let i = tracks.length - 1; i >= 0; i--) {
      const t = tracks[i];
      const e = now - t.start;
      if (e < 0) continue;
      const p = Math.min(1, t.duration ? e / t.duration : 1);
      let v;
      if (t.spring) { v = e >= t.spring.duration ? t.to : t.spring.at(e); }
      else { v = t.from + (t.to - t.from) * t.ease(p); }
      if (t.set) t.set(v, p); else apply(t.el, t.prop, v);
      const done = t.spring ? e >= t.spring.duration : p >= 1;
      if (done) {
        if (t.set) t.set(t.to, 1); else apply(t.el, t.prop, t.to);
        if (t.repeat) {
          t.start = now;
          if (t.yoyo) { const a = t.from; t.from = t.to; t.to = a; if (t.spring) t.spring = makeSpring(Object.assign({}, t.springCfg, { from: t.from, to: t.to })); }
          if (t.repeat > 0) t.repeat--;
        } else {
          tracks.splice(i, 1);
          if (t.onDone) t.onDone();
        }
      }
    }
    dirty.forEach(flush); dirty.clear();
    if (tracks.length) RAF(loop); else running = false;
  }

  // ── публичное API ──────────────────────────────────────────────────────────
  function animate(el, prop, cfg) {
    const from = cfg.from !== undefined ? cfg.from : currentOf(el, prop);
    const to = cfg.to;
    const delay = (cfg.delay || 0);
    const track = { el, prop, from, to, start: now + delay, set: cfg.set, onDone: cfg.onDone,
                    repeat: cfg.repeat || 0, yoyo: cfg.yoyo };
    if (cfg.spring) {
      const sc = Object.assign({ from, to }, cfg.spring);
      track.springCfg = sc;
      track.spring = makeSpring(sc);
      track.duration = track.spring.duration;
    } else {
      track.duration = cfg.duration != null ? cfg.duration : 300;
      track.ease = typeof cfg.ease === 'function' ? cfg.ease : (EASE[cfg.ease] || EASE.std);
    }
    if (cfg.set) cfg.set(from, 0); else apply(el, prop, from);
    return addTrack(track);
  }

  function currentOf(el, prop) {
    if (TRANSFORM_PROPS.has(prop)) return st(el)[prop];
    if (prop === 'opacity') return parseFloat(el.style.opacity || 1);
    return 0;
  }

  function set(el, obj) {
    for (const k in obj) apply(el, k, obj[k]);
    dirty.forEach(flush); dirty.clear();
  }

  function reset(el) { STATE.set(el, Object.assign({}, BASE)); el.style.transform = ''; el.style.opacity = ''; el.style.filter = ''; }

  function killAll() { tracks = []; }

  /* ── Origami-конвертация RN Animated.spring({tension, friction}) ───────────
     React Native внутри переводит tension/friction в stiffness/damping ровно так
     (Animated/SpringConfig.js → fromOrigamiTensionAndFriction). Без этой формулы
     макет отличался бы от приложения — поэтому она здесь, а не «на глаз». */
  function origami(tension = 40, friction = 7) {
    return { stiffness: (tension - 30) * 3.62 + 194, damping: (friction - 8) * 3 + 25, mass: 1 };
  }

  return {
    animate, set, reset, killAll, EASE, makeSpring, bezier, origami,
    get speed() { return speed; }, set speed(v) { speed = v; },
    get time() { return now; },
  };
})();
