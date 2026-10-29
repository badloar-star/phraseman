/* week-goal-together.app.js — «Цель недели вдвоём» на РЕАЛЬНЫХ кадрах (Главная scene_home_graphite_dark.png и вкладка «Друзья»
   now_friends_top_graphite_dark.png; каркас comp-kit.js).
   зачем (владелец 29.10 через координатора: пересматривает своё «нет» от 21.10 — показать макет; исследование, идея 7): общая цель
   недели с другом — дни занятий обоих, награда обоим, напоминание другу. На Главной — карточка под панелью «Сегодня» (вставлена ломтём:
   всё ниже сдвинулось, как при настоящей вставке); в «Друзьях» — та же карточка над списком и блок цели в карточке друга.
   Дни считаются из дней активности обоих (как серия вдвоём) — новых чтений нет. Журнал — [WG]. */
(() => {
const LOG = '[WG]'; const K = window.CK; const { io, ci, phone, insOn, col, panel, row, btn, sheet, bar } = K;
const HOME = 'scene_home_graphite_dark.png'; const FR = 'now_friends_top_graphite_dark.png';
/* геометрия кадра Главной (px 1080 × 2400): панель «Сегодня» 1050…1700, плитки 1780…1990 — карточка цели вставляется в зазор y 1724;
   вкладка «Друзья»: вкладки 140…200, пустое состояние 930…1540 — карточка над списком вставляется на y 280 */
const Y_HOME = 1724; const Y_FR = 280;
const GOAL = 7; const FRIEND = ['Аня', 12];
const DATA = { none: null, active: { me: 4, fr: 3, left: 2 }, lag: { me: 5, fr: 1, left: 2 }, done: { me: 7, fr: 7, left: 0 } };
const pct = (n) => Math.round((n / GOAL) * 100);
const line = (name, rank, n, gold) => `<div class="wg-line">${ci(rank, 26)}<span class="nm">${name}</span><span class="bars">${bar(pct(n), gold ? 'gold' : '')}</span><span class="n">${n} из ${GOAL}</span></div>`;
const card = (st, where) => {
  const d = DATA[st];
  if (!d) return panel('Цель недели вдвоём', '', `<p class="wg-text">Выбери друга и цель — дни занятий на этой неделе. Дойдёте оба — награда обоим.</p>${btn('Выбрать друга', 'tonal sm', 'open:pick', 'people-outline')}`);
  if (st === 'done') return panel('Цель недели вдвоём', `${io('checkmark-circle')} выполнена`, `${line('Ты', 5, d.me, true)}${line(FRIEND[0], FRIEND[1], d.fr, true)}<div class="wg-foot"><span class="wg-reward">${io('gift')}+100 монет обоим</span>${btn('Забрать', 'solid sm', 'claim', 'sparkles')}</div>`);
  const right = `ещё ${d.left} ${d.left === 1 ? 'день' : 'дня'}`;
  const foot = st === 'lag'
    ? `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}+100 монет обоим</span>${btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline')}</div>`
    : `<div class="wg-foot"><span class="wg-reward soft">${io('gift')}+100 монет обоим</span><span class="wg-hint">${where === 'friends' ? 'тап — карточка друга' : 'дни считаются сами'}</span></div>`;
  return panel('Цель недели вдвоём', right, `${line('Ты', 5, d.me)}${line(FRIEND[0], FRIEND[1], d.fr)}${foot}`);
};
const H_CARD = { none: 360, active: 470, lag: 470, done: 470 }; // высота вставки в px КАДРА (insOn считает в кадре): ≈ 143 / 187 px телефона
const homeWill = (st) => phone(HOME, { inserts: [insOn(HOME, Y_HOME, H_CARD[st], card(st, 'home'), 1740)] });
const frWill = (st) => phone(FR, { inserts: [insOn(FR, Y_FR, H_CARD[st], card(st, 'friends'), 300)] }).replace('data-ph="ck-ph"', `data-ph="ck-ph"${st === 'active' ? ' data-open="friend"' : ''}`);
const FRIENDS_LIST = [['Аня', 12, 'серия 9 дней'], ['Марк', 9, 'серия 3 дня'], ['Лидия', 1, 'вчера']];
const SHEETS = {
  pick: () => sheet('Цель недели вдвоём', `<p class="ck-note" style="margin:0 0 8px">С кем и сколько дней на этой неделе. Друг получит приглашение и подтвердит.</p>${FRIENDS_LIST.map(([n, r, s]) => row(ci(r, 36), n, s, '', `choose:${n}`)).join('')}<div class="wg-days"><span class="t on" data-act="days:5">5 дней</span><span class="t" data-act="days:7">7 дней</span></div>${btn('Предложить Ане', 'solid', 'propose', 'paper-plane-outline')}<p class="ck-note">Награда +100 монет обоим — на решение владельца; без награды цель тоже работает (как серия вдвоём).</p>`),
  friend: () => sheet(FRIEND[0], `${row(ci(FRIEND[1], 44), 'Серия 9 дней · этаж 2', 'Цель недели: 3 из 7, ещё 2 дня', '')}<div class="wg-sheet-bars">${line('Ты', 5, 4)}${line(FRIEND[0], FRIEND[1], 3)}</div><div class="wg-acts">${btn('Напомнить', 'tonal sm', 'nudge', 'notifications-outline')}${btn('Дать пять', 'tonal sm', 'toast:Дал пять', 'hand-right')}</div><p class="ck-note">Напоминание — раз в день на друга, тихие часы 22–09 (как «Позвать» серии вдвоём).</p>`),
};
const onAct = (name, arg, node, ph) => {
  if (name === 'choose') { node.parentElement.querySelectorAll('.ck-row').forEach((r) => r.classList.toggle('wg-sel', r === node)); K.once(node, 'pop'); return true; }
  if (name === 'days') { node.parentElement.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s === node)); K.once(node, 'pop'); return true; }
  if (name === 'propose') { K.closeSheet(ph); K.after(380, () => K.toast(ph, 'Предложение отправлено Ане', 'paper-plane-outline')); return true; }
  if (name === 'nudge') { K.closeSheet(ph); K.after(ph.querySelector('.ck-ov') ? 380 : 0, () => K.toast(ph, 'Напоминание отправлено · раз в день', 'notifications-outline')); return true; }
  if (name === 'claim') { K.once(node, 'pop'); node.textContent = 'Получено'; node.classList.remove('solid'); node.classList.add('tonal'); K.toast(ph, '+100 монет — тебе и Ане', 'gift'); return true; }
  return false;
};
const SECTIONS = [
  { id: 'wg-home', title: 'На Главной — карточка под панелью «Сегодня»',
    lead: 'Слева — Главная как сейчас (кадр сборки, «Затмение»). Справа — тот же кадр со вставленной карточкой «Цель недели вдвоём»: дни занятий обоих, сколько осталось, награда. Состояния чипами: нет цели (предложить другу), идёт, друг отстаёт (напомнить), выполнена (забрать). Карточка стоит между «Сегодня» и плитками — ближе всего к «что делать на этой неделе».',
    costs: [['Чтения', '0 новых — дни занятий друга уже есть в снимке «Вместе» (как серия вдвоём, active_days); цель хранится в профиле пары'], ['Записи', '1 документ friend_goals/{пара}_{неделя} при создании (+1 при подтверждении другом); награда — серверная функция по дням обоих: 2 записи монет + 1 статус; напоминание — friendsNudge как у серии (1 запись)'], ['Итого', '≤ 4 записи на пару в неделю, чтений нет → на 1000 активных ≈ $0,001 в день'], ['Решение владельца', 'идея 4 отклонена 21.10 — макет для пересмотра; награда +100 монет обоим — цифра на утверждение (без награды цель работает как серия вдвоём)']],
    states: [['none', 'Нет цели'], ['active', 'Идёт · 4 и 3 из 7'], ['lag', 'Друг отстаёт'], ['done', 'Выполнена']],
    body: (st) => [col('Сейчас · Главная, кадр приложения', phone(HOME)), col({ none: 'Как будет · предложить цель другу', active: 'Как будет · цель идёт', lag: 'Как будет · друг отстаёт — напомнить', done: 'Как будет · выполнена, награда обоим' }[st], homeWill(st))] },
  { id: 'wg-friends', title: 'В «Друзьях» — та же карточка над списком и цель в карточке друга',
    lead: 'На вкладке «Друзья» карточка цели стоит над списком друзей (на кадре список пуст — кадр с друзьями Сверка снимет позже). Тап по карточке открывает друга: прогресс обоих, «Напомнить», «Дать пять».',
    costs: [['Чтения', '0 — то же состояние, что на Главной'], ['Записи', 'напоминание — 1 запись (friendsNudge), не чаще раза в день на друга']],
    states: [['active', 'Идёт · карточка друга'], ['none', 'Нет цели'], ['done', 'Выполнена']],
    body: (st) => [col('Сейчас · «Друзья», кадр приложения', phone(FR)), col({ none: 'Как будет · предложить цель', active: 'Как будет · цель над списком + карточка друга', done: 'Как будет · выполнена' }[st], frWill(st))] },
];
K.mount({ sections: SECTIONS, sheets: SHEETS, onAct });
console.log(LOG, 'готово', JSON.stringify({ home: K.have(HOME), friends: K.have(FR) })); // guard-ok: одна строка на страницу
window.__wg = { SECTIONS, DATA };
})();
