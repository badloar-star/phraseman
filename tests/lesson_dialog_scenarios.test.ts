import fs from 'fs';
import path from 'path';
import { getScenarioById, getPublicDialogScenarios } from '../app/ai_dialog_scenarios';
import { getLessonDialogScenarioId } from '../app/lesson_dialog_scenarios';

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
  it('maps lessons 18 and 20 to hidden AI scenarios', () => {
    expect(getLessonDialogScenarioId(18)).toBe('lesson18_restaurant_table');
    expect(getLessonDialogScenarioId(20)).toBe('lesson20_lost_bag');

    expect(getPublicDialogScenarios().map((scenario) => scenario.id)).not.toContain('lesson18_restaurant_table');
    expect(getPublicDialogScenarios().map((scenario) => scenario.id)).not.toContain('lesson20_lost_bag');
  });

  it('uses phrase ids that exist in the lesson source', () => {
    for (const lessonId of [18, 20]) {
      const scenario = getScenarioById(getLessonDialogScenarioId(lessonId)!);
      expect(scenario?.sourceLessonId).toBe(lessonId);
      const phraseIds = phraseIdsForLesson(lessonId);
      for (const phraseId of scenario?.requiredPhraseIds ?? []) {
        expect(phraseIds.has(phraseId)).toBe(true);
      }
    }
  });
});
