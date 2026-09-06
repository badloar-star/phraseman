/* ============================================================
   AtlasKit — колода уроков (общее для макетов 01 и 02).
   AtlasKit.buildDeck(deckEl, model, { onCard })
     model: { currentLesson, doneInCurrent, doneLessons, released }
   AtlasKit.sigil(n, color) — векторный сигил урока по номеру (ноль ассетов).
   ============================================================ */
(function () {
  const { LESSONS, CHAPTERS } = window.COURSE;
  const CH_COLORS = ["#6EDCC4", "#EDB667", "#F28A9C", "#8AAAF2", "#A9DB6C", "#C99EF2", "#F2CB6E"];
  const RUNES = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᛃ", "ᛊ", "ᛏ", "ᛒ", "ᛗ", "ᛚ", "ᛜ"];

  function sigil(n, color) {
    const sides = 3 + (n % 5), rot = n * 13, cx = 75, cy = 75;
    let out = "";
    for (let ring = 0; ring < 3; ring += 1) {
      const r = 62 - ring * 17;
      const pts = [];
      for (let i = 0; i < sides; i += 1) {
        const a = ((360 / sides) * i + rot + ring * 9) * Math.PI / 180;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
      }
      out += `<polygon points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${ring === 0 ? 1.4 : 1}" opacity="${1 - ring * .25}"/>`;
    }
    out += `<circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/><text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="Segoe UI Historic, Noto Sans Runic, Apple Symbols" font-size="22" fill="${color}" opacity=".9">${RUNES[n % 15]}</text>`;
    return `<svg viewBox="0 0 150 150">${out}</svg>`;
  }

  function cardHTML(l, m) {
    const n = l.n;
    const isDone = n <= m.doneLessons;
    const isCurrent = n === m.currentLesson;
    const isSoon = n > m.released;
    const curCh = isCurrent ? Math.min(7, Math.floor(m.doneInCurrent / 8) + 1) : 1;
    const dots = CHAPTERS.map((c) => {
      const done = isDone || (isCurrent && m.doneInCurrent >= c.n * 8);
      const now = isCurrent && !done && c.n === curCh;
      return `<span class="${done ? "on" : now ? "now" : ""}" style="--d:${isDone ? "#E9CE7A" : CH_COLORS[c.n - 1]}"></span>`;
    }).join("");
    const right = isDone
      ? `<div class="wax gold"><svg><use href="#i-check"/></svg></div>`
      : isCurrent ? ""
        : isSoon ? `<div class="wax"><svg><use href="#i-clock"/></svg></div>`
          : `<div class="wax"><span class="crack"></span><svg><use href="#i-lock"/></svg></div>`;
    const count = isDone ? `<span class="stars-total"><svg><use href="#i-star"/></svg>${140 + n * 3} из 168</span>` : isCurrent ? `${m.doneInCurrent} из 56` : "";
    const spectrum = isCurrent ? `<div class="spectrum" style="width:120px">${CHAPTERS.map((c) => `<span data-ch="${c.n}" style="--p:${Math.max(0, Math.min(1, (m.doneInCurrent - (c.n - 1) * 8) / 8))}"></span>`).join("")}</div>` : "";
    return {
      cls: "card " + (isDone ? "done" : isCurrent ? "current" : isSoon ? "soon" : "sealed"),
      ch: curCh,
      html: `
        <div class="light"></div>
        <div class="top"><div class="num">${String(n).padStart(2, "0")}</div><div class="t"><div class="arc">${l.arc}</div></div>${right}</div>
        <div class="sys">${l.system}</div>
        ${isCurrent ? `<div class="dots">${dots}</div>` : ""}
        <div class="sigil">${sigil(n, isCurrent ? CH_COLORS[curCh - 1] : "#E9CE7A")}</div>
        <div class="bottom">${spectrum}<span class="cnt">${count}</span>${isCurrent ? `<button class="open"><svg><use href="#i-play"/></svg>Открыть карту</button>` : ""}</div>`,
    };
  }

  function buildDeck(deck, m, opts) {
    deck.innerHTML = "";
    const limit = (opts && opts.limit) || LESSONS.length;
    LESSONS.slice(0, limit).forEach((l, idx) => {
      const c = cardHTML(l, m);
      const card = document.createElement("article");
      card.className = c.cls;
      card.style.setProperty("--i", String(idx));
      card.setAttribute("data-ch", String(c.ch));
      card.setAttribute("data-n", String(l.n));
      card.innerHTML = c.html;
      if (opts && opts.onCard) card.addEventListener("click", () => opts.onCard(card, l.n));
      deck.appendChild(card);
    });
  }

  window.AtlasKit = { buildDeck, cardHTML, sigil, CH_COLORS };
})();
