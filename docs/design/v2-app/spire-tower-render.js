/* ═══════════════════════════════════════════════════════════════════════════
 * spire-tower-render.js — ЕДИНСТВЕННАЯ башня Пика для всех макетов (docs/design/v2-app/*.html).
 *
 * зачем (приказ владельца 13.10 через координатора, №36): «ВСЕ БАШНИ ВО ВСЕХ МАКЕТАХ ДОЛЖНЫ ВЫГЛЯДЕТЬ ИМЕННО ТАК, КАК ОНИ В ПРИЛОЖЕНИИ».
 * Это перенос 1:1 кода приложения (react-native-svg → строка SVG для браузера), без своих «улучшений»:
 *   components/spire/SpireTowerSvg.tsx      — этажи, кладка, окна, карнизы, зубцы Стражей, кровля, сцена, вариант «Итог недели»
 *   components/spire/SpireTowerFinial.tsx   — навершия 12 лиг
 *   components/spire/SpireTowerTextures.tsx — текстуры (один pattern на лигу)
 *   modules/spire/tower_skins.ts            — 12 нарядов лиг (tier 0 Гранит … 11 Алмаз) и Оникс по умолчанию
 *   components/spire/spire_tower_model.ts   — геометрия 390 × H, 15 этажей, Страж каждые 5
 *   components/spire/spire_tower_crown.ts   — прокрутка окна у вершины (кровля и навершие в кадре)
 *   components/spire/useSpireScene.ts       — цвета сцены из ТЕМЫ (небо не рисуется, звёзды только в тёмной)
 *   components/spire/SpireTower.tsx         — окно 400 dp, радиус 22, плита темы, маркер игрока 40 dp, соперники слева
 * Правишь башню в приложении — правь и здесь (и наоборот: макет не может «улучшать» башню сам).
 *
 * Отличия браузера от react-native-svg, учтённые здесь:
 *  • id градиентов в браузере общие на страницу → у каждого вызова свой префикс (иначе 12 башен на странице берут чужой наряд);
 *  • radialGradient rx/ry (RN) → r (+ gradientTransform для эллипса маски «Итога недели»);
 *  • Ellipse rotation/originX/originY → transform="rotate(a x y)"; маркер и соперники — HTML-слой поверх SVG, как Animated.View в коде.
 *
 * API (глобально window.SpireTowerRender и window.renderTower):
 *   SpireTowerRender.svg(o)        → строка <svg> башни. o: { tier, myFloor, selected, theme, scene, width, variant, labels }
 *       tier      0..11 (лига, наряд) | null → Оникс прежнего вида (SPIRE_DEFAULT_SKIN)
 *       myFloor   1..15 | null (null = окна не горят, маркера нет)
 *       selected  выбранный этаж (рамка); по умолчанию = myFloor; 0 — без рамки
 *       theme     'dark' | 'light' (сцена из темы); scene — свои цвета { light, num, numMine, tone, star, shadow, plate }
 *       width     ширина в px (по умолчанию 390, высота = H·width/390); variant 'tower' | 'weekTop' (мини-башня «Итога недели»)
 *   SpireTowerRender.windowHtml(o) → строка окна башни (как SpireTower): o.+ { height=400, coin: (rank)=>url, myRank, rivals: {floor:[rank…]}, scrollTop }
 *       окно прокручено к своему этажу по правилам кода (spireWindowScrollY); scrollTop: 'top' | число — вручную
 *   SpireTowerRender.tourHtml(o)   → башня тура первого входа (SpireTour): Оникс, 240 × 340, верхушка
 *   SpireTowerRender.weekTowerHtml(o) → мини-башня «Итога недели» 58 × 103 + монета 26: o { tier, promoted, myRank, coin, card }
 *   renderTower(el, o)             → вставляет windowHtml в el и выставляет прокрутку
 *   SpireTowerRender.GEOM / skinFor(tier) / SKINS / scene(theme) / scrollYFor(o)
 * ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ───────────── геометрия (spire_tower_model.ts) ─────────────
  const FLOORS = 15;
  const GUARD_EVERY = 5;
  const TW = 390;
  const CX = 195;
  const TOP_PAD = 300;
  const BASE_PAD = 96;
  const isGuard = (f) => f % GUARD_EVERY === 0;
  const isSummit = (f) => f === FLOORS;
  const floorH = (f) => (isGuard(f) ? 60 : 46);
  const floorW = (f) => 196 - (f - 1) * 5;
  const GEOM = (() => {
    let total = 0;
    for (let f = 1; f <= FLOORS; f += 1) total += floorH(f);
    const height = TOP_PAD + total + BASE_PAD;
    let yb = height - BASE_PAD;
    const floors = [];
    for (let f = 1; f <= FLOORS; f += 1) {
      const h = floorH(f);
      const w = floorW(f);
      yb -= h;
      floors.push(Object.freeze({ f, y: yb, h, w, x0: CX - w / 2 }));
    }
    return Object.freeze({ floors: Object.freeze(floors), height, base: height - BASE_PAD, top: floors[FLOORS - 1].y });
  })();
  const markerXY = (fl) => ({ x: fl.x0 + fl.w + 34, y: fl.y + fl.h / 2 + 2 });
  const floorState = (floor, my) => (my == null ? 'unknown' : floor === my ? 'mine' : floor < my ? 'passed' : 'ahead');

  // ───────────── цвет и наряды (tower_skins.ts) ─────────────
  const hex2rgb = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const rgb2hex = (a) => `#${a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
  const mixHex = (a, b, t) => { const A = hex2rgb(a); const B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lighten = (c, t) => mixHex(c, '#ffffff', t);
  const darken = (c, t) => mixHex(c, '#000000', t);

  const DEFAULT_SKIN = Object.freeze({
    id: 'default', premium: false,
    cyl: ['#1F1F23', '#3D3D44', '#5A5A62', '#46464D', '#2C2C31', '#18181B'],
    cylG: ['#232328', '#46464D', '#67676F', '#505058', '#303035', '#1A1A1D'],
    corn: ['#2A2A2F', '#77777F', '#55555C', '#222226'],
    cone: ['#1E1E22', '#55555D', '#3A3A41', '#151518'],
    lit: '#EEF0F6', winPast: '#3A3A40', winDark: '#0B0B0D', winSill: '#6B6B72',
    sky: ['#101013', '#17171A', '#0E0E10'], ground: ['#26262A', '#0E0E10'],
    glow: '#FFFFFF', glowR: 34, spec: 0, edge: '#FFFFFF', tex: null, metal: '#D6D6D8', rim: 'none', finial: 'plain',
    gem: '#FFFFFF', pennant: null, light: false, seam: 0.34, seamLight: 0.045, underTop: 0.42, merlonLo: '#424247', merlonHi: '#6E6E73',
  });

  const LEAGUE_SPECS = Object.freeze([
    { id: 'granite', ru: 'Гранит', stone: '#55575E', spec: 0.22, edge: '#A9B6C6', tex: 'speckle', metal: '#8C9098', rim: 'ring', finial: 'ball', lit: '#F2EEE6', sky: '#111215', glow: 34 },
    { id: 'basalt', ru: 'Базальт', stone: '#384352', spec: 0.14, edge: '#8FA6C2', tex: 'columns', metal: '#7D8796', rim: 'full', finial: 'ball', pennant: '#36597E', lit: '#E2EEF8', sky: '#0E1217', glow: 35 },
    { id: 'marble', ru: 'Мрамор', stone: '#D4CEC4', spec: 0.5, edge: '#FFF4DE', tex: 'marble', metal: '#D9B566', rim: 'full', finial: 'ball', lit: '#FFF2D6', sky: '#15141A', glow: 36 },
    { id: 'jade', ru: 'Нефрит', stone: '#23664F', spec: 0.55, edge: '#9FF0C8', tex: 'jade', metal: '#D9B566', rim: 'full', finial: 'gem', gem: '#4FD69C', lit: '#FFE6B0', sky: '#0C1411', glow: 37 },
    { id: 'quartz', ru: 'Кварц', stone: '#B38494', spec: 0.6, edge: '#FFE0EC', tex: 'quartz', metal: '#E6B8A2', rim: 'full', finial: 'crystal', gem: '#F7C2D6', lit: '#FFEFF4', sky: '#161116', glow: 38 },
    { id: 'agate', ru: 'Агат', stone: '#80502E', spec: 0.45, edge: '#FFC98A', tex: 'agate', metal: '#C8894A', rim: 'full', finial: 'cabochon', gem: '#D9894A', pennant: '#8E3A2A', lit: '#FFE1B0', sky: '#15100D', glow: 39 },
    { id: 'onyx', ru: 'Оникс', stone: '#2C2C33', spec: 0.75, edge: '#C9D2E2', tex: 'onyx', metal: '#C9CCD6', rim: 'full', finial: 'gem', gem: '#1A1A20', lit: '#EEF0F6', sky: '#111114', glow: 40 },
    { id: 'amethyst', ru: 'Аметист', stone: '#4A2D72', spec: 0.6, edge: '#D6B4FF', tex: 'amethyst', metal: '#C9CCD6', rim: 'full', finial: 'cluster', gem: '#B58CFF', pennant: '#6A3FB0', lit: '#F0E2FF', sky: '#110D17', glow: 42 },
    { id: 'opal', ru: 'Опал', stone: '#C4BED0', spec: 0.65, edge: '#DDF4FF', tex: 'opal', metal: '#E8E6EE', rim: 'full', finial: 'orb', pennant: '#BFE3FA', lit: '#FFF4EA', sky: '#14131A', glow: 44 },
    { id: 'topaz', ru: 'Топаз', stone: '#8E6522', spec: 0.75, edge: '#FFE7A0', tex: 'topaz', metal: '#F2D08A', rim: 'full', finial: 'crown', gem: '#FFB43C', lit: '#FFF0C0', sky: '#15120B', glow: 46 },
    { id: 'obsidian', ru: 'Обсидиан', stone: '#1C1A20', spec: 0.9, edge: '#E0503A', tex: 'obsidian', metal: '#5E5A66', rim: 'full', finial: 'shard', gem: '#E0503A', pennant: '#9E2A22', lit: '#FFC08A', sky: '#130C0C', glow: 48 },
    { id: 'diamond', ru: 'Алмаз', stone: '#5C7698', spec: 0.95, edge: '#E6FAFF', tex: 'diamond', metal: '#EEF2F8', rim: 'full', finial: 'brilliant', gem: '#E8F8FF', pennant: '#BFE6FF', lit: '#EAF8FF', sky: '#0C1220', glow: 52 },
  ]);

  function skinFromLeague(L) {
    const b = L.stone;
    const light = hex2rgb(b).reduce((s, v) => s + v, 0) / 3 > 140;
    const k = light ? 0.75 : 1;
    return Object.freeze({
      id: L.id, ru: L.ru, premium: true,
      cyl: [darken(b, 0.7 * k), darken(b, 0.38 * k), b, darken(b, 0.24 * k), darken(b, 0.55 * k), darken(b, 0.78 * k)],
      cylG: [darken(b, 0.64 * k), darken(b, 0.28 * k), lighten(b, 0.06), darken(b, 0.14 * k), darken(b, 0.5 * k), darken(b, 0.74 * k)],
      corn: [darken(b, 0.6), mixHex(lighten(b, 0.2), L.metal, 0.25), darken(b, 0.08), darken(b, 0.7)],
      cone: [darken(b, 0.72), darken(b, 0.1), darken(b, 0.4), darken(b, 0.8)],
      lit: L.lit, winPast: mixHex(darken(b, 0.35), L.lit, 0.14), winDark: darken(b, 0.86), winSill: mixHex(darken(b, 0.1), L.metal, 0.35),
      sky: [L.sky, mixHex(L.sky, b, 0.07), darken(L.sky, 0.15)], ground: [mixHex(L.sky, b, 0.18), darken(L.sky, 0.15)],
      glow: L.lit, glowR: L.glow, spec: L.spec, edge: L.edge, tex: L.tex, metal: L.metal, rim: L.rim, finial: L.finial,
      gem: L.gem || '#FFFFFF', pennant: L.pennant || null, light,
      seam: light ? 0.2 : 0.34, seamLight: light ? 0.14 : 0.05, underTop: light ? 0.3 : 0.42,
      merlonLo: darken(b, 0.6), merlonHi: lighten(b, 0.18),
    });
  }
  const SKINS = Object.freeze(LEAGUE_SPECS.map(skinFromLeague));
  /** spireSkinForTier: нет лиги — Оникс прежнего вида; tier вне 0..11 прижимается. */
  const skinFor = (tier) => (typeof tier !== 'number' || !Number.isFinite(tier) ? DEFAULT_SKIN : SKINS[Math.max(0, Math.min(SKINS.length - 1, Math.trunc(tier)))]);

  // ───────────── сцена из темы (useSpireScene.ts) ─────────────
  // Тёмная — токены «Затмения» (constants/liquidGlassThemePalette GRAPHITE: text #FFFFFF, secondary #B8B9BD; плита окна = bg #0C0D10 + 8,5 % белого).
  // Светлая — значения образцов D180 (номера #6C6C72, свой #0B0C0E, плита #F4F4F8). Свои цвета темы — через o.scene.
  const SCENES = Object.freeze({
    dark: Object.freeze({ light: false, num: '#B8B9BD', numMine: '#FFFFFF', tone: '#FFFFFF', star: '#FFFFFF', shadow: 'rgba(0,0,0,0.55)', plate: '#212224', plateShadow: '0 10px 30px rgba(0,0,0,.34)' }),
    light: Object.freeze({ light: true, num: '#6C6C72', numMine: '#0B0C0E', tone: '#0B0C0E', star: null, shadow: 'rgba(0,0,0,0.16)', plate: '#F4F4F8', plateShadow: '0 10px 30px rgba(20,20,40,.10)' }),
  });
  const sceneFor = (o) => Object.assign({}, SCENES[o && o.theme === 'light' ? 'light' : 'dark'], (o && o.scene) || {});

  // ───────────── мелочи ─────────────
  const f1 = (n) => Math.round(n * 10) / 10;
  const fx = (n) => n.toFixed(1);
  const LABELS_RU = { guard: 'СТРАЖ', summit: 'ВЕРШИНА', aboveClouds: 'НАД ОБЛАКАМИ' };
  const stops = (offs, cols) => offs.map((o, i) => `<stop offset="${o}" stop-color="${cols[i]}"/>`).join('');
  const star4 = (x, y, r, c, a) => `<path d="M${f1(x)} ${f1(y - r)}Q${f1(x)} ${f1(y)} ${f1(x + r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + r)}Q${f1(x)} ${f1(y)} ${f1(x - r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - r)}Z" fill="${c}" opacity="${a}"/>`;
  const ptsS = (a) => a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');
  const poly = (p, fill, op) => `<polygon points="${ptsS(p)}" fill="${fill}" opacity="${op}"/>`;
  let UID = 0;

  // ───────────── текстуры (SpireTowerTextures.tsx) ─────────────
  function textureDefs(tex, id) {
    const T = id('Tex');
    const pat = (w, h, body) => `<pattern id="${T}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">${body}</pattern>`;
    switch (tex) {
      case 'speckle': return pat(16, 16, '<circle cx="3" cy="4" r="0.9" fill="#FFFFFF" opacity="0.3"/><circle cx="11" cy="2" r="0.7" fill="#000000" opacity="0.45"/><circle cx="8" cy="9" r="1.1" fill="#E8ECF2" opacity="0.22"/><circle cx="14" cy="12" r="0.8" fill="#000000" opacity="0.5"/><circle cx="2" cy="13" r="0.6" fill="#FFFFFF" opacity="0.28"/><circle cx="12" cy="7" r="0.5" fill="#C8D2DE" opacity="0.35"/><circle cx="6" cy="14.5" r="0.7" fill="#000000" opacity="0.35"/>');
      case 'columns': return pat(7, 40, '<path d="M2 0V40" stroke="#000000" stroke-width="0.9" opacity="0.28"/><path d="M5.5 0V40" stroke="#FFFFFF" stroke-width="0.6" opacity="0.06"/><path d="M1 18h3" stroke="#000000" stroke-width="0.7" opacity="0.25"/>');
      case 'marble': return pat(140, 110, '<path d="M-10 20C30 5 50 45 90 30S140 60 150 50" stroke="#C9A24A" stroke-width="1.1" fill="none" opacity="0.6"/><path d="M60 38C70 55 66 70 80 92" stroke="#C9A24A" stroke-width="0.6" fill="none" opacity="0.45"/><path d="M-10 80C20 70 60 100 100 78S150 90 160 85" stroke="#7E7A76" stroke-width="0.9" fill="none" opacity="0.4"/><path d="M110 0C104 20 120 30 112 50" stroke="#9A9690" stroke-width="0.5" fill="none" opacity="0.35"/>');
      case 'jade': {
        const J = id('Jg');
        return `<radialGradient id="${J}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9FF0C8" stop-opacity="0.38"/><stop offset="1" stop-color="#9FF0C8" stop-opacity="0"/></radialGradient>`
          + pat(70, 60, `<ellipse cx="20" cy="18" rx="18" ry="10" fill="url(#${J})"/><ellipse cx="52" cy="44" rx="16" ry="9" fill="url(#${J})"/><ellipse cx="50" cy="12" rx="10" ry="5" fill="#04241A" opacity="0.28"/><ellipse cx="14" cy="48" rx="8" ry="4" fill="#04241A" opacity="0.22"/>`);
      }
      case 'quartz': return pat(46, 46, `<ellipse cx="24" cy="24" rx="16" ry="7" fill="#FFFFFF" opacity="0.08"/>${star4(10, 12, 2.6, '#FFFFFF', 0.7)}${star4(34, 32, 1.8, '#FFFFFF', 0.55)}<path d="M30 8L36 4" stroke="#FFFFFF" stroke-width="0.6" opacity="0.45"/><path d="M14 38l3-2 3 2-3 2z" fill="#FFFFFF" opacity="0.3"/>`);
      case 'agate': return pat(90, 90, [40, 32, 25, 18, 11, 5].map((r, i) => `<ellipse cx="45" cy="45" rx="${r}" ry="${f1(r * 0.6)}" fill="none" stroke="${i % 2 ? '#2A140A' : '#F2D8B4'}" stroke-width="${i % 2 ? 1.6 : 1}" opacity="${i % 2 ? 0.3 : 0.32}"/>`).join(''));
      case 'onyx': return pat(120, 26, '<path d="M0 6Q30 2 60 6T120 6" stroke="#FFFFFF" stroke-width="1.2" fill="none" opacity="0.09"/><path d="M0 17Q30 21 60 17T120 17" stroke="#000000" stroke-width="2.2" fill="none" opacity="0.35"/><path d="M0 22Q30 19 60 22T120 22" stroke="#FFFFFF" stroke-width="0.7" fill="none" opacity="0.06"/>');
      case 'amethyst': return pat(34, 34, poly([[0, 0], [17, 6], [8, 17]], '#D8B8FF', 0.16) + poly([[17, 6], [34, 0], [26, 17]], '#FFFFFF', 0.08) + poly([[8, 17], [17, 34], [0, 34]], '#1A0830', 0.25) + poly([[26, 17], [34, 34], [17, 34]], '#B58CFF', 0.14) + '<path d="M17 6V34" stroke="#E0C8FF" stroke-width="0.6" opacity="0.14"/>');
      case 'opal': return pat(150, 84, '<ellipse cx="30" cy="18" rx="34" ry="7" fill="#7FE0C8" opacity="0.2" transform="rotate(-8 30 18)"/><ellipse cx="100" cy="14" rx="30" ry="6" fill="#FFB8D8" opacity="0.18" transform="rotate(6 100 14)"/><ellipse cx="120" cy="52" rx="36" ry="7" fill="#9FC8FF" opacity="0.2" transform="rotate(-5 120 52)"/><ellipse cx="50" cy="60" rx="32" ry="6" fill="#FFE08A" opacity="0.16" transform="rotate(7 50 60)"/><ellipse cx="80" cy="36" rx="22" ry="4" fill="#C9A4FF" opacity="0.2"/><ellipse cx="10" cy="76" rx="20" ry="4" fill="#7FE0C8" opacity="0.14"/>');
      case 'topaz': return pat(38, 38, `<path d="M0 22L38 14" stroke="#FFD36A" stroke-width="3" opacity="0.1"/>${star4(9, 10, 2.6, '#FFF6D0', 0.85)}${star4(28, 26, 1.8, '#FFF6D0', 0.7)}${star4(30, 6, 1.2, '#FFFFFF', 0.5)}<circle cx="14" cy="30" r="0.8" fill="#FFFFFF" opacity="0.5"/><path d="M-2 34C10 28 20 30 40 20" stroke="#FFE7A0" stroke-width="0.8" fill="none" opacity="0.55"/>`);
      case 'obsidian': return pat(170, 150, '<path d="M-10 50L180 -20" stroke="#FFFFFF" stroke-width="10" opacity="0.05"/><path d="M-10 120L180 50" stroke="#FFFFFF" stroke-width="3" opacity="0.04"/><path d="M20 150C40 118 34 96 62 74S96 40 92 0" stroke="#E0503A" stroke-width="3" fill="none" opacity="0.16"/><path d="M20 150C40 118 34 96 62 74S96 40 92 0" stroke="#FF8A5A" stroke-width="0.9" fill="none" opacity="0.65"/><path d="M62 74C80 80 98 78 120 92" stroke="#FF8A5A" stroke-width="0.6" fill="none" opacity="0.45"/><path d="M140 150C136 128 150 116 146 96" stroke="#E0503A" stroke-width="0.7" fill="none" opacity="0.4"/>');
      case 'diamond': return pat(48, 48, poly([[0, 0], [24, 0], [12, 16]], '#CFF2FF', 0.18) + poly([[24, 0], [48, 0], [36, 16]], '#FFFFFF', 0.12) + poly([[12, 16], [36, 16], [24, 40]], '#9FD8FF', 0.15) + '<path d="M0 48L24 30" stroke="#FFB8D8" stroke-width="0.7" opacity="0.3"/><path d="M24 30L48 48" stroke="#B8FFE0" stroke-width="0.7" opacity="0.28"/><path d="M36 16L48 24" stroke="#FFE08A" stroke-width="0.7" opacity="0.26"/><path d="M5 48C15 30 30 20 46 2" stroke="#E8FBFF" stroke-width="0.9" fill="none" opacity="0.5"/>' + star4(40, 40, 1.6, '#FFFFFF', 0.8));
      default: return '';
    }
  }

  // ───────────── навершия (SpireTowerFinial.tsx) ─────────────
  function finialTopY(finial, cy, big) {
    const s = big ? 1.25 : 1;
    switch (finial) {
      case 'ball': return cy - 5.5 * s;
      case 'gem': return cy - 7.8 * s;
      case 'crystal': return cy - 14 * s;
      case 'cabochon': return cy - 6 * s;
      case 'cluster': return cy + 6 - 17 * s;
      case 'orb': return cy - 7 * s;
      case 'crown': return cy - 4 * s - 3;
      case 'shard': return cy - 20 * s;
      case 'brilliant': return cy - 13.2 * s;
      default: return cy - 5.5;
    }
  }
  function finialSvg(skin, cx, cy, big, id) {
    const s = big ? 1.25 : 1;
    const g = skin.gem;
    const M = `url(#${id('Metal')})`;
    const gemD = (x, y, r, c) => `<polygon points="${ptsS([[x, y - r * 1.2], [x + r * 0.8, y - r * 0.2], [x, y + r], [x - r * 0.8, y - r * 0.2]])}" fill="${c}"/><polygon points="${ptsS([[x, y - r * 1.2], [x - r * 0.8, y - r * 0.2], [x, y - r * 0.1]])}" fill="rgba(255,255,255,.75)"/><polygon points="${ptsS([[x, y - r * 0.1], [x + r * 0.8, y - r * 0.2], [x, y + r]])}" fill="rgba(0,0,0,.28)"/>`;
    switch (skin.finial) {
      case 'ball': return `<circle cx="${cx}" cy="${cy}" r="${f1(5.5 * s)}" fill="${M}"/><circle cx="${f1(cx - 1.6)}" cy="${f1(cy - 1.8)}" r="${f1(1.5 * s)}" fill="rgba(255,255,255,.75)"/>`;
      case 'gem': return `<rect x="${f1(cx - 4 * s)}" y="${f1(cy + 4 * s)}" width="${f1(8 * s)}" height="${f1(2.4 * s)}" rx="1" fill="${M}"/>${gemD(cx, cy, 6.5 * s, g)}${skin.id === 'onyx' ? `<path d="M${f1(cx - 5.2 * s)} ${f1(cy - 1.3 * s)}L${f1(cx)} ${f1(cy - 7.8 * s)}L${f1(cx + 5.2 * s)} ${f1(cy - 1.3 * s)}" stroke="#E8EBF2" stroke-width="0.9" fill="none"/>` : ''}`;
      case 'crystal': {
        const w = 5 * s; const h = 14 * s;
        return `<polygon points="${ptsS([[cx - w, cy + 5], [cx + w, cy + 5], [cx + w, cy - h * 0.4], [cx, cy - h], [cx - w, cy - h * 0.4]])}" fill="${g}"/><polygon points="${ptsS([[cx - w, cy + 5], [cx - w * 0.2, cy + 5], [cx - w * 0.2, cy - h * 0.4], [cx, cy - h], [cx - w, cy - h * 0.4]])}" fill="rgba(255,255,255,.55)"/><polygon points="${ptsS([[cx + w * 0.3, cy + 5], [cx + w, cy + 5], [cx + w, cy - h * 0.4], [cx, cy - h]])}" fill="rgba(0,0,0,.18)"/><rect x="${f1(cx - w - 1)}" y="${f1(cy + 4)}" width="${f1(w * 2 + 2)}" height="2.4" rx="1" fill="${M}"/>`;
      }
      case 'cabochon': return `<ellipse cx="${cx}" cy="${cy}" rx="${f1(7 * s)}" ry="${f1(6 * s)}" fill="${M}"/><ellipse cx="${cx}" cy="${cy}" rx="${f1(5.6 * s)}" ry="${f1(4.8 * s)}" fill="${g}"/><ellipse cx="${cx}" cy="${cy}" rx="${f1(3.6 * s)}" ry="${f1(3 * s)}" fill="none" stroke="#F2D8B4" stroke-width="0.9" opacity="0.8"/><ellipse cx="${cx}" cy="${cy}" rx="${f1(1.8 * s)}" ry="${f1(1.4 * s)}" fill="#5A2A12"/><ellipse cx="${f1(cx - 2 * s)}" cy="${f1(cy - 2.2 * s)}" rx="${f1(1.8 * s)}" ry="1" fill="rgba(255,255,255,.7)"/>`;
      case 'cluster': {
        const c = (x, y, w, h, lean) => `<polygon points="${ptsS([[x - w, y], [x + w, y], [x + w + lean * 0.4, y - h * 0.65], [x + lean, y - h], [x - w + lean * 0.4, y - h * 0.65]])}" fill="${g}"/><polygon points="${ptsS([[x - w, y], [x, y], [x + lean, y - h], [x - w + lean * 0.4, y - h * 0.65]])}" fill="rgba(255,255,255,.4)"/>`;
        return c(cx - 5 * s, cy + 6, 2.6 * s, 11 * s, -3) + c(cx + 5 * s, cy + 6, 2.6 * s, 11 * s, 3) + c(cx, cy + 6, 3.4 * s, 17 * s, 0) + `<rect x="${f1(cx - 9 * s)}" y="${f1(cy + 5)}" width="${f1(18 * s)}" height="2.4" rx="1" fill="${M}"/>`;
      }
      case 'orb': return `<rect x="${f1(cx - 4 * s)}" y="${f1(cy + 5.5 * s)}" width="${f1(8 * s)}" height="2.4" rx="1" fill="${M}"/><circle cx="${cx}" cy="${cy}" r="${f1(7 * s)}" fill="url(#${id('Orb')})"/><circle cx="${f1(cx - 2.4 * s)}" cy="${f1(cy - 2.6 * s)}" r="${f1(1.8 * s)}" fill="#FFFFFF" opacity="0.85"/>`;
      case 'crown': {
        const w = 9 * s; const b = cy + 6; const t = cy - 4 * s;
        return `<path d="M${f1(cx - w)} ${f1(b)}L${f1(cx - w)} ${f1(t)}L${f1(cx - w * 0.5)} ${f1(b - 5)}L${cx} ${f1(t - 3)}L${f1(cx + w * 0.5)} ${f1(b - 5)}L${f1(cx + w)} ${f1(t)}L${f1(cx + w)} ${f1(b)}Z" fill="${M}"/>${gemD(cx, b - 3.5, 3 * s, g)}<circle cx="${f1(cx - w)}" cy="${f1(t - 1)}" r="1.4" fill="#FFF3C8"/><circle cx="${f1(cx + w)}" cy="${f1(t - 1)}" r="1.4" fill="#FFF3C8"/>`;
      }
      case 'shard': {
        const h = 20 * s;
        return `<circle cx="${cx}" cy="${f1(cy - 2)}" r="${f1(14 * s)}" fill="url(#${id('Ember')})"/><polygon points="${ptsS([[cx - 4 * s, cy + 6], [cx + 4.5 * s, cy + 6], [cx + 1.5, cy - h]])}" fill="#141218"/><polygon points="${ptsS([[cx - 4 * s, cy + 6], [cx - 0.5, cy + 6], [cx + 1.5, cy - h]])}" fill="#3A3640"/><path d="M${f1(cx + 4.5 * s)} ${f1(cy + 6)}L${f1(cx + 1.5)} ${f1(cy - h)}" stroke="${g}" stroke-width="1.2"/><rect x="${f1(cx - 6 * s)}" y="${f1(cy + 5)}" width="${f1(12 * s)}" height="2.4" rx="1" fill="${M}"/>`;
      }
      case 'brilliant': {
        const w = 8 * s; const b = cy + 8; const t = cy - 1; const gy = cy - 6 * s; const r = 6 * s;
        return `<path d="M${f1(cx - w)} ${f1(b)}L${f1(cx - w)} ${f1(t)}L${f1(cx - w * 0.5)} ${f1(b - 4)}L${cx} ${f1(t - 2)}L${f1(cx + w * 0.5)} ${f1(b - 4)}L${f1(cx + w)} ${f1(t)}L${f1(cx + w)} ${f1(b)}Z" fill="${M}"/><polygon points="${ptsS([[cx - r, gy], [cx - r * 0.5, gy - r * 0.6], [cx + r * 0.5, gy - r * 0.6], [cx + r, gy], [cx, gy + r * 1.1]])}" fill="${g}"/><polygon points="${ptsS([[cx - r * 0.5, gy - r * 0.6], [cx + r * 0.5, gy - r * 0.6], [cx + r * 0.25, gy], [cx - r * 0.25, gy]])}" fill="#FFFFFF"/><polygon points="${ptsS([[cx + r * 0.25, gy], [cx + r, gy], [cx, gy + r * 1.1]])}" fill="rgba(90,140,200,.35)"/>${star4(cx + r + 2, gy - r * 0.7, 3 * s, '#FFFFFF', 0.9)}`;
      }
      default: return `<circle cx="${cx}" cy="${cy}" r="${f1(5.5 * s)}" fill="#FFFFFF"/>`;
    }
  }

  // ───────────── градиенты наряда (skinDefs) ─────────────
  function skinDefs(skin, sc, id) {
    const s = skin.spec;
    const O6 = ['0', '0.16', '0.36', '0.55', '0.8', '1'];
    const O4 = ['0', '0.35', '0.6', '1'];
    let d = `<linearGradient id="${id('Cyl')}" x1="0" x2="1" y1="0" y2="0">${stops(O6, skin.cyl)}</linearGradient>`
      + `<linearGradient id="${id('CylG')}" x1="0" x2="1" y1="0" y2="0">${stops(O6, skin.cylG)}</linearGradient>`
      + `<linearGradient id="${id('CylCorn')}" x1="0" x2="1" y1="0" y2="0">${stops(O4, skin.corn)}</linearGradient>`
      + `<linearGradient id="${id('Cone')}" x1="0" x2="1" y1="0" y2="0">${stops(O4, skin.cone)}</linearGradient>`
      + `<linearGradient id="${id('Under')}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity="${skin.underTop}"/><stop offset="0.3" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.12"/></linearGradient>`
      + `<radialGradient id="${id('Glow')}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${skin.glow}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${skin.glow}" stop-opacity="0.1"/><stop offset="1" stop-color="${skin.glow}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id('LitFloor')}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${skin.glow}" stop-opacity="0.16"/><stop offset="1" stop-color="${skin.glow}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id('Cloud')}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${sc.tone}" stop-opacity="${sc.light ? 0.07 : 0.09}"/><stop offset="1" stop-color="${sc.tone}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="${id('GroundTheme')}" cx="0.5" cy="0.2" r="0.5"><stop offset="0" stop-color="${sc.tone}" stop-opacity="${sc.light ? 0.1 : 0.14}"/><stop offset="1" stop-color="${sc.tone}" stop-opacity="0"/></radialGradient>`;
    if (skin.premium) {
      d += `<linearGradient id="${id('Gloss')}" x1="0" x2="1" y1="0" y2="0">`
        + '<stop offset="0" stop-color="#000000" stop-opacity="0.45"/><stop offset="0.1" stop-color="#000000" stop-opacity="0.12"/><stop offset="0.2" stop-color="#FFFFFF" stop-opacity="0"/>'
        + `<stop offset="0.27" stop-color="#FFFFFF" stop-opacity="${Math.round(s * 12) / 100}"/><stop offset="0.31" stop-color="#FFFFFF" stop-opacity="${Math.round(s * 48) / 100}"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="${Math.round(s * 10) / 100}"/>`
        + '<stop offset="0.44" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="0.62" stop-color="#000000" stop-opacity="0"/><stop offset="0.84" stop-color="#000000" stop-opacity="0.2"/>'
        + `<stop offset="0.93" stop-color="${skin.edge}" stop-opacity="0"/><stop offset="0.955" stop-color="${skin.edge}" stop-opacity="${Math.round((0.12 + s * 0.12) * 100) / 100}"/><stop offset="0.975" stop-color="${skin.edge}" stop-opacity="0"/>`
        + '<stop offset="1" stop-color="#000000" stop-opacity="0.5"/></linearGradient>'
        + `<linearGradient id="${id('Metal')}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${mixHex(skin.metal, '#000000', 0.45)}"/><stop offset="0.3" stop-color="${mixHex(skin.metal, '#ffffff', 0.45)}"/><stop offset="0.55" stop-color="${skin.metal}"/><stop offset="1" stop-color="${mixHex(skin.metal, '#000000', 0.55)}"/></linearGradient>`;
      if (skin.finial === 'orb') d += `<radialGradient id="${id('Orb')}" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.35" stop-color="#BFEFE0"/><stop offset="0.6" stop-color="#F6C8E0"/><stop offset="0.85" stop-color="#9FC0F2"/><stop offset="1" stop-color="#7A7090"/></radialGradient>`;
      if (skin.finial === 'shard') d += `<radialGradient id="${id('Ember')}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFB070" stop-opacity="0.8"/><stop offset="0.4" stop-color="#E0503A" stop-opacity="0.3"/><stop offset="1" stop-color="#E0503A" stop-opacity="0"/></radialGradient>`;
      d += textureDefs(skin.tex, id);
    }
    return d;
  }

  // ───────────── части башни ─────────────
  const windowPath = (x, y, w, h) => `M${fx(x)} ${fx(y + w / 2)}a${fx(w / 2)} ${fx(w / 2)} 0 0 1 ${fx(w)} 0V${y + h}H${fx(x)}Z`;

  function stonesPath(fl) {
    const { y, h, w, x0 } = fl;
    const r = w / 2;
    let seams = '';
    let light = '';
    let row = 0;
    for (let yy = y + 11; yy < y + h; yy += 11, row += 1) {
      seams += `M${x0} ${yy}Q${CX} ${yy + 4} ${x0 + w} ${yy}`;
      light += `M${x0} ${yy + 1.2}Q${CX} ${yy + 5.2} ${x0 + w} ${yy + 1.2}`;
      for (let t = -1.35 + (row % 2) * 0.14; t < 1.4; t += 0.28) {
        const x = CX + r * Math.sin(t);
        seams += `M${x.toFixed(1)} ${(yy - 11 + 1.5 * Math.cos(t)).toFixed(1)}V${(yy + 3 * Math.cos(t)).toFixed(1)}`;
      }
    }
    return { seams, light };
  }

  function floorWindows(fl, tone, skin) {
    const { f, y, w } = fl;
    const r = w / 2;
    const guard = isGuard(f);
    const angles = f >= 12 ? [-0.55, 0.55] : [-0.72, 0, 0.72];
    const fill = tone === 'lit' ? skin.lit : tone === 'past' ? skin.winPast : skin.winDark;
    return angles.map((t) => {
      const big = guard && t === 0;
      const ww = (big ? 16 : 12) * Math.cos(t);
      const wh = big ? 30 : 20;
      const x = CX + r * Math.sin(t) - ww / 2;
      const yy = y + (guard ? 22 : 12) - (big ? 6 : 0);
      const d = windowPath(x, yy, ww, wh);
      return `<g>${tone === 'lit' ? `<path d="${d}" fill="${skin.lit}" fill-opacity="0.3" stroke="${skin.lit}" stroke-opacity="0.25" stroke-width="6" stroke-linejoin="round"/>` : ''}<path d="${d}" fill="${fill}"/><rect x="${x - 2}" y="${yy + wh}" width="${ww + 4}" height="2.6" rx="1" fill="${skin.winSill}"/></g>`;
    }).join('');
  }

  function floorSvg(fl, tone, skin, mine, selected, label, bare, sc, id) {
    const { f, y, h, w, x0 } = fl;
    const guard = isGuard(f);
    const st = stonesPath(fl);
    const cl = id(`Cl${f}`);
    let out = `<g data-floor="${f}"><clipPath id="${cl}"><rect x="${x0}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
    if (mine) out += `<ellipse cx="${CX}" cy="${y + h / 2}" rx="${w / 2 + 70}" ry="${h}" fill="url(#${id('LitFloor')})"/>`;
    out += `<rect x="${x0}" y="${y}" width="${w}" height="${h}" fill="url(#${id(guard ? 'CylG' : 'Cyl')})"/>`;
    if (skin.premium) out += `<rect x="${x0}" y="${y}" width="${w}" height="${h}" fill="url(#${id('Tex')})"/>`;
    out += `<path d="${st.seams}" stroke="rgba(0,0,0,${skin.seam})" stroke-width="1.1" fill="none" clip-path="url(#${cl})"/>`;
    out += `<path d="${st.light}" stroke="rgba(255,255,255,${skin.seamLight})" stroke-width="1" fill="none" clip-path="url(#${cl})"/>`;
    if (skin.premium) out += `<rect x="${x0}" y="${y}" width="${w}" height="${h}" fill="url(#${id('Gloss')})"/>`;
    out += `<rect x="${x0}" y="${y}" width="${w}" height="${h}" fill="url(#${id('Under')})"/>`;
    out += floorWindows(fl, tone, skin);
    if (!guard) out += `<rect x="${x0 - 5}" y="${y - 3}" width="${w + 10}" height="7" rx="3" fill="url(#${id('CylCorn')})"/><rect x="${x0 - 5}" y="${y - 3}" width="${w + 10}" height="1.4" rx="0.7" fill="rgba(255,255,255,.28)"/>`;
    if (!bare) out += `<text x="14" y="${y + h / 2 + (label ? 0 : 5)}" font-size="14" font-weight="${mine ? 700 : 600}" fill="${mine ? sc.numMine : sc.num}" text-anchor="middle">${f}</text>`;
    if (label && !bare) out += `<text x="20" y="${y + h / 2 + 14}" font-size="7.5" font-weight="700" letter-spacing="0.5" fill="${sc.num}" text-anchor="middle">${label}</text>`;
    if (selected) out += `<rect x="${x0 - 9}" y="${y - (guard ? 20 : 6)}" width="${w + 18}" height="${h + (guard ? 23 : 9)}" rx="5" fill="none" stroke="${sc.light ? sc.numMine : 'rgba(255,255,255,.8)'}" stroke-opacity="${sc.light ? 0.85 : 1}" stroke-width="1.4"/>`;
    return `${out}</g>`;
  }

  function cornRims(id) {
    const d = GEOM.floors.filter((fl) => !isGuard(fl.f)).map((fl) => `M${fl.x0 - 5} ${fl.y + 2.4}h${fl.w + 10}v1.4h${-(fl.w + 10)}z`).join('');
    return `<path d="${d}" fill="url(#${id('Metal')})"/>`;
  }

  function parapet(fl, skin, id) {
    const { y, w, x0 } = fl;
    const r = w / 2 + 7;
    let merlons = '';
    let caps = '';
    for (let t = -1.32; t <= 1.33; t += 0.3) {
      const mw = 11 * Math.cos(t);
      const x = CX + r * Math.sin(t) - mw / 2;
      const shade = 0.62 - 0.38 * Math.sin(t + 0.45);
      merlons += `<rect x="${x}" y="${y - 17}" width="${mw}" height="14" rx="1.2" fill="${mixHex(skin.merlonLo, skin.merlonHi, shade)}"/>`;
      caps += `M${x.toFixed(1)} ${y - 17}h${mw.toFixed(1)}v1.8h${(-mw).toFixed(1)}z`;
    }
    let brackets = '';
    for (let t = -1.25; t <= 1.26; t += 0.25) {
      const cw = 6 * Math.cos(t);
      const x = CX + (w / 2 + 3) * Math.sin(t) - cw / 2;
      brackets += `M${x.toFixed(1)} ${y + 6}h${cw.toFixed(1)}l-1 7h${(-cw + 2).toFixed(1)}Z`;
    }
    return `<g><rect x="${x0 - 7}" y="${y - 4}" width="${w + 14}" height="10" rx="2" fill="url(#${id('CylCorn')})"/>${merlons}${skin.rim === 'full' ? `<path d="${caps}" fill="url(#${id('Metal')})"/>` : ''}<path d="${brackets}" fill="rgba(0,0,0,.45)"/></g>`;
  }

  function crown(skin, summit, id) {
    const t = GEOM.floors[FLOORS - 1];
    const dw = t.w - 22;
    const dx = CX - dw / 2;
    const yd = t.y - 34;
    const apex = yd - 168;
    const rw = dw + 26;
    const premium = skin.premium;
    const big = premium && summit;
    let shingles = '';
    for (let yy = yd - 10; yy > apex + 10; yy -= 11) {
      const k = (yd - yy) / (yd - apex);
      const hw = (rw / 2) * (1 - k);
      shingles += `M${(CX - hw).toFixed(1)} ${yy}Q${CX} ${(yy + 4 * (1 - k)).toFixed(1)} ${(CX + hw).toFixed(1)} ${yy}`;
    }
    const conePts = `${CX - rw / 2},${yd} ${CX + rw / 2},${yd} ${CX},${apex}`;
    const ring = `<rect x="${CX - rw / 2}" y="${yd - 4}" width="${rw}" height="8" rx="4" fill="url(#${id(skin.rim === 'none' ? 'CylCorn' : 'Metal')})"/>`;
    const poleTop = apex - (skin.pennant ? 34 : 12);
    const poleBase = finialTopY(skin.finial, apex - 16, big) + 1;
    let out = `<g><rect x="${dx}" y="${yd}" width="${dw}" height="34" fill="url(#${id('Cyl')})"/>`;
    if (premium) out += `<rect x="${dx}" y="${yd}" width="${dw}" height="34" fill="url(#${id('Gloss')})"/>`;
    out += premium ? [-0.5, 0, 0.5].map((a) => {
      const ww = 9 * Math.cos(a);
      const x = CX + (dw / 2) * Math.sin(a) - ww / 2;
      return `<path d="${windowPath(x, yd + 9, ww, 15)}" fill="${big ? skin.lit : skin.winDark}"/>`;
    }).join('') : ring;
    out += `<polygon points="${conePts}" fill="url(#${id('Cone')})"/>`;
    if (premium) out += `<polygon points="${conePts}" fill="url(#${id('Tex')})"/>`;
    out += `<path d="${shingles}" stroke="rgba(0,0,0,.38)" stroke-width="1.1" fill="none"/>`;
    if (premium) out += `<polygon points="${conePts}" fill="url(#${id('Gloss')})"/>${ring}`;
    out += `<circle cx="${CX}" cy="${apex - 14}" r="${big ? skin.glowR * 2.6 : skin.glowR}" fill="url(#${id('Glow')})"/>`;
    if (premium) {
      if (skin.pennant && poleBase > poleTop) out += `<line x1="${CX}" y1="${poleBase}" x2="${CX}" y2="${poleTop}" stroke="url(#${id('Metal')})" stroke-width="2"/>`;
      if (skin.pennant) out += `<path d="M${CX + 1} ${poleTop}h18l-5 5.5 5 5.5h-18z" fill="${skin.pennant}"/><path d="M${CX + 1} ${poleTop}h18l-5 5.5h-13z" fill="rgba(255,255,255,.2)"/>`;
      out += finialSvg(skin, CX, apex - 16, big, id);
    } else {
      out += `<rect x="${CX - 1}" y="${apex - 12}" width="2" height="16" fill="#D6D6D8"/><circle cx="${CX}" cy="${apex - 16}" r="5.5" fill="#FFFFFF"/>`;
    }
    return `${out}</g>`;
  }

  const STARS = [[40, 30], [96, 70], [150, 22], [238, 54], [300, 18], [352, 76], [70, 128], [330, 140], [20, 190], [372, 210], [120, 180]];
  const WEEK_TOP_W = 192;
  const WEEK_TOP_H = 342;
  // зачем (закон владельца 14.10 «пик башни и свет ничем не обрезаются»): в коде рамка «Итога недели» top−236 режет ореол навершия
  // (круг r 88 выходит на 68 ед. выше) — поднимаем рамку на WEEK_TOP_PAD, маску держим в тех же абсолютных координатах.
  // Тот же сдвиг должен прийти в SpireTowerSvg.tsx (строка Дизайну).
  const WEEK_TOP_PAD = 80;
  // полная башня: ореол шпиля выходит на 4 ед. выше y=0 — svg не режет по своему краю (overflow visible, геометрия и маркеры
  // страниц не сдвигаются), а окно башни даёт запас сверху TOWER_PAD (маркер и соперники лежат в том же слое и едут вместе).
  const TOWER_PAD = 14;

  /** Башня целиком (SpireTowerSvg со сценой темы — как в приложении сейчас: неба нет, окно = плита темы). */
  function svg(o) {
    o = o || {};
    const skin = o.skin || skinFor(o.tier);
    const sc = sceneFor(o);
    const L = Object.assign({}, LABELS_RU, o.labels || {});
    const p = `st${++UID}_`;
    const id = (n) => p + n;
    const myFloor = o.myFloor == null ? null : Math.max(1, Math.min(FLOORS, o.myFloor));
    const selected = o.selected == null ? (myFloor || 0) : o.selected;
    const summit = myFloor === FLOORS;
    const width = o.width || TW;
    const defs = skinDefs(skin, sc, id);
    const toneOf = (f) => { const s = floorState(f, myFloor); return s === 'mine' ? 'lit' : s === 'passed' ? 'past' : 'dark'; };
    if (o.variant === 'weekTop') {
      const vx = CX - WEEK_TOP_W / 2;
      const vy = GEOM.top - 236 - WEEK_TOP_PAD;
      const VH = WEEK_TOP_H + WEEK_TOP_PAD;
      const mcy = GEOM.top - 236 + 0.42 * WEEK_TOP_H; // центр маски краёв — как в коде, в абсолютных единицах
      // маска краёв: RN RadialGradient cx .5 cy .42 rx .72 ry .62 → браузер r .62 + растяжение по x (0,72/0,62)
      const fade = `<radialGradient id="${id('WeekFadeG')}" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${f1(mcy)}" r="${f1(0.62 * WEEK_TOP_H)}" gradientTransform="translate(${CX} ${f1(mcy)}) scale(${f1(0.72 * WEEK_TOP_W / (0.62 * WEEK_TOP_H) * 1000) / 1000} 1) translate(${-CX} ${f1(-mcy)})"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.66" stop-color="#FFFFFF"/><stop offset="1" stop-color="#000000"/></radialGradient>`
        + `<mask id="${id('WeekFade')}" x="${vx}" y="${vy}" width="${WEEK_TOP_W}" height="${VH}" maskUnits="userSpaceOnUse"><rect x="${vx}" y="${vy}" width="${WEEK_TOP_W}" height="${VH}" fill="url(#${id('WeekFadeG')})"/></mask>`;
      const floors = GEOM.floors.slice(FLOORS - 2).map((fl) => floorSvg(fl, toneOf(fl.f), skin, floorState(fl.f, myFloor) === 'mine', false, '', true, sc, id)).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${f1((width * VH) / WEEK_TOP_W)}" viewBox="${vx} ${vy} ${WEEK_TOP_W} ${VH}" data-spire-tower="weekTop"><defs>${defs}${fade}</defs><g mask="url(#${id('WeekFade')})">${floors}${skin.rim === 'full' ? cornRims(id) : ''}${crown(skin, summit, id)}</g></svg>`;
    }
    const b = GEOM.floors[0];
    const skyY = GEOM.top - 250;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${f1((GEOM.height * width) / TW)}" viewBox="0 0 ${TW} ${GEOM.height}" style="overflow:visible" data-spire-tower="${skin.id}"><defs>${defs}</defs>`;
    if (sc.star) out += STARS.map(([x, yy], i) => `<circle cx="${x}" cy="${skyY - 40 + yy}" r="${i % 3 ? 0.8 : 1.2}" fill="${sc.star}" opacity="${i % 2 ? 0.35 : 0.55}"/>`).join('');
    out += `<ellipse cx="60" cy="${GEOM.top - 150}" rx="130" ry="28" fill="url(#${id('Cloud')})"/><ellipse cx="330" cy="${GEOM.top - 170}" rx="140" ry="30" fill="url(#${id('Cloud')})"/><ellipse cx="80" cy="${GEOM.top - 96}" rx="110" ry="22" fill="url(#${id('Cloud')})"/><ellipse cx="320" cy="${GEOM.top - 90}" rx="120" ry="22" fill="url(#${id('Cloud')})"/>`;
    out += `<text x="${CX}" y="${GEOM.top - 272}" font-size="11" font-weight="700" letter-spacing="3" fill="${sc.num}" text-anchor="middle">${L.aboveClouds}</text>`;
    out += `<ellipse cx="${CX}" cy="${GEOM.base + 44}" rx="210" ry="40" fill="url(#${id('GroundTheme')})"/>`;
    out += `<ellipse cx="${CX}" cy="${GEOM.base + 30}" rx="${b.w / 2 + 64}" ry="12" fill="${sc.shadow}"/>`;
    out += `<rect x="${b.x0 - 30}" y="${GEOM.base + 16}" width="${b.w + 60}" height="14" rx="3" fill="url(#${id('CylCorn')})" opacity="0.7"/>`;
    out += `<rect x="${b.x0 - 16}" y="${GEOM.base + 2}" width="${b.w + 32}" height="16" rx="3" fill="url(#${id('CylCorn')})"/>`;
    if (skin.premium) out += `<rect x="${b.x0 - 16}" y="${GEOM.base + 2}" width="${b.w + 32}" height="1.5" fill="rgba(255,255,255,.25)"/>`;
    if (skin.rim !== 'none') out += `<rect x="${b.x0 - 16}" y="${GEOM.base + 15}" width="${b.w + 32}" height="1.6" fill="url(#${id('Metal')})"/>`;
    out += GEOM.floors.map((fl) => {
      const label = isSummit(fl.f) ? L.summit : isGuard(fl.f) ? L.guard : '';
      return floorSvg(fl, toneOf(fl.f), skin, floorState(fl.f, myFloor) === 'mine', fl.f === selected, label, false, sc, id);
    }).join('');
    if (skin.rim === 'full') out += cornRims(id);
    out += GEOM.floors.filter((fl) => isGuard(fl.f) && !isSummit(fl.f)).map((fl) => parapet(fl, skin, id)).join('');
    out += crown(skin, summit, id);
    return `${out}</svg>`;
  }

  // ───────────── окно башни (SpireTower.tsx + spire_tower_crown.ts) ─────────────
  const CROWN_RISE = 34 + 168 + 36;
  const FINIAL_SLACK = 12;
  const WINDOW_H = 400;
  const MARKER = 40;
  const RIVAL = 22;
  const RIVAL_STEP = 13;

  /** Смещение окна: свой этаж по центру; на 14–15 — к верху (кровля и навершие в кадре). Копия spireWindowScrollY + spireCrownTopY. */
  function scrollYFor(o) {
    const scale = (o.width || TW) / TW;
    const h = o.height || WINDOW_H;
    const my = o.myFloor == null ? null : Math.max(1, Math.min(FLOORS, o.myFloor));
    const fl = my == null ? GEOM.floors[0] : GEOM.floors[my - 1];
    const pad = TOWER_PAD * scale;
    const cy = (fl.y + fl.h / 2) * scale + pad;
    const centered = Math.max(0, cy - h / 2);
    const maxY = Math.max(0, GEOM.height * scale + pad - h);
    if (my == null || my < FLOORS - 1) return Math.min(centered, maxY);
    const crownTopY = Math.max(0, (GEOM.top - CROWN_RISE) * scale); // запас pad уже над кровлей — цель «кровля у верха» не меняется
    const half = (fl.h / 2) * scale;
    for (const target of [0, crownTopY]) if (cy + half <= target + h) return Math.min(centered, target);
    const bottomAligned = Math.max(0, cy + half - h);
    if (bottomAligned <= crownTopY + FINIAL_SLACK) return Math.min(centered, bottomAligned);
    return Math.min(centered, maxY);
  }

  /** Окно башни как в приложении: плита темы, радиус 22, 400 px, прокрутка к своему этажу, маркер 40 и соперники слева. */
  function windowHtml(o) {
    o = Object.assign({ width: 358, height: WINDOW_H }, o || {});
    const sc = sceneFor(o);
    const scale = o.width / TW;
    const my = o.myFloor == null ? null : Math.max(1, Math.min(FLOORS, o.myFloor));
    const y = o.scrollTop === 'top' ? 0 : typeof o.scrollTop === 'number' ? o.scrollTop : scrollYFor(o);
    const coin = typeof o.coin === 'function' ? o.coin : null;
    let layer = '';
    if (o.rivals && coin) {
      for (const fl of GEOM.floors) {
        const list = o.rivals[fl.f];
        if (!list || !list.length) continue;
        const shown = Math.min(list.length, 2);
        const extra = list.length - shown;
        const ax = fl.x0 - 10 - (RIVAL + (shown - 1) * RIVAL_STEP) - (extra ? 22 : 0);
        const top = (fl.y + fl.h / 2 - RIVAL / 2) * scale;
        layer += `<div style="position:absolute;left:${f1(ax * scale)}px;top:${f1(top)}px;display:flex;align-items:center;opacity:${o.dimRivals ? 0.55 : 1}">${list.slice(0, shown).map((rk, k) => `<img src="${coin(rk)}" alt="" style="width:${f1(RIVAL * scale)}px;height:${f1(RIVAL * scale)}px;border-radius:50%;display:block;margin-left:${k ? f1((RIVAL_STEP - RIVAL) * scale) : 0}px"/>`).join('')}${extra > 0 ? `<span style="margin-left:5px;font-size:13px;font-weight:700;color:${sc.num}">+${extra}</span>` : ''}</div>`;
      }
    }
    if (my != null && !o.noMarker) {
      const p = markerXY(GEOM.floors[my - 1]);
      const mx = p.x * scale - MARKER / 2;
      const myy = p.y * scale - MARKER / 2;
      const img = coin && o.myRank != null ? `<img src="${coin(o.myRank)}" alt="" style="width:${MARKER - 6}px;height:${MARKER - 6}px;border-radius:50%;display:block"/>` : '';
      layer += `<div data-spire-marker style="position:absolute;left:${f1(mx)}px;top:${f1(myy)}px;width:${MARKER}px;height:${MARKER}px;display:flex;align-items:center;justify-content:center">`
        + `<div style="position:absolute;width:${MARKER + 24}px;height:${MARKER + 24}px;border-radius:50%;background:${sc.light ? sc.tone : '#FFFFFF'};opacity:0.12"></div>`
        + `<div style="position:relative;width:${MARKER}px;height:${MARKER}px;border-radius:50%;background:${sc.light ? sc.numMine : '#F2F1F6'};display:flex;align-items:center;justify-content:center">`
        + `<div style="width:${MARKER - 4}px;height:${MARKER - 4}px;border-radius:50%;background:#0C0C0D;display:flex;align-items:center;justify-content:center">${img}</div></div></div>`;
    }
    const tower = svg(Object.assign({}, o, { width: o.width }));
    return `<div class="spire-window" style="border-radius:22px;box-shadow:${sc.plateShadow}"><div data-st-scroll="${f1(y)}" style="position:relative;height:${o.height}px;border-radius:22px;overflow-y:auto;overflow-x:hidden;background:${sc.plate};scrollbar-width:none">`
      + `<div style="position:relative;width:${o.width}px;height:${f1(GEOM.height * scale)}px;margin-top:${f1(TOWER_PAD * scale)}px">${tower}${layer}</div></div></div>`;
  }

  /** Тур первого входа (SpireTour.TourTower): Оникс без лиги, ни один этаж не горит, ширина 240, сдвиг −32, окно 240×340 — видна верхушка. */
  function tourHtml(o) {
    o = o || {};
    return `<div style="height:340px;width:240px;overflow:hidden;margin:0 auto;pointer-events:none"><div style="margin-top:-32px;width:240px">${svg({ tier: null, myFloor: null, selected: 0, width: 240, theme: o.theme, scene: o.scene })}</div></div>`;
  }

  /**
   * Мини-башня карточки «Итог недели» (SpireWeekResultCard): верхушка лиги НОВОЙ недели 58×103; повышение — окна горят (вершина недели),
   * иначе тёмные; монета ранга 26 справа снизу на кольце 3 цвета карточки. o: { tier, promoted, myRank, coin, card }
   */
  function weekTowerHtml(o) {
    o = o || {};
    const coin = typeof o.coin === 'function' && o.myRank != null
      ? `<span style="position:absolute;right:-9px;bottom:-5px;padding:3px;border-radius:50%;background:${o.card || '#1C1C1E'};display:block"><img src="${o.coin(o.myRank)}" alt="" style="width:26px;height:26px;border-radius:50%;display:block"/></span>`
      : '';
    return `<span style="position:relative;width:58px;height:103px;flex:none;display:flex;justify-content:center">${svg({ tier: o.tier, myFloor: o.promoted ? FLOORS : 1, selected: 0, width: Math.round(103 * WEEK_TOP_W / (WEEK_TOP_H + WEEK_TOP_PAD) * 10) / 10, variant: 'weekTop', theme: o.theme })}${coin}</span>`; // зачем: место 58×103 как в коде — ореол не режем, башню уменьшаем по высоте, а не обрезаем
  }

  /** Выставить прокрутку всем окнам башни внутри root (вставленным строкой). */
  function applyScroll(rootEl) {
    (rootEl || document).querySelectorAll('[data-st-scroll]').forEach((el) => { el.scrollTop = Number(el.getAttribute('data-st-scroll')) || 0; });
  }

  function renderTower(el, o) {
    if (!el) { console.warn('[SPIRE-RENDER] renderTower: нет элемента'); return; }
    el.innerHTML = windowHtml(o);
    applyScroll(el);
  }

  // окна, вставленные строкой (макеты собирают страницу через innerHTML), получают прокрутку сами
  if (typeof document !== 'undefined') {
    const run = () => applyScroll(document);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else setTimeout(run, 0);
    if (typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) applyScroll(n.matches && n.matches('[data-st-scroll]') ? n.parentNode : n); });
      const start = () => mo.observe(document.body, { childList: true, subtree: true });
      if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    }
  }

  const API = Object.freeze({ svg, windowHtml, tourHtml, weekTowerHtml, renderTower, applyScroll, scrollYFor, skinFor, scene: (theme) => sceneFor({ theme }), SKINS, LEAGUES: LEAGUE_SPECS, DEFAULT_SKIN, GEOM, TW, CX, FLOORS, isGuard, markerXY, mixHex });
  root.SpireTowerRender = API;
  root.renderTower = renderTower;
}(typeof window !== 'undefined' ? window : globalThis));
