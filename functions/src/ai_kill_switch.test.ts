// зачем (Q102, координатор §62): аварийный стоп ИИ покрывает разбор диалога и свободный разговор.
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('firebase-admin', () => ({ firestore: () => ({}) }));

import { aiKillSwitchOn, withAiKillSwitch } from './ai_kill_switch';

describe('аварийный стоп ИИ', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it('стоп включён — обработчик не вызывается, ответ unavailable/ai_globally_disabled', async () => {
    const handler = jest.fn(async () => 'ok');
    const guarded = withAiKillSwitch('test', handler, async () => true);
    await expect(guarded({})).rejects.toMatchObject({ code: 'unavailable', message: 'ai_globally_disabled' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('сбой чтения флага — ИИ не выключается, причина в логе', async () => {
    await expect(aiKillSwitchOn('test', async () => { throw new Error('boom'); })).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalledWith('[AI-KILL-SWITCH] read_failed', expect.stringContaining('boom'));
  });

  it('стоп выключен — работает как раньше', async () => {
    const guarded = withAiKillSwitch('test', async (request: { n: number }) => request.n + 1, async () => false);
    await expect(guarded({ n: 1 })).resolves.toBe(2);
  });

  it('проводка: свободный разговор и разбор диалога проверяют стоп', () => {
    const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');
    expect(read('dialogue_v2_freeform_session_start_callable.ts')).toMatch(/withAiKillSwitch\('dialogueV2FreeformSessionStart'/);
    expect(read('dialogue_v2_freeform_session_turn_callable.ts')).toMatch(/withAiKillSwitch\('dialogueV2FreeformSessionTurn'/);
    expect(read('dialogue_v2_freeform_translate_callable.ts')).toMatch(/withAiKillSwitch\('dialogueV2FreeformTranslate'/);
    expect(read('premium_dialog_review.ts')).toMatch(/if \(await aiKillSwitchOn\('premiumDialogReview'\)\)/);
  });
});
