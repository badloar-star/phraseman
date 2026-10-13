import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'lesson1.tsx'),
  'utf8',
);

describe('lesson mistake-practice capture wiring', () => {
  test('uses the new objective capture adapter for a wrong phrase answer', () => {
    expect(source).toContain("from './mistake_practice_capture'");
    expect(source).toContain('captureObjectiveAttempt({');
    expect(source).toContain("verdict: 'wrong'");
    expect(source).toContain("objective: true");
    // зачем (репорт #15 Ольга, 2026-09-20): здесь стоял жёсткий kind: 'word_order' — ЛЮБАЯ ошибка урока приходила в «Мои ошибки» с подсказкой
    // «Сверь порядок слов». Теперь тип считается по самому промаху (lessonMistakeFacet); прежняя строка сторожила именно этот баг.
    // 13.10 (аудит Optimistic UI Уроков): тип считается один раз по ФАКТИЧЕСКОМУ ответу (const mistakeFacetKind) и пишется и в журнал, и в запись.
    expect(source).toContain('lessonMistakeFacet({ expectedPhrase: canonKey, answeredPhrase: answer })');
    expect(source).toContain('kind: mistakeFacetKind,');
    expect(source).not.toContain("kind: 'word_order'");
  });

  test('does not keep the three old long-term mistake writers', () => {
    expect(source).not.toContain('recordMistake(');
    expect(source).not.toContain('logMistake(');
    expect(source).not.toContain('recordPhraseMistake(');
  });
});
