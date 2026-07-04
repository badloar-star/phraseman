/**
 * Регрессия банков A1/A2 для арены: без quiz_logic; структура, id, correct ∈ options.
 */
import fs from 'fs';
import path from 'path';

/** Разрешённые типы в JSON (quiz_logic запрещён). */
const ARENA_TYPES_ALLOWED = new Set([
  'translate',
  'fill',
  'choose',
  'audio',
  'complete_phrasal',
  'translate_meaning',
  'fill_blank',
  'find_error',
  'choose_phrasal',
]);

function validateDeck(
  raw: Record<string, unknown>[],
  level: 'A1' | 'A2' | 'B1' | 'B2',
  requireRand: boolean,
) {
  const ids = new Set<string>();
  const keyCounts = new Map<string, number>();

  for (const q of raw) {
    expect(q.type).not.toBe('quiz_logic');

    const id = q.id;
    expect(typeof id).toBe('string');
    expect(ids.has(id as string)).toBe(false);
    ids.add(id as string);

    expect(q.level).toBe(level);
    if (q.type != null) {
      expect(ARENA_TYPES_ALLOWED.has(q.type as string)).toBe(true);
    }

    expect(typeof q.question).toBe('string');
    expect((q.question as string).trim().length).toBeGreaterThan(0);
    expect(typeof q.rule).toBe('string');

    expect(Array.isArray(q.options)).toBe(true);
    expect((q.options as string[]).length).toBe(4);

    const opts = q.options as string[];
    for (const o of opts) {
      expect(typeof o).toBe('string');
      expect(o.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(opts).size).toBe(4);

    expect(typeof q.correct).toBe('string');
    expect(opts.includes(q.correct as string)).toBe(true);
    for (const o of opts) {
      expect(o).not.toMatch(/^\(?[A-D]\)?[.)]\s/i);
    }

    if (requireRand) {
      expect(typeof q.rand).toBe('number');
      expect(Number.isFinite(q.rand as number)).toBe(true);
    }

    // Полный content-ключ (текст + отсортированные варианты + правильный) — та же
    // гранулярность, что у runtime-дедупа выбора вопросов (matchmaking.ts /
    // arena_rooms.ts / hooks/use-arena-mock.ts). Ловит визуально идентичные дубли,
    // из-за которых в «Разборе вопросов» матча вопросы 3–7 были одинаковыми, но НЕ
    // схлопывает вопросы с одним текстом и разными вариантами (это разные задания).
    const dedupeKey = `${(q.question as string).trim().toLowerCase()}|||${[...opts]
      .map((o) => o.trim().toLowerCase())
      .sort()
      .join('¦')}|||${(q.correct as string).trim().toLowerCase()}`;
    keyCounts.set(dedupeKey, (keyCounts.get(dedupeKey) ?? 0) + 1);
  }

  const dupes = [...keyCounts.entries()].filter(([, n]) => n > 1);
  expect(dupes).toEqual([]);
}

function gapMarkersOk(raw: Record<string, unknown>[]) {
  for (const q of raw) {
    const t = q.type as string | undefined;
    if (t !== 'fill_blank' && t !== 'complete_phrasal') continue;
    const qq = q.question as string;
    expect(qq.includes('___') || qq.includes('…')).toBe(true);
  }
}

function noEnglishFirstCyrillicSecondQuestionInstructions(raw: Record<string, unknown>[]) {
  const cyrillic = /[А-Яа-яЁёІіЇїЄєҐґ]/u;
  const latin = /[A-Za-z]/;
  const instruction = /^(which|what|choose|complete|fill|select|pick|find|translate)\b/i;
  const offenders: { id: unknown; value: string }[] = [];
  for (const q of raw) {
    const value = q.question;
    if (typeof value !== 'string') continue;
    const separator = value.includes(' / ') ? ' / ' : value.includes(' · ') ? ' · ' : null;
    if (!separator) continue;
    const parts = value.split(separator).map((part) => part.trim()).filter(Boolean);
    if (parts.length !== 2) continue;
    const [first, second] = parts;
    if (instruction.test(first) && latin.test(first) && !cyrillic.test(first) && cyrillic.test(second)) {
      offenders.push({ id: q.id, value });
    }
  }
  expect(offenders).toEqual([]);
}

describe('arena_questions_a1.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_a1.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>[];

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  // requireRand=true: A1 теперь обязан иметь поле `rand` (как a2/b1/b2). Без него
  // Firestore-запросы `.where('rand'...).orderBy('rand')` не возвращают A1-доки →
  // комнаты падали в FALLBACK, рейтинг bronze ломался. См. scripts/add_rand_to_a1.mjs.
  it('every card is valid', () => validateDeck(raw, 'A1', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));

  it('does not mix English first question instruction with Cyrillic fallback', () => noEnglishFirstCyrillicSecondQuestionInstructions(raw));
});

describe('arena_questions_a2.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_a2.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>[];

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'A2', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));

  it('does not mix English first question instruction with Cyrillic fallback', () => noEnglishFirstCyrillicSecondQuestionInstructions(raw));
});

describe('arena_questions_b1.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_b1.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>[];

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'B1', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));

  it('does not mix English first question instruction with Cyrillic fallback', () => noEnglishFirstCyrillicSecondQuestionInstructions(raw));
});

describe('arena_questions_b2.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_b2.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>[];

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'B2', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));

  it('does not mix English first question instruction with Cyrillic fallback', () => noEnglishFirstCyrillicSecondQuestionInstructions(raw));
});
