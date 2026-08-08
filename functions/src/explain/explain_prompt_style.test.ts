import { buildChoicePrompt } from './choice_explain_prompts';
import { buildExplainPrompt } from './explain_prompts';

describe('AI explanation prompt style contracts', () => {
  it('keeps explain-like-I-am-five compact and human, not essay-shaped', () => {
    const prompt = buildExplainPrompt("I'm ready.", 'Я готов.', 'ru');

    // Re-scoped 2026-06-28: "Объяснить" explains the PHRASE from the best angle (meaning, rule,
    // true fact/origin, or how-to-use) — its own feature, not a mistake breakdown.
    expect(prompt).toContain('one compact, human answer');
    expect(prompt).toContain('This is NOT a mistake breakdown');
    expect(prompt).toContain('PICK THE ONE most useful and interesting angle');
    expect(prompt).toContain('MEANING / WHEN IT IS SAID');
    expect(prompt).toContain('A TRUE FACT or WORD-ORIGIN');
    expect(prompt).toContain('HOW / WHERE TO USE IT');
    expect(prompt).toContain('hard cap ~70 words');
    expect(prompt).toContain('never sound like a generated lesson');
    // The old absolute ban on stating meaning is gone — meaning is now an allowed angle.
    expect(prompt).not.toContain('ABSOLUTE RULE: Do NOT explain, restate, or translate');
    expect(prompt).not.toContain('CONTRAST BANK');
  });

  it('keeps choice explanations as one-sentence micro-hints', () => {
    const prompt = buildChoicePrompt(
      "I'm fine, thanks.",
      'Я в порядке, спасибо.',
      ['Goodbye.', 'We are all okay.'],
      'ru',
    );

    expect(prompt).toContain('human micro-explanation');
    expect(prompt).toContain('ONE sentence only');
    expect(prompt).toContain('<=150 chars');
    expect(prompt).toContain('word-origin clue');
    expect(prompt).not.toContain('идём дальше');
  });

});
