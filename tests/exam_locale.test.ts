import fs from 'fs';
import path from 'path';
import { examTopicForLang } from '../app/exam_locale';

describe('examTopicForLang', () => {
  const q = {
    topic: 'RU topic',
    topicUK: 'UK topic',
    topicES: 'ES topic',
    topicPtBr: 'PT topic',
    topicVi: 'VI topic',
    topicId: 'ID topic',
    topicTr: 'TR topic',
    topicPl: 'PL topic',
  };

  it('returns topicUK for uk', () => {
    expect(examTopicForLang(q, 'uk')).toBe('UK topic');
  });

  it('returns topicES for es when set', () => {
    expect(examTopicForLang(q, 'es')).toBe('ES topic');
  });

  it('marks es topic for review when topicES is missing', () => {
    expect(examTopicForLang({ topic: 'Only RU', topicUK: 'UK' }, 'es')).toBe('needs-review:es:exam.topic');
  });

  it('returns topic for ru', () => {
    expect(examTopicForLang(q, 'ru')).toBe('RU topic');
  });

  it('uses topic for uk when topicUK is empty', () => {
    expect(examTopicForLang({ topic: 'Only RU', topicUK: '' }, 'uk')).toBe('Only RU');
  });

  it.each([
    ['pt-BR', 'PT topic'],
    ['vi', 'VI topic'],
    ['id', 'ID topic'],
    ['tr', 'TR topic'],
    ['pl', 'PL topic'],
  ] as const)('returns explicit planned topic for %s', (lang, expected) => {
    expect(examTopicForLang(q, lang)).toBe(expected);
  });

  it.each(['pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('does not expose RU topic to planned locale %s when missing', (lang) => {
    expect(examTopicForLang({ topic: 'Only RU', topicUK: 'UK' }, lang)).toBe(`needs-review:${lang}:exam.topic`);
  });

  it('keeps exam locale source free of legacy runtime branch patterns', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/exam_locale.ts'), 'utf8');
    const equalityBranch = ['lang', '==='].join(' ');

    expect(source).not.toContain(equalityBranch);
    expect(source).not.toContain(['fall', 'back'].join(''));
  });
});
