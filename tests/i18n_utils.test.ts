jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  SPANISH_UI_LOCALE_ENABLED: true,
}));

import { actionToastTri } from '../app/events';
import { triLang } from '../constants/i18n';

const SAMPLE = {
  ru: 'Проверка RU',
  uk: 'Перевірка UK',
  es: 'Comprobación ES',
  'pt-BR': 'Verificação PT',
  vi: 'Kiểm tra VI',
  id: 'Pemeriksaan ID',
  tr: 'TR kontrolü',
  pl: 'Sprawdzenie PL',
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
  it('fills legacy and planned locale toast fields', () => {
    const payload = actionToastTri('success', SAMPLE);
    expect(payload.type).toBe('success');
    expect(payload.messageRu).toBe(SAMPLE.ru);
    expect(payload.messageUk).toBe(SAMPLE.uk);
    expect(payload.messageEs).toBe(SAMPLE.es);
    expect(payload.messagePtBr).toBe(SAMPLE['pt-BR']);
    expect(payload.messageVi).toBe(SAMPLE.vi);
    expect(payload.messageId).toBe(SAMPLE.id);
    expect(payload.messageTr).toBe(SAMPLE.tr);
    expect(payload.messagePl).toBe(SAMPLE.pl);
  });
});
