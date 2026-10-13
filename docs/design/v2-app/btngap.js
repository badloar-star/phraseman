/* зачем (правило владельца 13.10 через координатора: «НИКАКИЕ КНОПКИ ВООБЩЕ ЧТОБЫ НЕ СЛИВАЛИСЬ», MOCKUP_REQUIREMENTS §3 — зазор между кнопками ≥ 12 px):
   единая страховка, как nobord.js — после отрисовки страницы в каждом телефоне (.ph) соседние кнопки одного родителя раздвигаются до 12 px:
   во flex/grid — растёт gap родителя, в обычном столбце — отступ сверху у нижней кнопки. Размеры кнопок не меняются.
   Подключается из kit.js. Проверка — C:/Temp/claude/btn/audit.cjs («зазор N px»). Код приложения догоняют Темы (№35). */
(() => {
  if (window.__btngap) return; window.__btngap = true;
  const SEL = '.cta, .ov-provider, .quiet.t, button';
  const MIN = 12;
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 18; };
  function fix() {
    document.querySelectorAll('.ph').forEach((ph) => {
      const groups = new Map();
      ph.querySelectorAll(SEL).forEach((b) => { if (!shown(b) || b.parentElement.closest(SEL)) return; const p = b.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(b); });
      groups.forEach((list, parent) => {
        if (list.length < 2) return;
        const cs = getComputedStyle(parent);
        const flexish = /flex|grid/.test(cs.display);
        for (let i = 1; i < list.length; i++) {
          const a = list[i - 1].getBoundingClientRect(); const b = list[i].getBoundingClientRect();
          const sameRow = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 10;
          const gap = sameRow ? b.left - a.right : b.top - a.bottom;
          if (!(gap >= 0 && gap < MIN)) continue;
          const add = MIN - gap;
          if (flexish) {
            const prop = sameRow ? 'column-gap' : 'row-gap';
            const cur = parseFloat(cs.getPropertyValue(prop)) || 0;
            parent.style.setProperty(prop, `${cur + add}px`, 'important');
            break; // gap родителя общий — пересчёт на следующем проходе
          }
          if (!sameRow) { const mt = parseFloat(getComputedStyle(list[i]).marginTop) || 0; list[i].style.setProperty('margin-top', `${mt + add}px`, 'important'); }
        }
      });
    });
  }
  let t = 0; const later = (ms) => { clearTimeout(t); t = setTimeout(fix, ms); };
  const kick = () => { later(120); setTimeout(fix, 800); setTimeout(fix, 2400); };
  if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick);
  new MutationObserver(() => later(400)).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.K_fixButtonGaps = fix;
})();
