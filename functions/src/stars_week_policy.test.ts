/**
 * U35 (владелец 11.11): «все монеты заработанные везде считать!» — в счёт недели Пика идёт всё, что получено за действия,
 * кроме приза недели и подарков. Сторож правила: каждая причина журнала разложена явно, новая причина без решения — красный тест.
 */
import { STAR_OP_CLASS, type StarOpReason } from './stars_ledger';
import { STAR_GRANTS_COUNTED_FOR_WEEK, starOpCountsForWeek } from './stars_week_policy';

const counts = (reason: StarOpReason): boolean => starOpCountsForWeek(reason, STAR_OP_CLASS[reason]);
const reasons = Object.keys(STAR_OP_CLASS) as StarOpReason[];

/** Подарки, которые в неделю НЕ идут, — решение владельца 11.11. Новый grant обязан попасть сюда или в список считаемых. */
const GRANTS_NOT_COUNTED: readonly StarOpReason[] = [
  'spire_week_reward', 'welcome_gift', 'global_broadcast', 'admin_grant', 'coin_exchange', 'account_merge_in', 'legacy_bonus',
];

describe('[U35] что входит в монеты недели Пика', () => {
  it('любой заработок (earn) входит', () => {
    const earn = reasons.filter((r) => STAR_OP_CLASS[r] === 'earn');
    expect(earn.length).toBeGreaterThan(0);
    for (const reason of earn) expect([reason, counts(reason)]).toEqual([reason, true]);
    expect(counts('practice_session')).toBe(true);
    expect(counts('spire_step')).toBe(true);
  });

  it('бонусы за действия входят, хотя в журнале они класса grant', () => {
    for (const reason of ['level_spin_grant', 'video_watch', 'referral_spin', 'referral_ladder', 'community_pack_sale', 'community_month_reward'] as const) {
      expect([reason, STAR_OP_CLASS[reason], counts(reason)]).toEqual([reason, 'grant', true]);
    }
  });

  it('приз прошлой недели и подарки не входят', () => {
    for (const reason of GRANTS_NOT_COUNTED) expect([reason, STAR_OP_CLASS[reason], counts(reason)]).toEqual([reason, 'grant', false]);
  });

  it('траты не входят никогда', () => {
    const spend = reasons.filter((r) => STAR_OP_CLASS[r] === 'spend');
    expect(spend.length).toBeGreaterThan(0);
    for (const reason of spend) expect([reason, counts(reason)]).toEqual([reason, false]);
  });

  it('каждый grant журнала разложен явно: либо считается, либо назван среди несчитаемых', () => {
    const grants = reasons.filter((r) => STAR_OP_CLASS[r] === 'grant');
    const undecided = grants.filter((r) => !STAR_GRANTS_COUNTED_FOR_WEEK.has(r) && !GRANTS_NOT_COUNTED.includes(r));
    expect(undecided).toEqual([]);
    const overlap = GRANTS_NOT_COUNTED.filter((r) => STAR_GRANTS_COUNTED_FOR_WEEK.has(r));
    expect(overlap).toEqual([]);
  });

  it('в списке считаемых нет причин не класса grant и нет несуществующих', () => {
    for (const reason of STAR_GRANTS_COUNTED_FOR_WEEK) expect([reason, STAR_OP_CLASS[reason]]).toEqual([reason, 'grant']);
  });
});
