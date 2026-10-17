/* Карточки 2.0 — ВЕСЬ раздел в утверждённом стиле (стекло, градиент цвета темы внутри, аврора, акцентная кнопка).
   зачем (владелец 04.10): «все состояния, экраны и окна раздела — в точности с одобренными макетами, в таких же стилях»; карточка — ровно как в cards-gallery (зафиксирована),
   хаб — вариант А (стопка + кнопка + четыре равных раздела, без прокрутки), «Из видео» — равный раздел. Загружается ДО основного скрипта страницы. */

const lic = (n, cls = '') => {
  const P = {
    cards: '<rect x="4" y="7.5" width="12" height="13" rx="2.5"/><path d="M8 4.5h9.5A2.5 2.5 0 0120 7v10"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.4 5.5 3.4 8.5s-1 5.9-3.4 8.5c-2.4-2.6-3.4-5.5-3.4-8.5s1-5.9 3.4-8.5z"/>',
  };
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
};
const SECTIONS = [['bookmark', 'Сохранённые', '64'], ['layers', 'Мои наборы', '4'], ['play', 'Из видео', '3'], ['globe', 'Сообщество', '1 240']];
const secIcon = (n, cls = 's26') => (n === 'globe' ? lic('globe', cls) : K.icon(n, cls));
const arrowS = `<span class="ar">${K.icon('arrowR', 's20')}</span>`;
const chS = `<span class="ch">${K.icon('fwd', 's20')}</span>`;

// ---------- ЗАФИКСИРОВАННАЯ карточка (статическая версия: тот же CSS блока LOCKED:cards-css) ----------
const dotsS = (i) => [0, 1, 2, 3].map((d) => `<i class="${d < 1 + ((i * 7) % 4) ? 'on' : ''}"></i>`).join('');
const IPA = { 'Boarding pass': '/ˈbɔːdɪŋ pɑːs/', Layover: '/ˈleɪoʊvər/', 'Check in': '/tʃek ɪn/', 'Carry-on': '/ˈkæri ɒn/', Gate: '/ɡeɪt/', Delay: '/dɪˈleɪ/', Visa: '/ˈviːzə/', Lay: '/leɪ/', Claim: '/kleɪm/', Convince: '/kənˈvɪns/', Hire: '/ˈhaɪə/', Customs: '/ˈkʌstəmz/', Luggage: '/ˈlʌɡɪdʒ/', Passport: '/ˈpɑːspɔːt/' };
let cardCounter = 0;
// lv: 'l' (1 колонка), 'm' (2 колонки), 's' (3 колонки)
const cardS = (en, ru, open = '', o = {}) => {
  const i = (cardCounter += 1);
  const lv = o.lv || 'm';
  const H = { l: 105, m: 150, s: 123 }[lv];
  const FS = { l: 22, m: 18, s: 14.5 }[lv];
  const ipa = IPA[en] || '';
  return `<div class="gcs gc static t" ${open ? `data-open="${open}"` : ''} data-lv="${lv}" style="--t:var(--g1);height:${H}px;--fs:${FS}px"><div class="fl"><div class="face"><div class="en">${en}</div>${ipa && lv !== 's' ? `<div class="ipa">${ipa}</div>` : ''}${lv === 'l' ? `<span class="spk">${K.icon('vol', 's16')}</span><span class="dots">${dotsS(i)}</span>` : ''}</div><div class="face back"><div class="ru">${ru}</div></div></div></div>`;
};
const cardGrid = (pairs, lv = 'm', open = '') => `<div class="cgrid ${lv}">${pairs.map(([w, t]) => cardS(w, t, open, { lv })).join('')}</div>`;

// ---------- Хаб — вариант А (без прокрутки) и его состояния ----------
const lim2 = (n = 2) => `<span class="pill s">${lic('cards', 's16')}${({ 0: 0, 2: 24, 3: 30 })[n] ?? n}/30</span>`;
const headS = (n = 2) => `<div class="topbar"><span class="rb t">${K.icon('back', 's20')}</span><div class="flex">${lim2(n)}<span class="rb t">${K.icon('plus', 's20')}</span></div></div><div class="lt"><div class="ti">Карточки</div><div class="su">Слова и фразы</div></div>`;
const stackHero = (word, ipa, cls = '') => `<div style="position:relative;height:250px;margin-top:26px">
  <div class="mc solid" style="position:absolute;left:38px;right:38px;top:0;height:110px;opacity:.7;border-radius:28px"></div>
  <div class="mc solid" style="position:absolute;left:19px;right:19px;top:18px;height:130px;opacity:.9;border-radius:28px"></div>
  <div class="mc solid t float ${cls}" data-open="mode" style="position:absolute;left:0;right:0;top:40px;height:200px;border-radius:30px;flex-direction:column"><span style="font-size:36px;font-weight:700">${word}</span><span style="font-size:16px;font-style:italic;color:rgba(255,255,255,.65);margin-top:8px;font-weight:400">${ipa}</span></div></div>`;
