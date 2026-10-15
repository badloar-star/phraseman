// R38 (Ревизор 15.10): кэш состояния приглашений (referral_vip, 15 мин) после получения прокрутов и выигрыша жил старым —
// экран показывал «можно получить» и прежние кредиты. Владелец уже в ключе кэша (stableId); сбрасываем после claim и spin.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'roulette_spin_client.ts'), 'utf8');
const vip = fs.readFileSync(path.join(__dirname, '..', 'app', 'referral_vip.ts'), 'utf8');

describe('рулетка: кэш приглашений сбрасывается после получения прокрутов и выигрыша', () => {
  it('claim и удачный spin зовут сброс для своего владельца', () => {
    expect(src).toMatch(/cacheClaimedSpinCredits\(stableId, res\.data\.spinsTotal, requestEpoch\);\s*invalidateReferralStateAfter\(stableId, 'claim'\);/);
    expect(src).toMatch(/await cacheSpinCredits\(stableId, outcome\.spinsLeft\);\s*invalidateReferralStateAfter\(stableId, 'spin_win'\);/);
    expect(src).toMatch(/import\('\.\/referral_vip'\)[\s\S]{0,120}invalidateClaimableReferralStateCache\(stableId\)/);
  });

  it('кэш приглашений привязан к владельцу (чужой stableId не отдаётся)', () => {
    expect(vip).toMatch(/referralInvitesCache\?\.stableId !== account\.stableId/);
  });
});
