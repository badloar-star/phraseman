import fs from 'node:fs';
import path from 'node:path';
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { MISTAKE_RULE_THREE_STEPS, projectMistakes } from '../modules/mistake-practice/projection';
import {
  buildMistakePracticeSession,
  mistakePracticeRequestMismatch,
  mistakePracticeRequestOf,
} from '../modules/mistake-practice/session';
import { MISTAKE_CHECK_DELAY_MS } from '../modules/mistake-practice/three_step_rule';
import { buildMistakePracticeHubSnapshot } from '../app/mistake_practice_insights';

// зачем (владелец 11.11, D203, вкладка «Проверка»): занятие-проверка берёт только ошибки, чей срок наступил, а обычный
// «повтор исправленных» не трогает ошибки, которые проверку ещё ждут, — иначе пауза перед проверкой теряла бы смысл.
const T0 = 1_760_000_000_000;
const read = (relative: string) => fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

const captured = (id: string, at: number): MistakeEvent => ({
  eventId: `cap:${id}`,
  mistakeId: `mistake:v1:${id}`,
  cycleId: `mistake-cycle:v1:${id}`,
  type: 'captured',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: {
    canonicalTarget: `She works at home ${id}`,
    facet: 'form',
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-4:phrase-${id}`,
    sourceMeaning: `Она работает дома ${id}`,
    tokens: ['She', 'works', 'at', 'home', id],
    distractors: ['work', 'working', 'in'],
    expected: 'works',
  },
});

let seq = 0;
const answered = (id: string, at: number, extra: Record<string, unknown> = {}): MistakeEvent => ({
  eventId: `ans:${id}:${at}:${seq += 1}`,
  mistakeId: `mistake:v1:${id}`,
  cycleId: `mistake-cycle:v1:${id}`,
  type: 'practice_answered',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: { correct: true, mode: 'lesson_choice', localDay: '2026-11-11', rule: MISTAKE_RULE_THREE_STEPS, ...extra },
});

/** Ошибка, исправленная тремя шагами в момент `at`: её проверка наступит через MISTAKE_CHECK_DELAY_MS. */
const fixedAt = (id: string, at: number): MistakeEvent[] => [captured(id, at - 10), answered(id, at - 3), answered(id, at - 2), answered(id, at)];

const ids = (session: ReturnType<typeof buildMistakePracticeSession>) => session.queue.map((entry) => entry.mistakeId);

describe('check session (D203)', () => {
  const early = fixedAt('early', T0);
  const late = fixedAt('late', T0 + 2 * MISTAKE_CHECK_DELAY_MS);
  const oldRule = [captured('old', T0 - 100), answered('old', T0 - 50, { rule: null })];
  const journal = [...early, ...late, ...oldRule];
  const now = T0 + MISTAKE_CHECK_DELAY_MS + 1;
  const items = () => [...projectMistakes(journal).items.values()];

  test('takes only the mistakes whose check day has come', () => {
    const session = buildMistakePracticeSession({ items: items(), requestedLength: 'all', nowMs: now, pool: 'corrected', checkDueOnly: true });
    expect(ids(session)).toEqual(['mistake:v1:early']);
    expect(session.pool).toBe('corrected');
    expect(session.request?.check).toBe(true);
  });

  test('one question per mistake, like any review of fixed mistakes', () => {
    const session = buildMistakePracticeSession({ items: items(), requestedLength: 'all', nowMs: T0 + 10 * MISTAKE_CHECK_DELAY_MS, pool: 'corrected', checkDueOnly: true });
    expect(session.queue).toHaveLength(2);
    expect(ids(session)).toEqual(['mistake:v1:early', 'mistake:v1:late']);
  });

  test('refuses to start when no check is due yet', () => {
    expect(() => buildMistakePracticeSession({ items: items(), requestedLength: 'all', nowMs: T0 + 1, pool: 'corrected', checkDueOnly: true }))
      .toThrow('mistake_practice_no_ready_mistakes');
  });

  test('the ordinary review leaves alone every mistake that still owes a check', () => {
    const session = buildMistakePracticeSession({ items: items(), requestedLength: 'all', nowMs: now, pool: 'corrected' });
    expect(ids(session)).toEqual(['mistake:v1:old']);
    expect(session.request?.check).toBeUndefined();
  });

  test('after a passed check the mistake belongs to the ordinary review again', () => {
    const passed = [...journal, answered('early', now, { review: true })];
    const session = buildMistakePracticeSession({ items: [...projectMistakes(passed).items.values()], requestedLength: 'all', nowMs: now + 1, pool: 'corrected' });
    expect(ids(session).sort()).toEqual(['mistake:v1:early', 'mistake:v1:old']);
  });

  test('a saved review session is never resumed as a check, and the other way round', () => {
    const review = mistakePracticeRequestOf('all');
    const check = mistakePracticeRequestOf('all', undefined, true);
    expect(mistakePracticeRequestMismatch(review, check)).toContain('check:false->true');
    expect(mistakePracticeRequestMismatch(check, review)).toContain('check:true->false');
    expect(mistakePracticeRequestMismatch(check, mistakePracticeRequestOf('all', [], true))).toBeNull();
    expect(review).toEqual({ length: 'all', facets: [] });
  });

  test('the list snapshot carries the check dates the tab needs', () => {
    const snapshot = buildMistakePracticeHubSnapshot(journal, now);
    const byId = new Map(snapshot.items.map((entry) => [entry.mistakeId, entry]));
    expect(byId.get('mistake:v1:early')?.checkDueAtMs).toBe(T0 + MISTAKE_CHECK_DELAY_MS);
    expect(byId.get('mistake:v1:early')?.checkPassedAtMs).toBeNull();
    expect(byId.get('mistake:v1:old')?.checkDueAtMs).toBeNull();
  });
});

describe('list screen wiring of the check tab', () => {
  const list = read('app/mistakes_list.tsx');
  const screen = read('app/mistake_practice_session.tsx');

  test('the three tabs come from one split, and the button counts only due checks', () => {
    expect(list).toContain('splitMistakesByCheck(items ?? [], nowMs)');
    expect(list).toContain("tab === 'corrected' ? split.fixed : tab === 'check' ? split.check : split.waiting");
    expect(list).toContain('selectMistakesForCheck(');
    expect(list).toContain('testID="mistakes-list-check"');
  });

  test('the check starts the review pool with the check marker, and the screen passes it on', () => {
    expect(list).toContain("pool: 'corrected', check: '1', length: 'all'");
    expect(screen).toContain("checkDueOnly: reviewPool === 'corrected' && params.check === '1'");
  });

  test('without pending checks the tab row stays the approved two tabs', () => {
    expect(list).toContain("const showCheckTab = checkCount > 0 || tab === 'check';");
    expect(list).toContain('label: `${copy.waiting} · ${waitingCount}`');
    expect(list).toContain('label: `${copy.corrected} · ${correctedCount}`');
  });

  test('no outlined containers and no font squeezing came with the tab', () => {
    expect(list).not.toMatch(/borderWidth|borderColor/);
    expect(list).not.toMatch(/adjustsFontSizeToFit/);
  });
});
