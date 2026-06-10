/**
 * iOS-фолбэк атрибуции реферала через буфер обмена (app/referral_clipboard.ts):
 *  - парсер кода из текста буфера (только ссылки с ref=, не голый текст);
 *  - однократность чтения буфера (бережём системный промпт iOS);
 *  - пустой буфер не сжигает единственную попытку.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import {
  checkClipboardForReferralOnce,
  extractRefFromClipboardText,
} from '../app/referral_clipboard';
import { captureReferralCodeIfNew, tryApplyPendingReferral } from '../app/referral_bootstrap';
import { isReferralCloudEnabled } from '../app/referral_flags';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-clipboard', () => ({
  hasStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));
jest.mock('../app/firebase', () => ({ logEvent: jest.fn() }));
jest.mock('../app/referral_flags', () => ({
  isReferralCloudEnabled: jest.fn(() => true),
  __esModule: true,
  default: () => null,
}));
jest.mock('../app/referral_bootstrap', () => ({
  captureReferralCodeIfNew: jest.fn(() => Promise.resolve()),
  tryApplyPendingReferral: jest.fn(() => Promise.resolve('applied')),
  __esModule: true,
  default: () => null,
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (isReferralCloudEnabled as jest.Mock).mockReturnValue(true);
});

describe('extractRefFromClipboardText — только инвайт-ссылки, не голый текст', () => {
  it('парсит https-инвайт', () => {
    expect(extractRefFromClipboardText('https://knowlyapps.com/phraseman/invite?ref=K7M2PA'))
      .toBe('K7M2PA');
  });

  it('парсит app-схему и нижний регистр', () => {
    expect(extractRefFromClipboardText('phraseman://invite?ref=ab12cd')).toBe('AB12CD');
  });

  it('парсит ref среди других параметров', () => {
    expect(extractRefFromClipboardText('https://knowlyapps.com/phraseman/invite?lang=ru&ref=ZZTOP9&x=1'))
      .toBe('ZZTOP9');
  });

  it('НЕ матчит голый код без ссылки (ложные срабатывания)', () => {
    expect(extractRefFromClipboardText('K7M2PA')).toBeNull();
  });

  it('НЕ матчит чужой URL с ref=, не относящийся к phraseman', () => {
    expect(extractRefFromClipboardText('https://example.com/?ref=ABCDEF')).toBeNull();
  });

  it('пустой/мусор/слишком длинный текст → null', () => {
    expect(extractRefFromClipboardText('')).toBeNull();
    expect(extractRefFromClipboardText(null)).toBeNull();
    expect(extractRefFromClipboardText('просто заметка про invite без кода')).toBeNull();
    expect(extractRefFromClipboardText('phraseman invite ref= (пусто)')).toBeNull();
    expect(extractRefFromClipboardText(`phraseman://invite?ref=ABCDEF${'x'.repeat(3000)}`)).toBeNull();
  });
});

describe('checkClipboardForReferralOnce — бережём промпт вставки', () => {
  it('валидная ссылка в буфере: capture + apply + флаг «проверено»', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue(
      'https://knowlyapps.com/phraseman/invite?ref=K7M2PA',
    );

    await checkClipboardForReferralOnce();

    expect(captureReferralCodeIfNew).toHaveBeenCalledWith('K7M2PA', 'clipboard');
    expect(tryApplyPendingReferral).toHaveBeenCalled();
    expect(mockStorage.referral_clipboard_checked_v1).toBe('1');
  });

  it('второй вызов после прочтения буфера — не читает снова', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('phraseman://invite?ref=AAAA11');

    await checkClipboardForReferralOnce();
    await checkClipboardForReferralOnce();

    expect(Clipboard.getStringAsync).toHaveBeenCalledTimes(1);
  });

  it('пустой буфер: попытка НЕ сжигается (флаг не ставится, буфер не читается)', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(false);

    await checkClipboardForReferralOnce();

    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(mockStorage.referral_clipboard_checked_v1).toBeUndefined();
  });

  it('мусор в буфере: флаг ставится, capture не зовётся', async () => {
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);
    (Clipboard.getStringAsync as jest.Mock).mockResolvedValue('случайный текст');

    await checkClipboardForReferralOnce();

    expect(captureReferralCodeIfNew).not.toHaveBeenCalled();
    expect(mockStorage.referral_clipboard_checked_v1).toBe('1');
  });

  it('рефералка выключена (RC ещё не подтянулся): буфер не трогаем, попытку не сжигаем', async () => {
    (isReferralCloudEnabled as jest.Mock).mockReturnValue(false);
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);

    await checkClipboardForReferralOnce();

    expect(Clipboard.hasStringAsync).not.toHaveBeenCalled();
    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(mockStorage.referral_clipboard_checked_v1).toBeUndefined();
  });

  it('код уже ждёт применения (deeplink успел): буфер не читаем, флаг ставим', async () => {
    mockStorage.pending_referral_code = 'K7M2PA';
    (Clipboard.hasStringAsync as jest.Mock).mockResolvedValue(true);

    await checkClipboardForReferralOnce();

    expect(Clipboard.getStringAsync).not.toHaveBeenCalled();
    expect(mockStorage.referral_clipboard_checked_v1).toBe('1');
  });
});
