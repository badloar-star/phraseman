import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('level exam v2 route contract', () => {
  it('routes English exams through the new engine while preserving the gated French runtime', () => {
    const route = read('app/level_exam.tsx');
    expect(route).toContain('<LevelExamV2');
    expect(route).toContain('if (!isFrenchExam && !frenchExamBlocked)');
    expect(route).toContain('loadFrenchRemoteLevelExamQuestions');
  });

  it('connects persisted attempts, wall-clock timeout, scoring, and every UI format', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).toContain('buildLevelExamBlueprint');
    expect(route).toContain('loadActiveLevelExamAttempt');
    expect(route).toContain('persistActiveLevelExamAttempt');
    expect(route).toContain('restoreLevelExamAttempt');
    expect(route).toContain('remainingLevelExamMs');
    expect(route).toContain("finishExam('timeout')");
    expect(route).toContain('scoreLevelExam');
    expect(route).toContain('<ContextChoiceQuestion');
    expect(route).toContain('<PhraseBuilderQuestion');
    expect(route).toContain('<MeaningChoiceQuestion');
    expect(route).toContain('<SpotErrorQuestion');
    expect(route).toContain('<SpeedMatchQuestion');
  });

  it('removes immediate correctness reveals and makes every attempt exactly 30 scored units', () => {
    const route = read('components/level-exam/LevelExamV2.tsx');
    expect(route).not.toContain('showAnswer');
    expect(route).not.toContain('isOptCorrect');
    expect(route).toContain('scoredUnitIds.length !== 30');
  });
});
