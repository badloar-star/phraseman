/* ============================================================
   Showcase — панель витрины для макетов «Атласа».
   Showcase.init({ title, kicker, lead, states:[{id,label,group,apply}],
                   notes: html, nav: [{href,label}], onTheme })
   - переключает состояния экрана (data-state на телефоне + apply()),
   - тему хрома (data-theme на <html>), замедление 4× (--tf), reduced motion,
   - «Повторить» перезапускает текущее состояние (все анимации с нуля).
   Никаких зависимостей. Всё, что оно делает с DOM телефона, — через apply().
   ============================================================ */
(function () {
  const root = document.documentElement;
  // Перехват ошибок макета: смотреть window.__mockupErrors в консоли.
  window.__mockupErrors = [];
  window.addEventListener("error", (e) => window.__mockupErrors.push(`${e.message} @${(e.filename || "").split("/").pop()}:${e.lineno}`));
  window.addEventListener("unhandledrejection", (e) => window.__mockupErrors.push(String(e.reason && (e.reason.stack || e.reason))));
  const THEMES = [
    { id: "forest", label: "Лес", sw: "#47C870" },
    { id: "gold", label: "Золото", sw: "#D6B35A" },
    { id: "coral", label: "Коралл", sw: "#FF7F50" },
  ];
  const state = { current: null, slow: false, reduced: false, theme: "forest", cfg: null };

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (k === "class") n.className = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach((c) => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function applyMotionFlags() {
    root.style.setProperty("--tf", state.reduced ? 0.001 : state.slow ? 4 : 1);
    if (state.reduced) root.setAttribute("data-reduced", "1");
    else root.removeAttribute("data-reduced");
  }

  /* Перезапуск CSS-анимаций внутри контейнера: снять и вернуть класс через reflow. */
  function replayAnimations(container) {
    container.querySelectorAll("[class]").forEach((n) => {
      const cls = n.getAttribute("class");
      if (!cls) return;
      n.style.animation = "none";
      void n.offsetWidth;
      n.style.animation = "";
    });
  }

  function setState(id, opts) {
    const cfg = state.cfg;
    const s = cfg.states.find((x) => x.id === id);
    if (!s) return;
    state.current = id;
    const phone = document.querySelector(".phone");
    if (phone) phone.setAttribute("data-state", id);
    document.querySelectorAll(".pbtn[data-state-id]").forEach((b) => {
      b.setAttribute("aria-pressed", b.getAttribute("data-state-id") === id ? "true" : "false");
    });
    if (typeof s.apply === "function") s.apply(Object.assign({ replay: false }, opts || {}));
    const noteBox = document.getElementById("state-note");
    if (noteBox) noteBox.innerHTML = s.note || "";
    try { if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); } catch (e) { /* песочница артефакта запрещает историю: состояние живёт только в панели */ }
  }

  /* На узком экране (телефон) рама 390 px масштабируется под ширину окна:
     страница никогда не прокручивается вбок, макет смотрится на реальном айфоне. */
  function fitPhone() {
    const phone = document.querySelector(".phone");
    if (!phone) return;
    const z = Math.min(1, (window.innerWidth - 8) / 390);
    phone.style.zoom = z < 1 ? String(z) : "";
  }
  window.addEventListener("resize", fitPhone);

  function init(cfg) {
    state.cfg = cfg;
    fitPhone();
    const panel = document.querySelector(".panel");
    if (!panel) return;
    panel.innerHTML = "";

    const h1 = el("h1", null, [el("small", null, [cfg.kicker || "Learning V2 · Атлас"]), cfg.title]);
    panel.appendChild(h1);
    if (cfg.lead) panel.appendChild(el("p", { class: "lead", html: cfg.lead }));

    if (cfg.nav && cfg.nav.length) {
      const nav = el("div", { class: "nav" });
      cfg.nav.forEach((n) => nav.appendChild(el("a", { href: n.href }, [n.label])));
      panel.appendChild(nav);
    }

    // Состояния (группами)
    const groups = [];
    cfg.states.forEach((s) => {
      const g = s.group || "Состояния";
      if (!groups.includes(g)) groups.push(g);
    });
    groups.forEach((g) => {
      const box = el("div");
      box.appendChild(el("h2", null, [g]));
      const grp = el("div", { class: "group" });
      cfg.states
        .filter((s) => (s.group || "Состояния") === g)
        .forEach((s) => {
          grp.appendChild(
            el("button", {
              class: "pbtn",
              "data-state-id": s.id,
              "aria-pressed": "false",
              onclick: () => setState(s.id, { replay: true }),
            }, [s.label]),
          );
        });
      box.appendChild(grp);
      panel.appendChild(box);
    });

    // Управление движением
    const motionBox = el("div");
    motionBox.appendChild(el("h2", null, ["Движение"]));
    const mg = el("div", { class: "group" });
    const replayBtn = el("button", { class: "pbtn replay", onclick: () => setState(state.current, { replay: true }) }, ["Повторить"]);
    const slowBtn = el("button", {
      class: "pbtn", "aria-pressed": "false",
      onclick: (e) => {
        state.slow = !state.slow;
        e.currentTarget.setAttribute("aria-pressed", String(state.slow));
        applyMotionFlags();
        setState(state.current, { replay: true });
      },
    }, ["Замедлить 4×"]);
    const rmBtn = el("button", {
      class: "pbtn", "aria-pressed": "false",
      onclick: (e) => {
        state.reduced = !state.reduced;
        e.currentTarget.setAttribute("aria-pressed", String(state.reduced));
        applyMotionFlags();
        setState(state.current, { replay: true });
      },
    }, ["Reduced motion"]);
    mg.appendChild(replayBtn);
    mg.appendChild(slowBtn);
    mg.appendChild(rmBtn);
    motionBox.appendChild(mg);
    panel.appendChild(motionBox);

    // Тема хрома
    if (cfg.themes !== false) {
      const tb = el("div");
      tb.appendChild(el("h2", null, ["Тема хрома приложения"]));
      const tg = el("div", { class: "group" });
      THEMES.forEach((t) => {
        const b = el("button", {
          class: "pbtn", "data-theme-id": t.id, "aria-pressed": String(t.id === state.theme),
          onclick: () => {
            state.theme = t.id;
            root.setAttribute("data-theme", t.id);
            document.querySelectorAll(".pbtn[data-theme-id]").forEach((x) => x.setAttribute("aria-pressed", String(x.getAttribute("data-theme-id") === t.id)));
            if (cfg.onTheme) cfg.onTheme(t.id);
          },
        });
        const sw = el("span", { class: "sw" });
        sw.style.background = t.sw;
        b.appendChild(sw);
        b.appendChild(document.createTextNode(t.label));
        tg.appendChild(b);
      });
      tb.appendChild(tg);
      panel.appendChild(tb);
    }

    // Заметка состояния + общие заметки
    panel.appendChild(el("div", { class: "note", id: "state-note" }));
    if (cfg.notes) panel.appendChild(el("div", { class: "note", html: cfg.notes }));

    const fromHash = location.hash.replace("#", "");
    const first = cfg.states.find((s) => s.id === fromHash) ? fromHash : cfg.states[0].id;
    root.setAttribute("data-theme", state.theme);
    setState(first, { replay: true });
  }

  window.Showcase = { init, setState, replayAnimations, get state() { return state; } };
})();
