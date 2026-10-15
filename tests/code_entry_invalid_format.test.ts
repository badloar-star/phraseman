/**
 * «Неверный формат» промокода и кода друга (решение владельца 12.10, журнал п.81(13); кадры overlays-campaigns-013/021).
 * зачем: раньше кнопка молча выключалась, состояние из макета было недостижимо. Теперь кнопка активна при непустом коде,
 * формат проверяется по нажатию ДО загрузки и сети и объясняется текстом; ответ сервера bad_code — тот же текст.
 */
import fs from 'fs';
import path from 'path';

import {
  hasEnteredCode,
  isPromoCodeFormatValid,
  isReferralCodeCharsetValid,
  isReferralCodeLongEnough,
  normalizeReferralCodeInput,
  PROMO_CODE_FORMAT,
  REFERRAL_CODE_MIN_LENGTH,
} from '../app/code_entry_format';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('формат кодов (чистый модуль)', () => {
  it.each([
    ['WELC0ME', true],
    ['  welcome  ', true],
    ['AB', false],
    ['SPRING-24_X', true],
    ['ПРОМО', false],
    ['CODE!', false],
    ['A'.repeat(32), true],
    ['A'.repeat(33), false],
    ['', false],
  ])('промокод %p → %p', (raw, ok) => {
    expect(isPromoCodeFormatValid(raw)).toBe(ok);
  });

  it.each([
    ['AN', false],
    ['ann', false],
    ['ANNA', true],
    [' anna42 ', true],
  ])('код друга %p достаточно длинный → %p', (raw, ok) => {
    expect(isReferralCodeLongEnough(raw)).toBe(ok);
  });

  // зачем (координатор 15.10, overlays-campaigns-021): двойники кириллицы и пробелы не должны превращать верный код в «не найден»
  it.each([
    ['сат4kp', 'CAT4KP'],
    ['ABC DEF', 'ABCDEF'],
    ['abc-def', 'ABCDEF'],
    ['  мх7рт2 ', 'MX7PT2'],
  ])('нормализация кода друга %p → %p', (raw, expected) => {
    expect(normalizeReferralCodeInput(raw)).toBe(expected);
  });

  it.each([
    ['ABCD42', true],
    ['сат4kp', true],
    ['AB!CD', false],
    ['КОД_12', false],
    ['ЖЖЖЖ', false],
  ])('алфавит кода друга %p → %p', (raw, ok) => {
    expect(isReferralCodeCharsetValid(raw)).toBe(ok);
  });

  it('кнопка активна при любом непустом вводе, пустое и пробелы — нет', () => {
    expect(hasEnteredCode('A')).toBe(true);
    expect(hasEnteredCode('   ')).toBe(false);
    expect(hasEnteredCode('')).toBe(false);
    expect(REFERRAL_CODE_MIN_LENGTH).toBe(4);
  });

  it('формат промокода совпадает с серверным CODE_RE', () => {
    expect(read('functions/src/promo_codes.ts')).toContain(`const CODE_RE = ${String(PROMO_CODE_FORMAT)};`);
  });
});

describe('экраны: проверка формата до загрузки и сети', () => {
  it('промокод: кнопка по непустому коду; неверный формат → bad_code до runRedeem; вид кнопки — по введённому коду', () => {
    const src = read('app/promo_code_entry.tsx');
    expect(src).toContain('const canSubmit = hasEnteredCode(normalizedCode) && !busy;');
    const submit = src.slice(src.indexOf('const submit = useCallback(async () => {'));
    expect(submit.indexOf('if (!isPromoCodeFormatValid(code)) {')).toBeLessThan(submit.indexOf('await runRedeem(code);'));
    expect(submit).toContain("setFeedback(feedbackForStatus('bad_code', undefined, undefined, L));");
    expect(src).toContain('const inputValid = isPromoCodeFormatValid(normalizedCode);');
    expect(src).toContain('opacity: (submitLooksReady || busy) ? 1 : 0.55,');
    expect(src).toContain("'Проверь код: похоже, он введён неверно.'");
  });

  it('код друга: кнопка по непустому коду; короче 4 → invalid до «Применяем…» и сети', () => {
    const src = read('components/referral_code_sheet.tsx');
    expect(src).toContain('const canSubmit = hasEnteredCode(code) && !busy;');
    const submit = src.slice(src.indexOf('const submit = useCallback(async () => {'));
    expect(submit.indexOf('if (!isReferralCodeLongEnough(code)) {')).toBeLessThan(submit.indexOf('setBusy(true);'));
    expect(submit).toContain("setFeedback(feedbackForStatus('invalid', L));");
    expect(src).toContain("'Проверь код: он слишком короткий.'");
    // символы вне латиницы/цифр — «не нашли такой код» без сети; в сеть и в поиск владельца уходит нормализованный код
    expect(submit.indexOf('if (!isReferralCodeCharsetValid(code)) {')).toBeLessThan(submit.indexOf('setBusy(true);'));
    expect(submit).toContain("setFeedback(feedbackForStatus('unknown_code', L));");
    expect(submit).toContain('await applyManualReferralCode(normalized);');
    expect(submit).toContain('await lookupUserByFriendCode(normalized);');
  });

  it('ответ сервера invalid-argument «bad_code» — «Проверь код», подмена promo=bad_code для съёмки', () => {
    const client = read('app/promo_code_client.ts');
    expect(client).toContain("const badCode = errorCode.includes('invalid-argument') && message.includes('bad_code');");
    expect(client).toContain("return { status: rateLimited ? 'rate_limited' : badCode ? 'bad_code' : 'error' };");
  });
});

describe('подмена promo=bad_code', () => {
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  it('отдаёт статус bad_code без сервера', () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const social = require('../app/dev_social_state') as typeof import('../app/dev_social_state');
    social.resetDevSocialStateForTests();
    expect(social.DEV_PROMO_RESULTS).toContain('bad_code');
    social.setDevSocialState({ promo: 'bad_code' });
    expect(social.getDevPromoResult()).toEqual({ status: 'bad_code' });
  });
});
