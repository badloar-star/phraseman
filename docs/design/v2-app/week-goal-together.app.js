/* week-goal-together.app.js — «Цель недели вдвоём» на РЕАЛЬНЫХ кадрах (Главная scene_home_graphite_dark.png и вкладка «Друзья»
   now_friends_top_graphite_dark.png; каркас comp-kit.js).
   зачем (владелец 29.10 через координатора: пересматривает своё «нет» от 21.10 — показать макет; исследование, идея 7): общая цель
   недели с другом — дни занятий обоих, награда обоим, напоминание другу. На Главной — карточка под панелью «Сегодня» (вставлена ломтём:
   всё ниже сдвинулось, как при настоящей вставке); в «Друзьях» — та же карточка над списком друзей (на кадре пустое состояние заменено
   списком, кадр со списком Сверка снимет позже). Дни считаются из дней активности обоих (как серия вдвоём) — новых чтений нет.
   Правки координатора 29.10: тап по другу открывает карточку друга; «5 дней / 7 дней» меняет цель; «Предложить <имя>»; цифры сходятся;
   в телефоне ни служебных пометок, ни подписей-расшифровок. Журнал — [WG]. */
(() => {
const LOG = '[WG]'; const K = window.CK; const { io, ci, phone, insOn, col, panel, row, btn, sheet, bar } = K;
const HOME = 'scene_home_graphite_dark.png'; const FR = 'now_friends_top_graphite_dark.png';
/* геометрия кадра Главной (px 1080 × 2400): панель «Сегодня» 1050…1700, плитки 1780…1990 — карточка цели вставляется в зазор y 1724;
   вкладка «Друзья»: вкладки 140…200, пустое состояние 930…1540 — вырезается, на его место встают карточка цели и список друзей */
const Y_HOME = 1724; const FR_CUT = [930, 1540];
const FRIENDS = [['Аня', 12, 'серия 9 дней', 'занималась сегодня'], ['Марк', 9, 'серия 3 дня', 'занимался вчера'], ['Лидия', 1, 'серия 21 день', 'занималась сегодня']];
const dat = (name) => ({ 'Аня': 'Ане', 'Марк': 'Марку', 'Лидия': 'Лидии' }[name] || name);
let PICK = 'Аня'; let PICK_DAYS = 7; // выбор в шторке «Цель недели вдвоём»: друг и дни — меняют цель после «Предложить»
/* данные состояний: цель (дней), сделано у меня и у друга, осталось дней — сходятся: сделано ≤ прошедших дней, друг успевает */
const DATA = { none: null, active: { goal: 7, me: 4, fr: 4, left: 3 }, lag: { goal: 5, me: 4, fr: 2, left: 3 }, done: { goal: 7, me: 7, fr: 7, left: 0 } };
let FRIEND = ['Аня', 12];
const days = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'дня' : 'дней'}`;
const line = (name, rank, n, goal, act = '') => `<div class="wg-line${act ? ' t' : ''}"${act ? ` data-act="${act}"` : ''}>${ci(rank, 26)}<span class="nm">${name}</span><span class="bars">${bar(Math.round((n / goal) * 100))}</span><span class="n">${n} из ${goal}</span></div>`;
const card = (st) => {
  const d = DATA[st];
  if (!d) return panel('Цель недели вдвоём', '', btn('Выбрать друга', 'tonal sm', 'open:pick', 'people-outline'));
  const lines = line('Ты', 5, d.me, d.goal) + line(FRIEND[0], FRIEND[1], d.fr, d.goal, `friend:${FRIEND[0]}`);
  if (st === 'done') return panel('Цель недели вдвоём', `${io('checkmark-circle')} выполнена`, `${lines}<div class="wg-foot"><span class="wg-reward">${io('gift')}100 монет тебе и ${FRIEND[0] === 'Аня' ? 'Ане' : dat(FRIEND[0])}</span>${btn('Забрать', 'solid sm', 'claim', 'sparkles')}</div>`);
  const foot = st === 'lag'
    ? `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}100 монет обоим</span>${btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline')}</div>`
    : `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}100 монет обоим</span></div>`;
  return panel('Цель недели вдвоём', `ещё ${days(d.left)}`, `${lines}${foot}`);
};
const H_CARD = { none: 300, active: 440, lag: 470, done: 470 }; // высота вставки в px КАДРА (insOn считает в кадре)
const homeWill = (st) => phone(HOME, { inserts: [insOn(HOME, Y_HOME, H_CARD[st], card(st), 1740)] });
/* «Друзья»: на месте пустого состояния — карточка цели и список друзей (строки как в приложении: монета, имя, что делал) */
const friendsList = () => `<div class="wg-list">${FRIENDS.map(([n, r, s, w]) => row(ci(r, 40), n, '', w, `friend:${n}`)).join('')}</div>`;
const frWill = (st) => phone(FR, { cut: FR_CUT, inserts: [{ y: FR_CUT[0], html: `<div class="wg-fr">${card(st)}${friendsList()}</div>` }] }).replace('data-ph="ck-ph"', `data-ph="ck-ph"${st === 'active' ? ' data-open="friend"' : ''}`);
const pickRows = () => FRIENDS.map(([n, r, s]) => row(ci(r, 36), n, '', s, `choose:${n}`, n === PICK ? 'wg-sel' : '')).join('');
const SHEETS = {
  pick: () => sheet('Цель недели вдвоём', `${pickRows()}<div class="wg-days"><span class="t${PICK_DAYS === 5 ? ' on' : ''}" data-act="days:5">5 дней</span><span class="t${PICK_DAYS === 7 ? ' on' : ''}" data-act="days:7">7 дней</span></div>${btn(`Предложить ${dat(PICK)}`, 'solid', 'propose', 'paper-plane-outline').replace('class="ck-btn', 'data-propose class="ck-btn')}`),
  friend: (ph) => { const name = ph.dataset.friend || FRIEND[0]; const f = FRIENDS.find((x) => x[0] === name) || FRIENDS[0]; const d = DATA[K.state['wg-home'] === 'none' ? 'active' : (K.state['wg-home'] || 'active')] || DATA.active; const mine = name === FRIEND[0]; return sheet(name, `${row(ci(f[1], 44), f[2][0].toUpperCase() + f[2].slice(1), '', '')}${mine ? row(`<span class="ic">${io('flag-outline')}</span>`, d.left ? `Цель недели: ${d.fr} из ${d.goal}, ещё ${days(d.left)}` : `Цель недели выполнена: ${d.fr} из ${d.goal}`, '', '') : row(`<span class="ic">${io('flag-outline')}</span>`, 'Цели недели вдвоём пока нет', '', '')}${mine ? `<div class="wg-sheet-bars">${line('Ты', 5, d.me, d.goal)}${line(name, f[1], d.fr, d.goal)}</div>` : ''}<div class="wg-acts">${mine ? btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline') : btn('Предложить цель', 'tonal sm', 'open:pick', 'flag-outline')}${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}</div>`); },
};
const sectionOf = (ph) => ph.closest('section.block').id;
const onAct = (name, arg, node, ph) => {
  if (name === 'choose') { PICK = arg; node.parentElement.querySelectorAll('.ck-row').forEach((r) => r.classList.toggle('wg-sel', r === node)); const b = ph.querySelector('[data-propose]'); if (b) b.lastChild.textContent = `Предложить ${dat(PICK)}`; K.once(node, 'pop'); return true; }
  if (name === 'days') { PICK_DAYS = Number(arg); node.parentElement.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s === node)); K.once(node, 'pop'); return true; }
  if (name === 'propose') { // мгновенно: цель появляется в карточке (друг и дни из шторки), сеть догоняет; друг подтвердит позже
    const f = FRIENDS.find((x) => x[0] === PICK) || FRIENDS[0]; FRIEND = [f[0], f[1]]; DATA.active = { goal: PICK_DAYS, me: Math.min(4, PICK_DAYS - 1), fr: Math.min(4, PICK_DAYS - 1), left: 3 }; DATA.done = { goal: PICK_DAYS, me: PICK_DAYS, fr: PICK_DAYS, left: 0 };
    K.closeSheet(ph); const id = sectionOf(ph); K.after(360, () => { K.setState(id, 'active'); const nph = document.querySelector(`#${id} .ph[data-ph="ck-ph"]:nth-of-type(2), #${id} .col:nth-child(2) .ph`); if (nph) K.toast(nph, `Предложение отправлено ${dat(FRIEND[0])}`, 'paper-plane-outline'); }); return true;
  }
  if (name === 'friend') { ph.dataset.friend = arg; K.openSheet(ph, 'friend'); return true; }
  if (name === 'nudge') { K.closeSheet(ph); K.after(ph.querySelector('.ck-ov') ? 380 : 0, () => K.toast(ph, `Напомнил ${dat(FRIEND[0])}`, 'notifications-outline')); return true; }
  if (name === 'claim') { K.once(node, 'pop'); node.innerHTML = `${io('checkmark')}Получено`; node.classList.remove('solid'); node.classList.add('tonal'); K.toast(ph, `100 монет — тебе и ${dat(FRIEND[0])}`, 'gift'); return true; }
  return false;
};
const SECTIONS = [
  { id: 'wg-home', title: 'На Главной — карточка под панелью «Сегодня»',
    lead: 'Слева — Главная как сейчас (кадр сборки, «Затмение»). Справа — тот же кадр со вставленной карточкой «Цель недели вдвоём»: дни занятий обоих и сколько дней осталось. Состояния чипами: нет цели (выбрать друга и 5 или 7 дней — после «Предложить» цель появляется сразу), идёт (оба 4 из 7, ещё 3 дня), друг отстаёт (цель 5 дней: ты 4, друг 2, ещё 3 дня — напомнить), выполнена (забрать 100 монет). Тап по строке друга открывает его карточку. Награда 100 монет обоим — цифра на утверждение владельца; без награды цель работает как серия вдвоём. Напоминание — раз в день на друга, тихие часы 22–09, как «Позвать» серии вдвоём.',
    costs: [['Чтения', '0 новых — дни занятий друга уже есть в снимке «Вместе» (как серия вдвоём, active_days); цель хранится в профиле пары'], ['Записи', '1 документ friend_goals/{пара}_{неделя} при создании (+1 при подтверждении другом); награда — серверная функция по дням обоих: 2 записи монет + 1 статус; напоминание — friendsNudge как у серии (1 запись)'], ['Итого', '≤ 4 записи на пару в неделю, чтений нет → на 1000 активных ≈ $0,001 в день'], ['Решение владельца', 'идея 4 отклонена 21.10 — макет для пересмотра']],
    states: [['none', 'Нет цели'], ['active', 'Идёт · оба 4 из 7'], ['lag', 'Друг отстаёт · цель 5'], ['done', 'Выполнена']],
    body: (st) => [col('Сейчас · Главная, кадр приложения', phone(HOME)), col({ none: 'Как будет · предложить цель другу', active: 'Как будет · цель идёт', lag: 'Как будет · друг отстаёт — напомнить', done: 'Как будет · выполнена, награда обоим' }[st], homeWill(st))] },
  { id: 'wg-friends', title: 'В «Друзьях» — та же карточка над списком и цель в карточке друга',
    lead: 'На вкладке «Друзья» карточка цели стоит над списком друзей (на кадре пустое состояние заменено списком из трёх друзей — кадр со списком Сверка снимет позже). Тап по другу открывает его карточку: прогресс обоих, «Напомнить», «Дать пять»; у друга без цели — «Предложить цель».',
    costs: [['Чтения', '0 — то же состояние, что на Главной'], ['Записи', 'напоминание — 1 запись (friendsNudge), не чаще раза в день на друга']],
    states: [['active', 'Идёт · карточка друга'], ['none', 'Нет цели'], ['done', 'Выполнена']],
    body: (st) => [col('Сейчас · «Друзья», кадр приложения', phone(FR)), col({ none: 'Как будет · предложить цель', active: 'Как будет · цель над списком + карточка друга', done: 'Как будет · выполнена' }[st], frWill(st))] },
];
K.mount({ sections: SECTIONS, sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ home: K.have(HOME), friends: K.have(FR) })); // guard-ok: одна строка на страницу
window.__wg = { SECTIONS, DATA, pick: () => [PICK, PICK_DAYS] };
})();
