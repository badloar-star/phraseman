/* Третий проход по настоящим экранам (владелец 11.11: «Да, доснимай»): ответ и разбор в уроке, раздел ошибок с отработкой
   по трём шагам, блиц и итог тренировки карточек. Снимки — assets/elevate-was. Чего не снято (итог урока, сам диалог,
   экзамен, ступень Пика) — здесь не трогается и остаётся предложением. */
(() => {
  const { I, $, $$, log, timers, count, bump, again, top, coins, shot, P } = EL;
  const TOAST = '<div class="gl toast2"></div>';
  const toast = (ph, G, html) => { const t = $(ph, '.toast2'); t.innerHTML = html; t.classList.add('on'); G.after(2200, () => t.classList.remove('on')); };
  const skill = (nm) => `${EL.starSvg(34, EL.skAxes())}<span>«${nm}» растёт</span>`;
  const grid = (arr) => `<div class="ans grid2">${arr.map((t, i) => `<div class="at t" data-i="${i}">${t}</div>`).join('')}</div>`;

  /* ---------- урок: слова принимаются любые, проверка — кнопкой, потом разбор (как сейчас) ---------- */
  const ST = [['Those', 'I', 'Me', 'They', 'It', "I'm"], ['be', 'were', 'was', 'are', 'is', 'am'], ['about', 'since', 'at', 'after', 'behind', 'from'], ['house', 'home', 'here', 'room', 'work', 'there']];
  const OK = ['I', 'am', 'at', 'home'];
  function exercise(ph, auto) {
    const G = timers(); let got = [];
    const tools = (full) => `<div class="tools4">${(full ? [['layers', 'Теория'], ['mic', 'Устно'], ['arrowL', 'Отменить'], ['check', 'Проверить']] : [['close', '50/50'], ['layers', 'Теория'], ['mic', 'Устно'], ['arrowL', 'Отменить']]).map(([ic, t], i) => `<div class="gl t${full && i === 3 ? ' chkb' : ''}" data-t="${t}" style="opacity:1">${I(ic, 's20')}${t}</div>`).join('')}</div>`;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Урок 1</div>', right: coins('0') })}
      <div class="ask" style="margin-top:18px;font-weight:700">Собери фразу:</div><div class="big" style="text-align:center;font-size:30px;margin-top:4px">Я дома.</div>
      <div class="aline"><i class="caret2"></i></div><div class="vz"></div><div style="flex:1"></div><div class="tls"></div>
      <div class="prog"><div class="bar"><i></i></div><span class="pn">1/50</span></div><div class="tw"></div>${TOAST}`;
    const line = $(ph, '.aline'), box = $(ph, '.tls'), tw = $(ph, '.tw');
    const draw = () => { const full = got.length === ST.length; box.innerHTML = full ? '' : grid(ST[got.length]); tw.innerHTML = tools(full); };
    const pick = (el) => { const a = el.getBoundingClientRect(), s = document.createElement('span'); s.textContent = el.textContent; got.push(el.textContent); line.insertBefore(s, $(line, '.caret2')); const b = s.getBoundingClientRect();
      s.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)`, opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1,.3,1)' }); draw(); }; // зачем: слово перелетает в строку; вердикта на каждое слово нет — как в приложении
    const undo = () => { if (!got.length || line.classList.contains('ok')) return; got.pop(); const sp = $$(line, 'span'); sp[sp.length - 1].remove(); draw(); };
    const check = () => {
      const bad = got.map((w, i) => w !== OK[i]); const wrong = bad.some(Boolean); $(ph, '.caret2')?.remove(); log('урок: проверка', got.join(' '), wrong ? 'ошибка' : 'верно');
      if (!wrong) { line.classList.add('ok'); $(ph, '.pn').textContent = '2/50'; $(ph, '.prog .bar i').style.setProperty('--p', .04); toast(ph, G, skill('Грамматика')); tw.innerHTML = `<div class="wcta t" style="margin-top:12px">Дальше ${I('arrowR', 's18')}</div>`; return; }
      $$(line, 'span').forEach((s, i) => { if (bad[i]) s.classList.add('strk'); });
      $(ph, '.vz').innerHTML = `<div class="gl okc rise">I am at home.</div><div class="rise" style="--dl:120ms;display:flex;gap:10px;align-items:center;margin-top:14px;font-weight:700"><div class="ci2">${I('trend', 's18')}</div>Разбор промаха</div><div class="sub rise" style="--dl:160ms;margin-top:6px">Разбираю именно твой ответ: где сбилось и как сказать правильно.</div><div class="cta2 t rise" style="--dl:200ms">Разобрать мой ответ</div>`;
      tw.innerHTML = `<div class="tools4" style="grid-template-columns:1fr 1fr"><div class="gl t" style="opacity:1">${I('layers', 's20')}Теория</div><div class="gl t" style="opacity:1">${I('vol', 's20')}Повтор</div></div><div class="wcta t" style="margin-top:10px">Дальше ${I('arrowR', 's18')}</div>`;
    };
    box.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(a); });
    tw.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'Отменить') undo(); if (b.dataset.t === 'Проверить') check(); });
    draw();
    if (auto) { ['Those', 'was', 'at', 'home'].forEach((w, i) => G.after(1400 + i * 800, () => { const el = $$(box, '.at').find((x) => x.textContent === w); if (el) pick(el); })); G.after(5000, check); }
    return () => G.clear();
  }

  /* ---------- ошибки: кольцо, список с тремя чёрточками, «Отработать» — как сейчас ---------- */
  const ERR = [['I am at home', 'Я дома.', 1], ['Does she work here?', 'Она здесь работает?', 0], ['I tend to agree', 'Я склонен согласиться', 2]];
  const dash = (n) => `<span class="dash3">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  function mHub(ph, auto) {
    const G = timers();
    $(ph, '.lay').innerHTML = `${top({ back: true })}<div class="big" style="font-size:34px;margin-top:6px">Мои ошибки</div>
      <div class="ringw sm" style="margin-top:14px"><svg viewBox="0 0 208 208"><circle class="bg" cx="104" cy="104" r="90"/><circle class="fg" cx="104" cy="104" r="90"/></svg><div class="mid"><div class="v">0%</div><div class="l">исправлено</div></div></div>
      <div class="lgd"><span><i class="a"></i>4 исправлено</span><span><i></i>3 ждут</span></div>
      <div class="chipsr" style="margin-top:14px"><span class="chipr on2">Все 3</span><span class="chipr">Значение 2</span><span class="chipr">Порядок слов 1</span></div>
      <div class="wl" style="margin-top:12px">${ERR.map(([e, r, n], i) => `<div class="gl wr rise" style="--dl:${i * 70}ms"><div class="tx"><div class="e">${e}</div><div class="r">${r}</div></div>${dash(n)}</div>`).join('')}</div>
      <div style="flex:1"></div><div class="wcta t">Отработать 3</div>
      <div class="dim2"></div><div class="sh2" style="text-align:center"><div class="grab2"></div><div class="big" style="font-size:26px">Отработка</div><div class="sub" style="margin-top:6px">3 ошибки · около 4 минут</div><div class="wcta t" style="margin-top:18px">Начать</div></div>`;
    G.after(400, () => { $(ph, '.fg').style.strokeDashoffset = 565.5 * (1 - .57); count($(ph, '.ringw .v'), 0, 57, 1300, '%'); });
    const open = (v) => { $(ph, '.sh2').classList.toggle('on', v); $(ph, '.dim2').classList.toggle('on', v); };
    $(ph, '.lay > .wcta').addEventListener('click', () => open(true)); $(ph, '.dim2').addEventListener('click', () => open(false));
    if (auto) { G.after(2600, () => open(true)); G.after(5200, () => open(false)); }
    return () => G.clear();
  }
  const mDetail = (ph) => {
    $(ph, '.lay').innerHTML = `<div class="hsc"><div class="top"><div class="gbtn t">${I('back')}</div><div style="flex:1"></div><div class="gbtn t">${I('dotsH')}</div></div>
        <div class="big" style="font-size:32px;margin-top:12px">I am at home</div><div class="sub" style="margin-top:4px">Я дома.</div>
        <div class="st3r"><div><b>×1</b><span>ошибки</span></div><div><b>1/3</b><span>исправление</span></div><div><b>11 нояб.</b><span>последняя</span></div></div></div>
      <div class="gl pan rise" style="padding:6px 16px"><div class="rw"><div class="r" style="width:96px;margin:0">Твой ответ</div><div class="e strk">those was at home</div></div><div class="rw"><div class="r" style="width:96px;margin:0">Правильно</div><div class="e" style="color:var(--ok)">I am at home</div></div></div>
      <div class="gl crow rise" style="height:66px;--dl:100ms"><span>Почему это ошибка</span>${I('fwd', 's20')}</div>
      <div class="gl pan rise" style="--dl:200ms;padding-bottom:14px"><div class="hd2" style="font-size:16px">Три шага до «исправлено»</div><div class="steps3" style="margin-top:6px"><div class="dn">Узнал</div><div class="on">Собрал</div><div>Написал сам</div></div></div>
      <div style="flex:1"></div><div class="wcta t">Отработать</div>`;
    return () => {};
  };
  function mPractice(ph, auto) {
    const G = timers(); const bank = ["I'm", 'I', 'those', 'me', 'at', 'home', 'am'], need = ['I', 'am', 'at', 'home']; let got = [];
    $(ph, '.lay').innerHTML = `<div class="top"><div class="gbtn t">${I('close')}</div><div style="flex:1"></div>${EL.hearts()}<span class="gpill">1 / 3</span><div class="gbtn t">${I('dotsH')}</div></div>
      <div class="ask" style="margin-top:22px">Собери фразу</div><div class="big" style="text-align:center;font-size:40px;margin-top:4px">Я дома.</div>
      <div class="gl slotb"></div><div style="flex:1"></div>
      <div class="gl sheetb"><div class="bank" style="justify-content:flex-start">${bank.map((w) => `<div class="chip2 t" data-w="${w}">${w}</div>`).join('')}</div><div class="wcta t dis" style="margin-top:14px">Проверить</div></div>`;
    const slot = $(ph, '.slotb'), cta = $(ph, '.sheetb .wcta');
    const add = (el) => { if (el.classList.contains('used') || got.length >= need.length) return; el.classList.add('used'); got.push(el.dataset.w); const c = document.createElement('div'); c.className = 'chip2 rise'; c.textContent = el.dataset.w; slot.appendChild(c); if (got.length === need.length) cta.classList.remove('dis'); };
    const check = () => { if (got.length < need.length) return; const ok = got.every((w, i) => w === need[i]); log('отработка: шаг 2', ok ? 'верно' : 'ошибка');
      $(ph, '.sheetb').innerHTML = `<div style="display:flex;align-items:center;gap:12px"><div class="ci2 okb">${I('check', 's20')}</div><b style="font-size:22px;flex:1">${ok ? 'Верно' : 'Не совсем'}</b><span class="dots3"><i class="on">${I('check', 's16')}</i><i class="on">${I('check', 's16')}</i><i>3</i></span></div><div class="wcta t" style="margin-top:14px">Дальше</div>`; again($(ph, '.sheetb'), 'rise'); };
    $(ph, '.sheetb').addEventListener('click', (e) => { const c = e.target.closest('.chip2'); if (c) add(c); else if (e.target.closest('.wcta') && !cta.classList.contains('dis') && cta.isConnected) check(); });
    if (auto) { need.forEach((w, i) => G.after(1300 + i * 600, () => add($(ph, `.chip2[data-w="${w}"]`)))); G.after(4200, check); }
    return () => G.clear();
  }

  /* ---------- итог тренировки карточек: шапка, три плитки, монеты, ошибки, «Готово / Ещё раз» — как сейчас ---------- */
  const resultR = (c) => (ph) => {
    const G = timers(); let stop = () => {};
    $(ph, '.lay').innerHTML = `<div class="top">${coins(c.coins0)}<div style="flex:1"></div><div class="gbtn t">${I('close')}</div></div>
      <div class="scrollin tall"><div class="ov3">${c.over}</div><div class="rbig"><b class="rn">0</b> из ${c.of}</div><div class="sub" style="text-align:center">${c.line}</div>
        <div class="st3r lt3">${c.stats.map(([a, b]) => `<div class="gl"><b>${a}</b><span>${b}</span></div>`).join('')}</div>
        <div style="text-align:center;margin-top:12px"><span class="gpill">${K.coinImg(3, 20)}+${c.plus}</span></div>
        ${P.star(c.gains)}
        <div class="hd3">Ошибки <span>${c.errs.length}</span></div>${c.errs.map(([e, r]) => `<div class="gl ecard"><span class="lng">EN</span><b>${e}</b><span class="sub">${r}</span><div class="gbtn" style="position:absolute;right:12px;top:12px;width:36px;height:36px">${I('vol', 's18')}</div></div>`).join('')}
        <div class="gl crow" style="height:60px"><span>Слова того стоили?</span>${I('down', 's20')}</div></div>
      <div class="dock" style="display:flex;gap:12px"><div class="cta2 t" style="flex:1;margin:0;height:54px;border-radius:27px">Готово</div><div class="wcta t" style="flex:1">Ещё раз</div></div>`;
    G.after(350, () => count($(ph, '.rn'), 0, c.n, 1100));
    G.after(900, () => { const box = $(ph, '.starp'); if (!box) return; const after = EL.SK.map((s) => ({ ...s })); $$(box, '.sgr').forEach((row) => { const s = after.find((x) => x.nm === row.dataset.nm); s.p = Math.min(.99, s.p + +row.dataset.add); $(row, '.nowb').style.setProperty('--p', s.p); }); stop = EL.starTween($(box, '.starsvg'), EL.skAxes(), after.map((s) => EL.axis(s.lv, s.p)), 1500, 200); });
    log('итог карточек показан:', c.over);
    return () => { G.clear(); stop(); };
  };
  const RES = {
    'r-blitz': { over: 'Блиц · набор карточек', n: 23, of: 27, line: 'На четыре больше, чем вчера', stats: [['23', 'Верно'], ['4', 'Ошибки'], ['1:00', 'Время']], plus: 23, coins0: '3', gains: [['Скорость', .2], ['Словарь', .1]], errs: [['Aisle', 'проход'], ['Improve', 'улучшать']] },
    'r-tf': { over: 'Правда / ложь · набор карточек', n: 17, of: 18, line: 'Почти без промахов', stats: [['17', 'Верно'], ['1', 'Ошибки'], ['0:48', 'Время']], plus: 17, coins0: '26', gains: [['Словарь', .12]], errs: [['Layover', 'пересадка']] },
    'r-write': { over: 'Напиши · набор карточек', n: 7, of: 8, line: 'Семь слов по памяти', stats: [['7', 'Верно'], ['1', 'Ошибки'], ['2:10', 'Время']], plus: 14, coins0: '43', gains: [['Словарь', .2]], errs: [['Luggage', 'багаж']] },
    'r-speak': { over: 'Устно · набор карточек', n: 8, of: 10, line: 'Две фразы стоит повторить', stats: [['8', 'Верно'], ['2', 'Ошибки'], ['3:05', 'Время']], plus: 16, coins0: '57', gains: [['Речь', .2]], errs: [['Boarding', 'посадка'], ['Delay', 'задержка']] },
  };

  /* ---------- подмена ---------- */
  const S = window.ELS || {};
  const all = [S.entry, S.results, S.stats, S.modes, S.games, S.peak].concat(S.learn || [], S.social || [], S.skills || []).filter(Boolean).flatMap((x) => x.screens || []);
  const set = (id, patch) => { const s = all.find((x) => x.id === id); if (s) Object.assign(s, patch); };
  set('m-build', { fn: exercise, was: shot('ex_verdict.jpg'), note: 'Как сейчас: слова принимаются любые, проверка — кнопкой, после ошибки зачёркнутые слова, верная фраза и «Разбор промаха». Меняется подача: слово перелетает в строку.' });
  set('m-blitz', { was: shot('blitz.jpg'), note: 'Как сейчас: полоса, таймер, карточка и четыре варианта. Сердец в блице нет — в макете они убраны.' });
  set('e-hub', { fn: mHub, cls: '', lbl: 'Ошибки · главный экран и запуск отработки', was: shot('mist_hub.jpg'), note: 'Кольцо, фильтры, список с тремя чёрточками и кнопка — как сейчас. В показе открывается нынешнее окно «Отработка».' });
  set('e-detail', { fn: mDetail, cls: '', lbl: 'Одна ошибка', was: shot('mist_detail.jpg'), note: 'Слева нынешний экран: шапка на нём сейчас чёрная из-за сбоя — это найденная поломка, а не задумка. Справа добавлена полоса трёх шагов.' });
  set('e-practice', { fn: mPractice, cls: '', lbl: 'Отработка · второй шаг', was: shot('mist_step.jpg'), note: 'Сердца, счётчик шагов, строка ответа и слова внизу — как сейчас. После проверки — нынешняя плашка «Верно» с точками шагов.' });
  if (S.learn) S.learn[1].screens = S.learn[1].screens.filter((x) => x.id !== 'e-list'); // зачем: отдельного экрана-списка в приложении нет — список живёт на главном экране ошибок
  Object.entries(RES).forEach(([id, c]) => set(id, { fn: resultR(c), was: id === 'r-blitz' ? shot('result.jpg') : null, note: id === 'r-blitz' ? 'Шапка, три плитки, монеты, список ошибок и «Готово / Ещё раз» — как сейчас. Добавлен блок «Навыки растут».' : 'Тот же нынешний итог тренировки карточек с блоком навыков.' }));
  if (S.results) S.results.lead = 'Итог тренировки карточек снят с приложения — четыре режима карточек повторяют его и получают блок «Навыки растут». Итоги урока, ошибок и экзамена я не снимал: они остаются предложением.';
  if (S.learn) S.learn[1].lead = 'Раздел повторяет нынешний: кольцо, список с тремя чёрточками, окно «Отработка», три шага (выбери — собери — напиши). Добавлена только полоса трёх шагов на экране ошибки.';
})();
