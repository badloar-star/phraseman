/**
 * scripts/add_rand_to_a1.mjs — одноразовый: проставляет поле `rand` каждому
 * вопросу A1 в assets/arena_questions_a1.json.
 *
 * Зачем: A1 собран старым parse_arena.js БЕЗ поля `rand` (a2/b1/b2 собраны
 * build_arena_*.mjs и rand имеют). Все запросы выборки A1-вопросов используют
 * `.where('rand','>=',pivot).orderBy('rand')`, а Firestore НЕ возвращает
 * документы без поля `rand` → A1-комнаты падали в FALLBACK (3 вопроса), а
 * рейтинговые матчи bronze (level=A1) бросали «Insufficient ... level A1».
 *
 * rand детерминированный из id (как в build_arena_*.mjs randFromId) — повторный
 * запуск идемпотентен, одинаковые значения. Идёт парой с backfill в Firestore
 * (scripts/backfill_rand_a1_firestore.mjs).
 */
import { readFileSync, writeFileSync } from 'fs';

const PATH = './assets/arena_questions_a1.json';

function randFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

const questions = JSON.parse(readFileSync(PATH, 'utf8'));
if (!Array.isArray(questions)) {
  console.error('arena_questions_a1.json must be a JSON array');
  process.exit(1);
}

let added = 0;
const out = questions.map((q) => {
  if (typeof q.rand === 'number' && Number.isFinite(q.rand)) return q;
  added += 1;
  return { ...q, rand: randFromId(String(q.id)) };
});

writeFileSync(PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(`A1: добавлено rand для ${added}/${out.length} вопросов → ${PATH}`);
