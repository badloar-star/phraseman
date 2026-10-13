// зачем (координатор 12.10, E3 аудита Optimistic UI): пилюля «N/30» уменьшается в момент отправки, ответ сервера
// одним переходом пишет остаток и снимает ход (цифра не прыгает), сбой — откат, повтор того же хода — без изменений.
import fs from 'fs';
import path from 'path';
import {
  EMPTY_DIALOGUE_V2_QUOTA,
  beginDialogueV2QuotaTurn,
  displayDialogueV2QuotaRemaining,
  rollbackDialogueV2QuotaTurn,
  setDialogueV2QuotaRemaining,
  settleDialogueV2QuotaTurn,
} from '../app/dialogue_v2_quota_optimistic';
import { normalizeEol } from './helpers/read_source';

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

const withRemaining = (n: number | null) => setDialogueV2QuotaRemaining(EMPTY_DIALOGUE_V2_QUOTA, n);

describe('переходы квоты', () => {
  it('отправка — сразу −1; ответ сервера подтверждает то же число одним переходом', () => {
    const sent = beginDialogueV2QuotaTurn(withRemaining(30), 'turn-a');
    expect(displayDialogueV2QuotaRemaining(sent)).toBe(29);
    const answered = settleDialogueV2QuotaTurn(sent, 'turn-a', 29);
    expect(answered.pending.size).toBe(0);
    expect(displayDialogueV2QuotaRemaining(answered)).toBe(29);
  });

  it('повтор того же хода не списывает второй раз (то же состояние)', () => {
    const once = beginDialogueV2QuotaTurn(withRemaining(10), 'turn-a');
    const twice = beginDialogueV2QuotaTurn(once, 'turn-a');
    expect(twice).toBe(once);
    expect(displayDialogueV2QuotaRemaining(twice)).toBe(9);
  });

  it('сбой — откат к прежнему числу', () => {
    const sent = beginDialogueV2QuotaTurn(withRemaining(5), 'turn-a');
    const rolled = rollbackDialogueV2QuotaTurn(sent, 'turn-a', 'network');
    expect(displayDialogueV2QuotaRemaining(rolled)).toBe(5);
    expect(rollbackDialogueV2QuotaTurn(rolled, 'turn-a', 'network')).toBe(rolled);
  });

  it('не уходит ниже нуля; безлимит/неизвестно — пилюли нет', () => {
    const sent = beginDialogueV2QuotaTurn(beginDialogueV2QuotaTurn(withRemaining(1), 'a'), 'b');
    expect(displayDialogueV2QuotaRemaining(sent)).toBe(0);
    expect(displayDialogueV2QuotaRemaining(beginDialogueV2QuotaTurn(EMPTY_DIALOGUE_V2_QUOTA, 'a'))).toBeNull();
  });

  it('ответ без остатка снимает ход, остаток прежний', () => {
    const sent = beginDialogueV2QuotaTurn(withRemaining(7), 'turn-a');
    const answered = settleDialogueV2QuotaTurn(sent, 'turn-a', null);
    expect(displayDialogueV2QuotaRemaining(answered)).toBe(7);
  });

  // аудит «пропала сеть» 13.10, п.4: ответ потерян → откат → повтор приходит replayed без квоты — сервер ход уже списал.
  it('повтор хода после отката (replayed без квоты) списывает 1; дубль без хода в полёте — нет', () => {
    const sent = beginDialogueV2QuotaTurn(withRemaining(7), 'turn-a');
    const rolledBack = rollbackDialogueV2QuotaTurn(sent, 'turn-a', 'network');
    expect(displayDialogueV2QuotaRemaining(rolledBack)).toBe(7);
    const resent = beginDialogueV2QuotaTurn(rolledBack, 'turn-a');
    expect(displayDialogueV2QuotaRemaining(resent)).toBe(6);
    const replayed = settleDialogueV2QuotaTurn(resent, 'turn-a', null, true);
    expect(displayDialogueV2QuotaRemaining(replayed)).toBe(6);
    const duplicate = settleDialogueV2QuotaTurn(replayed, 'turn-a', null, true);
    expect(displayDialogueV2QuotaRemaining(duplicate)).toBe(6);
    expect(displayDialogueV2QuotaRemaining(settleDialogueV2QuotaTurn(beginDialogueV2QuotaTurn(withRemaining(0), 'z'), 'z', null, true))).toBe(0);
  });
});

describe('экран диалога зовёт переходы в нужных местах (контракт по исходнику)', () => {
  const screen = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8'));
  const hook = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use_dialogue_v2_session_coaching.ts'), 'utf8'));

  it('отправка, ответ, лимит, пауза и сбой', () => {
    expect(screen).toContain('coaching.beginQuotaTurn(pending.turnId);');
    expect(screen).toContain('coaching.applyQuota(result.quota, pending.turnId, result.replayed);');
    expect(screen).toContain('coaching.applyQuota(null, pending.turnId);');
    expect(screen).toContain('error.quotaObservation : null, pending.turnId);');
    expect(screen.split('coaching.rollbackQuotaTurn(pending.turnId, reason);').length - 1).toBe(2);
  });

  it('пилюля считается из одного состояния (без второго счётчика)', () => {
    expect(hook).toContain('const shownRemaining = displayDialogueV2QuotaRemaining(quota);');
    expect(hook).not.toMatch(/useState<number \| null>\(null\);\s*\n\s*const \[quotaExhausted/);
  });
});
