'use strict';
// зачем (владелец 06.11, «Читается» в старой теории fr): собирает чтения ru/uk для фраз старой теории fr из трёх слоёв, по убыванию приоритета:
//   1) docs/work/classic_say_fr/phrases.json — правки целых фраз (просмотрены глазами);
//   2) готовые чтения Теории: say_extra_fr.json (вступления) и примеры plain-теории (theory.json) — единый стиль;
//   3) черновик scripts/classic_say_translit_fr.cjs по словарю docs/work/classic_say_fr/words.json (слова просмотрены глазами; словарь — единое чтение слова во всех фразах).
// Украинское чтение — правилом ruToUk из русского (на 294 готовых чтениях 230 совпало сразу, остальное — «ё»), если у готового чтения Теории нет своего uk.
const fs = require('fs');
const path = require('path');
const { translitFr, ruToUk } = require('./classic_say_translit_fr.cjs');

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function buildFrSay({ ids, targets, theory, root }) {
  const dir = path.join(root, 'docs', 'work', 'classic_say_fr');
  const words = readJson(path.join(dir, 'words.json'), {});
  const phrases = readJson(path.join(dir, 'phrases.json'), {});
  const known = new Map();
  for (const d of Object.values(theory ?? {})) {
    for (const ch of d?.chapters ?? []) {
      for (const e of ch?.examples ?? []) if (e?.say?.ru && e?.say?.uk && e.phraseId) known.set(String(e.phraseId), e.say);
    }
  }
  const extra = readJson(path.join(root, 'docs', 'work', 'classic_intro_plain', 'say_extra_fr.json'), {});
  for (const [k, v] of Object.entries(extra)) if (!k.startsWith('_') && v?.ru && v?.uk) known.set(k, v);
  const out = { ru: {}, uk: {}, missing: [], source: { phrase: 0, known: 0, draft: 0 } };
  for (const id of ids) {
    const target = targets.get(id);
    if (!target) { out.missing.push(id); continue; }
    if (phrases[id]) {
      out.ru[id] = phrases[id];
      out.uk[id] = ruToUk(phrases[id]);
      out.source.phrase += 1;
    } else if (known.has(id)) {
      out.ru[id] = known.get(id).ru;
      out.uk[id] = known.get(id).uk;
      out.source.known += 1;
    } else {
      const ru = translitFr(target, words);
      out.ru[id] = ru;
      out.uk[id] = ruToUk(ru);
      out.source.draft += 1;
    }
  }
  return out;
}

module.exports = { buildFrSay };
