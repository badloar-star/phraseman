import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  TOURNAMENT_ROUND_MODE_PLAN,
  TOURNAMENT_TABLE_DISPLAY_MS,
  computePlacements,
  planTournamentFinalization,
  type TournamentPlayer,
  type TournamentRoomDoc,
  type TournamentTask,
} from './tournament_core';
import { buildTournamentRounds } from './tournaments';
import type { TournamentEconomyConfig } from './tournament_economy';

const choiceExplanation = {
  ruleNote: 'Use the phrase that matches the situation.',
  example: 'I am ready. — Я готов.',
  wrongOptionReasons: ['', 'Wrong meaning.', 'Wrong grammar.', 'Wrong context.'],
};

function task(taskId: string, mode: TournamentTask['mode'], difficulty: number): TournamentTask {
  if (mode === 'translate_build') {
    return {
      taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
      payload: {
        phrase: 'Собери фразу',
        wordBank: ['I', 'am', 'ready', 'not'],
        correctTokens: ['I', 'am', 'ready'],
        correctTokenCount: 3,
        correctAnswer: 'I am ready',
      },
      explanation: {
        ruleNote: 'Use subject + be + adjective.',
        example: 'I am ready. — Я готов.',
        wrongOptionReasons: [],
      },
    };
  }
  if (mode === 'speed_match') {
    const leftPrompts = ['one', 'two', 'three', 'four', 'five', 'six'];
    const rightOptions = ['один', 'два', 'три', 'четыре', 'пять', 'шесть'];
    return {
      taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
      payload: {
        prompt: 'Соедини пары',
        rightOptions,
        items: rightOptions.map((_, index) => ({
          prompt: leftPrompts[index],
          options: rightOptions,
          correctIndex: index,
          explanation: {
            ruleNote: `${leftPrompts[index]} has one exact match.`,
            example: `${leftPrompts[index]} — ${rightOptions[index]}.`,
            wrongOptionReasons: rightOptions.map((__, optionIndex) => (
              optionIndex === index ? '' : 'This is another pair.'
            )),
          },
        })),
      },
      explanation: {
        ruleNote: 'Match every English item to its Russian meaning.',
        example: 'one — один.',
        wrongOptionReasons: [],
      },
    };
  }
  return {
    taskId, mode, difficulty, isVoice: false, verified: true, tags: [],
    payload: {
      phrase: `phrase-${taskId}`,
      options: ['correct', 'wrong-1', 'wrong-2', 'wrong-3'],
      correctIndex: 0,
    },
    explanation: choiceExplanation,
  };
}

const paidEconomy: TournamentEconomyConfig = {
  entryGems: 3,
  botEntryGems: 3,
  weeklyBankRate: 0.2,
  prizeShares: [0.6, 0.25, 0.15],
  weeklyShares: [0.6, 0.25, 0.15],
};

const player = (id: string, score: number): TournamentPlayer => ({
  id,
  name: id,
  avatar: '',
  color: '#000000',
  score,
  streak: 0,
  entry: {
    kind: 'ticket',
    ticketsSpent: 0,
    bankContributionGems: 3,
    weekId: '2026-W31',
  },
});

