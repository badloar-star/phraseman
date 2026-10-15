// зачем: перенос дизайна 2.0 на живой сайт (владелец 2026-10-15). Меняет в <head> страниц старый
// оформительский слой на v2/base.css + стили группы, добавляет v2/theme.js. Скрипты страниц и
// approved/runtime-components.css (тест/оплата/подарок) остаются. Повторный запуск ничего не дублирует.
// Запуск из корня репозитория: node knowly-www/assets/v2/_swap-head.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'knowly-www';
const OLD = ['site', 'cinema', 'product', 'edition', 'world', 'voice', 'edition-fonts', 'production'];
const V = '20261015';
const GROUP = {
  'index.html': 'home', 'app/index.html': 'home', 'download/index.html': 'home', '404.html': 'home', '404/index.html': 'home',
  'faq/index.html': 'content', 'contact/index.html': 'content', 'guides/index.html': 'content',
  'guides/english-15-minutes-a-day/index.html': 'content', 'guides/english-by-phrases/index.html': 'content',
  'guides/english-phrases-for-travel/index.html': 'content', 'guides/how-to-improve-english-pronunciation/index.html': 'content',
  'guides/how-to-learn-english/index.html': 'content', 'guides/speaking-barrier/index.html': 'content',
  'legal/data-deletion/index.html': 'content', 'legal/privacy-ios/index.html': 'content', 'legal/privacy/index.html': 'content', 'legal/terms/index.html': 'content',
  'gift/index.html': 'money', 'premium/index.html': 'money', 'russia/index.html': 'money', 'start/thanks/index.html': 'money',
  'english-level-test/index.html': 'test',
};

let changed = 0;
for (const [rel, group] of Object.entries(GROUP)) {
  const file = join(ROOT, rel);
  let html = readFileSync(file, 'utf8');
  if (html.includes('/assets/v2/base.css')) { console.log('[SWAP-HEAD] уже переведена:', rel); continue; }
  const before = html.length;
  for (const name of OLD) {
    const re = new RegExp(`<link rel="stylesheet" href="/assets/approved/${name}\\.css"\\s*/?>`, 'g');
    html = html.replace(re, '');
  }
  const add = `<link rel="stylesheet" href="/assets/v2/base.css?v=${V}"><link rel="stylesheet" href="/assets/v2/${group}.css?v=${V}"><script src="/assets/v2/theme.js?v=${V}"></script>`;
  if (!html.includes('</head>')) { console.error('[SWAP-HEAD] нет </head>:', rel); continue; }
  html = html.replace('</head>', `${add}</head>`);
  const left = OLD.filter((n) => html.includes(`/assets/approved/${n}.css`));
  if (left.length) console.warn('[SWAP-HEAD] остались старые стили в', rel, left);
  writeFileSync(file, html, 'utf8');
  changed++;
  console.log('[SWAP-HEAD]', rel.padEnd(52), group, before, '→', html.length);
}
console.log('[SWAP-HEAD] переведено страниц:', changed);
