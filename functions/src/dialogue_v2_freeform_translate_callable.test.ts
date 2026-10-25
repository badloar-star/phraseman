// зачем («Перевести» по тапу, 25.10; Ревизор по e00c839e0): перевод — отдельный вызов, только реплика ИИ из СВОЕЙ сессии,
// а ответ хода не меняется (клиенты 2.0.1/2.0.2 проверяют его по точному набору полей).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  createDialogueV2FreeformTranslateHandler,
  parseDialogueV2FreeformTranslateInput,
} from './dialogue_v2_freeform_translate_callable';

const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const ACTOR = Object.freeze({ authUid: 'auth-user', stableAccountId: 'stable-user' });
const NOW = 1_800_000_000_000;

function session(overrides: Record<string, unknown> = {}) {
  return {
    ownerBinding: 'owner-ok',
    studyTarget: 'en',
    expiresAtMs: NOW + 60_000,
    turns: [{ turnId: TURN_ID, userMessage: 'Hello!', assistantMessage: 'Hi! How was your day?' }],
    ...overrides,
  };
}

function deps(overrides: Record<string, unknown> = {}) {
  return {
    authorize: jest.fn(async () => ACTOR),
    readSession: jest.fn(async () => session()),
    ownerBinding: jest.fn(() => 'owner-ok'),
    translator: jest.fn(async () => 'Привет! Как прошёл твой день?'),
    nowMs: () => NOW,
    ...overrides,
  };
}

const request = (data: Record<string, unknown> = { sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'ru' }) => ({ auth: { uid: 'auth-user' }, data });

describe('dialogueV2FreeformTranslate', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  it('запрос — ровно три поля и язык из девяти', () => {
    expect(parseDialogueV2FreeformTranslateInput({ sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'ru' })).toEqual({ sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'ru' });
    expect(parseDialogueV2FreeformTranslateInput({ sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'ru', text: 'x' })).toBeNull();
    expect(parseDialogueV2FreeformTranslateInput({ sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'xx' })).toBeNull();
    expect(parseDialogueV2FreeformTranslateInput({ sessionId: 'bad', turnId: TURN_ID, translateTo: 'ru' })).toBeNull();
  });

  it('своя сессия — перевод реплики ИИ из журнала', async () => {
    const d = deps();
    await expect(createDialogueV2FreeformTranslateHandler(d)(request())).resolves.toEqual({ ok: true, translation: 'Привет! Как прошёл твой день?' });
    expect(d.translator).toHaveBeenCalledWith({ translateTo: 'ru', studyTarget: 'en', assistantMessage: 'Hi! How was your day?' });
  });

  it('чужая, отсутствующая, истёкшая сессия и нет хода — not-found без перевода', async () => {
    for (const d of [
      deps({ ownerBinding: jest.fn(() => 'someone-else') }),
      deps({ readSession: jest.fn(async () => null) }),
      deps({ readSession: jest.fn(async () => session({ expiresAtMs: NOW - 1 })) }),
      deps({ readSession: jest.fn(async () => session({ turns: [] })) }),
    ]) {
      await expect(createDialogueV2FreeformTranslateHandler(d)(request())).rejects.toMatchObject({ code: 'not-found' });
      expect(d.translator).not.toHaveBeenCalled();
    }
  });

  it('нет Plus — тот же отказ plus_required; прочие сбои доступа — unavailable', async () => {
    await expect(createDialogueV2FreeformTranslateHandler(deps({
      authorize: jest.fn(async () => { throw new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required'); }),
    }))(request())).rejects.toMatchObject({ code: 'permission-denied', message: 'dialogue_v2_freeform_plus_required' });
    await expect(createDialogueV2FreeformTranslateHandler(deps({
      authorize: jest.fn(async () => { throw new Error('private path users/victim'); }),
    }))(request())).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('перевод не получился — unavailable; без входа и с лишним полем — отказ до чтений', async () => {
    await expect(createDialogueV2FreeformTranslateHandler(deps({ translator: jest.fn(async () => null) }))(request())).rejects.toMatchObject({ code: 'unavailable' });
    const d = deps();
    await expect(createDialogueV2FreeformTranslateHandler(d)({ data: request().data } as never)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(createDialogueV2FreeformTranslateHandler(d)(request({ sessionId: SESSION_ID, turnId: TURN_ID, translateTo: 'ru', extra: 1 }))).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(d.authorize).not.toHaveBeenCalled();
    expect(d.readSession).not.toHaveBeenCalled();
  });

  it('ответ хода свободного разговора остаётся прежним — перевода в нём нет', () => {
    const turnSource = readFileSync(path.join(__dirname, 'dialogue_v2_freeform_session_turn_callable.ts'), 'utf8');
    expect(turnSource).not.toContain('assistantTranslation');
    const indexSource = readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toContain('exports.dialogueV2FreeformTranslate = dialogueV2FreeformTranslate;');
  });
});
