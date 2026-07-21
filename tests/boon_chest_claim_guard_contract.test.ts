import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('boon chest claim guard', () => {
  const modalSource = fs.readFileSync(path.join(ROOT, 'components', 'BoonChestModal.tsx'), 'utf8');
  const rewardSource = fs.readFileSync(path.join(ROOT, 'app', 'boons', 'boon_rewards.ts'), 'utf8');

  it('lets the box phase defer honestly without opening the chest (no reward loss)', () => {
    const requestCloseStart = modalSource.indexOf('const requestClose = () => {');
    const requestCloseEnd = modalSource.indexOf('if (!visible) return null;', requestCloseStart);
    const requestClose = modalSource.slice(requestCloseStart, requestCloseEnd);

    expect(requestCloseStart).toBeGreaterThanOrEqual(0);
    expect(requestClose).toContain("if (phase === 'box') {");
    // Крестик/«Позже» в фазе сундука — честное «отложить» БЕЗ открытия:
    // handleTap здесь НЕ вызывается, награда не теряется (MysteryMonday/Comeback
    // перепокажут сундук, PerfectWeek уже начислил приз до показа).
    expect(requestClose).not.toContain('handleTap();');
    expect(requestClose).toContain("if (phase === 'opening') return");
    expect(requestClose).toContain('onClaim();');
    expect(requestClose).toContain('onClose();');
  });

  it('all reward boon hosts use idempotent claim guards before granting', () => {
    const comeback = fs.readFileSync(path.join(ROOT, 'components', 'ComebackBoonHost.tsx'), 'utf8');
    const mystery = fs.readFileSync(path.join(ROOT, 'components', 'MysteryMondayHost.tsx'), 'utf8');
    const perfect = fs.readFileSync(path.join(ROOT, 'components', 'PerfectWeekHost.tsx'), 'utf8');

    expect(comeback).toContain('if (grantedRef.current) return;');
    expect(comeback).toContain('await markComebackGranted(todayKey)');

    expect(mystery).toContain('if (claimedRef.current || !reward) return;');
    expect(mystery).toContain('await markClaimed(CLAIM_KEY, week)');

    expect(perfect).toContain('if (grantedRef.current) return;');
    expect(perfect).toContain('await markPerfectWeekClaimed()');
  });

  it('grants modal boon shards through the local-first shard path', () => {
    expect(rewardSource).toContain('addShardsRaw(reward.shards, logReason, { skipServerAwait: true })');
  });
});
