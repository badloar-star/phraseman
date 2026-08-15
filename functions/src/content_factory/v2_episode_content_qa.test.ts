// зачем: QA-отчёт — последний рубеж перед выпуском юнита: любая потеря трассируемости,
// сломанная кардинальность или несовместимость с профилем БЛОКИРУЕТ выпуск (fail-closed),
// а не превращается в предупреждение. RED до реализации.
import { qaV2EpisodeContent } from './v2_episode_content_qa';
import { compileV2RequiredSessions } from '../../../modules/learning-v2/content/session_compiler';
import {
  buildEnglishProfile,
  buildE1ContentItems,
  buildActivityBindingsForContentItems,
} from '../../../tests/support/learning_v2_content_builders';

function buildCompiledE1() {
  return compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
    activityBindings: buildActivityBindingsForContentItems(buildE1ContentItems()),
  });
}

const qa = (compiled: ReturnType<typeof buildCompiledE1>, optionalPracticeTemplates: Parameters<typeof qaV2EpisodeContent>[4] = []) =>
  qaV2EpisodeContent(
    compiled,
    buildE1ContentItems(),
    buildEnglishProfile(),
    buildActivityBindingsForContentItems(buildE1ContentItems()),
    optionalPracticeTemplates,
  );

test('passes a well-formed compiled unit', () => {
  const report = qa(buildCompiledE1());
  expect(report.ok).toBe(true);
  expect(report.blockingIssues).toEqual([]);
  expect(report.schemaVersion).toBe('v2-episode-content-quality-report.v1');
  expect(report.episodeId).toBe('ep-01');
  expect(report.checkedSessionIds).toHaveLength(12);
  expect(report.checkedContentItemIds.length).toBeGreaterThan(0);
});

test('blocks release when any card loses content or objective traceability', () => {
  const compiled = buildCompiledE1();
  const broken = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 0
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, contentItemId: 'missing' } : card) }
      : session),
  };
  expect(qa(broken)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_card_content_missing']),
  });
});

test('blocks release when a card is rebound to an unapproved activity', () => {
  const compiled = buildCompiledE1();
  const broken = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 0
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, activityId: 'activity-forged' } : card) }
      : session),
  };
  expect(qa(broken)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_card_activity_untraceable']),
  });
});

// зачем: доп. броня — все блокировки из плана: чужой objective, кардинальность
// сессий/карточек/семей, неподдержанная семья, дубль promptId, trained-подсказка
// в независимой проверке, слот с правом писать mastery.
test('blocks unknown objectives', () => {
  const compiled = buildCompiledE1();
  const broken = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 1
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, objectiveId: 'obj-alien' } : card) }
      : session),
  };
  expect(qa(broken)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_card_objective_missing']),
  });
});

test('blocks session cardinality violations', () => {
  const compiled = buildCompiledE1();
  const eleven = { ...compiled, sessions: compiled.sessions.slice(0, 11) };
  expect(qa(eleven)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_session_count_invalid']),
  });
  const thinCards = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 3
      ? { ...session, cards: session.cards.slice(0, 6) }
      : session),
  };
  expect(qa(thinCards)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_card_count_invalid']),
  });
});

test('blocks unsupported families and duplicate prompt ids', () => {
  const compiled = buildCompiledE1();
  const unsupported = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 2
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, family: 'branching_scene' as const } : card) }
      : session),
  };
  expect(qa(unsupported)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_family_unsupported']),
  });
  const duplicatePrompt = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 5
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 1 ? { ...card, promptId: session.cards[0].promptId } : card) }
      : session),
  };
  expect(qa(duplicatePrompt)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_prompt_duplicate']),
  });
});

test('blocks trained prompts inside independent no-support checks', () => {
  const compiled = buildCompiledE1();
  const trainedInMaster = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 11
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, promptNovelty: 'trained' as const } : card) }
      : session),
  };
  expect(qa(trainedInMaster)).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_trained_prompt_in_independent_check']),
  });
});

test('blocks any optional template that could write mastery or block progress', () => {
  const compiled = buildCompiledE1();
  const report = qa(compiled, [
    {
      slotId: 'optional-ep-01-cheat',
      episodeId: 'ep-01' as never,
      capabilityId: 'cheat-v1',
      family: 'quick_spoken_response',
      sourcePriority: 'current_unit',
      expectedSeconds: 60,
      requiredForProgress: true as unknown as false,
      canWriteMastery: true as unknown as false,
    },
  ]);
  expect(report).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['optional_template_progress_forbidden', 'optional_template_mastery_forbidden']),
  });
});
