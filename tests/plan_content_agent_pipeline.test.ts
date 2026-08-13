import {
  evaluatePipelineRun,
  CHECKER_ROLES,
  type PipelineRun,
} from '../app/plan_content_agent_pipeline';
import { buildPlanContentGenerationJob, describeJobBrief } from '../app/plan_content_generation_job';
import type { LocalizedText, PlanContentDay, PlanContentPhrase } from '../app/plan_content_schema';

function localized(label: string): LocalizedText {
  return {
    ru: `ru ${label}`,
    uk: `uk ${label}`,
    es: `es ${label}`,
    'pt-BR': `pt ${label}`,
    vi: `vi ${label}`,
    id: `id ${label}`,
    tr: `tr ${label}`,
    pl: `pl ${label}`,
  };
}

function phrase(id: string, constructions: string[]): PlanContentPhrase {
  const isHere = id === 'p1';
  return {
    id,
    english: isHere ? "I'm here." : 'I need help.',
    meaning: localized(isHere ? 'i am here' : 'i need help'),
    constructions,
    explanation: {
      title: localized(`${id} title`),
      rule: localized(`${id} rule`),
      why: localized(`${id} why`),
      commonMistake: localized(`${id} mistake`),
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
    topic: localized('airport'),
    outcome: localized('ask for help'),
    level: 'A1',
    prerequisiteLessons: [1],
    intro: [{
      kind: 'why',
      title: localized('intro title'),
      body: localized('intro body'),
      examples: [{ en: "I'm here.", gloss: localized('example gloss') }],
    }],
    phrases: [
      phrase('p1', ['to-be']),
      phrase('p2', ['present-simple']),
      phrase('p3', ['present-simple']),
      phrase('p4', ['to-be']),
      phrase('p5', ['present-simple']),
    ],
    vocabulary: [
      { word: 'here', partOfSpeech: 'adverb', translation: localized('here'), example: "I'm here." },
      { word: 'need', partOfSpeech: 'verb', translation: localized('need'), example: 'I need help.' },
      { word: 'help', partOfSpeech: 'noun', translation: localized('help'), example: 'I need help.' },
      { word: 'i', partOfSpeech: 'pronoun', translation: localized('i'), example: "I'm here." },
      { word: "i'm", partOfSpeech: 'to-be', translation: localized('i am'), example: "I'm here." },
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

  it('blocks a generated day whose authored words omit a phrase token', () => {
    const day = goodDay();
    day.phrases[1] = phrase('p2', ['present-simple']);
    day.phrases[1].words = day.phrases[1].words.slice(1);

    const result = evaluatePipelineRun(fullRun({ judged: day }));

    expect(result.accepted).toBe(false);
    expect(result.blockers).toContain('word_alignment:phrase_words_misaligned:p2');
  });

  it('blocks when a generated day does not isolate every source locale', () => {
    const day = goodDay();
    delete day.phrases[0].meaning['pt-BR'];
    const result = evaluatePipelineRun(fullRun({ judged: day }));
    expect(result.accepted).toBe(false);
    expect(result.blockers).toContain('locale:missing_locale:phrases[0].meaning:pt-BR');
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

  it('puts source-locale isolation rules into the AI generation brief', () => {
    const brief = describeJobBrief(job);
    expect(brief).toContain('Source locales: ru, uk, es, pt-BR, vi, id, tr, pl');
    expect(brief).toContain('Locale isolation: ru text only in ru');
    expect(brief).toContain('Do not copy RU/UK/ES into planned locales');
    expect(brief).toContain('Do not use alias keys like ptBr/pt_BR/vn');
    expect(brief).toContain('Protected English anchors');
    expect(brief).toContain('keep those English anchors exactly in every locale');
  });
});
