/* ============================================================
   MapKit · движок сплошной карты Learning V2.

   Требование владельца: «ничего не должно лагать!!!!!»
   Карта — 32 урока × 56 сессий = 1792 узла. Наивная отрисовка кладёт в DOM
   1792 кнопки + 1792 подписи + 224 заголовка глав, это гарантированный лаг
   и на вебе, и на телефоне.

   Три закона движка:

   1) ГЕОМЕТРИЯ — ЧИСЛА, НЕ DOM.
      Позиция любого узла считается из его индекса чистой функцией. Полная
      высота полотна известна до первой отрисовки, поэтому скроллбар честный
      с первого кадра и контент не «дорастает» при прокрутке.

   2) ОКНО + ПУЛ.
      В DOM живут только элементы видимого диапазона плюс небольшой запас.
      Элементы берутся из пула и переиспользуются: при скролле меняются
      координаты и текст, узлы не создаются и не удаляются.

   3) КАДР БЕЗ LAYOUT.
      Обработчик scroll только запоминает позицию и просит rAF. Внутри кадра —
      только transform/opacity и текст. Никаких offsetTop/getBoundingClientRect:
      это принудительный reflow и главный источник рывков в длинных списках.
   ============================================================ */
(function (global) {
  "use strict";

  // ---------- Топология курса (modules/learning-v2/content/course_topology_v1.ts) ----------
  var LESSONS = 32;
  var SESSIONS_PER_LESSON = 56;
  var SESSIONS_PER_CHAPTER = 8;
  var CHAPTERS_PER_LESSON = SESSIONS_PER_LESSON / SESSIONS_PER_CHAPTER; // 7

  // ---------- Метрика вертикали ----------
  var M = {
    plate: 380,      // плашка урока «на пол-экрана» (экран 844)
    chHead: 78,      // заголовок главы
    // Подпись переехала ВБОК (владелец 20.09), поэтому вертикаль больше не
    // тратится на текст — шаг определяет только сам кружок плюс воздух.
    // 96px: самый крупный узел 72 + 24 воздуха. Пути на экране стало больше.
    step: 96,        // шаг между узлами: круг + воздух (текст сбоку)
    chPad: 26,       // воздух после последнего узла главы
    railW: 390,      // ширина полотна (макет телефона)
    // Размах уменьшен с 96: подпись теперь сбоку и ей нужно поле 150px.
    // При 62px кружок гуляет в пределах 133..257, и с любой стороны
    // остаётся не меньше 121px до края — подпись помещается целиком.
    amp: 62          // размах змейки влево-вправо
  };
  // Высота блока одной главы и одного урока — константы, а не измерения.
  var CH_H = M.chHead + SESSIONS_PER_CHAPTER * M.step + M.chPad;
  var LESSON_H = M.plate + CHAPTERS_PER_LESSON * CH_H;
  var TOTAL_H = LESSONS * LESSON_H;

  // ---------- Геометрия узла: чистая функция от индекса ----------
  // globalIndex 0..1791 → { lesson, session, chapter, posInCh, x, y }
  function nodeAt(gi) {
    var lesson = (gi / SESSIONS_PER_LESSON) | 0;              // 0..31
    var session = gi - lesson * SESSIONS_PER_LESSON;          // 0..55
    var chapter = (session / SESSIONS_PER_CHAPTER) | 0;       // 0..6
    var posInCh = session - chapter * SESSIONS_PER_CHAPTER;   // 0..7
    var y =
      lesson * LESSON_H +
      M.plate +
      chapter * CH_H +
      M.chHead +
      posInCh * M.step +
      M.step / 2;
    // Змейка: синус по позиции в главе. Чистая арифметика, без таблиц.
    var t = (session % SESSIONS_PER_CHAPTER) / SESSIONS_PER_CHAPTER;
    var x = M.railW / 2 + Math.sin(t * Math.PI * 2 + chapter * 0.7) * M.amp;
    return {
      lesson: lesson, session: session, chapter: chapter,
      posInCh: posInCh, x: x, y: y
    };
  }

  function chapterTop(lesson, chapter) {
    return lesson * LESSON_H + M.plate + chapter * CH_H;
  }
  function lessonTop(lesson) { return lesson * LESSON_H; }

  // ---------- Пул элементов ----------
  // Ключ → живой DOM-элемент. Всё, что не попало в кадр, уходит в свободный
  // список и переиспользуется. Размер пула = видимое окно, а не длина курса.
  function Pool(container, make) {
    this.container = container;
    this.make = make;
    this.live = new Map();
    this.free = [];
    this.peak = 0;
  }
  Pool.prototype.begin = function () { this.seen = new Set(); };
  Pool.prototype.use = function (key) {
    this.seen.add(key);
    var el = this.live.get(key);
    if (el) return { el: el, fresh: false };
    el = this.free.pop();
    if (!el) { el = this.make(); this.container.appendChild(el); }
    el.style.display = "";
    this.live.set(key, el);
    return { el: el, fresh: true };
  };
  Pool.prototype.end = function () {
    var self = this;
    this.live.forEach(function (el, key) {
      if (!self.seen.has(key)) {
        el.style.display = "none";
        self.free.push(el);
        self.live.delete(key);
      }
    });
    if (this.live.size > this.peak) this.peak = this.live.size;
  };

  // ---------- Иконки (SVG, без эмодзи и растра — закон владельца) ----------
  var ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 15 9.4l6.5.9-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5L2.5 10.3l6.5-.9z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
  };

  // ---------- Карта ----------
  function MapKit(root, data, opts) {
    opts = opts || {};
    this.root = root;
    this.data = data;
    this.scroll = root.querySelector(".map-scroll");
    this.canvas = root.querySelector(".map-canvas");
    this.win = root.querySelector(".map-window");
    this.overscan = opts.overscan != null ? opts.overscan : 260;

    // Прогресс: сколько узлов пройдено подряд. Одно число вместо списка id —
    // в макете этого достаточно и считается мгновенно.
    this.done = opts.done != null ? opts.done : 0;

    // Индекс имён сессий: "l:s" → имя. Есть только у написанных уроков.
    this.names = Object.create(null);
    for (var i = 0; i < data.sessions.length; i++) {
      var s = data.sessions[i];
      this.names[s.l + ":" + s.s] = s.moment;
    }
    this.chapters = Object.create(null);
    for (var j = 0; j < data.chapters.length; j++) {
      var c = data.chapters[j];
      this.chapters[c.l + ":" + c.ch] = c;
    }

    this.canvas.style.height = TOTAL_H + "px";

    var self = this;
    this.nodes = new Pool(this.win, function () { return self._makeNode(); });
    this.heads = new Pool(this.win, function () { return self._makeHead(); });
    this.plates = new Pool(this.win, function () { return self._makePlate(); });
    this.grounds = new Pool(this.win, function () { return self._makeGround(); });
    this.rails = new Pool(this.win, function () { return self._makeRail(); });

    this.ticking = false;
    this.lastTop = -1;
    this.onScroll = function () { self._request(); };
    this.scroll.addEventListener("scroll", this.onScroll, { passive: true });

    this.render();
  }

  MapKit.prototype._request = function () {
    if (this.ticking) return;
    this.ticking = true;
    var self = this;
    requestAnimationFrame(function () {
      self.ticking = false;
      self.render();
    });
  };

  // ---------- Фабрики элементов пула ----------
  MapKit.prototype._makeNode = function () {
    var b = document.createElement("button");
    b.className = "node";
    b.innerHTML =
      '<span class="ground"></span><span class="halo"></span>' +
      '<span class="gem"></span><span class="nm"></span>';
    return b;
  };
  MapKit.prototype._makeHead = function () {
    var d = document.createElement("div");
    d.className = "ch-head";
    d.innerHTML =
      '<div class="t"><div class="ch-num"></div><div class="ch-title"></div></div>' +
      '<div class="ch-status"></div>';
    return d;
  };
  MapKit.prototype._makePlate = function () {
    var d = document.createElement("div");
    d.className = "lesson-plate";
    d.innerHTML =
      '<span class="aura"></span><span class="rule top"></span><span class="rule bot"></span>' +
      '<div class="kicker"></div><div class="lp-title"></div>' +
      '<div class="lp-arc"></div>' +
      '<div class="lp-meta"><span class="pip"></span><span class="mtxt"></span></div>';
    return d;
  };
  MapKit.prototype._makeGround = function () {
    var d = document.createElement("div");
    d.className = "district";
    return d;
  };
  MapKit.prototype._makeRail = function () {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "street-svg");
    s.innerHTML = '<path class="street"></path><path class="lit"></path>';
    return s;
  };

  // ---------- Состояние узла ----------
  MapKit.prototype._state = function (gi) {
    if (gi < this.done) return "done";
    if (gi === this.done) return "current";
    if (gi === this.done + 1) return "next";
    return "locked";
  };

  // ---------- Главная отрисовка ----------
  MapKit.prototype.render = function () {
    var top = this.scroll.scrollTop;
    var h = this.scroll.clientHeight || 700;
    var from = top - this.overscan;
    var to = top + h + this.overscan;

    // Какие уроки попали в окно — арифметикой, без обхода всех 32.
    var l0 = Math.max(0, Math.floor(from / LESSON_H));
    var l1 = Math.min(LESSONS - 1, Math.floor(to / LESSON_H));

    this.nodes.begin(); this.heads.begin(); this.plates.begin();
    this.grounds.begin(); this.rails.begin();

    for (var L = l0; L <= l1; L++) {
      this._renderPlate(L, from, to);
      var cFrom = Math.max(0, Math.floor((from - lessonTop(L) - M.plate) / CH_H));
      var cTo = Math.min(CHAPTERS_PER_LESSON - 1, Math.floor((to - lessonTop(L) - M.plate) / CH_H));
      for (var C = cFrom; C <= cTo; C++) {
        if (C < 0) continue;
        this._renderChapter(L, C, from, to);
      }
    }

    this.nodes.end(); this.heads.end(); this.plates.end();
    this.grounds.end(); this.rails.end();

    this._syncHeader(top, h);
    this.lastTop = top;
    if (this.onFrame) this.onFrame(this.stats());
  };

  MapKit.prototype._renderPlate = function (L, from, to) {
    var y = lessonTop(L);
    if (y + M.plate < from || y > to) return;
    var got = this.plates.use("p" + L);
    var el = got.el;
    var arc = this.data.arcs[String(L + 1)] || { sys: "", arc: "" };
    var lessonDone = this.done >= (L + 1) * SESSIONS_PER_LESSON;
    var lessonOpen = this.done >= L * SESSIONS_PER_LESSON;
    var written = this.data.written[String(L + 1)] || 0;

    el.style.height = M.plate + "px";
    el.style.transform = "translate3d(0," + y + "px,0)";
    el.setAttribute("data-ch", String((L % 7) + 1));
    el.className = "lesson-plate" + (lessonOpen ? "" : " locked");
    el.querySelector(".kicker").textContent = "УРОК " + (L + 1);
    el.querySelector(".lp-title").textContent = arc.sys;
    el.querySelector(".lp-arc").textContent = arc.arc;

    var doneInLesson = Math.max(0, Math.min(SESSIONS_PER_LESSON, this.done - L * SESSIONS_PER_LESSON));
    var meta;
    if (lessonDone) meta = "Урок пройден · 56 из 56";
    else if (lessonOpen) meta = doneInLesson + " из 56 занятий";
    else if (written > 0) meta = "56 занятий · 7 глав";
    else meta = "Пишется";
    el.querySelector(".mtxt").textContent = meta;
  };

  MapKit.prototype._renderChapter = function (L, C, from, to) {
    var top = chapterTop(L, C);
    if (top + CH_H < from || top > to) return;

    var key = L + "_" + C;
    var chLight = String((C % 7) + 1);
    var firstGi = L * SESSIONS_PER_LESSON + C * SESSIONS_PER_CHAPTER;
    var chOpen = this.done >= firstGi;
    var chDone = this.done >= firstGi + SESSIONS_PER_CHAPTER;

    // Подложка района
    var g = this.grounds.use("g" + key).el;
    g.style.height = CH_H + "px";
    g.style.transform = "translate3d(0," + top + "px,0)";
    g.setAttribute("data-ch", chLight);
    g.className = "district" + (chOpen ? "" : " locked");

    // Заголовок главы
    var hd = this.heads.use("h" + key).el;
    hd.style.height = M.chHead + "px";
    hd.style.transform = "translate3d(0," + top + "px,0)";
    hd.setAttribute("data-ch", chLight);
    hd.className = "ch-head" + (chOpen ? "" : " locked");
    // У ненаписанных уроков сцены главы нет. Тогда «ГЛАВА 6 / Глава 6» — это
    // одно и то же слово дважды; вместо повтора показываем диапазон занятий,
    // который в этой главе лежит. Ничего не выдумываем.
    var meta = this.chapters[(L + 1) + ":" + (C + 1)];
    hd.querySelector(".ch-num").textContent = "ГЛАВА " + (C + 1);
    hd.querySelector(".ch-title").textContent = meta
      ? meta.scene
      : "Занятия " + (C * SESSIONS_PER_CHAPTER + 1) + "–" + ((C + 1) * SESSIONS_PER_CHAPTER);
    var st = hd.querySelector(".ch-status");
    var doneInCh = Math.max(0, Math.min(SESSIONS_PER_CHAPTER, this.done - firstGi));
    st.className = "ch-status" + (chDone ? " done" : chOpen ? "" : " locked");
    st.innerHTML = chDone
      ? '<span class="mark">' + ICON.check + "</span>"
      : chOpen
        ? doneInCh + "/8"
        : '<span class="mark">' + ICON.lock + "</span>";

    // Улица главы: путь строится по тем же числам, что и узлы.
    this._renderRail(key, L, C, top, chLight, chOpen);

    // Узлы главы
    for (var p = 0; p < SESSIONS_PER_CHAPTER; p++) {
      var gi = firstGi + p;
      this._renderNode(gi, chLight);
    }
  };

  MapKit.prototype._renderRail = function (key, L, C, top, chLight, chOpen) {
    var s = this.rails.use("r" + key).el;
    s.setAttribute("width", M.railW);
    s.setAttribute("height", CH_H);
    s.style.transform = "translate3d(0," + top + "px,0)";
    s.setAttribute("data-ch", chLight);

    var d = "";
    var litLen = 0;
    var firstGi = L * SESSIONS_PER_LESSON + C * SESSIONS_PER_CHAPTER;
    for (var p = 0; p < SESSIONS_PER_CHAPTER; p++) {
      var n = nodeAt(firstGi + p);
      var lx = n.x, ly = n.y - top;
      d += (p === 0 ? "M" : "L") + lx.toFixed(1) + " " + ly.toFixed(1);
      if (firstGi + p <= this.done) litLen = p;
    }
    s.querySelector(".street").setAttribute("d", d);

    // Зажжённая часть: до текущего узла.
    var lit = "";
    for (var q = 0; q <= litLen; q++) {
      var m = nodeAt(firstGi + q);
      lit += (q === 0 ? "M" : "L") + m.x.toFixed(1) + " " + (m.y - top).toFixed(1);
    }
    var litEl = s.querySelector(".lit");
    litEl.setAttribute("d", chOpen && litLen >= 0 ? lit : "");
    litEl.style.display = chOpen ? "" : "none";
  };

  MapKit.prototype._renderNode = function (gi, chLight) {
    var n = nodeAt(gi);
    var got = this.nodes.use("n" + gi);
    var el = got.el;
    var state = this._state(gi);
    var isCheckpoint = n.posInCh === SESSIONS_PER_CHAPTER - 1;
    var size = state === "current" ? 72 : isCheckpoint ? 64 : state === "next" ? 62 : 58;

    // Сторона подписи: кружок в левой половине — текст справа от него,
    // в правой — слева. Так подпись всегда уходит к центру экрана и не
    // упирается в край (владелец 20.09).
    var side = n.x < M.railW / 2 ? " side-right" : " side-left";
    el.className = "node " + state + (isCheckpoint ? " checkpoint" : "") + side;
    el.setAttribute("data-ch", chLight);
    el.style.transform =
      "translate3d(" + (n.x - size / 2).toFixed(1) + "px," + (n.y - size / 2).toFixed(1) + "px,0)";

    var gem = el.querySelector(".gem");
    if (state === "done") gem.innerHTML = isCheckpoint ? ICON.star : ICON.check;
    else if (state === "locked") gem.innerHTML = ICON.lock;
    else gem.textContent = String(n.session + 1);

    // Имя есть только у написанных уроков. Остальное — номер, без выдумок.
    var nm = el.querySelector(".nm");
    var name = this.names[(n.lesson + 1) + ":" + (n.session + 1)];
    if (isCheckpoint) {
      nm.textContent = "Проверка главы";
      nm.className = "nm";
    } else if (name) {
      nm.textContent = name;
      nm.className = "nm";
    } else {
      nm.textContent = "Занятие " + (n.session + 1);
      nm.className = "nm ordinal";
    }
    el.setAttribute(
      "aria-label",
      "Урок " + (n.lesson + 1) + ", занятие " + (n.session + 1) + ", " + nm.textContent +
      ", " + (state === "locked" ? "закрыто" : "доступно")
    );
  };

  // ---------- Шапка следует за скроллом ----------
  MapKit.prototype._syncHeader = function (top, h) {
    var mid = top + h * 0.35;
    var L = Math.min(LESSONS - 1, Math.max(0, Math.floor(mid / LESSON_H)));
    var inL = mid - lessonTop(L) - M.plate;
    var C = Math.min(CHAPTERS_PER_LESSON - 1, Math.max(0, Math.floor(inL / CH_H)));
    if (this._hdrL === L && this._hdrC === C) return; // ничего не трогаем зря
    this._hdrL = L; this._hdrC = C;
    if (this.onSection) this.onSection(L, C);
  };

  // ---------- Навигация ----------
  // Плавный скролл браузер выполняет только на разумную дистанцию: замер на
  // этой карте показал, что прыжок на 29 000px с behavior:"smooth" НЕ доезжает
  // вообще (scrollTop остаётся прежним) — тап по уроку выглядел бы как «кнопка
  // не работает». Поэтому далеко прыгаем мгновенно, плавно — только рядом.
  var SMOOTH_LIMIT = 4000;
  MapKit.prototype._goTo = function (top, smooth) {
    top = Math.max(0, Math.min(top, TOTAL_H - (this.scroll.clientHeight || 700)));
    var far = Math.abs(top - this.scroll.scrollTop) > SMOOTH_LIMIT;
    this.scroll.scrollTo({ top: top, behavior: smooth && !far ? "smooth" : "auto" });
    // Мгновенный прыжок не рождает событие scroll в ряде движков — рисуем сами,
    // иначе карта осталась бы показывать прежнее место.
    this.render();
  };
  MapKit.prototype.scrollToLesson = function (L, smooth) {
    this._goTo(lessonTop(L), smooth);
  };
  MapKit.prototype.scrollToCurrent = function (smooth) {
    var n = nodeAt(Math.min(this.done, LESSONS * SESSIONS_PER_LESSON - 1));
    var h = this.scroll.clientHeight || 700;
    this._goTo(n.y - h * 0.45, smooth);
  };
  MapKit.prototype.currentIsVisible = function () {
    var n = nodeAt(Math.min(this.done, LESSONS * SESSIONS_PER_LESSON - 1));
    var top = this.scroll.scrollTop;
    var h = this.scroll.clientHeight || 700;
    return n.y > top + 40 && n.y < top + h - 40;
  };

  MapKit.prototype.stats = function () {
    return {
      totalNodes: LESSONS * SESSIONS_PER_LESSON,
      liveNodes: this.nodes.live.size,
      liveHeads: this.heads.live.size,
      livePlates: this.plates.live.size,
      poolPeak: this.nodes.peak,
      canvasHeight: TOTAL_H
    };
  };

  MapKit.prototype.destroy = function () {
    this.scroll.removeEventListener("scroll", this.onScroll);
  };

  global.MapKit = MapKit;
  global.MapKitGeom = {
    LESSONS: LESSONS,
    SESSIONS_PER_LESSON: SESSIONS_PER_LESSON,
    SESSIONS_PER_CHAPTER: SESSIONS_PER_CHAPTER,
    CHAPTERS_PER_LESSON: CHAPTERS_PER_LESSON,
    M: M, CH_H: CH_H, LESSON_H: LESSON_H, TOTAL_H: TOTAL_H,
    nodeAt: nodeAt, lessonTop: lessonTop, chapterTop: chapterTop
  };
  global.MapKitIcons = ICON;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { MapKitGeom: global.MapKitGeom };
  }
})(typeof window !== "undefined" ? window : globalThis);
