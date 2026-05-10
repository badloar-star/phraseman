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
  raw: Array<Record<string, unknown>>,
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

    const dedupeKey = `${q.question}|||${[...opts].sort().join('¦')}`;
    keyCounts.set(dedupeKey, (keyCounts.get(dedupeKey) ?? 0) + 1);
  }

  const dupes = [...keyCounts.entries()].filter(([, n]) => n > 1);
  expect(dupes).toEqual([]);
}

function gapMarkersOk(raw: Array<Record<string, unknown>>) {
  for (const q of raw) {
    const t = q.type as string | undefined;
    if (t !== 'fill_blank' && t !== 'complete_phrasal') continue;
    const qq = q.question as string;
    expect(qq.includes('___') || qq.includes('…')).toBe(true);
  }
}

describe('arena_questions_a1.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_a1.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<Record<string, unknown>>;

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'A1', false));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));
});

describe('arena_questions_a2.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_a2.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<Record<string, unknown>>;

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'A2', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));
});

describe('arena_questions_b1.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_b1.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<Record<string, unknown>>;

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'B1', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));
});

describe('arena_questions_b2.json', () => {
  const p = path.join(__dirname, '..', 'assets', 'arena_questions_b2.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Array<Record<string, unknown>>;

  it('is non-empty and has no quiz_logic', () => {
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.some((q) => q.type === 'quiz_logic')).toBe(false);
  });

  it('every card is valid', () => validateDeck(raw, 'B2', true));

  it('fill_blank / complete_phrasal have gap marker', () => gapMarkersOk(raw));
});
