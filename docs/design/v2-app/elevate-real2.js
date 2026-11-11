/* Разделы, перерисованные поверх настоящих экранов приложения (владелец 11.11: «Да, все разделы»).
   Правило то же, что в elevate-real.js: всё, что на экране есть сейчас, остаётся на своём месте; новое добавляется или меняет подачу.
   «Сейчас в приложении» — снимки с эмулятора 11.11 (assets/elevate-was). Экраны, которых я не снимал, здесь не трогаются. */
(() => {
  const { I, $, $$, log, timers, count, bump, again, top, coins, shot, SK, skAxes, starSvg, starLabels, starTween } = EL;
  const tabs2 = (a, b) => `<div class="seg2" style="margin-top:14px"><div class="on">${a}</div><div>${b}</div></div>`;
  const grid = (arr) => `<div class="ans grid2">${arr.map((t, i) => `<div class="at t" data-i="${i}">${t}</div>`).join('')}</div>`;
  const toast = (ph, G, html) => { const t = $(ph, '.toast2'); t.innerHTML = html; t.classList.add('on'); G.after(2200, () => t.classList.remove('on')); };
  const TOAST = '<div class="gl toast2"></div>';
  const skill = (nm) => `${starSvg(34, skAxes())}<span>«${nm}» растёт</span>`;

  /* ---------- урок: «Собери фразу» — шесть плиток и подсказки, как сейчас ---------- */
  const STEPS = [['I', ['Those', 'I', 'Me', 'They', 'It', 'We']], ['am', ['is', 'are', 'am', 'be', 'was', 'do']], ['at', ['in', 'on', 'at', 'to', 'of', 'by']], ['home', ['house', 'home', 'here', 'room', 'work', 'there']]];
  function exercise(ph, auto) {
    const G = timers(); let n = 0;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Урок 1</div>', right: coins('0') })}
      <div class="ask" style="margin-top:18px;font-weight:700">Собери фразу:</div><div class="big" style="text-align:center;font-size:30px;margin-top:4px">Я дома.</div>
      <div class="aline"><i class="caret2"></i></div><div class="ru fade hid" style="margin-top:8px">I am at home</div><div style="flex:1"></div>
      <div class="tls"></div>
      <div class="prog"><div class="bar"><i></i></div><span class="pn">1/50</span></div>
      <div class="tools4">${[['close', '50/50'], ['layers', 'Теория'], ['mic', 'Устно'], ['arrowL', 'Отменить']].map(([ic, t]) => `<div class="gl t">${I(ic, 's20')}${t}</div>`).join('')}</div>${TOAST}`;
    const line = $(ph, '.aline'), box = $(ph, '.tls');
    const draw = () => { box.innerHTML = grid(STEPS[n][1]); $$(box, '.at').forEach((a, i) => { a.classList.add('rise'); a.style.setProperty('--dl', i * 40 + 'ms'); }); };
    const pick = (el) => {
      const w = el.textContent; if (w !== STEPS[n][0]) { again(el, 'no'); G.after(500, () => el.classList.remove('no')); log('урок: не то слово', w); return; }
      const a = el.getBoundingClientRect(), s = document.createElement('span'); s.textContent = w; line.insertBefore(s, $(line, '.caret2')); const b = s.getBoundingClientRect();
      s.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px)`, opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,1,.3,1)' }); // зачем: слово перелетает в строку — единственное, что меняется в подаче
      n += 1; if (n < STEPS.length) { draw(); return; }
      box.innerHTML = ''; line.classList.add('ok'); $(ph, '.caret2').remove(); $(ph, '.ru').classList.remove('hid'); $(ph, '.pn').textContent = '2/50'; $(ph, '.prog .bar i').style.setProperty('--p', .04); toast(ph, G, skill('Грамматика')); log('урок: фраза собрана');
    };
    box.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(a); });
    draw();
    if (auto) { G.after(1500, () => pick($$(box, '.at')[0])); STEPS.forEach((st, i) => G.after(2400 + i * 900, () => { const el = $$(box, '.at').find((x) => x.textContent === STEPS[n][0]); if (el) pick(el); })); }
    return () => G.clear();
  }

  /* ---------- слова урока: тренировка «Выбери перевод», как сейчас ---------- */
  const WQ = [['они', ['this', 'these', 'that', 'they', 'you', 'them'], 3], ['мы', ['we', 'us', 'our', 'me', 'he', 'it'], 0], ['она', ['her', 'he', 'she', 'it', 'his', 'hers'], 2]];
  function wordsT(ph, auto) {
    const G = timers(); let r = 0, open = true;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div style="flex:1"><div class="ttl">1. Словарь</div><div class="sub">Узнавание · <span class="wn">0</span> / 47</div></div>', right: coins('0') })}
      <div class="bar" style="margin-top:8px;flex:none"><i></i></div>
      <div class="gl qcard" style="margin-top:14px"><div class="k">Выбери перевод:</div><div class="q"></div></div><div class="tls" style="margin-top:14px"></div><div style="flex:1"></div>${tabs2('Тренировка', 'Список слов')}${TOAST}`;
    const box = $(ph, '.tls');
    const draw = () => { const [q, o] = WQ[r]; $(ph, '.q').textContent = q; again($(ph, '.qcard'), 'swap'); box.innerHTML = grid(o); open = true; if (auto) G.after(1300, () => pick(r === 1 ? 2 : WQ[r][2])); };
    const pick = (i) => { if (!open) return; open = false; const k = WQ[r][2]; $$(box, '.at').forEach((a, j) => a.classList.add(j === k ? 'ok' : j === i ? 'no' : 'off')); if (i === k) { const w = $(ph, '.wn'); w.textContent = +w.textContent + 1; bump(w); $(ph, '.bar i').style.setProperty('--p', (+w.textContent) / 10); if (r === 0) toast(ph, G, skill('Словарь')); } log('слова: ответ', i === k ? 'верно' : 'ошибка'); if (r < WQ.length - 1) G.after(1300, () => { r += 1; draw(); }); };
    box.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    draw();
    return () => G.clear();
  }

  /* ---------- неправильные глаголы: три формы с пропуском, как сейчас ---------- */
  const VQ = [['Быть', 'be', 'been', 'was', ['be', 'been', 'was', 'won']], ['Идти', 'go', 'gone', 'went', ['goed', 'went', 'gone', 'go']]];
  function verbsT(ph, auto) {
    const G = timers(); let r = 0, open = true;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">1. Неправильные глаголы</div>' })}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex:none"><span class="sub"><span class="vn">0</span> / 2 выучено</span>${coins('0')}</div><div class="bar" style="margin-top:8px;flex:none"><i></i></div>
      <div class="gl qcard" style="margin-top:14px;min-height:0;padding:20px"></div><div style="flex:1"></div><div class="tls"></div>${tabs2('Учить', 'Словарь')}`;
    const card = $(ph, '.qcard'), box = $(ph, '.tls');
    const draw = () => { const [ru, a, c, , o] = VQ[r]; card.innerHTML = `<div class="k">Сначала попробуй вспомнить</div><div style="font-size:22px;font-weight:700;margin-top:6px">${ru}</div><div class="v3"><div><b>${a}</b><span>настоящее</span></div>${I('arrowR', 's18')}<div><b class="vh">?</b><span>прошлое</span></div>${I('arrowR', 's18')}<div><b>${c}</b><span>причастие</span></div></div>`; again(card, 'swap'); box.innerHTML = grid(o); open = true; if (auto) G.after(1500, () => pick(o.indexOf(VQ[r][3]))); };
    const pick = (i) => { if (!open) return; open = false; const k = VQ[r][4].indexOf(VQ[r][3]), h = $(ph, '.vh'); $$(box, '.at').forEach((a, j) => a.classList.add(j === k ? 'ok' : j === i ? 'no' : 'off')); h.textContent = VQ[r][3]; h.classList.add('got'); again(h, 'rise'); if (i === k) { const v = $(ph, '.vn'); v.textContent = +v.textContent + 1; bump(v); $(ph, '.bar i').style.setProperty('--p', (+v.textContent) / 2); } log('глаголы: ответ', i === k ? 'верно' : 'ошибка'); if (r < VQ.length - 1) G.after(1500, () => { r += 1; draw(); }); };
    box.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    draw();
    return () => G.clear();
  }

  /* ---------- теория: разделы-гармошка и счётчик заданий, как сейчас; задание встроено в раздел ---------- */
  function theoryR(ph, auto) {
    const G = timers(); let done = 0;
    const sec = (n, t, s, open, body = '') => `<div class="gl acc${open ? ' on' : ''}"><div class="ah"><span class="an">${n}</span><div class="tx"><b>${t}</b><span>${s}</span></div>${I(open ? 'up' : 'down', 's18')}</div>${open ? `<div class="ab">${body}</div>` : ''}</div>`;
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl" style="text-align:center">Урок 1</div>', right: `<div class="gbtn t">${I('flag', 's20')}</div>` })}
      <div class="big" style="font-size:27px;line-height:32px;margin-top:10px">Я, он, она, мы, они: кто и где</div>
      <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:14px;font-weight:700"><span>Разделы 1/6 · задания <span class="tn">0</span>/12</span><span class="tp">6%</span></div><div class="bar" style="margin-top:8px;flex:none"><i style="--p:.06"></i></div>
      <div class="scrollin" style="padding-bottom:30px;margin-top:12px;-webkit-mask-image:none;mask-image:none">
        ${sec('01', 'Я готов', '3 примера', true, `<p>Смотрите, как сказать «Я готов».</p><p><em>I am ready</em>. — Я готов.</p><p>Слово <em>I</em> значит «я». Слово <em>am</em> значит «быть». По-русски его не говорят, а по-английски оно обязательно.</p>
          <div class="chk2"><div class="ov2">Задание 1 из 12</div><div class="gap" style="font-size:22px;line-height:34px;text-align:left;margin-top:6px">I <span class="hole">am</span> busy</div><div class="two" style="margin-top:10px"><div class="at t" data-i="0">is</div><div class="at t" data-i="1">am</div></div></div>`)}
        ${sec('02', 'Он занят, она дома', '4 примера', false)}${sec('03', 'Мы и они', '3 примера', false)}</div>${TOAST}`;
    const pick = (i) => { if (done) return; done = 1; $$(ph, '.chk2 .at').forEach((a, j) => a.classList.add(j === 1 ? 'ok' : j === i ? 'no' : 'off')); $(ph, '.hole').classList.add(i === 1 ? 'ok' : 'no'); $(ph, '.tn').textContent = 1; bump($(ph, '.tn')); $(ph, '.tp').textContent = '14%'; $(ph, '.bar i').style.setProperty('--p', .14); toast(ph, G, skill('Грамматика')); log('теория: задание в разделе', i === 1 ? 'верно' : 'ошибка'); };
    ph.addEventListener('click', (e) => { const a = e.target.closest('.chk2 .at'); if (a) pick(+a.dataset.i); });
    if (auto) G.after(2400, () => pick(1));
    return () => G.clear();
  }

  /* ---------- статистика: «Серия и результаты» + блок навыков ---------- */
  function statsR(ph) {
    const G = timers(); let stop = () => {};
    $(ph, '.lay').innerHTML = `${top({ back: true })}<div class="big" style="font-size:30px;margin-top:6px">Серия и результаты</div>
      <div class="scrollin" style="padding-bottom:30px;margin-top:8px;-webkit-mask-image:none;mask-image:none">
        <div class="gl pan" style="text-align:center;padding:18px">${I('flame', 's26').replace('class="i', 'style="margin:0 auto" class="i')}<div class="big" style="font-size:44px;margin-top:6px">1</div><div class="sub">день подряд · до рекорда 1 день</div><div style="font-weight:700;margin-top:12px">Серия в безопасности</div></div>
        <div class="gl pan" style="padding-bottom:14px"><div class="hd2">Твоя неделя<span>7 ч 37 мин</span></div><div class="b7" style="height:76px">${[['Пн', 4], ['Вт', 62], ['Ср', 100], ['Чт', 4], ['Пт', 4], ['Сб', 4], ['Вс', 4]].map(([d, v]) => `<div${v === 100 ? ' class="best"' : ''}><i data-h="${v}"></i>${d}</div>`).join('')}</div></div>
        <div class="gl pan" style="padding-bottom:14px"><div class="hd2">Навыки<span class="newtag" style="margin:0">новое</span></div><div class="starrow"><div class="starbox">${starSvg(150, skAxes(), { from: SK.map(() => 0) })}</div><div class="lvrows" style="flex:1">${SK.map((s) => `<div class="lvr" style="grid-template-columns:88px 1fr 22px"><span>${s.nm}</span><div class="bar"><i style="--p:${s.p}"></i></div><b>${s.lv}</b></div>`).join('')}</div></div><div class="sub" style="margin-top:8px">Нажатие открывает экран «Навыки»</div></div>
        <div class="gl crow" style="height:72px">${`<div class="ci">${I('trend')}</div>`}<span>Начало положено<div class="sub" style="font-weight:500;font-size:14px">Несколько дней подряд — и ритм сложится</div></span>${I('fwd', 's20')}</div>
        <div class="gl crow" style="height:72px"><div class="ci">${I('cupF')}</div><span>Все показатели<div class="sub" style="font-weight:500;font-size:14px">рекорды игр и сравнение</div></span>${I('down', 's20')}</div>
        <div class="gl pan" style="padding-bottom:14px"><div class="hd2">Рекорды игр<span class="newtag" style="margin:0">новое</span></div><div class="recs">${[['26', 'Блиц · верных за минуту'], ['×1,9', 'Поток · темп'], ['14', 'Лишнее слово · серия'], ['0,8 с', 'Смахни · на ответ']].map(([x, y]) => `<div><b>${x}</b><span>${y}</span></div>`).join('')}</div></div>
        <div class="gl pan" style="padding-bottom:14px"><div class="hd2" style="display:block">Быстрее, чем <b class="pc">0%</b> учеников уровня A2</div><div class="curve"><svg viewBox="0 0 354 62" preserveAspectRatio="none"><path d="M0,62 L0.0,57.1 L6.0,56.8 L12.0,56.4 L18.0,55.9 L24.0,55.3 L30.0,54.5 L36.0,53.6 L42.0,52.5 L48.0,51.1 L54.0,49.6 L60.0,47.7 L66.0,45.7 L72.0,43.3 L78.0,40.8 L84.0,38.0 L90.0,35.0 L96.0,31.8 L102.0,28.5 L108.0,25.2 L114.0,21.9 L120.0,18.8 L126.0,15.8 L132.0,13.1 L138.0,10.7 L144.0,8.8 L150.0,7.3 L156.0,6.4 L162.0,6.0 L168.0,6.2 L174.0,7.0 L180.0,8.3 L186.0,10.1 L192.0,12.4 L198.0,15.0 L204.0,17.9 L210.0,21.0 L216.0,24.3 L222.0,27.6 L228.0,30.9 L234.0,34.1 L240.0,37.1 L246.0,40.0 L252.0,42.6 L258.0,45.0 L264.0,47.2 L270.0,49.1 L276.0,50.7 L282.0,52.1 L288.0,53.3 L294.0,54.3 L300.0,55.1 L306.0,55.8 L312.0,56.3 L318.0,56.7 L324.0,57.0 L330.0,57.3 L336.0,57.5 L342.0,57.6 L348.0,57.7 L354.0,57.8 L354,62 Z" fill="rgba(255,255,255,.14)"/><path d="M0.0,57.1 L6.0,56.8 L12.0,56.4 L18.0,55.9 L24.0,55.3 L30.0,54.5 L36.0,53.6 L42.0,52.5 L48.0,51.1 L54.0,49.6 L60.0,47.7 L66.0,45.7 L72.0,43.3 L78.0,40.8 L84.0,38.0 L90.0,35.0 L96.0,31.8 L102.0,28.5 L108.0,25.2 L114.0,21.9 L120.0,18.8 L126.0,15.8 L132.0,13.1 L138.0,10.7 L144.0,8.8 L150.0,7.3 L156.0,6.4 L162.0,6.0 L168.0,6.2 L174.0,7.0 L180.0,8.3 L186.0,10.1 L192.0,12.4 L198.0,15.0 L204.0,17.9 L210.0,21.0 L216.0,24.3 L222.0,27.6 L228.0,30.9 L234.0,34.1 L240.0,37.1 L246.0,40.0 L252.0,42.6 L258.0,45.0 L264.0,47.2 L270.0,49.1 L276.0,50.7 L282.0,52.1 L288.0,53.3 L294.0,54.3 L300.0,55.1 L306.0,55.8 L312.0,56.3 L318.0,56.7 L324.0,57.0 L330.0,57.3 L336.0,57.5 L342.0,57.6 L348.0,57.7 L354.0,57.8" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"/></svg><div class="pin"></div></div><div class="sub" style="margin-top:6px">Тот же блок сравнения, что сейчас в «Всех показателях», — кривая вместо строк</div></div>
      </div>`;
    G.after(400, () => { stop = starTween($(ph, '.starsvg'), SK.map(() => 0), skAxes(), 1400); $$(ph, '.b7 i').forEach((b, i) => G.after(i * 70, () => { b.style.height = b.dataset.h + '%'; })); });
    G.after(900, () => { $(ph, '.pin').style.transform = `translateX(${$(ph, '.curve').clientWidth * .72}px)`; count($(ph, '.pc'), 0, 72, 1400, '%'); });
    log('статистика: нынешние блоки плюс навыки, рекорды и кривая сравнения');
    return () => { G.clear(); stop(); };
  }

  /* ---------- диалоги: шапка, свободный разговор, темы, все диалоги — как сейчас ---------- */
  function dialogsR(ph) {
    const G = timers();
    $(ph, '.lay').innerHTML = `<div class="hsc"><div class="top"><div class="gbtn t">${I('back')}</div></div><div class="over" style="margin-top:14px;display:flex;gap:6px;align-items:center">${I('chat', 's18')}Диалоги</div>
        <div class="big" style="font-size:28px;line-height:33px;margin-top:4px">Разговоры с персонажами</div><div class="sub" style="margin-top:6px">Осталось две реплики в «Кофе с коллегой»</div><div class="wcta t" style="margin-top:14px">${I('play')}Продолжить диалог</div></div>
      <div class="gl crow" style="height:70px"><div class="ci">${I('mic')}</div><span>Свободный разговор<div class="sub" style="font-weight:500;font-size:14px">Практика без сценария</div></span>${I('fwd', 's20')}</div>
      <div class="over" style="margin-top:16px;font-weight:700">Темы</div>
      <div class="tm2">${[['people', 'Общение', 4], ['docF', 'Дела', 0], ['planeF', 'Поездки', 2], ['cupF', 'Повседневное', 0]].map(([ic, n, k]) => `<div class="gl"><div style="display:flex;gap:8px;align-items:center;font-weight:700">${I(ic, 's20')}${n}</div><div class="sub" style="font-size:13px">${k} из 19</div><div class="bar" style="margin-top:6px;height:4px"><i data-p="${k / 19}"></i></div></div>`).join('')}</div>
      <div class="gl crow" style="height:66px"><div class="ci">${I('layers')}</div><span>Все диалоги</span><span class="sub" style="flex:none;font-weight:600">6 из 76</span>${I('fwd', 's20')}</div>
      <div class="gl pan" style="padding-bottom:12px"><div class="hd2" style="font-size:16px">Диалоги качают<span class="newtag" style="margin:0">новое</span></div><div class="chipsr" style="margin-top:4px"><span class="chipr">Слух · уровень 9</span><span class="chipr">Речь · уровень 6</span></div></div>`;
    G.after(400, () => $$(ph, '.tm2 .bar i').forEach((b) => b.style.setProperty('--p', b.dataset.p)));
    return () => G.clear();
  }

  /* ---------- «Мои наборы»: кнопка запуска без окна выбора режима ---------- */
  const PK = [['Фразовые глаголы', '31 карточка · B1', ['Give up', 'Run out']], ['Работа', '22 карточки · B1', ['Follow up', 'Deadline']], ['B2 глаголы', '49 карточек · B2', ['Convince', 'Claim']], ['Путешествия', '40 карточек · A2', ['Layover', 'Gate']]];
  function packsR(ph, auto) {
    const G = timers(); const M = ['Блиц', 'Правда / ложь', 'Напиши', 'Устно'];
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div style="flex:1"></div>', right: `<div class="gbtn t">${I('plus')}</div><div class="gbtn t">${I('dotsV')}</div>` })}<div class="big" style="font-size:32px;margin-top:6px">Мои наборы <span style="opacity:.45;font-size:22px">4</span></div>
      ${PK.map(([n, m, w], i) => `<div class="gl pkr" data-i="${i}"><div class="ci" style="width:52px;height:52px;border-radius:14px;background:var(--soft);display:flex;align-items:center;justify-content:center;flex:none">${I('bookmark')}</div><div class="tx"><b>${n}</b><div class="sub pm">${m}</div><div class="chipsr" style="margin-top:6px">${w.map((x) => `<span class="chipr" style="height:30px;font-size:13px">${x}</span>`).join('')}<span class="chipr" style="height:30px;font-size:13px">+1</span></div><div class="m3" style="margin-top:8px">${M.map(() => '<i style="width:auto;flex:1"></i>').join('')}</div></div><div class="playb t">${I('play')}</div></div>`).join('')}`;
    const play = (row) => { if (row.dataset.busy) return; row.dataset.busy = '1'; log('наборы: запуск без выбора режима'); M.forEach((n, i) => { G.after(i * 900, () => { $(row, '.pm').textContent = `Идёт · ${n}`; }); G.after(i * 900 + 800, () => $$(row, '.m3 i')[i].classList.add('on')); }); G.after(3800, () => { $(row, '.pm').textContent = 'Готово · все четыре режима'; delete row.dataset.busy; }); };
    ph.addEventListener('click', (e) => { const b = e.target.closest('.playb'); if (b) play(b.closest('.pkr')); });
    if (auto) G.after(1700, () => play($(ph, '.pkr')));
    return () => G.clear();
  }

  /* ---------- «Наборы» сообщества: набор месяца и список, как сейчас; сердечко качает «Социальный» ---------- */
  function setsR(ph, auto) {
    const G = timers(); const L = [['Small talk', 'Олег', '26 карточек · A2', 7], ['Офис и созвоны', 'Мария', '34 карточки · B1', 5], ['Family', 'Лидия', '20 карточек · A1', 4], ['B2 глаголы', 'Анна', '49 карточек · B2', 3]];
    $(ph, '.lay').innerHTML = `<div class="hsc" style="background:linear-gradient(170deg,#1F4468,#2F5E8E)"><div class="top"><div class="gbtn t">${I('back')}</div><div class="tabsx"><span>Пик</span><span>Друзья</span><span class="on">Наборы</span></div><span class="gpill">EN</span></div>
        <div class="over" style="margin-top:20px">Набор месяца</div><div class="big" style="margin-top:4px">Ещё 20 дней</div><span class="gpill" style="margin-top:12px">Условия участия ${I('fwd', 's16')}</span><div style="height:18px"></div></div>
      <div class="gl pan" style="margin-top:-26px;flex:1;border-radius:28px 28px 0 0;margin-left:-4px;margin-right:-4px"><div class="hd2" style="align-items:center">Наборы<span style="display:flex;gap:8px"><div class="gbtn" style="width:38px;height:38px">${I('search', 's18')}</div><div class="gbtn" style="width:38px;height:38px">${I('plus', 's18')}</div></span></div>
        ${L.map(([n, a, m, h], i) => `<div class="rw"><div class="ib s" style="width:46px;height:46px">${I('bookmark')}</div><div class="tx"><div class="e">${n}</div><div class="r">${a} · ${m}</div></div><div class="fq hrt t" data-i="${i}" style="display:flex;gap:6px;align-items:center;cursor:pointer">${I('heart', 's20')}<span>${h}</span></div></div>`).join('')}</div>${TOAST}`;
    const like = (el) => { if (el.dataset.on) return; el.dataset.on = '1'; const s = $(el, 'span'); s.textContent = +s.textContent + 1; bump(s); $(el, 'svg').style.fill = 'currentColor'; toast(ph, G, skill('Социальный')); log('наборы: сердечко → «Социальный»'); };
    ph.addEventListener('click', (e) => { const h = e.target.closest('.hrt'); if (h) like(h); });
    if (auto) G.after(1900, () => like($(ph, '.hrt')));
    return () => G.clear();
  }

  /* ---------- подмена ---------- */
  const S = window.ELS || {};
  const all = [S.entry, S.results, S.stats, S.modes, S.games, S.peak].concat(S.learn || [], S.social || [], S.skills || []).filter(Boolean).flatMap((x) => x.screens || []);
  const set = (id, patch) => { const s = all.find((x) => x.id === id); if (s) Object.assign(s, patch); };
  set('m-build', { fn: exercise, cls: '', lbl: 'Урок · собери фразу', was: shot('exercise.jpg'), note: 'Шесть плиток, строка ответа и четыре подсказки внизу — как сейчас. Меняется подача: выбранное слово перелетает в строку.' });
  set('m-words', { fn: wordsT, cls: '', lbl: 'Слова урока · тренировка', was: shot('words.jpg'), note: 'Карточка вопроса, шесть вариантов и переключатель «Тренировка / Список слов» — как сейчас.' });
  set('l-verbq', { fn: verbsT, cls: '', lbl: 'Неправильные глаголы · тренажёр', was: shot('verbs.jpg'), note: 'Три формы с пропуском и четыре варианта — как сейчас; верная форма встаёт в пропуск.' });
  set('l-theory', { fn: theoryR, cls: '', lbl: 'Теория: задание внутри раздела', was: shot('theory.jpg'), note: 'Разделы и счётчик «задания 0/12» уже есть. Задание встроено прямо в раздел и двигает счётчик.' });
  set('stats', { fn: statsR, cls: '', lbl: 'Статистика: «Серия и результаты»', was: shot('stats.jpg'), note: 'Серия, неделя, «Начало положено» и «Все показатели» — как сейчас. Добавлен блок навыков; рекорды игр уходят внутрь «Всех показателей».' });
  set('d-hub', { fn: dialogsR, cls: '', lbl: 'Диалоги · раздел', was: shot('dialogs.jpg'), note: 'Шапка, свободный разговор, темы и «Все диалоги» — как сейчас. Кнопка в шапке продолжает начатый диалог.' });
  set('p-pack', { fn: packsR, cls: '', lbl: '«Мои наборы»: запуск без окна выбора режима', was: shot('modes.jpg'), note: 'Слева — нынешнее окно «Режим тренировки». Справа кнопка набора запускает все режимы подряд.' });
  set('p-catalog', { fn: setsR, cls: '', lbl: 'Наборы сообщества', was: shot('sets.jpg'), note: 'Набор месяца и список — как сейчас. Сердечко набору качает «Социальный».' });
  set('sk-pro', { was: shot('card_pro.jpg'), note: 'Слева — нынешняя визитка Pro. Справа на неё добавлены звезда и шесть уровней.' });
  set('sk-free', { was: shot('card_plain.jpg') });
  set('sk-friends', { was: shot('friends.jpg'), note: 'Слева — нынешний экран без друзей. Справа список друзей со звёздами; нажатие накладывает звезду друга на твою.' });
  if (S.stats) S.stats.lead = 'Слева — нынешний экран «Серия и результаты». Все его блоки остаются; добавлен один блок навыков, а рекорды игр и сравнение живут внутри «Всех показателей», где они уже есть.';
  if (S.social) { S.social[0].lead = 'Раздел повторяет нынешний: шапка, свободный разговор, темы, «Все диалоги». Экраны перед разговором, сам разговор и итог я с приложения не снимал — они показаны как предложение.'; S.social[1].lead = 'Главный экран, «Мои наборы» и наборы сообщества повторяют нынешние. Добавлено: тренировка одной кнопкой, запуск набора без окна выбора режима, рост навыка «Социальный» за сердечко.'; }
  if (S.learn) S.learn[0].lead = 'Теория, словарь и тренажёр глаголов повторяют нынешние экраны: разделы, счётчик заданий, варианты и переключатели на месте. Тренажёр предлогов и список глаголов я с приложения не снимал.';
  if (S.modes) S.modes.lead = 'Слева — настоящие снимки там, где я их снял. Правила режимов не тронуты; меняется подача.';
})();
