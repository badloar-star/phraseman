#!/usr/bin/env node
/**
 * Конвейер каталога «Сокровищницы» (коллекционные карточки фраз). v2 — production.
 *
 * Команды:
 *   validate              — Гейт G1/G2: схема, уникальность, редкости, лимиты, существование арт-файлов
 *   lint                  — Гейт G3: стилевые эвристики по текстам всего каталога
 *   merge <setId>         — Гейт G5: применить batches/<setId>.texts.json к каталогу (атомарно, с проверками)
 *   ingest-art <setId>    — Гейт G4: проверить batches/art/<setId>/*.svg и принять в art/<setId>/
 *   selftest              — Гейт гейтов: негативные тесты G1-G5 на фикстурах (ничего не пишет)
 *   stats                 — прогресс по сетам
 *   build                 — собрать build/collectibles_catalog.json + progress.md (только если всё зелёное)
 *   build-app             — сгенерировать модули фичи: app/collectibles/catalog_data.ts (тексты+SVG
 *                           инлайном, только полностью готовые сеты) + functions/src/collectibles_catalog.ts
 *                           (компактный пул id/rarity/set для серверного движка дропов)
 *   placeholders          — уникальные SVG-плейсхолдеры для карточек без арта
 *   prompts <setId>       — промпты для агентов writer/illustrator (файловый протокол)
 *
 * Протокол параллельной работы: агенты пишут ТОЛЬКО в batches/ (каждый сет — свои файлы),
 * каталог catalog_seed.json мутируют только merge/ingest-art в одной сессии-оркестраторе.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.join(HERE, 'catalog_seed.json');
const BUILD_DIR = path.join(HERE, 'build');
const ART_DIR = path.join(HERE, 'art');
const BATCH_DIR = path.join(HERE, 'batches');
const PLACEHOLDER_DIR = path.join(BUILD_DIR, 'art_placeholders');

const RARITIES = ['common', 'rare', 'epic', 'legendary'];
const STATUS_ORDER = ['seed', 'texts_done', 'art_done', 'ready'];
const TEXT_FIELDS = ['ipa', 'literalRu', 'meaningRu', 'exampleEn', 'exampleRu', 'originRu'];
const LIMITS = { ru: 60, literalRu: 80, meaningRu: 140, exampleEn: 110, exampleRu: 130, originRu: 240 };
const BANNED_PHRASES = [
  'данное выражение', 'данная фраза', 'представляет собой', 'осуществля',
  'некоторый', 'используется для обозначения', 'идиома означает',
];
const EN_STOPWORDS = new Set(['the', 'a', 'an', 'your', 'my', 'his', 'her', 'its', 'of', 'in', 'on', 'to', 'out', 'like', 'as', 'with', 'for', 'and', 'or', 'is', 'are', 'be', 'it', 'at', 'up', 'no', 'not', 'than', 'that', 'this', 'you', 'me', 'someone', 'something']);

/* ── utils ────────────────────────────────────────────────── */
function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}
function saveCatalog(catalog) {
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
}
function statusAtLeast(status, min) {
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(min);
}
function maxStatus(a, b) {
  return STATUS_ORDER.indexOf(a) >= STATUS_ORDER.indexOf(b) ? a : b;
}
function enKey(en) {
  return (en ?? '').toLowerCase().replace(/^(a|an|the)\s+/, '').replace(/[^a-zя0-9ё\s'-]/gi, '').trim();
}
function contentWords(en) {
  return en.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter((w) => w.length > 2 && !EN_STOPWORDS.has(w));
}

/* ── G1/G2: validate ──────────────────────────────────────── */
function validate(catalog, { quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const seenSetIds = new Set();
  const seenOrders = new Set();
  const seenCardIds = new Set();
  const seenEn = new Map();

  const dist = catalog.rarityDistribution;
  if (!dist?.A || !dist?.B) errors.push('rarityDistribution: нужны типы A и B');

  const totals = { cards: 0, secrets: 0, common: 0, rare: 0, epic: 0, legendary: 0 };

  function checkPhrase(p, where, { isSecret }) {
    if (!p.id) errors.push(`${where} нет id`);
    if (seenCardIds.has(p.id)) errors.push(`${where} дубль id`);
    seenCardIds.add(p.id);

    if (!p.en) errors.push(`${where} нет en`);
    const k = enKey(p.en);
    if (k) {
      if (seenEn.has(k)) errors.push(`${where} фраза "${p.en}" дублирует ${seenEn.get(k)}`);
      seenEn.set(k, p.id);
    }
    if (!p.ru) errors.push(`${where} нет ru`);
    if (!isSecret && !RARITIES.includes(p.rarity)) errors.push(`${where} некорректная rarity "${p.rarity}"`);
    if (!STATUS_ORDER.includes(p.status)) errors.push(`${where} некорректный status "${p.status}"`);

    if (statusAtLeast(p.status, 'texts_done')) {
      for (const f of TEXT_FIELDS) if (!p[f]) errors.push(`${where} status=${p.status}, но нет поля ${f}`);
      for (const [f, max] of Object.entries(LIMITS)) {
        if (typeof p[f] === 'string' && p[f].length > max) errors.push(`${where} поле ${f} длиннее ${max} симв. (${p[f].length})`);
      }
      if (p.ipa && /[[\]/]/.test(p.ipa)) errors.push(`${where} ipa должна быть без скобок и слешей`);
    }
    if (statusAtLeast(p.status, 'art_done')) {
      if (!p.art) errors.push(`${where} status=${p.status}, но нет art`);
    }
    if (p.art && p.art.includes('/')) {
      const f = path.join(ART_DIR, p.art + '.svg');
      if (!fs.existsSync(f)) errors.push(`${where} art-файл не найден: art/${p.art}.svg`);
    }
  }

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
        if ((counts[r] ?? 0) !== (expected[r] ?? 0)) errors.push(`${where} редкость ${r}: ${counts[r] ?? 0}, ожидалось ${expected[r] ?? 0} (тип ${set.type})`);
      }
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
    console.log(errors.length === 0 ? '\nVALIDATION OK' : `\nVALIDATION FAILED: ${errors.length} ошибок`);
  }
  return { errors, warnings };
}

/* ── G3: lint (стилевые эвристики) ────────────────────────── */
function lintPhrase(p, where) {
  const errors = [];
  const warnings = [];
  if (!statusAtLeast(p.status, 'texts_done')) return { errors, warnings };
  const blob = `${p.ru} ${p.meaningRu} ${p.exampleRu} ${p.originRu} ${p.literalRu}`.toLowerCase();
  for (const b of BANNED_PHRASES) {
    if (blob.includes(b)) errors.push(`${where} канцелярит/штамп: «${b}»`);
  }
  if (/^(это выражение|эта фраза|выражение означает)/i.test(p.originRu ?? '')) {
    warnings.push(`${where} originRu начинается со штампа — нужен факт, а не определение`);
  }
  const words = contentWords(p.en ?? '');
  if (words.length && p.exampleEn) {
    const ex = p.exampleEn.toLowerCase();
    if (!words.some((w) => ex.includes(w.slice(0, Math.max(4, w.length - 2))))) {
      warnings.push(`${where} exampleEn, похоже, не содержит саму фразу`);
    }
  }
  if (p.literalRu && /^[А-ЯЁ]/.test(p.literalRu)) warnings.push(`${where} literalRu с заглавной — нужно с маленькой`);
  return { errors, warnings };
}

function lint(catalog, { quiet = false } = {}) {
  let errors = [];
  let warnings = [];
  for (const set of catalog.sets) {
    for (const c of set.cards) {
      const r = lintPhrase(c, `[${set.setId}] ${c.id}`);
      errors = errors.concat(r.errors);
      warnings = warnings.concat(r.warnings);
    }
    const r = lintPhrase(set.secret, `[${set.setId}] secret`);
    errors = errors.concat(r.errors);
    warnings = warnings.concat(r.warnings);
  }
  if (!quiet) {
    for (const w of warnings) console.warn('WARN  ' + w);
    for (const e of errors) console.error('ERROR ' + e);
    console.log(errors.length === 0 ? `LINT OK (${warnings.length} предупреждений)` : `LINT FAILED: ${errors.length} ошибок`);
  }
  return { errors, warnings };
}

/* ── G5: merge текстового батча (чистая функция + команда) ── */
function applyTexts(catalog, setId, entries) {
  const errors = [];
  const set = catalog.sets.find((s) => s.setId === setId);
  if (!set) return { errors: [`сет ${setId} не найден`] };
  if (!Array.isArray(entries) || entries.length !== 11) {
    return { errors: [`батч должен быть массивом из 11 объектов (10 карточек + секретная), получено: ${Array.isArray(entries) ? entries.length : typeof entries}`] };
  }
  const targets = new Map(set.cards.map((c) => [c.id, c]));
  targets.set(set.secret.id, set.secret);
  const seen = new Set();

  for (const e of entries) {
    const where = `${setId}/${e.id ?? '?'}`;
    const target = targets.get(e.id);
    if (!target) { errors.push(`${where}: id не принадлежит сету`); continue; }
    if (seen.has(e.id)) { errors.push(`${where}: дубль id в батче`); continue; }
    seen.add(e.id);
    if (e.en !== target.en) { errors.push(`${where}: en изменён («${e.en}» ≠ «${target.en}») — фразы каталога менять нельзя`); continue; }
    if (!e.ru) errors.push(`${where}: нет ru`);
    for (const f of TEXT_FIELDS) if (!e[f]) errors.push(`${where}: нет поля ${f}`);
    for (const [f, max] of Object.entries(LIMITS)) {
      if (typeof e[f] === 'string' && e[f].length > max) errors.push(`${where}: ${f} длиннее ${max} (${e[f].length})`);
    }
    if (e.ipa && /[[\]/]/.test(e.ipa)) errors.push(`${where}: ipa без скобок/слешей`);
    const fake = { ...e, status: 'texts_done' };
    const lr = lintPhrase(fake, where);
    errors.push(...lr.errors);
  }
  if (seen.size !== 11) errors.push(`в батче ${seen.size} уникальных id, нужно 11`);
  if (errors.length) return { errors };

  for (const e of entries) {
    const target = targets.get(e.id);
    target.ru = e.ru;
    for (const f of TEXT_FIELDS) target[f] = e[f];
    target.status = maxStatus(target.status, 'texts_done');
  }
  return { errors: [] };
}

function mergeCmd(setId) {
  const p = path.join(BATCH_DIR, `${setId}.texts.json`);
  if (!fs.existsSync(p)) {
    console.error(`нет батча: ${p}`);
    process.exitCode = 1;
    return;
  }
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`битый JSON в батче: ${e.message}`);
    process.exitCode = 1;
    return;
  }
  const catalog = loadCatalog();
  const { errors } = applyTexts(catalog, setId, entries);
  if (errors.length) {
    for (const e of errors) console.error('REJECT ' + e);
    console.error(`\nMERGE REJECTED: ${errors.length} ошибок — каталог НЕ изменён`);
    process.exitCode = 1;
    return;
  }
  const v = validate(catalog, { quiet: true });
  if (v.errors.length) {
    for (const e of v.errors) console.error('REJECT ' + e);
    console.error('\nMERGE REJECTED: каталог после применения невалиден — НЕ записан');
    process.exitCode = 1;
    return;
  }
  saveCatalog(catalog);
  console.log(`MERGE OK: ${setId} — 11 текстов применены, каталог валиден`);
}

