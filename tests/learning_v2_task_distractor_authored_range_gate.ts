import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import type { LearningV2CourseSessionLearnerChildV1 } from '../modules/learning-v2/runtime/course_session_client_children_v1';

const AUDITED_THROUGH = 12;
const findings: string[] = [];
let auditedCards = 0;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").trim().toLowerCase();
}

function occurrences(haystack: string, needle: string): number {
  return needle ? haystack.split(needle).length - 1 : 0;
}

for (const source of AUTHORED_EPISODE_01_SESSIONS.filter(
  (candidate) => candidate.requiredSessionOrdinal <= AUDITED_THROUGH,
)) {
  const ordinal = source.requiredSessionOrdinal;
  const shard = buildSessionShardFromSource(source);
  const learner = buildSessionChildBodiesFromShard(
    shard,
    'ru',
    `lesson-01:session:${String(ordinal).padStart(2, '0')}`,
  ).learner as LearningV2CourseSessionLearnerChildV1;

  for (const card of shard.cards.filter((candidate) => candidate.taskSlot >= 4)) {
    auditedCards += 1;
    const interaction = learner.interactions.find(
      (candidate) => candidate.interactionId === card.cardId,
    );
    if (!interaction) {
      findings.push(`interaction_missing:s${ordinal}:${card.cardId}`);
      continue;
    }
    const options = interaction.responseOptions.map((option) => option.text);
    const distinct = new Set(options.map(normalized));
    if (distinct.size !== options.length)
      findings.push(`duplicate_visible_option:s${ordinal}:${card.cardId}`);

    if (card.family === 'phrase_builder' || card.family === 'listen_build_dictation') {
      const targetTokens = card.contentItem.target.text.split(/\s+/u);
      for (const token of targetTokens) {
        if (!options.some((option) => normalized(option) === normalized(token)))
          findings.push(`target_tile_missing:s${ordinal}:${card.cardId}:${token}`);
      }
      if (options.length <= targetTokens.length)
        findings.push(`builder_has_no_authored_trap:s${ordinal}:${card.cardId}`);
    }

    if (card.family === 'context_gap_grammar') {
      if (!interaction.prompt.includes('___'))
        findings.push(`context_gap_missing_gap:s${ordinal}:${card.cardId}`);
      if (options.length < 3)
        findings.push(`context_gap_insufficient_options:s${ordinal}:${card.cardId}`);
    }

    if (/\s/u.test(card.contentItem.target.text)) {
      const success = card.successMessageByLocale.ru;
      if (occurrences(success, card.contentItem.target.text) !== 1)
        findings.push(`phrase_success_target_count:s${ordinal}:${card.cardId}:${success}`);
    }
  }
}

if (findings.length > 0) {
  throw new Error(
    `LEARNING V2 AUTHORED TASK DISTRACTORS: HOLD\n${findings.join('\n')}`,
  );
}

process.stdout.write(
  `LEARNING V2 AUTHORED TASK DISTRACTORS: PASS sessions=1-${AUDITED_THROUGH} cards=${auditedCards}\n`,
);
