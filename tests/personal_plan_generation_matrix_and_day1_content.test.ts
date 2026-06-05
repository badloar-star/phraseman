import fs from 'fs';
import path from 'path';

import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';

const ROOT = path.resolve(__dirname, '..');

const DAY1_LESSON_IDS = [
  'mitap_d001_content_unit',
  'voyazh_d001_content_unit',
  'impuls_d001_content_unit',
  'echo_d001_content_unit',
];

describe('personal plan generation matrix and first content batch', () => {
  it('documents the generator matrix with full day pools, time-tier visibility, and no lesson tasks', () => {
    const matrix = fs.readFileSync(path.join(ROOT, 'docs', 'personal-plans-generation-matrix.md'), 'utf8');
    const normalized = matrix.toLowerCase();

    expect(normalized).toContain('personal plans are separate tasks');
    expect(normalized).toContain('selected daily time selects the initial visible workload');
    expect(normalized).toContain('full maximum task pool');
    expect(normalized).toContain('add more tasks');
    expect(normalized).toContain('lessons are not plan tasks');
    expect(normalized).toContain('week 1');
    expect(normalized).toContain('day 7');
    expect(normalized).toContain('mitap');
    expect(normalized).toContain('voyazh');
    expect(normalized).toContain('impuls');
    expect(normalized).toContain('echo');
    expect(normalized).toContain('plan_phrase_build');
    expect(normalized).toContain('plan_listen_build');
    expect(normalized).toContain('plan_phrase_recall');
    expect(normalized).toContain('5 minutes: 2-4 visible tasks');
    expect(normalized).toContain('20 minutes: 5-6 visible tasks');
    expect(normalized).not.toContain('5 minutes = 1');
    expect(normalized).not.toContain('10 minutes = 3');
    expect(normalized).not.toContain('all core modes');
  });

  it('starts generation with concrete day-1 phrase packets for every non-Gavan plan', () => {
    for (const lessonId of DAY1_LESSON_IDS) {
      const lesson = getPersonalPlanPhraseLesson(lessonId);
      expect(lesson).not.toBeNull();
      expect(lesson?.id).toBe(lessonId);
      expect(lesson?.phrases).toHaveLength(6);

      const userFacingCopy = JSON.stringify({
        title: lesson?.title,
        subtitle: lesson?.subtitle,
        rationale: lesson?.rationale,
        phrases: lesson?.phrases,
      }).toLowerCase();

      expect(userFacingCopy).not.toMatch(/placeholder|scaffold|generated|normal lesson shell|exercise mode/i);
      expect(new Set(lesson?.phrases.map((phrase) => phrase.english))).toHaveProperty('size', 6);
      expect(lesson?.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);
    }
  });

  it('makes day-1 packets scenario-specific instead of reusing the same fallback copy', () => {
    const mitap = getPersonalPlanPhraseLesson('mitap_d001_content_unit')!;
    const voyazh = getPersonalPlanPhraseLesson('voyazh_d001_content_unit')!;
    const impuls = getPersonalPlanPhraseLesson('impuls_d001_content_unit')!;
    const echo = getPersonalPlanPhraseLesson('echo_d001_content_unit')!;

    expect(mitap.phrases.map((phrase) => phrase.english).join(' ')).toContain('next steps');
    expect(voyazh.phrases.map((phrase) => phrase.english).join(' ')).toContain('help');
    expect(impuls.phrases.map((phrase) => phrase.english).join(' ')).toContain('story');
    expect(echo.phrases.map((phrase) => phrase.english).join(' ')).toContain('repeat');
  });
});
