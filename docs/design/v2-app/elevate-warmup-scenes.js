/* Сценки карт разминки — сборка страницы макета. Подписи карт — из modules/games/warmup_state.ts (ru).
   зачем отдельным файлом: макет на утверждение не трогает общие elevate-*.js; значки — K.icon из kit.js. */
(() => {
  const I = (name) => (window.K && window.K.icon ? window.K.icon(name) : '');
  const st = (o) => Object.entries(o).map(([k, v]) => `${k}:${typeof v === 'number' ? `${v}px` : v}`).join(';');
  const el = (cls, o = {}, tag = 'i') => `<${tag} class="${cls}" style="${st(o)}"></${tag}>`;

  /* ---- образец: три утверждённые сценки (как в elevate-mechanics.app.js, GAMES) ---- */
  const flowArt = `<div class="ws-art ws-flow">${[[38, 150, 2.6, 0], [74, 96, 1.9, -0.7], [108, 190, 3.1, -1.6], [142, 120, 2.2, -0.3], [176, 164, 2.8, -2.1]]
    .map(([t, w, d, dl]) => `<i style="top:${t}px;width:${w}px;--d:${d}s;--dl:${dl}s"></i>`).join('')}</div>`;
  const cutArt = '<div class="ws-art ws-cut"><i style="width:52px"></i><i class="x" style="width:44px"></i><i style="width:70px"></i></div>';
  const sortArt = '<div class="ws-art ws-sort"><i class="bk l"></i><i class="bk r"></i><i class="cd"></i></div>';

  /* ---- новые сценки, по два варианта ---- */
  const listenA = `<div class="ws-art ws-listenA"><div class="ws-stage" style="top:24px">${Array.from({ length: 13 }, (_, k) => el('w', { left: 58 + k * 12, '--dl': `${-(k % 5) * 0.09}s` })).join('')}
    ${[38, 103, 168].map((x, i) => el(`o${i === 1 ? ' k' : ''}`, { left: x })).join('')}</div></div>`;
  const listenB = `<div class="ws-art ws-listenB"><div class="ws-stage" style="top:20px">${[0, 0.8, 1.6].map((d) => el('ring', { '--dl': `${-d}s` })).join('')}${el('src')}${el('ln')}</div></div>`;

  const memRows = [44, 78, 112, 146];
  const memA = `<div class="ws-art ws-memA"><div class="ws-stage" style="top:24px">${memRows.map((t, i) => el('l', { top: t }) + el(`r${i === 2 ? ' k' : ''}`, { top: t })).join('')}</div></div>`;
  const memB = `<div class="ws-art ws-memB"><div class="ws-stage" style="top:40px">${[34, 86, 138, 190].map((x, i) => el(`c${i === 1 ? ' k' : ''}`, { left: x })).join('')}</div></div>`;

  const exactA = `<div class="ws-art ws-exactA"><div class="ws-stage" style="top:20px">${el('p', { left: 40, width: 60 })}${el('gap')}${el('p', { left: 168, width: 60 })}
    ${el('ch k')}${el('ch n')}</div></div>`;
  const exactB = `<div class="ws-art ws-exactB"><div class="ws-stage" style="top:0px">${el('p', { left: 40, width: 60 })}${el('gap')}${el('w')}${el('p', { left: 168, width: 60 })}</div></div>`;

  const formsA = `<div class="ws-art ws-formsA"><div class="ws-stage" style="top:16px">${el('cell', { left: 40 })}${el('cell', { left: 105 })}${el('cell e', { left: 170 })}${el('drop', { left: 170 })}</div></div>`;
  const formsB = `<div class="ws-art ws-formsB"><div class="ws-stage" style="top:0px">${el('st', { left: 50, height: 46 })}${el('st', { left: 108, height: 78 })}
    <i class="st e" style="left:166px;height:110px"><i class="fill"></i></i></div></div>`;

  const huntA = `<div class="ws-art ws-huntA"><div class="ws-stage" style="top:20px">
    ${el('bub', { left: 28, top: 52, width: 150 })}${el('wd', { left: 42, top: 66, width: 46 })}${el('wd', { left: 96, top: 66, width: 66 })}
    ${el('bub', { left: 90, top: 112, width: 150 })}${el('wd', { left: 104, top: 126, width: 40 })}${el('bad', { left: 152, top: 126, width: 34 })}${el('wd', { left: 194, top: 126, width: 32 })}
    ${el('scan')}</div></div>`;
  const huntB = `<div class="ws-art ws-huntB"><div class="ws-stage" style="top:0px">${el('wd', { left: 34, width: 48 })}${el('wd', { left: 90, width: 52 })}${el('bad')}${el('wd', { left: 198, width: 36 })}${el('lens')}</div></div>`;

  const orderA = `<div class="ws-art ws-orderA"><div class="ws-stage" style="top:26px">${[[30, 44, 120, 0, ''], [118, 78, 120, 0.35, ' r'], [30, 112, 140, 0.7, ''], [104, 146, 134, 1.05, ' r']]
    .map(([x, y, w, d, r]) => el(`bub${r}`, { left: x, top: y, width: w, 'animation-delay': `${d}s` })).join('')}</div></div>`;
  // перепутанный порядок: каждая плашка стартует с места другой и встаёт на своё
  const orderB = `<div class="ws-art ws-orderB"><div class="ws-stage" style="top:22px">${[[56, 2], [88, 0], [120, 3], [152, 1]]
    .map(([y, from], i) => el(`pl${i % 2 ? ' s' : ''}`, { top: y, '--fx': `${(from - i) * 6}px`, '--fy': `${(from - i) * 32}px` })).join('')}</div></div>`;

  const raceA = `<div class="ws-art ws-raceA"><div class="ws-stage" style="top:0px">${el('ln', { top: 82 })}${el('gh', { top: 82 })}${el('ln', { top: 142 })}${el('me', { top: 142 })}</div></div>`;
  const raceB = `<div class="ws-art ws-raceB"><div class="ws-stage" style="top:0px"><i class="tr"><i class="fl"></i></i>${el('mk')}</div></div>`;

  const SKILL = { speed: ['boltF', 'Скорость'], grammar: ['layers', 'Грамматика'], listening: ['vol', 'Слух'], vocab: ['bookmark', 'Словарь'] };
  const card = (g, art, n) => `<div class="ws-card g${(n % 3) + 1}">
      <div class="ws-tags"><span class="ws-tag">${I(SKILL[g.skill][0])}${SKILL[g.skill][1]}</span></div>
      ${art}
      <div class="ws-cap"><div class="ws-nm">${g.nm}</div><div class="ws-ds">${g.ds}</div></div>
    </div>`;

  const READY = [
    { nm: 'Поток', ds: 'Фраза мелькает — успей понять смысл', skill: 'speed', art: flowArt },
    { nm: 'Лишнее слово', ds: 'Убери слово, которое ломает фразу', skill: 'grammar', art: cutArt },
    { nm: 'Сортировка', ds: 'Разложи фразы: сейчас или обычно', skill: 'grammar', art: sortArt },
  ];
  const NEW = [
    { nm: 'На слух', ds: 'Послушай фразу и выбери, что прозвучало', skill: 'listening', a: [listenA, 'звук бьётся и затихает, верная из трёх плашек загорается'], b: [listenB, 'волны расходятся от точки звука, фраза проявляется'] },
    { nm: 'Память', ds: 'Запомни пары и вспомни одну из них', skill: 'vocab', a: [memA, 'переводы расплываются и гаснут, один возвращается'], b: [memB, 'карточки переворачиваются рубашкой, одна открывается'] },
    { nm: 'Точное слово', ds: 'Выбери слово, которое встаёт в пропуск', skill: 'vocab', a: [exactA, 'из двух слов одно поднимается в пропуск, другое гаснет'], b: [exactB, 'пропуск мерцает, слово въезжает и защёлкивается'] },
    { nm: 'Три формы', ds: 'Назови третью форму глагола', skill: 'grammar', a: [formsA, 'две ячейки полны, в третью падает форма'], b: [formsB, 'три ступени, третья заливается снизу'] },
    { nm: 'Охота на ошибку', ds: 'Найди в диалоге одно неверное слово', skill: 'grammar', a: [huntA, 'луч идёт по переписке, слово краснеет и встаёт верным'], b: [huntB, 'лупа идёт по строке и находит неверное слово'] },
    { nm: 'Собери диалог', ds: 'Расставь реплики по порядку', skill: 'grammar', a: [orderA, 'реплики по очереди влетают в переписку'], b: [orderB, 'перепутанные плашки сами встают по порядку'] },
    { nm: 'Гонка с собой', ds: 'Обгони свой вчерашний заход', skill: 'speed', a: [raceA, 'твоя монета обгоняет вчерашнюю тень'], b: [raceB, 'полоса проходит отметку вчерашнего результата'] },
  ];

  const ready = `<section class="ws-section"><h2 class="ws-h2">Готовые сценки — образец стиля</h2><div class="ws-row">${READY
    .map((g, i) => `<div class="ws-slot">${card(g, g.art, i)}<div class="ws-lbl"><b>${g.nm}</b> · утверждено</div></div>`).join('')}</div></section>`;
  const fresh = `<section class="ws-section"><h2 class="ws-h2">Новые сценки — по два варианта, выбрать один</h2><div class="ws-row">${NEW
    .map((g, i) => `<div class="ws-game"><div class="ws-pair">${[['А', g.a], ['Б', g.b]]
      .map(([v, [art, note]]) => `<div class="ws-slot">${card(g, art, i + 3)}<div class="ws-lbl"><b>${g.nm}</b> · вариант ${v}</div><div class="ws-note">${note}</div></div>`).join('')}</div></div>`).join('')}</div></section>`;

  document.getElementById('ws-root').innerHTML = ready + fresh;
  // зачем: для снимка страницы петли встают на характерный кадр (?still=доля петли, например 0.6)
  const still = new URLSearchParams(location.search).get('still');
  if (still !== null) {
    document.querySelectorAll('.ws-art *').forEach((node) => {
      const cs = getComputedStyle(node);
      const dur = parseFloat(cs.animationDuration) || 0;
      if (!dur) return;
      const delay = parseFloat(cs.animationDelay) || 0;
      node.style.animationDelay = `${delay - dur * Number(still)}s`;
    });
    document.body.classList.add('ws-still');
  }
})();
