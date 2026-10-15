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

  it('describes infrastructure failures honestly instead of showing fictional stories', () => {
    const provider = getPremiumDialogErrorMessage(
      { code: 'functions/unavailable', message: 'dialog_provider_failed' },
      { lang: 'uk' },
    );
    const network = getPremiumDialogErrorMessage(new Error('network request failed'), { lang: 'uk' });
    const unknown = getPremiumDialogErrorMessage(new Error('unexpected failure'), { lang: 'uk' });

    // зачем (разбор красных 15.10): 52d27aeb4/3dc472258 убрали из текстов системные слова («сервіс», «сервер») — смысл тот же:
    // сбой провайдера ≠ нет связи ≠ неизвестная ошибка, и ни одной выдуманной истории
    expect(provider).toContain('Повідомлення не надіслалося');
    expect(network).toContain('Немає зв’язку');
    expect(unknown).toContain('Не вдалося надіслати повідомлення');
    for (const message of [provider, network, unknown]) {
      expect(message).not.toMatch(/луна|місяць|гора|посилк|кур’єр/i);
    }
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
    expect(getPremiumDialogErrorMessage(freeLimit, { hasPremiumAccess: true, lang: 'vi' }))
      .toContain('Quyền truy cập đầy đủ đã bật nhưng chưa áp dụng ở mọi nơi'); // без слова «máy chủ» (сервер), 3dc472258
    // network теперь показывает забавную (рандомную) плашку из aiErrorToast.
    // Проверяем не конкретную формулировку, а что локализация случилась: польский
    // вариант непустой и БЕЗ кириллицы (русский фолбэк был бы на кириллице).
    const plNetwork = getPremiumDialogErrorMessage(network, { lang: 'pl' });
    expect(plNetwork.length).toBeGreaterThan(0);
    expect(plNetwork).not.toMatch(/[а-яё]/i);
  });
});
