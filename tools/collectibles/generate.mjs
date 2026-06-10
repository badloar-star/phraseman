#!/usr/bin/env node
/**
 * Генератор/валидатор каталога «Сокровищницы» (коллекционные карточки фраз).
 *
 * Команды:
 *   node tools/collectibles/generate.mjs validate          — проверить каталог (схема, редкости, уникальность, тексты)
 *   node tools/collectibles/generate.mjs stats             — прогресс производства по сетам
 *   node tools/collectibles/generate.mjs build             — собрать build/collectibles_catalog.json + progress.md
 *   node tools/collectibles/generate.mjs placeholders      — сгенерировать уникальные SVG-плейсхолдеры для карточек без арта
 *   node tools/collectibles/generate.mjs prompts <setId>   — напечатать LLM-промпты для добивки текстов и SVG-артов сета
 *
 * Источник истины: catalog_seed.json. Без внешних зависимостей.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(HERE, 'catalog_seed.json');
const BUILD_DIR = path.join(HERE, 'build');
const ART_DIR = path.join(BUILD_DIR, 'art_placeholders');

const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const STATUS_ORDER = ['seed', 'texts_done', 'art_done', 'ready'];
const TEXT_FIELDS = ['ipa', 'literalRu', 'meaningRu', 'exampleEn', 'exampleRu', 'originRu'];
const LIMITS = { meaningRu: 140, originRu: 240, exampleEn: 110, exampleRu: 130, ru: 60 };

function loadCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  return JSON.parse(raw);
}

function statusAtLeast(status, min) {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(min);
}

/* ── validate ─────────────────────────────────────────────── */
function validate(catalog, { quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const seenSetIds = new Set();
  const seenOrders = new Set();
  const seenCardIds = new Set();
  const seenEn = new Map(); // lower(en) -> id

  const dist = catalog.rarityDistribution;
  if (!dist?.A || !dist?.B) errors.push('rarityDistribution: нужны типы A и B');

  const totals = { cards: 0, secrets: 0, common: 0, rare: 0, epic: 0, legendary: 0 };

  for (const set of catalog.sets ?? []) {
    const where = `[${set.setId}]`;
    if (!set.setId) errors.push('сет без setId');
    if (seenSetIds.has(set.setId)) errors.push(`${where} дубль setId`);
    seenSetIds.add(set.setId);
    if (seenOrders.has(set.order)) errors.push(`${where} дубль order=${set.order}`);
    seenOrders.add(set.order);
    if (!set.titleRu || !set.titleEn) errors.push(`${where} нет titleRu/titleEn`);
    if (set.type !== 'A' && set.type !== 'B') errors.push(`${where} type должен быть A или B`);

    if (!set.secret) errors.push(`${where} нет секретной карточки`);
    else {
      totals.secrets++;
      checkPhrase(set.secret, `${where} secret`, { isSecret: true });
    }

    const cards = set.cards ?? [];
    if (cards.length !== 10) errors.push(`${where} карточек ${cards.length}, должно быть 10`);

    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const card of cards) {
      totals.cards++;
      counts[card.rarity] = (counts[card.rarity] ?? 0) + 1;
      if (card.rarity in totals) totals[card.rarity]++;
      checkPhrase(card, `${where} ${card.id}`, { isSecret: false });
    }

    const expected = dist?.[set.type];
    if (expected) {
      for (const r of RARITIES) {
        if ((counts[r] ?? 0) !== (expected[r] ?? 0)) {
          errors.push(`${where} редкость ${r}: ${counts[r] ?? 0}, ожидалось ${expected[r] ?? 0} (тип ${set.type})`);
        }
      }
    }
  }

  function checkPhrase(p, where, { isSecret }) {
    if (!p.id) errors.push(`${where} нет id`);
    if (seenCardIds.has(p.id)) errors.push(`${where} дубль id`);
    seenCardIds.add(p.id);

    if (!p.en) errors.push(`${where} нет en`);
    const enKey = (p.en ?? '').toLowerCase().replace(/^(a|an|the)\s+/, '').trim();
    if (enKey) {
      if (seenEn.has(enKey)) errors.push(`${where} фраза "${p.en}" дублирует ${seenEn.get(enKey)}`);
      seenEn.set(enKey, p.id);
    }
    if (!p.ru) errors.push(`${where} нет ru`);
    if (p.ru && p.ru.length > LIMITS.ru) warnings.push(`${where} ru длиннее ${LIMITS.ru} симв.`);
    if (!isSecret && !RARITIES.includes(p.rarity)) errors.push(`${where} некорректная rarity "${p.rarity}"`);
    if (!STATUS_ORDER.includes(p.status)) errors.push(`${where} некорректный status "${p.status}"`);

    if (statusAtLeast(p.status, 'texts_done')) {
      for (const f of TEXT_FIELDS) {
        if (!p[f]) errors.push(`${where} status=${p.status}, но нет поля ${f}`);
      }
      for (const [f, max] of Object.entries(LIMITS)) {
        if (typeof p[f] === 'string' && p[f].length > max) {
          warnings.push(`${where} поле ${f} длиннее ${max} симв. (${p[f].length})`);
        }
      }
    }
    if (statusAtLeast(p.status, 'art_done') && !isSecret && !p.art) {
      errors.push(`${where} status=${p.status}, но нет art`);
    }
  }

  const expectTotals = { cards: 300, secrets: 30, common: 150, rare: 90, epic: 45, legendary: 15 };
  for (const [k, v] of Object.entries(expectTotals)) {
    if (totals[k] !== v) errors.push(`итого ${k}: ${totals[k]}, ожидалось ${v}`);
  }

  if (!quiet) {
    for (const w of warnings) console.warn('WARN  ' + w);
    for (const e of errors) console.error('ERROR ' + e);
    console.log(`\nКаталог: ${catalog.sets.length} сетов, ${totals.cards} карточек + ${totals.secrets} секретных`);
    console.log(`Редкости: common ${totals.common} · rare ${totals.rare} · epic ${totals.epic} · legendary ${totals.legendary}`);
    console.log(errors.length === 0 ? '\nVALIDATION OK' : `\nVALIDATION FAILED: ${errors.length} ошибок, ${warnings.length} предупреждений`);
  }
  return { errors, warnings };
}