/* ── G4: гейт SVG + ingest-art ────────────────────────────── */
function gateSvg(name, content) {
  const errors = [];
  const c = content.trim();
  if (!c.startsWith('<svg')) errors.push(`${name}: должен начинаться с <svg`);
  if (!c.endsWith('</svg>')) errors.push(`${name}: должен заканчиваться </svg>`);
  if ((c.match(/<svg/g) ?? []).length !== 1) errors.push(`${name}: ровно один <svg>`);
  if (!c.includes('viewBox="0 0 200 160"')) errors.push(`${name}: нужен viewBox="0 0 200 160"`);
  if (!/aria-label="[^"]+"/.test(c)) errors.push(`${name}: нужен aria-label с фразой`);
  if (!c.includes('role="img"')) errors.push(`${name}: нужен role="img"`);
  const banned = [/<script/i, /<image/i, /<filter/i, /<foreignObject/i, /<text[\s>]/i, /<animate/i, /xlink:href/i, /\shref=/i, /<a[\s>]/i];
  for (const re of banned) if (re.test(c)) errors.push(`${name}: запрещённая конструкция ${re}`);
  if (Buffer.byteLength(c, 'utf8') > 8192) errors.push(`${name}: больше 8 КБ`);
  if (c.split('\n').length > 80) errors.push(`${name}: больше 80 строк`);
  return errors;
}

