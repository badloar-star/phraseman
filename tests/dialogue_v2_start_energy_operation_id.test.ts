// зачем (баг 01.10, «Дизайн»: «Начать диалог» — мёртвая кнопка, operation_id_conflict):
// номер операции энергии не содержит сценарий, поэтому номер попытки обязан быть уникальным
// на каждое открытие брифинга и обновляться после каждой попытки; отказ — не тишина.
import * as fs from 'fs';
import * as path from 'path';
import { createEnergySessionIntent } from '../app/energy_session_operation_ledger';

const briefing = fs.readFileSync(path.join(__dirname, '..', 'app/dialogue_v2_briefing.tsx'), 'utf8');

describe('старт диалога V2: номер операции энергии', () => {
  it('причина бага: одна и та же попытка у разных диалогов даёт один номер операции', () => {
    const a = createEnergySessionIntent('ai_dialog', 'dialogue_v2:social_01', '0');
    const b = createEnergySessionIntent('ai_dialog', 'dialogue_v2:travel_02', '0');
    expect(a.operationId).toBe(b.operationId);
    expect(a.grant.subjectId).not.toBe(b.grant.subjectId);
  });

  it('метка открытия экрана делает повторный старт новой операцией', () => {
    const first = createEnergySessionIntent('ai_dialog', 'dialogue_v2:social_01', 'k1abc_0');
    const reopened = createEnergySessionIntent('ai_dialog', 'dialogue_v2:social_01', 'k2xyz_0');
    const retry = createEnergySessionIntent('ai_dialog', 'dialogue_v2:social_01', 'k1abc_1');
    expect(new Set([first.operationId, reopened.operationId, retry.operationId]).size).toBe(3);
  });

  it('брифинг: попытка = метка открытия + счётчик, без голого номера с нуля', () => {
    expect(briefing).toMatch(/useEnergySessionIntent\('ai_dialog', `dialogue_v2:\$\{scenarioId \?\? 'none'\}`, `\$\{briefingNonce\}_\$\{dialogueAttempt\}`\)/);
    expect(briefing).not.toMatch(/String\(dialogueAttempt\)\)/);
  });

  it('отказ старта: новый номер попытки и понятное сообщение, а не тишина', () => {
    const cancelledBranch = briefing.slice(briefing.indexOf("if (result === 'cancelled') {"), briefing.indexOf("if (result === 'insufficient')"));
    expect(cancelledBranch).toMatch(/setDialogueAttempt\(\(n\) => n \+ 1\)/);
    expect(cancelledBranch).toMatch(/dialogueStartFailedToast\(\)/);
    const catchBranch = briefing.slice(briefing.indexOf("'[DIALOGUE-V2] start energy failed'"));
    expect(catchBranch.slice(0, 400)).toMatch(/dialogueStartFailedToast\(\)/);
  });
});

// зачем (баг 01.10, «Дизайн»: ход упал на сервере, энергия списана; D87): старт подтверждается
// после первого ответа собеседника, а отказ сервиса до него возвращает энергию.
describe('диалог V2: энергия за несостоявшийся диалог возвращается', () => {
  const session = fs.readFileSync(path.join(__dirname, '..', 'app/dialogue_v2_session.tsx'), 'utf8');

  it('брифинг не подтверждает старт сам и передаёт номер операции в сессию', () => {
    expect(briefing).not.toMatch(/acknowledgeSessionStart\(/);
    expect(briefing).toMatch(/energyOp: energyIntent\.operationId/);
  });

  it('сессия: первый ответ — подтверждение, отказ сервиса — возврат с сообщением', () => {
    expect(session).toMatch(/settleEnergy\('acknowledge', 'first_turn_ok'\)/);
    expect(session).toMatch(/if \(reason === 'service'\) settleEnergy\('refund', 'dialogue_first_turn_service_failed'\)/);
    expect(session).toMatch(/energyOpRef\.current = null;/);
    expect(session).toMatch(/'Энергия возвращена'/);
  });
});
