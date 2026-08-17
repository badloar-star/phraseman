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

  test('восемь языков в КАЖДОМ тексте интро', () => {
    // зачем: владелец 2026-08-17 отдельным решением — «все интро должны быть
    // написаны на всех языках». Раньше правило понимали как «объяснения фраз»,
    // и интро писались только на ru/uk/es во всех десяти сессиях: ученик с
    // турецким интерфейсом увидел бы пустой экран объяснения.
    //
    // Проверяются ВСЕ тексты страницы, а не только заголовок: варианты ответа
    // и разбор — такой же текст для ученика, и без них экран тоже пустой.
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        const where = `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}`;
        const check = (name: string, value: unknown): void => {
          if (typeof value !== 'object' || value === null) {
            problems.push(`${where} · ${name}: поля нет вовсе`);
            return;
          }
          const have = Object.keys(value as Record<string, unknown>);
          const missing = REQUIRED_LOCALES.filter((l) => !have.includes(l));
          if (missing.length) problems.push(`${where} · ${name}: нет ${missing.join(', ')}`);
          // Пустая строка в поле языка — тот же дефект, что отсутствие поля.
          const blank = REQUIRED_LOCALES.filter((l) => {
            const text = (value as Record<string, unknown>)[l];
            return have.includes(l) && String(text ?? '').trim().length === 0;
          });
          if (blank.length) problems.push(`${where} · ${name}: пусто в ${blank.join(', ')}`);
        };
        check('заголовок', page.title);
        check('тело', page.body);
        check('текст вопроса', page.question?.prompt);
        check('разбор ответа', page.question?.explanation);
        (page.question?.choices ?? []).forEach((choice, ci) => {
          check(`вариант ${ci + 1}`, choice);
        });
      });
    }
    expect(problems.join('\n')).toBe('');
  });

  test('русский текст не подставлен вместо перевода', () => {
    // зачем: подстановка русского в поле другого языка — тот же дефект, что
    // отсутствие перевода, но сторож длины его не видит. Ловим по кириллице:
    // в es/pt-BR/vi/id/tr/pl её быть не может. uk пропускаем — там кириллица
    // законна, но текст обязан отличаться от русского.
    const CYRILLIC_FORBIDDEN = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    const problems: string[] = [];
    for (const session of AUTHORED_EPISODE_01_SESSIONS) {
      session.introPages.forEach((page, index) => {
        const where = `сессия ${session.requiredSessionOrdinal}, страница ${index + 1}`;
        const check = (name: string, value: unknown): void => {
          if (typeof value !== 'object' || value === null) return;
          const record = value as Record<string, unknown>;
          for (const locale of CYRILLIC_FORBIDDEN) {
            const text = String(record[locale] ?? '');
            if (/[Ѐ-ӿ]/.test(text)) {
              problems.push(`${where} · ${name} · ${locale}: кириллица в переводе`);
            }
          }
          const ru = String(record.ru ?? '').trim();
          const uk = String(record.uk ?? '').trim();
          if (ru.length > 0 && ru === uk) {
            problems.push(`${where} · ${name} · uk: копия русского текста`);
          }
        };
        check('заголовок', page.title);
        check('тело', page.body);
        check('текст вопроса', page.question?.prompt);
        check('разбор ответа', page.question?.explanation);
      });
    }
    expect(problems.join('\n')).toBe('');
  });
});
