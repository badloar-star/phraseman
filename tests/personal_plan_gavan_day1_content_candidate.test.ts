import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ProductionBridge,
  validateGavanDay1ProductionBridge,
} from '../app/personal_plan_gavan_day1_production_bridge';
import {
  buildGavanDay1ContentCandidate,
  validateGavanDay1ContentCandidate,
} from '../app/personal_plan_gavan_day1_content_candidate';
import { validatePersonalPlanContentQuality } from '../app/personal_plan_content_quality_contract';

const NARROW_OR_PERSONAL_RE =
  /(?:apartment|viewing|rent|landlord|bank|doctor|passport|visa|phone number|email|address|[0-9]{3,}|@)/i;
const REJECTED_RUSSIAN_RE =
  /(?:имя|телефон|номер|почта|email|адрес|квартира|просмотр|врач|банк|паспорт|виза|анкета|регистрация)/i;
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/;

describe('Gavan day 1 content candidate', () => {
  it('contains broad socially safe day-one phrases instead of niche personal-data content', () => {
    const candidate = buildGavanDay1ContentCandidate();

    expect(candidate.dayId).toBe('gavan-week1-day1');
    expect(candidate.status).toBe('candidate');
    expect(candidate.phrases.map((phrase) => phrase.english)).toEqual([
      "I'm here.",
      'I need a minute.',
      'Could you repeat that?',
      "I don't understand yet.",
      'Can you help me?',
    ]);

    const allText = JSON.stringify(candidate.phrases);
    expect(allText).not.toMatch(NARROW_OR_PERSONAL_RE);
    expect(allText).not.toMatch(REJECTED_RUSSIAN_RE);
    expect(allText).not.toMatch(MOJIBAKE_RE);
  });

  it('uses universal day-one survival phrases with no private-data drills', () => {
    const candidate = buildGavanDay1ContentCandidate();

    expect(candidate.focusTags).toEqual([
      'arrival',
      'pause',
      'repeat_request',
      'understanding',
      'basic_help',
    ]);
    expect(candidate.exerciseGoals).toEqual([
      'phrase_build',
      'missing_word',
      'choose_natural_phrase',
      'meaning_check',
      'phrase_recall',
    ]);
    expect(candidate.phrases.map((phrase) => phrase.russian)).toEqual([
      'Я здесь.',
      'Мне нужна минута.',
      'Можете повторить?',
      'Я пока не понимаю.',
      'Можете помочь?',
    ]);
  });

  it('keeps explanations readable and grounded without guessing wrong answers', () => {
    const candidate = buildGavanDay1ContentCandidate();

    for (const phrase of candidate.phrases) {
      expect(phrase.explanations).toHaveLength(1);
      const explanation = phrase.explanations![0];
      expect(explanation.body).not.toMatch(/(?:вы выбрали|не тот вариант|selected|option)/i);
      expect(explanation.body.length).toBeLessThanOrEqual(220);
      expect(explanation.covers).toEqual([
        ...(phrase.newWords ?? []),
        ...(phrase.firstSeenConstructions ?? []),
      ]);
    }
  });

  it('passes the existing phrase quality gate for every phrase', () => {
    const candidate = buildGavanDay1ContentCandidate();

    expect(candidate.phrases.map((phrase) =>
      validatePersonalPlanContentQuality(phrase, candidate.scope),
    )).toEqual(candidate.phrases.map(() => ({ valid: true, issues: [] })));
    expect(validateGavanDay1ContentCandidate(candidate).valid).toBe(true);
  });

  it('covers every new word and first-seen construction with explanation text', () => {
    const candidate = buildGavanDay1ContentCandidate();

    for (const phrase of candidate.phrases) {
      const explanationText = JSON.stringify(phrase.explanations ?? []).toLowerCase();
      for (const word of phrase.newWords ?? []) {
        expect(explanationText).toContain(word.toLowerCase());
      }
      for (const construction of phrase.firstSeenConstructions ?? []) {
        expect(explanationText).toContain(construction.toLowerCase());
      }
    }
  });

  it('uses polished explanation cards with two or three short human sentences', () => {
    const candidate = buildGavanDay1ContentCandidate();

    for (const phrase of candidate.phrases) {
      const explanation = phrase.explanations![0];
      const sentences = explanation.body
        .split(/[.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean);

      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(3);
      expect(explanation.body.length).toBeGreaterThanOrEqual(75);
      expect(explanation.body.length).toBeLessThanOrEqual(210);
      expect(explanation.body).not.toMatch(/\b(?:DEV|debug|draft|placeholder|TODO)\b/i);
      expect(explanation.body).not.toMatch(MOJIBAKE_RE);
    }
  });

  it('blocks wrong-answer explanations that mention unseen selected options', () => {
    const candidate = buildGavanDay1ContentCandidate();
    candidate.phrases[0].explanations = [
      {
        body: "Use I'm here when you say you are already in the right place.",
        covers: ["I'm", 'here'],
        mentionedOptions: ["He's here."],
      },
    ];

    const result = validateGavanDay1ContentCandidate(candidate);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'explanation_mentions_unseen_option',
      phraseId: 'gavan-day1-final-p1',
      detail: "He's here.",
    }));
  });

  it('keeps the production bridge blocked until content approval is explicit', () => {
    const bridge = buildGavanDay1ProductionBridge();

    expect(validateGavanDay1ContentCandidate(buildGavanDay1ContentCandidate()).valid).toBe(true);
    expect(bridge.status).toBe('blocked');
    expect(validateGavanDay1ProductionBridge(bridge).valid).toBe(false);
    expect(bridge.issues).toContainEqual(expect.objectContaining({
      code: 'scaffold_content_not_approved',
      section: 'content',
    }));
  });

  it('does not import live catalog or live quiz registry', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_content_candidate.ts'),
      'utf8',
    );

    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
