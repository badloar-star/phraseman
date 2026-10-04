import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');
const owners = [
  'dpDrop', 'loadBanList', 'loadCancelSurveys',
  'loadDailyPhrases', 'loadPremiumData', 'loadPushJobs',
  'loadReferralsData', 'loadUgcPurchases', 'loadVipSurveyResponses',
  'openDailyPhraseEditor', 'renderBanList', 'renderCancelSurveys',
  'renderDailyPhrases', 'renderPremiumList', 'renderReferralsTable', 'renderUgcPurchases',
  'renderVipSurveyResponses', 'saveDailyPhraseEditor', 'seedDailyPhrasesFromBundle',
  'submitPushJob', 'toggleDailyPhraseActive',
] as const;

// зачем (04.10): раздел наборов карточек (editCardPack/loadCardPacks/renderCardPacks/
// toggleCardPackStatus) и клубы (loadClubsData) сняты в 2.0 — сторож удалён.
// зачем (04.10): мёртвые ранние loadUgcPurchases/renderUgcPurchases удалены — теперь ровно один владелец.
// renderPremiumList — НЕ дубль: поздняя версия (phase 1) сохраняет раннюю в _pmP1RenderPremiumList и
// делегирует ей; две записи законны, сторожим именно обёртку.
const KNOWN_OVERRIDES: Record<string, number> = {
  renderPremiumList: 2,
};

test('renderPremiumList phase 1 wraps (not replaces) the base renderer', () => {
  expect(html).toMatch(/const _pmP1RenderPremiumList = window\.renderPremiumList;\s*[\s\S]{0,200}window\.renderPremiumList = function renderPremiumListPhase1\(\)/);
  expect(html).toContain('return _pmP1RenderPremiumList?.();');
});

describe('live legacy runtime ownership', () => {
  test.each(owners)('%s has the expected number of window function owners', (name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const assignments = html.match(new RegExp(`window\\.${escaped}\\s*=\\s*(?:async\\s+)?function\\b`, 'g')) || [];
    expect(assignments).toHaveLength(KNOWN_OVERRIDES[name] ?? 1);
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
