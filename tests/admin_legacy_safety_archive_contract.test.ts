import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');

describe('legacy Safety & Moderation archive cutover', () => {
  test('redirects all five legacy tabs to the exact native capability hash by default', () => {
    expect(source).toContain('installNativeSafetyModerationRedirects');
    expect(source).toContain("new Set(['user-reports', 'safety-flags', 'age-consent', 'compliance-radar', 'ban-list'])");
    expect(source).toContain("'./v2/index.html#' + encodeURIComponent(String(tab))");
    expect(source).toContain("legacyArchive') === '1'");
  });

  test('keeps emergency archive markup read-only and does not load sensitive production data', () => {
    expect(source).toContain("data-safety-moderation-archive");
    expect(source).toContain('pointer-events:none!important');
    expect(source).toContain('Архивный макет — без прямого доступа к данным');
    for (const name of ['loadUserReports', 'loadSafetyFlags', 'loadAgeConsent', 'loadComplianceRadar', 'loadBanList']) {
      expect(source).toContain(`window.${name} = async function ${name}Archive`);
    }
  });

  test('fail-closes every legacy safety write entry point', () => {
    for (const name of ['urAction', 'urBulkAction', 'urMarkReviewed', 'markSafetyHandled', 'markAllSafetyHandled', 'unbanFromList', 'banByUidPrompt', 'banUser', 'unbanUser', 'helpBoardBanAuthor']) {
      expect(source).toContain(`window.${name} = function ${name}SafetyV2`);
    }
    expect(source).toContain("window.location.href = './v2/index.html#user-reports'");
    expect(source).toContain("window.location.href = './v2/index.html#safety-flags'");
    expect(source).toContain("window.location.href = './v2/index.html#ban-list'");
  });
});

