import { examTopicForLang } from '../app/exam_locale';

describe('examTopicForLang', () => {
  const q = {
    topic: 'RU topic',
    topicUK: 'UK topic',
    topicES: 'ES topic',
  };

  it('returns topicUK for uk', () => {
    expect(examTopicForLang(q, 'uk')).toBe('UK topic');
  });

  it('returns topicES for es when set', () => {
    expect(examTopicForLang(q, 'es')).toBe('ES topic');
  });

  it('falls back to topic for es when topicES missing', () => {
    expect(examTopicForLang({ topic: 'Only RU', topicUK: 'UK' }, 'es')).toBe('Only RU');
  });

  it('returns topic for ru', () => {
    expect(examTopicForLang(q, 'ru')).toBe('RU topic');
  });

  it('falls back to topic for uk when topicUK is empty', () => {
    expect(examTopicForLang({ topic: 'Only RU', topicUK: '' }, 'uk')).toBe('Only RU');
  });
});
