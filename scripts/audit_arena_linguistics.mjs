/**
 * Автоаудит карточек арены: калька/дубли RU·UK, подозрительные хвосты, двусмысленные translate_meaning.
 * Не заменяет ручную вычитку, но ловит массовые паттерны.
 *
 *   node scripts/audit_arena_linguistics.mjs
 *   node scripts/audit_arena_linguistics.mjs --json review/arena_linguistics_report.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const DECKS = [
  ['A1', 'assets/arena_questions_a1.json'],
  ['A2', 'assets/arena_questions_a2.json'],
  ['B1', 'assets/arena_questions_b1.json'],
  ['B2', 'assets/arena_questions_b2.json'],
];

/** Разбить двуязычную строку на RU и UK (порядок: слева RU, справа UK по конвенции проекта). */
function bilingualHalves(s) {
  const t = String(s || '');
  for (const sep of [' · ', ' / ']) {
    const i = t.indexOf(sep);
    if (i >= 0) {
      return {
        ru: t.slice(0, i).trim(),
        uk: t.slice(i + sep.length).trim(),
        sep,
      };
    }
  }
  return null;
}

function normSlashesToDot(s) {
  return String(s || '').replace(/\s*\/\s*/g, ' · ').replace(/\s+/g, ' ').trim();
}

function leadingSeg(s) {
  const t = normSlashesToDot(s);
  const i = t.indexOf('·');
  return (i >= 0 ? t.slice(0, i) : t).trim().toLowerCase();
}

/** Ё во второй половине — часто признак RU вместо UK. */
const CYRILLIC_E = /\u0451/; // ё

const RU_IN_UK_STRICT = [
  [/\bсейчас\b/i, 'RU «сейчас» у UK часто «зараз»'],
  [/\bчтобы\b/i, 'RU «чтобы»'],
  [/\bэтот\b|\bэтого\b|\bэтом\b/i, 'указательное «этот» (RU)'],
  [/\bуже\b/i, 'RU «уже» (UK частіше «вже»)'],
  [/\bещё\b/i, 'RU «ещё»'],
  [/\bнего\b/i, 'форма «него» (предл. падеж RU)'],
  [/\bнеё\b/i, 'форма «неё»'],
];

function scanDeck(pool, rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error('SKIP missing', rel);
    return null;
  }
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  const issues = [];

  for (const q of arr) {
    const id = q.id;

    for (const field of ['rule', 'task']) {
      const v = q[field];
      if (typeof v !== 'string' || !v.trim()) continue;
      const h = bilingualHalves(v);
      if (h && h.ru && h.uk && h.ru === h.uk) {
        issues.push({
          pool,
          id,
          kind: 'bilingual_mirror',
          field,
          detail: v.slice(0, 120),
        });
      }
      if (h && h.uk) {
        if (CYRILLIC_E.test(h.uk)) {
          issues.push({ pool, id, kind: 'uk_has_yo', field, detail: h.uk.slice(0, 100) });
        }
        for (const [re, note] of RU_IN_UK_STRICT) {
          if (re.test(h.uk)) {
            issues.push({ pool, id, kind: 'suspect_ru_in_uk', field, note, detail: h.uk.slice(0, 100) });
            break;
          }
        }
      }
    }

    if (q.type === 'translate_meaning' && Array.isArray(q.options)) {
      for (let oi = 0; oi < q.options.length; oi++) {
        const h = bilingualHalves(q.options[oi]);
        if (h && h.ru === h.uk && h.ru.length > 1) {
          issues.push({
            pool,
            id,
            kind: 'translate_option_ru_uk_same',
            optIndex: oi,
            detail: q.options[oi].slice(0, 100),
          });
        }
      }
      const leads = q.options.map(leadingSeg);
      if (new Set(leads).size < 4) {
        issues.push({
          pool,
          id,
          kind: 'translate_ambiguous_en_head',
          detail: leads.join(' | '),
        });
      }
    }

    if (!q.rule || !String(q.rule).trim()) {
      issues.push({ pool, id, kind: 'empty_rule' });
    }
  }

  return { pool, rel, cards: arr.length, issues };
}

const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

const all = [];
for (const [pool, rel] of DECKS) {
  const r = scanDeck(pool, rel);
  if (r) all.push(r);
}

const byKind = new Map();
for (const { issues } of all) {
  for (const iss of issues) {
    byKind.set(iss.kind, (byKind.get(iss.kind) ?? 0) + 1);
  }
}

console.log('\n=== arena linguistics (auto) ===\n');
for (const { pool, cards, issues } of all) {
  console.log(`${pool}: ${cards} cards, ${issues.length} flags`);
}
console.log('\nBy kind:');
for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${n}`);
}

// Примеры (по каждому виду макс. 8)
const samples = new Map();
for (const { issues } of all) {
  for (const iss of issues) {
    if (!samples.has(iss.kind)) samples.set(iss.kind, []);
    const a = samples.get(iss.kind);
    if (a.length < 8) a.push(iss);
  }
}
console.log('\nSamples:');
for (const [k, arr] of samples) {
  console.log(`\n-- ${k} --`);
  for (const x of arr) console.log(JSON.stringify(x));
}

if (jsonOut) {
  const abs = path.isAbsolute(jsonOut) ? jsonOut : path.join(root, jsonOut);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify({ decks: all, summary: Object.fromEntries(byKind) }, null, 2), 'utf8');
  console.log('\nWrote', abs);
}
