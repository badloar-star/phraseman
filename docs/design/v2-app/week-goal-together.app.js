/* week-goal-together.app.js — «Цель недели вдвоём» на РЕАЛЬНОМ кадре вкладки «Друзья» (now_friends_top_graphite_dark.png; каркас comp-kit.js).
   зачем (владелец 29.10 ~13:20 через координатора): «на Главной его не должно быть! … В разделе Друзья — хорошо, но там надо показывать
   СРАЗУ уже с друзьями, со списками, чтобы я видел, как всё будет выглядеть на самом деле». Поэтому раздел Главной снят, а вкладка собрана
   как в приложении с друзьями (app/(tabs)/friends.tsx, кадра со списком у Сверки пока нет — заказан): лента «Итоги недели» (FriendWeekRail:
   заголовок 19/24 + счётчик + «пн · 9:00», карточки 236 r22 с монетой 40, огнём/книгой/подиумом и «Дать пять»), шапка списка («Активные
   заявки» + счётчик, круглый «+» 44), карточка заявки (FriendsRequestCard: монета 44, «Хочет добавить тебя в друзья», «Принять»/«Отклонить»),
   заголовок «Твои друзья», строки друзей (FriendListRow: плашка 64 r14, монета 44, имя 16/21, огонь пары + подпись 13/18, шеврон или
   «Позвать» 36). Карточка цели — под заголовком «Твои друзья», над строками. Внутри телефона ни пометок, ни подписей-расшифровок.
   Дни цели считаются из дней активности обоих (как серия вдвоём) — новых чтений нет. Журнал — [WG]. */
