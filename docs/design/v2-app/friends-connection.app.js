/* friends-connection.app.js — «Друзья: связь по всем разделам»: пять блоков поверх существующих экранов, в стиле «Сцены», все темы.
   зачем (координатор 28.10, задача 3, слово владельца): «укреплять связь друзей по всем разделам… приглашать друзей, создавать команды,
   больше связи, больше понятности, всё очевидно»; идеи владельца: что смотрит каждый друг и сколько, отдельное «Избранное» для видео,
   «друг что-то сделал» на сценах работает отлично — таких мест нужно больше. Построено на том, что уже есть в коде: друзья
   (users/{uid}/friends), события друзей (friend_social_events: дать пять, зов, дуэль, занятие вдвоём), «Итоги недели» и «Позвать»
   (FriendWeekRail, FriendCallPill, nudge_client), «Серия вдвоём» на Главной, реферальный код и награда Plus (referral_*), избранное
   видео (use_video_favorites + video_save_counts), часы видео (premium_theme_video_watch). Цвета сцен — формула приложения
   (homeSceneThemeTokens). Под каждым блоком — стоимость Firebase для координатора. prefers-reduced-motion — CSS гасит движение. */
(() => {
const { phone, block, col } = K;
const THEMES = window.__THEMES || {};
const THEME_IDS = Object.keys(THEMES);
let THEME_ID = 'marine';
let AP = 'dark';
let TH = 'marine';
const LOG = '[FR]';
const R = window.SpireTowerRender;
const CODE = Object.assign({ heart: 'f36a', 'heart-outline': 'f377', 'arrow-up': 'f145', 'arrow-forward': 'f133', people: 'f49f', 'people-outline': 'f4a3', 'trending-up': 'f5fb', 'lock-closed': 'f3c7', 'cafe-outline': 'f1ca',
  'school-outline': 'f55d', flame: 'f313', 'flame-outline': 'f314', flash: 'f316', 'notifications-outline': 'f47f', diamond: 'f2a1', 'chatbubbles-outline': 'f218', 'chatbubble-ellipses-outline': 'f213',
  home: 'f382', 'home-outline': 'f383', book: 'f1a5', 'book-outline': 'f1a6', star: 'f595', sparkles: 'f58c', 'checkmark-circle': 'f21e', add: 'f103', 'albums-outline': 'f110', 'copy-outline': 'f290',
  'chevron-forward': 'f23b', 'chevron-down': 'f232', 'chevron-back': 'f229', checkmark: 'f21d', play: 'f4c6', 'play-circle-outline': 'f4ce', 'settings-outline': 'f56c', trophy: 'f601', 'volume-high': 'f613',
  bookmark: 'f1a8', 'bookmark-outline': 'f1a9', 'hand-left': 'f35b', 'share-outline': 'f572', 'person-add': 'f4a6', 'person-add-outline': 'f4a7', gift: 'f337', 'gift-outline': 'f338', 'eye-outline': 'f2ea',
  'shield-checkmark': 'f578', flag: 'f310', 'link-outline': 'f3b9', 'timer-outline': 'f5e1', 'rocket-outline': 'f548', medal: 'f445', 'key-outline': 'f3a4', 'film-outline': 'f2ff', 'trophy-outline': 'f602',
  'pulse-outline': 'f4f7', 'add-circle-outline': 'f105', 'enter-outline': 'f2db', 'qr-code-outline': 'f4fd', 'paper-plane-outline': 'f48e', 'time-outline': 'f5de', close: 'f24a', 'ellipsis-horizontal': 'f2ce' }, window.__ICODE || {});
const io = (n, st = '') => { const c = CODE[n]; if (!c) throw new Error(`${LOG} нет значка ${n}`); return `<i class="io" aria-hidden="true"${st ? ` style="${st}"` : ''}>&#x${c};</i>`; };
const ci = (r, s, cls = '') => `<img${cls ? ` class="${cls}"` : ''} src="${K.coin(r)}" alt="" style="width:${s}px;height:${s}px;border-radius:50%;display:block;flex:none">`;
const ART = (name) => `assets/v2art/${AP === 'light' ? 'light' : 'dark'}/${name}.webp`;
const RM = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const after = (ms, f) => setTimeout(f, RM() ? 0 : ms);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const once = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); node.addEventListener('animationend', () => node.classList.remove(cls), { once: true }); };
const swap = (node, html) => { node.classList.add('fr-blur'); after(160, () => { node.innerHTML = html; node.classList.remove('fr-blur'); }); };

