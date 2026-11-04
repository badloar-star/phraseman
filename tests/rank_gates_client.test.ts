// Ранговые гейты клиента (владелец 30.10, «Главная Free по рангам»): кто «новый», что для него закрыто, старым/неопределённым — всё открыто.
import { judgeRankGateUser } from '../app/rank_gates_new_user';
import { decideForUser, isSurfaceLocked } from '../app/rank_gate_decision';
import { availableTodayTaskKinds } from '../hooks/use_today_tasks';

const SINCE = 1_000_000;
const NOW = SINCE + 10_000;
const newUser = { isNew: true, reason: 'new' } as const;
const oldUser = { isNew: false, reason: 'before_release' } as const;
const base = { gatesEnabled: true, verdict: newUser, plusActive: false, plusResolved: true };

describe('judgeRankGateUser', () => {
  it('новый — онбординг после релиза и без прежнего прогресса', () => {
    expect(judgeRankGateUser({ completedAtMs: SINCE + 5, priorProgress: false, nowMs: NOW, sinceMs: SINCE })).toEqual({ isNew: true, reason: 'new' });
  });
  it('неопределённое = не новый (всё открыто)', () => {
    expect(judgeRankGateUser({ completedAtMs: null, priorProgress: false, nowMs: NOW, sinceMs: SINCE }).isNew).toBe(false);
    expect(judgeRankGateUser({ completedAtMs: SINCE - 1, priorProgress: false, nowMs: NOW, sinceMs: SINCE }).reason).toBe('before_release');
    expect(judgeRankGateUser({ completedAtMs: SINCE + 5, priorProgress: true, nowMs: NOW, sinceMs: SINCE }).reason).toBe('prior_progress');
    expect(judgeRankGateUser({ completedAtMs: NOW + 3_600_000, priorProgress: false, nowMs: NOW, sinceMs: SINCE }).reason).toBe('clock_skew');
  });
  it('заглушка релиза: пока момент не подставлен, никто не новый', () => {
    expect(judgeRankGateUser({ completedAtMs: SINCE, priorProgress: false, nowMs: NOW }).isNew).toBe(false);
  });
});

describe('decideForUser', () => {
  it('новый на ранге 0: Видео/Диалоги закрыты с 1, Пик с 2, хаб Карточек с 3; Сохранённые и социальное открыты', () => {
    expect(decideForUser('video', { ...base, rank: 0 })).toEqual({ status: 'locked', minimumRank: 1 });
    expect(decideForUser('dialogues', { ...base, rank: 0 })).toEqual({ status: 'locked', minimumRank: 1 });
    expect(decideForUser('peak', { ...base, rank: 1 })).toEqual({ status: 'locked', minimumRank: 2 });
    expect(decideForUser('cards_hub', { ...base, rank: 2 })).toEqual({ status: 'locked', minimumRank: 3 });
    expect(isSurfaceLocked(decideForUser('saved_cards', { ...base, rank: 0 }))).toBe(false);
    expect(isSurfaceLocked(decideForUser('friends', { ...base, rank: 0 }))).toBe(false);
  });
  it('ранг открывает раздел, Plus открывает всё', () => {
    expect(decideForUser('dialogues', { ...base, rank: 1 }).status).toBe('allowed');
    expect(decideForUser('cards_hub', { ...base, rank: 3 }).status).toBe('allowed');
    expect(decideForUser('cards_hub', { ...base, rank: 0, plusActive: true }).status).toBe('allowed');
  });
  it('ранг не прочитан — не запираем (pending)', () => {
    expect(isSurfaceLocked(decideForUser('video', { ...base, rank: null }))).toBe(false);
  });
  it('старый пользователь и выключенный флаг — всё открыто', () => {
    expect(isSurfaceLocked(decideForUser('cards_hub', { ...base, verdict: oldUser, rank: 0 }))).toBe(false);
    expect(isSurfaceLocked(decideForUser('cards_hub', { ...base, gatesEnabled: false, rank: 0 }))).toBe(false);
    expect(isSurfaceLocked(decideForUser('cards_hub', { ...base, verdict: null, rank: 0 }))).toBe(false);
  });
});

describe('«Сегодня» без недоступного', () => {
  it('закрытые рангом типы не выдаются; «урок» остаётся', () => {
    const kinds = availableTodayTaskKinds('en' as never, true, { rankLocked: ['dialog', 'cards', 'mistakes', 'video', 'spire_steps'] });
    expect(kinds).toContain('lesson');
    for (const k of ['dialog', 'cards', 'mistakes', 'video', 'spire_steps'] as const) expect(kinds).not.toContain(k);
  });
});