describe('owner tournament round and tie contracts', () => {
  it('plans exactly 16 tasks with quota 4/4/3/3/2 and pairs only in rounds 2 and 4', () => {
    expect(TOURNAMENT_ROUND_MODE_PLAN).toEqual([
      ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'],
      ['guess_phrase', 'fill_gap', 'find_oddity', 'speed_match'],
      ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'],
      ['guess_phrase', 'fill_gap', 'translate_build', 'speed_match'],
    ]);

    const flat = TOURNAMENT_ROUND_MODE_PLAN.flat();
    expect(flat).toHaveLength(16);
    expect(TOURNAMENT_ROUND_MODE_PLAN.every((round) => new Set(round).size === 4)).toBe(true);
    expect(Object.fromEntries([
      'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
    ].map((mode) => [mode, flat.filter((entry) => entry === mode).length]))).toEqual({
      guess_phrase: 4,
      fill_gap: 4,
      find_oddity: 3,
      translate_build: 3,
      speed_match: 2,
    });
    expect(TOURNAMENT_ROUND_MODE_PLAN
      .map((round, index) => round.includes('speed_match') ? index + 1 : 0)
      .filter(Boolean)).toEqual([2, 4]);
  });

  it('assembles four unique tasks per round and ignores an invalid curated override', () => {
    const pool = [
      ...['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'].flatMap((mode) => [
        task(`${mode}-d1-a`, mode, 1),
        task(`${mode}-d1-b`, mode, 1),
        task(`${mode}-d2-a`, mode, 2),
        task(`${mode}-d2-b`, mode, 2),
        task(`${mode}-d2-c`, mode, 2),
      ]),
      task('speed-match-d1', 'speed_match', 1),
      task('speed-match-d2', 'speed_match', 2),
    ];
    const allGuess = pool.filter((candidate) => candidate.mode === 'guess_phrase').map(({ taskId }) => taskId);
    const curated = new Map([[1, allGuess]]);

    const rounds = buildTournamentRounds('room-owner-plan', pool, curated);
    expect(rounds).not.toBeNull();
    expect(rounds?.map((round) => round.taskIds)).toHaveLength(4);
    expect(rounds?.every((round) => round.taskIds.length === 4)).toBe(true);
    expect(new Set(rounds?.flatMap((round) => round.taskIds)).size).toBe(16);

    const modeByTaskId = new Map(pool.map((candidate) => [candidate.taskId, candidate.mode]));
    expect(rounds?.map((round) => round.taskIds.map((taskId) => modeByTaskId.get(taskId)))).toEqual(
      TOURNAMENT_ROUND_MODE_PLAN,
    );
  });

  it('does not let the retired Firestore percentage mix override room assembly', () => {
    const source = readFileSync(resolve(__dirname, 'tournaments.ts'), 'utf8');
    const loadStart = source.indexOf('async function loadResourcePool');
    const loadEnd = source.indexOf('type CuratedRoomSelection', loadStart);
    const buildStart = source.indexOf('export function buildTournamentRounds');
    const buildEnd = source.indexOf('function publicTournamentPlayer', buildStart);

    expect(source.slice(loadStart, loadEnd)).not.toContain("doc('modeMix')");
    expect(source.slice(buildStart, buildEnd)).not.toContain('roundMix');
    expect(source).not.toContain('mixToSlots');
  });

  it('keeps the inter-round leaderboard on screen for exactly five seconds', () => {
    expect(TOURNAMENT_TABLE_DISPLAY_MS).toBe(5_000);
  });

  it('assigns shared competition places and pays each tied player their positional split', () => {
    const players = [player('bob', 12), player('alice', 12), player('carol', 8)];
    expect(computePlacements(players).realPlacements.map(({ player: placed, place }) => [placed.id, place]))
      .toEqual([['alice', 1], ['bob', 1], ['carol', 3]]);

    const room: TournamentRoomDoc = {
      roomId: 'tie-room',
      slotId: 'slot',
      seed: 'seed',
      state: 'results',
      startsAt: 1,
      players,
      rounds: [],
      version: 0,
      createdAtMs: 1,
      stateDeadlineAtMs: 2,
      economySnapshot: paidEconomy,
    };
    const plan = planTournamentFinalization(room, 2);
    const effects = plan.playerEffects.map(({ playerId, place, reward }) => ({
      playerId, place, gems: reward.gems,
    }));

    expect(effects.map(({ playerId, place }) => [playerId, place])).toEqual([
      ['alice', 1], ['bob', 1], ['carol', 3],
    ]);
    expect(effects.map(({ gems }) => gems)).toEqual(plan.room.prizeGems);
    expect(effects[0].gems + effects[1].gems).toBeGreaterThan(effects[2].gems);
  });
});
