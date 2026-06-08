import {
  evaluatePipelineRun,
  CHECKER_ROLES,
  type PipelineRun,
} from '../app/plan_content_agent_pipeline';
import { buildPlanContentGenerationJob } from '../app/plan_content_generation_job';
import type { PlanContentDay, PlanContentPhrase } from '../app/plan_content_schema';

function phrase(id: string, constructions: string[]): PlanContentPhrase {
  const isHere = id === 'p1';
  return {
    id,
    english: isHere ? "I'm here." : 'I need help.',
    meaning: { ru: isHere ? 'Я здесь.' : 'Мне нужна помощь.' },
    constructions,
    explanation: {
      title: { ru: 'Коротко' },
      rule: { ru: 'Маленькое правило.' },
      why: { ru: 'Почему так.' },
      commonMistake: { ru: 'Частая ошибка.' },
    },
    words: isHere
      ? [
          { text: "I'm", partOfSpeech: 'to-be', distractors: ["You're", "He's", "We're", 'zz4', 'zz5'] },
          { text: 'here', partOfSpeech: 'adverb', distractors: ['there', 'near', 'home', 'zz4', 'zz5'] },
        ]
      : [
          { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'zz4', 'zz5'] },
          { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'have', 'see', 'zz4', 'zz5'] },
          { text: 'help', partOfSpeech: 'noun', distractors: ['water', 'time', 'food', 'zz4', 'zz5'] },
        ],
  };
}

function goodDay(): PlanContentDay {
  return {
    planId: 'voyazh',
    dayIndex: 1,
    topic: { ru: 'Аэропорт' },
    outcome: { ru: 'Сможешь попросить помощь.' },
    level: 'A1',
    prerequisiteLessons: [1],
    intro: [{ kind: 'why', title: { ru: 't' }, body: { ru: 'b' } }],
    phrases: [
      phrase('p1', ['to-be']),
      phrase('p2', ['present-simple']),
      phrase('p3', ['present-simple']),
      phrase('p4', ['to-be']),
      phrase('p5', ['present-simple']),
    ],
    vocabulary: [
      { word: 'here', partOfSpeech: 'adverb', translation: { ru: 'здесь' }, example: "I'm here." },
      { word: 'need', partOfSpeech: 'verb', translation: { ru: 'нужно' }, example: 'I need help.' },
      { word: 'help', partOfSpeech: 'noun', translation: { ru: 'помощь' }, example: 'I need help.' },
      { word: 'i', partOfSpeech: 'pronoun', translation: { ru: 'я' }, example: "I'm here." },
      { word: "i'm", partOfSpeech: 'to-be', translation: { ru: 'я (есть)' }, example: "I'm here." },
    ],
  };
}

const job = buildPlanContentGenerationJob({ planId: 'voyazh', dayIndex: 1, topic: 'Аэропорт', level: 'A1' });

function fullRun(over: Partial<PipelineRun> = {}): PipelineRun {
  return {
    job,
    drafts: {},
    judged: goodDay(),
    checkerReports: CHECKER_ROLES.map((role) => ({ role, verdict: 'pass' as const, notes: [] })),
    adversarial: { clean: true, attacks: [] },
    ...over,
  };
}

describe('plan content agent pipeline gate', () => {
  it('accepts a clean run (schema ok, within gate, all checkers pass, adversarial clean)', () => {
    const result = evaluatePipelineRun(fullRun());
    expect(result.accepted).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('blocks when there is no judged day', () => {
    const result = evaluatePipelineRun(fullRun({ judged: undefined }));
    expect(result.accepted).toBe(false);
    expect(result.blockers).toContain('no_judged_day');
  });

  it('blocks on schema issues', () => {
    const day = goodDay();
    day.phrases = day.phrases.slice(0, 2); // too few
    const result = evaluatePipelineRun(fullRun({ judged: day }));
    expect(result.accepted).toBe(false);
    expect(result.blockers.some((b) => b.startsWith('schema:too_few_phrases'))).toBe(true);
  });

  it('blocks when a phrase exceeds the grammar gate', () => {
    const day = goodDay();
    day.phrases[0] = phrase('p1', ['gerund']); // gerund not allowed on day 1
    const result = evaluatePipelineRun(fullRun({ judged: day }));
    expect(result.accepted).toBe(false);
    expect(result.blockers.some((b) => b.startsWith('gate:p1'))).toBe(true);
  });

  it('blocks when a checker rejects or asks for fixes', () => {
    const reject = fullRun({
      checkerReports: [
        { role: 'checker_grammar', verdict: 'reject', notes: ['bad tense'] },
        { role: 'checker_lexicon', verdict: 'pass', notes: [] },
        { role: 'checker_cefr_frequency', verdict: 'pass', notes: [] },
      ],
    });
    expect(evaluatePipelineRun(reject).blockers).toContain('checker_reject:checker_grammar');

    const fix = fullRun({
      checkerReports: [
        { role: 'checker_grammar', verdict: 'fix', notes: ['tweak'] },
        { role: 'checker_lexicon', verdict: 'pass', notes: [] },
        { role: 'checker_cefr_frequency', verdict: 'pass', notes: [] },
      ],
    });
    expect(evaluatePipelineRun(fix).blockers).toContain('checker_fix_pending:checker_grammar');
  });

  it('blocks when a checker role is missing', () => {
    const result = evaluatePipelineRun(fullRun({
      checkerReports: [{ role: 'checker_grammar', verdict: 'pass', notes: [] }],
    }));
    expect(result.blockers).toContain('checker_missing:checker_lexicon');
    expect(result.blockers).toContain('checker_missing:checker_cefr_frequency');
  });

  it('blocks when the adversarial skeptic breaks the day', () => {
    const result = evaluatePipelineRun(fullRun({
      adversarial: { clean: false, attacks: ['phrase p3 sounds bookish'] },
    }));
    expect(result.accepted).toBe(false);
    expect(result.blockers.some((b) => b.startsWith('adversarial:'))).toBe(true);
  });

  it('blocks when the adversarial pass never ran', () => {
    const result = evaluatePipelineRun(fullRun({ adversarial: undefined }));
    expect(result.blockers).toContain('adversarial_missing');
  });
});
