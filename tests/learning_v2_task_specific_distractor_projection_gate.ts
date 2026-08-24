import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import type { LearningV2CourseSessionLearnerChildV1 } from '../modules/learning-v2/runtime/course_session_client_children_v1';

const source = AUTHORED_EPISODE_01_SESSIONS.find(
  (candidate) => candidate.requiredSessionOrdinal === 11,
);
if (!source) throw new Error('session_11_source_missing');
const shard = buildSessionShardFromSource(source);
const learner = buildSessionChildBodiesFromShard(
  shard,
  'ru',
  'lesson-01:session:11',
).learner as LearningV2CourseSessionLearnerChildV1;

function task(fragment: string) {
  const found = learner.interactions.find((candidate) =>
    candidate.prompt.includes(fragment),
  );
  if (!found) throw new Error(`task_prompt_missing:${fragment}`);
  return found;
}

function options(fragment: string): readonly string[] {
  return task(fragment).responseOptions.map((option) => option.text);
}

function sameValues(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

const findings: string[] = [];
const tired = options('Ты уставший?');
if (!['Are', 'you', 'tired', 'Is', 'Do'].every((value) => tired.includes(value)))
  findings.push(`builder_not_close:${tired.join('|')}`);
if (tired.some((value) => value === 'isn’t' || value === 'aren’t'))
  findings.push(`builder_wrong_polarity:${tired.join('|')}`);

const happy = task('you happy');
if (!happy.prompt.includes('Ты счастлив?'))
  findings.push(`grammar_gap_meaning_missing:${happy.prompt}`);
const happyOptions = happy.responseOptions.map((option) => option.text);
if (!sameValues(happyOptions, ['Are', 'Is', 'Do']))
  findings.push(`grammar_gap_ambiguous:${happyOptions.join('|')}`);

const homeOptions = options('Ты дома?');
if (!sameValues(homeOptions, [
  'Are you at home?',
  'Are you in home?',
  'Are you on home?',
])) findings.push(`speed_match_not_minimal_pair:${homeOptions.join('|')}`);

const tiredCard = shard.cards.find(
  (candidate) => candidate.contentItem.target.text === 'Are you tired?',
);
if (!tiredCard) throw new Error('are_you_tired_card_missing');
const success = tiredCard.successMessageByLocale.ru;
if ((success.match(/Are you tired\?/gu) ?? []).length !== 1)
  findings.push(`success_target_repeated:${success}`);
if (/\?[.!]/u.test(success)) findings.push(`success_double_punctuation:${success}`);

if (findings.length > 0) {
  throw new Error(
    `LEARNING V2 TASK-SPECIFIC DISTRACTOR PROJECTION: HOLD\n${findings.join('\n')}`,
  );
}

process.stdout.write('LEARNING V2 TASK-SPECIFIC DISTRACTOR PROJECTION: PASS\n');
