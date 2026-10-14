// зачем (координатор 14.10): DEV-превью моментов вовлечения Пика (/dev_moments_preview) существует только в разработке. Сторож — как у /dev_spire_preview: маршрут уводит на Главную без
// ENABLE_DEV_TOOLS и в стор-релизе; у него нет сети; боевой код не импортирует ни маршрут, ни его моки; в стор-сборке файл вырезан регуляркой router.ctx.js; запись есть в реестре маршрутов.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (...p) => normalizeEol(readFileSync(join(ROOT, ...p), 'utf8'));

test('the moments preview route redirects away outside dev tools and in store releases, and has no network', () => {
  const route = read('app', 'dev_moments_preview.tsx');
  assert.match(route, /if \(!ENABLE_DEV_TOOLS \|\| IS_STORE_RELEASE\) return <Redirect href="\/" \/>;/);
  assert.match(route, /import \{ ENABLE_DEV_TOOLS, IS_STORE_RELEASE \} from '\.\/config';/);
  assert.ok(!/fetch\(|httpsCallable|firestore|AsyncStorage|useSpireGame|spireSyncRoom/i.test(route), 'у превью нет сети и хранилища');
});

test('the store bundle cuts the route out (router.ctx.js) and the route registry knows it', () => {
  const ctx = read('router.ctx.js');
  assert.ok((ctx.match(/dev_spire_preview\|dev_moments_preview\|dev_state/g) ?? []).length >= 1, 'router.ctx.js вырезает dev_moments_preview рядом с dev_spire_preview');
  assert.match(read('scripts', 'pm004_route_registry.mjs'), /'\/dev_moments_preview': \['archive'/);
  assert.match(read('constants', 'devRoutes.ts'), /MOMENTS_PREVIEW_ROUTE = '\/dev_moments_preview'/);
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

test('production code never imports the moments preview route', () => {
  const allowed = new Set(['app/dev_moments_preview.tsx', 'constants/devRoutes.ts']);
  const offenders = [];
  for (const dir of ['app', 'components', 'constants', 'hooks', 'modules']) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const file of walk(join(ROOT, dir), [])) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (allowed.has(rel)) continue;
      const src = normalizeEol(readFileSync(file, 'utf8'));
      const withoutLineComments = src.split(String.fromCharCode(10)).filter((line) => !line.trim().startsWith('//')).join(String.fromCharCode(10));
      if (/dev_moments_preview/.test(withoutLineComments)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});
