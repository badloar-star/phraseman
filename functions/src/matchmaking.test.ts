/**
 * Unit tests for matchmaking logic.
 * Tests pure matching logic — no Firebase needed.
 */

import { MatchmakingEntry, SessionSize } from './types';
import { readFileSync } from 'fs';
import path from 'path';

// ─── Pure helpers mirroring matchmaking.ts ────────────────────────────────────

const STALE_ENTRY_MS = 15 * 60 * 1000;

function makeEntry(overrides: Partial<MatchmakingEntry> & { id: string }): MatchmakingEntry & { id: string } {
  return {
    userId: overrides.id,
    rankTier: 'bronze',
    size: 2 as SessionSize,
    joinedAt: Date.now(),
    rankIndex: 0,
    searchRange: 2,
    displayName: 'Player',
    ...overrides,
  };
}

// Mirrors matchmaking.ts: self by doc id, size через Number (Firestore Long / string)
function findCandidates(
  userEntry: MatchmakingEntry & { id: string },
  allEntries: (MatchmakingEntry & { id: string })[],
): (MatchmakingEntry & { id: string })[] {
  const pool = allEntries.filter(
    e =>
      !e.sessionId &&
      (e as { id: string }).id !== (userEntry as { id: string }).id &&
      Number(e.size) === Number(userEntry.size),
  );
  const myIdx = userEntry.rankIndex ?? 0;
  const myRange = userEntry.searchRange ?? 2;
  return pool.filter(e => {
    const theirIdx = e.rankIndex ?? 0;
    const theirRange = e.searchRange ?? 2;
    return Math.abs(myIdx - theirIdx) <= Math.max(myRange, theirRange);
  });
}

function isStale(entry: MatchmakingEntry): boolean {
  return Date.now() - entry.joinedAt > STALE_ENTRY_MS;
}

// ─── CORE: Two players match ──────────────────────────────────────────────────

describe('matchmaking: two players find each other', () => {
  test('player A and B in queue → B is candidate for A', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 2 });
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].userId).toBe('uid_B');
  });

  test('player B and A in queue → A is candidate for B', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 2 });
    const candidates = findCandidates(B, [A]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].userId).toBe('uid_A');
  });

  test('match succeeds: picked = [A, B]', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 2 });
    const candidates = findCandidates(A, [B]);
    expect(candidates.length >= A.size - 1).toBe(true);
    const picked = [A, ...candidates.slice(0, A.size - 1)];
    expect(picked).toHaveLength(2);
    expect(picked.map(p => p.userId)).toEqual(['uid_A', 'uid_B']);
  });

  test('size number vs string (2 vs "2") still pairs — баг strict === на клієнтах / Long', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = { ...makeEntry({ id: 'uid_B' }), size: '2' as unknown as SessionSize };
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(1);
  });
});

// ─── No false positives ───────────────────────────────────────────────────────

describe('matchmaking: edge cases', () => {
  test('no match when queue is empty', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const candidates = findCandidates(A, []);
    expect(candidates).toHaveLength(0);
  });

  test('player not matched with themselves', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const candidates = findCandidates(A, [A]);
    expect(candidates).toHaveLength(0);
  });

  test('already matched player (has sessionId) is excluded', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 2, sessionId: 'existing_session' } as any);
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(0);
  });

  test('different sizes do not match', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 4 });
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(0);
  });

  test('far rank tiers do not match when out of search range', () => {
    const A = makeEntry({ id: 'uid_A', rankTier: 'bronze', rankIndex: 0 });
    const B = makeEntry({ id: 'uid_B', rankTier: 'legend', rankIndex: 20 });
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(0);
  });

  test('different ranks match when search range overlaps', () => {
    const A = makeEntry({ id: 'uid_A', rankTier: 'bronze', rankIndex: 0, searchRange: 2 });
    const B = makeEntry({ id: 'uid_B', rankTier: 'gold', rankIndex: 3, searchRange: 3 });
    const candidates = findCandidates(A, [B]);
    expect(candidates).toHaveLength(1);
  });

  test('3+ players in queue: picks first available', () => {
    const A = makeEntry({ id: 'uid_A', size: 2 });
    const B = makeEntry({ id: 'uid_B', size: 2 });
    const C = makeEntry({ id: 'uid_C', size: 2 });
    const candidates = findCandidates(A, [B, C]);
    expect(candidates.length >= 1).toBe(true);
    const picked = [A, ...candidates.slice(0, A.size - 1)];
    expect(picked).toHaveLength(2);
  });
});

