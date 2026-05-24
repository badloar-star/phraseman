import { readFileSync } from 'fs';
import { join } from 'path';

import { examTopicForLang } from '../app/exam_locale';

const source = readFileSync(join(__dirname, '..', 'app', 'exam_locale.ts'), 'utf8');

describe('exam locale topic fallback', () => {
  it('does not expose review markers when a planned locale topic is missing', () => {
    expect(source).not.toContain('PLANNED_TOPIC_REVIEW');
    expect(source).not.toContain('needs-review:');

    expect(examTopicForLang({ topic: 'Tense', topicUK: 'Час' }, 'pt-BR')).toBe('Tópico indisponível');
    expect(examTopicForLang({ topic: 'Tense', topicUK: 'Час' }, 'vi')).toBe('Chưa có chủ đề');
    expect(examTopicForLang({ topic: 'Tense', topicUK: 'Час' }, 'id')).toBe('Topik belum tersedia');
    expect(examTopicForLang({ topic: 'Tense', topicUK: 'Час' }, 'tr')).toBe('Konu kullanılamıyor');
    expect(examTopicForLang({ topic: 'Tense', topicUK: 'Час' }, 'pl')).toBe('Temat jest niedostępny');
  });

  it('keeps explicit topic fields ahead of the fallback', () => {
    expect(
      examTopicForLang(
        {
          topic: 'Tense',
          topicUK: 'Час',
          topicPtBr: 'Tempo verbal',
          topicVi: 'Thì',
          topicId: 'Tenses',
          topicTr: 'Zaman',
          topicPl: 'Czas gramatyczny',
        },
        'pt-BR',
      ),
    ).toBe('Tempo verbal');
  });
});
