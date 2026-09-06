/* ============================================================
   MapKit — сборка и жизнь карты урока (общее для макетов 03–07).
   const kit = MapKit.mount({ phone, canvas, scroll, hdr, jump, toast,
                              backdrop, nodeSheet, runeChip, runeCount,
                              countEl, spectrumEl, onTap })
   kit.build() · kit.apply(model, {instant}) · kit.makeModel(doneUpTo)
   kit.base(model, {noEnter, top}) · kit.returnComplete(token) ·
   kit.chapterUnlock(token) · kit.flyRunes(el, n) · kit.deny(el, text) ·
   kit.openNodeSheet(n) · kit.closeSheet() · kit.scrollToCurrent()
   Любые таймеры хореографий регистрируются через kit.later(fn, ms) и
   отменяются при смене состояния (kit.base) — иначе поздняя шторка
   всплывала поверх следующего состояния.
   ============================================================ */
(function () {
  const { CHAPTERS, SESSIONS, TYPE_LABEL } = window.COURSE;
  const { routeFor, lengthsAtPoints } = window.ROUTES;

  const tf = () => Number(getComputedStyle(document.documentElement).getPropertyValue("--tf")) || 1;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms * tf()));
  const reduced = () => document.documentElement.getAttribute("data-reduced") === "1";

  function plural(n, a, b, c) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
    return c;
  }

  function ringSVG() {
    const r = 44, c = 48, segs = 7, gap = 10;
    const circ = 2 * Math.PI * r;
    const segLen = circ / segs - gap;
    let paths = "";
    for (let i = 0; i < segs; i += 1) {
      const off = -(i * circ) / segs - gap / 2;
      paths += `<circle class="seg" data-i="${i}" cx="${c}" cy="${c}" r="${r}" stroke-dasharray="${segLen} ${circ - segLen}" stroke-dashoffset="${off}" transform="rotate(-90 ${c} ${c})"/>`;
    }
    return `<svg class="ring" viewBox="0 0 96 96"><circle class="track" cx="${c}" cy="${c}" r="${r}"/>${paths}</svg>`;
  }

  function makeModel(doneUpTo, extra) {
    const done = new Set();
    const stars = new Map();
    for (let n = 1; n <= doneUpTo; n += 1) { done.add(n); stars.set(n, [3, 2, 3, 3, 1, 3, 2][n % 7]); }
    const m = { done, stars, current: doneUpTo >= 56 ? null : doneUpTo + 1 };
    return Object.assign(m, extra || {});
  }

  function mount(cfg) {
    const phone = cfg.phone;
    const canvas = cfg.canvas;
    const scroll = cfg.scroll;
    const refs = { chapters: [], nodes: new Map(), seals: new Map(), gate: null, spectrum: [] };
    let model = null;
    let runToken = 0;
    const timers = [];
    let toastTimer = null;

    function later(fn, ms) { const t = setTimeout(fn, ms * tf()); timers.push(t); return t; }
    function cancelAll() { timers.splice(0).forEach(clearTimeout); }

    function build() {
      canvas.innerHTML = "";
      refs.chapters = []; refs.nodes.clear(); refs.seals.clear();
      let gi = 0;
      CHAPTERS.forEach((chapter) => {
        const route = routeFor(chapter.shape);
        const sec = document.createElement("section");
        sec.className = "ch";
        sec.setAttribute("data-ch", String(chapter.n));
        sec.innerHTML = `
          <div class="ch-ground"></div>
          <div class="ch-glow" style="left:${route.pts[0].x - 130}px;top:${route.pts[0].y + 40}px"></div>
          <header class="ch-head" style="--i:${gi}">
            <div class="t"><div class="ch-num">Глава ${chapter.n}</div><h2 class="ch-title">${chapter.title}</h2><div class="ch-scene">${chapter.scene}</div></div>
            <div class="ch-status"></div>
          </header>
          <div class="board" style="height:${route.h}px">
            <svg class="route" width="390" height="${route.h}" viewBox="0 0 390 ${route.h}" aria-hidden="true">
              <path class="street" d="${route.d}"/>
              <path class="glow" d="${route.d}"/>
              <path class="lit" d="${route.d}"/>
            </svg>
            <div class="spark" style="offset-path: path('${route.d}')"></div>
            <div class="fog"><div class="sweep"></div></div>
          </div>`;
        gi += 1;
        const board = sec.querySelector(".board");
        const sessions = SESSIONS.filter((s) => s.ch === chapter.n);
        sessions.forEach((s, i) => {
          const p = route.pts[i];
          const elm = document.createElement("button");
          if (s.role === "final_exam") {
            elm.className = "gate";
            elm.innerHTML = `<div class="light"></div><div class="arch"><div class="inner"><span class="rune">ᛞ</span></div></div><span class="label">Экзамен</span>`;
            refs.gate = elm;
          } else if (s.role === "chapter_checkpoint") {
            elm.className = "seal";
            elm.innerHTML = `<span class="ground"></span><span class="flash"></span>${ringSVG()}<span class="face"><span class="rune">ᛝ</span></span><span class="label">Проверка</span>`;
            refs.seals.set(s.n, elm);
          } else {
            elm.className = "node";
            elm.innerHTML = `<span class="ground"></span><span class="halo"></span><span class="gem"></span><span class="stars"></span><span class="pill">Продолжить</span>`;
            refs.nodes.set(s.n, elm);
          }
          elm.style.setProperty("--x", p.x + "px");
          elm.style.setProperty("--y", p.y + "px");
          elm.style.setProperty("--i", String(gi));
          elm.setAttribute("data-n", String(s.n));
          elm.setAttribute("aria-label", `Занятие ${s.n}. ${s.grammar}`);
          elm.addEventListener("click", () => (cfg.onTap ? cfg.onTap(s.n, kit) : defaultTap(s.n)));
          board.appendChild(elm);
          gi += 1;
        });
        canvas.appendChild(sec);
        const pathEl = sec.querySelector(".lit");
        const total = pathEl.getTotalLength();
        const lens = lengthsAtPoints(pathEl, route.pts);
        sec.querySelectorAll(".glow, .lit").forEach((p) => { p.style.strokeDasharray = String(total); p.style.strokeDashoffset = String(total); });
        refs.chapters.push({ sec, route, total, lens, chapter, pathEl, sessions });
      });
      if (cfg.spectrumEl) {
        cfg.spectrumEl.innerHTML = "";
        refs.spectrum = CHAPTERS.map((c) => { const s = document.createElement("span"); s.setAttribute("data-ch", String(c.n)); cfg.spectrumEl.appendChild(s); return s; });
      }
    }

    function nodeState(n) {
      if (model.done.has(n)) return "done";
      if (model.current === n) return "current";
      if (model.current !== null && n === model.current + 1) return "next";
      return "locked";
    }

    function apply(m, opts) {
      model = m;
      const o = opts || {};
      refs.chapters.forEach((c) => {
        const sealN = c.sessions[7].n;
        const sealPassed = m.done.has(sealN);
        const chOpen = c.sessions.some((s) => m.done.has(s.n) || m.current === s.n);
        c.sec.classList.toggle("locked", !chOpen);
        c.sec.classList.toggle("done", sealPassed);
        const status = c.sec.querySelector(".ch-status");
        const doneCount = c.sessions.slice(0, 7).filter((s) => m.done.has(s.n)).length;
        status.innerHTML = sealPassed ? `<svg><use href="#i-check"/></svg>` : chOpen ? `${doneCount}/7` : `<svg><use href="#i-lock"/></svg>`;
        let litIdx = -1;
        c.sessions.forEach((s, i) => { if (m.done.has(s.n) || m.current === s.n) litIdx = i; });
        const lit = litIdx < 0 ? 0 : c.lens[litIdx];
        c.sec.querySelectorAll(".glow, .lit").forEach((p) => {
          if (o.instant) p.style.transition = "none";
          p.style.strokeDashoffset = String(c.total - lit);
          if (o.instant) { void p.getBoundingClientRect(); p.style.transition = ""; }
        });
        if (refs.spectrum.length) {
          const chCount = c.sessions.filter((s) => m.done.has(s.n)).length;
          refs.spectrum[c.chapter.n - 1].style.setProperty("--p", String(chCount / 8));
        }
        c.sessions.forEach((s) => {
          if (s.role === "final_exam") {
            const g = refs.gate;
            g.classList.remove("locked", "available", "passed");
            g.classList.add(m.done.has(s.n) ? "passed" : m.current === s.n ? "available" : "locked");
            g.querySelector(".label").textContent = m.done.has(s.n) ? "Сдан" : "Экзамен";
          } else if (s.role === "chapter_checkpoint") {
            const el = refs.seals.get(s.n);
            el.classList.remove("locked", "available", "passed");
            el.classList.add(m.done.has(s.n) ? "passed" : m.current === s.n ? "available" : "locked");
            el.querySelectorAll(".seg").forEach((sg, i) => sg.classList.toggle("on", i < doneCount));
            el.querySelector(".label").textContent = m.done.has(s.n) ? "Глава закрыта" : "Проверка";
          } else {
            const el = refs.nodes.get(s.n);
            const st = nodeState(s.n);
            el.classList.remove("done", "current", "next", "locked");
            el.classList.add(st);
            const gem = el.querySelector(".gem");
            gem.innerHTML = st === "locked" ? `<svg><use href="#i-lock"/></svg>` : st === "done" ? `<svg><use href="#i-check"/></svg>` : String(s.pos);
            el.querySelector(".stars").innerHTML = st === "done" ? window.starsHTML(m.stars.get(s.n) ?? 3) : "";
            el.querySelector(".pill").textContent = m.done.size === 0 ? "Начать" : "Продолжить";
          }
        });
      });
      if (cfg.countEl) cfg.countEl.textContent = `${m.done.size} из 56`;
      const curCh = m.current ? Math.ceil(m.current / 8) : 7;
      if (cfg.hdr) cfg.hdr.setAttribute("data-ch", String(curCh));
      if (cfg.jump) {
        cfg.jump.setAttribute("data-ch", String(curCh));
        const lbl = cfg.jump.querySelector("[data-jump-label]");
        if (lbl) lbl.textContent = !m.current ? "Урок пройден" : m.done.size === 0 ? "Начать" : "Продолжить";
      }
    }

    function currentEl() { if (!model || !model.current) return null; return refs.nodes.get(model.current) || refs.seals.get(model.current) || refs.gate; }
    function elTop(el) { return el.offsetTop + el.parentElement.offsetTop + el.parentElement.parentElement.offsetTop; }
    function scrollToCurrent(behavior) {
      const el = currentEl(); if (!el) return;
      scroll.scrollTo({ top: Math.max(0, elTop(el) - 300), behavior: behavior || "smooth" });
    }
    function scrollToNode(n, offset, behavior) {
      const el = refs.nodes.get(n) || refs.seals.get(n) || refs.gate;
      scroll.scrollTo({ top: Math.max(0, elTop(el) - (offset == null ? 300 : offset)), behavior: behavior || "auto" });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === currentEl() && cfg.jump) cfg.jump.classList.toggle("is-on", !e.isIntersecting && phone.getAttribute("data-state") !== "skeleton");
      });
    }, { root: scroll, threshold: 0.3 });
    function watchCurrent() { io.disconnect(); const el = currentEl(); if (el) io.observe(el); else if (cfg.jump) cfg.jump.classList.remove("is-on"); }
    if (cfg.jump) cfg.jump.addEventListener("click", () => scrollToCurrent("smooth"));

    const chIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.35 && cfg.hdr) cfg.hdr.querySelector(".h-label").setAttribute("data-ch", e.target.getAttribute("data-ch")); });
    }, { root: scroll, threshold: [0.35, 0.6] });

    function showToast(text, icon) {
      if (!cfg.toast) return;
      cfg.toast.querySelector("[data-toast-text]").textContent = text;
      const use = cfg.toast.querySelector("use"); if (use) use.setAttribute("href", icon || "#i-lock");
      cfg.toast.classList.add("is-on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => cfg.toast.classList.remove("is-on"), 1800 * tf());
    }
    function deny(el, text) { el.classList.remove("is-denied"); void el.offsetWidth; el.classList.add("is-denied"); showToast(text); }

    function defaultTap(n) {
      const s = SESSIONS[n - 1];
      const el = refs.nodes.get(n) || refs.seals.get(n) || refs.gate;
      if (model.done.has(n)) { openNodeSheet(n); return; }
      if (model.current === n) { showToast(s.role === "chapter_checkpoint" ? "Открывается печать главы (макет 05)" : s.role === "final_exam" ? "Открываются врата экзамена (макет 05)" : "Открывается билет занятия (макет 04)", "#i-play"); return; }
      if (s.role === "chapter_checkpoint") {
        const left = 7 - SESSIONS.filter((x) => x.ch === s.ch && x.pos < 8 && model.done.has(x.n)).length;
        deny(el, `Осталось ${left} ${plural(left, "занятие", "занятия", "занятий")}`);
        return;
      }
      if (s.role === "final_exam") { deny(el, "Сначала печать главы 7"); return; }
      const chOpen = SESSIONS.some((x) => x.ch === s.ch && (model.done.has(x.n) || model.current === x.n));
      deny(el, chOpen ? `Сначала занятие ${model.current}` : `Сначала проверка главы ${s.ch - 1}`);
    }

    function openNodeSheet(n) {
      if (!cfg.nodeSheet) return;
      const s = SESSIONS[n - 1];
      const sh = cfg.nodeSheet;
      sh.setAttribute("data-ch", String(s.ch));
      sh.querySelector("[data-ns-gem]").textContent = s.pos;
      sh.querySelector("[data-ns-title]").textContent = s.grammar;
      sh.querySelector("[data-ns-kind]").textContent = `${TYPE_LABEL[s.type]} · ${s.moment}`;
      sh.querySelector("[data-ns-stars]").innerHTML = window.starsHTML(model.stars.get(n) ?? 3, 22);
      if (cfg.backdrop) cfg.backdrop.classList.add("is-on");
      sh.classList.add("is-on");
      const key = sh.querySelector(".btn-key"); if (key) { key.classList.remove("sweep"); void key.offsetWidth; key.classList.add("sweep"); }
    }
    function closeSheet() { if (cfg.backdrop) cfg.backdrop.classList.remove("is-on"); if (cfg.nodeSheet) cfg.nodeSheet.classList.remove("is-on"); }
    if (cfg.backdrop) cfg.backdrop.addEventListener("click", closeSheet);
    if (cfg.nodeSheet) { const c = cfg.nodeSheet.querySelector("[data-ns-close]"); if (c) c.addEventListener("click", closeSheet); }

    function enter() {
      phone.classList.remove("is-entering"); void phone.offsetWidth; phone.classList.add("is-entering");
      later(() => phone.classList.remove("is-entering"), 2600);
    }

    async function flyRunes(fromEl, count) {
      const chip = cfg.runeChip; const counter = cfg.runeCount;
      if (!chip) { await wait(200); return; }
      const pr = phone.getBoundingClientRect();
      const a = fromEl.getBoundingClientRect();
      const b = chip.getBoundingClientRect();
      const sx = a.left + a.width / 2 - pr.left, sy = a.top + a.height / 2 - pr.top;
      const ex = b.left + b.width / 2 - pr.left, ey = b.top + b.height / 2 - pr.top;
      const glyphs = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ"];
      const start = counter ? Number(counter.textContent) : 0;
      for (let i = 0; i < count; i += 1) {
        const f = document.createElement("span");
        f.className = "flyer"; f.textContent = glyphs[(i + Math.floor(Math.random() * 7)) % 7];
        phone.appendChild(f);
        const mx = sx + (ex - sx) * 0.5 + (i - count / 2) * 26, my = sy + (ey - sy) * 0.42 - 60;
        const anim = f.animate([
          { transform: `translate(${sx - 11}px, ${sy - 11}px) scale(.6) rotate(0deg)`, opacity: 0 },
          { transform: `translate(${mx - 11}px, ${my - 11}px) scale(1.15) rotate(${120 + i * 40}deg)`, opacity: 1, offset: .45 },
          { transform: `translate(${ex - 11}px, ${ey - 11}px) scale(.5) rotate(${300 + i * 40}deg)`, opacity: .9 },
        ], { duration: reduced() ? 1 : 620 * tf(), delay: reduced() ? 0 : i * 90 * tf(), easing: "cubic-bezier(.33,.52,.25,.99)", fill: "forwards" });
        anim.onfinish = () => { f.remove(); chip.classList.remove("is-bump"); void chip.offsetWidth; chip.classList.add("is-bump"); if (counter) counter.textContent = String(start + Math.round(((i + 1) / count) * 15)); };
      }
      await wait(620 + count * 90);
    }

    async function returnComplete(token) {
      const n = model.current;
      const el = refs.nodes.get(n);
      const next = n + 1;
      await wait(260); if (token !== runToken) return;
      const m2 = makeModel(n); m2.stars.set(n, 3);
      apply(m2, {});
      el.classList.add("is-land");
      el.querySelectorAll(".stars svg").forEach((s, i) => { s.classList.add("pop"); s.style.animationDelay = `${i * 120 * tf()}ms`; });
      await wait(160); if (token !== runToken) return;
      await flyRunes(el, 5); if (token !== runToken) return;
      const c = refs.chapters[Math.ceil(n / 8) - 1];
      const idx = c.sessions.findIndex((s) => s.n === n);
      const spark = c.sec.querySelector(".spark");
      const from = c.lens[idx], to = c.lens[idx + 1];
      spark.animate([{ offsetDistance: `${from}px`, opacity: 0 }, { offsetDistance: `${from + (to - from) * .1}px`, opacity: 1, offset: .12 }, { offsetDistance: `${to}px`, opacity: 1, offset: .9 }, { offsetDistance: `${to}px`, opacity: 0 }], { duration: 640 * tf(), easing: "cubic-bezier(.33,.52,.25,.99)", fill: "forwards" });
      await wait(560); if (token !== runToken) return;
      const nextEl = refs.nodes.get(next) || refs.seals.get(next) || refs.gate;
      nextEl.classList.add("is-pop");
      later(() => { nextEl.classList.remove("is-pop"); el.classList.remove("is-land"); }, 700);
      watchCurrent();
    }

    async function chapterUnlock(token) {
      const seal = refs.seals.get(16);
      await wait(300); if (token !== runToken) return;
      seal.classList.remove("is-stamp"); void seal.offsetWidth; seal.classList.add("is-stamp");
      apply(makeModel(16), {});
      await wait(200); if (token !== runToken) return;
      await flyRunes(seal, 7); if (token !== runToken) return;
      const c3 = refs.chapters[2];
      scroll.scrollTo({ top: c3.sec.offsetTop - 40, behavior: "smooth" });
      await wait(420); if (token !== runToken) return;
      c3.sec.classList.add("is-unlocking");
      c3.sec.classList.remove("locked");
      c3.sec.querySelectorAll(".node, .seal, .ch-head").forEach((n, i) => { n.style.setProperty("--i", String(i)); });
      phone.classList.add("is-entering");
      await wait(900); if (token !== runToken) return;
      phone.classList.remove("is-entering"); c3.sec.classList.remove("is-unlocking");
      refs.nodes.get(17).classList.add("is-pop");
      later(() => refs.nodes.get(17).classList.remove("is-pop"), 700);
      seal.classList.remove("is-stamp");
      watchCurrent();
    }

    function base(m, o) {
      runToken += 1;
      cancelAll();
      closeSheet();
      if (cfg.toast) cfg.toast.classList.remove("is-on");
      phone.querySelectorAll(".flyer").forEach((f) => f.remove());
      apply(m, { instant: true });
      refs.chapters.forEach((c) => { c.sec.classList.remove("is-unlocking", "is-entering"); chIO.observe(c.sec); });
      if (cfg.jump) cfg.jump.classList.remove("is-on");
      watchCurrent();
      if (!(o && o.noEnter)) enter();
      scroll.scrollTo({ top: o && o.top != null ? o.top : 0, behavior: "auto" });
      return runToken;
    }

    const kit = {
      refs, build, apply, makeModel, base, enter, flyRunes, returnComplete, chapterUnlock,
      deny, showToast, openNodeSheet, closeSheet, scrollToCurrent, scrollToNode, watchCurrent, later, cancelAll, wait, tf,
      get model() { return model; },
      get token() { return runToken; },
      nodeEl: (n) => refs.nodes.get(n) || refs.seals.get(n) || refs.gate,
      plural,
    };
    return kit;
  }

  window.MapKit = { mount, makeModel, ringSVG };
})();
