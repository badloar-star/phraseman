import fs from 'node:fs';
import path from 'node:path';

const tabs = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');

test('home screen is deferred without revealing an empty startup shell', () => {
  expect(tabs).not.toContain("from './home'");
  expect(tabs).toContain("const homeScreenModulePromise = import('./home')");
  expect(tabs).toContain('const HomeScreen = React.lazy(() => homeScreenModulePromise)');
  expect(tabs).toContain('<React.Suspense fallback={placeholder(\'home-loading\')}>');
  expect(tabs).toContain("emitAppEvent('app_home_screen_ready')");
  expect(tabs).toContain("emitAppEvent('app_first_content_ready')");
});