function ingestArtCmd(setId) {
  const dir = path.join(BATCH_DIR, 'art', setId);
  if (!fs.existsSync(dir)) {
    console.error(`нет папки батча: ${dir}`);
    process.exitCode = 1;
    return;
  }
  const catalog = loadCatalog();
  const set = catalog.sets.find((s) => s.setId === setId);
  if (!set) {
    console.error(`сет ${setId} не найден`);
    process.exitCode = 1;
    return;
  }
  const validIds = new Set([...set.cards.map((c) => c.id), set.secret.id]);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'));
  const errors = [];
  const accepted = new Map();

  for (const f of files) {
    const id = f.replace(/\.svg$/, '');
    if (!validIds.has(id)) { errors.push(`${f}: id не принадлежит сету ${setId}`); continue; }
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const ge = gateSvg(f, content);
    if (ge.length) errors.push(...ge);
    else accepted.set(id, content);
  }
  const cardIds = set.cards.map((c) => c.id);
  const missing = cardIds.filter((id) => !accepted.has(id));
  if (missing.length) errors.push(`не хватает артов карточек: ${missing.join(', ')} (секретная — опциональна, карточки — обязательны все 10)`);

  if (errors.length) {
    for (const e of errors) console.error('REJECT ' + e);
    console.error(`\nINGEST-ART REJECTED: ${errors.length} ошибок — ничего не принято`);
    process.exitCode = 1;
    return;
  }

  const outDir = path.join(ART_DIR, setId);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [id, content] of accepted) {
    fs.writeFileSync(path.join(outDir, `${id}.svg`), content.trim() + '\n', 'utf8');
    const target = id === set.secret.id ? set.secret : set.cards.find((c) => c.id === id);
    target.art = `${setId}/${id}`;
    if (statusAtLeast(target.status, 'texts_done')) target.status = maxStatus(target.status, 'art_done');
  }
  const v = validate(catalog, { quiet: true });
  if (v.errors.length) {
    for (const e of v.errors) console.error('REJECT ' + e);
    console.error('\nINGEST-ART REJECTED: каталог стал невалиден — откатись (git checkout art/ catalog)');
    process.exitCode = 1;
    return;
  }
  saveCatalog(catalog);
  console.log(`INGEST-ART OK: ${setId} — принято ${accepted.size} SVG → art/${setId}/`);
}

