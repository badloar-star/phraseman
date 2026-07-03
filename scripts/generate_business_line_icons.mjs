// Генерация плоских line-иконок (стиль системных иконок: тонкий штрих 1.6,
// скруглённые концы, сетка 24×24) для тем «Бизнес» (business, графит и шампань)
// и «Бизнес светлый» (businessLight, слоновая кость и шампань).
//
// Перезаписывает даллишные webp/avif-ассеты темы business и создаёт зеркальный
// набор для businessLight. Запуск:  node scripts/generate_business_line_icons.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const A = (p) => path.join(ROOT, 'assets', 'images', p);

// Инстаграм-язык: монохромные тонкие иконки. Тёмная тема — белый штрих на
// прозрачном/чёрном, светлая — чернильный #262626 на прозрачном/белом.
// Никаких цветных акцентов в ассетах — цвет остаётся только у UI (синий CTA).
const VARIANTS = {
  business: {
    primary: '#F5F5F5',
    secondary: '#737373',
    tint: 'rgba(255,255,255,0.06)',
    cardBg: '#0A0A0A',
    cardBorder: 'rgba(255,255,255,0.15)',
    bannerBg: '#050505',
    ringFaint: 'rgba(255,255,255,0.08)',
  },
  businessLight: {
    primary: '#262626',
    secondary: '#8E8E8E',
    tint: 'rgba(0,0,0,0.04)',
    cardBg: '#FFFFFF',
    cardBorder: '#DBDBDB',
    bannerBg: '#FAFAFA',
    ringFaint: 'rgba(0,0,0,0.05)',
  },
};

// ── примитивы ────────────────────────────────────────────────────────────────
const star = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.44;
    pts.push(`${(cx + rad * Math.cos(ang)).toFixed(2)} ${(cy + rad * Math.sin(ang)).toFixed(2)}`);
  }
  return `<path d="M${pts.join('L')}z"/>`;
};
const person = (cx, cy, s = 1) =>
  `<circle cx="${cx}" cy="${cy}" r="${2.6 * s}"/><path d="M${cx - 4.3 * s} ${cy + 9.2 * s}a${4.3 * s} ${4.3 * s} 0 018.6 0"/>`;
const FLAME =
  'M12 3.75s4.75 3.6 4.75 8.15a4.75 4.75 0 11-9.5 0c0-1.9.85-3.55 2-4.95.3 1.15.95 2.1 1.8 2.6-.25-2 .2-4.1.95-5.8z';
const SHIELD = 'M12 3.5l7 2.5v5.4c0 4.6-3 7.6-7 9.1-4-1.5-7-4.5-7-9.1V6z';
const swordsPair = `
  <path d="M14.5 17.5L3.5 6.5v-3h3l11 11"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>
  <path d="M14.5 6.5l3.5-3.5h3v3L17.5 9.5"/><path d="M5 14l4 4"/><path d="M7.25 17.25L4 20.5"/><path d="M3 19l2 2"/>`;
const crystal = (cx, cy, s) =>
  `<path d="M${cx} ${cy - 8.5 * s}l${3.4 * s} ${6 * s}-${3.4 * s} ${11 * s}-${3.4 * s}-${11 * s}z"/>` +
  `<path d="M${cx - 3.4 * s} ${cy - 2.5 * s}h${6.8 * s}"/>` +
  `<path d="M${cx} ${cy - 8.5 * s}l-${1.1 * s} ${6 * s} ${1.1 * s} ${11 * s}"/>`;
const sparkle = (cx, cy, s) => `<path d="M${cx} ${cy - s}v${2 * s}M${cx - s} ${cy}h${2 * s}"/>`;
const bubble = `M19.5 13.75a2 2 0 01-2 2H8.25L4.5 19V6.5a2 2 0 012-2h11a2 2 0 012 2v7.25z`;

