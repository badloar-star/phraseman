// зачем (координатор 14.10, dialogs-044): Сверка снимает «Отзыв отправлен» без настоящей отправки — ссылка dev_dialog_feedback=sent.
// Флаг только в памяти, только dev; в стор-сборке заглушка всегда «выключено»; карточка читает его лишь для kind='dialogue'.
import fs from 'node:fs';
import path from 'node:path';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import { isDevDialogFeedbackSent, resetDevDialogState, setDevDialogState } from '../app/dev_dialog_state';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());
afterEach(() => resetDevDialogState());

describe('dev_dialog_feedback=sent', () => {
  it('по умолчанию выключено; setDevDialogState({feedbackSent}) включает и снимает, reset сбрасывает', () => {
    expect(isDevDialogFeedbackSent()).toBe(false);
    expect(setDevDialogState({ feedbackSent: true })).toBe(true);
    expect(isDevDialogFeedbackSent()).toBe(true);
    setDevDialogState({ feedbackSent: false });
    expect(isDevDialogFeedbackSent()).toBe(false);
    setDevDialogState({ feedbackSent: true });
    resetDevDialogState();
    expect(isDevDialogFeedbackSent()).toBe(false);
  });

  it('стор-заглушка всегда «выключено», а имя параметра разбирается в dev_state_fixtures', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stub = require('../store_release_stubs/dev_state/dev_dialog_state_stub') as { isDevDialogFeedbackSent: () => boolean };
    expect(stub.isDevDialogFeedbackSent()).toBe(false);
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("pick('dev_dialog_feedback', ['sent', 'off'] as const)");
    expect(fixtures).toContain('feedbackSent: request.dialogFeedback === ');
  });

  it('карточка отзыва открывается «отправленной» только для диалога и ничего не отправляет сама', () => {
    const card = read('components/FeedbackRatingCard.tsx');
    expect(card).toContain("useState<'idle' | 'sent'>(kind === 'dialogue' && isDevDialogFeedbackSent() ? 'sent' : 'idle')");
    // отправка по-прежнему только из обработчика кнопки; начальное состояние её не вызывает
    expect(card).toContain('if (state === \'sent\' || (message === \'\' && rating === 0)) return;');
  });
});
