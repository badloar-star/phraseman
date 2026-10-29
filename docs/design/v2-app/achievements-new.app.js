/* achievements-new.app.js — 90 новых достижений (кластер Codex: 78 «серия за активность» + 12 «Вершина: <камень>» Пика) на РЕАЛЬНОМ
   кадре экрана достижений нынешней сборки (каркас comp-kit.js; данные — achievements-new.data.js, собранный из каталогов кластера).
   зачем (координатор 29.10, владелец: «Сначала показать мне»): увидеть до релиза, как новые награды лягут на настоящий экран —
   витрина (AchievementShelfCarousel: карточка 306 dp, награда 44 % ширины, плашка с условием и датой), док категорий («Особые»
   41 → 131), досье награды (AchievementModal: герой 178, чип «Получено · дата», условие, прогресс 8, «Поделиться»), состояния
   «закрыта / в процессе / получена» и метка улучшения статуэтки (SpireAchievementUpgrade — sparkles в углу арта).
   ЧЕСТНОСТЬ: у 78 ачивок активности в коде нет ни арта, ни записи в ACHIEVEMENT_ICON — приложение нарисует щит категории «Особые»
   (#10B981) со значком rocket; чип «Значок» показывает вариант со значком по группе — на решение владельца.
   Геометрия вставок GEO — по замеру кадров Сверки (now_achievements_*), до кадра — раскладка приложения. Журнал — [ACH]. */
