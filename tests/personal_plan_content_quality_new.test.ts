import { validatePersonalPlanContentQuality } from '../app/personal_plan_content_quality_contract';

const scope = { planId: 'mitap', weekIndex: 1, dayIndex: 2, mode: 'regular_day' as const };

function phrase(english: string, russian: string) {
  return { id: 'p1', english, russian };
}

describe('new content quality checks', () => {
  it('accepts a clean natural phrase', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('I will send the summary.', 'Я пришлю резюме.'), scope);
    expect(r.valid).toBe(true);
  });

  it('flags overly long phrase', () => {
    const long = 'I would really like to kindly ask you whether you could possibly help me out today please now.';
    const r = validatePersonalPlanContentQuality(phrase(long, 'Длинная фраза.'), scope);
    expect(r.issues.map(i => i.code)).toContain('phrase_too_long_for_spoken_use');
  });

  it('flags duplicated consecutive words', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('I need need more time.', 'Мне нужно больше времени.'), scope);
    expect(r.issues.map(i => i.code)).toContain('duplicated_words_in_phrase');
  });

  it('flags cyrillic leaking into english', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('I need помощь now.', 'Мне нужна помощь.'), scope);
    expect(r.issues.map(i => i.code)).toContain('untranslated_english_in_russian');
  });

  it('flags untranslated english in russian', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('Can you help me?', 'Ты можешь help мне сейчас?'), scope);
    expect(r.issues.map(i => i.code)).toContain('untranslated_english_in_russian');
  });

  it('flags missing end punctuation', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('I need more time', 'Мне нужно больше времени.'), scope);
    expect(r.issues.map(i => i.code)).toContain('missing_sentence_punctuation');
  });

  it('flags replacement char mojibake', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('I need more time.', 'Мне нужно бол�ше времени.'), scope);
    expect(r.issues.map(i => i.code)).toContain('mojibake_or_replacement_char');
  });

  it('allows quoted english target inside russian', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('The deadline is today.', 'Фраза «The deadline is today» значит срок сегодня.'), scope);
    expect(r.issues.map(i => i.code)).not.toContain('untranslated_english_in_russian');
  });

  it('allows question without period', () => {
    const r = validatePersonalPlanContentQuality(
      phrase('Can you show me?', 'Можешь показать?'), scope);
    expect(r.valid).toBe(true);
  });
});
