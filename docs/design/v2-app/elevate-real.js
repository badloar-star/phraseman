/* Привязка макетов к настоящему приложению (владелец 11.11: «показал не как в приложении… сделай разминку, но не сломай то, что там уже есть»).
   1) Оформление по умолчанию — светлое, по снимкам с эмулятора; тёмное остаётся переключателем.
   2) «Было» — только настоящие снимки экранов (assets/elevate-was/*.jpg), нарисованные по старым макетам убраны в elevate-core.js.
   3) Главная, «Сегодня» и «Карточки» перерисованы поверх нынешних экранов: всё, что там есть, остаётся; разминка и тренировка добавлены блоком.
   Файл подключается последним и правит уже собранные разделы window.ELS до сборки страницы. */
(() => {
  const { I, $, $$, log, timers, count, bump, top, coins, shot } = EL;
  document.body.dataset.look = document.body.dataset.look || 'light';
  document.addEventListener('DOMContentLoaded', () => {
    const sw = document.querySelector('.switch'); if (!sw) return;
    sw.insertAdjacentHTML('beforeend', `<span class="k" style="margin-left:18px">Оформление</span><button class="on" data-look-set="light">Как в приложении</button><button data-look-set="dark">Тёмное</button>`);
    sw.addEventListener('click', (e) => { const b = e.target.closest('[data-look-set]'); if (!b) return; document.body.dataset.look = b.dataset.lookSet; sw.querySelectorAll('[data-look-set]').forEach((x) => x.classList.toggle('on', x === b)); });
  });

  const chips = `<div class="top"><span class="gpill">${I('flame', 's18')}1 день</span><span class="gpill">${K.coinImg(3, 20)}<span class="num cn">0</span><span style="opacity:.4">|</span>${I('boltF', 's16')}∞</span><div style="flex:1"></div><div class="gbtn">${I('flag', 's20')}</div>${K.coinImg(3, 42)}</div>`;
  const TASKS = [['layers', 'Пройди урок', 'Один шаг в обычном курсе', '0/1'], ['chatDots', 'Заверши диалог', 'Практика живого разговора', '0/1'], ['play', 'Посмотри видео', '10 минут на изучаемом языке', '0/10']];
  const rows = (soft) => TASKS.map(([ic, e, r, f]) => `<div class="rw"><div class="ib${soft ? ' s' : ''}">${I(ic, 's20')}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div></div><div class="fq">${f}</div></div>`).join('');
  const warm = `<div class="rw nw t"><div class="playb">${I('play')}</div><div class="tx"><div class="e">Разминка на 4 минуты</div><div class="r wr2">Три игры из твоих ошибок</div><div class="m3"><i></i><i></i><i></i></div></div><div class="fq wf">0/3</div></div>`;
  // общий показ: одно нажатие — три игры подряд, строка заполняется и засчитывается
  const runWarm = (ph, G) => {
    const row = $(ph, '.rw.nw'); if (row.dataset.busy || row.classList.contains('dn')) return; row.dataset.busy = '1'; const names = ['Поток', 'Лишнее слово', 'Сортировка']; log('разминка: старт одним нажатием');
    names.forEach((n, i) => { G.after(i * 1200, () => { $(row, '.wr2').textContent = `Идёт игра: ${n}`; }); G.after(i * 1200 + 1100, () => { $$(row, '.m3 i')[i].classList.add('on'); const f = $(row, '.wf'); f.textContent = `${i + 1}/3`; bump(f); }); });
    G.after(3800, () => { row.classList.add('dn'); $(row, '.wr2').textContent = 'Готово — ошибки отработаны'; delete row.dataset.busy; const c = $(ph, '.cn'); if (c) { c.textContent = '50'; bump(c); } });
  };

  /* ---------- Главная: блок «Сегодня» ---------- */
  function home(ph, auto) {
    const G = timers();
    $(ph, '.lay').innerHTML = `<div class="hsc home">${chips}<div class="wk">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d, i) => `<div class="${i === 1 ? 'f' : i === 2 ? 'on' : ''}">${d}<i></i></div>`).join('')}</div></div>
      <div class="tiles4">${[['layers', 'Уроки'], ['bookmark', 'Карточки'], ['chatDots', 'Диалоги'], ['flag', 'Пик']].map(([ic, n]) => `<div class="gl">${I(ic)}${n}</div>`).join('')}</div>
      <div class="gl pan"><div class="hd2">Сегодня<span>Все задания</span></div>${warm}${rows(false)}</div>
      <div class="over" style="margin-top:16px;font-size:17px;font-weight:800;color:inherit">Видео</div><div class="gl" style="height:120px;margin-top:8px;border-radius:22px;flex:none"></div>`;
    $(ph, '.rw.nw').addEventListener('click', () => runWarm(ph, G));
    if (auto) G.after(1800, () => runWarm(ph, G));
    return () => G.clear();
  }

  /* ---------- экран «Сегодня» ---------- */
  function today(ph, auto) {
    const G = timers();
    $(ph, '.lay').innerHTML = `<div class="hsc"><div class="top"><div class="gbtn t">${I('back')}</div><div class="ttl" style="font-size:28px;font-weight:800">Сегодня</div></div>
        <div class="rings">${K.coinImg(3, 56)}</div><div style="height:74px"></div><div class="over">Среда, 11 ноября</div><div class="big" style="margin-top:4px">0 из 3</div><div class="sub" style="margin-top:4px">Заданий на сегодня: 3</div>
        <div class="wcta t" style="margin-top:16px">${I('play')}Начать</div></div>
      <div class="gl pan" style="padding-bottom:10px"><div class="hd2">Разминка<span>не входит в три задания</span></div>${warm}</div>
      <div class="gl pan"><div class="hd2">Задания дня<span>0 из 3</span></div>${rows(true)}</div>
      <div class="gl pan" style="padding-bottom:14px"><div class="hd2">Неделя<span>0 из 6 дней</span></div><div class="wk" style="background:none;padding:6px 0 0;margin:0">${['5 ноя.', '6 ноя.', '7 ноя.', '8 ноя.', '9 ноя.', '10 ноя.'].map((d) => `<div style="color:var(--ink2);font-size:12px"><i style="background:rgba(47,74,107,.14)"></i>${d}</div>`).join('')}</div></div>`;
    $(ph, '.rw.nw').addEventListener('click', () => runWarm(ph, G));
    if (auto) G.after(1800, () => runWarm(ph, G));
    return () => G.clear();
  }

  /* ---------- «Карточки»: тренировка на 5 минут над нынешним списком ---------- */
  function cards(ph, auto) {
    const G = timers(); const M = ['Блиц', 'Правда / ложь', 'Напиши', 'Устно'];
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl" style="font-size:24px;font-weight:800">Карточки</div>', right: `<div class="gbtn t">${I('plus')}</div>` })}
      <div class="gl pan" style="padding-bottom:14px"><div class="hd2">Тренировка на 5 минут<span class="due">29 к повторению</span></div>
        <div class="sub mxl" style="margin-top:2px">Режимы меняются сами: Блиц, Правда / ложь, Напиши, Устно</div>
        <div class="m3" style="margin-top:10px">${M.map(() => '<i style="width:auto;flex:1"></i>').join('')}</div>
        <div class="wcta t" style="margin-top:14px">${I('play')}<span class="lb">Тренироваться</span></div></div>
      ${[['layers', 'Сохранённые'], ['bookmark', 'Мои наборы'], ['play', 'Из видео'], ['edit', 'Мои ошибки'], ['chatDots', 'Сообщество']].map(([ic, n]) => `<div class="gl crow"><div class="ci">${I(ic)}</div><span>${n}</span>${I('fwd', 's20')}</div>`).join('')}`;
    const play = () => { if (ph.dataset.busy) return; ph.dataset.busy = '1'; log('карточки: тренировка одной кнопкой'); M.forEach((n, i) => { G.after(i * 900, () => { $(ph, '.lb').textContent = `Идёт · ${n}`; }); G.after(i * 900 + 800, () => $$(ph, '.m3 i')[i].classList.add('on')); }); G.after(3800, () => { $(ph, '.lb').textContent = 'Тренироваться'; $(ph, '.due').textContent = '0 к повторению'; delete ph.dataset.busy; }); };
    $(ph, '.wcta').addEventListener('click', play);
    if (auto) G.after(1800, play);
    return () => { G.clear(); delete ph.dataset.busy; };
  }

  /* ---------- подмена экранов и «было» настоящими снимками ---------- */
  const S = window.ELS || {};
  const all = [S.entry, S.results, S.stats, S.modes, S.games, S.peak].concat(S.learn || [], S.social || [], S.skills || []).filter(Boolean).flatMap((x) => x.screens || []);
  const set = (id, patch) => { const s = all.find((x) => x.id === id); if (s) Object.assign(s, patch); };
  if (S.entry) {
    S.entry.title = 'Вход: разминка и тренировка поверх нынешних экранов';
    S.entry.lead = 'Слева — настоящие снимки приложения, сделанные сегодня. Справа — те же экраны, где всё нынешнее осталось на месте, а разминка и тренировка добавлены отдельным блоком. Разминка не занимает место ни одного из трёх заданий дня.';
    S.entry.screens.unshift({ id: 'home', fn: home, lbl: 'Главная: блок «Сегодня» с разминкой', was: shot('home.jpg'), note: 'Три нынешних задания на месте. Разминка — верхняя строка блока: одно нажатие запускает три игры подряд.' });
  }
  set('today', { fn: today, cls: '', lbl: 'Экран «Сегодня» с разминкой', was: shot('today.jpg'), note: 'Шапка, «Начать», «Задания дня» и «Неделя» — как сейчас. Между шапкой и заданиями добавлен блок разминки.' });
  set('mix', { fn: cards, cls: '', lbl: '«Карточки»: тренировка на 5 минут', was: shot('cards.jpg'), note: 'Все пять нынешних строк на месте. Сверху добавлен блок с одной кнопкой; режимы чередуются сами.' });
  set('p-hub', { fn: cards, cls: '', lbl: 'Карточки · главный экран', was: shot('cards.jpg'), note: 'Тот же экран, что в разделе «Вход»: нынешние строки плюс блок тренировки.' });
  set('e-empty', { was: shot('mistakes.jpg') });
  set('d-hub', { was: shot('dialogs.jpg') });
  set('sk-free', { was: shot('profile.jpg'), note: 'Слева — нынешняя визитка. Переключатель сверху показывает, что вижу я и что видит посторонний.' });
  set('l-verbs', { was: null });
})();
