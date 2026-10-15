/* PhraseMan 2.0 — оглавление юридических страниц.
   зачем: текст внутри <div class="legal-document"> перезаписывает `npm run legal:sync`
   (scripts/sync-legal-html.mjs) — статичное оглавление и id разделов при этом пропадали бы.
   Поэтому оглавление собирается при открытии страницы из заголовков h2; если оно уже есть в
   разметке (data-toc) — ничего не делаем. */
(function () {
  'use strict';
  var TAG = '[LEGAL-TOC]';
  function slug(text, i) {
    var s = String(text || '').toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48);
    return 's' + (i + 1) + (s ? '-' + s : '');
  }
  function build() {
    var doc = document.querySelector('.legal-document');
    if (!doc) { console.log(TAG, 'нет .legal-document — оглавление не нужно'); return; }
    var heads = [].slice.call(doc.querySelectorAll('h2'));
    heads.forEach(function (h, i) { if (!h.id) h.id = slug(h.textContent, i); });
    if (doc.querySelector('[data-toc]')) { console.log(TAG, 'оглавление уже в разметке — пропуск'); return; }
    if (heads.length < 3) { console.log(TAG, 'разделов меньше трёх (' + heads.length + ') — оглавление не строим'); return; }
    var toc = document.createElement('details');
    toc.className = 'toc'; toc.setAttribute('data-toc', '');
    // на телефоне оглавление свёрнуто, чтобы текст документа был сразу виден
    if (!window.matchMedia || !window.matchMedia('(max-width: 980px)').matches) toc.open = true;
    var sum = document.createElement('summary'); sum.textContent = 'Содержание';
    var nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Содержание');
    heads.forEach(function (h) { var a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent; nav.appendChild(a); });
    toc.appendChild(sum); toc.appendChild(nav);
    var meta = doc.querySelector('.meta');
    if (meta && meta.parentNode === doc) meta.insertAdjacentElement('afterend', toc); else doc.insertBefore(toc, doc.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
