// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»;
// решение «Да, сделай» — ответы от ИИ и в свободном разговоре): ход свободного разговора просит у сервера готовые ответы
// (hintsLang), показывает их над полем ввода, а со старым сервером работает как раньше.
/* eslint-disable import/first */
const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallableRun),
}));

import { sendDialogueV2FreeformTurn } from '../app/dialogue_v2_freeform_client';
import { readSource } from './helpers/read_source';

const request = {
  sessionId: `d2fs_${'a'.repeat(32)}`,
  turnId: `d2ft_${'b'.repeat(16)}`,
  studyTarget: 'en' as const,
  userMessage: 'Hi! I like music.',
};
const base = { ok: true, assistantMessage: 'Nice! What kind of music do you like?', sessionId: request.sessionId, expiresAtMs: Date.UTC(2026, 11, 1) };

describe('свободный разговор: готовые ответы от сервера', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    mockCallableRun.mockReset();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  // Порядок важен: последний тест переводит модуль на ходы без hintsLang до перезапуска приложения.
  it('ход уходит с hintsLang и приносит готовые ответы; негодный элемент выбрасывается', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: { ...base, sayHints: [
      { text: 'I like rock music.', meaning: 'Мне нравится рок.' }, { text: '', meaning: 'пусто' }, 'мусор',
    ] } });
    const result = await sendDialogueV2FreeformTurn(request, { hintsLang: 'ru' });
    expect(mockCallableRun).toHaveBeenCalledWith({ ...request, hintsLang: 'ru' });
    expect(result?.sayHints).toEqual([{ text: 'I like rock music.', meaning: 'Мне нравится рок.' }]);
    expect(result?.assistantMessage).toBe(base.assistantMessage);
  });

  it('пустой или битый список не роняет ход — поля просто нет', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: { ...base, sayHints: [] } });
    const empty = await sendDialogueV2FreeformTurn(request, { hintsLang: 'ru' });
    expect(empty).toEqual(base);
    mockCallableRun.mockResolvedValueOnce({ data: { ...base, sayHints: 'no' } });
    const broken = await sendDialogueV2FreeformTurn(request, { hintsLang: 'ru' });
    expect(broken).toEqual(base);
  });

  it('без опций запрос прежний — без hintsLang', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: base });
    await sendDialogueV2FreeformTurn(request);
    expect(mockCallableRun).toHaveBeenCalledWith(request);
  });

  it('сервер до выкладки отклонил hintsLang — тот же ход повторяется без поля и проходит; дальше сразу без поля', async () => {
    mockCallableRun
      .mockRejectedValueOnce(Object.assign(new Error('dialogue_v2_freeform_session_turn_request_invalid'), { code: 'functions/invalid-argument' }))
      .mockResolvedValueOnce({ data: base })
      .mockResolvedValueOnce({ data: base });
    await expect(sendDialogueV2FreeformTurn(request, { hintsLang: 'ru' })).resolves.toEqual(base);
    expect(mockCallableRun.mock.calls.map((call) => call[0])).toEqual([{ ...request, hintsLang: 'ru' }, request]);
    await sendDialogueV2FreeformTurn(request, { hintsLang: 'ru' });
    expect(mockCallableRun.mock.calls[2][0]).toEqual(request);
  });

  it('экран передаёт язык интерфейса в ход и ответы сервера — в подбор подсказок', () => {
    const screen = readSource('app/dialogue_v2_freeform.tsx');
    expect(screen).toContain('{ hintsLang: hintsLangRef.current }');
    expect(screen).toContain('Object.freeze({ replyText: result.assistantMessage, hints: result.sayHints })');
    expect(screen).toContain('serverHints: serverSayHints,');
  });
});
