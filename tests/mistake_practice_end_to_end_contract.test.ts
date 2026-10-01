import fs from 'node:fs';
import path from 'node:path';
import { captureObjectiveAttempt } from '../app/mistake_practice_capture';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from '../app/mistake_practice_store';
import { settleMistakePracticeAnswerRewards } from '../app/mistake_practice_rewards';

// зачем: репозиторий Learning V2 тянет озвучку на expo-asset (ESM), которую jest не
// парсит. Тест передаёт свой claimCorrectionStar, поэтому боевая запись кошелька не нужна.
jest.mock('../app/learning_v2_owner_repository_runtime', () => ({
  commitMistakeCorrectionWalletComposite: jest.fn(async () => ({ granted: false })),
}));
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  advanceMistakePracticeSession,
  buildMistakePracticeSession,
  mistakePracticeLengthOptions,
} from '../modules/mistake-practice/session';

const ROOT = path.resolve(__dirname, '..');

function createStorage(): MistakePracticeStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys: async () => [...values.keys()],
  };
}

describe('mistake practice end-to-end contract', () => {
  test('lesson error reaches Cards, requeues adaptively, corrects across days and grants one star', async () => {
    const persistence = createStorage();
    const accountScope = 'owner-e2e';
    for (let index = 0; index < 5; index += 1) {
      await captureObjectiveAttempt({
        accountScope,
        attemptId: `lesson-attempt-${index}`,
        studyTarget: 'en',
        verdict: 'wrong',
        objective: true,
        content: {
          sourceKind: 'lesson_phrase',
          sourceId: `lesson-01:phrase-${index}`,
          lessonId: 'lesson-01',
          canonicalTarget: `target phrase ${index}`,
          sourceMeaning: `значение ${index}`,
          distractors: ['other one', 'other two', 'other three'],
        },
        facet: { kind: 'meaning', expected: `target phrase ${index}` },
      }, { storage: persistence });
    }

    let journal = await loadMistakeEventJournal({ accountScope, studyTarget: 'en', storage: persistence });
    let projection = projectMistakes(journal.events);
    expect([...projection.items.values()].filter((item) => item.status === 'active')).toHaveLength(5);

    const session = buildMistakePracticeSession({
      items: [...projection.items.values()], requestedLength: '5', nowMs: Date.now(),
    });
    expect(session.initialCount).toBe(5);
    const failed = advanceMistakePracticeSession(session, { attemptId: 'practice-fail-1', correct: false });
    expect(failed.requeue).toMatchObject({ kind: 'requeue' });
    expect(failed.session.queue.slice(1).findIndex((entry) =>
      entry.mistakeId === session.queue[0]?.mistakeId,
    )).toBeGreaterThanOrEqual(2);

    const correctedItem = projection.items.get(session.queue[0]!.mistakeId)!;
    const qualifiedBaseMs = correctedItem.lastEventAtMs + 1_000;
    const days = ['2026-08-18', '2026-08-19', '2026-08-20'] as const;
    const modes = ['lesson_typing', 'lesson_scripted_speech', 'lesson_typing'] as const;
    for (let index = 0; index < 3; index += 1) {
      await appendMistakeEvent({
        accountScope, studyTarget: 'en', storage: persistence,
        event: {
          eventId: `qualified-${index}`,
          mistakeId: correctedItem.mistakeId,
          cycleId: correctedItem.cycleId,
          type: 'practice_answered',
          occurredAtMs: qualifiedBaseMs + index,
          studyTarget: 'en',
          payload: {
            correct: true,
            independent: true,
            localDay: days[index],
            mode: modes[index],
            support: 'production',
          },
        },
      });
    }
    journal = await loadMistakeEventJournal({ accountScope, studyTarget: 'en', storage: persistence });
    projection = projectMistakes(journal.events);
    expect(projection.items.get(correctedItem.mistakeId)?.status).toBe('corrected');

    const claimCorrectionStar = jest.fn(async () => ({ granted: true as const }));
    // зачем: опыт (XP) за исправление ошибок снят в 2.0 — у наград нет registerXP.
    const appendRewardEvent = jest.fn(async () => undefined);
    const rewardInput = {
      accountScope,
      studyTarget: 'en' as const,
      mistakeId: correctedItem.mistakeId,
      cycleId: correctedItem.cycleId,
      attemptId: 'qualified-2',
      correct: true,
      independent: true,
      support: 'production' as const,
      beforeStatus: 'active' as const,
      afterStatus: 'corrected' as const,
    };
    await settleMistakePracticeAnswerRewards(rewardInput, {
      claimCorrectionStar, appendRewardEvent,
    });
    await settleMistakePracticeAnswerRewards({
      ...rewardInput, attemptId: 'qualified-replay', beforeStatus: 'corrected',
    }, { claimCorrectionStar, appendRewardEvent });
    expect(claimCorrectionStar).toHaveBeenCalledTimes(1);
  });

  // зачем: вход «Ошибки» из капсулы «Карточек» ушёл вместе с капсулой (2.0); ошибки
  // открываются с Главной (D144). Здесь остаётся только повтор ошибок в уроке.
  test('keeps immediate lesson retry separate', () => {
    const lesson = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

    expect(lesson).toContain('const ERROR_REPLAY_DELAY_ANSWERS = 2;');
    expect(lesson).toContain('errorQueueRef.current.push(progressCell);');
    expect(mistakePracticeLengthOptions(15).map((option) => option.id)).toEqual(['5', '10', '15', 'all']);
  });
});
