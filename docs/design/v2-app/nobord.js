/* зачем (владелец 12.10, стиль «Тень»: контейнеры БЕЗ обводок; координатор: «сверь, что во всех макетах нет обводок»):
   единая страховка — после отрисовки страницы убираем обводки контейнеров в телефонах (.ph):
   (1) рамка border со всех четырёх сторон → прозрачная (размеры не меняются);
   (2) тени-«кромки» без размытия и смещения (inset 0 0 0 Npx и 0 0 0 Npx, N ≤ 2) вырезаем из box-shadow, остальные тени остаются.
   Мелкие кружки и галочки (≤ 34 px) — индикаторы, не контейнеры, их не трогаем. Страницы под замком владельца
   (cards-section, cards-gallery, mistakes-panel, packs-simple) пропускаем — они утверждены как есть (хэши в *.lock.json).
   Страницы эталона «Тень» сами рисуют тень и обводок не имеют. Подключается через kit.js или отдельным <script src="nobord.js">. */
(() => {
  if (window.__nobord) return; window.__nobord = true;
  const KEEP = /(cards-section|cards-gallery|mistakes-panel|packs-simple)(\.html)?$/;
  if (KEEP.test(location.pathname)) return;
  const split = (v) => { const out = []; let d = 0, cur = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const hair = (sh) => { const m = sh.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/); if (!m) return false; const [, x, y, b, sp] = m.map(Number); return x === 0 && y === 0 && b === 0 && sp > 0 && sp <= 2; };
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  function strip() {
    document.querySelectorAll('.ph, .ph *').forEach((el) => {
      if (el instanceof SVGElement) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (w <= 34 && h <= 34) return;
      const cs = getComputedStyle(el);
      if (SIDES.every((k) => parseFloat(cs['border' + k + 'Width']) > 0 && cs['border' + k + 'Style'] !== 'none' && cs['border' + k + 'Style'] !== 'dashed')) el.style.setProperty('border-color', 'transparent', 'important');
      if (cs.boxShadow && cs.boxShadow !== 'none') { const parts = split(cs.boxShadow); const kept = parts.filter((x) => !hair(x)); if (kept.length !== parts.length) el.style.setProperty('box-shadow', kept.length ? kept.join(', ') : 'none', 'important'); }
    });
  }
  let t = 0; const later = (ms) => { clearTimeout(t); t = setTimeout(strip, ms); };
  const kick = () => { later(80); setTimeout(strip, 700); setTimeout(strip, 2200); };
  if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick);
  new MutationObserver(() => later(350)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  window.K_stripOutlines = strip;
})();
