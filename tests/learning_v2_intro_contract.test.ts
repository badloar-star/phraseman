// зачем: владелец 2026-08-17 заметил, что интро-экраны разошлись с содержанием
// сессий: «каждая сессия должна начинаться с интро экранов, там объясняются
// строго только те конструкции, которые будут в этой сессии, и внизу каждого
// экрана маленький вопросик».
//
// Интро НЕ пропадали — они есть во всех десяти сессиях. Но сторожа на них не
// было: после переписывания плана под to be интро сессий 1, 3, 6, 7 стали
// объяснять то, чего в этих сессиях больше нет, и заметил это владелец, а не
// сборка. Этот файл закрывает дыру.
//
// Что НЕ проверяют существующие тесты: они смотрят на фразы и на карту сессий
// по отдельности. Связь «интро ↔ фразы» не проверял никто.
//
// Полные правила: docs/v2/LESSON_DESIGN_RULES.ru.md, раздел 7.
import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';

const REQUIRED_LOCALES = Object.freeze([
  'ru',
  'uk',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
]);

const ALLOWED_KINDS = Object.freeze(['concept', 'formula', 'trap', 'tip']);

describe('интро-экраны сессии', () => {
  test('ровно три страницы в каждой сессии', () => {
    const wrong = AUTHORED_EPISODE_01_SESSIONS.filter(
      (s) => s.introPages.length !== 3,
    ).map((s) => `сессия ${s.requiredSessionOrdinal}: ${s.introPages.length} страниц`);
    expect(wrong.join('\n')).toBe('');
  });

  test('на каждой странице есть вопрос с вариантами и разбором', () => {
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        const where = `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}`;
        if (!page.question) {
          problems.push(`${where}: нет вопроса`);
          return;
        }
        if (!page.question.prompt) problems.push(`${where}: нет текста вопроса`);
        if (!Array.isArray(page.question.choices) || page.question.choices.length < 2)
          problems.push(`${where}: меньше двух вариантов`);
        if (
          typeof page.question.correctChoiceIndex !== 'number' ||
          page.question.correctChoiceIndex < 0 ||
          page.question.correctChoiceIndex >= (page.question.choices?.length ?? 0)
        )
          problems.push(`${where}: неверный номер правильного ответа`);
        if (!page.question.explanation) problems.push(`${where}: нет разбора ответа`);
      });
    }
    expect(problems.join('\n')).toBe('');
  });

  test('тип страницы из разрешённого набора', () => {
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        if (!ALLOWED_KINDS.includes(page.kind)) {
          problems.push(
            `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}: тип «${page.kind}»`,
          );
        }
      });
    }
    expect(problems.join('\n')).toBe('');
  });

  test('заголовок и тело есть на каждой странице', () => {
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        const where = `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}`;
        const ru = (value: unknown): string =>
          typeof value === 'object' && value !== null
            ? String((value as Record<string, unknown>).ru ?? '')
            : '';
        if (ru(page.title).trim().length < 4) problems.push(`${where}: пустой заголовок`);
        if (ru(page.body).trim().length < 40) problems.push(`${where}: тело короче 40 знаков`);
      });
    }
    expect(problems.join('\n')).toBe('');
  });

  test('восемь языков в заголовке, теле и вопросе', () => {
    // зачем: владелец 2026-08-16 — «все языки должны быть, это строго при
    // генерации». Сейчас в интро только ru/uk/es, поэтому тест КРАСНЫЙ
    // намеренно: он показывает объём работы, а не ломает готовое.
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        const where = `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}`;
        const check = (name: string, value: unknown): void => {
          if (typeof value !== 'object' || value === null) return;
          const have = Object.keys(value as Record<string, unknown>);
          const missing = REQUIRED_LOCALES.filter((l) => !have.includes(l));
          if (missing.length) problems.push(`${where} · ${name}: нет ${missing.join(', ')}`);
        };
        check('заголовок', page.title);
        check('тело', page.body);
        check('вопрос', page.question?.prompt);
      });
    }
    expect(problems.join('\n')).toBe('');
  });
});