// ── мотивы (P = основной штрих, S = вторичный, T = заливка-тинт) ─────────────
// Каждый мотив — функция от цветов, возвращает содержимое группы в сетке 24×24.
const M = {
  swords: (c) => `<g stroke="${c.primary}">${swordsPair}</g>`,
  crown: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 17.5L3 7.75l5 3.75L12 5l4 6.5 5-3.75-.5 9.75z"/><path d="M4.5 20.5h15"/></g>`,
  trophy: (c) =>
    `<g stroke="${c.primary}"><path d="M7.75 4.5h8.5v5.25a4.25 4.25 0 01-8.5 0V4.5z"/><path d="M7.75 6.5H5.5v.5a3.25 3.25 0 002.75 3.2"/><path d="M16.25 6.5h2.25v.5a3.25 3.25 0 01-2.75 3.2"/><path d="M12 14v3.5"/><path d="M8.75 20.5h6.5"/></g>`,
  ticket: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 9.75V8.5a2 2 0 012-2h13a2 2 0 012 2v1.25a2.25 2.25 0 000 4.5v1.25a2 2 0 01-2 2h-13a2 2 0 01-2-2v-1.25a2.25 2.25 0 000-4.5z"/></g><g stroke="${c.secondary}" stroke-dasharray="1.8 2.2"><path d="M15.25 7.5v9"/></g><g fill="${c.primary}" stroke="none">${star(9.25, 12, 2.4)}</g>`,
  bolt: (c) => `<g stroke="${c.primary}"><path d="M13.25 3.5L6.5 13.25h4.25L10.25 20.5 17.5 10.25h-4.5l.25-6.75z"/></g>`,
  clipboardCheck: (c) =>
    `<g stroke="${c.secondary}"><rect x="5" y="4.5" width="14" height="16" rx="2"/><rect x="9" y="2.75" width="6" height="3.5" rx="1"/></g><g stroke="${c.primary}"><path d="M8.75 13l2.25 2.25 4.25-4.5"/></g>`,
  chest: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 10.25V9a4.75 4.75 0 014.75-4.75h7.5A4.75 4.75 0 0120.5 9v1.25"/><rect x="3.5" y="10.25" width="17" height="9.25" rx="1.5"/><rect x="10.6" y="9" width="2.8" height="4.25" rx="0.9"/></g><g stroke="${c.secondary}"><path d="M7.4 4.6v14.9M16.6 4.6v14.9"/></g>`,
  shieldStars: (n) => (c) => {
    const xs = n === 1 ? [12] : n === 2 ? [9.4, 14.6] : [7.6, 12, 16.4];
    return `<g stroke="${c.primary}"><path d="${SHIELD}"/></g><g fill="${c.primary}" stroke="none">${xs
      .map((x) => star(x, n === 3 && x === 12 ? 10.4 : 11.4, 1.8))
      .join('')}</g>`;
  },
  medalCheck: (c) =>
    `<g stroke="${c.secondary}"><path d="M9.75 10.75L6.75 3.75h3.5L12 8l1.75-4.25h3.5l-3 7"/></g><g stroke="${c.primary}"><circle cx="12" cy="14.75" r="4.9"/><path d="M10 14.9l1.5 1.5 2.6-2.9"/></g>`,
  stethoscope: (c) =>
    `<g stroke="${c.primary}"><path d="M4.75 3.5H4a1 1 0 00-1 1v3.75a5.5 5.5 0 0011 0V4.5a1 1 0 00-1-1h-.75"/><path d="M8.5 13.7v1.55A5.25 5.25 0 0013.75 20.5h.25a5 5 0 005-5v-.6"/></g><g stroke="${c.secondary}"><circle cx="19" cy="12.4" r="2.2"/></g>`,
  heartPulse: (c) =>
    `<g stroke="${c.primary}"><path d="M12 20s-7.5-4.6-7.5-10A4.35 4.35 0 0112 6.4 4.35 4.35 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/></g><g stroke="${c.secondary}"><path d="M8.25 12.4h1.9l1.2-2 1.7 3.6 1.2-2h1.9"/></g>`,
  house: (c) =>
    `<g stroke="${c.primary}"><path d="M4.5 11.5L12 4.5l7.5 7V19a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 19v-7.5z"/></g><g stroke="${c.secondary}"><path d="M10 20.5v-4.75h4v4.75"/></g>`,
  pan: (c) =>
    `<g stroke="${c.primary}"><circle cx="9.75" cy="14" r="6"/><path d="M15.4 12.1l5.1-1.85"/></g><g stroke="${c.secondary}"><path d="M7.5 4.5c-.6 1 .6 1.5 0 2.5M11 3.5c-.6 1 .6 1.5 0 2.5"/></g>`,
  cartCoin: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 4.75h2l2.4 10.5h9.6l1.9-7H7"/><circle cx="9" cy="19.25" r="1.4"/><circle cx="16.25" cy="19.25" r="1.4"/></g><g stroke="${c.secondary}"><circle cx="18.75" cy="5.25" r="2.4"/><path d="M17.85 5.25h1.8"/></g>`,
  shoppingBag: (c) =>
    `<g stroke="${c.primary}"><path d="M5.9 8.5h12.2l-.85 10.6a1.6 1.6 0 01-1.6 1.4H8.35a1.6 1.6 0 01-1.6-1.4z"/></g><g stroke="${c.secondary}"><path d="M9.4 10.75v-4a2.6 2.6 0 015.2 0v4"/></g>`,
  shards: (n) => (c) => {
    if (n === 1) return `<g stroke="${c.primary}">${crystal(12, 12, 1)}</g>`;
    if (n === 1.5)
      return `<g stroke="${c.primary}">${crystal(11.4, 12.4, 1)}</g><g stroke="${c.secondary}">${sparkle(19, 6.4, 1.9)}</g>`;
    if (n === 2)
      return `<g stroke="${c.secondary}">${crystal(7.4, 13.4, 0.72)}</g><g stroke="${c.primary}">${crystal(14.4, 12, 1)}</g>`;
    return `<g stroke="${c.secondary}">${crystal(6.4, 13.9, 0.65)}${crystal(18, 13.9, 0.62)}</g><g stroke="${c.primary}">${crystal(12.2, 12, 1)}</g>`;
  },
  chat: (c) =>
    `<g stroke="${c.primary}"><path d="${bubble}"/></g><g stroke="${c.secondary}"><path d="M8.5 8.9h7M8.5 11.9h4.6"/></g>`,
  friends: (c) => `<g stroke="${c.primary}">${person(9, 8.6)}</g><g stroke="${c.secondary}"><path d="M15.9 6.1a3.1 3.1 0 010 5.5"/><path d="M17.3 14.5a5.1 5.1 0 013 4.6"/></g>`,
  flame: (level) => (c) => {
    const top = 4.2, bottom = 16.4, h = bottom - top;
    const y = bottom - h * level;
    return (
      `<clipPath id="fc"><path d="${FLAME}"/></clipPath>` +
      `<rect x="5" y="${y.toFixed(2)}" width="14" height="${(h * level + 4.5).toFixed(2)}" fill="${c.primary}" opacity="0.38" clip-path="url(#fc)" stroke="none"/>` +
      `<g stroke="${c.primary}"><path d="${FLAME}"/></g>`
    );
  },
  snowflake: (c) =>
    `<g stroke="${c.primary}"><path d="M12 3.5v17M4.65 7.75l14.7 8.5M4.65 16.25l14.7-8.5"/></g><g stroke="${c.secondary}"><path d="M10.2 4.4l1.8 1.8 1.8-1.8M10.2 19.6l1.8-1.8 1.8 1.8M3.9 10.1l2.45-.65.65-2.45M17 16.55l2.45-.65.65-2.45M3.9 13.9l2.45.65.65 2.45M17 7.45l2.45.65.65 2.45"/></g>`,
  compass: (c) =>
    `<g stroke="${c.primary}"><circle cx="12" cy="12" r="8.4"/></g><g stroke="${c.primary}" fill="${c.tint}"><path d="M15.6 8.4l-2.3 5.2-5.2 2.3 2.3-5.2z"/></g><g stroke="${c.secondary}"><path d="M12 3.6v1.6M12 18.8v1.6M3.6 12h1.6M18.8 12h1.6"/></g>`,
  cards: (c) =>
    `<g stroke="${c.secondary}"><rect x="8.75" y="3.9" width="12" height="15.4" rx="1.9" transform="rotate(8 14.75 11.6)"/></g><g stroke="${c.primary}"><rect x="3.9" y="4.4" width="11.6" height="15.4" rx="1.9"/><path d="M6.9 9h5.6M6.9 12h3.8"/></g>`,
  checklist: (c) =>
    `<g stroke="${c.secondary}"><rect x="4.5" y="3.5" width="15" height="17" rx="2"/></g><g stroke="${c.primary}"><path d="M7.5 8.6l1.3 1.3 2.1-2.4M13.6 9h3.4"/><path d="M7.5 13.3l1.3 1.3 2.1-2.4M13.6 13.7h3.4"/><circle cx="8.65" cy="17.7" r="1.05"/><path d="M13.6 18.1h3.4"/></g>`,
  gauge: (c) =>
    `<g stroke="${c.primary}"><path d="M4.4 16.4a7.6 7.6 0 0115.2 0"/><path d="M12 16.4l3.7-4.4"/><circle cx="12" cy="16.4" r="1.15"/></g><g stroke="${c.secondary}"><path d="M4.4 16.4H3M21 16.4h-1.4M12 8.8V7.3"/></g>`,
  dialogs: (c) =>
    `<g stroke="${c.primary}"><path d="M13.75 4.5h-8a2 2 0 00-2 2v4.5a2 2 0 002 2h.5l2.75 2.5v-2.5h4.75a2 2 0 002-2V6.5a2 2 0 00-2-2z"/></g><g stroke="${c.secondary}"><path d="M18.4 9.4a2 2 0 011.85 2v3.75a2 2 0 01-2 2h-.4v2.35l-2.6-2.35h-3.5"/></g>`,
  gradCap: (c) =>
    `<g stroke="${c.primary}"><path d="M12 4.75L2.75 9 12 13.25 21.25 9z"/><path d="M21.25 9v4.25"/></g><g stroke="${c.secondary}"><path d="M6.75 11.4v4.35c0 1.6 2.35 2.9 5.25 2.9s5.25-1.3 5.25-2.9V11.4"/></g>`,
  mapPin: (c) =>
    `<g stroke="${c.secondary}" stroke-dasharray="2.4 2.6"><path d="M4.5 19.5c3.4-1 3.1-4.9 6-6.4 2.6-1.35 4.6-.6 6-3"/></g><g stroke="${c.primary}"><circle cx="18" cy="7.25" r="2.6"/><circle cx="18" cy="7.25" r="0.4"/><circle cx="4.5" cy="19.5" r="1.2"/></g>`,
  podium: (c) =>
    `<g stroke="${c.primary}"><path d="M9.6 20.5V10.9h4.8v9.6"/><path d="M3.5 20.5v-6.2h6.1M20.5 20.5v-4.4h-6.1"/><path d="M3 20.5h18"/></g><g fill="${c.primary}" stroke="none">${star(12, 5.6, 2.4)}</g>`,
  book: (c) =>
    `<g stroke="${c.primary}"><path d="M12 6.4c-1.5-1.5-3.5-2-6.9-2v13.2c3.4 0 5.4.5 6.9 2 1.5-1.5 3.5-2 6.9-2V4.4c-3.4 0-5.4.5-6.9 2z"/><path d="M12 6.4v13.2"/></g><g stroke="${c.secondary}"><path d="M7.6 8.6h2.5M7.6 11.4h2.5"/></g>`,
  dumbbell: (c) =>
    `<g stroke="${c.primary}"><path d="M7.1 8.4v7.2M4.4 10v4M16.9 8.4v7.2M19.6 10v4"/></g><g stroke="${c.secondary}"><path d="M7.1 12h9.8"/></g>`,
  shieldQuestion: (c) =>
    `<g stroke="${c.primary}"><path d="${SHIELD}"/></g><g stroke="${c.secondary}"><path d="M10.15 9.9A1.95 1.95 0 0112 8.55c1.1 0 1.95.7 1.95 1.65 0 1.15-1.2 1.4-1.95 2.25v.65"/><circle cx="12" cy="15.6" r="0.35"/></g>`,
  choice: (c) =>
    `<g stroke="${c.primary}"><path d="M12 20.5v-6.6c0-3.2-3.1-3.6-5.1-5.7M12 13.9c0-3.2 3.1-3.6 5.1-5.7"/></g><g stroke="${c.secondary}"><path d="M6.9 11.05v-2.85h2.85M17.1 11.05v-2.85h-2.85"/></g>`,
  headphones: (c) =>
    `<g stroke="${c.primary}"><path d="M4.5 14.5v-2.4a7.5 7.5 0 0115 0v2.4"/></g><g stroke="${c.secondary}"><rect x="4.5" y="13.9" width="3.3" height="5.9" rx="1.5"/><rect x="16.2" y="13.9" width="3.3" height="5.9" rx="1.5"/></g>`,
  recall: (c) =>
    `<g stroke="${c.primary}"><path d="M19.4 12a7.4 7.4 0 11-2.15-5.2"/><path d="M19.65 3.6v3.5h-3.5"/></g><g stroke="${c.secondary}"><path d="M12 8.6V12l2.4 1.5"/></g>`,
  blocks: (c) =>
    `<g stroke="${c.secondary}"><rect x="4" y="14" width="6.1" height="6.1" rx="1"/><rect x="13.9" y="14" width="6.1" height="6.1" rx="1"/></g><g stroke="${c.primary}"><rect x="8.95" y="6.6" width="6.1" height="6.1" rx="1"/></g>`,
  mic: (c) =>
    `<g stroke="${c.primary}"><rect x="9.25" y="3.5" width="5.5" height="10" rx="2.75"/></g><g stroke="${c.secondary}"><path d="M5.75 11.5a6.25 6.25 0 0012.5 0"/><path d="M12 17.75v2.75"/></g>`,
  stopwatch: (c) =>
    `<g stroke="${c.primary}"><circle cx="12" cy="13.6" r="6.9"/><path d="M12 10.4v3.2l2.5 1.6"/></g><g stroke="${c.secondary}"><path d="M12 6.7V4.2M10 3.5h4M18 8l1.5-1.5"/></g>`,
  echo: (c) =>
    `<g stroke="${c.primary}"><circle cx="4.9" cy="12" r="1.1"/><path d="M8.4 9a4.4 4.4 0 010 6"/></g><g stroke="${c.secondary}"><path d="M11.7 6.6a8.1 8.1 0 010 10.8M15 4.2a11.6 11.6 0 010 15.6"/></g>`,
  anchor: (c) =>
    `<g stroke="${c.primary}"><circle cx="12" cy="5.4" r="2"/><path d="M12 7.4v13.1"/><path d="M5 13a7 7 0 0014 0"/></g><g stroke="${c.secondary}"><path d="M5 13H7.4M16.6 13H19M8.6 9.6h6.8"/></g>`,
  pulse: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 12.4h3.9l2-4.6 3 9.2 2.3-4.6h5.8"/></g><g stroke="${c.secondary}"><circle cx="20.5" cy="12.4" r="0.4"/></g>`,
  meetup: (c) =>
    `<g stroke="${c.primary}">${person(12, 8.2, 0.95)}</g><g stroke="${c.secondary}"><path d="M6.6 6.9a2.6 2.6 0 100 4.9M17.4 6.9a2.6 2.6 0 110 4.9"/><path d="M3.4 19.6a4.4 4.4 0 013.7-4M20.6 19.6a4.4 4.4 0 00-3.7-4"/></g>`,
  suitcase: (c) =>
    `<g stroke="${c.primary}"><rect x="4" y="7.9" width="16" height="11.7" rx="2"/><path d="M9.4 7.9V6.2a1.8 1.8 0 011.8-1.8h1.6a1.8 1.8 0 011.8 1.8v1.7"/></g><g stroke="${c.secondary}"><path d="M8.4 7.9v11.7M15.6 7.9v11.7"/></g>`,
  barChart: (c) =>
    `<g stroke="${c.secondary}"><rect x="4.4" y="12.9" width="3.6" height="7.1" rx="0.8"/><rect x="16" y="9.4" width="3.6" height="10.6" rx="0.8"/></g><g stroke="${c.primary}"><rect x="10.2" y="4.5" width="3.6" height="15.5" rx="0.8"/></g>`,
  phrases: (c) =>
    `<g stroke="${c.primary}"><path d="${bubble}"/></g><g stroke="${c.secondary}"><path d="M9.6 8.6l-1.25 4.1M13.4 8.6l-1.25 4.1"/></g>`,
  words: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 6a2.5 2.5 0 012.5-2.5h6.1a2 2 0 011.4.6l6.9 6.9a2 2 0 010 2.83l-6.07 6.07a2 2 0 01-2.83 0L4.1 13a2 2 0 01-.6-1.4V6z"/></g><g stroke="${c.secondary}"><circle cx="8.3" cy="8.3" r="1.45"/></g>`,
  comeback: (c) =>
    `<g stroke="${c.primary}"><path d="M17.5 20v-7.4a5.5 5.5 0 00-11 0v3.7"/></g><g stroke="${c.secondary}"><path d="M3.6 13.4l2.9 2.9 2.9-2.9"/></g>`,
  doubleXp: (c) =>
    `<g fill="${c.primary}" stroke="none">${star(9.4, 13.4, 4.9)}</g><g stroke="${c.secondary}" fill="none">${star(17.1, 6.9, 2.9)}</g>`,
  earlyBird: (c) =>
    `<g stroke="${c.primary}"><path d="M3.5 17.5h17"/><path d="M7.4 17.5a4.6 4.6 0 019.2 0"/></g><g stroke="${c.secondary}"><path d="M12 9.1V6.6M6.1 11.6L4.35 9.85M17.9 11.6l1.75-1.75"/></g>`,
  energyWindow: (c) =>
    `<g stroke="${c.secondary}"><circle cx="12" cy="12" r="8.4"/></g><g stroke="${c.primary}"><path d="M13 6.9l-3.6 5.4h2.7l-1.1 4.8 3.6-5.4h-2.7z"/></g>`,
  giftQuestion: (c) =>
    `<g stroke="${c.primary}"><rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.5"/><rect x="3.8" y="6.9" width="16.4" height="3.5" rx="1"/></g><g stroke="${c.secondary}"><path d="M12 6.9C11 4.4 7.6 3.9 7.6 6.1S10.5 6.9 12 6.9zm0 0c1-2.5 4.4-3 4.4-.8S13.5 6.9 12 6.9z"/><path d="M10.6 13.9A1.6 1.6 0 0112 12.85c.9 0 1.6.55 1.6 1.35 0 .95-.9 1.15-1.6 1.85v.45"/><circle cx="12" cy="18.15" r="0.32"/></g>`,
  calendarCheck: (c) =>
    `<g stroke="${c.secondary}"><rect x="3.75" y="5" width="16.5" height="15" rx="2.25"/><path d="M3.75 9.6h16.5M8.25 3v3.4M15.75 3v3.4"/></g><g stroke="${c.primary}"><path d="M8.9 14.6l2.1 2.1 4.1-4.6"/></g>`,
  shieldFlame: (c) =>
    `<g stroke="${c.primary}"><path d="${SHIELD}"/></g><g stroke="${c.secondary}" transform="translate(5.5 5.1) scale(0.55)"><path d="${FLAME}"/></g>`,
  turboRegen: (c) =>
    `<g stroke="${c.secondary}"><path d="M18.9 8.1A7.7 7.7 0 005.6 9.4M5.1 15.9a7.7 7.7 0 0013.3-1.3"/><path d="M18.75 4.4v3.7h-3.7M5.25 19.6v-3.7h3.7"/></g><g stroke="${c.primary}"><path d="M13 7.9l-3.4 5h2.55l-1.05 4.2 3.4-5H11.9z"/></g>`,
};

