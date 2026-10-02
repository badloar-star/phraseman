/**
 * зачем (координатор 02.10, вариант В): открытие набора без сети — тихие повторы
 * со спиннером на плитке, затем мягкая подсказка без слова «ошибка».
 */
const stageMock = jest.fn();
const emitMock = jest.fn();

jest.mock('../app/community_packs/staging', () => ({
  stageCommunityPackCardsForNavigation: (...args: unknown[]) => stageMock(...args),
}));
jest.mock('../app/events', () => ({
  actionToastTri: (type: string, m: Record<string, string>) => ({ type, messageRu: m.ru }),
  emitAppEvent: (...args: unknown[]) => emitMock(...args),
}));

import {
  emitPackNotDownloadedToast,
  stageCommunityPackCardsWithSilentRetry,
} from '../app/community_packs/stage_with_retry';

describe('stageCommunityPackCardsWithSilentRetry', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    stageMock.mockReset();
    emitMock.mockReset();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    warn.mockRestore();
  });

  it('удачная первая попытка — один запрос, без пауз', async () => {
    stageMock.mockResolvedValueOnce([{ id: 'c1' }]);
    await expect(stageCommunityPackCardsWithSilentRetry('p1', 'en')).resolves.toEqual([{ id: 'c1' }]);
    expect(stageMock).toHaveBeenCalledTimes(1);
  });

  it('пусто, затем карточки — открывается со второй попытки', async () => {
    stageMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'c1' }]);
    const run = stageCommunityPackCardsWithSilentRetry('p1', 'en');
    await jest.advanceTimersByTimeAsync(1500);
    await expect(run).resolves.toEqual([{ id: 'c1' }]);
    expect(stageMock).toHaveBeenCalledTimes(2);
  });

  it('три пустые попытки (одна с исключением) — пустой результат, без исключения наружу', async () => {
    stageMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    const run = stageCommunityPackCardsWithSilentRetry('p1', 'en');
    await jest.advanceTimersByTimeAsync(4500);
    await expect(run).resolves.toEqual([]);
    expect(stageMock).toHaveBeenCalledTimes(3);
  });

  it('человек ушёл с плитки — повторы останавливаются', async () => {
    stageMock.mockResolvedValue([]);
    await expect(
      stageCommunityPackCardsWithSilentRetry('p1', 'en', undefined, { isStillWanted: () => false }),
    ).resolves.toEqual([]);
    expect(stageMock).toHaveBeenCalledTimes(1);
  });

  it('мягкая подсказка — info, без «ошибки» и «не удалось»', () => {
    emitPackNotDownloadedToast();
    expect(emitMock).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'info' }));
    const [, payload] = emitMock.mock.calls[0];
    expect(payload.messageRu).toBe('Набор ещё не скачан — нужен интернет.');
    expect(payload.messageRu).not.toMatch(/ошибк|не удалось/i);
  });
});
