import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('tournaments tab visibility contract', () => {
  it('removes tournaments from both the tab bar and the swipe pager', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
    const pageModel = fs.readFileSync(path.join(root, 'app', 'tab_page_model.ts'), 'utf8');
    const tabContext = fs.readFileSync(path.join(root, 'app', 'TabContext.tsx'), 'utf8');
    const tournaments = fs.readFileSync(path.join(root, 'app', '(tabs)', 'tournaments.tsx'), 'utf8');

    expect(layout).not.toContain("require('./tournaments')");
    expect(layout).not.toMatch(/key:\s*'tournaments'/);
    expect(layout).not.toContain('key="tournaments"');
    expect(layout).not.toContain('ph-tournaments');
    const routeMap = layout.slice(
      layout.indexOf('const IDX_TO_TAB_ROUTE'),
      layout.indexOf('function addVisitedTab'),
    );
    expect(routeMap).not.toContain('tournaments');
    expect(layout).toContain('const BACKGROUND_TAB_PREMOUNT_ORDER = [1, 2, 3] as const;');
    expect(pageModel).toContain("['home', 'lessons', 'friends', 'settings'] as const");
    expect(pageModel).not.toContain("'home', 'lessons', 'tournaments'");
    expect(tabContext).toContain('export const TAB_KEYS = LOGICAL_TAB_IDS;');
    expect(tabContext).not.toContain("['home', 'lessons', 'tournaments'");
    expect(tournaments).toContain('const tournamentsTabVisible = ENABLE_TOURNAMENTS;');
    expect(tournaments).toContain('if (!ENABLE_TOURNAMENTS) {');
    expect(tournaments).toContain('<DeferredRedirect href="/(tabs)/home" />');
    expect(tournaments).toContain('return <TournamentsScreen />;');
    expect(tournaments).toContain('export default TournamentsRoute;');
    expect(tournaments).not.toContain("runtimeOwnerId === 'tournaments'");
    // Полосу таббара по-прежнему строим из TABS; единственная добавка — центральная
    // кнопка Арены, у которой нет физической свайп-страницы (logicalIdx: -1).
    expect(layout).toMatch(/const pages: TabBarEntry\[\] = TABS\.map\(\(tab, logicalIdx\) =>/);
    expect(layout).toContain('TAB_BAR_TABS.map((tab, barIndex) => {');
    expect(layout).toContain('goToTab(tab.logicalIdx);');
    expect(layout).toMatch(/key: 'arena',[\s\S]{0,200}logicalIdx: -1,/);
    expect(layout).not.toMatch(/key:\s*'arena',[\s\S]{0,200}logicalIdx: [0-9]/);
  });

  it('redirects the retired tab and protects every standalone tournament route', () => {
    const layout = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');
    const rootLayout = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');
    const config = fs.readFileSync(path.join(root, 'app', 'config.ts'), 'utf8');
    const notifications = fs.readFileSync(path.join(root, 'app', 'notifications.ts'), 'utf8');

    expect(config).toContain('export const ENABLE_TOURNAMENTS: false = false;');
    expect(layout).toContain("pathname === '/tournaments'");
    expect(layout).toContain('<DeferredRedirect href="/(tabs)/home" />');
    expect(rootLayout).toContain('<Stack.Protected guard={ENABLE_TOURNAMENTS}>');
    expect(rootLayout).toContain('<Stack.Protected guard={ENABLE_DEV_TOOLS}>');
    expect(rootLayout).not.toMatch(/ENABLE_DEV_TOOLS\s*&&\s*\(\s*<>/);
    for (const route of [
      'tournament_lobby',
      'tournament_round',
      'tournament_table',
      'tournament_results',
      'tournament_review',
      'tournament_season',
      'tournament_tickets',
    ]) {
      expect(rootLayout).toContain(`<Stack.Screen name="${route}"`);
    }
    const notificationCase = notifications.slice(
      notifications.indexOf("case 'tournament_starting':"),
      notifications.indexOf('default:', notifications.indexOf("case 'tournament_starting':")),
    );
    expect(notificationCase).not.toContain('navTabHome();');
    expect(notificationCase).not.toContain('router.');
    expect(notificationCase).not.toContain('tournaments');
  });
});
