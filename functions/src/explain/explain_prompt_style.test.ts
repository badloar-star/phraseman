import { buildChoicePrompt } from './choice_explain_prompts';
import { buildExplainPrompt } from './explain_prompts';
import { buildQuizPrompt } from './quiz_explain_prompts';

describe('AI explanation prompt style contracts', () => {
  it('keeps explain-like-I-am-five compact and human, not essay-shaped', () => {
    const prompt = buildExplainPrompt("I'm ready.", 'Я готов.', 'ru');

    expect(prompt).toContain('one compact human answer');
    expect(prompt).toContain('This is NOT a mistake breakdown');
    expect(prompt).toContain('ONE simple rule or phrase-mechanism');
    expect(prompt).toContain('hard cap ~55 words');
    expect(prompt).toContain('word-origin clue');
    expect(prompt).toContain('memory hack');
    expect(prompt).toContain('never sound like a generated lesson');
    expect(prompt).not.toContain('2–4 tiny paragraphs');
    expect(prompt).not.toContain('most likely to get wrong');
    expect(prompt).not.toContain('show it with a tiny real pair:');
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

  it('keeps quiz breakdowns short enough for option feedback', () => {
    const prompt = buildQuizPrompt('Knife', 'Как сказать "нож"?', ['Cup', 'Bowl', 'Chair'], 'ru');

    expect(prompt).toContain('Phone-tooltip length');
    expect(prompt).toContain('ONE sentence');
    expect(prompt).toContain('<=160 chars');
    expect(prompt).toContain('word-origin clue');
    expect(prompt).not.toContain('one or two short sentences');
  });
});