/* ── selftest: негативные тесты гейтов ────────────────────── */
function selftest() {
  const catalog = loadCatalog();
  let pass = 0;
  let fail = 0;
  function expect(name, cond) {
    if (cond) { console.log(`PASS  ${name}`); pass++; }
    else { console.error(`FAIL  ${name}`); fail++; }
  }
  const clone = () => JSON.parse(JSON.stringify(catalog));

  // эталонный валидный батч из набора «Животные» (тексты уже в каталоге)
  const animals = catalog.sets.find((s) => s.setId === 'set01_animals');
  const goodBatch = [...animals.cards, animals.secret].map((c) => ({
    id: c.id, en: c.en, ipa: c.ipa, ru: c.ru, literalRu: c.literalRu,
    meaningRu: c.meaningRu, exampleEn: c.exampleEn, exampleRu: c.exampleRu, originRu: c.originRu,
  }));

  expect('G5+ валидный батч принимается', applyTexts(clone(), 'set01_animals', goodBatch).errors.length === 0);

  const b1 = JSON.parse(JSON.stringify(goodBatch)); delete b1[0].meaningRu;
  expect('G5- батч без meaningRu отклонён', applyTexts(clone(), 'set01_animals', b1).errors.length > 0);

  const b2 = JSON.parse(JSON.stringify(goodBatch)); b2[0].en = 'Hold my beer';
  expect('G5- подмена en отклонена', applyTexts(clone(), 'set01_animals', b2).errors.length > 0);

  const b3 = JSON.parse(JSON.stringify(goodBatch)); b3[2].meaningRu = 'Данное выражение является идиомой.';
  expect('G3- канцелярит в батче отклонён', applyTexts(clone(), 'set01_animals', b3).errors.length > 0);

  const b4 = JSON.parse(JSON.stringify(goodBatch)); b4[1].originRu = 'х'.repeat(300);
  expect('G2- превышение лимита originRu отклонено', applyTexts(clone(), 'set01_animals', b4).errors.length > 0);

  const b5 = JSON.parse(JSON.stringify(goodBatch)); b5.pop();
  expect('G5- батч из 10 объектов (без секретки) отклонён', applyTexts(clone(), 'set01_animals', b5).errors.length > 0);

  const okSvg = '<svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="test"><circle cx="100" cy="80" r="40" fill="#FFC93C"/><ellipse cx="100" cy="140" rx="40" ry="7" fill="rgba(0,0,0,.25)"/></svg>';
  expect('G4+ валидный SVG принимается', gateSvg('ok.svg', okSvg).length === 0);
  expect('G4- <script> отклонён', gateSvg('bad.svg', okSvg.replace('<circle', '<script>x</script><circle')).length > 0);
  expect('G4- чужой viewBox отклонён', gateSvg('bad.svg', okSvg.replace('0 0 200 160', '0 0 100 100')).length > 0);
  expect('G4- <text> отклонён', gateSvg('bad.svg', okSvg.replace('</svg>', '<text x="1" y="1">hi</text></svg>')).length > 0);
  expect('G4- без aria-label отклонён', gateSvg('bad.svg', okSvg.replace(' aria-label="test"', '')).length > 0);

  const broken = clone();
  broken.sets[2].cards[0].rarity = 'legendary';
  expect('G1- сломанное распределение редкостей ловится', validate(broken, { quiet: true }).errors.length > 0);

  const dup = clone();
  dup.sets[3].cards[0].en = 'Hold your horses';
  expect('G1- дубль фразы между сетами ловится', validate(dup, { quiet: true }).errors.length > 0);

  expect('G1+ текущий каталог валиден', validate(clone(), { quiet: true }).errors.length === 0);
  expect('G3+ текущий каталог проходит линт', lint(clone(), { quiet: true }).errors.length === 0);

  console.log(`\nSELFTEST: ${pass} PASS, ${fail} FAIL`);
  if (fail) process.exitCode = 1;
}