// ── композиции ───────────────────────────────────────────────────────────────
const GLYPH_STROKE = 1.5;
const glyphSvg = (motif, c, pad = 2.4) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${24 + 2 * pad} ${24 + 2 * pad}">` +
  `<g fill="none" stroke-width="${GLYPH_STROKE}" stroke-linecap="round" stroke-linejoin="round">${motif(c)}</g></svg>`;

const cardSvg = (motif, c, W, H) => {
  const mx = W * 0.775, s = H * 0.66;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" rx="26" fill="${c.cardBg}"/>` +
    `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="24.5" fill="none" stroke="${c.cardBorder}" stroke-width="3"/>` +
    `<circle cx="${mx}" cy="${H / 2}" r="${H * 0.58}" fill="${c.tint}"/>` +
    `<svg x="${mx - s / 2}" y="${(H - s) / 2}" width="${s}" height="${s}" viewBox="-2.4 -2.4 28.8 28.8">` +
    `<g fill="none" stroke-width="${GLYPH_STROKE}" stroke-linecap="round" stroke-linejoin="round">${motif(c)}</g></svg></svg>`
  );
};

const bannerSvg = (motif, c, W, H) => {
  const s = H * 0.5;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${c.bannerBg}"/>` +
    `<circle cx="${W / 2}" cy="${H / 2}" r="${H * 0.42}" fill="${c.tint}"/>` +
    `<circle cx="${W / 2}" cy="${H / 2}" r="${H * 0.42}" fill="none" stroke="${c.ringFaint}" stroke-width="3"/>` +
    `<circle cx="${W / 2}" cy="${H / 2}" r="${H * 0.36}" fill="none" stroke="${c.cardBorder}" stroke-width="2.5"/>` +
    `<svg x="${(W - s) / 2}" y="${(H - s) / 2}" width="${s}" height="${s}" viewBox="-2.4 -2.4 28.8 28.8">` +
    `<g fill="none" stroke-width="${GLYPH_STROKE}" stroke-linecap="round" stroke-linejoin="round">${motif(c)}</g></svg></svg>`
  );
};

