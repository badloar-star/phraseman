// зачем (координатор 25.10, макет account-delete-variant-b §3): «Восстановить аккаунт?» с цифрами за флагом «Пульта»;
// цифр нет — окно без плашки, причина в журнале; флаг выкл — окно байт-в-байт прежнее.
import { readSource } from './helpers/read_source';

let mockVariantB = false;
jest.mock('../app/remote_flags', () => ({
  getRemoteBool: (key: string) => (key === 'account_delete_variant_b_ui_enabled' ? mockVariantB : false),
}));
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingChoiceAlert: jest.fn(),
  enqueueThemedBlockingInfoAlert: jest.fn(),
}));
jest.mock('../app/dev_account_state', () => ({ getDevAccountRestoreMode: () => null }));
jest.mock('../app/release_reason', () => ({ releaseReason: jest.fn() }));

/* eslint-disable import/first */
import { parseAccountRestoreSummary } from '../app/account_delete_restore_client';
import { accountRestoreChoiceView } from '../app/account_delete_restore_prompt';
import { accountRestoreSummaryCells, accountRestoreSummaryMessage } from '../app/account_restore_summary_copy';

const SUMMARY = { streakDays: 12, phrasesLearned: 140, currentLesson: 3, lessonTotal: 32 };

beforeEach(() => {
  mockVariantB = false;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('тексты окна по макету', () => {
  it('ru: «Аккаунт удалится через 11 дней. Весь прогресс ещё на месте.» и плашка «12 дней · серия | 140 · фраз | 3 из 32 · уроков»', () => {
    expect(accountRestoreSummaryMessage('ru', 11)).toBe('Аккаунт удалится через 11 дней. Весь прогресс ещё на месте.');
    expect(accountRestoreSummaryCells('ru', SUMMARY)).toEqual([
      { value: '12 дней', label: 'серия' },
      { value: '140', label: 'фраз' },
      { value: '3 из 32', label: 'уроков' },
    ]);
  });

  it('формы числа: 1 день / 2 дня, 1 фраза / 3 фразы; en, pl', () => {
    expect(accountRestoreSummaryMessage('ru', 1)).toBe('Аккаунт удалится через 1 день. Весь прогресс ещё на месте.');
    const one = accountRestoreSummaryCells('ru', { ...SUMMARY, streakDays: 2, phrasesLearned: 1 });
    expect(one[0].value).toBe('2 дня');
    expect(one[1].label).toBe('фраза');
    expect(accountRestoreSummaryCells('ru', { ...SUMMARY, phrasesLearned: 3 })[1].label).toBe('фразы');
    expect(accountRestoreSummaryMessage('en', 1)).toBe('Your account will be deleted in 1 day. All your progress is still here.');
    expect(accountRestoreSummaryCells('en', SUMMARY)[2]).toEqual({ value: '3 of 32', label: 'lessons' });
    expect(accountRestoreSummaryCells('pl', { ...SUMMARY, phrasesLearned: 22 })[1].label).toBe('zwroty');
  });
});

describe('разбор сводки с сервера', () => {
  it('целая сводка проходит; нет — null; кривые поля — null с причиной', () => {
    expect(parseAccountRestoreSummary(SUMMARY)).toEqual(SUMMARY);
    expect(parseAccountRestoreSummary(undefined)).toBeNull();
    expect(parseAccountRestoreSummary({ ...SUMMARY, currentLesson: 40 })).toBeNull();
    expect(parseAccountRestoreSummary({ ...SUMMARY, phrasesLearned: '140' })).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[ACCOUNT-RESTORE] summary invalid', expect.any(String));
  });
});

describe('вид окна по флагу', () => {
  const status = { pending: true, restorable: true, daysLeft: 11, summary: SUMMARY };

  it('флаг выкл — прежний текст и ровно прежние опции окна', () => {
    expect(accountRestoreChoiceView('ru', 11, status, 'LEGACY')).toEqual({
      message: 'LEGACY',
      opts: { slotWait: { logPrefix: '[ACCOUNT-RESTORE]', warnAfterMs: 2000, forceAfterMs: 8000 } },
    });
  });

  it('флаг вкл — текст макета и плашка; без сводки — плашка скрыта', () => {
    mockVariantB = true;
    const withCells = accountRestoreChoiceView('ru', 11, status, 'LEGACY');
    expect(withCells.message).toBe('Аккаунт удалится через 11 дней. Весь прогресс ещё на месте.');
    expect(withCells.opts.summary?.cells?.map((c) => c.value)).toEqual(['12 дней', '140', '3 из 32']);
    const noCells = accountRestoreChoiceView('ru', 11, { pending: true, restorable: true, daysLeft: 11 }, 'LEGACY');
    expect(noCells.opts.summary).toEqual({ cells: null });
    expect(console.log).toHaveBeenCalledWith('[ACCOUNT-RESTORE] summary absent (old server or read failed)');
  });

  it('онбординг и окно входа берут вид из одного места; хост рисует окно со сводкой', () => {
    const onboarding = readSource('components/CleanOnboarding.tsx');
    const prompt = readSource('app/account_delete_restore_prompt.ts');
    for (const src of [onboarding, prompt]) {
      expect(src).toContain('const view = accountRestoreChoiceView(lang, days, status, accountRestorePromptMessage(lang, days));');
      expect(src).toContain('    view.opts,');
    }
    const host = readSource('components/ThemedBlockingAlertHost.tsx');
    expect(host).toContain('<AccountRestoreSummaryDialog');
    expect(host).toContain('cells={summaryHead.summary.cells}');
  });
});
