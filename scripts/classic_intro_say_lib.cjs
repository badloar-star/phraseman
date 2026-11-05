// зачем (владелец 06.11, «Читается» во вступлениях ВСЕХ курсов; блокер сборки 150): одно место, где чтение (say ru/uk) попадает в блок вступления
// block.sayByLocale = { ru: { "<id примера>": "…" }, uk: {…} }. Раньше правило жило копией в сборщике (en → fr → de/it) и стиралось любой пересборкой другого языка:
// теперь им пользуются и сборщик (scripts/classic_course_pack.mjs), и применение к готовому файлу (scripts/classic_intro_say_apply.mjs), и сторож
// (tests/classic_intro_say_survives_rebuild.test.ts).
// Правила: (1) ключ в sayByLocale — ТОЧНО тот id, что стоит в блоке (examplesById / exampleIds): именно так читает экран (app/classic_course_phrases.ts, sayOf);
// (2) чтение ищется по полному id фразы («es:02:02») и по короткому («02.02»), источник — примеры теории и say_extra_<lang>.json; (3) ударение апострофом
// (А'на) приводится к знаку U+0301; (4) если у примера нет чтения на ru или uk — он попадает в missing, сборщик обязан упасть.

'use strict';
const SHORT = /(\d\d)[.:](\d\d)$/;
const shortId = (id) => { const m = SHORT.exec(String(id)); return m ? `${m[1]}.${m[2]}` : null; };
const fixStress = (text) => String(text).replace(/(?<=[аеёиіїоуыэюяє])'/gi, '́');

function buildSayIndex(theory, extra = {}) {
  const say = new Map();
  const put = (key, value, override) => {
    if (!key || !value?.ru || !value?.uk) return;
    if (override || !say.has(key)) say.set(key, value);
  };
  for (const th of Object.values(theory ?? {})) {
    for (const ch of th.chapters ?? []) {
      for (const e of ch.examples ?? []) {
        if (!e.say || !e.phraseId) continue;
        put(String(e.phraseId), e.say);
        put(shortId(e.phraseId), e.say);
      }
    }
  }
  for (const [k, v] of Object.entries(extra)) {
    if (k.startsWith('_')) continue;
    put(k, v);
    put(shortId(k), v);
  }
  return say;
}

/** Кладёт sayByLocale в блоки вступления (изменяет intro). Возвращает { blocks, examples, missing }. */
function applyIntroSay({ intro, theory, extra }) {
  const say = buildSayIndex(theory, extra);
  const missing = [];
  let blocks = 0;
  let examples = 0;
  for (const list of Object.values(intro)) {
    for (const block of list) {
      const ids = [...(block.examplesById ?? []), ...(block.exampleIds ?? [])].map(String);
      if (!ids.length) continue;
      const by = { ru: {}, uk: {} };
      for (const id of ids) {
        examples += 1;
        const sy = say.get(id) ?? say.get(shortId(id));
        if (sy?.ru && sy?.uk) { by.ru[id] = fixStress(sy.ru); by.uk[id] = fixStress(sy.uk); } else missing.push(id);
      }
      block.sayByLocale = by;
      blocks += 1;
    }
  }
  return { blocks, examples, missing };
}

module.exports = { buildSayIndex, applyIntroSay };