/* ── stats / build ────────────────────────────────────────── */
function stats(catalog) {
  console.log('сет'.padEnd(18) + 'тема'.padEnd(26) + 'тип  тексты  арт   секретка');
  for (const s of catalog.sets) {
    const texts = s.cards.filter((c) => statusAtLeast(c.status, 'texts_done')).length;
    const art = s.cards.filter((c) => statusAtLeast(c.status, 'art_done')).length;
    const secret = `${statusAtLeast(s.secret.status, 'texts_done') ? 'T' : '·'}${s.secret.art ? 'A' : '·'}`;
    console.log(s.setId.padEnd(18) + s.titleRu.padEnd(26) + `${s.type}    ${texts}/10    ${String(art).padStart(2)}/10  ${secret}`);
  }
  const textsReady = catalog.sets.filter((s) => s.cards.every((c) => statusAtLeast(c.status, 'texts_done')) && statusAtLeast(s.secret.status, 'texts_done')).length;
  const artReady = catalog.sets.filter((s) => s.cards.every((c) => statusAtLeast(c.status, 'art_done'))).length;
  console.log(`\nГотово текстов: ${textsReady}/30 сетов · арт: ${artReady}/30 сетов`);
}

function build(catalog) {
  const v = validate(catalog, { quiet: true });
  const l = lint(catalog, { quiet: true });
  if (v.errors.length || l.errors.length) {
    console.error(`build остановлен: validate=${v.errors.length} lint=${l.errors.length} ошибок`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const out = { version: catalog.version, builtAt: new Date().toISOString(), rarityDistribution: catalog.rarityDistribution, sets: catalog.sets };
  const outPath = path.join(BUILD_DIR, 'collectibles_catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  const lines = ['# Прогресс производства «Сокровищницы»', ''];
  for (const s of catalog.sets) {
    const texts = s.cards.filter((c) => statusAtLeast(c.status, 'texts_done')).length;
    const art = s.cards.filter((c) => statusAtLeast(c.status, 'art_done')).length;
    lines.push(`- **${s.order}. ${s.titleRu}** (${s.setId}, тип ${s.type}) — тексты ${texts}/10, арт ${art}/10, секретка: ${s.secret.status}${s.secret.art ? '+art' : ''}`);
  }
  fs.writeFileSync(path.join(BUILD_DIR, 'progress.md'), lines.join('\n') + '\n', 'utf8');
  console.log(`build OK → ${outPath}`);
}

/* ── build-app: генерация модулей фичи (клиент + сервер) ──── */
const APP_CATALOG_OUT = path.join(HERE, '..', '..', 'app', 'collectibles', 'catalog_data.ts');
const SERVER_CATALOG_OUT = path.join(HERE, '..', '..', 'functions', 'src', 'collectibles_catalog.ts');

/** Сет «живой» = все 10 карточек с артом и секретка хотя бы с текстами. */
function isLiveSet(s) {
  return s.cards.every((c) => statusAtLeast(c.status, 'art_done'))
    && statusAtLeast(s.secret.status, 'texts_done');
}

/**
 * Конвертировать rgba(r,g,b,a) → rgb(r,g,b) + fill-opacity/stroke-opacity.
 * react-native-svg не понимает rgba() в атрибутах fill/stroke.
 */
function fixRgba(svg) {
  // fill="rgba(r,g,b,a)" → fill="rgb(r,g,b)" fill-opacity="a"
  return svg
    .replace(/\bfill="rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)"/g,
      (_, r, g, b, a) => `fill="rgb(${r},${g},${b})" fill-opacity="${a}"`)
    .replace(/\bstroke="rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)"/g,
      (_, r, g, b, a) => `stroke="rgb(${r},${g},${b})" stroke-opacity="${a}"`);
}

/**
 * Убрать role/aria-label из <svg> тега — react-native-svg парсер может падать
 * на кириллице в атрибутах (нет XML-заголовка с encoding).
 */
function stripAriaFromSvgTag(svg) {
  return svg.replace(/(<svg\b[^>]*?)\s+role="[^"]*"/g, '$1')
            .replace(/(<svg\b[^>]*?)\s+aria-label="[^"]*"/g, '$1');
}

/** Сжать SVG без изменения разметки: убрать межтеговые переводы строк и двойные пробелы. */
function compactSvg(svg) {
  return fixRgba(stripAriaFromSvgTag(svg.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()));
}

function readArtSvg(artRef) {
  if (!artRef) return null;
  const file = path.join(ART_DIR, `${artRef}.svg`);
  if (!fs.existsSync(file)) return null;
  return compactSvg(fs.readFileSync(file, 'utf8'));
}

function cardTs(card) {
  const fields = [
    `id: ${JSON.stringify(card.id)}`,
    `en: ${JSON.stringify(card.en)}`,
    `ipa: ${JSON.stringify(card.ipa ?? '')}`,
    `ru: ${JSON.stringify(card.ru)}`,
    `literalRu: ${JSON.stringify(card.literalRu ?? '')}`,
    `meaningRu: ${JSON.stringify(card.meaningRu ?? '')}`,
    `exampleEn: ${JSON.stringify(card.exampleEn ?? '')}`,
    `exampleRu: ${JSON.stringify(card.exampleRu ?? '')}`,
    `originRu: ${JSON.stringify(card.originRu ?? '')}`,
  ];
  if (card.rarity) fields.push(`rarity: ${JSON.stringify(card.rarity)}`);
  const svg = readArtSvg(card.art);
  fields.push(`svg: ${svg ? JSON.stringify(svg) : 'null'}`);
  return `{ ${fields.join(', ')} }`;
}

function buildApp(catalog) {
  const v = validate(catalog, { quiet: true });
  if (v.errors.length) {
    console.error(`build-app остановлен: validate=${v.errors.length} ошибок`);
    process.exitCode = 1;
    return;
  }
  const live = catalog.sets.filter(isLiveSet);
  if (live.length === 0) {
    console.error('build-app: нет ни одного полностью готового сета');
    process.exitCode = 1;
    return;
  }

  // ── клиентский модуль: полный контент live-сетов + SVG инлайном ──
  const setBlocks = live.map((s) => {
    const cards = s.cards.map((c) => `    ${cardTs(c)},`).join('\n');
    return [
      '  {',
      `    setId: ${JSON.stringify(s.setId)},`,
      `    order: ${s.order},`,
      `    type: ${JSON.stringify(s.type)},`,
      `    titleRu: ${JSON.stringify(s.titleRu)},`,
      `    titleEn: ${JSON.stringify(s.titleEn ?? '')},`,
      `    icon: ${JSON.stringify(s.icon ?? '')},`,
      '    cards: [',
      cards,
      '    ],',
      `    secret: ${cardTs(s.secret)},`,
      '  },',
    ].join('\n');
  }).join('\n');

  const clientTs = `// АВТОГЕНЕРИРОВАНО: node tools/collectibles/generate.mjs build-app
// НЕ ПРАВИТЬ РУКАМИ — источник истины tools/collectibles/catalog_seed.json.
// Только полностью готовые сеты (10/10 арт + секретка с текстами): ${live.length} из ${catalog.sets.length}.
/* eslint-disable */

export type CollectibleRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CollectibleCardData = {
  id: string;
  en: string;
  ipa: string;
  ru: string;
  literalRu: string;
  meaningRu: string;
  exampleEn: string;
  exampleRu: string;
  originRu: string;
  rarity: CollectibleRarity;
  /** Инлайн-SVG сцены (viewBox 0 0 200 160, прозрачный фон). */
  svg: string | null;
};

/** Секретная 11-я карточка сета: без редкости, открывается за полный сет. */
export type CollectibleSecretData = Omit<CollectibleCardData, 'rarity'>;

export type CollectibleSetData = {
  setId: string;
  order: number;
  type: 'A' | 'B';
  titleRu: string;
  titleEn: string;
  icon: string;
  cards: CollectibleCardData[];
  secret: CollectibleSecretData;
};

export const COLLECTIBLES_CATALOG_VERSION = ${catalog.version};

export const COLLECTIBLE_SETS: CollectibleSetData[] = [
${setBlocks}
];
`;

  // ── серверный модуль: компактный пул для движка дропов ──
  const poolLines = [];
  const secretBySet = [];
  const setCardIds = [];
  for (const s of live) {
    for (const c of s.cards) {
      poolLines.push(`  { id: ${JSON.stringify(c.id)}, setId: ${JSON.stringify(s.setId)}, rarity: ${JSON.stringify(c.rarity)} },`);
    }
    secretBySet.push(`  ${JSON.stringify(s.setId)}: ${JSON.stringify(s.secret.id)},`);
    setCardIds.push(`  ${JSON.stringify(s.setId)}: [${s.cards.map((c) => JSON.stringify(c.id)).join(', ')}],`);
  }

  const serverTs = `// АВТОГЕНЕРИРОВАНО: node tools/collectibles/generate.mjs build-app
// НЕ ПРАВИТЬ РУКАМИ — источник истины tools/collectibles/catalog_seed.json.
// Live-сеты (полностью готовые): ${live.length} из ${catalog.sets.length}. Без текстов/SVG — только пул для ролла.

export type CollectibleRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CollectiblePoolCard = {
  id: string;
  setId: string;
  rarity: CollectibleRarity;
};

export const COLLECTIBLES_CATALOG_VERSION = ${catalog.version};

/** Дропающиеся карточки (секретки сюда не входят — они выдаются за полный сет). */
export const COLLECTIBLE_POOL: CollectiblePoolCard[] = [
${poolLines.join('\n')}
];

/** id секретной карточки по сету (выдаётся автоматически при сборе всех 10). */
export const COLLECTIBLE_SECRET_BY_SET: Record<string, string> = {
${secretBySet.join('\n')}
};

/** Состав сетов для проверки полноты. */
export const COLLECTIBLE_SET_CARD_IDS: Record<string, string[]> = {
${setCardIds.join('\n')}
};
`;

  fs.mkdirSync(path.dirname(APP_CATALOG_OUT), { recursive: true });
  fs.writeFileSync(APP_CATALOG_OUT, clientTs, 'utf8');
  fs.writeFileSync(SERVER_CATALOG_OUT, serverTs, 'utf8');
  const cardCount = live.length * 10;
  console.log(`build-app OK: ${live.length} live-сетов, ${cardCount} карточек + ${live.length} секреток`);
  console.log(`  client → ${APP_CATALOG_OUT} (${(fs.statSync(APP_CATALOG_OUT).size / 1024).toFixed(0)} КБ)`);
  console.log(`  server → ${SERVER_CATALOG_OUT} (${(fs.statSync(SERVER_CATALOG_OUT).size / 1024).toFixed(0)} КБ)`);
}

/* ── placeholders ─────────────────────────────────────────── */
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
    case 0: { let out = ''; for (let i = 0; i < 14; i++) out += `<circle cx="${10 + r(180)}" cy="${10 + r(140)}" r="${2 + r(5)}" fill="${accent}" opacity="0.2"/>`; return out; }
    case 1: { let out = ''; for (let i = 0; i < 7; i++) out += `<rect x="98" y="-20" width="${3 + r(5)}" height="90" fill="${accent}" opacity="0.16" transform="rotate(${i * 26 + r(10)} 100 80)"/>`; return out; }
    case 2: { let out = ''; for (let i = 0; i < 4; i++) { const y = 30 + i * 32 + r(8); out += `<path d="M-10 ${y} Q 40 ${y - 14 - r(8)} 90 ${y} T 210 ${y}" stroke="${accent}" stroke-width="${2 + r(3)}" fill="none" opacity="0.2"/>`; } return out; }
    case 3: { let out = ''; for (let i = 0; i < 8; i++) { const x = 14 + r(172), y = 12 + r(132), s = 4 + r(6); out += `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z" fill="${accent}" opacity="0.22"/>`; } return out; }
    case 4: { let out = ''; for (let i = 0; i < 5; i++) out += `<circle cx="${30 + r(140)}" cy="${20 + r(120)}" r="${14 + r(30)}" stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.16"/>`; return out; }
    case 5: { let out = ''; for (let gx = 0; gx < 5; gx++) for (let gy = 0; gy < 4; gy++) { if (r(3) === 0) continue; const x = 24 + gx * 38 + r(6), y = 22 + gy * 36 + r(6); out += `<rect x="${x}" y="${y}" width="9" height="9" fill="${accent}" opacity="0.18" transform="rotate(45 ${x + 4.5} ${y + 4.5})"/>`; } return out; }
    default: return '';
  }
}
function placeholderSvg(card) {
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
  fs.mkdirSync(PLACEHOLDER_DIR, { recursive: true });
  let made = 0;
  for (const set of catalog.sets) for (const card of set.cards) {
    if (card.art) continue;
    fs.writeFileSync(path.join(PLACEHOLDER_DIR, `${card.id}.svg`), placeholderSvg(card), 'utf8');
    made++;
  }
  console.log(`placeholders OK: ${made} SVG → ${PLACEHOLDER_DIR}`);
}

/* ── prompts для агентов (файловый протокол) ──────────────── */
function textsPrompt(set) {
  const list = [...set.cards, set.secret].map((c) => `  {"id":"${c.id}","en":"${c.en}","ru-ориентир":"${c.ru}"${c.rarity ? `,"rarity":"${c.rarity}"` : ',"СЕКРЕТНАЯ":true'}}`).join('\n');
  const outPath = path.join(BATCH_DIR, `${set.setId}.texts.json`).replace(/\\/g, '/');
  return `РОЛЬ: writer. Ты пишешь контент карточек сета «${set.titleRu}» (${set.setId}) для русскоязычных, изучающих английский.
Тон: дружелюбный тренер, объяснения «как для детей», живые бытовые примеры. Прочитай эталоны: сеты set01_animals и set02_food в C:/appsprojects/phraseman/tools/collectibles/catalog_seed.json и правила в C:/appsprojects/phraseman/tools/collectibles/STYLE_GUIDE.md.

СОЗДАЙ ФАЙЛ ${outPath} — строго JSON-массив из РОВНО 11 объектов (10 карточек + секретная), по объекту на каждую фразу ниже. Поля каждого объекта:
  id (как дано), en (БЕЗ ИЗМЕНЕНИЙ, символ в символ), ipa (брит., без скобок и слешей),
  ru (литературный эквивалент ≤60; русская поговорка-двойник, если есть), literalRu (дословно, с маленькой буквы, ≤80),
  meaningRu (одно простое предложение ≤140), exampleEn (живой бытовой пример ≤110, фраза внутри звучит естественно),
  exampleRu (перевод примера ≤130), originRu (история 1–2 предложения ≤240 с КОНКРЕТНЫМ интересным фактом; если спорно — «по одной из версий»; не выдумывай).
ЗАПРЕЩЕНО: канцелярит («данное выражение», «является», «представляет собой»), менять en, добавлять поля status/rarity.

Фразы сета:
[
${list}
]

После записи файла ответь одной строкой: setId, сколько объектов записано, путь к файлу.`;
}

function artPrompt(set) {
  const list = [...set.cards, set.secret].map((c) => `- ${c.id} · "${c.en}" (${c.ru}${c.rarity ? ', ' + c.rarity : ', СЕКРЕТНАЯ'})`).join('\n');
  const outDir = path.join(BATCH_DIR, 'art', set.setId).replace(/\\/g, '/');
  return `РОЛЬ: illustrator. Нарисуй SVG-иллюстрации для сета «${set.titleRu}» (${set.setId}).
Эталоны стиля — прочитай 2-3 файла из C:/appsprojects/phraseman/tools/collectibles/art/set01_animals/ (например animals_07.svg — свинка с крыльями, animals_09.svg — слон в комнате).

СОЗДАЙ 11 ФАЙЛОВ: ${outDir}/<id>.svg — по одному на каждую фразу ниже (секретная тоже).

ТЕХТРЕБОВАНИЯ (нарушение = автоотказ гейта):
- ровно один <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="<фраза en>">…</svg>;
- ЗАПРЕЩЕНЫ: <text>, <script>, <image>, <filter>, <foreignObject>, <animate>, href/xlink;
- ≤80 строк и ≤8КБ на файл;
- фон НЕ рисовать (прозрачный — подложку даёт приложение), под главным объектом тень: <ellipse … fill="rgba(0,0,0,.25)"/>;
- плоский стиль «детская книжка»: 3–6 крупных скруглённых объектов, живые пастельные цвета;
- сцена показывает БУКВАЛЬНЫЙ смысл фразы, смешно и узнаваемо (пример: "When pigs fly" = свинка с крыльями в облаках). Никакой абстракции «просто паттерн».

Фразы:
${list}

После записи файлов ответь одной строкой: setId, сколько SVG записано, путь к папке.`;
}

function prompts(catalog, setId) {
  const set = catalog.sets.find((s) => s.setId === setId);
  if (!set) {
    console.error(`Сет "${setId}" не найден. Доступные: ${catalog.sets.map((s) => s.setId).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('═'.repeat(70) + `\nПРОМПТ 1/2 — WRITER для ${setId}\n` + '═'.repeat(70));
  console.log(textsPrompt(set));
  console.log('\n' + '═'.repeat(70) + `\nПРОМПТ 2/2 — ILLUSTRATOR для ${setId}\n` + '═'.repeat(70));
  console.log(artPrompt(set));
}

/* ── main ─────────────────────────────────────────────────── */
const [, , cmd, arg] = process.argv;
const catalog = loadCatalog();
switch (cmd) {
  case 'validate': { const { errors } = validate(catalog); if (errors.length) process.exitCode = 1; break; }
  case 'lint': { const { errors } = lint(catalog); if (errors.length) process.exitCode = 1; break; }
  case 'merge': mergeCmd(arg); break;
  case 'ingest-art': ingestArtCmd(arg); break;
  case 'selftest': selftest(); break;
  case 'stats': stats(catalog); break;
  case 'build': build(catalog); break;
  case 'build-app': buildApp(catalog); break;
  case 'placeholders': placeholders(catalog); break;
  case 'prompts': prompts(catalog, arg); break;
  default:
    console.log('Команды: validate | lint | merge <setId> | ingest-art <setId> | selftest | stats | build | build-app | placeholders | prompts <setId>');
}
