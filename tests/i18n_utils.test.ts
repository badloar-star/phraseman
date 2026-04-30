import { actionToastTri } from '../app/events';
import { triLang } from '../constants/i18n';

const SAMPLE = {
  ru: 'Проверка RU',
  uk: 'Перевірка UK',
  es: 'Comprobación ES',
};

describe('triLang', () => {
  it('defaults to Russian', () => {
    expect(triLang('ru', SAMPLE)).toBe(SAMPLE.ru);
  });

  it('returns Ukrainian for uk', () => {
    expect(triLang('uk', SAMPLE)).toBe(SAMPLE.uk);
  });

  it('returns Spanish for es', () => {
    expect(triLang('es', SAMPLE)).toBe(SAMPLE.es);
  });
});

describe('actionToastTri', () => {
  it('fills messageRu, messageUk and messageEs', () => {
    const payload = actionToastTri('success', SAMPLE);
    expect(payload.type).toBe('success');
    expect(payload.messageRu).toBe(SAMPLE.ru);
    expect(payload.messageUk).toBe(SAMPLE.uk);
    expect(payload.messageEs).toBe(SAMPLE.es);
  });
});
