import fs from 'fs';
import path from 'path';
import { getScenarioById, getPublicDialogScenarios } from '../app/ai_dialog_scenarios';
import { getLessonDialogScenarioId, lessonDialogLockedHint } from '../app/lesson_dialog_scenarios';

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_data_17_24.ts'), 'utf8');

function phraseIdsForLesson(lessonId: number): Set<string> {
  const match = lessonSource.match(
    new RegExp(`export const LESSON_${lessonId}_PHRASES:[\\s\\S]*?= \\[([\\s\\S]*?)\\n\\];`),
  );
  if (!match) throw new Error(`LESSON_${lessonId}_PHRASES not found`);
  const idRegex = new RegExp(`id:\\s*['"](lesson${lessonId}_phrase_\\d+)['"]`, 'g');
  return new Set(Array.from(match[1].matchAll(idRegex), (row) => row[1]));
}

describe('lesson dialog scenarios', () => {
  it('maps every shipped lesson to a lesson-specific AI scenario id', () => {
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      expect(getLessonDialogScenarioId(lessonId)).toBe(`lesson${lessonId}_practice_dialog`);
    }
    expect(getLessonDialogScenarioId(0)).toBeUndefined();
    expect(getLessonDialogScenarioId(33)).toBeUndefined();
  });

  it('uses a beginner-clear locked hint without internal phrase counters', () => {
    const hint = lessonDialogLockedHint('ru');
    expect(hint).toBe('Диалог откроется, когда ты пройдёшь этот урок на золото.');
    expect(hint).not.toContain('50 фраз');
  });

  it('keeps dedicated catalog scenarios hidden from the public AI dialog home', () => {
    expect(getPublicDialogScenarios().map((scenario) => scenario.id)).not.toContain('lesson18_restaurant_table');
    expect(getPublicDialogScenarios().map((scenario) => scenario.id)).not.toContain('lesson20_lost_bag');
  });

  it('uses phrase ids that exist in the lesson source', () => {
    for (const lessonId of [18, 20]) {
      const legacyScenarioId = lessonId === 18 ? 'lesson18_restaurant_table' : 'lesson20_lost_bag';
      const scenario = getScenarioById(legacyScenarioId);
      expect(scenario?.sourceLessonId).toBe(lessonId);
      const phraseIds = phraseIdsForLesson(lessonId);
      for (const phraseId of scenario?.requiredPhraseIds ?? []) {
        expect(phraseIds.has(phraseId)).toBe(true);
      }
    }
  });
});
