/* peak-friends-room.app.js — «Комната друзей» в Пике на РЕАЛЬНОМ кадре (scene_peak_graphite_dark.png, каркас comp-kit.js).
   зачем (владелец 29.10 через координатора; исследование competitive-branch-research, идея 5): приватная комната на 2–8 друзей со своей
   таблицей недели РЯДОМ с общей комнатой — переключатель «Комната недели · Друзья» на месте заголовка панели, сама панель та же по
   размеру и месту (левая колонка Пика, башня справа не тронута). Состояния: пусто («позови друзей»), 2 друга, 8 друзей, итог недели.
   Ступени — те же, что в общей комнате (один отчёт — в оба документа), места — только среди своих.
   Правки координатора 29.10: в телефоне ни служебных пометок, ни подписей-расшифровок, ни плиток с крупными числами; цвета — токены
   темы; числа — внутри фраз («19 ступеней»); у друзей разные серии; итог недели — строками. Журнал — [PFR]. */
(() => {
const LOG = '[PFR]'; const K = window.CK; const { io, ci, phone, overOn, col, panel, row, btn, sheet } = K;
const F = 'scene_peak_graphite_dark.png';
/* геометрия кадра (px 1080 × 2400): заголовок «Комната недели 29» 640…700, панель комнаты 700…1200, «29 место» 1210…1370,
   «Все участники» 1420…1450; левая колонка x 50…500 → телефон x 16, ширина 206; подложка блока — чистая полоса неба у левого края */
const BOX = { x: 16, y: 636, w: 206, h: 822 };
const ME = { name: 'Ты', rank: 5, steps: 23, series: 'серия 12 дней' };
const FRIENDS = [['Аня', 12, 19, 'серия 9 дней'], ['Марк', 9, 11, 'серия 3 дня'], ['Лидия', 1, 9, 'серия 21 день'], ['Олег', 7, 8, 'серия 2 дня'], ['Соня', 3, 6, 'вчера занималась'], ['Женя', 14, 4, 'серия 5 дней'], ['Тимур', 10, 2, 'сегодня первый раз']];
const plural = (n, one, few, many) => { const m10 = n % 10; const m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };
const steps = (n) => `${n} ${plural(n, 'ступень', 'ступени', 'ступеней')}`;
const acc = (name) => ({ 'Аня': 'Аню', 'Марк': 'Марка', 'Лидия': 'Лидию', 'Олег': 'Олега', 'Соня': 'Соню', 'Женя': 'Женю', 'Тимур': 'Тимура' }[name] || name); // винительный: «Позвал Аню»
/* заголовок панели друзей — той же строкой и кеглем, что «Комната недели 29» на кадре (блок поверх закрывает её, пока показаны друзья) */
const head = () => `<div class="pfr-head">Друзья</div>`;
/* круглая кнопка 44 dp у заголовка (x 505 px кадра — сразу после «29», свободное небо; y — по центру строки заголовка): показывает панель друзей, повторно — комнату */
/* зачем (координатор 29.10 по проверке v6, владелец ругался на наложение): кнопка заходила на панель друзей (~6 px по высоте, ~21 px по
   ширине) — теперь строго в строке заголовка (замер кадра: строка 659…695, центр 677 → верх 619) и ПРАВЕЕ панели: левый край 582 =
   правый край панели (558) + 24 px (9 dp ≥ 8 dp), правый 698 — до шпиля башни (≥ 737 на этих строках) ≥ 39 px (15 dp) */
const ROUND = { x: 582, y: 619, size: 116 };
const roundBtn = (on) => `<div class="pfr-round t${on ? ' on' : ''}" data-act="seg:${on ? 'room' : 'friends'}" style="left:${K.RF.px(ROUND.x)}px;top:${K.RF.px(ROUND.y)}px;width:${K.RF.px(ROUND.size)}px;height:${K.RF.px(ROUND.size)}px">${io(on ? 'people' : 'people-outline')}</div>`;
const place = (i) => `<span class="pl">${i}</span>`;
const friendRow = (i, [name, rank, n], compact) => row(place(i) + ci(rank, compact ? 24 : 30), name, '', steps(n), `friend:${name}`, compact ? 'pfr-compact' : '');
const meRow = (i, compact) => row(place(i) + ci(ME.rank, compact ? 24 : 30), 'Ты', '', steps(ME.steps), '', `me${compact ? ' pfr-compact' : ''}`);
const table = (list, compact) => { const all = [['Ты', ME.rank, ME.steps]].concat(list).sort((a, b) => b[2] - a[2]); return all.map((f, i) => (f[0] === 'Ты' ? meRow(i + 1, compact) : friendRow(i + 1, f, compact))).join(''); };
const inviteRow = (free) => row(`<span class="ic">${io('person-add-outline')}</span>`, 'Позвать ещё', '', `${free} ${plural(free, 'место', 'места', 'мест')}`, 'open:invite', 'ck-dim'); // короткий заголовок, справа «5 мест» — узкая панель, без обрезки
const BODY = {
  empty: () => head() + panel('', '', `<div class="ck-empty"><span class="ck-ic">${io('people-outline')}</span><b>Позови друзей в свою комнату</b>${btn('Позвать', 'glass sm', 'open:invite', 'person-add-outline')}</div>`, 'glass'),
  two: () => head() + panel('', '', table(FRIENDS.slice(0, 2), false) + inviteRow(5), 'glass'),
  eight: () => head() + panel('', '', table(FRIENDS, true), 'glass'),
  result: () => head() + panel('', '', table(FRIENDS, true) + btn('Итог недели', 'glass sm', 'open:result', 'ribbon-outline'), 'glass'),
};
const will = (st) => phone(F, { overlays: overOn(F, BOX.x, BOX.y, BOX.w, BOX.h, BODY[st]()) + roundBtn(true) }).replace('data-ph="ck-ph"', `data-ph="ck-ph" data-state="${st}"${st === 'result' ? ' data-open="result"' : ''}`);
const CODE_TXT = 'PHRASE-7K2Q';
const SHEETS = {
  invite: () => sheet('Комната друзей', `${row(`<span class="ic">${io('people-outline')}</span>`, 'От 2 до 8 человек', '', '')}${row(`<span class="ic">${io('footsteps-outline')}</span>`, 'Те же ступени недели, что в общей комнате', '', '')}${row(`<span class="ic">${io('trophy-outline')}</span>`, 'Места — только среди своих', '', '')}<div class="ck-code t" data-act="copy"><span>${CODE_TXT}</span>${io('copy-outline')}</div>${btn('Поделиться', 'solid', 'share', 'paper-plane-outline')}${btn('Выбрать из друзей', 'tonal', 'open:pick', 'people-outline')}`),
  pick: () => sheet('Кого позвать', `${ALL_FRIENDS.map(([n, r, , s]) => row(ci(r, 36), n, '', s, `pick:${n}`, PICKED.has(n) ? 'pfr-sel' : '')).join('')}${btn('Позвать выбранных', 'solid', 'pickDone', 'paper-plane-outline').replace('class="ck-btn', 'data-pick-btn class="ck-btn')}`),
  result: () => sheet('Итог недели среди друзей', `${row(place(1) + ci(ME.rank, 34), 'Ты', '', steps(ME.steps), '', 'me')}${row(place(2) + ci(12, 34), 'Аня', '', steps(19))}${row(place(3) + ci(9, 34), 'Марк', '', steps(11))}${row(`<span class="ic">${io('ribbon-outline')}</span>`, 'В общей комнате — 4-е место, повышение в Мрамор', '', '')}${row(`<span class="ic">${io('refresh')}</span>`, 'Новая неделя: комната та же, ступени с нуля', '', '')}${btn('В новую неделю', 'solid', 'close', 'play')}`),
  friend: (ph) => { const name = ph.dataset.friend || 'Аня'; const f = FRIENDS.find((x) => x[0] === name) || FRIENDS[0]; return sheet(name, `${row(ci(f[1], 44), `${steps(f[2])} на этой неделе`, '', '')}${row(`<span class="ic">${io('flame-outline')}</span>`, f[3][0].toUpperCase() + f[3].slice(1), '', '')}<div class="pfr-acts">${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}${btn('Позвать', 'tonal sm', `toast:Позвал ${acc(name)} — приглашение отправлено`, 'rocket-outline')}</div>`); },
};
const ALL_FRIENDS = FRIENDS.concat([['Вера', 6, 0, 'серия 4 дня'], ['Паша', 11, 0, 'вчера занимался']]); const PICKED = new Set(['Аня']);
const onAct = (name, arg, node, ph) => {
  if (name === 'pick') { if (PICKED.has(arg)) PICKED.delete(arg); else PICKED.add(arg); node.classList.toggle('pfr-sel', PICKED.has(arg)); K.once(node, 'pop'); const b = ph.querySelector('[data-pick-btn]'); if (b) b.lastChild.textContent = PICKED.size ? `Позвать выбранных — ${PICKED.size}` : 'Выбери друзей'; return true; }
  if (name === 'pickDone') { if (!PICKED.size) return true; K.closeSheet(ph); K.after(380, () => K.toast(ph, PICKED.size === 1 ? `Позвал ${acc([...PICKED][0])}` : `Позвал друзей: ${PICKED.size}`, 'paper-plane-outline')); return true; }
  if (name === 'seg') { // круглая кнопка у заголовка «Комната недели»: нажатие показывает панель друзей, повторное — комнату (владелец 29.10 ~11:05); отклик мгновенный
    const over = ph.querySelector('.ck-over'); const b = ph.querySelector('.pfr-round'); if (!over || !b) return true;
    const friends = arg === 'friends'; over.classList.toggle('pfr-hidden', !friends); b.classList.toggle('on', friends); b.innerHTML = io(friends ? 'people' : 'people-outline'); b.dataset.act = friends ? 'seg:room' : 'seg:friends'; K.once(b, 'pop');
    return true;
  }
  if (name === 'friend') { ph.dataset.friend = arg; K.openSheet(ph, 'friend'); return true; }
  return false;
};
const SECTION = {
  id: 'pfr', title: 'Комната недели и панель друзей',
  lead: '', // зачем (координатор 29.10): перед показом владельцу поясняющий абзац и таблицу стоимости не показываем — служебный текст
  states: [['empty', 'Пусто · позови друзей'], ['two', '2 друга'], ['eight', '8 друзей'], ['result', 'Итог недели']],
  body: (st) => [col('Сейчас · Пик, кадр приложения', phone(F)), col({ empty: 'Как будет · пустая комната друзей', two: 'Как будет · 2 друга + ты', eight: 'Как будет · 8 друзей (все места)', result: 'Как будет · итог недели (шторка)' }[st], will(st))],
};
K.mount({ sections: [SECTION], sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ frame: F, have: K.have(F) })); // guard-ok: одна строка на страницу
window.__pfr = { SECTION, FRIENDS };
})();
