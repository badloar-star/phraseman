/**
 * Релизный пол 10.10 (решения координатора): правда в окне удаления; окно
 * «аккаунт удалён навсегда» вместо молчаливого закрытия; подтверждение смены
 * аккаунта в онбординге; тихий спиннер, пока данные догружаются после входа.
 */
import fs from 'fs';
import path from 'path';

const queued: Array<{ title: string; message: string; actions: Array<{ label: string; value: string; ghost?: boolean }> }> = [];
let nextChoice = 'switch';
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingInfoAlert: (title: string, message: string, ok: string) => {
    queued.push({ title, message, actions: [{ label: ok, value: 'ok' }] });
    return Promise.resolve();
  },
  enqueueThemedBlockingChoiceAlert: (title: string, message: string, actions: Array<{ label: string; value: string; ghost?: boolean }>) => {
    queued.push({ title, message, actions });
    return Promise.resolve(nextChoice);
  },
}));
const signOutMock = jest.fn();
jest.mock('../app/auth_provider', () => ({ signOutAndWipeForAccountSwitch: () => signOutMock() }));
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Alert: { alert: jest.fn() },
}));
jest.mock('../app/account_delete_restore_client', () => ({
  fetchAccountDeleteStatus: jest.fn(),
  restoreDeletedAccount: jest.fn(),
}));

import { noticeAccountDeletedForever } from '../app/account_delete_restore_prompt';
import { confirmAndSwitchAccountInOnboarding, onboardingAccountSwitchFailureText } from '../app/onboarding_account_switch_confirm';
import {
  __resetCloudProfileRefreshForTests,
  beginCloudProfileRefresh,
  isCloudProfileRefreshing,
} from '../app/cloud_profile_refresh_state';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

beforeEach(() => {
  queued.length = 0;
  nextChoice = 'switch';
  signOutMock.mockReset();
  __resetCloudProfileRefreshForTests();
});

describe('окно удаления говорит правду о 14 днях', () => {
  it('нет «периода восстановления нет», есть 14 дней и «войди снова»', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    expect(modal).not.toMatch(/периода восстановления нет|no recovery period/);
    expect(modal).toContain("ru: 'Аккаунт удалится через 14 дней. Если передумаешь — просто войди снова тем же способом. Подписка в App Store или Google Play не отменится автоматически.'");
    expect(read('functions/src/account_delete_grace.ts')).toContain('14 * 24 * 60 * 60 * 1000');
  });

  it('гостю (без входа через Google/Apple) — не обещаем «войди снова», ему некуда входить', () => {
    const modal = read('components/DeleteAccountConfirmModal.tsx');
    expect(modal).toContain('peekLinkedAuthFromCurrentUser() !== null');
    expect(modal).toContain('{hasProviderSignIn ? L(');
    expect(modal).toContain("ru: 'Прогресс удалится безвозвратно. Подписка в App Store или Google Play не отменится автоматически.'");
  });
});

describe('окончательно удалённый аккаунт — окно, а не тишина', () => {
  it('инфо-окно очереди с понятным текстом', () => {
    noticeAccountDeletedForever('ru', 'test');
    expect(queued).toHaveLength(1);
    expect(queued[0].title).toBe('Аккаунт удалён');
    expect(queued[0].message).toBe('Этот аккаунт удалён безвозвратно. Войди другим способом или начни заново.');
  });

  it('окно входа и оба пути онбординга зовут его на identity_retired', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    const at = modal.indexOf("result.error === 'identity_retired'");
    expect(modal.slice(at, at + 400)).toContain("noticeAccountDeletedForever(lang, 'registration_modal')");
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding.match(/noticeAccountDeletedForever\(lang, 'onboarding'\)/g)).toHaveLength(2);
  });
});

describe('смена аккаунта в онбординге — с кнопкой подтверждения', () => {
  it('окно выбора: «Отмена» (ghost) и действие смены; согласие — та же смена, что в Настройках', async () => {
    signOutMock.mockResolvedValue({ ok: true, synced: true });
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'switched' });
    expect(queued[0].actions.map((a) => [a.value, a.ghost === true])).toEqual([['cancel', true], ['switch', false]]);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('отмена — ничего не стирает', async () => {
    nextChoice = 'cancel';
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'cancelled' });
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('сбой смены — причина наружу, не «успех»', async () => {
    signOutMock.mockResolvedValue({ ok: false, reason: 'sync_failed' });
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'failed', reason: 'sync_failed' });
  });

  it('оба пути онбординга обрабатывают account_switch_required до общей ошибки', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding.match(/await confirmAndSwitchAccountInOnboarding\(lang\)/g)).toHaveLength(2);
    expect(onboarding.match(/onboardingAccountSwitchFailureText\(lang, switched\.reason\)/g)).toHaveLength(2);
  });

  it('сбой смены — причина простыми словами, не повтор «подтверди смену»', () => {
    expect(onboardingAccountSwitchFailureText('ru', 'sync_failed')).toContain('Проверь интернет');
    expect(onboardingAccountSwitchFailureText('ru', 'pending_shard_spend')).toContain('через минуту');
    expect(onboardingAccountSwitchFailureText('ru', 'whatever')).toBe('Не получилось сменить аккаунт. Прогресс на месте — попробуй ещё раз.');
  });
});

describe('тихий спиннер догрузки после входа', () => {
  it('флаг включается на время догрузки и гаснет; повторное завершение безвредно', () => {
    const endA = beginCloudProfileRefresh('a');
    const endB = beginCloudProfileRefresh('b');
    expect(isCloudProfileRefreshing()).toBe(true);
    endA();
    endA();
    expect(isCloudProfileRefreshing()).toBe(true);
    endB();
    expect(isCloudProfileRefreshing()).toBe(false);
  });

  it('страховка гасит зависшую догрузку', () => {
    jest.useFakeTimers();
    beginCloudProfileRefresh('stuck');
    expect(isCloudProfileRefreshing()).toBe(true);
    jest.advanceTimersByTime(30_000);
    expect(isCloudProfileRefreshing()).toBe(false);
    jest.useRealTimers();
  });

  it('вход включает флаг и гасит его на любом исходе догрузки; шапка Главной показывает KitSpinner', () => {
    const auth = read('app/auth_provider.ts');
    const at = auth.indexOf('function scheduleSameStablePostAuthRefresh(');
    const body = auth.slice(at, auth.indexOf('async function markOnboardedAfterSignIn', at));
    expect(body).toContain('const endCloudRefresh = beginCloudProfileRefresh(stage);');
    expect(body).toContain('}).finally(endCloudRefresh);');
    const header = read('components/home/v2/HomeV2Header.tsx');
    expect(header).toContain('{refreshing ? <KitSpinner');
    expect(read('app/(tabs)/home.tsx')).toContain('refreshing={cloudProfileRefreshing}');
  });
});
