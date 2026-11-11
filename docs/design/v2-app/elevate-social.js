/* Страница «Диалоги, наборы и друзья» (владелец 11.11: «раздел диалоги и сами диалоги… раздел наборы… в наборах карточки тоже…
   раздел друзья, чтобы можно было смотреть статистику и навыки друзей»). Сердечко и комментарий к набору качают «Социальный» —
   это показано всплывающей строкой. Навыки берутся из EL.SK, как на всех остальных экранах. */
(() => {
  const { I, $, $$, log, timers, count, bump, again, was, top, coins, SK, LVMAX, skAxes, starSvg, starLabels, starTween, mount } = EL;
  const stat = (html, after) => (ph, auto) => { const G = timers(); $(ph, '.lay').innerHTML = html; const stop = after ? after(ph, G, auto) : null; return () => { G.clear(); if (stop) stop(); }; };
  const hrow = (ic, e, r, right, p, dl = 0, lock = false) => `<div class="gl hrow rise t" style="--dl:${dl}ms${lock ? ';opacity:.6' : ''}"><div class="ic">${I(lock ? 'lockF' : ic)}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div>${p === null ? '' : `<div class="bar"><i style="--p:${p}"></i></div>`}</div><span class="rt2">${right}</span></div>`;
  const toast = (ph, G, html) => { const t = $(ph, '.toast2'); t.innerHTML = html; t.classList.add('on'); G.after(2200, () => t.classList.remove('on')); };
  const NAMES = SK.map((s) => s.nm), zero = SK.map(() => 0);

  /* ---------- диалоги ---------- */
  const dHub = stat(`${top({ back: true, mid: '<div class="ttl">Диалоги</div>', right: `<span class="gpill">${I('chat', 's18')}<span class="num">8/10</span></span>` })}
    <div class="scen rise"><div class="over">Продолжить</div><div class="big">Кофе с коллегой</div><div class="sub" style="margin-top:4px">Осталось две реплики</div></div>
    <div class="wcta t" style="margin-top:14px">${I('play')}Продолжить диалог</div>
    <div class="hl2">${hrow('cupF', 'В кафе', '4 из 11 диалогов', 'A1', .36, 150)}${hrow('planeF', 'В дороге', '2 из 9 диалогов', 'A2', .22, 220)}${hrow('basket', 'В магазине', 'Ещё не начинал', 'A2', 0, 290)}${hrow('docF', 'На работе', 'Откроется на ранге 9', 'B1', null, 360, true)}</div>`);
  const wasDHub = was(`<div class="lt"><div class="ti" style="font-size:34px">Диалоги</div><div class="su">Говори готовыми фразами</div></div><div style="height:16px"></div><div class="stack g13">${[['cupF', 'В кафе', '4 /11'], ['planeF', 'В дороге', '2 /9'], ['basket', 'В магазине', '0 /8']].map(([ic, a, f]) => `<div class="card c2"><div class="row" style="min-height:84px"><div class="tile t55">${I(ic, 's24')}</div><div class="tx"><div class="tt">${a}</div><div class="st">Короткие сцены</div><div class="trk dot" style="margin-top:10px"><i></i></div></div><span class="frac"><b>${f.split(' ')[0]}</b><span>${f.split(' ')[1]}</span></span></div></div>`).join('')}<div class="card c2"><div class="row"><div class="tile">${I('lockF', 's20')}</div><div class="tx"><div class="tt">Некоторые диалоги пока закрыты</div></div></div></div></div>`);
  const dBrief = stat(`${top({ mid: '<div class="ttl" style="text-align:center">В кафе</div>', right: `<span class="gpill">${I('boltF', 's16')}<span class="num">4</span></span>` })}
    <div class="scen rise" style="height:190px"><div class="over">Сцена 5 из 11</div><div class="big">Кофе с коллегой</div></div>
    <div class="gl panel2 rise" style="margin-top:14px;--dl:120ms"><div class="h">Твоя задача</div><div class="sub" style="margin-top:4px">Поздоровайся, скажи, что ждёшь друга, и закажи кофе.</div></div>
    <div class="gl panel2 rise" style="--dl:200ms"><div class="h">Пригодятся фразы</div><div class="chipsr">${['I am waiting for…', 'Can I have…', 'Thank you'].map((c) => `<span class="chipr">${c}</span>`).join('')}</div></div>
    <div class="gl panel2 rise" style="--dl:280ms"><div class="h">Качает навыки</div><div class="chipsr"><span class="chipr">Слух</span><span class="chipr">Речь</span></div></div>
    <div style="flex:1"></div><div class="wcta t">${I('mic')}Начать разговор</div>`);
  const TALK = [['Hi! Are you waiting for someone?', 'Привет! Ты кого-то ждёшь?', 0], ['Yes, I am waiting for my friend.', '', 1], ['Great. Can I get you a coffee?', 'Отлично. Принести тебе кофе?', 0], ['Yes, please. Thank you!', '', 1]];
  function dTalk(ph, auto) {
    const G = timers(); let n = 0;
    $(ph, '.lay').innerHTML = `${top({ mid: '<div class="ttl" style="text-align:center">Кофе с коллегой</div>', right: '<span class="gpill rn">1 / 4</span>' })}
      <div class="chat" style="margin-top:18px;flex:1"></div>
      <div class="hints"><div class="hn t">${I('trend', 's16')}&nbsp;Подсказка</div><div class="hn t">Yes, please</div><div class="hn t">Thank you</div></div>
      <div class="inp"><div class="fld2">Напиши или скажи</div><div class="micb t">${I('mic')}</div></div>`;
    const chat = $(ph, '.chat');
    const say = () => {
      if (n >= TALK.length) return; const [t, tr, me] = TALK[n], i = n; n += 1; $(ph, '.rn').textContent = `${Math.min(4, i + 1)} / 4`;
      if (!me) { const w = document.createElement('div'); w.className = 'bub rise'; w.innerHTML = `<span class="typing">${[0, 1, 2].map((k) => `<i style="--k:${k}"></i>`).join('')}</span>`; chat.appendChild(w); G.after(900, () => { w.innerHTML = `${t}<span class="tr">${tr}</span>`; again(w, 'rise'); if (auto) G.after(1300, say); }); }
      else { const b = document.createElement('div'); b.className = 'bub r rise'; b.textContent = t; chat.appendChild(b); log('диалог: моя реплика', i); if (auto) G.after(1000, say); }
    };
    $(ph, '.micb').addEventListener('click', say); $(ph, '.hints').addEventListener('click', say);
    G.after(500, say);
    return () => G.clear();
  }
  const dCoach = EL.result({ title: 'Кофе с коллегой', ring: { v: 4, of: 4, p: 1, label: 'реплики' }, h1: 'Тебя поняли с первого раза', h2: 'Одна подсказка за весь разговор', cta: 'Следующая сцена', cta2: 'Повторить эту', coins: 20,
    panels: [EL.P.note('Что сказать точнее', '«I wait my friend» → «I am waiting for my friend»: действие идёт сейчас.'), EL.P.chips('Новые фразы в копилке', ['Can I get you…', 'Yes, please']), EL.P.star([['Речь', .36], ['Слух', .2]])] });

  /* ---------- наборы и карточки ---------- */
  const PK = [['pc2', 'B2 глаголы', 126, 3, 11], ['pc1', 'Фразы для поездок', 48, 12, 40], ['pc3', 'Офисный английский', 64, 7, 22], ['pc4', 'Из видео: кафе', 20, 5, 9]];
  const pHub = stat(`${top({ back: true, mid: '<div class="ttl">Карточки</div>', right: `<div class="gbtn t">${I('plus')}</div>` })}
    <div class="hero3" style="margin-top:14px"><div class="over">Сегодня к повторению</div><div class="big"><span class="due">0</span> карточек</div></div>
    <div class="wcta t" style="margin-top:14px">${I('play')}Тренироваться</div>
    <div class="over" style="margin-top:22px">Твои наборы</div>
    <div class="pgrid">${PK.map(([c, n, k, h, u], i) => `<div class="pcard ${c} rise t" style="--dl:${i * 80}ms"><div class="e">${n}</div><div class="r"><span>${k} карт.</span>${I('heart')}${h}${I('people')}${u}</div></div>`).join('')}</div>
    <div class="quietl t" style="margin-top:16px">Наборы сообщества ${'›'}</div>`, (ph, G) => { G.after(400, () => count($(ph, '.due'), 0, 29, 900)); });
  const wasPHub = was(`<div class="topbar"><div class="rb l">${I('arrowL')}</div><div class="rb l">${I('plus')}</div></div><div class="lt"><div class="ti">Карточки</div><div class="su">Учи слова наборами</div></div><div class="sec"><div class="ti">Ваши карточки</div></div><div class="stack">${PK.slice(0, 3).map(([, n, k]) => `<div class="card"><div class="row"><div class="tile">${I('layers', 's20')}</div><div class="tx"><div class="tt">${n}</div></div><span class="cntp">${k}</span><span class="ch">${I('fwd', 's18')}</span></div></div>`).join('')}</div><div style="height:26px"></div><div class="cta">Тренироваться с карточками<span class="ar">${I('arrowR', 's20')}</span></div>`);
  function pPack(ph, auto) {
    const G = timers(); let liked = false;
    $(ph, '.lay').innerHTML = `${top({ back: true, right: `<div class="gbtn t">${I('dotsH')}</div>` })}
      <div class="hero3" style="margin-top:8px"><div class="big">B2 глаголы</div><div class="sub" style="margin-top:6px;display:flex;align-items:center;gap:8px">${K.coinImg(12, 22)}Анна · 126 карточек</div></div>
      <div class="acts" style="justify-content:flex-start"><span class="gpill t lk">${I('heart', 's18')}<span class="num hc">3</span></span><span class="gpill t cm">${I('chat', 's18')}<span class="num">1</span></span><span class="gpill">${I('people', 's18')}11</span></div>
      <div class="wcta t" style="margin-top:16px">Добавить себе ${I('plus', 's18')}</div>
      <div class="hl2">${[['hire', 'нанимать'], ['quit', 'уйти, бросить'], ['tend to', 'иметь склонность'], ['pitch in', 'скинуться, помочь']].map(([e, r], i) => `<div class="gl wr rise" style="--dl:${i * 60}ms"><div class="wv">${[0, 1, 2, 3].map((k) => `<i style="--k:${k}"></i>`).join('')}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div></div></div>`).join('')}</div>
      <div class="gl toast2"></div>`;
    const like = () => { if (liked) return; liked = true; $(ph, '.lk').classList.add('on'); const h = $(ph, '.hc'); h.textContent = 4; bump(h); toast(ph, G, `${starSvg(34, skAxes())}<span>«Социальный» растёт: +1 за сердечко</span>`); log('набор: сердечко → «Социальный»'); };
    $(ph, '.lk').addEventListener('click', like);
    if (auto) G.after(2000, like);
    return () => G.clear();
  }
  const CARDS = [['hire', 'нанимать на работу', 'They hire new people in May.'], ['quit', 'уйти, бросить', 'She quit her job last year.'], ['tend to', 'иметь склонность', 'I tend to agree.']];
  function pCard(ph, auto) {
    const G = timers(); let i = 0;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">B2 глаголы</div>', right: '<span class="gpill rn">1 / 126</span>' })}
      <div style="flex:.5"></div><div class="flipw"><div class="flip"><div class="f1"><div class="w1"></div><div class="w2">Нажми, чтобы перевернуть</div></div><div class="f2"><div class="w1" style="font-size:28px"></div><div class="w2"></div></div></div></div>
      <div class="acts"><span class="gpill t bk1">${I('bookmark', 's18')}Учу</span><span class="gpill t">${I('vol', 's18')}Слушать</span><span class="gpill t nx">Дальше ${I('fwd', 's18')}</span></div><div style="flex:1"></div>`;
    const flip = $(ph, '.flip');
    const draw = () => { const [e, r, x] = CARDS[i % CARDS.length]; $(flip, '.f1 .w1').textContent = e; $(flip, '.f2 .w1').textContent = r; $(flip, '.f2 .w2').textContent = x; $(ph, '.rn').textContent = `${i + 1} / 126`; };
    const next = () => { flip.classList.remove('on'); again($(ph, '.flipw'), 'rise'); i += 1; G.after(120, draw); log('карточка: следующая'); };
    flip.addEventListener('click', () => flip.classList.toggle('on')); $(ph, '.nx').addEventListener('click', next); $(ph, '.bk1').addEventListener('click', (e) => e.currentTarget.classList.toggle('on'));
    draw();
    if (auto) { G.after(1600, () => flip.classList.add('on')); G.after(3600, next); G.after(5000, () => flip.classList.add('on')); G.after(6200, () => $(ph, '.bk1').classList.add('on')); }
    return () => G.clear();
  }
  const pCatalog = stat(`${top({ back: true, mid: '<div class="ttl">Наборы сообщества</div>', right: `<div class="gbtn t">${I('search')}</div>` })}
    <div class="tabs3"><div class="on">Лучшее</div><div>Новые</div><div>Из видео</div></div>
    <div class="hl2">${[['Фразы для поездок', 'Тимур · 48 карточек', 40], ['Офисный английский', 'Оля · 64 карточки', 22], ['B2 глаголы', 'Анна · 126 карточек', 11], ['Small talk', 'Дима · 30 карточек', 9]].map(([e, r, u], i) => `<div class="gl hrow rise t" style="--dl:${i * 70}ms"><div class="ic">${I('layers')}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div></div><span class="rt2" style="display:flex;gap:6px;align-items:center">${I('people', 's16')}${u}</span></div>`).join('')}</div>
    <div class="gl panel2 rise" style="margin-top:14px;--dl:320ms"><div class="h">Опубликуй свой набор</div><div class="sub" style="margin-top:4px">Каждый, кто добавит его себе, поднимает твой навык «Социальный».</div></div>`);

  /* ---------- друзья ---------- */
  const ANNA = [14, 17, 11, 12, 8, 15].map((lv, i) => ({ nm: NAMES[i], lv, p: .4 }));
  const fProfile = stat(`${top({ back: true, mid: '<div class="ttl">Анна</div>', right: `<div class="gbtn t">${I('dotsH')}</div>` })}
    <div class="scrollin" style="padding-bottom:110px"><div style="height:10px"></div>
      <div class="gl vcard">${K.coinImg(12, 84).replace('class="coin"', 'class="av"')}<div class="nm">Анна<span class="protag">PRO</span></div><div class="mt">Серия 41 день · ранг 12 · в друзьях с октября</div>
        <div class="starbox" style="width:240px;height:240px">${starSvg(240, skAxes(ANNA), { other: skAxes(), from: zero })}${starLabels(240, NAMES)}</div><div class="sub">Пунктир — ты</div></div>
      <div class="gl panel2" style="margin-top:12px"><div class="h">Её неделя</div><div class="b7">${[['Пн', 60], ['Вт', 80], ['Ср', 45], ['Чт', 100], ['Пт', 70], ['Сб', 30], ['Вс', 55]].map(([d, v]) => `<div${v === 100 ? ' class="best"' : ''}><i data-h="${v}"></i>${d}</div>`).join('')}</div></div>
      <div class="gl panel2"><div class="h">Её наборы</div><div class="chipsr"><span class="chipr">B2 глаголы</span><span class="chipr">Small talk</span></div></div>
    </div><div class="dock"><div class="wcta t">${I('play')}Догнать в навыке «Речь»</div></div>`, (ph, G) => {
    let stop = () => {}; G.after(400, () => { stop = starTween($(ph, '.starsvg'), zero, skAxes(ANNA), 1400); $$(ph, '.b7 i').forEach((b, i) => G.after(i * 70, () => { b.style.height = b.dataset.h + '%'; })); });
    log('друг: профиль с навыками'); return () => stop();
  });
  const fGoal = stat(`${top({ back: true, mid: '<div class="ttl">Цель недели вместе</div>' })}
    <div class="goalr"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" stroke="rgba(255,255,255,.16)"/><circle class="g2" cx="100" cy="100" r="88" stroke="rgba(255,255,255,.5)" stroke-dasharray="553" stroke-dashoffset="553" style="transition:stroke-dashoffset 1400ms cubic-bezier(.2,.8,.2,1)"/><circle class="g1" cx="100" cy="100" r="88" stroke="#fff" stroke-dasharray="553" stroke-dashoffset="553" style="transition:stroke-dashoffset 1400ms cubic-bezier(.2,.8,.2,1)"/></svg><div class="mid"><b><span class="gn">0</span> / 20</b><span>занятий на двоих</span></div></div>
    <div class="hero2" style="margin-top:18px"><div class="t1">Ты и Анна: осталось шесть</div><div class="t2">До воскресенья. Закроете — у обоих вырастет «Социальный».</div></div>
    <div class="hl2" style="margin-top:4px"><div class="gl frow">${K.coinImg(7, 44).replace('class="coin"', 'class="av2"')}<div class="tx"><div class="e">Ты</div><div class="r">6 занятий</div></div><span class="rt2" style="font-weight:700">6</span></div><div class="gl frow">${K.coinImg(12, 44).replace('class="coin"', 'class="av2"')}<div class="tx"><div class="e">Анна</div><div class="r">8 занятий</div></div><span class="rt2" style="font-weight:700">8</span></div></div>
    <div style="flex:1"></div><div class="wcta t">${I('play')}Внести своё занятие</div>`, (ph, G) => { G.after(400, () => { $(ph, '.g2').style.strokeDashoffset = 553 * (1 - 14 / 20); $(ph, '.g1').style.strokeDashoffset = 553 * (1 - 6 / 20); count($(ph, '.gn'), 0, 14, 1300); }); });

  const S = [
    { id: 's-dialogs', title: 'Диалоги: раздел и сам разговор', lead: 'Раздел ведёт одной кнопкой «Продолжить диалог». Перед разговором — задача и фразы, которые пригодятся. В разговоре собеседник «печатает», под полем — подсказки. Итог — общий экран завершения с ростом «Речи» и «Слуха».',
      screens: [
        { id: 'd-hub', fn: dHub, lbl: 'Диалоги · раздел', was: wasDHub },
        { id: 'd-brief', fn: dBrief, lbl: 'Перед разговором' },
        { id: 'd-talk', fn: dTalk, cls: 'deep', lbl: 'Сам диалог', note: 'Нажатие на микрофон или подсказку отправляет следующую реплику.' },
        { id: 'd-coach', fn: dCoach, lbl: 'Итог диалога', note: 'Тот же общий итог, что у остальных режимов.' },
      ] },
    { id: 's-packs', title: 'Наборы и карточки', lead: 'На главном экране наборов одна кнопка «Тренироваться» и число карточек к повторению. Наборы стали цветными плитками. Сердечко и комментарий к чужому набору качают «Социальный».',
      screens: [
        { id: 'p-hub', fn: pHub, lbl: 'Карточки · главный экран', was: wasPHub },
        { id: 'p-pack', fn: pPack, lbl: 'Набор: сердечко качает «Социальный»', note: 'После сердечка внизу всплывает строка с ростом навыка.' },
        { id: 'p-card', fn: pCard, cls: 'deep', lbl: 'Карточка: переворот', note: 'Нажатие переворачивает карточку, «Дальше» листает.' },
        { id: 'p-catalog', fn: pCatalog, lbl: 'Наборы сообщества' },
      ] },
    { id: 's-friends', title: 'Друзья: профиль и общая цель', lead: 'Список друзей со звёздами и сравнение — в разделе навыков. Здесь профиль друга целиком и цель недели на двоих.',
      screens: [
        { id: 'f-profile', fn: fProfile, lbl: 'Профиль друга: навыки, неделя, наборы', note: 'Экран прокручивается. Пунктиром — твоя звезда.' },
        { id: 'f-goal', fn: fGoal, lbl: 'Цель недели вместе' },
      ] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { social: S });
  if (document.body.dataset.page === 'social') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