(() => {
const LOG = '[ACH]'; const K = window.CK; const { io, phone, col, btn, bar, chips, overOn } = K; const RF = K.RF; const D = window.__ACH_NEW;
if (!D) { console.log(LOG, 'нет данных achievements-new.data.js'); return; }
const F = { top: 'now_achievements_top_graphite_dark.png', scroll: 'now_achievements_scroll_graphite_dark.png', card: 'now_achievements_card_graphite_dark.png' };
/* сухой прогон вёрстки до кадров: ?standin=1 — кадр вкладки «Друзья» вместо экрана достижений (в публикации не используется) */
if (new URLSearchParams(location.search).get('standin') === '1') { F.top = 'now_friends_top_graphite_dark.png'; F.scroll = 'now_friends_scroll_graphite_dark.png'; F.card = 'now_friends_top_graphite_dark.png'; console.log(LOG, 'standin: кадры-заменители, только проверка вёрстки'); }
/* геометрия кадра (px 1080 × 2400) — ЗАПОЛНИТЬ ПО ЗАМЕРУ кадров Сверки: витрина — карточка 306 dp r24 под шапкой; плашка под ней;
   капсула дока снизу; досье — окно r26 по центру. Пока — раскладка приложения: шапка 100…300, витрина с 330 */
const GEO = { shelf: { x: 42, y: 330, w: 996, h: 804 }, plaque: { x: 42, y: 1176, w: 996, h: 400 }, modal: { x: 42, y: 300, w: 996, h: 1700 } };
const SPECIAL = '#10B981'; // CAT_COLOR.special (achievements_screen.tsx) — цвет щита и значка категории «Особые»
const CAT_ICON = 'rocket'; // CAT_ICON.special — значок на щите, когда у награды нет своего
const byId = Object.fromEntries(D.items.map((i) => [i.id, i])); const GROUPS = D.groups.map(([id, name]) => ({ id, name, items: D.items.filter((i) => i.group === id) }));
let SEL = { 'an-spire': 'spire_summit_granite', 'an-act': 'video_hours_10' }; let VARIANT = 'code'; // code — щит как в коде; icons — значок по группе
const DATE = '29 октября 2026'; const DATE_NUM = '29.10.2026';
const groupOf = (a) => GROUPS.find((g) => g.id === a.group);
/* прогресс «в процессе» — показательный: видео 10 ч → 6 ч, задания 7 дней → 4, репорты 10 → 7, курс 32 → 21, урок V2 56 → 40, вершина — этаж 11 из 15 */
const progOf = (a) => a.group === 'spire' ? [11, 15] : [Math.max(1, Math.round(a.n * 0.65)), a.n];
const unitOf = (a) => a.group === 'spire' ? 'этажей' : { 'ч': 'часов', 'дн': 'дней', 'шт': 'репортов', 'ур': 'уроков', 'зан': 'занятий' }[a.unit] || '';
/* арт награды: статуэтка (Пик) или щит категории с значком (как BadgeShield): закрыта — щит #383838 и значок в цвет щита, в процессе —
   цвет + 55 альфы, получена — полный цвет и белый значок; статуэтка: закрыта .20, в процессе .50, получена 1; улучшена — sparkles в углу */
const art = (a, st, size) => {
  const locked = st === 'locked'; const prog = st === 'progress'; const up = st === 'upgraded';
  if (a.art) return `<span class="an-art" style="width:${size}px;height:${size}px"><img src="${a.art}" alt="" style="opacity:${locked ? 0.2 : prog ? 0.5 : 1}">${up ? `<i class="an-up" style="font-size:${Math.max(16, Math.round(size * 0.22))}px">${io('sparkles')}</i>` : ''}</span>`;
  const tint = locked ? '#383838' : prog ? SPECIAL + '55' : SPECIAL; const ink = locked ? '#383838' : prog ? SPECIAL + 'BB' : '#fff';
  const icon = VARIANT === 'icons' ? a.ion : CAT_ICON;
  const h = Math.round(size * 0.88); // щит BadgeShield: тело 88 % высоты, значок 42 % — контур встроенным SVG (без внешнего файла)
  return `<span class="an-art an-shield" style="width:${size}px;height:${size}px"><svg class="an-mask" viewBox="0 0 100 100" width="${size}" height="${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M50 3 L90 17 V50 C90 72 73 90 50 97 C27 90 10 72 10 50 V17 Z" fill="${tint}"/></svg><span class="an-ic" style="color:${ink};font-size:${Math.round(size * 0.42)}px">${io(icon)}</span></span>`;
};
const dots = (n, i) => `<div class="an-dots">${Array.from({ length: Math.min(n, 9) }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>`;
/* витрина: карточка 306 dp r24 — награда по центру (ширина элемента 44 % окна ≈ 171 dp, сосед приглушён), отражение, точки */
const shelf = (a, st, list) => { const i = Math.max(0, list.indexOf(a)); const prev = list[i - 1]; const next = list[i + 1];
  return `<div class="an-shelf"><div class="an-row">${prev ? `<div class="an-item nb">${art(prev, 'unlocked', 96)}</div>` : '<div class="an-item nb"></div>'}<div class="an-item on">${art(a, st, 150)}<i class="an-stage"></i></div>${next ? `<div class="an-item nb">${art(next, 'unlocked', 96)}</div>` : '<div class="an-item nb"></div>'}</div>${dots(list.length, i)}</div>`; };
/* плашка под витриной (renderShelfDetail): маркер 42 r14 со значком, имя h3 900, кнопка «открыть» 44 r14, условие, дата */
const plaque = (a, st) => `<div class="an-plaque t" data-act="open:dossier"><div class="hd"><span class="mk">${io(a.art ? 'diamond' : VARIANT === 'icons' ? a.ion : CAT_ICON)}</span><b>${a.name}</b><span class="op">${io('open-outline')}</span></div><div class="cond">${a.cond}</div>${st === 'unlocked' || st === 'upgraded' ? `<div class="date">${st === 'upgraded' ? `Статуэтка улучшена · ${DATE}` : `Получено · ${DATE}`}</div>` : ''}</div>`;
/* капсула дока категорий внизу: выбранная категория «Особые» + число наград в ней */
const dockCapsule = (count) => `<div class="an-dock"><span class="ic">${io('rocket')}</span><b>Особые</b><span class="cnt">${count}</span>${io('chevron-up')}</div>`;
/* досье (AchievementModal): окно r26 p21, герой 178 r20 тоном контрола, крестик 44, чип «Получено · дата», заголовок 25/31, текст 16/22,
   плашка «Как получить» 13/19, полоса прогресса 8 и «n из m», «Поделиться» — тёмная капсула 48/r24 */
const dossier = (a, st) => { const got = st === 'unlocked' || st === 'upgraded'; const [p, m] = progOf(a);
  return `<div class="an-scrim" data-act="close"></div><div class="an-modal"><span class="an-x t" data-act="close">${io('close')}</span><div class="hero">${art(a, st, 140)}</div>${got ? `<div class="chip">${st === 'upgraded' ? 'Статуэтка улучшена' : 'Получено'} · ${DATE_NUM}</div>` : ''}<div class="ttl">${a.name}</div><div class="txt">${a.desc || a.cond}</div><div class="how"><b>Как получить</b>${a.cond}</div>${got ? '' : `<div class="prog">${bar(st === 'progress' ? Math.round((p / m) * 100) : 0)}<span>${st === 'progress' ? `${p} из ${m} ${unitOf(a)}` : `0 из ${m} ${unitOf(a)}`}</span></div>`}${got ? `<div class="share t" data-act="toast:Карточка награды отправлена">Поделиться</div>` : ''}</div>`; };
const STATES = [['locked', 'Закрыта'], ['progress', 'В процессе'], ['unlocked', 'Получена']];
const SPIRE_STATES = [...STATES, ['upgraded', 'Статуэтка улучшена']];
const stateOf = (id) => K.state[id] || 'unlocked';
/* выбор награды — чипы страницы (вне телефона): для Пика 12 камней, для активности — по одной на группу + все уроки V2 списком в шторке */
const pickRow = (id, list) => `<div class="an-pick">${chips(`pick:${id}`, list.map((a) => [a.id, a.group === 'spire' ? a.stone : a.name]), SEL[id])}</div>`;
const actPickList = () => [byId.video_hours_10, byId.video_hours_200, byId.today_complete_streak_7, byId.today_complete_streak_200, byId.reports_sent_10, byId.legacy_course_complete, byId.course_v2_en_lesson_1, byId.course_v2_es_lesson_32];
const spireList = () => GROUPS.find((g) => g.id === 'spire').items;
/* телефон «как будет»: кадр + витрина с выбранной наградой + плашка + капсула дока */
const will = (id, a, st, list) => phone(F.top, { overlays: overOn(F.top, RF.px(GEO.shelf.x), GEO.shelf.y, RF.px(GEO.shelf.w), GEO.shelf.h + GEO.plaque.h + 60, `${shelf(a, st, list)}${plaque(a, st)}`) + `<div class="an-dockwrap">${dockCapsule(131)}</div>` });
const willCard = (a, st) => phone(F.card, { overlays: `<div class="an-ov">${dossier(a, st)}</div>` });
/* галерея на странице (вне телефона): все 90 по группам — имя, значок/статуэтка, условие по наведению */
const gallery = () => `<div class="an-gal">${GROUPS.map((g) => `<div class="an-gal-g"><h4>${g.name} <span>${g.items.length}</span></h4><div class="an-tiles">${g.items.map((a) => `<div class="an-tile" title="${a.cond.replace(/"/g, '&quot;')}">${art(a, 'unlocked', 56)}<span>${a.group.startsWith('v2') ? `Урок ${a.lesson}` : a.name}</span></div>`).join('')}</div></div>`).join('')}</div>`;
const SECTIONS = [
  { id: 'an-spire', title: 'Вершины Пика — статуэтки на витрине',
    lead: '', states: SPIRE_STATES,
    extra: () => pickRow('an-spire', spireList()),
    body: (st) => { const a = byId[SEL['an-spire']]; return [col('Сейчас · экран достижений, кадр приложения', phone(F.top)), col({ locked: 'Как будет · вершина не взята', progress: 'Как будет · башня идёт, этаж 11 из 15', unlocked: 'Как будет · вершина взята, статуэтка на витрине', upgraded: 'Как будет · подтверждённое повышение — статуэтка улучшена' }[st], will('an-spire', a, st, spireList()))]; } },
  { id: 'an-act', title: 'Серия за активность — видео, задания, репорты, курсы',
    lead: '', states: STATES,
    extra: () => `${pickRow('an-act', actPickList())}<div class="an-pick">${chips('variant', [['code', 'Как в коде: щит категории'], ['icons', 'Значок по группе']], VARIANT)}</div>`,
    body: (st) => { const a = byId[SEL['an-act']]; const list = groupOf(a).items; return [col('Сейчас · экран достижений, кадр приложения', phone(F.top)), col({ locked: 'Как будет · награда закрыта', progress: 'Как будет · в процессе', unlocked: 'Как будет · получена, на витрине' }[st], will('an-act', a, st, list))]; } },
  { id: 'an-card', title: 'Досье награды',
    lead: '', states: SPIRE_STATES,
    extra: () => pickRow('an-card', [byId.spire_summit_granite, byId.spire_summit_diamond, byId.video_hours_50, byId.today_complete_streak_30, byId.reports_sent_100, byId.legacy_course_complete, byId.course_v2_en_lesson_12]),
    body: (st) => { const a = byId[SEL['an-card'] || 'spire_summit_granite']; const s = st === 'upgraded' && !a.upgradable ? 'unlocked' : st; return [col('Сейчас · открытая карточка, кадр приложения', phone(F.card)), col({ locked: 'Как будет · закрыта: условие и пустой прогресс', progress: 'Как будет · в процессе: прогресс', unlocked: 'Как будет · получена', upgraded: 'Как будет · статуэтка улучшена' }[st], willCard(a, s))]; } },
  { id: 'an-all', title: 'Все 90 новых наград', lead: '', extra: gallery, body: () => [] },
];
const SHEETS = { dossier: (ph) => { const sec = ph.closest('section.block').id; const a = byId[SEL[sec]] || byId.spire_summit_granite; return `<div class="an-ov">${dossier(a, stateOf(sec))}</div>`; } };
const onChip = (id, value) => { // чипы страницы вне разделов: выбор награды и вариант значка
  if (id.startsWith('pick:')) { const sec = id.slice(5); SEL[sec] = value; K.renderSection(sec); return true; }
  if (id === 'variant') { VARIANT = value; ['an-act', 'an-all', 'an-card'].forEach((s) => K.renderSection(s)); return true; }
  return false;
};
K.mount({ sections: SECTIONS, sheets: SHEETS, onChip });
console.log(LOG, 'готово', JSON.stringify({ items: D.total, frames: Object.values(F).map((f) => [f, K.have(f)]) })); // guard-ok: одна строка на страницу
window.__an = { SEL, GEO, variant: () => VARIANT };
})();
