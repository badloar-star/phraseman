/* PhraseMan 2.0 · «Друзья» — ядро макета friends-full.html: данные, значки, аватары с кольцом Plus, общие куски экранов, сборка страницы.
   зачем (решение владельца №43, переделка 21.10): все экраны 9 идей рисуются из одних и тех же кусков, чтобы стиль был един
   и совпадал с эталонами chapter-exam-flow.html и plus-ring-etalon.html. Экраны — в friends-full-a/b/c.js. */
(() => {
  'use strict';
  const K = window.K;

  /* значки — коды Ionicons из glyphmap приложения (@expo/vector-icons), шрифт assets/Ionicons.ttf */
  const IC = {
    people: 'f49f', peopleO: 'f4a3', personAdd: 'f4a7', person: 'f4ac', flame: 'f313', flameO: 'f314', hand: 'f35c', handF: 'f35b',
    gift: 'f338', giftF: 'f337', flash: 'f316', flashO: 'f31a', trophy: 'f601', trophyO: 'f602', time: 'f5de', timer: 'f5e1', hourglass: 'f386',
    chats: 'f218', chat: 'f215', chatDots: 'f213', mic: 'f45e', micF: 'f454', vol: 'f613', check: 'f21d', okF: 'f21e', okO: 'f21f', checks: 'f221',
    close: 'f24a', closeC: 'f24c', fwd: 'f23b', back: 'f229', down: 'f232', up: 'f241', arrowR: 'f133', arrowL: 'f127', add: 'f103', addC: 'f105',
    bell: 'f47f', plane: 'f48e', share: 'f575', shareO: 'f572', repeat: 'f52f', refresh: 'f514', swap: 'f5b1', flag: 'f311', flagF: 'f310',
    diamond: 'f2a1', star: 'f595', starO: 'f599', heart: 'f36a', heartO: 'f377', layers: 'f3b0', albums: 'f110', copy: 'f290', book: 'f1a6',
    school: 'f55d', cafe: 'f1ca', cal: 'f1d6', podium: 'f4e5', ribbon: 'f545', medal: 'f446', rocket: 'f548', alarm: 'f10d', eye: 'f2ea',
    lock: 'f3c8', lockF: 'f3c7', offline: 'f25b', alert: 'f114', info: 'f399', dots: 'f2ce', search: 'f563', spark: 'f58d', sparkF: 'f58c',
    infinite: 'f395', happy: 'f362', thumbs: 'f5d5', link: 'f3b9', home: 'f383', homeF: 'f382', bookF: 'f1a5', play: 'f4c6', playO: 'f4d6',
    settings: 'f56c', stats: 'f59c', trend: 'f5fc', game: 'f335', bus: 'f1c4', sunny: 'f5ae', moon: 'f461', ban: 'f16a', remove: 'f522',
    sync: 'f5ba', stopwatch: 'f5a5', puzzle: 'f2e4', create: 'f293', ear: 'f2c0', headset: 'f368', lang: 'f3aa', mailUnread: 'f437',
    personRemove: 'f4ae', today: 'f5e4', calNum: 'f1d4', sendO: 'f566', trash: 'f5f6', undo: 'f143', bookmark: 'f1a9', help: 'f37e',
    playCO: 'f4ce', playC: 'f4cd', settingsF: 'f56b', shield: 'f57c', diamondO: 'f2a2', clip: 'f248', copyO: 'f290', refreshO: 'f518', trendUp: 'f5fc',
    brief: 'f1b2', globe: 'f350',
  };
  const gi = (k, st) => `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${IC[k] || IC.help};</i>`;

  /* люди макета: ранги монет как в plus-ring-etalon (Ирина 9 и Марк 11 — Plus) */
  const P = {
    me: { n: 'Алекс', r: 5 },
    ira: { n: 'Ирина', r: 9, plus: true },
    mark: { n: 'Марк', r: 11, plus: true },
    lida: { n: 'Лидия', r: 8 },
    oleg: { n: 'Олег', r: 3 },
    den: { n: 'Денис', r: 6 },
  };

  /* аватар-монета; Plus — кольцо 2,5 + зазор 2 и значок ◆ от 26 (эталон plus-ring-etalon.html) */
  const AV = (p, s = 44, o = {}) => {
    const img = `<img src="${K.coin(p.r)}" width="${s}" height="${s}" style="width:${s}px;height:${s}px" alt="">`;
    const plus = p.plus && !o.noPlus;
    const cls = ['av', plus ? 'plus' : '', o.off ? 'off' : ''].filter(Boolean).join(' ');
    let pin = '';
    if (plus && s >= 26 && !o.noPin) {
      const d = Math.max(14, Math.round(s * 0.4));
      pin = `<span class="pin" style="width:${d}px;height:${d}px"><i class="io" style="font-size:${Math.round(d * 0.58)}px">&#x${IC.diamond};</i></span>`;
    }
    return `<span class="${cls}"${o.st ? ` style="${o.st}"` : ''}>${img}${pin}</span>`;
  };
  const PAIR = (a, b, s = 36) => `<span class="pair">${AV(a, s, { noPin: true })}${AV(b, s, { noPin: true })}</span>`;
  const coinImg = (r, s = 22) => `<img src="${K.coin(r)}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;border-radius:50%" alt="">`;

  /* тема: «Сумерки» по умолчанию, ?t=marine — «Океан» */
  let TH = new URLSearchParams(location.search).get('t') === 'marine' ? 'marine' : 'ink';
  const art = (name) => `assets/v2art/${TH === 'ink' ? 'light' : 'dark'}/${name}.webp`;
  const PH = (body, o = {}) => K.phone(body, o).replace('class="ph"', `class="ph th-${TH}${o.cls ? ' ' + o.cls : ''}"`);

  /* ── общие куски экранов ── */
  // плавающий таббар = код (app/(tabs)/_layout.tsx): Главная · Обучение · Видео · Сообщество · Настройки, только значки; «Друзья» — раздел «Сообщества»
  const TABS = [['home', 'home', 'homeF'], ['learn', 'book', 'bookF'], ['video', 'playCO', 'playC'], ['community', 'peopleO', 'people'], ['settings', 'settings', 'settingsF']];
  const tabKey = (k) => (k === 'friends' ? 'community' : k);
  const tabbar = (on = 'community', dots = []) => { const a = tabKey(on); const d = dots.map(tabKey); return `<div class="tbar">${TABS.map(([k, off, onI]) => `<span class="${k === a ? 'on' : ''}">${gi(k === a ? onI : off)}${d.includes(k) ? '<i class="dot"></i>' : ''}</span>`).join('')}</div>`; };
  // шапка «Сообщества»: «Пик · Друзья · Наборы»; правый слот в коде занят только у «Наборов»
  const comTabs = (on = 1, right = '') => `<div class="tabs">${['Пик', 'Друзья', 'Наборы'].map((t, i) => `<span class="${i === on ? 'on' : ''}">${t}</span>`).join('')}<span class="gr"></span>${on === 2 ? right : ''}</div>`;
  const back = (right = '') => `<div class="mh"><span class="mrb t">${gi('arrowL')}</span>${right}</div>`;
  const closeTop = (right = '') => `<div class="mh"><span class="mrb t">${gi('close')}</span>${right}</div>`;
  const sheet = (inner, o = {}) => `<div class="xdim"></div><div class="xsh"${o.st ? ` style="${o.st}"` : ''}><div class="grab"></div>${inner}</div>`;
  const modal = (inner) => `<div class="xdim"></div><div class="mdl">${inner}</div>`;
  const toast = (ic, text, o = {}) => `<div class="tst" style="${o.top ? 'top:58px' : 'bottom:' + (o.bottom ?? 120) + 'px'}">${gi(ic, o.icSt || '')}<span class="grow">${text}</span>${o.btn || ''}</div>`;
  const push = (title, body, when = 'сейчас', o = {}) => `<div class="push"${o.st ? ` style="${o.st}"` : ''}><img class="app" src="assets/app_icon.webp" alt=""><div style="flex:1;min-width:0"><div class="h">${title}<span>${when}</span></div><div class="b">${body}</div></div></div>`;
  const pf = (n, st = '') => `<span class="pf ${st}">${gi('flame')}${n}</span>`;
  const skelRows = (n = 3) => Array.from({ length: n }, () => '<div class="skel"><i style="width:44px;height:44px;border-radius:50%"></i><div style="flex:1"><i style="width:44%;height:14px"></i><i style="width:64%;height:12px;margin-top:8px"></i></div></div>').join('');

  /* ── страница ── */
  const col = (label, html, note) => `<div class="col"><div class="lbl">${label}${note ? `<small>${note}</small>` : ''}</div>${html}</div>`;
  const group = (title, cols) => `<div class="sub2">${title}</div><div class="phones">${cols.join('')}</div>`;
  const route = (steps) => `<div class="route">${steps.map((s) => (s.startsWith('!') ? `<span class="ex">${s.slice(1)}</span>` : `<span>${s}</span>`)).join('<i>→</i>')}</div>`;
  const table = (rows) => `<div class="tbx"><table class="tb"><tr><th>Вход</th><th>Экраны</th><th>Выход</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table></div>`;
  const LV = { hi: 'hi', mid: 'mid', lo: 'lo' };
  const scores = (s) => `<div class="scores">${s.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div>`;
  const idea = (o) => `<section id="${o.id}"><div class="ihead">${o.n ? `<span class="q">Идея ${o.n}</span>` : ''}<h2>${o.title}</h2></div><p class="ipitch">${o.pitch}</p>${o.scores ? scores(o.scores) : ''}${(o.routes || []).map(route).join('')}${o.groups.join('')}${o.rows ? table(o.rows) : ''}${o.firebase ? `<p class="fb">${o.firebase}</p>` : ''}</section>`;

  const blocks = [];
  const add = (fn) => blocks.push(fn);
  const addFirst = (fn) => blocks.unshift(fn);
  function render() {
    const root = document.getElementById('root');
    // ?only=duel,goal — только эти блоки (проверка длинной страницы по частям)
    const only = (new URLSearchParams(location.search).get('only') || '').split(',').filter(Boolean);
    root.innerHTML = blocks.map((fn) => { try { return fn(); } catch (e) { console.warn('[FRIENDS-MOCK] блок не собрался', e); return `<p style="color:#F2766B">Блок не собрался: ${e.message}</p>`; } })
      .filter((h) => !only.length || only.some((id) => h.slice(0, 60).includes(`id="${id}"`))).join('');
    document.querySelectorAll('#thm .chp[data-t]').forEach((c) => c.classList.toggle('on', c.dataset.t === TH));
    K.init();
    // ?at=N — сразу к N-й группе экранов (сверка по частям)
    const at = Number(new URLSearchParams(location.search).get('at'));
    if (at) { const g = document.querySelectorAll('.sub2')[at - 1]; if (g) { g.scrollIntoView(); window.scrollBy(0, -64); } }
  }
  document.getElementById('thm').addEventListener('click', (e) => {
    const c = e.target.closest('.chp[data-t]');
    if (!c || c.dataset.t === TH) return;
    TH = c.dataset.t;
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  });

  window.FF = { K, IC, gi, P, AV, PAIR, coinImg, art, PH, tabbar, comTabs, back, closeTop, sheet, modal, toast, push, pf, skelRows, col, group, route, table, idea, add, addFirst, render, LV, get TH() { return TH; } };
})();