// зачем (владелец 17.10, R109): число справа от иконки в верхней строке, под ними только название; «3 набора» → «3»
const tilesS = (counts = ['64', '4', '3', '1 240'], dim = false) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px">${SECTIONS.map(([ic, t], i) => `<div class="gl pad t" style="padding:18px 16px;min-height:150px;display:flex;flex-direction:column;justify-content:space-between${dim ? ';opacity:.55' : ''}"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div class="gtile">${secIcon(ic, 's24')}</div><div style="font-size:22px;line-height:28px;font-weight:700;font-variant-numeric:tabular-nums">${counts[i]}</div></div><div style="font-size:19px;line-height:25px;font-weight:700">${t}</div></div>`).join('')}</div>`;
const hubS = () => phone(`${headS()}<div class="rise">${stackHero('Boarding pass', '/ˈbɔːdɪŋ pɑːs/')}<div class="ac-cta t" data-open="mode" style="margin-top:14px">Тренироваться · осталось 24 из 30${arrowS}</div>${tilesS()}</div>`, { overlay: sheet('mode', modeInner) });
const hubLoadingS = () => phone(`${headS()}${stackHero('Boarding pass', '/ˈbɔːdɪŋ pɑːs/')}<div class="ac-cta t" style="margin-top:14px">Тренироваться · осталось 24 из 30${arrowS}</div>${tilesS(['64', '4', '…', '…'])}`);
const hubNewS = () => phone(`${headS(3)}<div class="rise"><div class="gl pad" style="margin-top:26px;min-height:250px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center"><div class="gtile" style="width:64px;height:64px;border-radius:20px">${K.icon('people', 's28')}</div><div style="font-size:24px;font-weight:700;margin-top:18px">Начните с готового</div><div style="font-size:16px;color:var(--sec);margin-top:6px">Добавьте набор из сообщества или из видео</div></div><div class="ac-cta t" style="margin-top:14px">Выбрать набор${arrowS}</div>${tilesS(['0', '0', '3', '1 240'])}</div>`);
const hubLimitS = () => phone(`${headS(0)}<div class="rise">${stackHero('Лимит на этот месяц исчерпан', 'Обновится 1 ноября')}<div class="ac-cta t" style="margin-top:14px;opacity:.55">Осталось 0 из 30 · до 1 ноября</div>${tilesS()}</div>`);

