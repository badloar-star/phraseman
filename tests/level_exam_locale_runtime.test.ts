import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'level_exam.tsx'), 'utf8');

const plannedLocales = ["'pt-BR'", 'vi', 'id', 'tr', 'pl'] as const;

describe('level_exam planned locale runtime copy', () => {
  it('does not use Spanish topic text as the planned locale fallback', () => {
    expect(source).not.toContain('?? q.topicES');
    expect(source).not.toContain('return LEVEL_TOPIC_PLANNED[q.topicES]?.[locale] ?? q.topicES');
    expect(source).not.toContain('LEVEL_TOPIC_NEEDS_REVIEW');
    expect(source).toContain('LEVEL_TOPIC_UNAVAILABLE');
    expect(source).not.toContain('needs-review: tópico do teste de nível');
    expect(source).not.toContain('needs-review: chủ đề bài kiểm tra trình độ');
    expect(source).not.toContain('needs-review: topik ujian level');
    expect(source).not.toContain('needs-review: seviye sınavı konusu');
    expect(source).not.toContain('needs-review: temat testu poziomu');
  });

  it('covers every topicES from the question pool for planned locales', () => {
    const poolTopics = new Set(
      Array.from(source.matchAll(/topicES:'([^']+)'/gu), (match) => match[1]),
    );
    expect(poolTopics.size).toBeGreaterThan(0);

    for (const topic of poolTopics) {
      const key = /^[A-Za-z_$][\w$]*$/u.test(topic) ? topic : `'${topic}'`;
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const entryMatch = source.match(new RegExp(`${escapedKey}: \\{([\\s\\S]*?)\\n  \\},`, 'u'));
      expect(entryMatch?.[1]).toBeTruthy();
      const entry = entryMatch?.[1] ?? '';
      for (const locale of plannedLocales) {
        expect(entry).toContain(`${locale}:`);
      }
    }
  });

  it('keeps visible level exam UI copy explicit for planned locales', () => {
    expect(source).toContain('Teste de nível A1');
    expect(source).toContain('Bài kiểm tra trình độ A1');
    expect(source).toContain('Ujian level A1');
    expect(source).toContain('A1 seviye sınavı');
    expect(source).toContain('Test poziomu A1');
  });
});
