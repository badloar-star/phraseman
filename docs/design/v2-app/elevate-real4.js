/* «Ночные» экраны: навыки, статистика и визитки (владелец 11.11, по его снимкам).
   зачем: 1) владельцу понравился первый вариант навыков и статистики — тёмная сцена, звезда на небе, «Индекс речи», прирост
   за неделю; 2) в светлом виде визитка стала белой с белым текстом — «ничего не видно, даже замка»; в приложении визитка
   тёмная, у «Про» шесть стилей; 3) на визитке нужны полоски уровней и ВСЕ стили «Про», а не один.
   Экраны с классом night светлое оформление не перекрашивает (:not(.night) в elevate-light.css).
   Палитры стилей взяты из components/profile-card/profile_card_looks.ts — они под замком владельца, здесь не меняются. */
(() => {
  const { I, $, $$, log, timers, count, top, SK, axis, skAxes, starSvg, starLabels, starTween } = EL;
  const NAMES = SK.map((s) => s.nm), zero = SK.map(() => 0);

  /* ---------- экран «Навыки» — как на первых макетах, но с шестью навыками и уровнями ---------- */
  const WEEK = { 'Слух': 12, 'Речь': 0, 'Словарь': 8, 'Грамматика': 5, 'Скорость': 26, 'Социальный': 3 };
  const SRC = { 'Слух': 'Растёт от видео и диалогов', 'Речь': 'Растёт от диалогов голосом и режима «Устно»', 'Словарь': 'Растёт от карточек и «Найди пары»', 'Грамматика': 'Растёт от уроков, теории и работы над ошибками', 'Скорость': 'Растёт от игр «Поток» и «Блиц»', 'Социальный': 'Растёт от сердечек, комментариев, своих наборов и друзей' };
  function skills(ph, auto) {
    const G = timers(); let raf = 0; const cx = 165, cy = 150, R = 100, N = SK.length;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / N, pt = (i, k) => [cx + Math.cos(ang(i)) * R * k, cy + Math.sin(ang(i)) * R * k];
    const poly = (k) => SK.map((_, i) => pt(i, typeof k === 'function' ? k(i) : k).map((n) => n.toFixed(1)).join(',')).join(' ');
    const weak = SK.filter((s) => s.nm !== 'Социальный').reduce((a, b) => (b.lv < a.lv ? b : a)); // зачем: владелец 11.11 — «Подтянуть» предлагает только учебные навыки
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Навыки</div>', right: '<span style="width:44px"></span>' })}
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:18px;flex:none"><div><div class="over">Индекс речи</div><div class="big idx" style="margin-top:4px;font-variant-numeric:tabular-nums">0</div></div><span class="gpill" style="margin-bottom:4px">Уверенный</span></div>
      <div class="radar" style="height:300px;margin-top:4px"><svg viewBox="0 0 330 300">${[.34, .67, 1].map((k) => `<polygon class="grid" points="${poly(k)}"/>`).join('')}${SK.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="ax" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; }).join('')}<polygon class="shape" points="${poly(0)}"/>${SK.map(() => '<circle class="pt" r="4.5"/>').join('')}</svg>
        ${SK.map((s, i) => { const [x, y] = pt(i, 1.25); return `<div class="lb" style="left:${x}px;top:${y}px">${s.nm}</div>`; }).join('')}</div>
      <div class="gl skl" style="padding:2px 16px">${SK.map((s, i) => `<div class="sk" data-i="${i}" style="height:46px"><div class="nm">${s.nm}</div><div class="bar"><i></i></div><div class="val" style="width:64px;font-size:14px;font-weight:600;color:var(--ink2)">ур. <b style="font-size:18px;color:#fff;font-weight:800">${s.lv}</b></div></div>`).join('')}</div>
      <div style="flex:1"></div>`;
    const shape = $(ph, '.shape'), pts = $$(ph, '.pt');
    const draw = (p) => { const k = (i) => axis(SK[i].lv, SK[i].p) * Math.min(1, Math.max(0, p * 1.5 - i * .08)); shape.setAttribute('points', poly(k)); pts.forEach((c, i) => { const [x, y] = pt(i, k(i)); c.setAttribute('cx', x); c.setAttribute('cy', y); }); };
    const pick = (i) => { $$(ph, '.sk').forEach((r, k) => r.classList.toggle('on', k === i)); $$(ph, '.radar .lb').forEach((r, k) => r.classList.toggle('on', k === i)); pts.forEach((r, k) => r.classList.toggle('on', k === i)); log('навыки: выбран', SK[i].nm); };
    $(ph, '.skl').addEventListener('click', (e) => { const r = e.target.closest('.sk'); if (r) pick(+r.dataset.i); });
    draw(0);
    G.after(350, () => { const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - p, 3); draw(e); if (p < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); count($(ph, '.idx'), 0, 1535, 1300); $$(ph, '.sk .bar i').forEach((b, i) => G.after(i * 80, () => b.style.setProperty('--p', SK[i].p))); });
    if (auto) [4, 2, 5].forEach((i, k) => G.after(2300 + k * 1300, () => pick(i)));
    return () => { G.clear(); cancelAnimationFrame(raf); };
  }

  /* ---------- визитки: обычная и шесть стилей «Про» из приложения ---------- */
  const LOOKS = [['normal', 'Обычная'], ['holo', 'Голограмма'], ['obs', 'Обсидиан'], ['aura', 'Аура'], ['ice', 'Хрусталь'], ['space', 'Космос'], ['neon', 'Неон']];
  const ANNA = [14, 17, 11, 12, 8, 15].map((lv, i) => ({ nm: NAMES[i], lv, p: .4 }));
  const rowsOf = (list) => `<div class="prows">${list.map((s) => `<div class="prow"><span>${s.nm}</span><div class="pbar"><i style="width:${Math.round(axis(s.lv, s.p) * 100)}%"></i></div><b>${s.lv}</b></div>`).join('')}</div>`;
  const card = (look, who, list, o = {}) => `<div class="pcd pcd-${look}"${o.id ? ` id="${o.id}"` : ''}>${K.coinImg(who.rank, 76).replace('class="coin"', 'class="pav"')}
      <div class="pnm">${who.name}${look === 'normal' ? '' : '<span class="pbadge">PRO</span>'}</div><div class="prank">${who.title}</div>
      ${o.hidden ? '' : `<div class="pskills"><div class="starbox" style="width:${o.star || 190}px;height:${o.star || 190}px">${starSvg(o.star || 190, skAxes(list), o.from ? { from: zero } : {})}${starLabels(o.star || 190, NAMES)}</div>${rowsOf(list)}</div>`}
      </div>`;
  function cardPro(ph, auto) {
    const G = timers(); let cur = 2, stop = () => {};
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Визитка «Про»</div>' })}
      <div class="pchips">${LOOKS.slice(1).map(([id, n], i) => `<div class="t" data-k="${i + 1}">${n}</div>`).join('')}</div>
      <div class="pslot"></div><div style="flex:1"></div><div class="pcta t">Добавить в друзья</div>`;
    const draw = (k) => { cur = k; $$(ph, '.pchips div').forEach((d) => d.classList.toggle('on', +d.dataset.k === k)); $(ph, '.pslot').innerHTML = card(LOOKS[k][0], { name: 'Анна', rank: 12, title: 'Кадет · ранг 12' }, ANNA, { from: true }); $(ph, '.pcta').className = `pcta t pcta-${LOOKS[k][0]}`; stop(); stop = starTween($(ph, '.starsvg'), zero, skAxes(ANNA), 900, 100); log('визитка «Про»: стиль', LOOKS[k][1]); };
    $(ph, '.pchips').addEventListener('click', (e) => { const d = e.target.closest('[data-k]'); if (d) draw(+d.dataset.k); });
    draw(2);
    if (auto) [1, 3, 4, 5, 6, 2].forEach((k, i) => G.after(2200 + i * 1700, () => draw(k)));
    return () => { G.clear(); stop(); };
  }
  function cardFree(ph, auto) {
    const G = timers();
    const me = { name: 'Максим', rank: 7, title: 'Стажёр · ранг 7' };
    $(ph, '.lay').innerHTML = `${top({ back: true, mid: '<div class="ttl">Моя визитка</div>' })}
      <div class="seg2" style="margin-top:12px"><div class="on t" data-v="1">Вижу я</div><div class="t" data-v="0">Видит посторонний</div></div>
      <div class="pslot" style="margin-top:14px"></div>
      <div class="gl panel2 hint" style="margin-top:12px"><div class="h"></div><div class="sub" style="margin-top:4px"></div></div>
      <div style="flex:1"></div><div class="pcta pcta-obs t">${K.coinImg(7, 22)}&nbsp;Про визитка · 10 000</div>`;
    const set = (v) => { $$(ph, '.seg2 div').forEach((d) => d.classList.toggle('on', (d.dataset.v === '1') === v)); $(ph, '.pslot').innerHTML = card('normal', me, SK, { hidden: !v, star: 170 });
      $(ph, '.hint .h').textContent = v ? 'Сейчас навыки видишь ты и друзья' : 'Так визитку видит посторонний'; $(ph, '.hint .sub').textContent = v ? 'С визиткой «Про» звезду и уровни увидят все.' : 'Навыков на ней просто нет. С визиткой «Про» они появятся у всех.'; log('обычная визитка: вид', v ? 'свой' : 'посторонний'); };
    $(ph, '.seg2').addEventListener('click', (e) => { const d = e.target.closest('[data-v]'); if (d) set(d.dataset.v === '1'); });
    set(true);
    if (auto) { G.after(2600, () => set(false)); G.after(5600, () => set(true)); }
    return () => G.clear();
  }
  const gallery = `<div class="pcgal">${LOOKS.map(([id, n]) => `<div><div class="pcl">${n}</div>${card(id, { name: 'Анна', rank: 12, title: 'Кадет · ранг 12' }, ANNA, { star: 170 })}</div>`).join('')}</div>
    <p style="margin-top:14px">Цвета каждого стиля взяты из приложения и не менялись. На всех семи добавлено одно и то же: звезда навыков и шесть полосок уровней.</p>`;

  const S = window.ELS || {};
  const all = [S.stats].concat(S.skills || []).filter(Boolean).flatMap((x) => x.screens || []);
  const set = (id, patch) => { const s = all.find((x) => x.id === id); if (s) Object.assign(s, patch); };
  // зачем: владелец уточнил, что разница была из-за тёмной и светлой темы — навыки и статистика остаются по переключателю оформления, насильно тёмными их не делаем
  set('sk-skills', { fn: skills, cls: '', note: 'Индекс речи (сумма очков), пилюля ранга по среднему уровню, звезда и уровень каждого навыка — навыки навсегда, без «за неделю» и без подсказок (решения владельца 11.11). Нажатие на строку подсвечивает луч и пишет, от чего навык растёт.' });
  set('sk-pro', { fn: cardPro, cls: 'night deep', lbl: 'Визитка «Про»: все шесть стилей', note: 'Нажимай на название стиля сверху — карточка меняется. Звезда и полоски уровней есть на каждом.' });
  set('sk-free', { fn: cardFree, cls: 'night deep', lbl: 'Обычная визитка: что вижу я и что видит посторонний', note: 'Карточка тёмная, как в приложении. Посторонний видит ту же карточку без блока навыков — никакого замка.' });
  if (S.skills && S.skills[2]) { S.skills[2].html = gallery; S.skills[2].lead = 'Сверху — все семь визиток разом: обычная и шесть стилей «Про» из приложения, на каждой звезда и полоски уровней. Ниже — живые экраны.'; }
  // зачем (владелец 11.11: «почему только скорость и словарь? надо определить точно, какие навыки что качает, конкретно»):
  // одна таблица «действие → навык → очки»; блок «Навыки растут» на любом итоге обязан считаться только по ней
  const PTS = [['Урок: фраза собрана верно с первого раза', 'Грамматика', '+3'], ['Урок: во фразе было новое слово', 'Словарь', '+1'], ['Теория: задание внутри раздела', 'Грамматика', '+2'], ['Слова урока: верный перевод', 'Словарь', '+1'],
    ['Неправильные глаголы, предлоги: верный ответ', 'Грамматика', '+2'], ['Экзамен: верный ответ', 'Грамматика', '+3'], ['Ошибки: пройден шаг отработки', 'Грамматика или Словарь — по виду ошибки', '+2'],
    ['Блиц: верный ответ', 'Словарь', '+1'], ['Блиц: ответ быстрее трёх секунд', 'Скорость', '+1'], ['Правда / ложь: верный ответ', 'Словарь', '+1'], ['Напиши: слово по памяти', 'Словарь', '+2'], ['Устно: фраза сказана чисто', 'Речь', '+3'],
    ['Диалог: своя реплика голосом', 'Речь', '+3'], ['Диалог: реплика понята без подсказки', 'Слух', '+2'], ['Видео: минута просмотра', 'Слух', '+1'],
    ['«Поток»: верный ответ', 'Скорость', '+2, на высоком темпе +3'], ['«Лишнее слово», «Сортировка»: верный ответ', 'Грамматика', '+2'], ['«На слух»: верный ответ', 'Слух', '+2'], ['«Память», «Точное слово»: верный ответ', 'Словарь', '+2'],
    ['Пик: задание ступени', 'навык по виду задания', '+2'], ['Пик: ступень пройдена', 'Скорость', '+5'],
    ['Сердечко чужому набору', 'Социальный', '+1, не больше 5 в день'], ['Комментарий к набору', 'Социальный', '+2, не больше 3 в день'], ['Твой набор добавили себе', 'Социальный', '+5'], ['Приглашённый друг начал заниматься', 'Социальный', '+20'], ['Цель недели закрыта вместе', 'Социальный', '+15'], ['Неделя в комнате Пика сыграна до конца', 'Социальный', '+10']];
  const points = `<h3 style="font-size:18px;margin:34px 0 4px">Точно: за что сколько очков <span class="newtag" style="background:#F2F1F6;color:#0B0C0E">утверждено владельцем 11.11</span></h3><p>Уровень стоит 60 очков плюс 10 за каждый уже взятый уровень. Итог любого занятия показывает только те навыки, которые получили очки по этой таблице, — поэтому у блица это «Словарь» и «Скорость».</p>
    <p style="margin-top:10px;color:var(--text)"><b>Четыре правила, которые владелец утвердил 11.11:</b><br>1. Очки идут за каждый верный ответ сразу, а не за завершённое занятие.<br>2. Одна и та же фраза или слово в первый раз за день даёт полные очки, во второй — половину, дальше ноль.<br>3. «Скорость» растёт только за верный ответ быстрее трёх секунд в играх на время (блиц, «Поток», ступени Пика).<br>4. «Речь» растёт только от голоса: режим «Устно», реплики голосом в диалогах, кнопка «Устно» в задании урока.</p>
    <p style="margin-top:10px;color:var(--text)"><b>Решения владельца 11.11, вечер:</b><br>5. Порог скорости один на все игры: верный ответ быстрее трёх секунд.<br>6. За новый уровень — только праздник: поздравление и новая цифра на звезде и визитке. Монет и подарков нет.<br>7. «Подтянуть» предлагает только учебные навыки; «Социальный» тренировкой не подтягивается и не предлагается.<br>8. Разминка — отдельная строка каждый день, в счёт трёх заданий дня не входит. Отдельного списка игр нет.</p>
    <table class="mtx" style="margin-top:10px"><tr><th>Действие</th><th style="text-align:left">Навык</th><th style="text-align:left">Очки</th></tr>${PTS.map(([a, b, c]) => `<tr><td>${a}</td><td style="text-align:left;color:var(--text)">${b}</td><td style="text-align:left;color:var(--text)">${c}</td></tr>`).join('')}</table>`;
  if (S.skills && S.skills[3] && !String(S.skills[3].html).includes('за что сколько очков')) S.skills[3].html += points;
  window.ELCARDS = { gallery };
})();
