/* ============================================================
   Геометрия маршрутов карты. Не змейка: у каждой главы своя форма пути,
   продиктованная сценой. Доска главы = 390 px шириной, высота своя.
   Порядок сессий всегда однозначен: одна непрерывная линия света через
   8 точек (7 занятий + печать главы / врата экзамена в конце).
   Точки — центры узлов. Узлы: 60–76 px, печать 96 px, врата 128×100 px.
   ============================================================ */
(function () {
  const W = 390;
  const CX = W / 2;

  function polar(cx, cy, r, deg) {
    const a = (deg * Math.PI) / 180;
    return { x: Math.round(cx + r * Math.cos(a)), y: Math.round(cy + r * Math.sin(a)) };
  }

  /* Глава 1 «Утро в офисе»: лестница — шаг вправо, шаг вниз, вход в здание.
     Печать — площадка внизу по центру. */
  function stairs() {
    const pts = [
      { x: 72, y: 84 }, { x: 160, y: 84 }, { x: 160, y: 176 }, { x: 250, y: 176 },
      { x: 250, y: 268 }, { x: 330, y: 268 }, { x: 330, y: 362 }, { x: CX, y: 486 },
    ];
    return { pts, h: 580, style: "steps" };
  }

  /* Глава 2 «Кофе с коллегой»: кольцо чашки — 7 занятий по кромке, печать в центре. */
  function ring() {
    const cy = 268, r = 132;
    const pts = [];
    for (let i = 0; i < 7; i += 1) pts.push(polar(CX, cy, r, -90 + i * (360 / 7)));
    pts.push({ x: CX, y: cy });
    return { pts, h: 460, style: "ring", ring: { cx: CX, cy, r } };
  }

  /* Глава 3 «Знакомство с командой»: два ряда, как на командном фото. */
  function rows() {
    const pts = [
      { x: 62, y: 96 }, { x: 150, y: 96 }, { x: 240, y: 96 }, { x: 328, y: 96 },
      { x: 284, y: 196 }, { x: CX, y: 196 }, { x: 106, y: 196 }, { x: CX, y: 332 },
    ];
    return { pts, h: 420, style: "curve" };
  }

  /* Глава 4 «Квартира и погода»: косой дождь — одна струя сверху справа вниз влево. */
  function rain() {
    const pts = [];
    for (let i = 0; i < 7; i += 1) pts.push({ x: 330 - i * 45, y: 84 + i * 68 });
    pts.push({ x: CX, y: 604 });
    return { pts, h: 690, style: "line" };
  }

  /* Глава 5 «Обед с командой»: стол — вытянутая петля, печать во главе стола. */
  function track() {
    const pts = [
      { x: 78, y: 104 }, { x: 166, y: 82 }, { x: 256, y: 82 }, { x: 336, y: 112 },
      { x: 336, y: 238 }, { x: 256, y: 268 }, { x: 166, y: 268 }, { x: 78, y: 236 },
    ];
    return { pts, h: 340, style: "curve" };
  }

  /* Глава 6 «Пятница, паб»: быстрая речь — тугой зигзаг, единственный на карте, намеренно. */
  function zigzag() {
    const pts = [];
    for (let i = 0; i < 7; i += 1) pts.push({ x: i % 2 === 0 ? 132 : 258, y: 72 + i * 52 });
    pts.push({ x: CX, y: 470 });
    return { pts, h: 560, style: "line" };
  }

  /* Глава 7 «Звонок домой»: спираль наружу — неделя собирается в одно, врата внизу. */
  function spiral() {
    const cy = 272;
    const pts = [];
    for (let i = 0; i < 7; i += 1) {
      const r = 76 + i * 14;
      const deg = 90 - (6 - i) * 51.4;
      pts.push(polar(CX, cy, r, deg));
    }
    pts.push({ x: CX, y: 560 });
    return { pts, h: 660, style: "curve", gate: true };
  }

  const SHAPES = { stairs, ring, rows, rain, track, zigzag, spiral };

  /* Гладкая кривая Катмулла–Рома через точки → кубические Безье. */
  function curvePath(pts) {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`;
    }
    return d;
  }

  /* Ломаная со скруглёнными углами (лестница). */
  function stepsPath(pts, radius) {
    const r = radius || 26;
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i += 1) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const v1 = { x: a.x - b.x, y: a.y - b.y };
      const v2 = { x: c.x - b.x, y: c.y - b.y };
      const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const p1 = { x: b.x + (v1.x / l1) * rr, y: b.y + (v1.y / l1) * rr };
      const p2 = { x: b.x + (v2.x / l2) * rr, y: b.y + (v2.y / l2) * rr };
      d += ` L${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q${b.x} ${b.y} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last.x} ${last.y}`;
    return d;
  }

  function linePath(pts) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  }

  /* Кольцо: дуги по окружности между 7 точками, затем мягкий заход в центр. */
  function ringPath(pts, ring) {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < 7; i += 1) d += ` A${ring.r} ${ring.r} 0 0 1 ${pts[i].x} ${pts[i].y}`;
    const last = pts[6], c = pts[7];
    d += ` Q${(last.x + c.x) / 2 - 30} ${(last.y + c.y) / 2 - 40} ${c.x} ${c.y}`;
    return d;
  }

  function routeFor(shapeName) {
    const r = SHAPES[shapeName]();
    let d;
    if (r.style === "steps") d = stepsPath(r.pts);
    else if (r.style === "line") d = linePath(r.pts);
    else if (r.style === "ring") d = ringPath(r.pts, r.ring);
    else d = curvePath(r.pts);
    return Object.assign(r, { d, w: W });
  }

  /* Длина пути до каждой точки (для света прогресса) — по готовому <path>. */
  function lengthsAtPoints(pathEl, pts) {
    const total = pathEl.getTotalLength();
    const step = 3;
    const samples = [];
    for (let l = 0; l <= total; l += step) {
      const p = pathEl.getPointAtLength(l);
      samples.push({ l, x: p.x, y: p.y });
    }
    return pts.map((pt) => {
      let best = samples[0], bd = Infinity;
      for (const s of samples) {
        const dd = (s.x - pt.x) ** 2 + (s.y - pt.y) ** 2;
        if (dd < bd) { bd = dd; best = s; }
      }
      return best.l;
    });
  }

  window.ROUTES = { routeFor, lengthsAtPoints, W };
})();