/* ── stats ────────────────────────────────────────────────── */
function stats(catalog) {
  const rows = catalog.sets.map((s) => {
    const byStatus = { seed: 0, texts_done: 0, art_done: 0, ready: 0 };
    for (const c of s.cards) byStatus[c.status]++;
    const done = s.cards.filter((c) => statusAtLeast(c.status, 'texts_done')).length;
    return { id: s.setId, title: s.titleRu, type: s.type, texts: `${done}/10`, art: s.cards.filter((c) => statusAtLeast(c.status, 'art_done')).length, secret: s.secret?.status ?? '—' };
  });
  console.log('сет'.padEnd(18) + 'тема'.padEnd(26) + 'тип  тексты  арт  секретка');
  for (const r of rows) {
    console.log(r.id.padEnd(18) + r.title.padEnd(26) + `${r.type}    ${r.texts}    ${String(r.art).padEnd(3)}  ${r.secret}`);
  }
  const textsReady = catalog.sets.filter((s) => s.cards.every((c) => statusAtLeast(c.status, 'texts_done'))).length;
  console.log(`\nСетов с готовыми текстами: ${textsReady}/30`);
}

/* ── build ────────────────────────────────────────────────── */
function build(catalog) {
  const { errors } = validate(catalog, { quiet: true });
  if (errors.length) {
    console.error(`build остановлен: ${errors.length} ошибок валидации (запусти validate)`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const out = {
    version: catalog.version,
    builtAt: new Date().toISOString(),
    rarityDistribution: catalog.rarityDistribution,
    sets: catalog.sets,
  };
  const outPath = path.join(BUILD_DIR, 'collectibles_catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  const lines = ['# Прогресс производства «Сокровищницы»', ''];
  for (const s of catalog.sets) {
    const texts = s.cards.filter((c) => statusAtLeast(c.status, 'texts_done')).length;
    const art = s.cards.filter((c) => statusAtLeast(c.status, 'art_done')).length;
    lines.push(`- **${s.order}. ${s.titleRu}** (${s.setId}, тип ${s.type}) — тексты ${texts}/10, арт ${art}/10, секретка: ${s.secret.status}`);
  }
  fs.writeFileSync(path.join(BUILD_DIR, 'progress.md'), lines.join('\n') + '\n', 'utf8');
  console.log(`build OK → ${outPath}`);
}

/* ── placeholders: уникальные SVG для карточек без арта ───── */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const RARITY_COLORS = {
  common: { bg0: '#39456B', bg1: '#232B49', accent: '#9AA6C0', soft: '#C3CDE4' },
  rare: { bg0: '#155E8A', bg1: '#11324E', accent: '#38BDF8', soft: '#7DD3FC' },
  epic: { bg0: '#5B4399', bg1: '#2C2356', accent: '#A78BFA', soft: '#C4B5FD' },
  legendary: { bg0: '#8A6210', bg1: '#45330E', accent: '#FBBF24', soft: '#FDE68A' },
};

function patternSvg(kind, seed, accent) {
  const r = (n) => (seed = (seed * 1103515245 + 12345) >>> 0) % n;
  switch (kind) {
    case 0: { // dots
      let out = '';
      for (let i = 0; i < 14; i++) out += `<circle cx="${10 + r(180)}" cy="${10 + r(140)}" r="${2 + r(5)}" fill="${accent}" opacity="0.2"/>`;
      return out;
    }
    case 1: { // rays
      let out = '';
      for (let i = 0; i < 7; i++) out += `<rect x="98" y="-20" width="${3 + r(5)}" height="90" fill="${accent}" opacity="0.16" transform="rotate(${i * 26 + r(10)} 100 80)"/>`;
      return out;
    }
    case 2: { // waves
      let out = '';
      for (let i = 0; i < 4; i++) {
        const y = 30 + i * 32 + r(8);
        out += `<path d="M-10 ${y} Q 40 ${y - 14 - r(8)} 90 ${y} T 210 ${y}" stroke="${accent}" stroke-width="${2 + r(3)}" fill="none" opacity="0.2"/>`;
      }
      return out;
    }
    case 3: { // stars
      let out = '';
      for (let i = 0; i < 8; i++) {
        const x = 14 + r(172), y = 12 + r(132), s = 4 + r(6);
        out += `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z" fill="${accent}" opacity="0.22"/>`;
      }
      return out;
    }
    case 4: { // arcs
      let out = '';
      for (let i = 0; i < 5; i++) out += `<circle cx="${30 + r(140)}" cy="${20 + r(120)}" r="${14 + r(30)}" stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.16"/>`;
      return out;
    }
    case 5: { // grid of diamonds
      let out = '';
      for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 4; gy++) {
        if (r(3) === 0) continue;
        const x = 24 + gx * 38 + r(6), y = 22 + gy * 36 + r(6);
        out += `<rect x="${x}" y="${y}" width="9" height="9" fill="${accent}" opacity="0.18" transform="rotate(45 ${x + 4.5} ${y + 4.5})"/>`;
      }
      return out;
    }
    default:
      return '';
  }
}

function placeholderSvg(card, setIcon) {
  const seed = hash32(card.id);
  const c = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.common;
  const pattern = patternSvg(seed % 6, seed, c.accent);
  const initials = (card.en.replace(/^(a|an|the)\s+/i, '').trim()[0] ?? '?').toUpperCase();
  const ringRot = seed % 360;
  return `<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${card.en} (placeholder)">
<defs><radialGradient id="g" cx="50%" cy="22%" r="95%"><stop offset="0%" stop-color="${c.bg0}"/><stop offset="100%" stop-color="${c.bg1}"/></radialGradient></defs>
<rect width="200" height="160" fill="url(#g)"/>
${pattern}
<g transform="rotate(${ringRot} 100 80)"><circle cx="100" cy="80" r="44" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-dasharray="${6 + (seed % 9)} ${4 + (seed % 7)}" opacity="0.65"/></g>
<circle cx="100" cy="80" r="35" fill="rgba(11,16,32,0.45)" stroke="${c.accent}" stroke-width="1.5"/>
<text x="100" y="80" text-anchor="middle" dominant-baseline="central" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="900" fill="${c.soft}">${initials}</text>
<ellipse cx="100" cy="143" rx="52" ry="7" fill="rgba(0,0,0,0.28)"/>
</svg>\n`;
}

function placeholders(catalog) {
  fs.mkdirSync(ART_DIR, { recursive: true });
  let made = 0;
  for (const set of catalog.sets) {
    for (const card of set.cards) {
      if (card.art) continue; // настоящий арт уже есть
      fs.writeFileSync(path.join(ART_DIR, `${card.id}.svg`), placeholderSvg(card, set.icon), 'utf8');
      made++;
    }
  }
  console.log(`placeholders OK: ${made} уникальных SVG → ${ART_DIR}`);
}

/* ── prompts: заготовки для LLM-батчей ────────────────────── */
function textsPrompt(set) {
  const list = set.cards.map((c) => `- ${c.id} · "${c.en}" · ${c.ru} · ${c.rarity}`).join('\n');
  return `Ты пишешь контент для коллекционных карточек фраз в приложении для русскоязычных, изучающих английский.
Тон: дружелюбный тренер; объяснения максимально просто, «как для детей», с живыми бытовыми примерами.

Для КАЖДОЙ фразы сета «${set.titleRu}» (${set.setId}) верни JSON-объект с полями:
  id, en (без изменений), ipa (брит. транскрипция без слешей), ru (литературный перевод-эквивалент, ≤60 симв.),
  literalRu (дословный перевод, с маленькой буквы), meaningRu (значение одним простым предложением, ≤140 симв.),
  exampleEn (живой бытовой пример ≤110 симв., фраза употреблена естественно),
  exampleRu (перевод примера ≤130 симв.), originRu (история происхождения 1–2 предложения ≤240 симв.,
  обязательно с интересным фактом; если точное происхождение спорно — самая известная версия со словами «по одной из версий»),
  status: "texts_done".

Правила: не выдумывай факты; для русскоязычных давай русские эквиваленты-поговорки, где они есть;
редкость = сочность: common — повседневные, legendary — самые яркие. Секретная карточка сета: "${set.secret.en}" (${set.secret.ru}) — те же поля.

Эталон качества — сеты set01_animals и set02_food в catalog_seed.json.

Фразы:
${list}

Ответ: строго JSON-массив из 11 объектов (10 карточек + секретная), без комментариев.`;
}

function artPrompt(set) {
  const list = set.cards.map((c) => `- ${c.id} · "${c.en}" (${c.ru}, ${c.rarity})`).join('\n');
  return `Нарисуй 10 SVG-иллюстраций для карточек сета «${set.titleRu}» (${set.setId}).

Техтребования (СТРОГО):
- viewBox="0 0 200 160", без текста внутри, role="img" + aria-label с фразой;
- плоский дружелюбный стиль (как детская книжка): 3–6 крупных объектов, скруглённые формы, толстые обводки не нужны;
- сцена ИЛЛЮСТРИРУЕТ СМЫСЛ фразы буквально и смешно (например "When pigs fly" — свинка с крыльями в облаках);
- тень под главным объектом: эллипс rgba(0,0,0,.25);
- палитра живых пастельных цветов; фон НЕ рисовать (прозрачный — подложку даёт приложение по редкости);
- размер каждого SVG ≤ 60 строк; никаких <image>, <filter>, <script>.

Эталон — иллюстрации сета «Животные» (horse, pig, owl и др.) в docs/reports/COLLECTIBLES_CARDS_MOCKUP_2026-06-10.html.

Фразы:
${list}

Ответ: JSON-массив объектов { "id": "...", "svg": "<svg ...>...</svg>" }.`;
}

function prompts(catalog, setId) {
  const set = catalog.sets.find((s) => s.setId === setId);
  if (!set) {
    console.error(`Сет "${setId}" не найден. Доступные: ${catalog.sets.map((s) => s.setId).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('═'.repeat(70));
  console.log(`ПРОМПТ 1/2 — ТЕКСТЫ для ${setId}`);
  console.log('═'.repeat(70));
  console.log(textsPrompt(set));
  console.log('\n' + '═'.repeat(70));
  console.log(`ПРОМПТ 2/2 — SVG-ИЛЛЮСТРАЦИИ для ${setId}`);
  console.log('═'.repeat(70));
  console.log(artPrompt(set));
}

/* ── main ─────────────────────────────────────────────────── */
const [, , cmd, arg] = process.argv;
const catalog = loadCatalog();
switch (cmd) {
  case 'validate': {
    const { errors } = validate(catalog);
    if (errors.length) process.exitCode = 1;
    break;
  }
  case 'stats':
    stats(catalog);
    break;
  case 'build':
    build(catalog);
    break;
  case 'placeholders':
    placeholders(catalog);
    break;
  case 'prompts':
    prompts(catalog, arg);
    break;
  default:
    console.log('Использование: node tools/collectibles/generate.mjs <validate|stats|build|placeholders|prompts <setId>>');
}
