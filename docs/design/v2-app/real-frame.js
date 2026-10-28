/* real-frame.js — телефон из РЕАЛЬНОГО кадра эмулятора (1080 × 2400, Pixel 8) с новыми блоками поверх.
   зачем (владелец 28.10: «буду смотреть, только если экраны такие, как ДЕЙСТВИТЕЛЬНО в приложении»): основа каждого телефона —
   кадр Сверки без изменений («сейчас»); «как будет» — тот же кадр, разрезанный по горизонтали в нужном месте, между ломтями
   вставлен новый блок (нижняя часть кадра сдвигается вниз, как при настоящей вставке карточки), либо блок положен поверх.
   Статус-бар и таббар — тоже ломти кадра, закреплены сверху и снизу; содержимое прокручивается колесом. Кадра нет — честная
   заглушка с именем файла. Масштаб: 1080 px кадра → 430 px телефона (1 dp ≈ 1,05 px). */
window.RF = (() => {
  const W = 430; const FW = 1080; const FH = 2400; const K = W / FW;
  const px = (y) => Math.round(y * K);
  const H = px(FH);
  const sliceCss = (src, fromY, toY) => `height:${px(toY - fromY)}px;background-image:url(${src});background-size:${W}px ${H}px;background-position:0 ${-px(fromY)}px`;
  const slice = (src, fromY, toY, cls = '') => `<div class="rf-slice${cls ? ' ' + cls : ''}" style="${sliceCss(src, fromY, toY)}"></div>`;
  /**
   * phone({ src, exists, cls, status, tab, inserts: [{ y, html }], overlays, fixed, time })
   *  src — путь к кадру; exists — есть ли файл (список пишет сборщик); status/tab — границы ломтей статус-бара и таббара в px кадра;
   *  inserts — вставки после координаты y кадра (сортируются); overlays — html, абсолютно позиционированный в координатах телефона;
   *  fixed — html поверх всего (шторки, тосты). Возвращает разметку .ph.rf.
   */
  function phone(o) {
    const src = o.src; const status = o.status ?? 100; const tab = o.tab ?? 2170;
    if (!o.exists) return `<div class="ph rf rf-missing${o.cls ? ' ' + o.cls : ''}" data-ph="${o.cls || 'rf'}"><div class="rf-none">кадр не снят<br><small>${src.split('/').pop()}</small></div></div>`;
    const ins = [...(o.inserts || [])].sort((a, b) => a.y - b.y);
    // cut: [от, до] — вырезать полосу кадра (например, кнопку, которой у не-новичка нет); вставка с тем же y встаёт на её место
    const cut = o.cut || null;
    let y = status; let body = '';
    for (const i of ins) { if (i.y > y) body += slice(src, y, i.y); body += `<div class="rf-ins">${i.html}</div>`; y = cut && cut[0] === i.y ? cut[1] : i.y; }
    if (tab > y) body += slice(src, y, tab);
    return `<div class="ph rf${o.cls ? ' ' + o.cls : ''}" data-ph="${o.cls || 'rf'}">`
      + `<div class="rf-status" style="${sliceCss(src, 0, status)}"></div>`
      + `<div class="rf-scr"><div class="rf-body">${body}${o.overlays || ''}</div></div>`
      + `<div class="rf-tab" style="${sliceCss(src, tab, FH)}"></div>${o.fixed || ''}</div>`;
  }
  return { W, H, K, px, phone, slice };
})();
