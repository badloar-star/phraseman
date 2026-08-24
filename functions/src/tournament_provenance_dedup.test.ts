import { createHash } from 'node:crypto';

import {
  TOURNAMENT_ROUND_MODE_PLAN,
  selectRoundTasks,
  validateTournamentTask,
  type TournamentTask,
} from './tournament_core';
import { TOURNAMENT_POOL_V11_VERSION, tournamentV11TaskId } from './tournament_pool_v11_factory';
import { buildTournamentRounds } from './tournaments';

const explanation = {
  ruleNote: 'Use the exact meaning.',
  example: 'Ready means prepared. — Ready значит готов.',
  wrongOptionReasons: ['', 'Wrong.', 'Wrong.', 'Wrong.'],
};

function task(
  taskId: string,
  mode = 'guess_phrase',
  difficulty = 1,
  keys?: string[],
  parity: 0 | 1 = 1,
): TournamentTask {
  const contentSha256 = createHash('sha256').update(`fixture:${taskId}`, 'utf8').digest('hex');
  const base = {
    taskId: tournamentV11TaskId(TOURNAMENT_POOL_V11_VERSION, contentSha256),
    mode, difficulty, isVoice: false, verified: true,
    tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, `provenance-parity:${parity}`],
    ...(keys ? { provenanceKeys: keys } : {}),
    source: 'ai' as const,
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    exposureBucket: `${TOURNAMENT_POOL_V11_VERSION}:${mode}:000`,
    lifecycle: 'published' as const,
    semanticSignature: createHash('sha256').update(`signature:${taskId}`, 'utf8').digest('hex'),
    contentSha256,
    semanticReceiptId: createHash('sha256').update(`receipt:${taskId}`, 'utf8').digest('hex'),
    semanticReceiptSha256: createHash('sha256').update(`receipt-value:${taskId}`, 'utf8').digest('hex'),
    reviewContractVersion: 'tournament-semantic-review-v2',
    promptSetSha256: 'a'.repeat(64),
  };
  if (mode === 'translate_build') return {
    ...base,
    payload: {
      phrase: 'Собери фразу', wordBank: ['I', 'am', 'ready', 'not'],
      correctTokens: ['I', 'am', 'ready'], correctTokenCount: 3, correctAnswer: 'I am ready',
    },
    explanation: { ...explanation, wrongOptionReasons: [] },
  };
  if (mode === 'speed_match') {
    const prompts = ['one', 'two', 'three', 'four', 'five', 'six'];
    const options = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
    return {
      ...base,
      payload: {
        prompt: 'Соедини пары', rightOptions: options,
        items: prompts.map((prompt, index) => ({
          prompt, options, correctIndex: index,
          explanation: {
            ruleNote: `${prompt} has one match.`, example: `${prompt} — ${options[index]}.`,
            wrongOptionReasons: options.map((_, optionIndex) => optionIndex === index ? '' : 'Wrong pair.'),
          },
        })),
      },
      explanation: { ...explanation, wrongOptionReasons: [] },
    };
  }
  return {
    ...base,
    payload: { phrase: taskId, options: ['ok', 'no-1', 'no-2', 'no-3'], correctIndex: 0 },
    explanation,
  };
}

