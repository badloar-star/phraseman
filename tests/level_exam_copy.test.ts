import { getLevelExamCopy } from '../app/level_exam_copy';
import type { Lang } from '../constants/i18n';

const LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('level exam copy', () => {
  it.each(LANGS)('keeps the intro contract complete for %s', (lang) => {
    const copy = getLevelExamCopy(lang, {
      level: 'A2',
      firstLesson: 13,
      lastLesson: 24,
      durationMinutes: 13,
      energyCost: 5,
      bestScore: 24,
    });

    expect(copy.title).toContain('A2');
    expect(copy.lessonRange).toMatch(/13/);
    expect(copy.lessonRange).toMatch(/24/);
    expect(copy.passGoal).toMatch(/21/);
    expect(copy.passGoal).toMatch(/30/);
    expect(copy.duration).toMatch(/13/);
    expect(copy.formats).toHaveLength(5);
    expect(copy.startCta).toMatch(/5/);
    expect(copy.bestResult).toMatch(/24/);
    expect(copy.firstPassReward.length).toBeGreaterThan(6);
  });

  it('uses the approved Russian product language', () => {
    const copy = getLevelExamCopy('ru', {
      level: 'A2',
      firstLesson: 13,
      lastLesson: 24,
      durationMinutes: 13,
      energyCost: 5,
      bestScore: null,
    });

    expect(copy).toMatchObject({
      title: 'Финальная проверка A2',
      lead: 'Покажи, как уверенно ты используешь темы этого уровня в живых фразах.',
      passGoal: '21 правильный ответ из 30',
      startCta: 'Начать проверку −5 ⚡',
      bestResult: 'Лучший результат сохранится',
    });
    expect(copy.formats.join(' · ')).toBe(
      'Контекст · Сборка фраз · Смысл · Поиск ошибки · Быстрые пары',
    );
  });

  it.each(LANGS)('never promises a penalty-free retry for %s', (lang) => {
    const text = JSON.stringify(getLevelExamCopy(lang, {
      level: 'B1',
      firstLesson: 25,
      lastLesson: 36,
      durationMinutes: 14,
      energyCost: 5,
      bestScore: null,
    })).toLocaleLowerCase();

    expect(text).not.toContain('без штрафа');
    expect(text).not.toContain('безкоштов');
    expect(text).not.toContain('sin penalización');
  });
});