// ── карта ассетов ────────────────────────────────────────────────────────────
// out: путь с плейсхолдером {v} (имя темы). kind: glyph | card | banner.
const fireLevels = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
const JOBS = [
  { out: 'arena/knowledge-arena-{v}.webp', w: 1536, h: 864, kind: 'banner', m: M.swords },
  { out: 'arena_actions/arena-action-match-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.swords },
  { out: 'arena_actions/arena-action-friend-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.friends },
  { out: 'arena_actions/arena-action-throne-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.crown },
  { out: 'arena_actions/arena-action-season-reward-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.trophy },
  { out: 'arena_tickets/ticket-{v}.webp', w: 396, h: 288, kind: 'glyph', m: M.ticket },
  { out: 'energy/energy-{v}.webp', w: 512, h: 512, kind: 'glyph', m: M.bolt },
  { out: 'generated_theme_icons/lesson-exam-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.clipboardCheck },
  { out: 'league_bonus/{v}-chest.webp', w: 512, h: 512, kind: 'glyph', m: M.chest },
  { out: 'quizzes/level_cards/quiz-card-easy-{v}.webp', w: 640, h: 236, kind: 'card', m: M.shieldStars(1) },
  { out: 'quizzes/level_cards/quiz-card-medium-{v}.webp', w: 640, h: 236, kind: 'card', m: M.shieldStars(2) },
  { out: 'quizzes/level_cards/quiz-card-hard-{v}.webp', w: 640, h: 236, kind: 'card', m: M.shieldStars(3) },
  { out: 'quizzes/level_logos/quiz-logo-easy-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.shieldStars(1) },
  { out: 'quizzes/level_logos/quiz-logo-medium-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.shieldStars(2) },
  { out: 'quizzes/level_logos/quiz-logo-hard-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.shieldStars(3) },
  { out: 'quizzes/medals/quiz-completion-medal-{v}-cutout.webp', w: 512, h: 512, kind: 'glyph', m: M.medalCheck },
  { out: 'quizzes/theme_cards/quiz-theme-at-the-doctor-{v}.webp', w: 640, h: 236, kind: 'card', m: M.stethoscope },
  { out: 'quizzes/theme_cards/quiz-theme-body-and-health-{v}.webp', w: 640, h: 236, kind: 'card', m: M.heartPulse },
  { out: 'quizzes/theme_cards/quiz-theme-home-and-rooms-{v}.webp', w: 640, h: 236, kind: 'card', m: M.house },
  { out: 'quizzes/theme_cards/quiz-theme-kitchen-and-cooking-{v}.webp', w: 640, h: 236, kind: 'card', m: M.pan },
  { out: 'quizzes/theme_cards/quiz-theme-shopping-and-money-{v}.webp', w: 640, h: 236, kind: 'card', m: M.cartCoin },
  { out: 'quizzes/theme_logos/quiz-theme-at-the-doctor-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.stethoscope },
  { out: 'quizzes/theme_logos/quiz-theme-body-and-health-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.heartPulse },
  { out: 'quizzes/theme_logos/quiz-theme-home-and-rooms-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.house },
  { out: 'quizzes/theme_logos/quiz-theme-kitchen-and-cooking-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.pan },
  { out: 'quizzes/theme_logos/quiz-theme-shopping-and-money-{v}.webp', w: 260, h: 260, kind: 'glyph', m: M.cartCoin },
  { out: 'shards/{v}-single.webp', w: 256, h: 256, kind: 'glyph', m: M.shards(1) },
  { out: 'shards/{v}-80.webp', w: 256, h: 256, kind: 'glyph', m: M.shards(1.5) },
  { out: 'shards/{v}-180.webp', w: 256, h: 256, kind: 'glyph', m: M.shards(2) },
  { out: 'shards/{v}-420.webp', w: 256, h: 256, kind: 'glyph', m: M.shards(3) },
  { out: 'social_icons/social-chat-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.chat },
  { out: 'social_icons/social-friends-{v}.webp', w: 160, h: 160, kind: 'glyph', m: M.friends },
  ...fireLevels.map((lvl) => ({
    out: `streak_icons/{v}/streak-fire-{v}-${String(lvl).padStart(3, '0')}.webp`,
    w: 80, h: 80, kind: 'glyph', m: M.flame(lvl / 100),
  })),
  { out: 'streak_icons/{v}/streak-freeze-{v}.webp', w: 80, h: 80, kind: 'glyph', m: M.snowflake },
  { out: 'weekly_compass_icons/{v}.webp', w: 512, h: 512, kind: 'glyph', m: M.compass },
  // home_menu — 12 плиток меню (AVIF).
  { out: 'home_menu/{v}/home-{v}-arena-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.swords },
  { out: 'home_menu/{v}/home-{v}-cards-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.cards },
  { out: 'home_menu/{v}/home-{v}-daily-tasks-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.checklist },
  { out: 'home_menu/{v}/home-{v}-diagnostic-test-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.gauge },
  { out: 'home_menu/{v}/home-{v}-dialogs-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.dialogs },
  { out: 'home_menu/{v}/home-{v}-exam-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.gradCap },
  { out: 'home_menu/{v}/home-{v}-hero-map-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.mapPin },
  { out: 'home_menu/{v}/home-{v}-league-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.podium },
  { out: 'home_menu/{v}/home-{v}-lessons-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.book },
  { out: 'home_menu/{v}/home-{v}-practice-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.dumbbell },
  { out: 'home_menu/{v}/home-{v}-quizzes-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.shieldQuestion },
  { out: 'home_menu/{v}/home-{v}-shop-lite.avif', w: 192, h: 192, kind: 'glyph', m: M.shoppingBag },
  // Личный план — типы заданий и маршруты.
  { out: 'personal_plan_tasks_fit/{v}/choice.webp', w: 512, h: 512, kind: 'glyph', m: M.choice },
  { out: 'personal_plan_tasks_fit/{v}/core_lesson.webp', w: 512, h: 512, kind: 'glyph', m: M.book },
  { out: 'personal_plan_tasks_fit/{v}/flashcards.webp', w: 512, h: 512, kind: 'glyph', m: M.cards },
  { out: 'personal_plan_tasks_fit/{v}/listening.webp', w: 512, h: 512, kind: 'glyph', m: M.headphones },
  { out: 'personal_plan_tasks_fit/{v}/practice.webp', w: 512, h: 512, kind: 'glyph', m: M.dumbbell },
  { out: 'personal_plan_tasks_fit/{v}/quiz.webp', w: 512, h: 512, kind: 'glyph', m: M.shieldQuestion },
  { out: 'personal_plan_tasks_fit/{v}/recall.webp', w: 512, h: 512, kind: 'glyph', m: M.recall },
  { out: 'personal_plan_tasks_fit/{v}/sentence_build.webp', w: 512, h: 512, kind: 'glyph', m: M.blocks },
  { out: 'personal_plan_tasks_fit/{v}/speaking.webp', w: 512, h: 512, kind: 'glyph', m: M.mic },
  { out: 'personal_plan_tasks_fit/{v}/trainer.webp', w: 512, h: 512, kind: 'glyph', m: M.stopwatch },
  { out: 'personal_plan_tasks_fit/{v}/route_echo.webp', w: 512, h: 512, kind: 'glyph', m: M.echo },
  { out: 'personal_plan_tasks_fit/{v}/route_gavan.webp', w: 512, h: 512, kind: 'glyph', m: M.anchor },
  { out: 'personal_plan_tasks_fit/{v}/route_impuls.webp', w: 512, h: 512, kind: 'glyph', m: M.pulse },
  { out: 'personal_plan_tasks_fit/{v}/route_mitap.webp', w: 512, h: 512, kind: 'glyph', m: M.meetup },
  { out: 'personal_plan_tasks_fit/{v}/route_voyazh.webp', w: 512, h: 512, kind: 'glyph', m: M.suitcase },
  // Моя практика — темы тренажёров.
  { out: 'trainer_theme_icons/{v}/analytics.webp', w: 256, h: 256, kind: 'glyph', m: M.barChart },
  { out: 'trainer_theme_icons/{v}/phrases.webp', w: 256, h: 256, kind: 'glyph', m: M.phrases },
  { out: 'trainer_theme_icons/{v}/words.webp', w: 256, h: 256, kind: 'glyph', m: M.words },
  // Недельные буны.
  { out: 'weekly_boon_icons/png/{v}/arena_saturday.webp', w: 256, h: 256, kind: 'glyph', m: M.swords },
  { out: 'weekly_boon_icons/png/{v}/comeback.webp', w: 256, h: 256, kind: 'glyph', m: M.comeback },
  { out: 'weekly_boon_icons/png/{v}/double_xp.webp', w: 256, h: 256, kind: 'glyph', m: M.doubleXp },
  { out: 'weekly_boon_icons/png/{v}/early_bird.webp', w: 256, h: 256, kind: 'glyph', m: M.earlyBird },
  { out: 'weekly_boon_icons/png/{v}/energy_free_window.webp', w: 256, h: 256, kind: 'glyph', m: M.energyWindow },
  { out: 'weekly_boon_icons/png/{v}/flashcard_friday.webp', w: 256, h: 256, kind: 'glyph', m: M.cards },
  { out: 'weekly_boon_icons/png/{v}/mystery_monday.webp', w: 256, h: 256, kind: 'glyph', m: M.giftQuestion },
  { out: 'weekly_boon_icons/png/{v}/perfect_week.webp', w: 256, h: 256, kind: 'glyph', m: M.calendarCheck },
  { out: 'weekly_boon_icons/png/{v}/speaking_saturday.webp', w: 256, h: 256, kind: 'glyph', m: M.mic },
  { out: 'weekly_boon_icons/png/{v}/streak_saver.webp', w: 256, h: 256, kind: 'glyph', m: M.shieldFlame },
  { out: 'weekly_boon_icons/png/{v}/turbo_regen.webp', w: 256, h: 256, kind: 'glyph', m: M.turboRegen },
];

// ── рендер ───────────────────────────────────────────────────────────────────
async function run() {
  let count = 0;
  for (const [variant, colors] of Object.entries(VARIANTS)) {
    for (const job of JOBS) {
      const rel = job.out.replaceAll('{v}', variant);
      const outPath = A(rel);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const svg =
        job.kind === 'card' ? cardSvg(job.m, colors, job.w, job.h)
        : job.kind === 'banner' ? bannerSvg(job.m, colors, job.w, job.h)
        : glyphSvg(job.m, colors);
      let img = sharp(Buffer.from(svg), { density: 300 }).resize(job.w, job.h, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (outPath.endsWith('.avif')) img = img.avif({ quality: 60 });
      else img = img.webp({ quality: 90 });
      await img.toFile(outPath);
      count++;
    }
    console.log(`✓ ${variant}: ${JOBS.length} файлов`);
  }
  console.log(`Готово: ${count} ассетов.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
