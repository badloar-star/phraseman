/* peak-friends-room.app.js — «Комната друзей» в Пике на РЕАЛЬНОМ кадре (scene_peak_graphite_dark.png, каркас comp-kit.js).
   зачем (владелец 29.10 через координатора; исследование competitive-branch-research, идея 5): приватная комната на 2–8 друзей со своей
   таблицей недели РЯДОМ с общей комнатой — переключатель «Комната недели · Друзья» на месте заголовка панели, сама панель та же по
   размеру и месту (левая колонка Пика, башня справа не тронута). Состояния: пусто («позови друзей»), 2 друга, 8 друзей, итог недели.
   Ступени — те же, что в общей комнате (один отчёт — в оба документа), места — только среди своих. Журнал — [PFR]. */
(() => {
const LOG = '[PFR]'; const K = window.CK; const { io, ci, phone, overOn, col, panel, row, btn, sheet } = K;
const F = 'scene_peak_graphite_dark.png';
/* геометрия кадра (px 1080 × 2400): заголовок «Комната недели 29» 640…700, панель комнаты 700…1200, «29 место» 1210…1370,
   «Все участники» 1420…1450; левая колонка x 50…500 → телефон x 16, ширина 206; чистая полоса неба для фона блока — x 1040 */
const BOX = { x: 16, y: 636, w: 206, h: 822 };
const ME = ['Ты', 5]; const FRIENDS = [['Аня', 12, 19, 'этаж 2'], ['Марк', 9, 11, 'этаж 1'], ['Лидия', 1, 9, 'этаж 1'], ['Олег', 7, 8, 'этаж 1'], ['Соня', 3, 6, 'этаж 1'], ['Женя', 14, 4, 'этаж 1'], ['Тимур', 10, 2, 'этаж 1']];
const MY_STEPS = 23;
const seg = (n) => `<div class="pfr-seg"><div class="ck-seg"><span class="t" data-act="seg:room">Комната недели <small>29</small></span><span class="on t" data-act="seg:friends">Друзья${n ? ` <small>${n}</small>` : ''}</span></div></div>`;
const place = (i) => `<span class="pl">${i}</span>`;
const friendRow = (i, [name, rank, steps, floor], compact) => row(place(i) + ci(rank, compact ? 24 : 30), name, compact ? '' : floor, `${steps}`, `friend:${name}`, compact ? 'pfr-compact' : '');
const meRow = (i, compact) => row(place(i) + ci(ME[1], compact ? 24 : 30), 'Ты', compact ? '' : 'этаж 2', `${MY_STEPS}`, '', `me${compact ? ' pfr-compact' : ''}`);
const table = (list, compact) => { const all = [['Ты', ME[1], MY_STEPS, 'этаж 2']].concat(list).sort((a, b) => b[2] - a[2]); return all.map((f, i) => (f[0] === 'Ты' ? meRow(i + 1, compact) : friendRow(i + 1, f, compact))).join(''); };
const inviteRow = (free) => row(`<span class="ic">${io('person-add-outline')}</span>`, 'Позвать ещё', `свободно ${free} ${free === 1 ? 'место' : free < 5 ? 'места' : 'мест'}`, '', 'open:invite', 'ck-dim');
const BODY = {
  empty: () => seg(0) + panel('', '', `<div class="ck-empty"><span class="ck-ic">${io('people-outline')}</span><b>Позови друзей</b><p>Своя комната на 2–8 человек: ступени недели и места — только среди своих. Общая комната остаётся.</p>${btn('Позвать', 'glass sm', 'open:invite', 'person-add-outline')}</div>`, 'glass'),
  two: () => seg(3) + panel('', '', table(FRIENDS.slice(0, 2), false) + inviteRow(5) + `<p class="ck-note">Ступени считаются те же, что в общей комнате. Итог — в понедельник.</p>`, 'glass'),
  eight: () => seg(8) + panel('', '', table(FRIENDS, true) + `<p class="ck-note">Все 8 мест заняты · итог в понедельник</p>`, 'glass'),
  result: () => seg(8) + panel('', '', table(FRIENDS, true) + `<p class="ck-note">Неделя закончилась — итог в шторке</p>`, 'glass'),
};
const will = (st) => phone(F, { overlays: overOn(F, BOX.x, BOX.y, BOX.w, BOX.h, BODY[st]()) }).replace('data-ph="ck-ph"', `data-ph="ck-ph" data-state="${st}"${st === 'result' ? ' data-open="result"' : ''}`);
const CODE_TXT = 'PHRASE-7K2Q';
const SHEETS = {
  invite: () => sheet('Комната друзей', `${row(`<span class="ic">${io('people-outline')}</span>`, 'От 2 до 8 человек', 'Друзья из вкладки «Друзья» или по коду', '')}${row(`<span class="ic">${io('footsteps-outline')}</span>`, 'Те же ступени недели', 'Отдельно считать ничего не нужно', '')}${row(`<span class="ic">${io('trophy-outline')}</span>`, 'Места — только среди своих', 'Общая комната остаётся как есть', '')}<div class="ck-code t" data-act="copy"><span>${CODE_TXT}</span>${io('copy-outline')}</div>${btn('Поделиться', 'solid', 'share', 'paper-plane-outline')}${btn('Выбрать из друзей', 'tonal', 'toast:Выбор из списка друзей — как в «Уроке вместе»', 'people-outline')}`),
  result: () => sheet('Итог недели · Друзья', `<div class="ck-podium"><div class="p2">${ci(12, 36)}<div class="st">2</div><b>Аня</b><small>19 ступеней</small></div><div class="p1">${ci(5, 44)}<div class="st">1</div><b>Ты</b><small>23 ступени</small></div><div class="p3">${ci(9, 36)}<div class="st">3</div><b>Марк</b><small>11 ступеней</small></div></div>${row(`<span class="ic">${io('ribbon-outline')}</span>`, 'Ты — первое место среди друзей', 'Общая комната: 4-е место, повышение в Мрамор', '')}${row(`<span class="ic">${io('refresh')}</span>`, 'Новая неделя началась', 'Комната та же, ступени с нуля', '')}${btn('В новую неделю', 'solid', 'close', 'play')}<p class="ck-note">Монеты за места среди друзей — на решение владельца (сейчас: без монет, награды общей комнаты не меняются).</p>`),
  friend: (ph) => { const name = ph.dataset.friend || 'Аня'; const f = FRIENDS.find((x) => x[0] === name) || FRIENDS[0]; return sheet(name, `${row(ci(f[1], 44), `${f[2]} ступеней на этой неделе`, `${f[3]} · серия 7 дней`, '')}<div class="pfr-acts">${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}${btn('Позвать', 'tonal sm', 'toast:Позвал на ступень', 'rocket-outline')}</div>`); },
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
  lead: 'Слева — Пик как сейчас (кадр сборки, тема «Затмение»). Справа — тот же кадр: на месте заголовка «Комната недели» переключатель «Комната недели · Друзья»; панель друзей стоит ровно там, где панель комнаты, башня справа не тронута. Тап по «Комната недели» возвращает кадр как есть; «Позвать» открывает шторку с кодом; тап по другу — его карточка. Переключай состояния чипами.',
  costs: [['Чтения', '1 документ spire_friend_rooms/{id} при открытии Пика, кэш 30 мин как у комнаты недели → ≈ 1–2 чтения на человека в день'], ['Записи', 'ступени уже уходят пачкой в одной транзакции — к ней +1 запись в документ комнаты друзей (≈ 1–3 в день на играющего); итог недели — функция по расписанию: 1 запись на комнату + 1 на участника (≤ 9 в неделю на комнату); приглашение 1 запись, принятие 1'], ['Итого', 'на 1000 активных ≈ +2 чтения и +3 записи на человека в день ≈ $0,007 в день (цены eur3 из server-triggers-cost)'], ['Контракт', 'новая коллекция spire_friend_rooms — пишет только сервер; имена и ступени видны только членам комнаты (политика: как «итог недели друга»); на утверждение Ядра']],
  states: [['empty', 'Пусто · позови друзей'], ['two', '2 друга'], ['eight', '8 друзей'], ['result', 'Итог недели']],
  body: (st) => [col('Сейчас · Пик, кадр приложения', phone(F)), col({ empty: 'Как будет · пустая комната друзей', two: 'Как будет · 2 друга + ты', eight: 'Как будет · 8 друзей (все места)', result: 'Как будет · итог недели (шторка)' }[st], will(st))],
};
K.mount({ sections: [SECTION], sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ frame: F, have: K.have(F) })); // guard-ok: одна строка на страницу
window.__pfr = { SECTION, FRIENDS };
})();
