// Сторож витрины уроков «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): каталог на клиенте (app/max_lesson_catalog.ts) —
// копия списка речевых целей сервера. Копия неизбежна: сервер — единственный
// источник целей, но клиенту нужен список ДО звонка, чтобы нарисовать раздел.
// Расхождение молчаливо: ученик увидит урок, которого сервер не знает, либо не
// увидит существующий, и никакой ошибки при этом не будет. Этот тест — тот
// самый шов: он падает при первом же расхождении.
//
// Сработал — чинить каталог, а не тест.

import {
  MAX_LESSON_CATALOG,
  MAX_LESSON_TOPICS,
  maxLessonStars,
  maxLessonsDone,
  recommendedMaxLessonId,
} from '../app/max_lesson_catalog';
import { CAN_DO_GOALS } from '../functions/src/max_voice_can_do_goals';

describe('витрина уроков MAX совпадает с целями сервера', () => {
  it('те же id в том же порядке', () => {
    expect(MAX_LESSON_CATALOG.map((l) => l.id)).toEqual(CAN_DO_GOALS.map((g) => g.id));
  });

  it('те же уровни', () => {
    for (const goal of CAN_DO_GOALS) {
      const item = MAX_LESSON_CATALOG.find((l) => l.id === goal.id);
      expect(item?.level).toBe(goal.level);
    }
  });

  it('78 уроков: A1×20, A2×22, B1×18, B2×18', () => {
    const byLevel = MAX_LESSON_CATALOG.reduce<Record<string, number>>((acc, l) => {
      acc[l.level] = (acc[l.level] ?? 0) + 1;
      return acc;
    }, {});
    expect(MAX_LESSON_CATALOG).toHaveLength(78);
    expect(byLevel).toEqual({ A1: 20, A2: 22, B1: 18, B2: 18 });
  });

  it('у каждого урока тема из известного списка', () => {
    for (const item of MAX_LESSON_CATALOG) {
      expect(MAX_LESSON_TOPICS).toContain(item.topic);
    }
  });

  it('ни одна тема не съедает больше половины каталога', () => {
    // Фильтр по теме бесполезен, если почти всё лежит в одной корзине —
    // именно так выглядела первая, ошибочная разметка (48 из 78 в «прочее»).
    const byTopic = MAX_LESSON_CATALOG.reduce<Record<string, number>>((acc, l) => {
      acc[l.topic] = (acc[l.topic] ?? 0) + 1;
      return acc;
    }, {});
    for (const count of Object.values(byTopic)) {
      expect(count).toBeLessThan(MAX_LESSON_CATALOG.length / 2);
    }
  });
});

describe('звёзды и рекомендация урока', () => {
  it('нет ключа — ноль звёзд, значение зажато в 0..3', () => {
    expect(maxLessonStars({}, 'a1_greet')).toBe(0);
    expect(maxLessonStars({ a1_greet: 2 }, 'a1_greet')).toBe(2);
    expect(maxLessonStars({ a1_greet: 99 }, 'a1_greet')).toBe(3);
    expect(maxLessonStars({ a1_greet: -5 }, 'a1_greet')).toBe(0);
    expect(maxLessonStars({ a1_greet: Number.NaN }, 'a1_greet')).toBe(0);
  });

  it('новичку рекомендуется первый урок его уровня', () => {
    expect(recommendedMaxLessonId({}, 'A1')).toBe('a1_greet');
    expect(recommendedMaxLessonId({}, 'B1')).toBe('b1_experience');
  });

  it('закрытый урок пропускается, незакрытый — нет', () => {
    // Две звезды — урок ещё НЕ закрыт, он и остаётся рекомендованным.
    expect(recommendedMaxLessonId({ a1_greet: 2 }, 'A1')).toBe('a1_greet');
    expect(recommendedMaxLessonId({ a1_greet: 3 }, 'A1')).toBe('a1_intro');
  });

  it('уровень пройден целиком — рекомендация переходит на следующий', () => {
    const allA1Done: Record<string, number> = {};
    for (const item of MAX_LESSON_CATALOG) if (item.level === 'A1') allA1Done[item.id] = 3;
    expect(recommendedMaxLessonId(allA1Done, 'A1')).toBe('a2_past_day');
  });

  it('всё закрыто — рекомендации нет, счётчик равен размеру каталога', () => {
    const everything: Record<string, number> = {};
    for (const item of MAX_LESSON_CATALOG) everything[item.id] = 3;
    expect(recommendedMaxLessonId(everything, 'A1')).toBeNull();
    expect(maxLessonsDone(everything)).toBe(78);
  });

  it('считаются только полностью закрытые уроки', () => {
    expect(maxLessonsDone({ a1_greet: 3, a1_intro: 2, a1_ask_name: 1 })).toBe(1);
  });
});
