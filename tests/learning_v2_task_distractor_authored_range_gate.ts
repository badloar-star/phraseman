import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';
import { selectTaskDistractors } from '../modules/learning-v2/content/source/task_specific_distractors_v1';
import type { LearningV2CourseSessionLearnerChildV1 } from '../modules/learning-v2/runtime/course_session_client_children_v1';

const AUDITED_THROUGH = 11;
const findings: string[] = [];
let auditedCards = 0;
let auditedSelections = 0;
let auditedSuccessCopies = 0;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").trim().toLowerCase();
}

function sameValues(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify(actual.map(normalized).sort()) ===
    JSON.stringify(expected.map(normalized).sort());
}

function occurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
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

  for (const card of shard.cards) {
    for (const [locale, success] of Object.entries(card.successMessageByLocale)) {
      auditedSuccessCopies += 1;
      if (occurrences(success, card.contentItem.target.text) !== 1) {
        findings.push(
          `success_target_count:s${ordinal}:${card.cardId}:${locale}:${success}`,
        );
      }
      if (/\?[.!]/u.test(success)) {
        findings.push(
          `success_double_punctuation:s${ordinal}:${card.cardId}:${locale}:${success}`,
        );
      }
    }

    if (card.taskSlot < 4) continue;
    auditedCards += 1;
    const interaction = learner.interactions.find(
      (candidate) => candidate.interactionId === card.cardId,
    );
    if (!interaction) {
      findings.push(`interaction_missing:s${ordinal}:${card.cardId}`);
      continue;
    }

    if (![
      'phrase_builder',
      'listen_build_dictation',
      'context_gap_grammar',
      'speed_match',
      ...([2, 3].includes(ordinal) ? ['listen_choose'] : []),
    ].includes(card.family)) continue;

    auditedSelections += 1;
    const selection = selectTaskDistractors({
      family: card.family,
      target: card.contentItem.target.text,
      rejectedAnswers: card.contentItem.rejectedAnswers,
      sessionOrdinal: ordinal,
    });
    const actualOptions = interaction.responseOptions.map((option) => option.text);

    if (card.family === 'phrase_builder' || card.family === 'listen_build_dictation') {
      for (const distractor of selection.distractors) {
        if (!actualOptions.some(
          (option) => normalized(option) === normalized(distractor.sourceValue),
        )) {
          findings.push(
            `builder_trap_missing:s${ordinal}:${card.cardId}:${distractor.sourceValue}`,
          );
        }
      }
      continue;
    }

    if (card.family === 'context_gap_grammar') {
      const expected = [
        selection.correct,
        ...selection.distractors.map((item) => item.sourceValue),
      ];
      if (!sameValues(actualOptions, expected)) {
        findings.push(
          `grammar_gap_options:s${ordinal}:${card.cardId}:${actualOptions.join('|')}`,
        );
      }
      const ruMeaning = card.contentItem.learnerMeanings.find(
        (meaning) => meaning.locale === 'ru',
      )?.value;
      if (!ruMeaning || !interaction.prompt.includes(ruMeaning)) {
        findings.push(
          `grammar_gap_meaning_missing:s${ordinal}:${card.cardId}:${interaction.prompt}`,
        );
      }
      continue;
    }

    const expected = [
      card.contentItem.target.text,
      ...selection.distractors.map((item) => item.value),
    ];
    if (!sameValues(actualOptions, expected)) {
      findings.push(
        `speed_match_not_minimal:s${ordinal}:${card.cardId}:${actualOptions.join('|')}`,
      );
    }
  }
}

if (findings.length > 0) {
  throw new Error(
    `LEARNING V2 AUTHORED TASK DISTRACTORS: HOLD\n${findings.join('\n')}`,
  );
}

process.stdout.write(
  `LEARNING V2 AUTHORED TASK DISTRACTORS: PASS ` +
  `sessions=1-${AUDITED_THROUGH} cards=${auditedCards} ` +
  `taskSelections=${auditedSelections} localizedSuccess=${auditedSuccessCopies}\n`,
);
