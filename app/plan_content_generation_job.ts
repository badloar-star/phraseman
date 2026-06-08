import type { CefrBand } from './lesson_grammar_map';
import { lessonGateForDay, allowedConstructionsForDay } from './plan_lesson_gate';
import { constructionsUpToLesson } from './lesson_grammar_map';

/**
 * A generation job: the brief handed to the content-agent pipeline for ONE plan day.
 *
 * The "brain" that fills this brief is Claude (in-session, build-time). The runtime
 * never calls an LLM — generated content is committed statically to the bundle. This
 * module only describes the job inputs and computes the grammar gate, so the agent
 * pipeline and the day brief stay in sync with lesson_grammar_map.
 *
 * Pure module.
 */

export type PlanContentGenerationJob = {
  planId: string;
  dayIndex: number;
  /** Real-life situation/topic for the day (from the plan's topic list). */
  topic: string;
  /** Target CEFR band for the day's phrases. */
  level: CefrBand;
  /** Max lesson whose grammar this day may use (computed from the gate). */
  lessonGate: number;
  /** Construction tags the agents are ALLOWED to use this day. */
  allowedConstructions: string[];
  /** Lessons the learner is expected to have available by this day. */
  availableLessons: number[];
  /** How many phrases the day should contain (within schema bounds). */
  targetPhraseCount: number;
  /** How many key vocabulary words the day should surface. */
  targetVocabCount: number;
};

export type BuildJobInput = {
  planId: string;
  dayIndex: number;
  topic: string;
  level: CefrBand;
  targetPhraseCount?: number;
  targetVocabCount?: number;
};

const DEFAULT_PHRASE_COUNT = 6;
const DEFAULT_VOCAB_COUNT = 6;

/** Build a generation job, deriving the grammar gate from the day index. */
export function buildPlanContentGenerationJob(input: BuildJobInput): PlanContentGenerationJob {
  const lessonGate = lessonGateForDay(input.dayIndex);
  const allowedConstructions = [...allowedConstructionsForDay(input.dayIndex)].sort();
  const availableLessons = Array.from({ length: lessonGate }, (_, index) => index + 1);

  return {
    planId: input.planId,
    dayIndex: input.dayIndex,
    topic: input.topic,
    level: input.level,
    lessonGate,
    allowedConstructions,
    availableLessons,
    targetPhraseCount: input.targetPhraseCount ?? DEFAULT_PHRASE_COUNT,
    targetVocabCount: input.targetVocabCount ?? DEFAULT_VOCAB_COUNT,
  };
}

/**
 * Human-readable brief the agent pipeline prints/embeds when asking Claude to write a
 * day. Keeps the style + gate constraints explicit in one place.
 */
export function describeJobBrief(job: PlanContentGenerationJob): string {
  const constructions = job.allowedConstructions.length > 0
    ? job.allowedConstructions.join(', ')
    : '(none — keep it minimal)';
  return [
    `План: ${job.planId}, день ${job.dayIndex} — «${job.topic}»`,
    `Уровень: ${job.level}. Можно опираться на уроки 1–${job.lessonGate}.`,
    `Разрешённые конструкции: ${constructions}.`,
    `Нужно ${job.targetPhraseCount} живых фраз и ${job.targetVocabCount} ключевых слов.`,
    'Стиль: дружелюбный тренер, на «ты», полные объяснения (правило+почему+ошибка), ≤24 слов.',
  ].join('\n');
}

/** Sanity: the gate's allowed constructions equal lessons-up-to-gate. */
export function jobGateIsConsistent(job: PlanContentGenerationJob): boolean {
  const expected = constructionsUpToLesson(job.lessonGate);
  return job.allowedConstructions.every((c) => expected.has(c));
}
