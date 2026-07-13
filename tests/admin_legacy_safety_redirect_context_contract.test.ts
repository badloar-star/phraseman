import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');

function sourceBetween(startToken: string, endToken: string): string {
  const start = source.indexOf(startToken);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endToken, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('legacy Safety & Moderation redirect context', () => {
  const cutover = sourceBetween(
    '(function installNativeSafetyModerationRedirects()',
    '</script>',
  );

  test('redirects native safety tab entry without replacing shared fallback loaders', () => {
    expect(cutover).toContain('window.switchTab = function switchTabSafetyModerationV2');
    expect(cutover).toContain("nativeTabs.has(String(tab || ''))");

    for (const name of [
      'loadUserReports',
      'loadSafetyFlags',
      'loadAgeConsent',
      'loadComplianceRadar',
      'loadBanList',
    ]) {
      expect(cutover).not.toContain(`function ${name}SafetyV2`);
    }

    const modQueue = sourceBetween(
      'window.loadModQueue = async function(force)',
      'window._refundItems = [];',
    );
    expect(modQueue).toContain('Promise.resolve(loadUserReports())');
    expect(modQueue).toContain('Promise.resolve(loadHelpBoardAdmin(force))');
  });

  test('preserves Help Board source and target context when handing a ban to Admin v2', () => {
    expect(cutover).toMatch(
      /function helpBoardBanAuthorSafetyV2\(uid,\s*targetType,\s*targetId\)/,
    );
    expect(cutover).toContain("params.set('source', String(context.source))");
    expect(cutover).toContain("params.set('targetType', String(context.targetType))");
    expect(cutover).toContain("params.set('targetId', String(context.targetId))");
    expect(cutover).toContain("source: 'help_board'");
  });

  test('initializes App Check before authenticated Help Board moderation callables become available', () => {
    const appInit = source.indexOf('const app = initializeApp(');
    const appCheckInit = source.indexOf('const legacyAdminAppCheck = initializeAppCheck(app');
    const tokenGate = source.indexOf('await getToken(legacyAdminAppCheck, false)');
    const functionsInit = source.indexOf("const functionsUs = getFunctions(app, 'us-central1')");
    const authGate = source.indexOf('onAuthStateChanged(auth, async (user) =>');
    const moderationCallable = source.indexOf("httpsCallable(functionsUs, 'helpBoardAdminModerate')");

    expect(source).toContain('ReCaptchaEnterpriseProvider');
    expect(appInit).toBeGreaterThanOrEqual(0);
    expect(appCheckInit).toBeGreaterThan(appInit);
    expect(tokenGate).toBeGreaterThan(appCheckInit);
    expect(functionsInit).toBeGreaterThan(tokenGate);
    expect(authGate).toBeGreaterThan(functionsInit);
    expect(moderationCallable).toBeGreaterThan(functionsInit);
  });
});