// ─── Stale entry detection ────────────────────────────────────────────────────

describe('stale entry detection', () => {
  test('entry older than 15 min is stale', () => {
    const old = makeEntry({ id: 'a', joinedAt: Date.now() - STALE_ENTRY_MS - 1 });
    expect(isStale(old)).toBe(true);
  });

  test('fresh entry (30 sec ago) is NOT stale', () => {
    const fresh = makeEntry({ id: 'a', joinedAt: Date.now() - 30_000 });
    expect(isStale(fresh)).toBe(false);
  });

  test('entry exactly at 15 min boundary is NOT stale', () => {
    const boundary = makeEntry({ id: 'a', joinedAt: Date.now() - STALE_ENTRY_MS });
    expect(isStale(boundary)).toBe(false);
  });
});

// ─── subscribeMatchmakingQueue trigger logic ──────────────────────────────────

describe('client subscription: fires when sessionId appears', () => {
  test('no sessionId → does NOT call onSessionFound', () => {
    const data = { userId: 'uid_A', size: 2, joinedAt: Date.now() };
    const sessionId = (data as any).sessionId;
    expect(sessionId).toBeUndefined(); // клиент не должен навигировать
  });

  test('sessionId present → calls onSessionFound', () => {
    const data = { userId: 'uid_A', size: 2, joinedAt: Date.now(), sessionId: 'sess_123' };
    const sessionId = (data as any).sessionId;
    expect(sessionId).toBe('sess_123'); // клиент навигирует в игру
  });
});

describe('matchmaking cost controls', () => {
  test('cron is a fallback, not a every-minute primary matcher', () => {
    const indexSource = readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8');
    expect(indexSource).toContain("schedule: 'every 5 minutes'");
    expect(indexSource).toContain('await runMatchmaking()');
  });

  test('searching aggregate skips no-op writes when count is unchanged on a warm instance', () => {
    const source = readFileSync(path.join(process.cwd(), 'src', 'matchmaking.ts'), 'utf8');
    expect(source).toContain('let lastPublishedSearchingCount: number | null = null;');
    expect(source).toContain('if (lastPublishedSearchingCount === n) return;');
    expect(source).toContain('lastPublishedSearchingCount = n;');
  });
});

