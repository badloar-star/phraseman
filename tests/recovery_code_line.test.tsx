/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';

// зачем (координатор 18.10, эталон auth-states.html блок 7, чек-лист A7.3/A7.7/A7.8; правило владельца «красного во входе нет»):
// панель кода из письма — одна строка вторым цветом над полем: срок «4:52», «✓ Отправили новый код» или «Код не подошёл. Проверь все 6 цифр.»;
// поле остаётся обычного тона; просроченный код приложение отправляет заново само (не чаще двух раз за показ окна).
jest.mock('react-native', () => Object.setPrototypeOf({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}, jest.requireActual('react-native')));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));

import { RecoveryCodeLine, formatRecoveryClock, recoveryExpiredSendingText, recoveryNewCodeSentText } from '../components/auth/RecoveryCodeLine';
import { getAuthRecoveryCopy } from '../components/auth_recovery_modal_model';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('formatRecoveryClock', () => {
  it('минуты и две цифры секунд', () => {
    expect(formatRecoveryClock(292)).toBe('4:52');
    expect(formatRecoveryClock(59)).toBe('0:59');
    expect(formatRecoveryClock(60)).toBe('1:00');
    expect(formatRecoveryClock(0)).toBe('0:00');
  });
  it('мусор не ломает строку', () => {
    expect(formatRecoveryClock(Number.NaN)).toBe('0:00');
    expect(formatRecoveryClock(-5)).toBe('0:00');
  });
});

describe('RecoveryCodeLine', () => {
  it('срок: подпись и время одной строкой, время выделено', async () => {
    const view = await render(<RecoveryCodeLine kind="expiry" text="Код действует ещё" time="4:52" secondaryColor="#B8B9BD" inkColor="#FFFFFF" />);
    const line = view.getByTestId('recovery-code-line');
    expect(JSON.stringify(line.props.style)).toContain('"minHeight":20');
    expect(view.getByText(/Код действует ещё/)).toBeTruthy();
    expect(view.getByText('4:52')).toBeTruthy();
  });

  it('«Отправили новый код» — с галочкой; ошибка — без галочки', async () => {
    const notice = await render(<RecoveryCodeLine kind="notice" text="Отправили новый код" secondaryColor="#B8B9BD" inkColor="#FFFFFF" />);
    expect(JSON.stringify(notice.toJSON())).toContain('Ionicons');
    const wrong = await render(<RecoveryCodeLine kind="error" text="Код не подошёл. Проверь все 6 цифр." secondaryColor="#B8B9BD" inkColor="#FFFFFF" />);
    expect(JSON.stringify(wrong.toJSON())).not.toContain('Ionicons');
    expect(wrong.getByText('Код не подошёл. Проверь все 6 цифр.')).toBeTruthy();
  });

  it('красного в компоненте нет: цвета приходят только вторым цветом и цветом текста', () => {
    const source = read('components/auth/RecoveryCodeLine.tsx');
    expect(source).not.toMatch(/\.bad\b|wrongBg|#FF[0-9A-F]{4}|borderWidth|borderColor|adjustsFontSizeToFit/i);
    expect(source).toContain('fontSize: 13, lineHeight: 19');
  });
});

describe('тексты панели кода', () => {
  it('«Отправили новый код» и «Код истёк, отправляем новый…» есть на всех 9 языках', () => {
    for (const lang of LANGS) {
      expect(recoveryNewCodeSentText(lang).length).toBeGreaterThan(5);
      expect(recoveryExpiredSendingText(lang).length).toBeGreaterThan(5);
    }
    expect(recoveryNewCodeSentText('ru')).toBe('Отправили новый код');
  });
  it('неверный код — слова из макета', () => {
    expect(getAuthRecoveryCopy('ru').errorInvalidCode).toBe('Код не подошёл. Проверь все 6 цифр.');
  });
});

describe('RegistrationPromptModal: панели кода без красного, срок часами, автоотправка нового кода', () => {
  const source = read('components/RegistrationPromptModal.tsx');

  it('нигде нет красного токена glass.bad, кроме отладочной кнопки, и красноватого фона поля кода', () => {
    expect(source.split('glass.bad').length - 1).toBe(1); // DEBUG-кнопка сброса личности (только ENABLE_AUTH_IDENTITY_DEBUG)
    expect(source).not.toContain('t.wrongBg');
  });

  it('срок и повторная отправка показаны как 4:52, не «N s»', () => {
    expect(source).toContain('formatRecoveryClock(recoveryExpiryCountdown)');
    expect(source).toContain('formatRecoveryClock(recoveryCountdown)');
    expect(source).toContain('formatRecoveryClock(cleanRecoveryExpiryCountdown)');
    expect(source).not.toMatch(/\$\{recoveryCountdown\} s`|\$\{recoveryExpiryCountdown\} s`/);
  });

  it('просроченный код отправляется заново сам: с учётом серверного интервала, защитой от двойной отправки и лимитом два раза', () => {
    expect(source).toContain('const RECOVERY_AUTO_RESEND_MAX = 2;');
    const start = source.indexOf('code expired → auto resend');
    expect(start).toBeGreaterThan(-1);
    const effect = source.slice(start - 700, start + 400);
    expect(effect).toContain('recoveryCountdown > 0');
    expect(effect).toContain('autoResendInFlightRef.current');
    expect(effect).toContain('autoResendCountRef.current >= RECOVERY_AUTO_RESEND_MAX');
    expect(effect).toContain('handleRecoveryResend(true)');
    // после автоотправки поле очищается и доступно, а строка срока заменяется «Отправили новый код»
    expect(source).toContain('setRecoveryNewCodeNotice(auto);');
    expect(source).toContain('recoveryNewCodeSentText(lang)');
  });

  it('неверный код: строка вторым цветом на месте срока, цифры остаются (поле не очищается при ошибке)', () => {
    const confirm = source.slice(source.indexOf('const handleRecoveryConfirm = useCallback'), source.indexOf('const handleRecoveryResend = useCallback'));
    expect(confirm).toContain('setRecoveryError(');
    expect(confirm).not.toContain("setRecoveryCode('')");
    expect(source).toContain('<RecoveryCodeLine kind="error" text={recoveryError}');
  });
});