// ---------- «Из видео» ----------
const videoRowS = (ti, n, du, added) => `<div class="gl vrow t sm"><div class="vth"><span class="pl">${K.icon('play', 's16')}</span><span class="du">${du}</span></div><div class="grow" style="min-width:0"><div style="font-size:15px;line-height:19px;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${ti}</div><div style="font-size:14px;color:var(--sec);margin-top:4px">${n} фраз</div></div>${added ? `<span class="cntp">${K.icon('check', 's16')}</span>` : '<span class="vadd">Добавить</span>'}</div>`;
const VIDEOS_S = [['Самый лёгкий способ понять немецкий', 296, '24:18'], ['200 фраз на немецком всего из 100 немецких слов', 200, '31:05'], ['Немецкие фразы, которые помогут заговорить', 100, '18:42']];
const flagPill = `<span class="pill s" style="margin-top:14px"><i style="width:14px;height:14px;border-radius:50%;background:linear-gradient(180deg,#222 33%,#d33 33% 66%,#ec4 66%);display:block"></i>Немецкий</span>`;
const vHead = (sub = '3 набора · 596 фраз') => `<div class="topbar"><span class="rb t">${K.icon('back', 's20')}</span><div class="flex"></div></div><div class="lt"><div class="ti">Из видео</div>${sub ? `<div class="su">${sub}</div>` : ''}</div>${flagPill}`;
const searchS = (v = '') => `<div class="srch" style="margin-top:16px">${K.icon('search', 's18')}${v ? `<span class="v">${v}<span class="caret"></span></span><span class="x">${K.icon('close', 's18')}</span>` : 'Поиск по наборам'}</div>`;
const bareEmptyS = (ic, h, l, btn) => `<div class="empty"><div class="tile t61">${ic}</div><div class="h">${h}</div><div class="l">${l}</div>${btn ? `<span class="cta t">${btn}</span>` : ''}</div>`;
const vList = () => phone(`${vHead()}${searchS()}<div class="rise" style="margin-top:8px">${VIDEOS_S.map((v, i) => videoRowS(...v, i === 2)).join('')}</div>`);
const vSearch = () => phone(`${vHead()}${searchS('фразы')}<div class="ov" style="margin:20px 4px 6px">Найдено · 1</div>${videoRowS(...VIDEOS_S[2])}`);
const vLoading = () => phone(`${vHead('')}${searchS()}<div style="margin-top:8px">${[0, 1, 2].map(() => `<div class="gl vrow sm"><div class="skel" style="width:112px;height:63px;border-radius:12px;flex:none"></div><div class="grow"><div class="skel" style="width:80%;height:14px"></div><div class="skel" style="width:40%;height:12px;margin-top:10px"></div></div></div>`).join('')}</div>`);
const vEmpty = () => phone(`${vHead('')}${bareEmptyS(K.icon('play', 's28'), 'Пока пусто', 'Наборы из роликов появятся здесь, как только выйдут.', '')}`);
const vNone = () => phone(`${vHead()}${searchS('xyz')}${bareEmptyS(K.icon('search', 's28'), 'Ничего не нашли', 'Попробуйте другое слово.', 'Показать все')}`);
const vError = () => phone(`${vHead('')}${bareEmptyS(K.icon('wifiOff', 's28'), 'Сейчас недоступно', 'Проверьте интернет', `${li('refresh', 's18')}Попробовать снова`)}`);
const phraseRowS = (tm, w, tr) => `<div class="gl gpk t sm" style="margin-top:9px"><span class="gtime">${tm}</span><div class="grow"><div style="font-size:17px;font-weight:700">${w}</div><div style="font-size:15px;color:var(--sec);margin-top:2px">${tr}</div></div><span class="rb fill t">${K.icon('vol', 's18')}</span></div>`;
const vSet = (added) => phone(`<div class="topbar"><span class="rb t">${K.icon('back', 's20')}</span><span class="rb sq t">${K.icon('dotsV', 's18')}</span></div>
  <div style="font-size:30px;line-height:36px;font-weight:700;letter-spacing:-.4px;margin-top:14px">Самый лёгкий способ понять немецкий</div>
  <div class="vhero t"><span class="pl">${K.icon('play', 's26')}</span></div>
  <div class="flex" style="gap:8px;margin-top:14px"><span class="pill s">296 фраз</span><span class="pill s">Немецкий</span><span class="pill s">24 мин</span></div>
  <div style="margin-top:6px">${phraseRowS('0:12', 'Wie geht es dir?', 'Как у тебя дела?')}${phraseRowS('0:31', 'Ich verstehe dich nicht.', 'Я тебя не понимаю.')}${phraseRowS('0:58', 'Kannst du das wiederholen?', 'Можешь повторить?')}</div>`,
  { fixed: `<div class="bot"><div class="cta t">${added ? 'Тренировать' : 'Учить набор'}${arrowS}</div></div>` });

// ---------- телефон с ползунком масштаба (движок скопирован из cards-gallery дословно) ----------
const galleryPhoneS = () => phone(`<div class="topbar"><span class="rb t">${K.icon('back', 's20')}</span><div class="flex">${lim2()}<span class="rb t">${K.icon('plus', 's20')}</span></div></div><div class="lt"><div class="ti">Travel</div><div class="su">20 карточек</div></div>
  <div class="srch" style="margin-top:20px">${K.icon('search', 's18')}Слово или перевод</div><div id="g"></div>`);

// ---------- большая карточка (шторка карточки): та же зафиксированная карточка, крупно ----------
const bigCard = (en, ipa, ru, back) => `<div class="gc static t gbig ${back ? 'flipped' : ''}" style="--t:var(--g1);height:230px"><div class="fl"><div class="face"><div class="en" style="font-size:34px;font-weight:600">${en}</div><div class="ipa" style="font-size:16px">${ipa}</div><span class="spk">${K.icon('vol', 's16')}</span><span class="dots">${dotsS(3)}</span></div><div class="face back"><div class="ru" style="font-size:30px">${ru}</div></div></div></div>`;
const cardL = (w, t) => cardS(w, t, "", { lv: "l" });
const cardBackS = () => phone(`<div style="opacity:.3">${packView({ title: "Travel", author: "Вы", meta: "", act: "", n: 24, words: TRAVEL() })}</div>`, { overlay: cardSheet({ ...OWN_CARD, back: true }) });

// зачем: тап по карточке в списке раскрывает её по центру (разворот), тап по затемнению закрывает; перевернуть раскрытую карточку — тап по ней (общий обработчик переворота)
document.addEventListener('click', (e) => {
  const ph = e.target.closest('.ph'); if (!ph) return;
  const op = ph.querySelector('.copen'); if (!op) return;
  const dim = ph.querySelector('[data-dim="co"]');
  if (e.target === dim) { op.classList.remove('on'); dim.classList.remove('on'); return; }
  const c = e.target.closest('.gc.static');
  if (c && !c.classList.contains('gbig') && !op.contains(c)) { e.stopImmediatePropagation(); op.classList.add('on'); dim.classList.add('on'); }
}, true);