/* ═════ цвета темы и сцены — дословно формула приложения (homeSceneThemeTokens = sceneTok эталона) ═════ */
const hx = (h) => { const s = String(h).replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const ha = (h) => { const s = String(h).replace('#', ''); return s.length === 8 ? parseInt(s.slice(6), 16) / 255 : 1; };
const mixc = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const rgba = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
const lumc = (c) => { const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratioc = (a, b) => { const x = lumc(a); const y = lumc(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toLin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const oklchOf = (c) => {
  const [r, g, b] = c.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
};
const fromOklch = (L, C, H) => {
  const a = C * Math.cos(H * Math.PI / 180); const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    .map((v) => Math.max(0, Math.min(255, toSrgb(Math.max(0, Math.min(1, v))))));
};
const sceneTok = (id, ap) => {
  const t = THEMES[id][ap]; const g = t.accentGradient || [t.accent, t.accent];
  if (ap === 'dark') { const top = mixc(hx(g[0]), hx(t.bgTop), 0.3); const bot = mixc(hx(g[g.length - 1]), hx(t.bg), 0.3); const gl = (t.bgGlow && t.bgGlow[0]) || t.accentGlow; return { t, top, bot, glow: rgba(hx(gl), ha(gl)) }; }
  if (id === 'ink') return { t, top: fromOklch(0.47, 0.14, 282), bot: fromOklch(0.28, 0.10, 276), glow: 'oklch(.66 .13 300 / .9)' };
  const [, C, H] = oklchOf(hx(t.accent));
  return { t, top: fromOklch(0.47, Math.min(C, 0.16), H), bot: fromOklch(0.28, Math.min(C, 0.11), (H + 354) % 360), glow: rgba(fromOklch(0.66, Math.min(C, 0.14), (H + 18) % 360), 0.9) };
};
const uiCss = (id, ap) => {
  const k = sceneTok(id, ap); const t = k.t;
  return [`--bg:linear-gradient(180deg,${t.bgTop} 0%,${t.bg} 55%,${t.bgBottom} 100%)`, `--top:${t.bgTop}`, `--bot:${t.bgBottom}`, `--tx:${t.text}`, `--sec:${t.secondary}`,
    `--card:${t.opaqueCard}`, `--ctl:${t.opaqueControl}`, `--acc:${t.accentText}`, `--solid:${t.cta}`, `--on-solid:${t.ctaInk}`, `--sb:${t.text}`,
    `--st-top:${rgba(k.top)}`, `--st-bot:${rgba(k.bot)}`, `--st-glow:${k.glow}`, `--st-eve-top:${rgba(k.top)}`, `--st-eve-bot:${rgba(k.bot)}`].join(';');
};
const T = (h, extra = '') => h.replace('class="ph"', `class="ph th-${TH}${extra ? ' ' + extra : ''}"`);
/* телефон собираем сами (как в community-scene-v3): стопка экранов лежит прямо в .ph — внутри .in kit'а (will-change: transform)
   абсолютная стопка получала нулевую высоту и экран не рисовался */
const sb = (time = '18:10') => `<div class="sb"><span>${time}</span><span class="sys">
    <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><path d="M8.5 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 008.5.5 10.8 10.8 0 001 3.4l1.2 1.3a9 9 0 016.3-2.5zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3a7.2 7.2 0 00-9.8 0l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.5c.5 0 1 .2 1.3.5L8.5 11.3 7.2 9.8c.3-.3.8-.5 1.3-.5z"/></svg>
    <span class="bat"></span></span></div>`;
const screenHtml = (body, fixed) => `<div class="fr-screen"><div class="scr"><div class="in">${body}</div></div>${fixed}</div>`;
const shell = (id, body, fixed, cls, time = '18:10') => T(`<div class="ph">${sb(time)}<div class="fr-stack">${screenHtml(body, fixed)}</div><div class="hi"></div></div>`, 'onart')
  .replace(/class="ph th-(ink|marine)([^"]*)"/, (m, th, rest) => `class="ph th-${th}${rest} hs-tok${AP === 'dark' ? ' dk' : ' lt'} ${cls}" data-ph="${cls}" style="${uiCss(id, AP)}"`);

/* ═════ общие детали экранов (разметка эталонов home-scene-states / peak-scene-v2; таббар — значками) ═════ */
const TABS = ['home-outline', 'book-outline', 'play-circle-outline', 'people-outline', 'settings-outline'];
const TAB_ON = ['home', 'book', 'play-circle-outline', 'people', 'settings-outline'];
const tabbar = (k) => `<div class="qfade"></div><div class="tbar"><div class="cap" style="left:calc(9px + ${k} * (100% - 18px) / 5)"></div>${TABS.map((i, j) => `<div class="ti${j === k ? ' on' : ''}">${io(j === k ? TAB_ON[j] : i)}<span></span></div>`).join('')}</div>`;
const avatar = (s = 34) => `<span class="pav" style="background:none;padding:0"><span class="gap" style="padding:0;background:none">${K.coinImg(5, s + 9)}</span></span>`;
const stats = () => `<span class="hm-pill two glass t">${io('flame')}<span class="vv"><b>5 дней</b><small>Серия</small></span></span><span class="hm-pill glass t"><img src="${K.coin(5)}" alt="">2 340<i class="dv"></i><span style="display:inline-flex;align-items:center;gap:3px">${io('flash')}4</span></span>`;
const head = () => `<div class="hm-top">${stats()}<span class="hm-sp"></span><span class="qround hm-bell glass t">${io('notifications-outline')}<i class="dot"></i></span>${avatar()}</div>`;
const backTop = (right = '') => `<div class="pk-top"><span class="qround glass t" data-act="back">${io('chevron-back')}</span><span style="flex:1"></span>${right}</div>`;
const glow = (right, top, size) => `<div class="a-glow" style="right:${right}px;top:${top}px;width:${size}px;height:${size}px"></div>`;
const art = (name) => `<img class="fr-art" src="${ART(name)}" alt="">`;
const body = (kick, title, prog, cta, extra = '') => `<div class="a-kick">${kick}</div><div class="a-title${title.length > 18 ? ' long' : ''}">${title}</div>${prog}${cta ? `<div class="a-cta"><div class="qbtn white t" data-act="${cta[1] || 'none'}"><span class="fr-sw">${io(cta[2] || 'play')}${cta[0]}</span></div></div>` : ''}${extra}`;
const bar = (pct, text) => `<div class="a-prog"><span class="bar"><i style="width:${pct}%"></i></span>${text}</div>`;
const row = ([ic, t, sub, n, done]) => `<div class="hm-row${done ? ' done' : ''} t"><span class="ck${done ? ' on' : ''}">${io('checkmark')}</span><span class="ic">${io(ic)}</span><div class="tx"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div><span class="n">${n}</span></div>`;
const F = [{ n: 'Лидия', r: 8 }, { n: 'Марк', r: 9 }, { n: 'Аня', r: 12 }, { n: 'Kirill', r: 10 }, { n: 'Тимур', r: 11 }];
/* «друг сделал» — строка на сцене: монета друга, что сделал, что делать мне; тап — шторка друга (FriendTogetherSheet) */
const ev = (f, what, me, cls = '') => `<div class="fr-ev t${cls ? ' ' + cls : ''}" data-act="ev" style="--d:0ms">${ci(f.r, 30)}<div class="tx">${f.n} ${what}<small>${me}</small></div>${io('chevron-forward')}</div>`;
const cost = (items) => `<div class="fr-cost">${io('shield-checkmark')}<div>${items.map(([k, v]) => `<b>${k}</b> — ${v}`).join('<br>')}</div></div>`;

/* ═════ 1 · «друг сделал» на сценах разделов: Уроки, Пик, Видео, Карточки ═════ */
const seasonPhone = (id) => shell(id, `<div class="fr-sc"><div class="a-stage">${glow(4, 86, 180)}${art('lessons')}<div class="a-scrim"></div><div class="a-top">${head()}</div>${ev(F[0], 'прошла эпизод 4', 'Догони — ты на эпизоде 3')}<div class="a-body">${body('Сезон 1 · Глава 2 из 7', 'Кофе с коллегой', bar(38, '3 из 8 эпизодов'), ['Продолжить'], `<div style="margin-top:12px"><div class="hm-chips"><span class="qchip glass t">${io('albums-outline')}Слова</span><span class="qchip glass t">${io('book-outline')}Теория</span></div></div>`)}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Эпизоды главы 2<span>3 из 8</span></div>${[['cafe-outline', 'Эпизод 4 · Заказ на двоих', `${ci(8, 16)} Лидия прошла`, '0/21'], ['cafe-outline', 'Эпизод 5 · Ты сегодня рано', '', '0/20']].map(row).join('')}</div><div style="height:140px"></div></div>`, tabbar(1), 'fr-season', '9:41');
const LEAD = [{ name: 'Аня', coins: 612, rank: 12 }, { name: 'Марк', coins: 538, rank: 9 }, { name: 'Тимур', coins: 470, rank: 11 }];
const RIVALS = { 1: [9, 11, 4, 5], 2: [7, 9, 3, 6], 3: [9, 6, 4, 2], 4: [8, 11, 5], 5: [6, 9, 4], 6: [6], 7: [11] };
const fmt = (n) => n.toLocaleString('ru-RU');
const tower = (top, height) => `<div class="pk2-tw" style="top:${top}px;height:${height}px">${R ? R.windowHtml({ coin: K.coin, tier: 0, myFloor: 4, selected: 4, theme: 'dark', width: 240, height, myRank: 5, rivals: RIVALS, scene: { plate: 'transparent', plateShadow: 'none' }, scrollTop: 99999 }) : ''}</div>`;
const blk = (x, y, w, h, inner, cls = '', b = 0) => `<div class="pk2-blk${cls}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;--b:${b}ms">${inner}</div>`;
const coinAt = (r, x, y, s, b) => `<div class="pk2-coin" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;--b:${b}ms">${ci(r, s)}</div>`;
const face = (place, m) => `<span class="pl">${place}</span><span class="nm">${m.name}</span><span class="cn">${fmt(m.coins)}${ci(0, 12)}</span>`;
const pedestal = () => blk(22, 580, 124, 100, `<span style="height:12px"></span>${face(2, LEAD[1])}`, '', 240) + blk(153, 556, 124, 124, `<span style="height:22px"></span>${face(1, LEAD[0])}`, ' first', 320)
  + blk(284, 600, 124, 80, `<span style="height:12px"></span>${face(3, LEAD[2])}`, '', 400) + coinAt(LEAD[1].rank, 65, 560, 38, 240) + coinAt(LEAD[0].rank, 191, 530, 48, 320) + coinAt(LEAD[2].rank, 327, 580, 38, 400);
const peakPhone = (id) => shell(id, `<div class="pk2 fr-pk"><div class="a-stage">${glow(12, 150, 260)}${tower(150, 450)}${ev(F[1], 'обогнал тебя', '2 места до него', 'pk')}<div class="pk2-copy" style="top:168px"><div class="a-kick">Гранит<br>до конца недели 2 д 14 ч</div><div class="a-title">Этаж 4</div>${bar(88, 'ступень 7 из 8')}<div class="pk-rew"><span>${ci(0, 20)}+10 за ступень</span><span>${ci(0, 20)}+40 за этаж</span></div></div>${pedestal()}`
  + `<div class="pk2-me" style="left:20px;top:448px"><div class="k">Комната недели · Гранит</div><div class="v">${ci(5, 30)}7 место</div><div class="s">${io('arrow-up')}2 места до повышения</div></div><div class="pk2-link t" style="top:700px">Все участники <small>30</small>${io('chevron-forward')}</div><div class="a-scrim"></div>`
  + `<div class="a-top"><div class="pk-top"><div class="pk-seg"><span class="on t">Пик</span><span class="t">Друзья</span><span class="t">Наборы</span></div><span class="pk-en">${io('flash')}3</span></div></div></div></div><div class="pk-h2">Друзья на этой неделе</div><div class="pk-fr">${[['Аня', 12, 'Агат · 612'], ['Марк', 9, 'Гранит · 538'], ['Лидия', 8, 'Базальт · 310']].map(([n, r, st]) => `<span class="c t">${ci(r, 32)}${n}<small>${st}</small></span>`).join('')}</div><div class="pk2-after"></div>`,
  `<div class="pk2-dock"><div class="qbtn solid t">${io('play')}Играть</div></div>${tabbar(3)}`, 'fr-pk');
const VIDS = [['Small talk в офисе', 'Lingman', 12, '8:40'], ['Как спросить дорогу', 'Lingman', 9, '6:15'], ['В кафе: заказ и счёт', 'Lingman', 14, '7:02'], ['Созвон с командой', 'Lingman', 11, '9:30']];
const vid = (v, saved = false, extra = '') => `<div class="fr-vid t"><div class="th">${io('play')}<b>${v[3]}</b></div><div class="tx"><div class="t">${v[0]}</div><div class="s">${io('chatbubble-ellipses-outline')}${v[2]} фраз${extra}</div></div><span class="fr-save${saved ? ' on' : ''} t" data-act="save">${io(saved ? 'bookmark' : 'bookmark-outline')}</span></div>`;
const videoStage = (evHtml) => `<div class="a-stage">${glow(4, 86, 180)}${art('cards_from_video')}<div class="a-scrim"></div><div class="a-top">${head()}</div>${evHtml}<div class="a-body">${body('Премьера недели', 'Small talk в офисе', `<div class="a-prog">${io('chatbubble-ellipses-outline')}12 фраз · 8:40</div>`, ['Смотреть'])}</div></div>`;
const videoPhone = (id) => shell(id, `<div class="fr-sc">${videoStage(ev(F[2], 'смотрит сейчас', 'Small talk в офисе · 12 мин'))}<div class="a-panel"><div class="hm-h">Друзья смотрят<span>3</span></div>${[[F[2], 'Small talk в офисе', '12 мин сегодня', true], [F[1], 'В кафе: заказ и счёт', '1 ч 40 мин за неделю', false], [F[0], 'Как спросить дорогу', '35 мин за неделю', false]].map(([f, t, s, live]) => `<div class="fr-watch t" data-act="ev">${ci(f.r, 40, 'cn')}<div class="tx"><div class="t">${f.n} · ${t}</div><div class="s">${live ? '<span class="live"></span>смотрит сейчас · ' : ''}${s}</div></div>${io('chevron-forward', 'color:var(--sec);font-size:18px')}</div>`).join('')}</div>`
  + `<div class="a-panel" style="margin-top:12px"><div class="fr-fav t" style="margin-top:0" data-act="go:fav"><span class="ic">${io('bookmark')}</span><div class="tx">Избранное<small>7 роликов · 84 фразы</small></div>${io('chevron-forward', 'class:ch')}</div><div class="hm-h" style="margin-top:12px">Все ролики<span>126</span></div>${VIDS.slice(1, 3).map((v, i) => vid(v, i === 0)).join('')}</div><div style="height:140px"></div></div>`, tabbar(2), 'fr-video');
const cardsPhone = (id) => shell(id, `<div class="fr-sc"><div class="a-stage">${glow(4, 86, 180)}${art('cards')}<div class="a-scrim"></div><div class="a-top">${head()}</div>${ev(F[3], 'повторил 20 слов', 'Твоя очередь — 12 слов ждут')}<div class="a-body">${body('Карточки · 118 слов', 'Повторить 12 слов', `<div class="a-prog">${io('time-outline')}около 4 минут</div>`, ['Начать'])}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Наборы<span>6</span></div>${[['albums-outline', 'Офис и созвоны', '40 слов · 12 ждут', '12'], ['albums-outline', 'Phrasal verbs', `16 слов · ${ci(10, 16)} Kirill повторил`, '0'], ['albums-outline', 'Из видео · Small talk', '12 слов', '0']].map(([ic, t, s, n]) => `<div class="hm-row t"><span class="ic">${io(ic)}</span><div class="tx"><div class="t">${t}</div><div class="s" style="display:flex;align-items:center;gap:5px">${s}</div></div><span class="n">${n}</span></div>`).join('')}</div><div style="height:140px"></div></div>`, tabbar(1), 'fr-cards');

/* ═════ 2 · приглашение с наградой: вкладка «Друзья» — код и награда прямо на сцене, одна кнопка; шторка «Поделиться» ═════ */
const friendRow = (f, s, call = true) => `<div class="fr-row t">${ci(f.r, 40, 'cn')}<div class="tx"><div class="t">${f.n}</div><div class="s">${s}</div></div>${call ? `<span class="fr-call t" data-act="call"><span class="fr-sw">${io('hand-left')}Позвать</span></span>` : ''}</div>`;
const friendsStage = (inner) => `<div class="a-stage">${glow(4, 86, 180)}${art('intro_friends')}<div class="a-scrim"></div><div class="a-top"><div class="pk-top"><div class="pk-seg"><span class="t">Пик</span><span class="on t">Друзья</span><span class="t">Наборы</span></div><span class="pk-en">${io('flash')}4</span></div></div><div class="a-body">${inner}</div></div>`;
const inviteBody = () => `<div class="a-kick">Друзья · 5</div><div class="a-title">Пригласи друга</div><div class="fr-reward">${io('gift', 'color:#FFD36E;font-size:20px')}Вам обоим по 200 монет за его первый урок</div><div class="a-cta"><div class="qbtn white t" data-act="open:share"><span class="fr-sw">${io('share-outline')}Пригласить</span></div><span class="fr-code t" data-act="copy">${io('link-outline')}VX7-KQ2</span></div>`;
const friendsAfter = () => `<div class="a-panel"><div class="hm-h">Итоги недели<span>пн · 9:00</span></div>${friendRow(F[0], `${io('flame')}12 дней · этаж 4 · лучшее за неделю`)}${friendRow(F[1], `${io('flame')}8 дней · этаж 5`)}${friendRow(F[3], 'Без занятий 3 дня')}</div><div style="height:140px"></div>`;
const friendsPhone = (id) => shell(id, `<div class="fr-sc tall wide">${friendsStage(inviteBody())}${friendsAfter()}</div>`, tabbar(3), 'fr-friends');
const shareSheet = () => `<div class="qdim" data-act="close"></div><div class="qsheet"><div class="qgrab"></div><div class="qt" style="text-align:center">Приглашение</div><div style="display:flex;justify-content:center;margin-top:14px"><span class="fr-code" style="background:color-mix(in srgb, var(--tx) 6%, transparent);font-size:24px;height:56px;padding:0 22px;border-radius:28px;box-shadow:none">VX7-KQ2</span></div>
  <div style="margin-top:14px">${[['gift', 'Друг пройдёт первый урок — вам обоим по 200 монет'], ['key-outline', 'Оформит Plus — тебе ключ Plus от 1 до 365 дней'], ['people', 'Вы сразу друзья: серия вдвоём, зовы, дуэли']].map(([i, t]) => `<div class="hm-row"><span class="ic">${io(i)}</span><div class="tx"><div class="t">${t}</div></div></div>`).join('')}</div>
  <div class="qbtn solid t" style="margin-top:16px" data-act="share"><span class="fr-sw">${io('paper-plane-outline')}Поделиться ссылкой</span></div></div>`;

/* ═════ 3 · команда: собрать → создать (шторка) → экран команды с целью недели и рейтингом ═════ */
const teamEmpty = (id) => shell(id, `<div class="fr-sc tall wide">${friendsStage(`<div class="a-kick">Друзья · 5</div><div class="a-title">Собери команду</div><div class="a-prog">${io('people')}до 10 друзей · общая цель недели · рейтинг команд</div><div class="a-cta"><div class="qbtn white t" data-act="open:team"><span class="fr-sw">${io('add')}Создать</span></div><div class="qbtn glass t" style="flex:none;width:auto;padding:0 18px;border-radius:25px;height:50px;font-size:16px" data-act="toast:Введи код команды — она появится здесь">${io('enter-outline')}По коду</div></div>`)}${friendsAfter()}</div>`, tabbar(3), 'fr-team0');
const teamSheet = () => `<div class="qdim" data-act="close"></div><div class="qsheet"><div class="qgrab"></div><div class="qt" style="text-align:center">Новая команда</div><div class="fr-field">Полиглоты<span class="cur"></span></div><div class="fr-emb">${['rocket-outline', 'flame', 'flag', 'trophy-outline', 'shield-checkmark'].map((i, k) => `<span class="t${k === 0 ? ' on' : ''}" data-act="emb">${io(i)}</span>`).join('')}</div><div class="qm" style="margin-top:8px">Цель недели — 500 монет вместе. Можно поменять потом</div><div class="qbtn solid t" style="margin-top:16px" data-act="go:team"><span class="fr-sw">${io('checkmark')}Создать команду</span></div></div>`;
const MEMBERS = [[{ n: 'Ты', r: 5 }, 96], [F[2], 88], [F[1], 64], [F[0], 40], [F[3], 24], [F[4], 0]];
const teamBody = () => `<div class="fr-team"><span class="em">${io('rocket-outline')}</span><div><div class="a-kick">Команда · 6 из 10</div><div class="a-title" style="margin-top:0">Полиглоты</div></div></div><div class="fr-goal" style="--w:62%"><div class="bar"><i></i></div><div class="v"><span><b data-count="312">0</b> из 500 монет</span><span>цель недели · 2 д 14 ч</span></div></div><div class="a-cta"><div class="qbtn white t" data-act="open:share"><span class="fr-sw">${io('person-add')}Позвать в команду</span></div></div>`;
const teamScreen = () => screenHtml(`<div class="fr-sc tall wide"><div class="a-stage">${glow(4, 86, 180)}${art('intro_friends')}<div class="a-scrim"></div><div class="a-top">${backTop(`<span class="qround glass t">${io('ellipsis-horizontal')}</span>`)}</div><div class="a-body">${teamBody()}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Рейтинг команд<span>неделя</span></div><div class="pk-pod">${[['Ночная смена', 1480, 1, 'flame', 160], ['Berlin Crew', 1320, 2, 'flag', 80], ['Кофе и фразы', 1190, 3, 'trophy-outline', 240]].map(([n, c, p, i, b]) => `<div class="p${p === 1 ? ' first' : ''} t" style="--b:${b}ms"><span class="em">${io(i)}</span><div class="nm">${n}</div><div class="c">${fmt(c)}${ci(0, 14)}</div></div>`).join('')}</div><div class="fr-rank t"><span class="n">12</span><span class="em">${io('rocket-outline')}</span><div class="tx">Полиглоты<small>из 240 команд</small></div><span class="c">312 ${ci(0, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')}</span></div></div>`
  + `<div class="a-panel" style="margin-top:12px"><div class="hm-h">Участники<span>6</span></div>${MEMBERS.map(([f, c]) => `<div class="fr-row t">${ci(f.r, 40, 'cn')}<div class="tx"><div class="t">${f.n}</div><div class="s">${c ? `${io('flame')}за неделю` : 'ещё не начал'}</div></div><span class="n">${c ? `${c} ${ci(0, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')}` : ''}</span></div>`).join('')}</div><div style="height:140px"></div></div>`, tabbar(3));
const teamPhone = (id) => shell(id, `<div class="fr-sc tall wide"><div class="a-stage">${glow(4, 86, 180)}${art('intro_friends')}<div class="a-scrim"></div><div class="a-top">${backTop(`<span class="qround glass t">${io('ellipsis-horizontal')}</span>`)}</div><div class="a-body">${teamBody()}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Рейтинг команд<span>неделя</span></div><div class="pk-pod">${[['Ночная смена', 1480, 1, 'flame', 160], ['Berlin Crew', 1320, 2, 'flag', 80], ['Кофе и фразы', 1190, 3, 'trophy-outline', 240]].map(([n, c, p, i, b]) => `<div class="p${p === 1 ? ' first' : ''} t" style="--b:${b}ms"><span class="em">${io(i)}</span><div class="nm">${n}</div><div class="c">${fmt(c)}${ci(0, 14)}</div></div>`).join('')}</div><div class="fr-rank t"><span class="n">12</span><span class="em">${io('rocket-outline')}</span><div class="tx">Полиглоты<small>из 240 команд</small></div><span class="c">312 ${ci(0, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')}</span></div></div>`
  + `<div class="a-panel" style="margin-top:12px"><div class="hm-h">Участники<span>6</span></div>${MEMBERS.map(([f, c]) => `<div class="fr-row t">${ci(f.r, 40, 'cn')}<div class="tx"><div class="t">${f.n}</div><div class="s">${c ? `${io('flame')}за неделю` : 'ещё не начал'}</div></div><span class="n">${c ? `${c} ${ci(0, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')}` : ''}</span></div>`).join('')}</div><div style="height:140px"></div></div>`, tabbar(3), 'fr-team');

/* ═════ 4–5 · «Друзья смотрят» (шторка со всеми друзьями) и «Избранное» ═════ */
const watchSheet = () => `<div class="qdim" data-act="close"></div><div class="qsheet"><div class="qgrab"></div><div class="qt" style="text-align:center">Друзья смотрят</div><div style="margin-top:8px">${[[F[2], 'Small talk в офисе', '12 мин сегодня · 2 ч 10 мин за неделю', true], [F[1], 'В кафе: заказ и счёт', '1 ч 40 мин за неделю', false], [F[0], 'Как спросить дорогу', '35 мин за неделю', false], [F[3], 'Созвон с командой', '20 мин за неделю', false], [F[4], '—', 'на этой неделе не смотрел', false]].map(([f, t, s, live]) => `<div class="fr-watch t">${ci(f.r, 40, 'cn')}<div class="tx"><div class="t">${f.n}${t === '—' ? '' : ` · ${t}`}</div><div class="s">${live ? '<span class="live"></span>' : ''}${s}</div></div></div>`).join('')}</div><div class="qbtn solid t" style="margin-top:16px" data-act="close">Понятно</div></div>`;
const favScreen = () => screenHtml(`<div class="fr-sc wide"><div class="a-stage">${glow(4, 86, 180)}${art('cards_from_video')}<div class="a-scrim"></div><div class="a-top">${backTop()}</div><div class="a-body">${body('Видео', 'Избранное', `<div class="a-prog">${io('bookmark')}7 роликов · 84 фразы</div>`, ['Смотреть подряд', 'none', 'play'])}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Сохранённые<span>7</span></div>${VIDS.map((v, i) => vid(v, true, i === 0 ? ` · ${ci(12, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')} Аня тоже` : '')).join('')}</div><div style="height:140px"></div></div>`, tabbar(2));
const favPhone = (id) => shell(id, `<div class="fr-sc wide"><div class="a-stage">${glow(4, 86, 180)}${art('cards_from_video')}<div class="a-scrim"></div><div class="a-top">${backTop()}</div><div class="a-body">${body('Видео', 'Избранное', `<div class="a-prog">${io('bookmark')}7 роликов · 84 фразы</div>`, ['Смотреть подряд', 'none', 'play'])}</div></div>`
  + `<div class="a-panel"><div class="hm-h">Сохранённые<span>7</span></div>${VIDS.map((v, i) => vid(v, true, i === 0 ? ` · ${ci(12, 14).replace('display:block', 'display:inline-block;vertical-align:-2px')} Аня тоже` : '')).join('')}</div><div style="height:140px"></div></div>`, tabbar(2), 'fr-fav');

/* ═════ разделы ═════ */
const SECTIONS = [
  ['s1', '1 · «Друг сделал» — на сцене каждого раздела', 'Та же стеклянная строка, что на Главной: монета друга, что сделал, что делать мне. Тап — шторка друга (дать пять, позвать, вдвоём).',
    [['Уроки', seasonPhone], ['Пик', peakPhone], ['Видео', videoPhone], ['Карточки', cardsPhone]],
    [['Чтения', '0 новых — события друзей уже приходят в снимке «Вместе» при входе и пушем; строка берёт последнее событие раздела из кэша телефона'], ['Записи', 'нет — события пишет тот, кто их совершил (как сейчас high_five / lesson_invite)'], ['Обновление', 'при входе в приложение и по пушу; опроса нет']]],
  ['s2', '2 · Пригласить друга — очевидно, с наградой', 'Код и награда прямо на сцене «Друзей», одна кнопка. Шторка: три строки — что получит каждый. «Поделиться» сразу открывает системный лист.',
    [['Вкладка «Друзья»', friendsPhone], ['Шторка «Приглашение»', (id) => friendsPhone(id)]],
    [['Чтения', '0 — код уже в кэше (referral_system), состояние награды — в снимке профиля при входе'], ['Записи', '0 с телефона; награда — серверной функцией по событию регистрации/первого урока друга (как реферальные ключи)'], ['Цифры', '200 монет обоим — на утверждение; ключ Plus — как сейчас']]],
  ['s3', '3 · Команда — собрать, создать, цель недели, рейтинг', 'Три шага и один экран: «Собери команду» на сцене «Друзей» → шторка с названием и эмблемой → экран команды: цель недели заполняется, рейтинг команд и участники ниже.',
    [['Собрать', teamEmpty], ['Создать', (id) => teamEmpty(id)], ['Команда', teamPhone]],
    [['Чтения', '1 документ teams/{teamId} при входе (имя, эмблема, участники ≤ 10, очки недели) + 1 документ team_rank/{неделя} с топ-100 и местом команды — раз в 6 ч, не чаще'], ['Записи', 'очки — батчем раз в день с телефона в teams/{teamId}.members.{uid}; рейтинг считает функция по расписанию раз в час'], ['Контракт', 'новая коллекция — на утверждение; без подписок и без чтения по участнику']]],
  ['s4', '4 · «Друзья смотрят» — в Видео', 'Кто из друзей что смотрит и сколько: строка на сцене (смотрит сейчас), панель «Друзья смотрят» и шторка со всеми.',
    [['Вкладка «Видео»', videoPhone], ['Шторка «Друзья смотрят»', (id) => videoPhone(id)]],
    [['Чтения', '1 документ watch_feed/{uid} при входе — агрегат по друзьям (последний ролик, минуты сегодня и за неделю; не более 20 друзей)'], ['Записи', 'минуты просмотра телефон уже копит (premium_theme_video_watch) — одна запись в день в свой документ, функция раз в час собирает агрегаты друзьям'], ['Приватность', 'видно только подтверждённым друзьям; выключатель в настройках']]],
  ['s5', '5 · «Избранное» для видео', 'Отдельный вход с вкладки «Видео» и свой экран: сохранённые ролики, фразы из них, «Смотреть подряд». Закладка на карточке — как сейчас, мгновенно.',
    [['Избранное', favPhone]],
    [['Чтения', '0 — список закладок уже в локальном сторе (use_video_favorites), счётчики сохранений — как сейчас'], ['Записи', 'как сейчас: закладка едет в профиль батчем'], ['Нового в базе', 'нет']]],
];
const OPEN_AT = { 'Шторка «Приглашение»': 'share', 'Создать': 'team', 'Шторка «Друзья смотрят»': 'watch' };
const section = ([id, title, lead, phones, costs]) => `<section class="block" id="${id}"><h2>${title}</h2><p>${lead}</p>${cost(costs)}<div class="phones">${phones.map(([label, fn], i) => `<div class="col" style="--d:${i * 60}ms">${col(label, fn(THEME_ID)).slice(17)}`).join('')}</div></section>`;

/* ═════ действия: мгновенный отклик, сеть догоняет (Optimistic UI) ═════ */
const topScreen = (ph) => ph.querySelector('.fr-stack').lastElementChild;
const push = (ph, html) => { const stack = ph.querySelector('.fr-stack'); const cur = stack.lastElementChild; const next = el(html); stack.appendChild(next); cur.classList.add('fr-out'); next.classList.add('fr-in'); after(380, () => { cur.classList.replace('fr-out', 'fr-hidden'); next.classList.remove('fr-in'); const g = next.querySelector('.fr-goal'); if (g) g.classList.add('on'); next.querySelectorAll('[data-count]').forEach(countUp); }); };
const pop = (ph) => { const stack = ph.querySelector('.fr-stack'); const cur = stack.lastElementChild; const prev = cur.previousElementSibling; if (!prev) return; prev.classList.remove('fr-hidden'); prev.classList.add('fr-back-in'); cur.classList.add('fr-back-out'); after(360, () => { cur.remove(); prev.classList.remove('fr-back-in'); }); };
const openOverlay = (ph, html) => { const scr = topScreen(ph); const old = scr.querySelector('.fr-ov'); if (old) old.remove(); const ov = el(`<div class="fr-ov">${html}</div>`); scr.appendChild(ov); requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('on'))); return ov; };
const closeOverlay = (ph) => { const ov = topScreen(ph).querySelector('.fr-ov'); if (!ov || ov.classList.contains('off')) return; ov.classList.remove('on'); ov.classList.add('off'); after(340, () => ov.remove()); };
const toast = (ph, text, icon = 'checkmark-circle') => { const scr = topScreen(ph); const t = el(`<div class="fr-toast"><span class="tile">${io(icon)}</span>${text}</div>`); scr.appendChild(t); after(2200, () => { t.classList.add('off'); after(300, () => t.remove()); }); };
const countUp = (node) => { const to = Number(node.dataset.count); if (RM()) { node.textContent = to; return; } const t0 = performance.now(); const tick = (now) => { const p = Math.min(1, (now - t0) / 800); node.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
const SHEETS = { share: shareSheet, team: teamSheet, watch: watchSheet };
const act = (ph, node) => {
  const [name, arg] = node.dataset.act.split(':');
  console.log(LOG, 'act', name, arg || ''); // guard-ok: одна строка на тап
  if (name === 'call') { if (node.classList.contains('sent')) return; node.classList.add('sent'); swap(node.querySelector('.fr-sw'), `${io('checkmark')}Позвал`); return; }
  if (name === 'save') { const on = node.classList.toggle('on'); node.innerHTML = io(on ? 'bookmark' : 'bookmark-outline'); once(node, 'pop'); return; }
  if (name === 'ev') { node.classList.add('done'); toast(ph, 'Открыли карточку друга', 'people'); return; }
  if (name === 'copy') { toast(ph, 'Код скопирован', 'link-outline'); return; }
  if (name === 'share') { closeOverlay(ph); after(380, () => toast(ph, 'Приглашение отправлено', 'paper-plane-outline')); return; }
  if (name === 'emb') { node.parentElement.querySelectorAll('span').forEach((s) => s.classList.toggle('on', s === node)); return; }
  if (name === 'open') { if (SHEETS[arg]) openOverlay(ph, SHEETS[arg]()); return; }
  if (name === 'close') return closeOverlay(ph);
  if (name === 'back') return pop(ph);
  if (name === 'go') { if (arg === 'team') { closeOverlay(ph); after(240, () => push(ph, teamScreen())); } if (arg === 'fav') push(ph, favScreen()); return; }
  if (name === 'toast') { toast(ph, arg, 'enter-outline'); return; }
  return undefined;
};

/* ═════ страница ═════ */
const controls = () => {
  document.getElementById('apList').innerHTML = [['light', 'Светлое'], ['dark', 'Тёмное']].map(([k, n]) => `<span class="chp${AP === k ? ' on' : ''}" data-ap="${k}">${n}</span>`).join('');
  document.getElementById('thmList').innerHTML = THEME_IDS.map((id) => `<span class="chp${THEME_ID === id ? ' on' : ''}" data-th="${id}">${THEMES[id].name}</span>`).join('');
};
const render = (enter = true) => {
  TH = AP === 'light' ? 'ink' : 'marine';
  const root = document.getElementById('root');
  root.className = enter ? 'fr-enter fr-fade' : 'fr-fade';
  root.innerHTML = SECTIONS.map(section).join('');
  controls();
  if (R && R.applyScroll) R.applyScroll(root);
  // шторки «по умолчанию открыты» у телефонов-состояний: приглашение, создание команды, «друзья смотрят»; цель недели и счётчик — после появления
  document.querySelectorAll('.col').forEach((c) => { const lbl = c.querySelector('.lbl'); const key = lbl && OPEN_AT[lbl.textContent]; const ph = c.querySelector('.ph'); if (key && ph) after(700, () => openOverlay(ph, SHEETS[key]())); });
  after(900, () => { document.querySelectorAll('.fr-goal').forEach((g) => g.classList.add('on')); document.querySelectorAll('[data-count]').forEach(countUp); });
  console.log(LOG, 'render', JSON.stringify({ theme: THEME_ID, ap: AP })); // guard-ok: одна строка на перерисовку
};
document.body.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]'); const ph = a && a.closest('[data-ph]');
  if (a && ph) { act(ph, a); return; }
  if (e.target.closest('[data-replay]')) { render(true); return; }
  const c = e.target.closest('.chp[data-ap], .chp[data-th]'); if (!c) return;
  if (c.dataset.ap) AP = c.dataset.ap;
  if (c.dataset.th) THEME_ID = c.dataset.th;
  render(false);
});
{
  const q = new URLSearchParams(location.search);
  if (q.get('ap') === 'light' || q.get('ap') === 'dark') AP = q.get('ap');
  if (THEMES[q.get('th')]) THEME_ID = q.get('th');
}
render(true);
K.init();
window.__fr = { THEME_IDS, render: () => render(true) };
})();
