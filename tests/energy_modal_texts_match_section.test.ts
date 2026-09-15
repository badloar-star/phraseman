/**
 * Сторож: окно «Недостаточно энергии» называет ТО занятие, из которого человек
 * в него попал.
 *
 * зачем (владелец 2026-09-15): в диалоге окно говорило «Экзамен требует 20 ⚡».
 * Строка выбиралась СЛУЧАЙНО из двух вариантов, и один жёстко упоминал экзамен.
 * Цена при этом бралась из активности и была верной — поэтому дефект не ловился
 * ни типами, ни тестами цены: врал только текст.
 *
 * Тест сторожит две вещи: текст раздела соответствует разделу, и выбор НЕ
 * случайный (одинаковый вход даёт одинаковый выход).
 */
import {
  energyActivityTitle,
  energyGateMessage,
} from '../app/energy_activity_titles';
import type { EnergyActivityKey } from '../app/energy_contract';

const ALL_ACTIVITIES: EnergyActivityKey[] = [
  'flashcards',
  'lesson_words',
  'irregular_verbs',
  'preposition_drill',
  'mistake_practice',
  'classic_lesson',
  'learning_v2_session',
  'ai_dialog',
  'personal_plan_exercise',
  'diagnostic_test',
  'level_exam',
  'arena_match',
  'theory',
  'reading',
  'video',
  'max_call',
];

describe('тексты окна энергии соответствуют разделу', () => {
  it('диалог НЕ упоминает экзамен — ровно та жалоба владельца', () => {
    const message = energyGateMessage('ai_dialog', 'ru', 20, 5);
    expect(message.toLowerCase()).not.toContain('экзамен');
    expect(message).toContain('разговора');
  });

  it('экзамен по-прежнему называет себя экзаменом', () => {
    expect(energyGateMessage('level_exam', 'ru', 20, 5)).toContain('экзамена');
  });

  it('матч арены называет матч, а не урок', () => {
    const message = energyGateMessage('arena_match', 'ru', 25, 0);
    expect(message).toContain('матча');
    expect(message).not.toContain('урока');
  });

  it('карточки называют тренировку карточек', () => {
    expect(energyGateMessage('flashcards', 'ru', 10, 0)).toContain('карточек');
  });

  it('выбор НЕ случайный: один вход — один и тот же текст', () => {
    const first = energyGateMessage('ai_dialog', 'ru', 20, 5);
    for (let i = 0; i < 20; i += 1) {
      expect(energyGateMessage('ai_dialog', 'ru', 20, 5)).toBe(first);
    }
  });

  it('цена и остаток попадают в строку как есть', () => {
    const message = energyGateMessage('ai_dialog', 'ru', 20, 5);
    expect(message).toContain('20');
    expect(message).toContain('5');
  });

  it('у каждой активности есть непустое название на всех языках приложения', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const activity of ALL_ACTIVITIES) {
      for (const lang of langs) {
        const title = energyActivityTitle(activity, lang);
        expect(typeof title).toBe('string');
        expect(title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('разные активности не делят одно название — иначе раздел неразличим', () => {
    // Урок и сессия Learning V2 для человека — одно и то же «урок», это
    // осознанное совпадение; остальные обязаны отличаться.
    const titles = ALL_ACTIVITIES
      .filter((a) => a !== 'learning_v2_session')
      .map((a) => energyActivityTitle(a, 'ru'));
    expect(new Set(titles).size).toBe(titles.length);
  });
});
