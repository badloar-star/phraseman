/* Страница «Навыки и уровни» (владелец 11.11: «из показателей собери уровни… звезда… на всех экранах завершения… визитка… друзья»).
   Решения из опроса: шесть навыков, 30 уровней только вверх, «Социальный» от сердечек/комментариев, своих наборов, друзей и Пика;
   друзьям навыки видны всегда, посторонним — по визитке Pro. Данные навыков — EL.SK (одни на все экраны). */
(() => {
  const { I, $, $$, log, timers, count, bump, top, segs, coins, SK, LVMAX, need, axis, skAxes, starSvg, starLabels, starTween, mount } = EL;
  const NAMES = SK.map((s) => s.nm), zero = SK.map(() => 0);
  const PUMP = {
    'Слух': 'Видео, диалоги, игра «На слух», задания на слух в уроках и в Пике',
    'Речь': 'Режим «Устно», диалоги голосом, задания с микрофоном в уроках',
    'Словарь': 'Слова урока, карточки и наборы, игры «Память» и «Точное слово»',
    'Грамматика': 'Уроки и теория, неправильные глаголы, предлоги, экзамены, работа над ошибками',
    'Скорость': 'Игра «Поток», «Блиц», «Гонка с собой», ступени Пика на время',
    'Социальный': 'Сердечки и комментарии к наборам, свои наборы, друзья, неделя в комнате Пика',
  };
  const left = (s) => Math.round((1 - s.p) * need(s.lv));

  /* ---------- 1 · экран «Навыки» ---------- */
  function skills(ph, auto) {
    const G = timers(); let stop = () => {};
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Навыки</div>', right: `<span class="gpill">Всего ${SK.reduce((a, s) => a + s.lv, 0)}</span>` })}
      <div class="starbox" style="width:290px;height:290px;margin-top:2px">${starSvg(290, skAxes(), { from: zero })}${starLabels(290, NAMES)}</div>
      <div class="gl skl" style="margin-top:0;padding:2px 16px">${SK.map((s, i) => `<div class="sk2" data-i="${i}"><div class="nm">${s.nm}<span>ещё ${left(s)} до ${s.lv + 1}</span></div><div class="bar"><i></i></div><div class="lv2">ур.<b>${s.lv}</b></div></div>`).join('')}</div>
      <div class="dim2"></div><div class="sh2"><div class="grab2"></div><div class="shc"></div></div>`;
    const sh = $(ph, '.sh2'), dim = $(ph, '.dim2');
    const open = (i) => {
      const s = SK[i]; $$(ph, '.starbox .lb').forEach((l, k) => l.classList.toggle('on', k === i));
      $(ph, '.shc').innerHTML = `<div class="over">Уровень ${s.lv} из ${LVMAX}</div><div class="big" style="margin-top:4px">${s.nm}</div>
        <div class="bar" style="height:8px;margin-top:16px"><i style="--p:${s.p}"></i></div><div class="sub" style="margin-top:8px">До уровня ${s.lv + 1} осталось ${left(s)} очков</div>
        <div class="over" style="margin-top:18px">От чего растёт</div><div style="font-size:16px;line-height:22px;margin-top:4px;font-weight:500">${PUMP[s.nm]}</div>
        <div class="miles">${[10, 20, 30].map((m) => `<div class="${s.lv >= m ? 'got' : ''}"><b>${m}</b>${m === 30 ? 'мастер' : 'рубеж'}</div>`).join('')}</div>
        `;
      sh.classList.add('on'); dim.classList.add('on'); log('навыки: открыт', s.nm);
    };
    const close = () => { sh.classList.remove('on'); dim.classList.remove('on'); $$(ph, '.starbox .lb').forEach((l) => l.classList.remove('on')); };
    $(ph, '.skl').addEventListener('click', (e) => { const r = e.target.closest('.sk2'); if (r) open(+r.dataset.i); });
    dim.addEventListener('click', close);
    G.after(350, () => { stop = starTween($(ph, '.starsvg'), zero, skAxes(), 1400); $$(ph, '.sk2 .bar i').forEach((b, i) => G.after(i * 80, () => b.style.setProperty('--p', SK[i].p))); });
    if (auto) { G.after(2600, () => open(1)); G.after(6200, close); }
    return () => { G.clear(); stop(); };
  }

  /* ---------- 2 · история «уровень поднялся» ---------- */
  function story(ph, auto) {
    const G = timers(); let stop = () => {}, slide = 0; const i = 2, s = SK[i], before = skAxes(), after = SK.map((x, k) => axis(x.lv + (k === i ? 1 : 0), k === i ? 0 : x.p));
    $(ph, '.lay').innerHTML = `${segs(2, 0, 'margin-top:0')}<div class="top" style="margin-top:10px"><div class="gbtn t">${I('close')}</div><div style="flex:1"></div>${coins()}</div>
      <div class="stry s0"><div class="over">Новый уровень</div><div class="big" style="margin-top:4px">${s.nm}</div><div class="hugen" style="margin-top:6px">${s.lv}</div>
        <div class="starbox" style="width:230px;height:230px;margin-top:2px"><div class="pulse"></div><div class="burst">${Array.from({ length: 18 }, (_, k) => `<i style="--k:${k};--a:${k * 20}deg;--r:${110 + (k % 3) * 34}"></i>`).join('')}</div>${starSvg(230, before)}${starLabels(230, NAMES)}</div>
        <div class="sub" style="margin-top:14px;max-width:300px">За две недели ты узнал 46 новых слов. Луч «Словарь» стал длиннее.</div>
        <div style="flex:1"></div><div class="wcta t">Поделиться</div></div>
      <div class="stry s1 hid"><div class="over">Что дальше</div><div class="big" style="margin-top:4px">До уровня ${s.lv + 2}</div>
        <div class="gl panel2" style="width:100%;margin-top:26px;text-align:left"><div class="kv"><div class="tx">${s.nm}</div><span class="lvb">уровень <b>${s.lv + 1}</b></span></div><div class="bar"><i class="nx"></i></div><div class="sub" style="margin-top:8px">Нужно ${need(s.lv + 1)} очков</div></div>
        <div class="gl panel2" style="width:100%;text-align:left"><div class="h">Быстрее всего растёт</div><div class="sub" style="margin-top:4px">от карточек и игры «Память»</div></div>
        <div style="flex:1"></div><div class="wcta t">${I('play')}Тренировать словарь</div></div>`;
    const sg = $$(ph, '.segs i');
    const show = (n) => {
      slide = n; $(ph, '.s0').classList.toggle('hid', n !== 0); $(ph, '.s1').classList.toggle('hid', n !== 1); sg.forEach((x, k) => x.style.setProperty('--p', k < n ? 1 : 0));
      sg[n].style.transition = 'none'; void sg[n].offsetWidth; sg[n].style.transition = ''; G.after(60, () => { sg[n].style.setProperty('--p', 1); });
      if (n === 0) { G.after(500, () => { stop = starTween($(ph, '.starsvg'), before, after, 1400); count($(ph, '.hugen'), s.lv, s.lv + 1, 500); bump($(ph, '.hugen')); $(ph, '.burst').classList.add('go'); $(ph, '.pulse').classList.add('go'); $(ph, `.starbox .lb[data-i="${i}"]`).classList.add('on'); }); log('история: уровень', s.nm, s.lv + 1); }
      else G.after(300, () => $(ph, '.nx').style.setProperty('--p', .12));
    };
    ph.querySelector('.lay').addEventListener('click', (e) => { if (e.target.closest('.wcta,.gbtn')) return; if (slide === 0) show(1); });
    show(0); if (auto) G.after(4600, () => show(1));
    return () => { G.clear(); stop(); };
  }

  /* ---------- 3–4 · визитки ---------- */
  const chips = (list) => `<div class="lvchips">${list.map((s) => `<div><b>${s.lv}</b>${s.nm}</div>`).join('')}</div>`;
  const ANNA = [['Слух', 14, .2], ['Речь', 17, .5], ['Словарь', 11, .6], ['Грамматика', 12, .1], ['Скорость', 8, .4], ['Социальный', 15, .7]].map(([nm, lv, p]) => ({ nm, lv, p }));
  function cardPro(ph) {
    const G = timers(); let stop = () => {};
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Визитка</div>' })}
      <div class="gl vcard" style="margin-top:14px">${K.coinImg(12, 84).replace('class="coin"', 'class="av"')}<div class="nm">Анна<span class="protag">PRO</span></div><div class="mt">Серия 41 день · ранг 12</div>
        <div class="starbox" style="width:250px;height:250px">${starSvg(250, skAxes(ANNA), { from: zero })}${starLabels(250, NAMES)}</div>${chips(ANNA)}</div>
      <div style="flex:1"></div><div class="wcta t">Добавить в друзья</div>`;
    G.after(400, () => { stop = starTween($(ph, '.starsvg'), zero, skAxes(ANNA), 1400); });
    log('визитка Pro: навыки видны постороннему');
    return () => { G.clear(); stop(); };
  }
  function cardFree(ph, auto) {
    const G = timers(); let mine = true;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Моя визитка</div>' })}
      <div class="seg2" style="margin-top:12px"><div class="on t" data-v="1">Вижу я</div><div class="t" data-v="0">Видит посторонний</div></div>
      <div class="gl vcard" style="margin-top:14px">${K.coinImg(7, 84).replace('class="coin"', 'class="av"')}<div class="nm">Максим</div><div class="mt">Серия 12 дней · ранг 7</div>
        <div class="veilw"><div class="veil"><div class="starbox" style="width:220px;height:220px">${starSvg(220, skAxes())}${starLabels(220, NAMES)}</div>${chips(SK)}</div><div class="lockn">${I('lockF', 's24')}Навыки скрыты</div></div></div>
      <div class="gl panel2 hint" style="margin-top:12px;transition:opacity 300ms"><div class="h">Сейчас навыки видишь ты и друзья</div><div class="sub" style="margin-top:4px">С визиткой Pro звезду и уровни увидят все.</div></div>
      <div style="flex:1"></div><div class="wcta t">Открыть Pro</div>`;
    const set = (v) => { mine = v; $$(ph, '.seg2 div').forEach((d) => d.classList.toggle('on', (d.dataset.v === '1') === v)); $(ph, '.veil').classList.toggle('off', !v); $(ph, '.lockn').classList.toggle('on', !v); $(ph, '.hint .h').textContent = v ? 'Сейчас навыки видишь ты и друзья' : 'Так визитку видит посторонний'; log('визитка обычная: вид', v ? 'свой' : 'посторонний'); };
    $(ph, '.seg2').addEventListener('click', (e) => { const d = e.target.closest('[data-v]'); if (d) set(d.dataset.v === '1'); });
    if (auto) { G.after(2400, () => set(false)); G.after(5200, () => set(true)); }
    return () => G.clear();
  }

  /* ---------- 5 · друзья: список и сравнение ---------- */
  const FR = [{ n: 'Анна', r: 12, sk: ANNA }, { n: 'Тимур', r: 9, sk: [10, 7, 15, 13, 12, 5] }, { n: 'Оля', r: 5, sk: [6, 9, 8, 7, 4, 11] }, { n: 'Дима', r: 3, sk: [4, 3, 6, 5, 7, 2] }]
    .map((f) => ({ ...f, sk: f.sk.map((x, i) => (typeof x === 'number' ? { nm: NAMES[i], lv: x, p: .4 } : x)) }));
  function friends(ph, auto) {
    const G = timers(); let stop = () => {};
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Друзья</div>', right: `<div class="gbtn t">${I('plus')}</div>` })}
      <div class="wl" style="margin-top:16px">${FR.map((f, i) => { const best = f.sk.reduce((a, b) => (b.lv > a.lv ? b : a)); return `<div class="gl frow rise" style="--dl:${i * 70}ms" data-i="${i}">${K.coinImg(f.r, 44).replace('class="coin"', 'class="av2"')}<div class="tx"><div class="e">${f.n}</div><div class="r">Сильнее всего: ${best.nm} · ${best.lv}</div></div>${starSvg(54, skAxes(f.sk))}</div>`; }).join('')}</div>
      <div class="quietl" style="margin-top:16px">Навыки друзей видны всегда</div>
      <div class="dim2"></div><div class="sh2" style="padding-bottom:34px"><div class="grab2"></div><div class="shc"></div></div>`;
    const sh = $(ph, '.sh2'), dim = $(ph, '.dim2');
    const open = (i) => {
      const f = FR[i];
      $(ph, '.shc').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="big" style="font-size:28px">Ты и ${f.n}</div><div class="over">пунктир — ${f.n}</div></div>
        <div class="starbox" style="width:250px;height:250px">${starSvg(250, skAxes(), { other: skAxes(f.sk), from: zero })}${starLabels(250, NAMES)}</div>
        ${SK.map((s, k) => `<div class="cmp"><b>${s.lv}</b><div class="bar rv"><i style="--p:${s.lv / LVMAX}"></i></div><span>${s.nm}</span><div class="bar oth"><i style="--p:${f.sk[k].lv / LVMAX}"></i></div><b>${f.sk[k].lv}</b></div>`).join('')}
        <div class="wcta t" style="margin-top:14px">${I('play')}Догнать в навыке «Речь»</div>`;
      sh.classList.add('on'); dim.classList.add('on'); stop(); stop = starTween($(sh, '.starsvg'), zero, skAxes(), 1200, 300); log('друзья: сравнение с', f.n);
    };
    $(ph, '.wl').addEventListener('click', (e) => { const r = e.target.closest('.frow'); if (r) open(+r.dataset.i); });
    dim.addEventListener('click', () => { sh.classList.remove('on'); dim.classList.remove('on'); });
    if (auto) G.after(2200, () => open(0));
    return () => { G.clear(); stop(); };
  }

  /* ---------- таблица «что качает что» ---------- */
  const MX = [['Уроки: сборка фраз', '..sB..'], ['Теория и её задания', '...B..'], ['Слова урока, словарь', '..B...'], ['Неправильные глаголы, предлоги', '..sB..'], ['Экзамены', '..sB..'], ['Работа над ошибками', '..sB..'],
    ['Карточки: блиц', '..B.B.'], ['Карточки: смахни, напиши', '..B...'], ['Карточки: устно', '.B.s..'], ['Диалоги', 'BB.s..'], ['Видео', 'B.s...'], ['Пик: ступени', 's.ssBs'], ['Разминка: три игры', 's.ssB.'],
    ['Сердечки и комментарии', '.....B'], ['Свои наборы, которые добавили другие', '..s..B'], ['Друзья, цель недели вместе', '.....B'], ['Неделя в комнате Пика', '.....B']];
  const matrix = `<table class="mtx"><tr><th>Что делает человек</th>${NAMES.map((n) => `<th>${n}</th>`).join('')}</tr>${MX.map(([a, m]) => `<tr><td>${a}</td>${[...m].map((c) => `<td>${c === 'B' ? '<i></i>' : c === 's' ? '<i class="s"></i>' : ''}</td>`).join('')}</tr>`).join('')}</table>
    <p style="margin-top:10px">Большая точка — главный навык занятия, малая — попутный. У навыка «Социальный» дневной потолок, чтобы его нельзя было накрутить сердечками.</p>`;

  const lessonResult = () => window.ELS.results.screens[0];
  const S = [
    { id: 'sk-main', title: 'Навыки: звезда и 30 уровней', lead: 'Шесть навыков — шесть концов звезды. У каждого 30 уровней, уровень только растёт. Экран открывается нажатием на блок навыков в «Статистике». Одинаково у бесплатных и у Plus.',
      screens: [
        { id: 'sk-skills', fn: skills, lbl: 'Экран «Навыки»', note: 'Нажатие на строку открывает навык: сколько осталось до уровня и от чего он растёт.' },
        { id: 'sk-story', fn: story, cls: 'deep', lbl: 'История «уровень поднялся»', note: 'Живёт в историях, а не всплывает поверх урока. Нажатие листает на второй кадр.' },
      ] },
    { id: 'sk-result', title: 'На каждом экране завершения звезда растёт', lead: 'Блок «Навыки растут» стоит на итоге любого режима. Полоса доходит до конца — уровень щёлкает, луч звезды удлиняется. Ниже — итог урока; остальные семь итогов показывают то же на своих навыках.',
      screens: [], lazy: true },
    { id: 'sk-social', title: 'Визитка и друзья', lead: 'Друзья видят навыки всегда. Посторонние — только на визитке Pro. На обычной визитке владелец видит свою звезду и подсказку, что Pro покажет её всем.',
      screens: [
        { id: 'sk-pro', fn: cardPro, lbl: 'Визитка Pro глазами постороннего', note: 'Звезда и шесть уровней открыты всем.' },
        { id: 'sk-free', fn: cardFree, lbl: 'Обычная визитка: что вижу я и что видит посторонний', note: 'Переключатель сверху показывает оба вида.' },
        { id: 'sk-friends', fn: friends, lbl: 'Друзья: звезда у каждого и сравнение', note: 'Нажатие на друга накладывает его звезду пунктиром на твою.' },
      ] },
    { id: 'sk-matrix', title: 'Что качает что', lead: 'Одна таблица связывает все разделы приложения с навыками. Она же — задание для будущей формулы.', html: matrix, screens: [] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { skills: S, skillsLesson: lessonResult });
  if (document.body.dataset.page === 'skills') document.addEventListener('DOMContentLoaded', () => { S[1].screens = [Object.assign({}, lessonResult(), { id: 'sk-lesson', was: null, lbl: 'Итог урока: «Грамматика» берёт новый уровень' })]; mount(S); });
})();
