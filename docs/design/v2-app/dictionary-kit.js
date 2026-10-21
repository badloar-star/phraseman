/* Общий JS макетов «Словарь» (реестр №41). Только разметка: никаких данных приложения. Образцы слов — из курса (уроки 1–2). */
const PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  vol: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
  bookmark: '<path d="M7 4h10a1 1 0 011 1v15l-6-4-6 4V5a1 1 0 011-1z"/>',
  book: '<path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5 2-1.5 5-1.9 8.5-1.5V5C17 4.6 14 5 12 6.5z"/><path d="M12 6.5v13"/>',
  check: '<path d="M5.5 12.5l4.2 4.2L18.5 8"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  repeat: '<path d="M20 12a8 8 0 11-2.4-5.7"/><path d="M20 4v5h-5"/>',
  cards: '<rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M7 5h10"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  building: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01M10 20.5v-4h4v4"/>',
  hand: '<path d="M7 11V6.5a1.5 1.5 0 013 0V11M10 10V5a1.5 1.5 0 013 0v5M13 10V6a1.5 1.5 0 013 0v6"/><path d="M16 12v-.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a5 5 0 01-4-2l-3-4a1.5 1.5 0 012.3-1.9L8 14"/>',
  dots: '<path d="M6 12h.01M12 12h.01M18 12h.01" stroke-width="3"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
};
const ic = (n, s = 20, fill = false) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[n]}</svg>`;
const bm = (on = false, s = 24) => `<span class="bk${on ? ' on' : ''}" role="img" aria-label="${on ? 'В карточках' : 'В карточки'}">${ic('bookmark', s, on)}</span>`;
const vol = (s = 38, on = false) => `<span class="rb${on ? ' on' : ''}" role="img" aria-label="Слушать">${ic('vol', 18)}</span>`;
const st = (k) => `<span class="st ${k}" role="img" aria-label="${{ n: 'новое слово', l: 'учу', k: 'знаю' }[k]}">${k === 'k' ? ic('check', 14) : ''}</span>`;
const pips = (n) => `<span class="pips" role="img" aria-label="Запомнено ${n} из 4">${[1, 2, 3, 4].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>`;
const hl = (w, q) => { if (!q) return w; const i = w.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? w : `${w.slice(0, i)}<b>${w.slice(i, i + q.length)}</b>${w.slice(i + q.length)}`; };

const SB = '<div class="sb"><span>9:41</span><span class="r"><span class="sig"></span><span class="bat"></span></span></div>';
const phone = (body, { lt = false, dock = '' } = {}) => `<div class="ph${lt ? ' lt' : ''}">${SB}<div class="scr">${body}</div>${dock}<div class="hi"></div></div>`;
const pair = (label, fn, note = '') => `<div class="pair"><div class="cap">${label}</div><div class="two">${[false, true].map((lt) => `<div class="col"><div class="tag">${lt ? 'Светлая («Сумерки»)' : 'Тёмная (графит)'}</div>${fn(lt)}</div>`).join('')}</div>${note ? `<div class="note">${note}</div>` : ''}</div>`;

/* образцы слов: [слово, транскрипция, перевод, состояние n/l/k, силы 0–4, сохранено] */
const WORDS = [
  ['office', '/ˈɒfɪs/', 'офис', 'k', 4, true], ['boss', '/bɒs/', 'начальник', 'k', 3, false], ['late', '/leɪt/', 'поздно, опаздывать', 'l', 2, false],
  ['ready', '/ˈredi/', 'готов', 'l', 1, true], ['sure', '/ʃʊə/', 'уверен', 'n', 0, false], ['tired', '/ˈtaɪəd/', 'уставший', 'n', 0, false],
];
const wrow = (w, tr, mean, { q = '', saved = false } = {}) => `<div class="wrow"><div class="wc"><div class="w">${hl(w, q)}</div><div class="m">${tr} · ${mean}</div></div>${vol()}${bm(saved, 22)}</div>`;
const sec = (title, n) => `<div class="dsec"><span>${title}</span><span class="n">${n}</span></div>`;
const mount = (html) => { document.getElementById('root').innerHTML = html; };
