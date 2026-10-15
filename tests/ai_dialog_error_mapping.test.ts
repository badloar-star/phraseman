jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));


import {
  classifyPremiumDialogError,
  getPremiumDialogErrorMessage,
} from '../app/ai_dialog_client';

describe('ai dialog callable error mapping', () => {
  it('maps the server Plus gate to a paywall message instead of a network failure', () => {
    const error = { code: 'functions/permission-denied', message: 'dialog_plus_required' };

    expect(classifyPremiumDialogError(error)).toBe('plus_required');
    expect(getPremiumDialogErrorMessage(error)).toContain('Plus');
    expect(getPremiumDialogErrorMessage(error)).not.toContain('Пробный диалог');
  });

  it('does not show free quota copy when local Premium is active', () => {
    const error = { code: 'functions/resource-exhausted', message: 'dialog_free_limit' };

    const message = getPremiumDialogErrorMessage(error, { hasPremiumAccess: true, lang: 'uk' });

    expect(message).toContain('Повний доступ активний');
    expect(message).not.toContain('Ð‘ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ñ‹Ð¹');
  });

  it('maps provider failures separately from network failures', () => {
    expect(classifyPremiumDialogError({ code: 'functions/unavailable', message: 'dialog_provider_failed' }))
      .toBe('provider_unavailable');
    expect(classifyPremiumDialogError({ code: 'functions/unavailable', message: 'dialog_repeated_reply' }))
      .toBe('provider_unavailable');
    expect(classifyPremiumDialogError({ code: 'functions/internal', message: 'INTERNAL' }))
      .toBe('provider_unavailable');
    expect(classifyPremiumDialogError(new Error('network request failed'))).toBe('network');
  });

  // зачем (Ревизор 2.71): поведенческая проверка вместо сверки строк — код ошибки → вид → своё сообщение. Тексты переписывают
  // (52d27aeb4 / 3dc472258 убрали «сервер/сервіс»), а смысл держим: сбой провайдера ≠ нет связи ≠ неизвестная ошибка, на всех 9
  // языках, без системных слов и без выдуманных историй.
  const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
  const INFRA = {
    provider: { code: 'functions/unavailable', message: 'dialog_provider_failed' },
    network: new Error('network request failed'),
    unknown: new Error('unexpected failure'),
  } as const;

  it('infrastructure failures: each code maps to its own kind', () => {
    expect(classifyPremiumDialogError(INFRA.provider)).toBe('provider_unavailable');
    expect(classifyPremiumDialogError(INFRA.network)).toBe('network');
    expect(classifyPremiumDialogError(INFRA.unknown)).toBe('unknown');
    expect(classifyPremiumDialogError({ code: 'functions/deadline-exceeded', message: '' })).toBe('provider_unavailable');
    expect(classifyPremiumDialogError(new Error('timeout'))).toBe('network');
  });

  it.each(LANGS)('%s: provider ≠ network ≠ unknown, all localized, no system words, no fictional stories', (lang) => {
    const provider = getPremiumDialogErrorMessage(INFRA.provider, { lang });
    const network = getPremiumDialogErrorMessage(INFRA.network, { lang });
    const unknown = getPremiumDialogErrorMessage(INFRA.unknown, { lang });
    for (const message of [provider, network, unknown]) {
      expect(message.trim().length).toBeGreaterThan(0);
      expect(message).not.toMatch(/сервер|сервіс|server|servidor|máy chủ|sunucu|serwer/i);
      expect(message).not.toMatch(/луна|місяць|гора|посилк|кур’єр/i);
      if (lang !== 'ru' && lang !== 'uk') expect(message).not.toMatch(/[а-яёіїєґ]/i); // не русский/украинский запасной текст
    }
    // network может давать случайный вариант забавной плашки — сравниваем «вид», а не строку: три разных сообщения
    expect(new Set([provider, unknown]).size).toBe(2);
    expect(network).not.toBe(provider);
    expect(network).not.toBe(unknown);
  });

  it('maps server age restriction instead of calling it a network failure', () => {
    const error = { code: 'functions/permission-denied', message: 'age_restricted' };

    expect(classifyPremiumDialogError(error)).toBe('age_restricted');
    expect(getPremiumDialogErrorMessage(error, { lang: 'ru' })).toContain('16');
    expect(getPremiumDialogErrorMessage(error, { lang: 'ru' })).not.toContain('интернет');
  });

  it('serves planned locale error messages without falling back to Russian', () => {
    const freeLimit = { code: 'functions/permission-denied', message: 'dialog_plus_required' };
    const network = new Error('network request failed');

    expect(getPremiumDialogErrorMessage(freeLimit, { lang: 'pt-BR' })).toContain('Plus');
    // поведение (Ревизор 2.71): при активном Plus — своё сообщение «доступ есть, но ещё не применился», а не «нужен Plus»; без «máy chủ»
    const viPlusActive = getPremiumDialogErrorMessage(freeLimit, { hasPremiumAccess: true, lang: 'vi' });
    expect(viPlusActive).not.toBe(getPremiumDialogErrorMessage(freeLimit, { lang: 'vi' }));
    expect(viPlusActive).not.toMatch(/máy chủ/i);
    // network теперь показывает забавную (рандомную) плашку из aiErrorToast.
    // Проверяем не конкретную формулировку, а что локализация случилась: польский
    // вариант непустой и БЕЗ кириллицы (русский фолбэк был бы на кириллице).
    const plNetwork = getPremiumDialogErrorMessage(network, { lang: 'pl' });
    expect(plNetwork.length).toBeGreaterThan(0);
    expect(plNetwork).not.toMatch(/[а-яё]/i);
  });
});
