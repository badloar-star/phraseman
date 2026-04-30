/**
 * Анализ 50 карточек урока N из текста lesson_cards_data.ts (нормализованного \n).
 * Урок 1 — алиасы getLesson1Block / runLesson1Qa.
 */
import { getLessonInnerBounds } from './lesson-ts-io.mjs';
export function readQuotedField(block, fieldName) {
  const key = `${fieldName}: "`;
  const idx = block.indexOf(key);
  if (idx === -1) throw new Error(`Missing ${fieldName}`);
  let pos = idx + key.length;
  let out = '';
  while (pos < block.length) {
    const c = block[pos];
    if (c === '\\') {
      out += block[pos + 1] ?? '';
      pos += 2;
      continue;
    }
    if (c === '"') break;
    out += c;
    pos++;
  }
  return out;
}

/** Внутренний текст блока lessonCards[lessonId] (только содержимое между скобками урока). */
export function getLessonBlockText(text, lessonId) {
  const t = text.replace(/\r\n/g, '\n');
  return getLessonInnerBounds(t, lessonId).inner;
}

export function getLesson1Block(text) {
  return getLessonBlockText(text, 1);
}

export function getCardBlock(lessonBlock, n) {
  const marker = `    ${n}: {`;
  const start = lessonBlock.indexOf(marker);
  if (start === -1) throw new Error(`Card ${n} start not found`);
  const next =
    n < 50 ? lessonBlock.indexOf(`    ${n + 1}: {`, start + 1) : lessonBlock.length;
  if (n < 50 && next === -1) throw new Error(`Card ${n + 1} not found`);
  return lessonBlock.slice(start, next);
}

const FIELDS = ['correctRu', 'correctUk', 'wrongRu', 'wrongUk', 'secretRu', 'secretUk'];

function similarity(a, b) {
  const wa = tokenSet(a);
  const wb = tokenSet(b);
  let inter = 0;
  for (const t of wa) if (wb.has(t)) inter++;
  const union = wa.size + wb.size - inter || 1;
  return inter / union;
}

function tokenSet(s) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

/**
 * @param {string} fullText - полный файл .ts
 * @param {number} lessonId
 * @param {string} [sourceLabel]
 */
export function runLessonNQa(fullText, lessonId, sourceLabel = 'app/lesson_cards_data.ts') {
  const full = fullText.replace(/\r\n/g, '\n');
  const lb = getLessonBlockText(full, lessonId);
  const cards = [];
  for (let i = 1; i <= 50; i++) {
    const block = getCardBlock(lb, i);
    const o = { id: i };
    for (const f of FIELDS) o[f] = readQuotedField(block, f);
    cards.push(o);
  }

  const issues = [];
  const warn = [];

  for (const c of cards) {
    for (const f of FIELDS) {
      const s = c[f];
      if (!s || !s.trim()) issues.push({ level: 'error', card: c.id, field: f, code: 'EMPTY', msg: 'пустое поле' });
      if (s.length > 420) warn.push({ card: c.id, field: f, code: 'LONG', msg: `длина ${s.length} симв.` });
    }
  }

  const templateRe = /^(Базовый порядок|Порядок:|Проверьте модель|Соберите|Схема фразы)/;
  for (const c of cards) {
    if (templateRe.test(c.wrongRu.trim()))
      warn.push({ card: c.id, field: 'wrongRu', code: 'DRY_TEMPLATE', msg: 'похоже на старый робо-шаблон' });
  }

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (const f of FIELDS) {
        if (cards[i][f] === cards[j][f] && cards[i][f].length > 40) {
          warn.push({
            card: `${cards[i].id}/${cards[j].id}`,
            field: f,
            code: 'DUPLICATE',
            msg: 'дословный дубль между карточками',
          });
        }
      }
    }
  }

  for (const c of cards) {
    const sim = similarity(c.correctRu, c.wrongRu);
    if (sim > 0.55)
      warn.push({ card: c.id, field: 'correctRu/wrongRu', code: 'SIMILAR', msg: `высокое сходство ~${(sim * 100).toFixed(0)}%` });
  }

  return {
    generatedAt: new Date().toISOString(),
    source: sourceLabel,
    lesson: lessonId,
    cards: 50,
    errors: issues,
    warnings: warn,
    summary: {
      errorCount: issues.length,
      warningCount: warn.length,
    },
  };
}

/**
 * @param {string} fullText - полный файл .ts
 * @param {string} [sourceLabel]
 * @returns {{ errors: any[], warnings: any[], cards: any[] }}
 */
export function runLesson1Qa(fullText, sourceLabel = 'app/lesson_cards_data.ts') {
  return runLessonNQa(fullText, 1, sourceLabel);
}
