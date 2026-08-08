import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');
const owners = [
  'dpDrop', 'editCardPack', 'loadBanList', 'loadCancelSurveys', 'loadCardPacks',
  'loadClubsData', 'loadDailyPhrases', 'loadPremiumData', 'loadPushJobs',
  'loadReferralsData', 'loadUgcPurchases', 'loadVipSurveyResponses',
  'openDailyPhraseEditor', 'renderBanList', 'renderCancelSurveys', 'renderCardPacks',
  'renderDailyPhrases', 'renderPremiumList', 'renderReferralsTable', 'renderUgcPurchases',
  'renderVipSurveyResponses', 'saveDailyPhraseEditor', 'seedDailyPhrasesFromBundle',
  'submitPushJob', 'toggleCardPackStatus', 'toggleDailyPhraseActive',
] as const;

describe('live legacy runtime ownership', () => {
  test.each(owners)('%s has exactly one window function owner', (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const assignments = html.match(new RegExp(`window\\.${escaped}\\s*=\\s*(?:async\\s+)?function\\b`, 'g')) || [];
    expect(assignments).toHaveLength(1);
  });

  test('the surviving referrals owner keeps the protected dashboard workflow', () => {
    const start = html.indexOf('function getAdminGetReferralDashboardCallable()');
    const end = html.indexOf('// ── BAN LIST TAB', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = html.slice(start, end);
    expect(block).toContain('ensureReferralDashboardChrome');
    expect(block).toContain('getAdminGetReferralDashboardCallable()');
    const revokeStart = html.indexOf('window.revokeReferralAttribution = async function revokeReferralAttribution');
    const revokeEnd = html.indexOf('function getAdminGetReferralDashboardCallable()', revokeStart);
    expect(revokeStart).toBeGreaterThan(0);
    expect(revokeEnd).toBeGreaterThan(revokeStart);
    expect(html.slice(revokeStart, revokeEnd)).toContain('getAdminRevokeReferralAttributionCallable()');
  });
});
