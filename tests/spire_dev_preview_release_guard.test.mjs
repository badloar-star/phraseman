// зачем (координатор 11.10): DEV-превью Шпиля на моках (/dev_spire_preview) существует только в разработке. Сторож: маршрут уводит
// на Главную без ENABLE_DEV_TOOLS и в стор-релизе; боевой код не импортирует ни маршрут, ни моки; шов превью в боевом пути всегда null.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('the preview route redirects away outside dev tools and in store releases', () => {
  const route = read('app', 'dev_spire_preview.tsx');
  assert.match(route, /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
  assert.match(route, /import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
  assert.ok(!/useSpireGame|spireSyncRoom|loadSpireConfig|fetch\(|httpsCallable|firestore/i.test(route), 'у превью нет сети');
});

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

test('production code never imports the preview route or the mocks', () => {
  const allowed = new Set([
    'app/dev_spire_preview.tsx',
    'components/spire/spire_preview_fixtures.ts',
    'components/dev/DevHubSheet.tsx',
    'components/dev/devToolRegistry.ts',
    'constants/devRoutes.ts',
  ]);
  const offenders = [];
  for (const dir of ['app', 'components', 'constants', 'hooks', 'modules']) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const file of walk(join(ROOT, dir), [])) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (allowed.has(rel)) continue;
      const src = normalizeEol(readFileSync(file, 'utf8'));
      const withoutLineComments = src.split(String.fromCharCode(10)).filter((line) => !line.trim().startsWith('//')).join(String.fromCharCode(10));
      if (/from\s+['"][^'"]*(spire_preview_fixtures|dev_spire_preview)['"]/.test(src) || /dev_spire_preview/.test(withoutLineComments)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the preview seam is null on the production path', () => {
  const ctx = read('components', 'spire', 'spire_preview_context.tsx');
  assert.match(ctx, /createContext<SpirePreviewModel \| null>\(null\)/);
  const home = read('components', 'spire', 'SpireHomeScreen.tsx');
  assert.match(home, /const preview = useSpirePreview\(\);/);
  assert.match(home, /preview \? null : config/);
  assert.match(home, /const game = preview \? preview\.game : realGame;/);
  const fixtures = read('components', 'spire', 'spire_preview_fixtures.ts');
  assert.ok(!/fetch\(|httpsCallable|firestore|AsyncStorage/i.test(fixtures), 'моки без сети и хранилища');
});

test('the Dev Hub opens the preview and the route is classified in the route registry', () => {
  assert.match(read('constants', 'devRoutes.ts'), /SPIRE_PREVIEW_ROUTE = '\/dev_spire_preview'/);
  assert.match(read('components', 'dev', 'devToolRegistry.ts'), /action: 'open-spire-preview'/);
  assert.match(read('scripts', 'pm004_route_registry.mjs'), /'\/dev_spire_preview': \['archive'/);
});

// зачем (координатор 11.10): рантайм-увод на Главную оставлял маршрут и моки в стор-бандле. Теперь стор-ветка router.ctx.js
// вырезает маршрут целиком — моки тянет только он, поэтому в релиз не попадают ни экран, ни данные превью.
test('the store router context cuts the preview route out of the release bundle', () => {
  const router = read('router.ctx.js');
  const storeBranch = router.split(': require.context(')[0] ?? '';
  const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch)?.[1];
  assert.ok(literal, 'регулярка стор-ветки router.ctx.js найдена');
  const storeRegex = new RegExp(literal);
  assert.equal(storeRegex.test('./dev_spire_preview.tsx'), false, 'превью Шпиля вырезано из стор-сборки');
  assert.equal(storeRegex.test('./(tabs)/community.tsx'), true, 'вкладка «Сообщество» со Шпилем в стор-сборке есть');
  const nonStoreBranch = router.split(': require.context(')[1] ?? '';
  assert.ok(!nonStoreBranch.includes('dev_spire_preview'), 'в дев-сборке превью доступно');
});
