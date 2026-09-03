import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import type { LearningV2CourseSessionLearnerChildV1 } from '../modules/learning-v2/runtime/course_session_client_children_v1';

const source = AUTHORED_EPISODE_01_SESSIONS.find(
  (candidate) => candidate.requiredSessionOrdinal === 12,
);
if (!source) throw new Error('session_12_source_missing');
const shard = buildSessionShardFromSource(source);
const learner = buildSessionChildBodiesFromShard(
  shard,
  'ru',
  'lesson-01:session:12',
).learner as LearningV2CourseSessionLearnerChildV1;

function interactionFor(target: string) {
  const card = shard.cards.find(
    (candidate) => candidate.taskSlot >= 4 && candidate.contentItem.target.text === target,
  );
  if (!card) throw new Error(`task_target_missing:${target}`);
  const interaction = learner.interactions.find((candidate) => candidate.interactionId === card.cardId);
  if (!interaction) throw new Error(`task_interaction_missing:${target}`);
  return { card, interaction };
}

function sameValues(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

const findings: string[] = [];
const loud = interactionFor('loud');
if (!sameValues(loud.interaction.responseOptions.map((option) => option.text), [
  'loud', 'friendly', 'helpful', 'ready',
])) findings.push(`listen_choose_options:${loud.interaction.responseOptions.map((option) => option.text).join('|')}`);

const helpful = interactionFor('She is helpful');
if (!helpful.interaction.prompt.includes('Она готова помочь.'))
  findings.push(`grammar_gap_meaning_missing:${helpful.interaction.prompt}`);
if (!sameValues(helpful.interaction.responseOptions.map((option) => option.text), [
  'helpful', 'loud', 'friendly', 'ready',
])) findings.push(`grammar_gap_options:${helpful.interaction.responseOptions.map((option) => option.text).join('|')}`);

const ready = interactionFor('She is ready');
if (!sameValues(ready.interaction.responseOptions.map((option) => option.text), [
  'She', 'is', 'ready', 'He', 'loud', 'helpful',
])) findings.push(`builder_tiles:${ready.interaction.responseOptions.map((option) => option.text).join('|')}`);

for (const { card } of [loud, helpful, ready]) {
  const success = card.successMessageByLocale.ru;
  if ((success.match(new RegExp(card.contentItem.target.text, 'gu')) ?? []).length !== 1)
    findings.push(`success_target_repeated:${card.cardId}:${success}`);
}

if (findings.length > 0) {
  throw new Error(
    `LEARNING V2 TASK-SPECIFIC DISTRACTOR PROJECTION: HOLD\n${findings.join('\n')}`,
  );
}

process.stdout.write('LEARNING V2 TASK-SPECIFIC DISTRACTOR PROJECTION: PASS\n');
