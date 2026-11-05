// Governance-ID: TG-D24C8B60F834
import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 05.11): старый ключ referral_ladder_enabled в бою включён с 146 (экран лесенки). Новая часть 150 — истории и
// текст приглашения с «500 монет» — живёт на отдельном ключе referral_ladder_v2_enabled с дефолтом ВЫКЛ, чтобы релиз не показал сырое.

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('лесенка приглашений: отдельный ключ для новой части', () => {
  test('ключ v2 объявлен и по умолчанию выключен', () => {
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain("| 'referral_ladder_v2_enabled'");
    expect(flags).toMatch(/referral_ladder_v2_enabled:\s*false/);
  });

  test('история лесенки и текст приглашения читают ключ v2, а не старый', () => {
    const story = read('modules/story_events/use_referral_ladder_story.ts');
    expect(story).toContain('useReferralLadderV2Enabled');
    expect(story).not.toContain('useReferralLadderEnabled()');
    const share = read('app/referral_invite_share.ts');
    expect(share).toContain('isReferralLadderV2Enabled()');
    expect(share).not.toMatch(/isReferralLadderEnabled\(\)/);
  });

  test('экраны лесенки остаются на прежнем ключе', () => {
    expect(read('app/referrals.tsx')).toContain('useReferralLadderEnabled()');
    expect(read('app/(tabs)/friends.tsx')).toContain('useReferralLadderEnabled()');
  });

  test('читатель ключа v2 существует и берёт именно referral_ladder_v2_enabled', () => {
    const flag = read('app/referral_ladder_flag.ts');
    expect(flag).toContain("getRemoteBool('referral_ladder_v2_enabled')");
    expect(flag).toContain('export function useReferralLadderV2Enabled');
  });
});