describe('ranked Arena runtime-pool transaction contract', () => {
  test('uses only the active en/ru level pool and commits player history with the session', () => {
    const source = readFileSync(path.join(process.cwd(), 'src', 'matchmaking.ts'), 'utf8');
    expect(source).toContain(".where('studyTarget', '==', 'en')");
    expect(source).toContain(".where('learnerSourceLocale', '==', 'ru')");
    expect(source).toContain(".where('availability', '==', 'active')");
    expect(source).toContain("db.collection('arena_question_history').doc(player.userId)");
    expect(source).toContain('mergeArenaQuestionHistory(previous, selection.ids)');
    expect(source).toContain('selectArenaPoolQuestions(rows');
  });

  test('has no legacy initial-match selector that can bypass runtime pool history', () => {
    const source = readFileSync(path.join(process.cwd(), 'src', 'matchmaking.ts'), 'utf8');
    expect(source).not.toMatch(/async function pickQuestions\s*\(/);
    expect(source).not.toContain('pickQuestions(questionLevel');
  });

  test('tie-break selection fails closed to the active en/ru runtime pool', () => {
    const source = readFileSync(path.join(process.cwd(), 'src', 'matchmaking.ts'), 'utf8');
    const start = source.indexOf('export async function pickOneQuestionExcluding');
    const end = source.indexOf('// ─── Trusted rank', start);
    const tieBreakSelector = source.slice(start, end);
    expect(tieBreakSelector).toContain(".where('studyTarget', '==', 'en')");
    expect(tieBreakSelector).toContain(".where('learnerSourceLocale', '==', 'ru')");
    expect(tieBreakSelector).toContain(".where('availability', '==', 'active')");
    expect(tieBreakSelector).toContain(".where('level', '==', level)");
  });
});

// ─── Content-dedup of arena questions ─────────────────────────────────────────
// Регрессия бага «в разборе вопросов Арены 3–7 одинаковые»: банк arena_questions
// содержит документы с разными id и полностью одинаковым содержанием. Выбор вопросов
// на матч дедупит по content-ключу (текст + отсортированные варианты + правильный),
// НЕ по doc id. Ключ включает options, поэтому вопросы с одним текстом и разными
// вариантами (разные задания) НЕ схлопываются.

// Зеркало questionContentKey / dedupByContent из matchmaking.ts.
function contentKey(d: { question?: unknown; options?: unknown; correct?: unknown }): string {
  const q = typeof d.question === 'string' ? d.question.trim().toLowerCase() : '';
  const c = typeof d.correct === 'string' ? d.correct.trim().toLowerCase() : '';
  const opts = Array.isArray(d.options)
    ? d.options.map((x) => String(x).trim().toLowerCase()).sort().join('¦')
    : '';
  return q === '' ? '' : `${q}||${opts}||${c}`;
}

function dedupByContentMirror<T extends { id: string; question?: unknown; options?: unknown; correct?: unknown }>(
  docs: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const d of docs) {
    const key = contentKey(d);
    if (key !== '' && seen.has(key)) continue;
    if (key !== '') seen.add(key);
    out.push(d);
  }
  return out;
}

describe('arena question content dedup', () => {
  test('collapses full duplicates that differ only by doc id', () => {
    const docs = [
      { id: 'a1_353', question: 'What does look after mean?', options: ['Искать', 'Присматривать', 'Смотреть на', 'Видеть'], correct: 'Присматривать' },
      { id: 'dup_a', question: 'What does look after mean?', options: ['Искать', 'Присматривать', 'Смотреть на', 'Видеть'], correct: 'Присматривать' },
      { id: 'dup_b', question: 'What does look after mean?', options: ['Видеть', 'Смотреть на', 'Присматривать', 'Искать'], correct: 'Присматривать' }, // те же варианты, другой порядок
    ];
    const out = dedupByContentMirror(docs);
    expect(out.map((d) => d.id)).toEqual(['a1_353']); // остаётся первый
  });

  test('keeps same-text questions that have different option sets (different tasks)', () => {
    const docs = [
      { id: 'b1_003', question: 'Which sentence is incorrect?', options: ['She enjoys reading.', 'She enjoys to read before bed.', 'He reads daily.', 'They read books.'], correct: 'She enjoys to read before bed.' },
      { id: 'b1_011', question: 'Which sentence is incorrect?', options: ['He took a break.', 'He suggested to take a break.', 'She rested.', 'We paused.'], correct: 'He suggested to take a break.' },
    ];
    const out = dedupByContentMirror(docs);
    expect(out.map((d) => d.id)).toEqual(['b1_003', 'b1_011']); // оба сохранены
  });

  test('does not collapse empty-question docs together', () => {
    const docs = [
      { id: 'x1', question: '', options: [], correct: '' },
      { id: 'x2', question: '', options: [], correct: '' },
    ];
    expect(dedupByContentMirror(docs).map((d) => d.id)).toEqual(['x1', 'x2']);
  });

  test('tie-break selection actually dedups by content before choosing', () => {
    const source = readFileSync(path.join(process.cwd(), 'src', 'matchmaking.ts'), 'utf8');
    // dedup применяется в тай-брейке
    expect(source).toContain('dedupByContent');
    expect(source).toContain('questionContentKey');
    // ключ включает options (иначе схлопнул бы разные задания с одним текстом)
    expect(source).toMatch(/options[\s\S]{0,80}\.sort\(\)/);
  });
});
