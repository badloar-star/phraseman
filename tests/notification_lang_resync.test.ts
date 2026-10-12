// зачем (координатор 12.10, §AUTH-0110 п.1): напоминания и язык push-токена ставились один раз на старте — после смены языка
// уведомления шли на старом до перезапуска. Сторож: смена языка (после дебаунса) переставляет их ровно один раз и только
// если язык уведомлений реально изменился.
import fs from 'fs';
import path from 'path';

import {
  NOTIFICATION_LANG_EVENT,
  installNotificationLangResync,
  noteNotificationsScheduledLang,
  peekNotificationsScheduledLang,
  resetNotificationLangResyncForTests,
  resyncNotificationLang,
} from '../app/notification_lang_resync';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('[PUSH-LANG] смена языка → уведомления на новом языке', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    resetNotificationLangResyncForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    log.mockRestore();
    jest.useRealTimers();
  });

  const deps = (overrides: Partial<Parameters<typeof resyncNotificationLang>[1]> = {}) => ({
    resolveLang: jest.fn(async (ui: string) => ui),
    isEnabled: jest.fn(async () => true),
    reschedule: jest.fn(async () => undefined),
    ...overrides,
  });

  it('новый язык — одна перестановка и язык запоминается', async () => {
    noteNotificationsScheduledLang('ru');
    const d = deps();
    await expect(resyncNotificationLang('en', d)).resolves.toBe('rescheduled');
    expect(d.reschedule).toHaveBeenCalledTimes(1);
    expect(d.reschedule).toHaveBeenCalledWith('en', 'lang_changed');
    expect(peekNotificationsScheduledLang()).toBe('en');
  });

  it('тот же язык уведомлений — ничего не переставляем и в облако не пишем', async () => {
    noteNotificationsScheduledLang('ru');
    const d = deps({ resolveLang: jest.fn(async () => 'ru') });
    await expect(resyncNotificationLang('ru', d)).resolves.toBe('same_lang');
    expect(d.reschedule).not.toHaveBeenCalled();
    expect(d.isEnabled).not.toHaveBeenCalled();
  });

  it('уведомления выключены — не ставим', async () => {
    noteNotificationsScheduledLang('ru');
    const d = deps({ isEnabled: jest.fn(async () => false) });
    await expect(resyncNotificationLang('uk', d)).resolves.toBe('disabled');
    expect(d.reschedule).not.toHaveBeenCalled();
    expect(peekNotificationsScheduledLang()).toBe('ru');
  });

  it('сбой перестановки — failed с причиной, язык не меняется', async () => {
    noteNotificationsScheduledLang('ru');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const d = deps({ reschedule: jest.fn(async () => { throw new Error('boom'); }) });
      await expect(resyncNotificationLang('uk', d)).resolves.toBe('failed');
      expect(warn).toHaveBeenCalled();
      expect(peekNotificationsScheduledLang()).toBe('ru');
    } finally {
      warn.mockRestore();
    }
  });

  it('дебаунс: три быстрых смены языка — одна перестановка на последний', async () => {
    jest.useFakeTimers();
    noteNotificationsScheduledLang('ru');
    const d = deps();
    // в jest DeviceEventEmitter замокан и событий не доставляет — свой источник событий через deps.subscribe
    let listener: ((event: { lang?: unknown; previous?: unknown } | undefined) => void) | null = null;
    installNotificationLangResync({
      ...d,
      debounceMs: 1_000,
      subscribe: (l) => { listener = l; return { remove: () => { listener = null; } }; },
    });
    const emit = (event: { lang: string; previous: string }) => listener?.(event);
    emit({ lang: 'uk', previous: 'ru' });
    emit({ lang: 'en', previous: 'uk' });
    emit({ lang: 'es', previous: 'en' });
    jest.advanceTimersByTime(999);
    expect(d.reschedule).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    jest.useRealTimers();
    await flush();
    await flush();
    expect(d.reschedule).toHaveBeenCalledTimes(1);
    expect(d.reschedule).toHaveBeenCalledWith('es', 'lang_changed');
  });

  it('контракт: имя события совпадает с LangContext; корень ставит подписку и общую функцию планирования', () => {
    const langContext = fs.readFileSync(path.join(__dirname, '..', 'components', 'LangContext.tsx'), 'utf8');
    expect(langContext).toContain(`export const APP_LANG_CHANGED = '${NOTIFICATION_LANG_EVENT}';`);
    const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(layout).toContain('async function scheduleRemindersForLang(lang: Lang, studyTarget?: RuntimeStudyTarget)');
    expect(layout).toContain('noteNotificationsScheduledLang(lang);');
    expect(layout).toContain('reschedule: (nextLang) => scheduleRemindersForLang(nextLang as Lang, lastSessionStudyTarget),');
  });
});
