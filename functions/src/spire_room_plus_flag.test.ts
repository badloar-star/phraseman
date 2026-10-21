// зачем (владелец 21.10, «Plus виден другим»): соседи по комнате Пика видят кольцо Plus у живых игроков.
// Сервер пишет members.<uid>.isPremium из уже прочитанного users (0 новых чтений). Вводный 72-часовой доступ кольца не даёт.
// Статус едет той же записью, что ступени; отдельная запись — только когда он сменился.
import { spireIsPlusOf, spireMemberStepsUpdate } from './spire_groups';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const NEXT = { steps: 5, reachedAtMs: 1000, totalMs: 2000 };
const user = (progress: Record<string, unknown>) => ({ progress });

describe('spireIsPlusOf — настоящий Plus', () => {
  it('покупка в магазине (год, с будущим сроком и пожизненная) — Plus', () => {
    expect(spireIsPlusOf(user({ premium_plan: 'yearly', premium_expiry: String(NOW + 86_400_000) }), NOW)).toBe(true);
    expect(spireIsPlusOf(user({ premium_plan: 'lifetime', premium_expiry: '0' }), NOW)).toBe(true);
  });

  it('истёкшая покупка — не Plus', () => {
    expect(spireIsPlusOf(user({ premium_plan: 'monthly', premium_expiry: String(NOW - 1) }), NOW)).toBe(false);
  });

  it('выдача админом и VIP — Plus', () => {
    expect(spireIsPlusOf(user({ premium_plan: 'admin_grant', admin_premium_override: 'true' }), NOW)).toBe(true);
    expect(spireIsPlusOf(user({ vip_plan: 'referral', vip_until: String(NOW + 1_000) }), NOW)).toBe(true);
  });

  it('вводный 72-часовой доступ кольца НЕ даёт (как клиент: isPremium || isVip || isPro)', () => {
    expect(spireIsPlusOf(user({ intro_access_until_ms: String(NOW + 3_600_000) }), NOW)).toBe(false);
  });

  it('пустой или битый профиль — не Plus', () => {
    expect(spireIsPlusOf(undefined, NOW)).toBe(false);
    expect(spireIsPlusOf({}, NOW)).toBe(false);
  });
});

describe('spireMemberStepsUpdate + статус Plus', () => {
  it('новые ступени — статус едет той же записью', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 3 }, NEXT, 9, null, null, true))
      .toMatchObject({ 'members.u1.steps': 5, 'members.u1.isPremium': true, updatedAt: 9 });
  });

  it('ступеней нет, статус тот же — записи нет', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5, isPremium: true }, NEXT, 9, null, null, true)).toBeNull();
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9, null, null, false)).toBeNull();
  });

  it('ступеней нет, Plus появился или закончился — одна запись только статуса', () => {
    expect(spireMemberStepsUpdate('u1', { steps: 5 }, NEXT, 9, null, null, true)).toEqual({ 'members.u1.isPremium': true, updatedAt: 9 });
    expect(spireMemberStepsUpdate('u1', { steps: 5, isPremium: true }, NEXT, 9, null, null, false)).toEqual({ 'members.u1.isPremium': false, updatedAt: 9 });
  });

  it('статус не передан (старый вызов) — поле не трогаем', () => {
    const patch = spireMemberStepsUpdate('u1', { steps: 3 }, NEXT, 9);
    expect(patch).not.toHaveProperty('members.u1.isPremium');
  });
});
