/* Страница «Вход, итоги, статистика» (владелец 11.11): где живёт разминка, как она идёт без выбора,
   общий итог для каждого режима и раздел «Статистика» — всё рядом с тем, как было. */
(() => {
  const { I, $, $$, log, timers, count, bump, was, top, segs, coins, P, result, wasResult, mount } = EL;
  const row = (ic, tt, st, right = '') => `<div class="card"><div class="row"><div class="tile">${I(ic, 's20')}</div><div class="tx"><div class="tt">${tt}</div>${st ? `<div class="st">${st}</div>` : ''}</div>${right}<span class="ch">${I('fwd', 's18')}</span></div></div>`;

  /* ---------- 1 · «Сегодня»: разминка вместо «исправь 5 ошибок» ---------- */
  const TASKS = [['Пройти урок', '0/1'], ['Потренировать диалог', '0/1'], ['Разминка · 3 игры', '0/3']];
  function today(ph, auto) {
    const G = timers();
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Сегодня</div>', right: coins() })}
      <div class="hero3"><div class="over">Среда, 11 ноября</div><div class="big" style="margin-top:6px">Разминка<br>на 4 минуты</div><div class="sub" style="margin-top:8px">Три игры из твоих ошибок. Идут подряд, выбирать не нужно.</div></div>
      <div class="mixrow">${[['boltF', 'Поток'], ['check', 'Лишнее слово'], ['layers', 'Сортировка']].map(([ic, n]) => `<div class="gl mx">${I(ic, 's20')}<span>${n}</span></div>`).join('')}</div>
      <div class="wcta t" style="margin-top:18px">${I('play')}<span class="lb">Начать</span></div>
      <div class="gl tasks"><div class="hd">Задания дня<span class="fr3">0 из 3</span></div>${TASKS.map(([n, f], i) => `<div class="tk${i === 2 ? ' hl' : ''}"><div class="o">${I('check')}</div><div class="nm">${n}</div><div class="fr2">${f}</div></div>`).join('')}</div>`;
    const mx = $$(ph, '.mx'), tk = $$(ph, '.tk')[2], lb = $(ph, '.lb');
    const play = () => {
      if (ph.dataset.busy) return; ph.dataset.busy = '1'; log('сегодня: разминка стартовала одним нажатием');
      mx.forEach((m, i) => { G.after(i * 1300, () => { mx.forEach((x) => x.classList.remove('on')); m.classList.add('on'); lb.textContent = `Идёт · ${m.textContent}`; }); G.after(i * 1300 + 1200, () => { m.classList.remove('on'); m.classList.add('dn'); $(tk, '.fr2').textContent = `${i + 1}/3`; bump($(tk, '.fr2')); }); });
      G.after(4000, () => { tk.classList.add('dn'); $(ph, '.fr3').textContent = '1 из 3'; lb.textContent = 'Дальше · Пройти урок'; const c = $(ph, '.cn'); count(c, 1240, 1290, 650); bump(c); delete ph.dataset.busy; });
    };
    $(ph, '.wcta').addEventListener('click', play);
    if (auto) G.after(1500, play);
    return () => { G.clear(); delete ph.dataset.busy; };
  }

  /* ---------- 2 · между играми: сам считает и сам идёт дальше ---------- */
  const SEQ = [['Поток', 'Фраза мелькает — успей понять смысл'], ['Лишнее слово', 'Убери слово, которое ломает фразу'], ['Сортировка', 'Смахни фразу в свою сторону']];
  function inter(ph, auto) {
    const G = timers(); let i = 0;
    $(ph, '.lay').innerHTML = `${top({ mid: segs(3, 0, 'flex:1;margin:0 6px'), right: '<span class="gpill rn">1 / 3</span>' })}
      <div class="inter"><div class="cnt"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="60" stroke="rgba(255,255,255,.18)"/><circle class="arc" cx="66" cy="66" r="60" stroke="#fff" stroke-dasharray="377" stroke-dashoffset="0"/></svg><div class="n">3</div></div>
        <div class="over">Дальше</div><div class="big nm2" style="margin-top:6px"></div><div class="sub ds2" style="margin-top:8px"></div>
        <div class="quietl t" style="margin-top:26px">Нажми, чтобы начать сразу</div></div>`;
    const arc = $(ph, '.arc'), n = $(ph, '.cnt .n'), box = $(ph, '.inter');
    const step = () => {
      const [nm, ds] = SEQ[i]; $(ph, '.nm2').textContent = nm; $(ph, '.ds2').textContent = ds; $(ph, '.rn').textContent = `${i + 1} / 3`; EL.again(box, 'rise');
      arc.getAnimations().forEach((a) => a.cancel()); arc.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 377 }], { duration: 3000, fill: 'forwards', easing: 'linear' });
      [3, 2, 1].forEach((k, j) => G.after(j * 1000, () => { n.textContent = k; bump(n); }));
      G.after(3000, () => { $$(ph, '.segs i')[i].style.setProperty('--p', 1); log('переход: сам пошёл дальше →', nm); i = (i + 1) % 3; if (i !== 0 || auto) G.after(500, step); });
    };
    box.addEventListener('click', () => { G.clear(); $$(ph, '.segs i')[i].style.setProperty('--p', 1); i = (i + 1) % 3; step(); });
    step();
    return () => { G.clear(); arc.getAnimations().forEach((a) => a.cancel()); };
  }

  /* ---------- 3 · карточки: одна кнопка вместо шторки из четырёх режимов ---------- */
  function mix(ph, auto) {
    const G = timers(); const M = [['boltF', 'Блиц'], ['layers', 'Смахни'], ['edit', 'Напиши'], ['mic', 'Скажи']];
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Карточки</div>', right: coins() })}
      <div class="hero3"><div class="over">B2 глаголы · 126 карточек</div><div class="big" style="margin-top:6px">Тренировка<br>на 5 минут</div><div class="sub" style="margin-top:8px">Режимы меняются сами: сначала узнаёшь, потом пишешь, потом говоришь.</div></div>
      <div class="mixrow">${M.map(([ic, n]) => `<div class="gl mx" style="height:78px">${I(ic, 's20')}<span>${n}</span></div>`).join('')}</div>
      <div class="wcta t" style="margin-top:18px">${I('play')}<span class="lb">Тренироваться</span></div>
      <div class="quietl t">Выбрать один режим</div>
      <div class="gl tasks" style="margin-top:20px"><div class="hd">Что внутри<span>подбирается по памяти</span></div>
        ${[['Ещё учу', '14'], ['Давно не повторял', '9'], ['Новые', '6']].map(([a, b]) => `<div class="tk hl"><div class="nm">${a}</div><div class="fr2">${b}</div></div>`).join('')}</div>`;
    const mx = $$(ph, '.mx');
    const play = () => { log('карточки: одна кнопка, режимы идут сами'); mx.forEach((m, i) => { G.after(i * 900, () => { mx.forEach((x) => x.classList.remove('on')); m.classList.add('on'); $(ph, '.lb').textContent = `Идёт · ${m.textContent}`; }); G.after(i * 900 + 820, () => { m.classList.remove('on'); m.classList.add('dn'); }); }); G.after(3800, () => { $(ph, '.lb').textContent = 'Тренироваться'; mx.forEach((x) => x.classList.remove('dn')); }); };
    $(ph, '.wcta').addEventListener('click', play);
    if (auto) G.after(1500, play);
    return () => G.clear();
  }
  const wasToday = was(`<div class="lt"><div class="ti" style="font-size:34px">Сегодня</div></div><div class="sec"><div class="ti">Задания дня</div><div class="ac">0 из 3</div></div><div class="stack">${row('layers', 'Пройти урок', '', '<span class="cntp">0/1</span>')}${row('chat', 'Потренировать диалог', '', '<span class="cntp">0/1</span>')}${row('edit', 'Исправить ошибки', 'Не менее 5', '<span class="cntp">0/5</span>')}</div>`);
  const wasMix = was(`<div class="lt"><div class="ti" style="font-size:34px">Карточки</div></div><div style="height:150px"></div><div class="card c2" style="padding:20px 16px"><div class="center" style="font-size:22px;font-weight:700">Выбери режим тренировки</div><div style="height:12px"></div>${[['boltF', 'Блиц', 'За 60 секунд находи верные переводы'], ['mic', 'Устно', 'Произноси фразы вслух'], ['check', 'Правда / ложь', 'Сверяй фразу с переводом'], ['edit', 'Вспомни и напиши', 'Вводи фразу целиком по памяти']].map(([ic, a, b]) => `<div class="row" style="padding:10px 0"><div class="tile t46">${I(ic)}</div><div class="tx"><div class="tt">${a}</div><div class="st">${b}</div></div><span class="ch">${I('fwd', 's18')}</span></div>`).join('')}</div>`);

  /* ---------- 4 · итоги всех режимов ---------- */
  const R = [
    { id: 'r-lesson', lbl: 'Урок', w: { title: 'Урок пройден', sub: 'Эпизод 5', stats: [['10', 'верно'], ['2', 'ошибок'], ['83%', 'точность']], btns: ['Ошибки', 'Дальше'] },
      c: { title: 'Урок 1 · эпизод 5', ring: { v: 83, p: .83, suffix: '%', label: 'точность' }, h1: '10 из 12 фраз с первого раза', h2: 'Открыт эпизод 6', cta: 'Следующий эпизод', coins: 20,
        panels: [P.chips('Новые слова', ['cooking', 'dinner', 'messages']), P.mistakes('Разбор ошибок', [['She is writing messages', 'ты собрал: She writing is messages'], ['It is working well', 'ты выбрал: Это работало хорошо']]), P.star([['Грамматика', .2], ['Словарь', .1]]), P.rate()] } },
    { id: 'r-words', lbl: 'Слова урока', w: { title: 'Слова пройдены', sub: 'Урок 1', stats: [['12', 'слов'], ['1', 'ошибка'], ['92%', 'точность']] },
      c: { title: 'Слова · урок 1', ring: { v: 12, of: 12, p: 1, label: 'слов узнал' }, h1: 'Словарь урока собран', h2: 'Четыре слова ушли в карточки', cta: 'К уроку', coins: 10,
        panels: [P.chips('Ещё повторим завтра', ['waiting', 'listening']), P.star([['Словарь', .25]])] } },
    { id: 'r-blitz', lbl: 'Блиц', w: { title: 'Тренировка завершена', sub: 'Счёт: 23', stats: [['23', 'верно'], ['2', 'ошибки'], ['92%', 'точность']], btns: ['Добить: Ещё учу (2)', 'Готово'] },
      c: { title: 'Блиц', ring: { v: 23, p: .77, label: 'за минуту' }, h1: 'На четыре больше, чем вчера', h2: 'Осталось два сердца из трёх', cta: 'Добить: ещё учу (2)', cta2: 'Готово', coins: 15,
        panels: [P.record('Гонка с собой', [['Сегодня', '23', .77], ['Вчера', '19', .63, 1], ['Рекорд', '26', .87, 1]]), P.mistakes('Ещё учу', [['Hire, fire, quit', 'нанимать, увольнять, увольняться'], ['Call it a day', 'закончить на сегодня']]), P.star([['Скорость', .2], ['Словарь', .1]])] } },
    { id: 'r-speak', lbl: 'Устно', w: { title: 'Тренировка завершена', sub: 'Устная тренировка', stats: [['8', 'верно'], ['2', 'ошибок'], ['80%', 'точность']] },
      c: { title: 'Устно', ring: { v: 8, of: 10, p: .8, label: 'сказано чисто' }, h1: 'Тебя понятно с первого раза', h2: 'Две фразы стоит повторить', cta: 'Повторить две фразы', cta2: 'Готово', coins: 15,
        panels: [P.record('Как звучало', [['waiting', 'чисто', .95], ['messages', 'почти', .7, 1], ['usually', 'смазано', .4, 1]]), P.star([['Речь', .36]])] } },
    { id: 'r-tf', lbl: 'Правда / ложь', w: { title: 'Тренировка завершена', sub: 'Правда / ложь', stats: [['17', 'верно'], ['1', 'ошибка'], ['94%', 'точность']] },
      c: { title: 'Смахни', ring: { v: 94, p: .94, suffix: '%', label: 'точность' }, h1: '17 из 18 без подсказки', h2: 'Меньше секунды на ответ', cta: 'Готово', coins: 10,
        panels: [P.mistakes('Где споткнулся', [['We usually wait here', 'это привычка, а не «сейчас»']]), P.star([['Словарь', .12]])] } },
    { id: 'r-write', lbl: 'Вспомни и напиши', w: { title: 'Тренировка завершена', sub: 'Вспомни и напиши', stats: [['7', 'верно'], ['1', 'ошибка'], ['88%', 'точность']] },
      c: { title: 'Вспомни и напиши', ring: { v: 7, of: 8, p: .875, label: 'по памяти' }, h1: 'Семь фраз без подсказки', h2: 'Одна буква подвела', cta: 'Готово', coins: 15,
        panels: [P.diff('Где подвела буква', 'He is coo<u>c</u>ing dinner', 'Верно: cooking — после двух «o» идёт k'), P.star([['Словарь', .2]])] } },
    { id: 'r-mist', lbl: 'Ошибки', w: { title: 'Ошибки разобраны', sub: '5 верно · 1 вернётся позже', stats: [['5', 'верно'], ['1', 'позже'], ['83%', 'точность']] },
      c: { title: 'Ошибки', ring: { v: 5, of: 6, p: .83, label: 'исправлено' }, h1: 'Пять ошибок закрыты', h2: 'Осталось семь в списке', cta: 'Готово', coins: 50,
        panels: [P.note('Вернётся завтра', 'I tend to agree — свяжи значение со всей фразой.'), P.star([['Грамматика', .1]])] } },
    { id: 'r-exam', lbl: 'Экзамен главы', w: { title: 'Экзамен сдан', sub: '11 из 12 верно', stats: [['11', 'верно'], ['1', 'ошибка'], ['92%', 'точность']], btns: ['Разбор ошибок', 'К главе 3'] },
      c: { title: 'Экзамен главы 2', ring: { v: 11, of: 12, p: .92, label: 'нужно 10' }, h1: 'Глава 3 открыта', h2: 'Эпизоды 13–16 доступны', cta: 'К главе 3', cta2: 'Разбор ошибок', coins: 30,
        panels: [P.mistakes('Одна ошибка', [['Does she work here?', 'ты написал: Do she work here?']]), P.star([['Грамматика', .12]])] } },
  ];

  /* ---------- 5 · статистика ---------- */
  const SK = EL.SK.map((x) => [x.nm, 500 * EL.axis(x.lv, x.p), x]); // зачем: те же шесть навыков и уровни, что на экране «Навыки» и на итогах
  function stats(ph) {
    const G = timers(); let raf = 0; const cx = 150, cy = 120, R = 84, N = SK.length;
    const pt = (i, k) => [cx + Math.cos(-Math.PI / 2 + i * 2 * Math.PI / N) * R * k, cy + Math.sin(-Math.PI / 2 + i * 2 * Math.PI / N) * R * k];
    const poly = (k) => SK.map((_, i) => pt(i, typeof k === 'function' ? k(i) : k).map((n) => n.toFixed(1)).join(',')).join(' ');
    const bell = Array.from({ length: 60 }, (_, i) => { const x = i / 59; return `${(x * 354).toFixed(1)},${(58 - 52 * Math.exp(-Math.pow(x - .46, 2) / .052)).toFixed(1)}`; }).join(' L');
    const week = [['Пн', 34], ['Вт', 52], ['Ср', 88], ['Чт', 20], ['Пт', 61], ['Сб', 46], ['Вс', 12]];
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Статистика</div>', right: `<span class="gpill">${I('flame', 's18')}<span class="num">12</span></span>` })}
      <div class="scrollin" style="padding-bottom:40px;-webkit-mask-image:none;mask-image:none"><div style="height:14px"></div>
        <div class="gl panel2"><div class="h">Навыки<span class="newtag">новое</span></div>
          <div class="radar s"><svg viewBox="0 0 300 232">${[.34, .67, 1].map((k) => `<polygon class="grid" points="${poly(k)}"/>`).join('')}<polygon class="shape" points="${poly(0)}"/></svg>${SK.map((s, i) => { const [x, y] = pt(i, 1.22); return `<div class="lb" style="left:${x}px;top:${y}px">${s[0]}</div>`; }).join('')}</div>
          <div class="lvrows">${SK.map(([nm, , x]) => `<div class="lvr"><span>${nm}</span><div class="bar"><i style="--p:${x.p}"></i></div><b>${x.lv}</b></div>`).join('')}</div>
          <div class="sub" style="text-align:center;margin-top:10px">Нажатие открывает экран «Навыки»</div></div>
        <div class="gl panel2"><div class="h">Подтянуть: Социальный<span class="newtag">новое</span></div><div class="sub" style="margin-top:4px">Самая слабая ось. Одна кнопка собирает занятие сама.</div><div class="cta2 t" style="margin-top:12px;background:#fff;color:#0B0C0E">Начать · 5 минут</div></div>
        <div class="gl panel2"><div class="h">Неделя</div><div class="sub" style="margin-top:2px">Лучший день — среда, 44 минуты</div><div class="b7">${week.map(([d, v]) => `<div${v === 88 ? ' class="best"' : ''}><i data-h="${v}"></i>${d}</div>`).join('')}</div></div>
        <div class="gl panel2"><div class="h">Рекорды игр<span class="newtag">новое</span></div><div class="recs">${[['26', 'Блиц · верных за минуту'], ['×1,9', 'Поток · темп'], ['14', 'Лишнее слово · серия'], ['0,8 с', 'Смахни · на ответ']].map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div></div>
        <div class="gl panel2"><div class="h">Год</div><div class="heat2">${Array.from({ length: 84 }, (_, k) => `<i style="--k:${k};background:rgba(255,255,255,${[.1, .1, .28, .5, .1, .85, .28][(k * 5 + (k >> 2)) % 7]})"></i>`).join('')}</div></div>
        <div class="gl panel2"><div class="h">Быстрее, чем <b class="pc">0%</b> учеников уровня A2</div><div class="curve"><svg viewBox="0 0 354 62" preserveAspectRatio="none"><path d="M0,62 L${bell} L354,62 Z" fill="rgba(255,255,255,.14)"/><path d="M${bell}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/></svg><div class="pin"></div></div><div class="sub" style="margin-top:6px">Тот же блок сравнения, что сейчас, — кривая вместо строк</div></div>
      </div>`;
    const shape = $(ph, '.shape');
    G.after(350, () => { const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - p, 3); shape.setAttribute('points', poly((i) => (SK[i][1] / 500) * Math.min(1, Math.max(0, e * 1.5 - i * .1)))); if (p < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); $$(ph, '.b7 i').forEach((b, i) => G.after(i * 70, () => { b.style.height = b.dataset.h + '%'; })); });
    G.after(900, () => { $(ph, '.pin').style.transform = `translateX(${$(ph, '.curve').clientWidth * .72}px)`; count($(ph, '.pc'), 0, 72, 1400, '%'); });
    log('статистика показана');
    return () => { G.clear(); cancelAnimationFrame(raf); };
  }
  const wasStats = was(`<div class="lt"><div class="ti" style="font-size:34px">Статистика</div></div><div style="height:16px"></div><div class="stack g13">
    <div class="card c2" style="padding:16px"><div class="ov">Серия</div><div style="font-size:34px;font-weight:700;margin-top:6px">12 дней</div><div class="bars7">${[40, 60, 100, 25, 70, 50, 15].map((h) => `<i style="height:${h}%"></i>`).join('')}</div></div>
    <div class="card c2" style="padding:16px"><div class="ov">Дни и время</div><div class="st3" style="margin-top:10px"><div><b>5</b><span>дней</span></div><div><b>3 ч</b><span>за неделю</span></div></div></div>
    <div class="card c2" style="padding:16px"><div class="ov">Баланс практики</div><div class="trk" style="margin-top:14px"><i style="width:62%"></i></div><div class="trk" style="margin-top:10px"><i style="width:38%"></i></div><div class="trk" style="margin-top:10px"><i style="width:20%"></i></div></div>
    <div class="card c2" style="padding:16px"><div class="ov">Год</div><div class="heat">${Array.from({ length: 72 }, () => '<i></i>').join('')}</div></div>
    <div class="card c2" style="padding:16px"><div class="lockrow">${I('lockF', 's18')}Сравнение с другими · Plus</div></div></div>`);

  const S = [
    { id: 'entry', title: 'Где живёт разминка и как убрать выбор', lead: 'Разминка — не новый раздел. Она занимает место задания дня «Исправить ошибки» и собирается из тех же ошибок. Запускается одной кнопкой: игры идут подряд сами. По тому же правилу в «Карточках» шторка из четырёх режимов уступает место одной кнопке.',
      screens: [
        { id: 'today', fn: today, lbl: '1 · «Сегодня»: разминка вместо «Исправить ошибки»', was: wasToday, note: 'Одно нажатие — три игры подряд. Задание дня и монеты засчитываются так же, как раньше.' },
        { id: 'inter', fn: inter, cls: 'deep', lbl: '2 · Между играми: отсчёт и сам идёт дальше', note: 'Экран выбора между играми не показывается вообще. Нетерпеливый нажимает и идёт сразу.' },
        { id: 'mix', fn: mix, lbl: '3 · «Карточки»: одна кнопка вместо четырёх режимов', was: wasMix, note: 'Режимы чередуются сами. Ссылка «Выбрать один режим» остаётся для тех, кто хочет по-старому.' },
      ] },
    { id: 'results', title: 'Экраны завершения: один итог на все режимы', lead: 'Сейчас у каждого режима свой итог с тремя цифрами. Новый итог один: кольцо с главным числом режима, одна фраза о результате, разбор ошибок и рост навыка. Меняется только содержимое.',
      screens: R.map((r) => ({ id: r.id, fn: result(r.c), lbl: r.lbl, was: wasResult(r.w) })) },
    { id: 'stats', title: 'Статистика: что заменить и что добавить', lead: 'Серия, неделя и год остаются. «Баланс практики» заменяют навыки — это та же мысль, но понятнее. Сравнение с другими остаётся и получает кривую. Добавляются два блока: «Подтянуть» и «Рекорды игр».',
      screens: [{ id: 'stats', fn: stats, lbl: 'Статистика', was: wasStats, note: 'Экран прокручивается. Блоки с меткой «новое» — добавленные.' }] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { entry: S[0], results: S[1], stats: S[2] });
  if (document.body.dataset.page === 'flow') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