describe('tournament v11 provenance validation and selection', () => {
  it('keeps legacy optional but requires bounded unique canonical v11 keys', () => {
    const legacy = { ...task('legacy'), tags: [], poolVersion: 'tpool_20260801_v10' };
    delete (legacy as Partial<TournamentTask>).provenanceKeys;
    expect(validateTournamentTask(legacy).ok).toBe(true);

    expect(validateTournamentTask(task('missing')).ok).toBe(false);
    expect(validateTournamentTask(task('valid', 'guess_phrase', 1, ['gavan:10:phrase-3'])).ok).toBe(true);
    for (const drift of [
      { tags: ['provenance-parity:1'] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'provenance-parity:0', 'provenance-parity:1'] },
      { tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, 'pool:tpool_20260801_v10', 'provenance-parity:1'] },
      { poolVersion: TOURNAMENT_POOL_V11_VERSION, tags: [] },
    ]) expect(validateTournamentTask({
      ...task('tag-drift', 'guess_phrase', 1, ['gavan:10:phrase-3']), ...drift,
    }).ok).toBe(false);
    for (const provenanceKeys of [
      ['gavan:10:phrase-3', 'gavan:10:phrase-3'],
      ['not canonical'],
      [`gavan:10:${'x'.repeat(260)}`],
      Array.from({ length: 7 }, (_, index) => `gavan:10:phrase-${index}`),
    ]) expect(validateTournamentTask(task('bad', 'guess_phrase', 1, provenanceKeys)).ok).toBe(false);
  });

  it('filters provenance in exposure and fallback selection and returns shortage', () => {
    const pool = [
      task('a', 'guess_phrase', 1, ['gavan:10:phrase-3']),
      task('b', 'guess_phrase', 1, ['gavan:10:phrase-4']),
      task('c', 'guess_phrase', 1, ['gavan:10:phrase-5']),
    ];
    const selected = selectRoundTasks({
      pool, roomId: 'daily_1200_2026-08-24', roundNo: 1, count: 2, modeKind: 'mix',
      excludedTaskIds: new Set(), excludedProvenanceKeys: new Set(['gavan:10:phrase-3']),
    });
    expect(selected).toHaveLength(2);
    expect(selected.flatMap((item) => item.provenanceKeys ?? [])).not.toContain('gavan:10:phrase-3');

    const fallback = selectRoundTasks({
      pool: pool.map((item) => ({ ...item, tags: [], poolVersion: 'tpool_20260801_v10' })), roomId: 'unparseable-room',
      roundNo: 1, count: 3, modeKind: 'mix', excludedTaskIds: new Set([pool[1].taskId]),
      excludedProvenanceKeys: new Set(['gavan:10:phrase-3']),
    });
    expect(fallback.map(({ provenanceKeys }) => provenanceKeys)).toEqual([['gavan:10:phrase-5']]);
  });

  it('partitions v11 adjacent-day decks by complete provenance components and never falls back across them', () => {
    const pool = Array.from({ length: 40 }, (_, index) => task(
      `component-${index}`,
      'guess_phrase',
      1,
      [`gavan:${Math.floor(index / 2)}:shared-${Math.floor(index / 2)}`],
      Math.floor(index / 2) % 2 === 0 ? 1 : 0,
    ));
    const first = selectRoundTasks({
      pool, roomId: 'daily_1200_2026-08-24', roundNo: 1, count: 4, modeKind: 'mix',
    });
    const second = selectRoundTasks({
      pool, roomId: 'daily_1200_2026-08-25', roundNo: 1, count: 4, modeKind: 'mix',
    });
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    const firstKeys = new Set(first.flatMap((item) => item.provenanceKeys ?? []));
    expect(second.flatMap((item) => item.provenanceKeys ?? []).some((key) => firstKeys.has(key))).toBe(false);

  });

  it('never falls back to a local or legacy deck when any task declares v11 by poolVersion', () => {
    const pool = Array.from({ length: 8 }, (_, index) => task(
      `v11-short-${index}`, 'guess_phrase', 1, [`gavan:${index}:short`], 0,
    ));
    const selected = selectRoundTasks({
      pool,
      roomId: 'unparseable-room',
      roundNo: 1,
      count: 4,
      modeKind: 'mix',
    });
    expect(selected).toEqual([]);
  });

  it('rejects curated provenance overlap and fails closed on a genuine room shortage', () => {
    const roundTasks = TOURNAMENT_ROUND_MODE_PLAN.map((modes, roundIndex) => modes.map((mode, modeIndex) => (
      task(`r${roundIndex + 1}-${mode}`, mode, roundIndex === 0 ? 1 : 2, [
        roundIndex === 0 && modeIndex === 0 ? 'gavan:10:shared' : `gavan:${roundIndex + 10}:${mode}-${modeIndex}`,
      ])
    )));
    const pool = roundTasks.flat();
    // The curated second round deliberately repeats the first round's source.
    roundTasks[1].find((item) => item.mode === 'guess_phrase')!.provenanceKeys = ['gavan:10:shared'];
    const curated = new Map([
      [1, roundTasks[0].map(({ taskId: id }) => id)],
      [2, roundTasks[1].map(({ taskId: id }) => id)],
    ]);
    expect(buildTournamentRounds('curated-provenance-room', pool, curated)).toBeNull();
  });
});
