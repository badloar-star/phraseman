/* Страница «Уроки, ошибки и экзамены» (владелец 11.11: «теории… чтобы задания в теории тоже были такими… неправильные глаголы, предлоги…
   все экраны и состояния раздела ошибок и отработка… экзамены все»). Правила разделов не меняются — меняется подача.
   Тексты теории здесь — пример шаблона; сами тексты уроков пишутся по Библии текстов и в макете не переписываются. */
(() => {
  const { I, $, $$, log, timers, count, bump, again, was, top, segs, coins, tiles, showTiles, mark, quiz, mount } = EL;
  const stat = (html, after) => (ph, auto) => { const G = timers(); $(ph, '.lay').innerHTML = html; const stop = after ? after(ph, G, auto) : null; return () => { G.clear(); if (stop) stop(); }; };
  const energy = `<span class="gpill">${I('boltF', 's16')}<span class="num">4</span></span>`;
  const exm = (a, b, dl) => `<div class="exm rise" style="--dl:${dl}ms">${I('vol', 's20')}<div>${a}<span>${b}</span></div></div>`;

  /* ---------- теория с заданиями внутри ---------- */
  const theory = stat(`${top({ back: true, mid: '<div class="ttl">Урок 1 · теория</div>', right: energy })}${segs(3, 1)}
    <div class="scrollin" style="padding-bottom:110px">
      <div class="gl th rise"><div class="q">I <em>am</em> work<em>ing</em></div><div class="p">Когда действие идёт прямо сейчас, ставим am, is или are и добавляем к глаголу -ing.</div>${exm('I am working now', 'Я работаю сейчас', 300)}${exm('She is writing messages', 'Она пишет сообщения', 450)}</div>
      <div class="gl chk rise" style="--dl:500ms"><div class="ov2">Проверь себя</div><div class="gap">They <span class="hole">are</span> watching TV</div><div class="two" data-k="1"><div class="at t" data-i="0">is</div><div class="at t" data-i="1">are</div></div></div>
      <div class="gl th rise" style="--dl:650ms"><div class="q">He work<em>s</em> every day</div><div class="p">А если это привычка — никакого -ing. После he и she к глаголу добавляем -s.</div>${exm('He cooks dinner every day', 'Он готовит ужин каждый день', 800)}</div>
      <div class="gl chk rise" style="--dl:900ms"><div class="ov2">Проверь себя</div><div class="gap">She usually <span class="hole">waits</span> here</div><div class="two" data-k="0"><div class="at t" data-i="0">waits</div><div class="at t" data-i="1">is waiting</div></div></div>
    </div><div class="dock"><div class="wcta t">${I('play')}К заданиям урока</div></div>`, (ph, G, auto) => {
    const pick = (box, i) => { if (box.dataset.done) return; box.dataset.done = '1'; const k = +box.dataset.k, ok = i === k; $$(box, '.at').forEach((a, j) => a.classList.add(j === k ? 'ok' : j === i ? 'no' : 'off')); const h = $(box.parentNode, '.hole'); h.classList.add(ok ? 'ok' : 'no'); const sg = $$(ph, '.segs i'); const n = $$(ph, '.two[data-done]').length; if (sg[n]) sg[n].style.setProperty('--p', 1); log('теория: проверь себя', ok ? 'верно' : 'ошибка'); };
    ph.addEventListener('click', (e) => { const a = e.target.closest('.chk .at'); if (a) pick(a.parentNode, +a.dataset.i); });
    if (auto) { const b = $$(ph, '.two'); G.after(2200, () => pick(b[0], 1)); G.after(3600, () => { $(ph, '.scrollin').scrollTo({ top: 330, behavior: 'smooth' }); }); G.after(5000, () => pick(b[1], 0)); }
  });
  const wasTheory = was(`<div class="hdr"><div class="rb">${I('back', 's20')}</div><div class="tx"><div class="ti">Теория</div><div class="su">Урок 1</div></div></div><div class="card c2" style="padding:18px;margin-top:18px"><div style="font-size:20px;font-weight:700">Present Continuous</div><div style="color:var(--sec);font-size:16px;line-height:23px;margin-top:10px">Когда действие идёт прямо сейчас, ставим am, is или are и добавляем к глаголу окончание -ing. Если это привычка, окончание -ing не нужно, а после he и she к глаголу добавляется -s.</div><div class="divider"></div><div style="font-size:16px;line-height:26px">I am working now<br>She is writing messages<br>He cooks dinner every day</div></div><div style="height:20px"></div><div class="cta">Понятно</div>`);

  /* ---------- неправильные глаголы ---------- */
  const V = [['go', 'went', 'gone'], ['write', 'wrote', 'written'], ['take', 'took', 'taken'], ['see', 'saw', 'seen'], ['come', 'came', 'come'], ['give', 'gave', 'given'], ['know', 'knew', 'known']];
  const verbs = stat(`${top({ back: true, mid: '<div class="ttl">Неправильные глаголы</div>' })}
    <div class="gl panel2" style="margin-top:14px"><div class="kv"><div class="tx">Выучено</div><span class="val"><span class="vn">24</span> из 120</span></div><div class="bar"><i class="vb"></i></div></div>
    <div class="wcta t" style="margin-top:14px">${I('play')}Тренировать · 10 глаголов</div>
    <div class="hl2">${V.map((v, i) => `<div class="gl vrow rise${i < 2 ? ' new' : ''}" style="--dl:${i * 60}ms" data-i="${i}"><span>${v[0]}</span><span>${v[1]}</span><span>${v[2]}</span></div>`).join('')}</div>`, (ph, G, auto) => {
    G.after(400, () => $(ph, '.vb').style.setProperty('--p', .2));
    const say = (r) => { $$(ph, '.vrow').forEach((x) => x.classList.remove('new')); r.classList.add('new'); log('глаголы: звучит', r.textContent); };
    ph.addEventListener('click', (e) => { const r = e.target.closest('.vrow'); if (r) say(r); });
    if (auto) [2, 4, 5].forEach((i, k) => G.after(1800 + k * 1300, () => say($$(ph, '.vrow')[i])));
  });
  const wasVerbs = was(`<div class="hdr"><div class="rb">${I('back', 's20')}</div><div class="tx"><div class="ti">Неправильные глаголы</div></div></div><div style="height:16px"></div><div class="stack">${V.map((v) => `<div class="card"><div class="row" style="min-height:52px"><div class="tx"><div class="tt m">${v.join(' · ')}</div></div><span class="ch">${I('vol', 's18')}</span></div></div>`).join('')}</div>`);
  const wasVerbQ = was(`<div class="hdr"><div class="rb">${I('back', 's20')}</div><div class="tx"><div class="ti">Глаголы</div><div class="su">3 из 10</div></div>${K.energy(4)}</div><div class="trk" style="margin-top:14px"><i style="width:30%"></i></div><div class="qc" style="margin-top:26px"><div class="k">Третья форма</div><div class="q">write</div></div><div class="stack g13" style="margin-top:22px"><div class="opt">written</div><div class="opt">writed</div><div class="opt">wrote</div></div>`);

  /* ---------- предлоги ---------- */
  const prep = (ph, auto) => quiz(ph, auto, { name: 'предлоги:', two: true, ask: 'Какой предлог?', missAt: 1, mid: '<div style="flex:1;display:flex;justify-content:center"><span class="gpill">Предлоги</span></div>',
    rounds: [{ s: ['We meet', 'Monday'], o: ['in', 'on', 'at'], k: 1, ru: 'Дни недели — on.' }, { s: ['She is', 'home'], o: ['in', 'on', 'at'], k: 2, ru: 'Дома — at home.' }, { s: ['I work', 'the morning'], o: ['in', 'on', 'at'], k: 0, ru: 'Часть дня — in the morning.' }],
    show: (q, box) => { box.innerHTML = `<div class="gap rise">${q.s[0]} <span class="hole">${q.o[q.k]}</span> ${q.s[1]}</div>`; return 700; },
    done: (q, box, ok) => $(box, '.hole').classList.add(ok ? 'ok' : 'no') });
  const wasPrep = was(`<div class="hdr"><div class="rb">${I('back', 's20')}</div><div class="tx"><div class="ti">Предлоги</div><div class="su">1 из 10</div></div>${K.energy(4)}</div><div class="trk" style="margin-top:14px"><i style="width:10%"></i></div><div class="qc" style="margin-top:26px"><div class="k">Вставь предлог</div><div class="q">We meet ___ Monday</div></div><div class="stack g13" style="margin-top:22px"><div class="opt">in</div><div class="opt">on</div><div class="opt">at</div></div>`);

  /* ---------- ошибки ---------- */
  const hrow = (ic, e, r, right = '', p = null, dl = 0) => `<div class="gl hrow rise t" style="--dl:${dl}ms"><div class="ic">${I(ic)}</div><div class="tx"><div class="e">${e}</div><div class="r">${r}</div>${p === null ? '' : `<div class="bar"><i style="--p:${p}"></i></div>`}</div>${right ? `<span class="rt2">${right}</span>` : I('fwd', 's18')}</div>`;
  const ERR = [['edit', 'Does she work here?', 'Уроки · 3 промаха'], ['layers', 'I tend to agree', 'Карточки · 2 промаха'], ['vol', 'Could you say that again?', 'На слух · 1 промах'], ['chat', 'I am waiting for my friend', 'Диалоги · 1 промах']];
  const mHub = stat(`${top({ back: true, mid: '<div class="ttl">Мои ошибки</div>', right: coins() })}
    <div class="gl errc rise"><div class="ov2">За 30 дней</div><div class="stat2"><div><b class="n1">0</b><span>готовы к разбору</span></div><div><b class="n2">0</b><span>исправлено</span></div></div><div class="wcta t" style="margin-top:14px">${I('play')}Разобрать все · 4 минуты</div></div>
    <div class="over" style="margin-top:22px">Откуда приходят</div>
    <div class="hl2" style="margin-top:10px">${hrow('layers', 'Уроки', 'Чаще всего: порядок слов', '6', .5, 200)}${hrow('bookmark', 'Карточки', 'Чаще всего: значение', '4', .33, 280)}${hrow('chat', 'Диалоги', 'Чаще всего: форма глагола', '2', .17, 360)}</div>`, (ph, G) => { G.after(400, () => { count($(ph, '.n1'), 0, 12, 900); count($(ph, '.n2'), 0, 7, 900); }); });
  const mEmpty = stat(`${top({ back: true, mid: '<div class="ttl">Мои ошибки</div>' })}<div class="empty"><div class="gl ic2 rise">${I('check')}</div><div class="big rise" style="font-size:28px;--dl:120ms">Всё исправлено</div><div class="sub rise" style="--dl:200ms">Новые ошибки из уроков, карточек и диалогов появятся здесь сами.</div><div class="cta2 t rise" style="--dl:300ms;padding:0 22px;margin-top:16px">Смотреть исправленные</div></div>`);
  const mList = stat(`${top({ back: true, mid: '<div class="ttl">Мои ошибки</div>' })}<div class="tabs3"><div class="on" data-t="0">Готовы</div><div data-t="1">Все</div><div data-t="2">Исправлены</div></div><div class="hl2 lst"></div><div style="flex:1"></div><div class="wcta t">${I('play')}Отработать одну</div>`, (ph, G, auto) => {
    const sets = [ERR, ERR.concat([['edit', 'He is cooking dinner', 'Уроки · исправлена']]), [['check', 'He is cooking dinner', 'Исправлена вчера'], ['check', 'We are waiting here', 'Исправлена 9 ноября']]];
    const show = (t) => { $$(ph, '.tabs3 div').forEach((d, i) => d.classList.toggle('on', i === t)); $(ph, '.lst').innerHTML = sets[t].map(([ic, e, r], i) => hrow(ic, e, r, '', null, i * 60)).join(''); log('ошибки: вкладка', t); };
    $(ph, '.tabs3').addEventListener('click', (e) => { const d = e.target.closest('[data-t]'); if (d) show(+d.dataset.t); }); show(0);
    if (auto) { G.after(2200, () => show(2)); G.after(4200, () => show(0)); }
  });
  const steps = (n) => `<div class="steps3">${['Узнал', 'Собрал', 'Написал сам'].map((s, i) => `<div class="${i < n ? 'dn' : i === n ? 'on' : ''}">${s}</div>`).join('')}</div>`;
  const mDetail = stat(`${top({ back: true, mid: '<div class="ttl">Ошибка</div>' })}
    <div class="gl dtl rise"><div class="ov2">Правильно</div><div class="en2">Does she work here?</div><div class="p">Она здесь работает?</div></div>
    <div class="gl dtl rise" style="--dl:100ms"><div class="ov2">Твой ответ</div><div class="en2 bad">Do she work here?</div><div class="p">После she в вопросе ставится does, а не do.</div></div>
    <div class="over rise" style="margin-top:20px;--dl:200ms">Три шага до «исправлено»</div>${steps(1)}
    <div class="gl dtl rise" style="--dl:300ms;padding:6px 18px"><div class="tl2 b"><i></i>Промах<span>сегодня · урок 3</span></div><div class="tl2 g"><i></i>Узнал среди вариантов<span>сегодня</span></div><div class="tl2"><i></i>Собрать из слов<span>следующий шаг</span></div></div>
    <div style="flex:1"></div><div class="wcta t">${I('play')}Отработать</div>`);
  const mPractice = (ph, auto) => {
    const G = timers(), ans = 'Does she work here?'; let txt = '';
    $(ph, '.lay').innerHTML = `${top({ mid: '<div class="ttl" style="text-align:center">Работа над ошибками</div>', right: '<span class="gpill rn">1 из 6</span>' })}${steps(2)}
      <div class="stage"><div style="flex:.4"></div><div class="ask">Напиши сам, без подсказок</div><div class="big rise" style="text-align:center;margin-top:10px;font-size:28px;line-height:34px">Она здесь работает?</div>
        <div class="tline"><span class="tx2"></span><i class="caret"></i></div><div class="gl why hid"><div class="tl">${I('check', 's20')}</div><div class="tx"><b>Верно, сам</b>Третий шаг пройден — ошибка закрыта.</div></div><div style="flex:1"></div>
        <div class="kb">${['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => `<div class="r">${[...r].map((c) => `<div class="key" data-c="${c}">${c}</div>`).join('')}</div>`).join('')}</div></div>`;
    const put = () => { if (txt.length >= ans.length) return; txt = ans.slice(0, txt.length + 1); const k = $(ph, `.key[data-c="${txt.slice(-1).toLowerCase()}"]`); if (k) { k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 170); } $(ph, '.tx2').textContent = txt;
      if (txt === ans) { $(ph, '.tline').classList.add('ok'); $(ph, '.caret').remove(); $(ph, '.why').classList.remove('hid'); const s = $$(ph, '.steps3 div')[2]; s.classList.remove('on'); s.classList.add('dn'); log('ошибки: третий шаг пройден'); } };
    $(ph, '.kb').addEventListener('click', (e) => { if (e.target.closest('.key')) put(); });
    if (auto) [...ans].forEach((_, i) => G.after(1500 + i * 110, put));
    return () => G.clear();
  };
  const wasHub = was(`<div class="rb bare">${I('back')}</div><div class="lt"><div class="ti" style="font-size:34px">Мои ошибки</div></div><div class="card c2" style="padding:18px;margin-top:18px"><div class="ov">За 30 дней</div><div class="st3" style="margin-top:8px"><div style="text-align:left"><b style="font-size:40px">12</b><span>готовы к разбору</span></div><div><b>7</b><span>исправлено</span></div></div><div style="height:16px"></div><div class="cta">Разобрать все</div></div><div class="sec"><div class="ti">Откуда приходят</div></div><div class="stack">${ERR.slice(0, 3).map(([ic, e, r]) => `<div class="card"><div class="row"><div class="tile">${I(ic, 's20')}</div><div class="tx"><div class="tt">${e}</div><div class="st">${r}</div></div><span class="ch">${I('fwd', 's18')}</span></div></div>`).join('')}</div>`);
  const wasDetail = was(`<div class="rb bare">${I('back')}</div><div class="lt"><div class="ti" style="font-size:34px">Ошибка</div></div><div class="card c2" style="padding:18px;margin-top:18px"><div class="ov">Правильный ответ</div><div style="font-size:24px;font-weight:700;margin-top:8px">Does she work here?</div></div><div class="card c2" style="padding:18px;margin-top:12px"><div class="ov">Твой ответ</div><div style="font-size:18px;color:var(--bad);margin-top:8px">Do she work here?</div><div style="color:var(--sec);margin-top:6px">Проверь форму глагола после she.</div></div><div class="sec"><div class="ti">Хроника</div></div><div class="card"><div class="row"><div class="tile">${I('close', 's20')}</div><div class="tx"><div class="tt">Промах</div><div class="st">Сегодня · урок 3</div></div></div></div>`);
  const wasPractice = was(`<div class="rb bare">${I('back')}</div><div class="lt"><div class="ti" style="font-size:30px">Работа над ошибками</div></div><div class="flex" style="margin-top:12px;justify-content:space-between"><span class="pill s">1 из 6</span>${K.energy(4)}</div><div class="qc" style="margin-top:22px"><div class="k">Напиши ответ</div><div class="q" style="font-size:26px">Она здесь работает?</div></div><div class="field" style="margin-top:14px">Does she work here?</div><div style="height:14px"></div><div class="cta">Проверить</div><div class="cta gh" style="margin-top:12px">Скрыть ошибку</div>`);

  /* ---------- экзамены ---------- */
  const rule = (ic, t) => `<div>${I(ic, 's20')}${t}</div>`;
  const exIntro = stat(`${top({ mid: '<div class="ttl" style="text-align:center">Экзамен</div>', right: energy })}
    <div class="bigring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="66" stroke="rgba(255,255,255,.16)"/><circle class="arc" cx="75" cy="75" r="66" stroke="#fff" stroke-dasharray="415" stroke-dashoffset="415" style="transition:stroke-dashoffset 1400ms cubic-bezier(.2,.8,.2,1)"/></svg><div class="n">10<span>из 12 — сдал</span></div></div>
    <div class="hero2" style="margin-top:20px"><div class="t1">Экзамен главы 2</div><div class="t2">По эпизодам 9–15. Сдашь — откроется глава 3.</div></div>
    <div class="gl panel2 rise"><div class="rules" style="margin-top:0">${rule('layers', '12 вопросов из пройденных эпизодов')}${rule('check', 'Сдать — от 10 верных')}${rule('heart', 'Без сердец: ошибка не выгоняет')}${rule('flame', 'Не сдал — пересдача через час')}</div></div>
    <div style="flex:1"></div><div class="wcta t">${I('play')}Начать экзамен<span class="gpill" style="height:28px;padding:0 10px;margin-left:8px;background:rgba(0,0,0,.1);color:#0B0C0E;box-shadow:none">${I('boltF', 's16')}1</span></div><div class="quietl">С Plus экзамен бесплатный</div>`, (ph, G) => { G.after(400, () => { $(ph, '.arc').style.strokeDashoffset = 415 * (1 - 10 / 12); }); });
  const dots12 = (n) => `<div class="pkdots">${Array.from({ length: 12 }, (_, i) => `<i class="${i < n ? 'd' : i === n ? 'c' : ''}"></i>`).join('')}</div>`;
  const exQ = (title, tag, n, q) => (ph, auto) => {
    const G = timers(); let open = true;
    $(ph, '.lay').innerHTML = `${top({ mid: `<div class="ttl" style="text-align:center">${title}</div>`, right: `<span class="gpill">${tag}</span>` })}${dots12(n)}
      <div class="gl exq rise"><div class="over">${q.k}</div><div class="q" style="margin-top:8px">${q.q}</div></div><div class="ru fade hid">${q.ru}</div><div style="flex:1"></div><div class="ans">${tiles(q.o)}</div>`;
    const ans = $(ph, '.ans'); showTiles(ans);
    const pick = (i) => { if (!open) return; open = false; mark(ans, q.a, i); $(ph, '.ru').classList.remove('hid'); const c = $(ph, '.pkdots .c'); c.classList.remove('c'); c.classList.add(i === q.a ? 'd' : 'm'); log('экзамен: ответ', i === q.a ? 'верно' : 'ошибка'); };
    ans.addEventListener('click', (e) => { const a = e.target.closest('.at'); if (a) pick(+a.dataset.i); });
    if (auto) G.after(1900, () => pick(q.a));
    return () => G.clear();
  };
  const wasExam = was(`<div class="hdr"><div class="rb">${I('close', 's20')}</div><div class="tx"><div class="ti">Экзамен главы 2</div><div class="su">Вопрос 7 из 12</div></div></div><div class="trk" style="margin-top:14px"><i style="width:55%"></i></div><div class="qc" style="margin-top:26px"><div class="k">Выбери перевод</div><div class="q">She is writing messages</div></div><div class="stack g13" style="margin-top:22px"><div class="opt">Она пишет сообщения</div><div class="opt">Она писала сообщения</div><div class="opt">Он пишет сообщения</div></div>`);

  const S = [
    { id: 'l-lessons', title: 'Уроки: теория с заданиями, глаголы, предлоги', lead: 'Теория разбита на короткие правила, после каждого — «Проверь себя» в том же стиле, что и задания. Это шаблон экрана: тексты всех уроков и языков в него подставляются, сами тексты здесь не переписывались. Сборка фраз и словарь урока — на странице режимов.',
      screens: [
        { id: 'l-theory', fn: theory, lbl: 'Теория урока с заданиями внутри', was: wasTheory, note: 'Экран прокручивается. Каждое «Проверь себя» двигает полосу сверху и качает «Грамматику».' },
        { id: 'l-verbs', fn: verbs, lbl: 'Неправильные глаголы · список', was: wasVerbs, note: 'Нажатие на строку озвучивает три формы.' },
        { id: 'l-verbq', fn: (ph, a) => window.ELG.forms(ph, a), cls: 'deep', lbl: 'Неправильные глаголы · тренажёр', was: wasVerbQ, note: 'Третья форма встаёт в пустую ячейку.' },
        { id: 'l-prep', fn: prep, cls: 'deep', lbl: 'Предлоги · тренажёр', was: wasPrep, note: 'После ответа — правило одной строкой.' },
      ] },
    { id: 'l-mistakes', title: 'Раздел ошибок: все экраны и отработка', lead: 'Правило трёх шагов остаётся: узнал — собрал — написал сам. Оно теперь видно полосой на экране ошибки и в отработке. Итог отработки — общий экран завершения.',
      screens: [
        { id: 'e-hub', fn: mHub, lbl: 'Ошибки · главный экран', was: wasHub },
        { id: 'e-empty', fn: mEmpty, lbl: 'Ошибки · всё исправлено' },
        { id: 'e-list', fn: mList, lbl: 'Ошибки · список с вкладками', note: 'Вкладки переключаются: готовы, все, исправлены.' },
        { id: 'e-detail', fn: mDetail, lbl: 'Одна ошибка', was: wasDetail },
        { id: 'e-practice', fn: mPractice, cls: 'deep', lbl: 'Отработка · третий шаг', was: wasPractice, note: 'В макете любая клавиша набирает следующий верный знак.' },
      ] },
    { id: 'l-exams', title: 'Экзамены', lead: 'Правила прежние: 12 вопросов, сдать от 10, без сердец, пересдача через час. Вход в экзамен с карты главы утверждён и под замком — здесь только экраны самого экзамена; заменят ли они утверждённые плитки ответов, решать вам.',
      screens: [
        { id: 'x-intro', fn: exIntro, lbl: 'Экзамен · перед стартом' },
        { id: 'x-q', fn: exQ('Экзамен главы 2', '7 из 12', 6, { k: 'Выбери перевод', q: 'She is writing messages', o: ['Она пишет сообщения', 'Она писала сообщения', 'Он пишет сообщения'], a: 0, ru: '' }), cls: 'deep', lbl: 'Экзамен · вопрос', was: wasExam },
        { id: 'x-place', fn: exQ('Тест уровня', 'Тема урока 3', 2, { k: 'Как спросить?', q: 'Она здесь работает?', o: ['Do she work here?', 'Does she work here?', 'Is she work here?'], a: 1, ru: 'Тема засчитана: 2 из 3 верно — урок 3 можно пропустить' }), cls: 'deep', lbl: 'Тест «не хочу с начала»', note: 'Один вопрос на тему урока; ошибка даёт ещё два.' },
      ] },
  ];
  window.ELS = Object.assign(window.ELS || {}, { learn: S });
  if (document.body.dataset.page === 'learn') document.addEventListener('DOMContentLoaded', () => mount(S));
})();
