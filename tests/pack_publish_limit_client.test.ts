import {
  PACK_PUBLISH_DAILY_LIMIT_COPY,
  isPublishDailyLimitError,
} from '../app/community_packs/publish_limit_copy';

describe('PACK-PUBLISH-LIMIT клиент (Q55)', () => {
  test('распознаёт отказ сервера и по details.reason, и по коду+тексту', () => {
    expect(isPublishDailyLimitError({ code: 'functions/resource-exhausted', message: 'publish_daily_limit' })).toBe(true);
    expect(isPublishDailyLimitError({ code: 'resource-exhausted', message: 'x', details: { reason: 'publish_daily_limit' } })).toBe(true);
  });

  test('не путает с другими отказами', () => {
    expect(isPublishDailyLimitError(new Error('network'))).toBe(false);
    expect(isPublishDailyLimitError({ code: 'resource-exhausted', message: 'rate limited' })).toBe(false);
    expect(isPublishDailyLimitError({ code: 'failed-precondition', message: 'Publication withdrawn' })).toBe(false);
    expect(isPublishDailyLimitError(null)).toBe(false);
  });

  test('текст есть на всех 9 языках и называет лимит 3', () => {
    const keys = Object.keys(PACK_PUBLISH_DAILY_LIMIT_COPY).sort();
    expect(keys).toEqual(['en', 'es', 'id', 'pl', 'pt-BR', 'ru', 'tr', 'uk', 'vi']);
    for (const text of Object.values(PACK_PUBLISH_DAILY_LIMIT_COPY)) expect(text).toContain('3');
    expect(PACK_PUBLISH_DAILY_LIMIT_COPY.ru).toBe('Сегодня можно опубликовать не больше 3 наборов, попробуй завтра.');
  });
});
