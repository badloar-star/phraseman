// зачем (координатор 12.10): Сверка снимает пилюлю «N/30» (076ab7aae) без ИИ на проде — ссылка dev_dialog_send=…
// подменяет старт сессии и ход ДО сети; ok — остаток «зеркало − 1» (подтверждение без прыжка), отказы — свои причины.
import fs from 'fs';
import path from 'path';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

const mockCallable = jest.fn();
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
const mockReadQuota = jest.fn();
jest.mock('../app/ai_dialog_daily_quota', () => ({
  ...jest.requireActual('../app/ai_dialog_daily_quota'),
  readAiDialogMonthlyQuota: (...a: unknown[]) => mockReadQuota(...a),
}));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ stableId: 'stable-1' }) }));

import {
  DEV_DIALOG_SEND_DELAY_MS,
  devDialogNextMonthStartMs,
  devDialogSessionId,
  resolveDevDialogSend,
} from '../app/dev_dialog_send';
import { getDevDialogSend, resetDevDialogState, setDevDialogState } from '../app/dev_dialog_state';
import {
  DEV_DIALOG_HINT_TEXT,
  DEV_DIALOG_REPLY_EXPLANATION,
  DEV_DIALOG_REPLY_TRANSLATION,
  DialogueV2TurnFailureError,
  sendDialogueV2CoachedTextTurn,
} from '../app/dialogue_v2_turn_coaching_client';

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  resetDevDialogState();
  mockCallable.mockReset();
  mockReadQuota.mockReset();
});

const deps = (quota: unknown) => {
  const waited: number[] = [];
  return {
    waited,
    deps: {
      readQuota: async () => quota as { status: string },
      wait: async (ms: number) => { waited.push(ms); },
      nowMs: () => Date.UTC(2026, 9, 12),
    },
  };
};

describe('итог подставного хода', () => {
  it('ok: остаток = зеркало − 1, ждёт ~1,5 с', async () => {
    const d = deps({ status: 'allowed', remaining: 12, resetAtMs: 123 });
    await expect(resolveDevDialogSend('ok', d.deps)).resolves.toEqual({ kind: 'reply', remaining: 11, resetAtMs: 123, source: 'mirror' });
    expect(d.waited).toEqual([DEV_DIALOG_SEND_DELAY_MS]);
  });

  it('ok без зеркала: 30 → 29, сброс — начало следующего месяца', async () => {
    const d = deps({ status: 'unknown' });
    await expect(resolveDevDialogSend('ok', d.deps)).resolves.toEqual({
      kind: 'reply', remaining: 29, resetAtMs: devDialogNextMonthStartMs(Date.UTC(2026, 9, 12)), source: 'default',
    });
    expect(devDialogNextMonthStartMs(Date.UTC(2026, 9, 12))).toBe(Date.UTC(2026, 10, 1));
  });

  it.each(['quota_exhausted', 'network', 'service'] as const)('%s → отказ с той же причиной', async (mode) => {
    await expect(resolveDevDialogSend(mode, deps({}).deps)).resolves.toEqual({ kind: 'fail', reason: mode });
  });

  it('подставная сессия проходит формат сервера', () => {
    expect(devDialogSessionId(Date.now())).toMatch(/^d2s_[A-Za-z0-9_-]{32,96}$/);
  });
});

describe('клиент хода с флагом dev_dialog_send', () => {
  const request = {
    sessionId: devDialogSessionId(Date.now()),
    turnId: 'd2t_abcdefghijklmnop1234',
    studyTarget: 'en' as const,
    scenarioId: 'cafe_order',
    userMessage: 'Hello there',
    interfaceLang: 'ru',
  };

  it('ok: ответ без сервера, остаток из зеркала − 1', async () => {
    jest.useFakeTimers();
    try {
      expect(setDevDialogState({ send: 'ok' })).toBe(true);
      mockReadQuota.mockResolvedValue({ status: 'allowed', remaining: 7, limit: 30, resetAtMs: 999, quotaVersion: 3 });
      const pending = sendDialogueV2CoachedTextTurn(request);
      await jest.advanceTimersByTimeAsync(DEV_DIALOG_SEND_DELAY_MS);
      const res = await pending;
      // зачем (координатор 12.10, dialogs-017): подставной ход всегда отдаёт разбор с подсказкой — иначе кнопка «Подсказка» в карточке цели не рисуется и кадр недостижим
      expect(res).toMatchObject({ kind: 'reply', replayed: false, coaching: { hint: DEV_DIALOG_HINT_TEXT, mood: null, dialogueEnded: false, betterPhrasing: null }, quota: { remaining: 6, resetAtMs: 999, quotaVersion: 1 } });
      expect(mockCallable).not.toHaveBeenCalled();
      // зачем (chain21 13.10, dialogs-015/019/020): кнопки «Перевод» и «Почему так» рисуются только при переводе/объяснении реплики
      expect(res.kind === 'reply' ? res.coaching : null).toMatchObject({
        replyTranslations: [DEV_DIALOG_REPLY_TRANSLATION],
        replyExplanations: [DEV_DIALOG_REPLY_EXPLANATION],
      });
      if (res.kind === 'reply') {
        expect(res.coaching?.replyTranslations).toHaveLength(res.replies.length);
        expect(res.coaching?.replyExplanations).toHaveLength(res.replies.length);
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it('network: отказ с причиной network, сервер не вызывается', async () => {
    jest.useFakeTimers();
    try {
      setDevDialogState({ send: 'network' });
      const pending = sendDialogueV2CoachedTextTurn(request).catch((e: unknown) => e);
      await jest.advanceTimersByTimeAsync(DEV_DIALOG_SEND_DELAY_MS);
      const err = await pending;
      expect(err).toBeInstanceOf(DialogueV2TurnFailureError);
      expect((err as DialogueV2TurnFailureError).reason).toBe('network');
      expect(mockCallable).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('флаг снят — getDevDialogSend() = null', () => {
    setDevDialogState({ send: 'ok' });
    setDevDialogState({ send: null });
    expect(getDevDialogSend()).toBeNull();
  });
});

describe('проводка (контракт по исходнику)', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it('старт сессии подменяется до сети (ловит и предстарт)', () => {
    const src = read('app/dialogue_v2_turn_client.ts');
    const fn = src.slice(src.indexOf('async function requestDialogueV2TextSessionFromNetwork'));
    expect(fn.indexOf('if (getDevDialogSend())')).toBeGreaterThan(-1);
    expect(fn.indexOf('if (getDevDialogSend())')).toBeLessThan(fn.indexOf('httpsCallable'));
  });

  it('ссылка dev_state?dev_dialog_send=… разбирается и ставит флаг', () => {
    const src = read('app/dev_state_fixtures.ts');
    expect(src).toContain("request.dialogSend = pick('dev_dialog_send', [...DEV_DIALOG_SENDS, 'off'] as const);");
    expect(src).toContain("setDevDialogState({ send: request.dialogSend === 'off' ? null : request.dialogSend! })");
  });

  it('«лимит исчерпан» от фикстуры не пишется в зеркало', () => {
    const src = read('hooks/use_dialogue_v2_session_coaching.ts');
    const at = src.indexOf("if (getDevDialogSend() === 'quota_exhausted')");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(src.indexOf('void markAiDialogMonthlyQuotaExhausted('));
  });
});
