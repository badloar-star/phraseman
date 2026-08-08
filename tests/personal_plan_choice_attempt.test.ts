import fs from 'fs';
import path from 'path';

import { beginPersonalPlanChoiceAttempt } from '../app/personal_plan_choice_attempt';

describe('beginPersonalPlanChoiceAttempt', () => {
  it('accepts the correct answer while the first wrong attempt is still saving', () => {
    const first = beginPersonalPlanChoiceAttempt(null, {
      itemKey: 'task::phrase-2',
      isCorrect: false,
    });

    expect(first.accepted).toBe(true);
    expect(first.shouldPersist).toBe(true);

    const correction = beginPersonalPlanChoiceAttempt(first.state, {
      itemKey: 'task::phrase-2',
      isCorrect: true,
    });

    expect(correction.accepted).toBe(true);
    expect(correction.shouldPersist).toBe(false);
    expect(correction.state.resolved).toBe(true);
  });

  it('keeps choice tiles interactive while the first attempt persists', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'personal_plan_exercise.tsx'),
      'utf8',
    );
    const submitChoice = source.slice(
      source.indexOf('const submit = async (answer: string)'),
      source.indexOf('const submitListenBuild = async'),
    );

    expect(submitChoice).toContain('beginPersonalPlanChoiceAttempt');
    expect(submitChoice).not.toMatch(/!item \|\| !session \|\| saving \|\| done/);
    expect(source).toContain("disabled={lastResult === 'correct'}");
  });
});
