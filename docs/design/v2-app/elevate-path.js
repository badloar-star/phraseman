/* Макет-прохождение (владелец 11.11: «чтобы я мог проверить путь… с подсказкой нажми сюда… поиграть… окна для комментариев…
   одной кнопкой скопировать всё»). Один телефон, маршруты из уже нарисованных экранов (window.ELS), на каждом шаге подсвечено,
   куда нажать; игры играются по-настоящему. Комментарии живут только в браузере (localStorage) и копируются текстом.
   Журнал — префикс [PATH]: какой маршрут и шаг открыт, что нажато, что скопировано. */
(() => {
  const { I, P, result } = EL;
  const log = (...a) => console.log('[PATH]', ...a);
  const S = window.ELS || {};
  const SCREENS = {};
  [S.entry, S.results, S.stats, S.modes, S.games, S.peak].concat(S.learn || [], S.social || [], S.skills || []).filter(Boolean).forEach((sec) => (sec.screens || []).forEach((s) => { SCREENS[s.id] = s; }));
  (window.ELP1 || []).forEach((s) => { SCREENS['p1-' + s.id] = s; });
  SCREENS['warm-result'] = { id: 'warm-result', lbl: 'Итог разминки', fn: result({ title: 'Разминка', ring: { v: 3, of: 3, p: 1, label: 'игры' }, h1: 'Разминка пройдена', h2: 'Четыре ошибки отработаны за четыре минуты', cta: 'Готово', coins: 50,
    panels: [P.star([['Скорость', .2], ['Грамматика', .2]]), P.mistakes('Вернётся завтра', [['We usually wait here', 'привычка, а не «сейчас»']])] }) };
  if (S.results) SCREENS['r-lesson'] = S.results.screens.find((x) => x.id === 'r-lesson');

  // шаг: [экран, что здесь нового, подсказка, куда нажать (селектор или список — продвигает последний), пауза перед переходом]
  const PLAY = 'Сыграй сам — хоть одно задание, хоть все. Когда насмотришься, нажми «Дальше» справа.';
  const ROUTES = [
    { id: 'warm', name: 'Разминка с Главной', steps: [
      ['home', 'В блоке «Сегодня» над тремя заданиями дня появилась строка разминки.', 'Нажми на строку «Разминка на 4 минуты».', '.rw.nw', 500],
      ['p1-flow', 'Первая игра — «Поток»: фраза мелькает, после верного ответа темп растёт.', PLAY],
      ['inter', 'Между играми нет экрана выбора — отсчёт, и следующая игра стартует сама.', 'Нажми на экран, чтобы не ждать отсчёта.', '.inter', 300],
      ['p1-cut', 'Вторая игра — «Лишнее слово»: слово падает, монета идёт по тропе.', PLAY],
      ['p1-sort', 'Третья игра — «Сортировка»: карту смахивают в одну из двух сторон.', 'Тащи карту мышью влево или вправо либо нажимай на корзины. Потом — «Дальше» справа.'],
      ['warm-result', 'Итог разминки: что пройдено и какие навыки выросли.', 'Нажми на блок «Навыки растут».', '.starp', 300],
      ['sk-skills', 'Экран «Навыки»: шесть навыков, у каждого 30 уровней.', 'Нажми на любой навык — откроется, от чего он растёт.'],
    ] },
    { id: 'cards', name: 'Карточки: тренировка на 5 минут', steps: [
      ['mix', 'Над пятью нынешними строками — блок «Тренировка на 5 минут» с одной кнопкой.', 'Нажми «Тренироваться».', '.wcta', 500],
      ['m-blitz', 'Блиц — как сейчас: полоса, таймер, четыре варианта.', PLAY],
      ['m-truth', '«Правда / ложь» стала смахиванием карты.', 'Тащи карту мышью или нажимай на корзины. Потом — «Дальше» справа.'],
      ['m-write', '«Напиши»: ячейка на каждую букву.', 'Нажимай буквы на клавиатуре в телефоне. Потом — «Дальше» справа.'],
      ['r-blitz', 'Итог — нынешний экран плюс блок «Навыки растут».', 'Нажми на блок «Навыки растут».', '.starp', 300],
      ['sk-skills', 'Тот же экран «Навыки».', 'Нажми на любой навык.'],
    ] },
    { id: 'lesson', name: 'Урок', steps: [
      ['m-build', 'Задание урока — как сейчас; выбранное слово перелетает в строку.', 'Собери фразу из плиток и нажми «Проверить» внизу. Потом — «Дальше» справа.'],
      ['l-theory', 'В теории задание стоит прямо внутри раздела и двигает счётчик заданий.', 'Выбери ответ в задании внутри раздела.', '.chk2 .at', 2400],
      ['l-verbq', 'Неправильные глаголы: верная форма встаёт в пропуск.', PLAY],
      ['m-words', 'Слова урока — тренировка как сейчас.', PLAY],
      ['r-lesson', 'Итог урока. Его я с приложения не снимал — это предложение.', 'Посмотри блок «Навыки растут» и нажми «Дальше» справа.'],
    ] },
    { id: 'mist', name: 'Ошибки и отработка', steps: [
      ['e-hub', 'Раздел повторяет нынешний; кнопка открывает нынешнее окно «Отработка».', 'Нажми «Отработать 3», потом «Начать».', ['.lay > .wcta', '.sh2 .wcta'], 500],
      ['e-practice', 'Второй шаг отработки: собери фразу из слов.', 'Нажимай слова по порядку, потом «Проверить». Затем — «Дальше» справа.'],
      ['e-detail', 'На экране одной ошибки добавлена полоса трёх шагов.', 'Посмотри полосу «Три шага» и нажми «Дальше» справа.'],
      ['r-mist', 'Итог отработки. С приложения не снят — предложение.', 'Нажми «Дальше» справа.'],
    ] },
    { id: 'peak', name: 'Пик: задания ступени', steps: [
      ['pk-gap', 'Все задания Пика стоят в одной рамке ступени.', 'Выбери слово для пропуска.', '.ans .at', 1800],
      ['pk-reply', 'Пары «вопрос — ответ».', 'Нажми вопрос слева, потом ответ справа. Затем — «Дальше» справа.'],
      ['pk-order', 'Реплики улетают в переписку.', 'Нажимай реплики по порядку разговора. Затем — «Дальше» справа.'],
      ['pk-repair', 'Найди неверное слово в диалоге.', 'Нажми на слово, которое считаешь ошибкой.'],
      ['pk-typed', 'Впиши слово по буквам.', 'Нажимай буквы на клавиатуре в телефоне.'],
    ] },
    { id: 'games', name: 'Остальные новые игры', steps: [
      ['g-listen', '«На слух»: фраза звучит всё быстрее.', PLAY], ['g-memory', '«Память»: пары видны три секунды.', PLAY], ['g-race', '«Гонка с собой»: нижняя монета — вчерашний заход.', PLAY],
      ['g-exact', '«Точное слово»: два похожих варианта.', PLAY], ['g-minute', '«Минута знаний» после ошибки.', 'Прочитай и нажми «Понятно».', '.wcta', 300],
    ] },
    { id: 'dialogs', name: 'Диалоги', steps: [
      ['d-hub', 'Раздел как сейчас; в шапке кнопка продолжает начатый диалог.', 'Нажми «Продолжить диалог».', '.hsc .wcta', 300],
      ['d-brief', 'Перед разговором — задача и нужные фразы. С приложения не снято.', 'Нажми «Начать разговор».', '.wcta', 300],
      ['d-talk', 'Собеседник «печатает», под полем подсказки.', 'Нажимай на микрофон или подсказку — уйдёт следующая реплика. Потом — «Дальше» справа.'],
      ['d-coach', 'Итог диалога с ростом «Речи» и «Слуха».', 'Нажми «Дальше» справа.'],
    ] },
    { id: 'packs', name: 'Наборы', steps: [
      ['p-pack', 'Кнопка набора запускает все режимы подряд, без окна выбора.', 'Нажми круглую кнопку у любого набора.', '.playb', 4300],
      ['p-catalog', 'Сердечко чужому набору качает «Социальный».', 'Нажми на сердечко у набора.', '.hrt', 2600],
      ['p-card', 'Карточка переворачивается.', 'Нажми на карточку, потом «Дальше» под ней.'],
    ] },
    { id: 'growth', name: 'Навыки, визитка, друзья', steps: [
      ['stats', 'В «Серии и результатах» добавлен блок навыков.', 'Нажми на блок «Навыки».', '.starrow', 300],
      ['sk-skills', 'Экран «Навыки».', 'Нажми на любой навык.'], ['sk-story', 'История «уровень поднялся».', 'Нажми на экран — откроется второй кадр.'],
      ['sk-free', 'Обычная визитка: что вижу я и что видит посторонний.', 'Переключай «Вижу я / Видит посторонний».'], ['sk-pro', 'Визитка Pro со звездой и уровнями.', 'Нажми «Дальше» справа.'],
      ['sk-friends', 'Друзья со звёздами.', 'Нажми на друга — его звезда ляжет пунктиром на твою.'],
    ] },
  ];

  /* ---------- комментарии: только в браузере ---------- */
  const KEY = 'elevate-path-comments-v1';
  let notes = {}; try { notes = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { log('чтение комментариев не удалось — начинаю с пустых', String(e)); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) { log('сохранение комментариев не удалось', String(e)); } };
  const key = (r, i) => `${ROUTES[r].id}/${i}`;
  const MARKS = ['Нравится', 'Переделать', 'Убрать'];
  const filled = (k) => notes[k] && (notes[k].t || notes[k].m);
  function exportText() {
    const out = ['Комментарии к макетам PhraseMan (страница-прохождение)']; let n = 0;
    ROUTES.forEach((rt, r) => { const lines = []; rt.steps.forEach((st, i) => { const v = notes[key(r, i)]; if (!v || (!v.t && !v.m)) return; n += 1; lines.push(`${i + 1}. ${(SCREENS[st[0]] || {}).lbl || st[0]}${v.m ? ` — [${v.m}]` : ''}${v.t ? `\n   ${v.t.trim().replace(/\n/g, '\n   ')}` : ''}`); }); if (lines.length) out.push('', `== ${rt.name} ==`, ...lines); });
    if (notes.general && notes.general.t) { n += 1; out.push('', '== Общее ==', notes.general.t.trim()); }
    return { text: out.join('\n'), n };
  }

  /* ---------- состояние и отрисовка ---------- */
  let r = 0, i = 0, stop = null, hotIdx = 0, tm = [];
  const $ = (s) => document.querySelector(s);
  const ph = () => $('#pph');
  const clear = () => { tm.forEach(clearTimeout); tm = []; };
  const later = (ms, fn) => { tm.push(setTimeout(fn, ms)); };
  function ring() { // зачем: подсветка «нажми сюда» лежит поверх экрана и не мешает нажатию
    const st = ROUTES[r].steps[i], hots = st[3] ? [].concat(st[3]) : [], box = $('#hot'); const sel = hots[hotIdx];
    const el = sel && ph().querySelector(sel); if (!el) { box.style.display = 'none'; return; }
    const a = ph().getBoundingClientRect(), b = el.getBoundingClientRect(); if (b.width < 4 || b.bottom < a.top || b.top > a.bottom) { box.style.display = 'none'; return; }
    Object.assign(box.style, { display: 'block', left: b.left - a.left - 6 + 'px', top: b.top - a.top - 6 + 'px', width: b.width + 12 + 'px', height: b.height + 12 + 'px', borderRadius: (parseFloat(getComputedStyle(el).borderRadius) || 16) + 6 + 'px' });
    box.dataset.below = b.top - a.top < 120 ? '1' : '';
  }
  function show() {
    clear(); if (stop) { try { stop(); } catch (e) { log('остановка экрана', String(e)); } stop = null; } hotIdx = 0;
    const rt = ROUTES[r], st = rt.steps[i], sc = SCREENS[st[0]], p = ph();
    p.dataset.ph = st[0]; p.className = `ph sky ${sc && sc.cls ? sc.cls : ''}`; p.querySelector('.lay').className = 'lay'; p.querySelector('.lay').innerHTML = '';
    if (!sc) { p.querySelector('.lay').innerHTML = `<div class="empty"><div class="big" style="font-size:22px">Экран «${st[0]}» не найден</div></div>`; log('нет экрана', st[0]); } else stop = sc.fn(p, false) || null;
    log('маршрут', rt.name, 'шаг', i + 1, st[0]);
    $('#rts').innerHTML = ROUTES.map((x, k) => `<button class="${k === r ? 'on' : ''}" data-r="${k}">${x.name}</button>`).join('');
    $('#stp').textContent = `Шаг ${i + 1} из ${rt.steps.length}`; $('#ttl').textContent = (sc && sc.lbl) || st[0]; $('#new').textContent = st[1]; $('#hint').textContent = st[2];
    $('#nx').textContent = i === rt.steps.length - 1 ? (r === ROUTES.length - 1 ? 'Маршруты пройдены' : 'К следующему маршруту →') : 'Дальше →'; $('#nx').classList.toggle('glow', !st[3]);
    $('#pv').disabled = i === 0 && r === 0;
    const v = notes[key(r, i)] || {}; $('#txt').value = v.t || ''; $('#mk').innerHTML = MARKS.map((m) => `<button class="${v.m === m ? 'on' : ''}" data-m="${m}">${m}</button>`).join('');
    $('#lst').innerHTML = rt.steps.map((x, k) => `<div class="${k === i ? 'on' : ''}${filled(key(r, k)) ? ' has' : ''}" data-i="${k}"><b>${k + 1}</b><span>${(SCREENS[x[0]] || {}).lbl || x[0]}</span><i>${(notes[key(r, k)] || {}).m || (filled(key(r, k)) ? 'есть заметка' : '')}</i></div>`).join('');
    $('#cnt').textContent = `Комментариев: ${exportText().n}`;
    [300, 900, 1700].forEach((ms) => later(ms, ring));
  }
  const go = (d) => { const rt = ROUTES[r]; if (d > 0 && i === rt.steps.length - 1) { if (r < ROUTES.length - 1) { r += 1; i = 0; } } else if (d < 0 && i === 0) { if (r > 0) { r -= 1; i = ROUTES[r].steps.length - 1; } } else i += d; show(); };
  const cur = () => { const k = key(r, i); notes[k] = notes[k] || {}; return notes[k]; };

  document.addEventListener('DOMContentLoaded', () => {
    $('#general').value = (notes.general && notes.general.t) || '';
    ph().addEventListener('click', (e) => {
      const st = ROUTES[r].steps[i], hots = st[3] ? [].concat(st[3]) : []; const sel = hots[hotIdx]; if (!sel || !e.target.closest(sel)) return;
      log('нажата подсвеченная цель', sel); if (hotIdx < hots.length - 1) { hotIdx += 1; [350, 800].forEach((ms) => later(ms, ring)); return; }
      $('#hot').style.display = 'none'; later(st[4] || 600, () => go(1));
    }, true);
    ph().addEventListener('scroll', ring, true);
    ph().addEventListener('el-done', () => { log('игра сообщила «готово» — перехожу дальше'); later(1400, () => go(1)); });
    document.addEventListener('click', (e) => {
      const th = e.target.closest('[data-theme-set]'); if (th) { document.body.dataset.theme = th.dataset.themeSet; document.querySelectorAll('[data-theme-set]').forEach((x) => x.classList.toggle('on', x === th)); return; }
      const b = e.target.closest('[data-r]'); if (b) { r = +b.dataset.r; i = 0; show(); return; }
      const li = e.target.closest('#lst [data-i]'); if (li) { i = +li.dataset.i; show(); return; }
      const m = e.target.closest('[data-m]'); if (m) { const c = cur(); c.m = c.m === m.dataset.m ? '' : m.dataset.m; save(); show(); return; }
      if (e.target.closest('#nx')) go(1); if (e.target.closest('#pv')) go(-1); if (e.target.closest('#rs')) show();
      if (e.target.closest('#cp')) {
        const { text, n } = exportText(); $('#out').value = text; $('#out').style.display = 'block';
        const done = (ok) => { $('#cpm').textContent = ok ? `Скопировано: ${n} — вставь в чат` : 'Не удалось скопировать сам — выдели текст ниже и скопируй вручную'; log('копирование', ok ? 'удалось' : 'не удалось', 'комментариев', n); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true)).catch((err) => { log('буфер обмена отказал', String(err)); $('#out').select(); done(document.execCommand('copy')); });
        else { $('#out').select(); done(document.execCommand('copy')); }
      }
      if (e.target.closest('#clr') && window.confirm('Стереть все комментарии на этой странице?')) { notes = {}; save(); $('#general').value = ''; show(); }
    });
    $('#txt').addEventListener('input', (e) => { cur().t = e.target.value; save(); $('#cnt').textContent = `Комментариев: ${exportText().n}`; });
    $('#general').addEventListener('input', (e) => { notes.general = { t: e.target.value }; save(); $('#cnt').textContent = `Комментариев: ${exportText().n}`; });
    K.init(); show();
  });
  window.__path = { go, exportText, ROUTES, SCREENS, set: (a, b) => { r = a; i = b; show(); } };
})();
