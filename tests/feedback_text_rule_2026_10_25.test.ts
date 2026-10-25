// ЗАМОК ВЛАДЕЛЬЦА 25.10: «оценку без текста отправить нельзя» — минимум одно слово из 3+ букв (любой алфавит), по обрезанному тексту.
import { feedbackBlockReason, feedbackTextAllowsSend } from '../app/feedback_text_rule';
import { FEEDBACK_NEED_WORD_PLACEHOLDER, feedbackNeedWordPlaceholder } from '../components/feedback_rating_copy';

describe('правило «слово из 3+ букв»', () => {
  it.each([
    ['', false], ['   ', false], ['\n\t', false], ['.', false], ['...', false], ['!!!', false], ['👍', false], ['👍👍👍', false], ['ок', false], ['ok', false], ['да', false],
    ['12345', false], ['a1b2c3', false], ['а б в', false], ['ok!', false], ['  ок  ', false],
  ])('«%s» — отправить нельзя', (text, expected) => {
    expect(feedbackTextAllowsSend(text)).toBe(expected);
    expect(feedbackBlockReason(text)).toBe('no_word');
  });
  it.each([
    ['good', true], ['  good  ', true], ['хорошо', true], ['чудово', true], ['bueno', true], ['ótimo', true], ['rất tốt', true], ['bagus', true], ['güzel', true], ['dobrze', true],
    ['ありがとう', true], ['很好用', true], ['ok good', true], ['👍 супер', true], ['12 abc', true],
  ])('«%s» — отправить можно', (text, expected) => {
    expect(feedbackTextAllowsSend(text)).toBe(expected);
    expect(feedbackBlockReason(text)).toBeNull();
  });
});

describe('плейсхолдер после выбора звёзд — все 9 языков', () => {
  it('есть для ru uk en es pt-BR vi id tr pl и не пуст', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(FEEDBACK_NEED_WORD_PLACEHOLDER[lang]?.length ?? 0).toBeGreaterThan(10);
      expect(feedbackNeedWordPlaceholder(lang)).toBe(FEEDBACK_NEED_WORD_PLACEHOLDER[lang]);
    }
  });
});
