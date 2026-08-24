import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import type { LearningV2CourseSessionLearnerChildV1 } from '../modules/learning-v2/runtime/course_session_client_children_v1';

function session11Projection(): Readonly<{
  learner: LearningV2CourseSessionLearnerChildV1;
  shard: ReturnType<typeof buildSessionShardFromSource>;
}> {
  const source = AUTHORED_EPISODE_01_SESSIONS.find(
    (candidate) => candidate.requiredSessionOrdinal === 11,
  );
  if (!source) throw new Error('session_11_source_missing');
  const shard = buildSessionShardFromSource(source);
  const children = buildSessionChildBodiesFromShard(
    shard,
    'ru',
    'lesson-01:session:11',
  );
  return {
    shard,
    learner: children.learner as LearningV2CourseSessionLearnerChildV1,
  };
}

function taskByPrompt(
  learner: LearningV2CourseSessionLearnerChildV1,
  fragment: string,
) {
  const task = learner.interactions.find((candidate) =>
    candidate.prompt.includes(fragment),
  );
  if (!task) throw new Error(`task_prompt_missing:${fragment}`);
  return task;
}

function optionTexts(
  learner: LearningV2CourseSessionLearnerChildV1,
  promptFragment: string,
): readonly string[] {
  return taskByPrompt(learner, promptFragment).responseOptions.map(
    (option) => option.text,
  );
}

describe('Learning V2 task-specific distractor projection', () => {
  it('uses close grammatical traps for Are you tired? phrase building', () => {
    const { learner } = session11Projection();
    const options = optionTexts(learner, 'Ты уставший?');

    expect(options).toEqual(
      expect.arrayContaining(['Are', 'you', 'tired', 'Is', 'Do']),
    );
    expect(options).not.toEqual(expect.arrayContaining(['isn’t', 'aren’t']));
  });

  it('keeps exactly one grammatical answer in the positive happy gap', () => {
    const { learner } = session11Projection();
    const task = taskByPrompt(learner, 'you happy');

    expect(task.prompt).toContain('Ты счастлив?');
    expect(task.responseOptions.map((option) => option.text).sort()).toEqual(
      ['Are', 'Do', 'Is'],
    );
  });

  it('changes only the preposition in the at home speed match', () => {
    const { learner } = session11Projection();
    const options = optionTexts(learner, 'Ты дома?');

    expect([...options].sort()).toEqual(
      ['Are you at home?', 'Are you in home?', 'Are you on home?'].sort(),
    );
  });

  it('shows the target exactly once in success feedback', () => {
    const { shard } = session11Projection();
    const card = shard.cards.find(
      (candidate) => candidate.contentItem.target.text === 'Are you tired?',
    );
    if (!card) throw new Error('are_you_tired_card_missing');

    expect(card.successMessageByLocale.ru).not.toMatch(
      /Are you tired\?\.\s*Are you tired\?/u,
    );
    expect(card.successMessageByLocale.ru.match(/Are you tired\?/gu)).toHaveLength(
      1,
    );
  });
});
