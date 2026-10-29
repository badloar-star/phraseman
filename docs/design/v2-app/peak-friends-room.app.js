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
const dat = (name) => ({ 'Аня': 'Ане', 'Марк': 'Марку', 'Лидия': 'Лидии', 'Олег': 'Олегу', 'Соня': 'Соне', 'Женя': 'Жене', 'Тимур': 'Тимуру' }[name] || name);
const seg = () => `<div class="pfr-seg"><div class="ck-seg"><span class="t" data-act="seg:room">Комната недели</span><span class="on t" data-act="seg:friends">Друзья</span></div></div>`;
const place = (i) => `<span class="pl">${i}</span>`;
const friendRow = (i, [name, rank, n], compact) => row(place(i) + ci(rank, compact ? 24 : 30), name, '', steps(n), `friend:${name}`, compact ? 'pfr-compact' : '');
const meRow = (i, compact) => row(place(i) + ci(ME.rank, compact ? 24 : 30), 'Ты', '', steps(ME.steps), '', `me${compact ? ' pfr-compact' : ''}`);
const table = (list, compact) => { const all = [['Ты', ME.rank, ME.steps]].concat(list).sort((a, b) => b[2] - a[2]); return all.map((f, i) => (f[0] === 'Ты' ? meRow(i + 1, compact) : friendRow(i + 1, f, compact))).join(''); };
const inviteRow = (free) => row(`<span class="ic">${io('person-add-outline')}</span>`, 'Позвать ещё', '', `${free} ${plural(free, 'место', 'места', 'мест')}`, 'open:invite', 'ck-dim'); // короткий заголовок, справа «5 мест» — узкая панель, без обрезки
const BODY = {
  empty: () => seg() + panel('', '', `<div class="ck-empty"><span class="ck-ic">${io('people-outline')}</span><b>Позови друзей в свою комнату</b>${btn('Позвать', 'glass sm', 'open:invite', 'person-add-outline')}</div>`, 'glass'),
  two: () => seg() + panel('', '', table(FRIENDS.slice(0, 2), false) + inviteRow(5), 'glass'),
  eight: () => seg() + panel('', '', table(FRIENDS, true), 'glass'),
  result: () => seg() + panel('', '', table(FRIENDS, true) + btn('Итог недели', 'glass sm', 'open:result', 'ribbon-outline'), 'glass'),
};
const will = (st) => phone(F, { overlays: overOn(F, BOX.x, BOX.y, BOX.w, BOX.h, BODY[st]()) }).replace('data-ph="ck-ph"', `data-ph="ck-ph" data-state="${st}"${st === 'result' ? ' data-open="result"' : ''}`);
const CODE_TXT = 'PHRASE-7K2Q';
const SHEETS = {
  invite: () => sheet('Комната друзей', `${row(`<span class="ic">${io('people-outline')}</span>`, 'От 2 до 8 человек', '', '')}${row(`<span class="ic">${io('footsteps-outline')}</span>`, 'Те же ступени недели, что в общей комнате', '', '')}${row(`<span class="ic">${io('trophy-outline')}</span>`, 'Места — только среди своих', '', '')}<div class="ck-code t" data-act="copy"><span>${CODE_TXT}</span>${io('copy-outline')}</div>${btn('Поделиться', 'solid', 'share', 'paper-plane-outline')}${btn('Выбрать из друзей', 'tonal', 'toast:Список друзей', 'people-outline')}`),
  result: () => sheet('Итог недели среди друзей', `${row(place(1) + ci(ME.rank, 34), 'Ты', '', steps(ME.steps), '', 'me')}${row(place(2) + ci(12, 34), 'Аня', '', steps(19))}${row(place(3) + ci(9, 34), 'Марк', '', steps(11))}${row(`<span class="ic">${io('ribbon-outline')}</span>`, 'В общей комнате — 4-е место, повышение в Мрамор', '', '')}${row(`<span class="ic">${io('refresh')}</span>`, 'Новая неделя: комната та же, ступени с нуля', '', '')}${btn('В новую неделю', 'solid', 'close', 'play')}`),
  friend: (ph) => { const name = ph.dataset.friend || 'Аня'; const f = FRIENDS.find((x) => x[0] === name) || FRIENDS[0]; return sheet(name, `${row(ci(f[1], 44), `${steps(f[2])} на этой неделе`, '', '')}${row(`<span class="ic">${io('flame-outline')}</span>`, f[3][0].toUpperCase() + f[3].slice(1), '', '')}<div class="pfr-acts">${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}${btn('Позвать', 'tonal sm', `toast:Позвал ${dat(name).replace(/у$|е$|и$/, (m) => m)} — приглашение отправлено`, 'rocket-outline')}</div>`); },
};
const onAct = (name, arg, node, ph) => {
  if (name === 'seg') { // переключатель внутри телефона: «Комната недели» показывает кадр как есть, «Друзья» — блок поверх
    const over = ph.querySelector('.ck-over'); if (!over) return true;
    over.classList.toggle('pfr-hidden', arg === 'room'); over.querySelectorAll('.ck-seg span').forEach((s) => s.classList.toggle('on', s.dataset.act === `seg:${arg}`));
    if (arg === 'room') { const peek = ph.querySelector('.pfr-peek') || K.el(`<div class="pfr-peek t" data-act="seg:friends">${io('people')}Друзья</div>`); ph.querySelector('.rf-body').appendChild(peek); } else { const p = ph.querySelector('.pfr-peek'); if (p) p.remove(); }
    return true;
  }
  if (name === 'friend') { ph.dataset.friend = arg; K.openSheet(ph, 'friend'); return true; }
  return false;
};
const SECTION = {
  id: 'pfr', title: 'Комната друзей в Пике — своя таблица недели рядом с общей комнатой',
  lead: 'Слева — Пик как сейчас (кадр сборки, тема «Затмение»). Справа — тот же кадр: на месте заголовка «Комната недели» переключатель «Комната недели · Друзья»; панель друзей стоит ровно там, где панель комнаты, башня справа не тронута. Тап по «Комната недели» возвращает кадр как есть; «Позвать» открывает шторку с кодом; тап по другу — его карточка («Дать пять», «Позвать»). Переключай состояния чипами. Ступени считаются те же, что в общей комнате, итог подводится в понедельник; монеты за места среди друзей не начисляются (награды общей комнаты не меняются) — если владелец захочет монеты, цифры на утверждение.',
  costs: [['Чтения', '1 документ spire_friend_rooms/{id} при открытии Пика, кэш 30 мин как у комнаты недели → ≈ 1–2 чтения на человека в день'], ['Записи', 'ступени уже уходят пачкой в одной транзакции — к ней +1 запись в документ комнаты друзей (≈ 1–3 в день на играющего); итог недели — функция по расписанию: 1 запись на комнату + 1 на участника (≤ 9 в неделю на комнату); приглашение 1 запись, принятие 1'], ['Итого', 'на 1000 активных ≈ +2 чтения и +3 записи на человека в день ≈ $0,007 в день (цены eur3 из server-triggers-cost)'], ['Контракт', 'новая коллекция spire_friend_rooms — пишет только сервер; имена и ступени видны только членам комнаты (политика: как «итог недели друга»); на утверждение Ядра'], ['Выбор друзей', 'кнопка «Выбрать из друзей» в шторке открывает список друзей, как в «Уроке вместе»']],
  states: [['empty', 'Пусто · позови друзей'], ['two', '2 друга'], ['eight', '8 друзей'], ['result', 'Итог недели']],
  body: (st) => [col('Сейчас · Пик, кадр приложения', phone(F)), col({ empty: 'Как будет · пустая комната друзей', two: 'Как будет · 2 друга + ты', eight: 'Как будет · 8 друзей (все места)', result: 'Как будет · итог недели (шторка)' }[st], will(st))],
};
K.mount({ sections: [SECTION], sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ frame: F, have: K.have(F) })); // guard-ok: одна строка на страницу
window.__pfr = { SECTION, FRIENDS };
})();
