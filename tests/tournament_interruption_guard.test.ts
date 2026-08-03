import fs from 'fs';
import path from 'path';
import { isTournamentInterruptionProtectedPath } from '../app/tournament_interruption_guard';

const rootLayoutSource = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const entitlementSource = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'EntitlementExpiredHost.tsx'),
  'utf8',
);

describe('tournament interruption guard', () => {
  test.each([
    '/tournament_lobby',
    '/tournament_round',
    '/tournament_table',
    '/tournament_results',
    '/tournament_review',
    '/tournament_round?roomId=room-1',
    '/tournament_round/',
  ])('protects the tournament run route %s', (route) => {
    expect(isTournamentInterruptionProtectedPath(route)).toBe(true);
  });

  test.each([
    '/',
    '/(tabs)/tournaments',
    '/tournaments',
    '/tournament_season',
    '/tournament_tickets',
    '/premium_modal',
    null,
    undefined,
  ])('does not disable monetization on non-game route %s', (route) => {
    expect(isTournamentInterruptionProtectedPath(route)).toBe(false);
  });

  it('rechecks the current route at every automatic root upsell boundary', () => {
    expect(rootLayoutSource).toContain('isTournamentInterruptionProtectedPath(pathname)');
    expect(rootLayoutSource).toContain('isTournamentInterruptionProtectedPath(pathnameRef.current)');
    expect(rootLayoutSource).toMatch(
      /if \(isTournamentInterruptionProtectedPath\(pathnameRef\.current\)\) return;[\s\S]{0,900}source: 'afterwin_levelup'/,
    );
    expect(rootLayoutSource).toMatch(
      /if \(isTournamentInterruptionProtectedPath\(pathnameRef\.current\)\) return;[\s\S]{0,900}source: 'winback'/,
    );
    // зачем 2026-08-03: смысл проверки прежний — оверлеи монетизации обязаны
    // гаситься турнирным флагом. Регулярки сделаны устойчивыми к ПЕРЕНОСУ
    // СТРОКИ: соседние сессии переформатировали эти выражения, и посимвольная
    // сверка падала на живом, полностью исправном коде. Требование то же:
    // && !tournamentInterruptionProtected в appOverlaysEnabled и в условии
    // introFullAccess — просто без привязки к отступам.
    expect(rootLayoutSource).toMatch(
      /const appOverlaysEnabled = [\s\S]+?&& !tournamentInterruptionProtected;/,
    );
    expect(rootLayoutSource).toMatch(
      /'introFullAccess',\s*\n\s*!tournamentInterruptionProtected && introFullAccessModal !== null/,
    );
    expect(rootLayoutSource).toContain(
      'visible={appOverlaysEnabled && !tournamentInterruptionProtected && introFullAccessModalVisible}',
    );
  });

  it('defers entitlement-expired upsell instead of consuming or navigating during a tournament', () => {
    expect(entitlementSource).toContain('isTournamentInterruptionProtectedPath(pathname)');
    expect(entitlementSource).toContain('kind != null && !tournamentInterruptionProtected');
    expect(entitlementSource).toContain('isTournamentInterruptionProtectedPath(pathnameRef.current)');
  });
});
