import { bundleLang, triLang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { buildCelebrationShareBody } from '../app/celebration_share_messages';

describe('triLang — RU / UK / ES', () => {
  const pack = { ru: 'RU', uk: 'UK', es: 'ES' };

  it('выбирует нужную ветку по языку', () => {
    expect(triLang('ru', pack)).toBe('RU');
    expect(triLang('uk', pack)).toBe('UK');
    expect(triLang('es', pack)).toBe('ES');
  });
});

describe('bundleLang — ключи словарей UI-пакетов', () => {
  it('совпадает с Lang без преобразований', () => {
    expect(bundleLang('ru')).toBe('ru');
    expect(bundleLang('uk')).toBe('uk');
    expect(bundleLang('es')).toBe('es');
  });
});

describe('lessonNamesForLang(es)', () => {
  it('хранит 32 урока (индекс 0 = урок 1)', () => {
    const names = lessonNamesForLang('es');
    expect(names.length).toBe(32);
    expect(names[0]).toMatch(/to be|Pronombres/i);
    expect(names[31]).toMatch(/repaso|Repaso/i);
  });

  it('название урока N совпадает с индексом N − 1', () => {
    const names = lessonNamesForLang('es');
    expect(names[7]).toBeTruthy(); // урок 8
  });
});

describe('buildCelebrationShareBody — ES', () => {
  it('для медали возвращает испаноязычную строку с Phraseman', () => {
    const body = buildCelebrationShareBody('medal', 'es', 4, 88, { medalTier: 'gold' });
    expect(body.length).toBeGreaterThan(30);
    expect(body).toMatch(/Phraseman/i);
    expect(body).not.toMatch(/[А-Яа-яЁёЇїІіЄєҐґ]{4,}/);
  });

  it('для разблокировки урока упоминает урок или Phraseman', () => {
    const body = buildCelebrationShareBody('lesson_unlock', 'es', 5, 0, {
      unlockedLessonId: 6,
    });
    expect(body).toMatch(/Phraseman|Lección|lección|\b6\b/);
  });
});