(() => {
const LOG = '[WG]'; const K = window.CK; const { io, ci, phone, col, panel, row, btn, sheet, bar } = K;
const FR = 'now_friends_top_graphite_dark.png';
/* геометрия кадра (px 1080 × 2400): вкладки «Пик · Друзья · Наборы» 193…265 (подчёркивание до 265), пустое состояние 930…1540 — вырезаем
   всё от 300 до 1540 и на это место ставим вкладку со списком; подложка вставки — градиент по цветам кадра на краях выреза */
const FR_CUT = [300, 1540];
/* подложка вставки — две полосы самого кадра (4 px у верхнего края выреза и 4 px у нижнего), растянутые на всю высоту вставки и
   смешанные сверху вниз: у верхнего и нижнего края цвета совпадают с кадром по всей ширине (у плоского градиента были стыки под вкладками
   и у нижнего края — координатор 29.10) */
const band = (y0, y1, cls) => `<svg class="wf-bg${cls ? ' ' + cls : ''}" viewBox="0 ${y0} 1080 ${y1 - y0}" preserveAspectRatio="none" aria-hidden="true"><image href="${K.DIR + FR}" width="1080" height="2400"/></svg>`;
const BG = () => band(FR_CUT[0] - 4, FR_CUT[0], '') + band(FR_CUT[1], FR_CUT[1] + 4, 'lo');
/* друзья как в приложении: монета ранга, серия, что делал; pair — «Серия вдвоём» (огонь пары: on / dim / off, дни, подпись pairRowSubline);
   call — справа «Позвать» вместо шеврона (друг ещё не занимался или сегодня никто); rel — подпись без пары («N дней вместе») */
const FRIENDS = [
  { n: 'Аня', r: 12, streak: 'серия 9 дней', did: 'занималась сегодня', pair: { tone: 'on', days: 9, text: 'Оба занимались сегодня' } },
  { n: 'Марк', r: 9, streak: 'серия 3 дня', did: 'занимался вчера', pair: { tone: 'dim', days: 3, text: 'Сегодня ещё без занятия' }, call: true },
  { n: 'Лидия', r: 1, streak: 'серия 21 день', did: 'занималась сегодня', pair: { tone: 'on', days: 21, text: 'Занятие сделано · ждёт тебя' } },
  { n: 'Олег', r: 7, streak: 'серия 2 дня', did: 'занимался вчера', pair: { tone: 'dim', days: 5, text: 'Сегодня ещё никто из вас' }, call: true },
  { n: 'Соня', r: 3, streak: 'серия 1 день', did: 'занималась сегодня', pair: null, rel: '3 дня вместе' },
  { n: 'Женя', r: 14, streak: 'серия прервалась', did: 'занимался на прошлой неделе', pair: { tone: 'off', days: 0, text: 'Серия прервалась' } },
];
const REQUEST = { n: 'Ирина', r: 2 }; let REQ = 'open'; // входящая заявка: open → accepted / declined (мгновенно, без ожидания сети)
/* лента «Итоги недели» (прошлая неделя 19–25 октября): у кого были занятия — огонь/уроки/этаж и «Дать пять»; кто пропустил — «Позвать» */
const WEEK = [
  { n: 'Лидия', r: 1, kind: 'active', streak: 7, lessons: 9, floor: 4, line: 'Неделя без пропусков' },
  { n: 'Аня', r: 12, kind: 'active', streak: 5, lessons: 6, floor: 3, line: null },
  { n: 'Олег', r: 7, kind: 'rested' },
];
const WEEK_RANGE = '19–25 октября';
const CASES = { 'Аня': ['Ане', 'Ани', 'Аней', 'Аню', true], 'Марк': ['Марку', 'Марка', 'Марком', 'Марка', false], 'Лидия': ['Лидии', 'Лидии', 'Лидией', 'Лидию', true], 'Олег': ['Олегу', 'Олега', 'Олегом', 'Олега', false], 'Соня': ['Соне', 'Сони', 'Соней', 'Соню', true], 'Женя': ['Жене', 'Жени', 'Женей', 'Женю', false], 'Ирина': ['Ирине', 'Ирины', 'Ириной', 'Ирину', true] };
const dat = (name) => (CASES[name] || [name])[0]; const gen = (name) => (CASES[name] || [, name])[1] || name; const ins = (name) => (CASES[name] || [, , name])[2] || name; const acc = (name) => (CASES[name] || [, , , name])[3] || name; const fem = (name) => (CASES[name] || [, , , , true])[4];
const INVITER = ['Аня', 12]; const INVITED_DAYS = 5; // сторона друга: Аня предлагает 5 дней из 7 (пример координатора 29.10)
let PICK = 'Аня'; let PICK_DAYS = 7; // выбор в шторке «Цель недели вдвоём»: друг и дни — меняют цель после «Предложить»
/* данные состояний: цель (дней), сделано у меня и у друга, осталось дней — сходятся: сделано ≤ прошедших дней, друг успевает */
const DATA = { none: null, waiting: 'waiting', invited: 'invited', expired: 'expired', active: { goal: 7, me: 4, fr: 4, left: 3 }, lag: { goal: 5, me: 4, fr: 2, left: 3 }, done: { goal: 7, me: 7, fr: 7, left: 0 } };
const ANSWER_DAYS = 3; // предложение без ответа гаснет через 3 дня (координатор 29.10)
let FRIEND = ['Аня', 12];
const CALLED = new Set(); const HF = new Set(); // «Позвать» / «Дать пять» — нажатое помнится при перерисовке раздела
const days = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'дня' : 'дней'}`;
const line = (name, rank, n, goal, act = '') => `<div class="wg-line${act ? ' t' : ''}"${act ? ` data-act="${act}"` : ''}>${ci(rank, 26)}<span class="nm">${name}</span><span class="bars">${bar(Math.round((n / goal) * 100))}</span><span class="n">${n} из ${goal}</span></div>`;
const card = (st) => {
  const d = DATA[st];
  if (!d) return panel('Цель недели вдвоём', '', btn('Выбрать друга', 'tonal sm', 'open:pick', 'people-outline'));
  // сторона предлагающего: ждём ответа друга, отсчёт дней до того, как предложение погаснет
  if (d === 'waiting') return panel('Цель недели вдвоём', `ждём ответа ${gen(FRIEND[0])}`, `${row(ci(FRIEND[1], 30), `${FRIEND[0]} · ${days(PICK_DAYS)} на этой неделе`, '', `ещё ${days(ANSWER_DAYS)}`, '', 'wg-wait')}<div class="wg-foot"><span class="wg-reward soft">${io('gift')}100 монет обоим</span>${btn('Отменить', 'tonal sm', 'cancel', 'close')}</div>`);
  // сторона друга: предложение с ответом в два касания
  if (d === 'invited') return panel(`${INVITER[0]} предлагает цель: ${days(INVITED_DAYS)} из 7`, '', `${row(ci(INVITER[1], 30), '100 монет обоим', '', `ещё ${days(ANSWER_DAYS)}`, '', 'wg-wait')}<div class="wg-acts">${btn('Принять', 'solid sm', 'accept', 'checkmark')}${btn('Не сейчас', 'tonal sm', 'decline', 'close')}</div>`);
  // без ответа три дня — предложение погасло
  if (d === 'expired') return panel('Цель недели вдвоём', '', `${row(ci(FRIEND[1], 30), `${FRIEND[0]} не ответил${fem(FRIEND[0]) ? 'а' : ''} — предложение погасло`, '', '', '', 'wg-wait')}${btn('Предложить снова', 'tonal sm', 'open:pick', 'refresh')}`);
  const lines = line('Ты', 5, d.me, d.goal) + line(FRIEND[0], FRIEND[1], d.fr, d.goal, `friend:${FRIEND[0]}`);
  if (st === 'done') return panel('Цель недели вдвоём', `${io('checkmark-circle')} выполнена`, `${lines}<div class="wg-foot"><span class="wg-reward">${io('gift')}100 монет тебе и ${dat(FRIEND[0])}</span>${btn('Забрать', 'solid sm', 'claim', 'sparkles')}</div>`);
  const foot = st === 'lag'
    ? `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}100 монет обоим</span>${btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline')}</div>`
    : `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}100 монет обоим</span></div>`;
  return panel('Цель недели вдвоём', `ещё ${days(d.left)}`, `${lines}${foot}`);
};
/* вкладка «Друзья» как в приложении */
const pill = (label, ic, cls, act) => `<span class="wf-pill${cls ? ' ' + cls : ''}${act ? ' t' : ''}"${act ? ` data-act="${act}"` : ''}>${ic ? io(ic) : ''}${label}</span>`;
const weekCard = (w) => {
  const head = `<div class="hd">${ci(w.r, 40)}<div class="tx"><div class="nm">${w.n}</div><div class="rg">${WEEK_RANGE}</div></div></div>`;
  if (w.kind === 'rested') return `<div class="wf-wk rest">${head}<div class="rest">Без занятий на этой неделе. Позовёшь?</div><div class="wf-grow"></div>${CALLED.has(w.n) ? pill('Позвали', 'checkmark', 'done') : pill('Позвать', 'notifications-outline', '', `call:${w.n}`)}</div>`;
  const stats = `<div class="wf-st"><span>${io('flame')}${w.streak}</span><span>${io('book')}${w.lessons}</span><span>${io('podium')}${w.floor}</span></div>`;
  return `<div class="wf-wk">${head}${stats}${w.line ? `<div class="ln">${w.line}</div>` : ''}<div class="wf-grow"></div>${HF.has(w.n) ? pill('Пять отправлено', 'checkmark', 'done') : pill('Дать пять', 'hand-left-outline', '', `hf:${w.n}`)}</div>`;
};
const rail = () => `<div class="wf-sec"><div class="tl"><b>Итоги недели</b><span class="wf-cnt">${WEEK.length}</span></div><span class="wf-when">пн · 9:00</span></div><div class="wf-rail">${WEEK.map(weekCard).join('')}</div>`;
const friendRow = (f) => {
  const sub = f.pair
    ? `<div class="wf-sub"><span class="fl ${f.pair.tone}">${io('flame')}${f.pair.days ? days(f.pair.days) : ''}</span><span class="pt">${f.pair.text}</span></div>`
    : `<div class="wf-sub"><span class="pt">${f.rel || f.did}</span></div>`;
  const right = f.call ? (CALLED.has(f.n) ? pill('Позвали', 'checkmark', 'call done') : pill('Позвать', '', 'call', `call:${f.n}`)) : `<span class="chev">${io('chevron-forward')}</span>`;
  return `<div class="wf-card"><span class="t" data-act="friend:${f.n}">${ci(f.r, 44)}</span><div class="tx t" data-act="friend:${f.n}"><div class="nm">${f.n}</div>${sub}</div>${right}</div>`;
};
const requestCard = () => `<div class="wf-card wf-req"><div class="top">${ci(REQUEST.r, 44)}<div class="tx"><div class="nm">${REQUEST.n}</div><div class="wf-sub"><span class="pt">Хочет добавить тебя в друзья</span></div></div></div><div class="acts">${btn('Принять', 'solid', 'req:accept')}${btn('Отклонить', 'ghost', 'req:decline')}</div></div>`;
const listHeader = () => `<div class="wf-sec"><div class="tl">${REQ === 'open' ? `<b>Активные заявки</b><span class="wf-cnt">1</span>` : '<b>Твои друзья</b>'}</div><span class="wf-rb">${io('add')}</span></div>`;
const rowsOf = () => (REQ === 'accepted' ? [{ n: REQUEST.n, r: REQUEST.r, pair: null, rel: 'Сегодня в друзьях' }, ...FRIENDS] : FRIENDS).map(friendRow).join('');
/* вкладка целиком: лента, шапка, заявка, «Твои друзья», [карточка цели], строки; goal = null — как сейчас, без карточки */
const tab = (goal) => `<div class="wf">${rail()}${listHeader()}${REQ === 'open' ? `${requestCard()}<div class="wf-title">Твои друзья</div>` : ''}${goal || ''}${rowsOf()}</div>`;
const frPhone = (html) => phone(FR, { cut: FR_CUT, inserts: [{ y: FR_CUT[0], html: `<div class="wf-ins">${BG()}${html}</div>` }] });
const frNow = () => frPhone(tab(null));
const frWill = (st) => frPhone(tab(card(st))); // карточка друга — только по тапу (координатор 29.10: не всплывать поверх тоста)
const sectionOf = (ph) => ph.closest('section.block').id;
const rightPhone = (id) => document.querySelector(`#${id} .col:nth-child(2) .ph`); /* зачем: правый телефон — «как будет»; .lbl тоже div, поэтому nth-of-type ловил левый */
const pickRows = () => FRIENDS.map((f) => row(ci(f.r, 36), f.n, '', f.streak, `choose:${f.n}`, f.n === PICK ? 'wg-sel' : '')).join('');
const SHEETS = {
  pick: () => sheet('Цель недели вдвоём', `${pickRows()}<div class="wg-days"><span class="t${PICK_DAYS === 5 ? ' on' : ''}" data-act="days:5">5 дней</span><span class="t${PICK_DAYS === 7 ? ' on' : ''}" data-act="days:7">7 дней</span></div>${btn(`Предложить ${dat(PICK)}`, 'solid', 'propose', 'paper-plane-outline').replace('class="ck-btn', 'data-propose class="ck-btn')}`),
  friend: (ph) => { const name = ph.dataset.friend || FRIEND[0]; const f = FRIENDS.find((x) => x.n === name) || FRIENDS[0]; const st = K.state[sectionOf(ph)] || 'active'; const d = typeof DATA[st] === 'object' ? DATA[st] : null; const mine = name === FRIEND[0] && !!d; const pending = st === 'waiting' && name === FRIEND[0]; const inv = st === 'invited' && name === INVITER[0]; /* зачем: карточка друга показывает то же, что карточка цели на этом экране — в т. ч. «ждём ответа» и приглашение, без повторного «Предложить цель» */ return sheet(name, `${row(ci(f.r, 44), f.streak[0].toUpperCase() + f.streak.slice(1), '', f.did)}${mine ? row(`<span class="ic">${io('flag-outline')}</span>`, d.left ? `Цель недели: ${d.fr} из ${d.goal}, ещё ${days(d.left)}` : `Цель недели выполнена: ${d.fr} из ${d.goal}`, '', '') : pending ? row(`<span class="ic">${io('flag-outline')}</span>`, `Предложение отправлено, ждём ответа ещё ${days(ANSWER_DAYS)}`, '', '') : inv ? row(`<span class="ic">${io('flag-outline')}</span>`, `Предлагает цель: ${days(INVITED_DAYS)} из 7`, '', '') : row(`<span class="ic">${io('flag-outline')}</span>`, 'Цели недели вдвоём пока нет', '', '')}${mine ? `<div class="wg-sheet-bars">${line('Ты', 5, d.me, d.goal)}${line(name, f.r, d.fr, d.goal)}</div>` : ''}<div class="wg-acts">${mine ? (d.left ? btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline') : '') : pending ? '' : inv ? btn('Принять', 'solid sm', 'accept', 'checkmark') : btn('Предложить цель', 'tonal sm', 'open:pick', 'flag-outline')}${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}</div>`); },
};
const onAct = (name, arg, node, ph) => {
  if (name === 'choose') { PICK = arg; node.parentElement.querySelectorAll('.ck-row').forEach((r) => r.classList.toggle('wg-sel', r === node)); const b = ph.querySelector('[data-propose]'); if (b) b.lastChild.textContent = `Предложить ${dat(PICK)}`; K.once(node, 'pop'); return true; }
  if (name === 'days') { PICK_DAYS = Number(arg); node.parentElement.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s === node)); K.once(node, 'pop'); return true; }
  if (name === 'propose') { // мгновенно: карточка показывает «ждём ответа» (друг и дни из шторки), сеть догоняет
    const f = FRIENDS.find((x) => x.n === PICK) || FRIENDS[0]; FRIEND = [f.n, f.r]; DATA.active = { goal: PICK_DAYS, me: Math.min(4, PICK_DAYS - 1), fr: Math.min(4, PICK_DAYS - 1), left: 3 }; DATA.done = { goal: PICK_DAYS, me: PICK_DAYS, fr: PICK_DAYS, left: 0 };
    K.closeSheet(ph); const id = sectionOf(ph); K.after(360, () => { K.setState(id, 'waiting'); const nph = rightPhone(id); if (nph) K.toast(nph, `Предложение отправлено ${dat(FRIEND[0])}`, 'paper-plane-outline'); }); return true;
  }
  if (name === 'accept') { // мгновенно: цель открывается с нуля на предложенные дни, сеть догоняет
    FRIEND = [INVITER[0], INVITER[1]]; DATA.active = { goal: INVITED_DAYS, me: 0, fr: 0, left: 7 }; DATA.done = { goal: INVITED_DAYS, me: INVITED_DAYS, fr: INVITED_DAYS, left: 0 };
    const id = sectionOf(ph); K.setState(id, 'active'); const nph = rightPhone(id); if (nph) K.toast(nph, `Цель с ${ins(FRIEND[0])} принята`, 'checkmark-circle'); return true;
  }
  if (name === 'decline') { const id = sectionOf(ph); K.setState(id, 'none'); const nph = rightPhone(id); if (nph) K.toast(nph, `${INVITER[0]} узнает: не сейчас`, 'close'); return true; }
  if (name === 'cancel') { const id = sectionOf(ph); K.setState(id, 'none'); const nph = rightPhone(id); if (nph) K.toast(nph, 'Предложение отменено', 'close'); return true; }
  if (name === 'friend') { ph.dataset.friend = arg; K.openSheet(ph, 'friend'); return true; }
  if (name === 'nudge') { K.closeSheet(ph); K.after(ph.querySelector('.ck-ov') ? 380 : 0, () => K.toast(ph, `Напомнил ${dat(FRIEND[0])}`, 'notifications-outline')); return true; }
  if (name === 'claim') { K.once(node, 'pop'); node.innerHTML = `${io('checkmark')}Получено`; node.classList.remove('solid'); node.classList.add('tonal'); K.toast(ph, `100 монет — тебе и ${dat(FRIEND[0])}`, 'gift'); return true; }  if (name === 'call') { // как в приложении: «Позвать» → «Позвали» сразу, до ответа сервера (состояния кнопки, идея 1); лента и строка одного друга — одно состояние
    CALLED.add(arg); ph.querySelectorAll(`[data-act="call:${arg}"]`).forEach((n) => { n.classList.add('done'); n.classList.remove('t'); n.removeAttribute('data-act'); n.innerHTML = `${io('checkmark')}Позвали`; }); K.once(node, 'pop'); K.toast(ph, `Позвали ${acc(arg)}`, 'notifications-outline'); return true;
  }
  if (name === 'hf') { HF.add(arg); node.classList.add('done'); node.classList.remove('t'); node.removeAttribute('data-act'); node.innerHTML = `${io('checkmark')}Пять отправлено`; K.once(node, 'pop'); K.toast(ph, 'Пятюня отправлена', 'hand-right'); return true; }
  if (name === 'req') { // заявка: принято/отклонено — экран меняется сразу (карточка уходит, Ирина в списке), запись догоняет
    REQ = arg === 'accept' ? 'accepted' : 'declined'; const id = sectionOf(ph); const wasRight = ph === rightPhone(id); K.renderSection(id); const target = wasRight ? rightPhone(id) : document.querySelector(`#${id} .col:nth-child(1) .ph`); if (target) K.toast(target, arg === 'accept' ? `${REQUEST.n} теперь в друзьях` : 'Заявка отклонена', arg === 'accept' ? 'checkmark-circle' : 'close'); return true;
  }
  return false;
};
const SECTIONS = [
  { id: 'wg-friends', title: 'Вкладка «Друзья» с карточкой цели',
    lead: '', // зачем (координатор 29.10): пояснения и стоимость — служебный текст, владельцу не показываем
    states: [['none', 'Нет цели'], ['waiting', 'Ждём ответа'], ['invited', 'Приглашение от Ани'], ['active', 'Идёт · оба 4 из 7'], ['lag', 'Друг отстаёт · цель 5'], ['done', 'Выполнена'], ['expired', 'Погасло']],
    body: (st) => [col('Сейчас', frNow()), col('Как будет', frWill(st))] }, // координатор 29.10: подписи колонок — только «Сейчас» и «Как будет»
];
K.mount({ sections: SECTIONS, sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ friends: K.have(FR), rows: FRIENDS.length, week: WEEK.length })); // guard-ok: одна строка на страницу
window.__wg = { SECTIONS, DATA, pick: () => [PICK, PICK_DAYS], req: () => REQ };
})();
