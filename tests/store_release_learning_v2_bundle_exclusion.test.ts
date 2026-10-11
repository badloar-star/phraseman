import fs from 'node:fs';
import path from 'node:path';

// зачем (владелец 11.10: «ВСЁ ПОПАДАЕТ В СБОРКУ! LEARNING V2 ПОПАДАЕТ!!!», курс виден всем сразу): вырез Learning V2 из
// стор-сборки (10.10, router.ctx.js `*learning[_-]v2*` + заглушка наград сессии) снят. Сторож держит обратное правило:
// боевые маршруты курса в стор-сборке ЕСТЬ, а дев-экраны V2 (превью автора, витрина режимов, фикстура интро) — вырезаны.
// Сработал — не возвращай вырез без прямой команды владельца.
describe('store release Learning V2 bundle boundary', () => {
  const root = path.join(__dirname, '..');
  const routerContext = fs.readFileSync(path.join(root, 'router.ctx.js'), 'utf8');
  const metroConfig = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');
  const storeBranch = routerContext.split(': require.context(')[0] ?? '';
  const storeRegexLiteral = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch)?.[1] ?? '';
  const storeRegex = new RegExp(storeRegexLiteral);
  const inStore = (routeFile: string) => storeRegex.test(`./${routeFile}`);

  test('store branch no longer cuts every Learning V2 route', () => {
    expect(storeBranch).toContain("process.env.EXPO_PUBLIC_STORE_RELEASE === '1'");
    expect(storeBranch).not.toContain('(?!(?:.*learning[_-]v2.*)\\.tsx?$)');
    expect(storeRegexLiteral).not.toBe('');
  });

  test.each([
    'learning-v2/course.tsx',
    'learning-v2/session/[id].tsx',
    'learning_v2_direct_session_player_v1.tsx',
    'learning_v2_session_intro.tsx',
    'learning_v2_session_intro_check.tsx',
  ])('production V2 route %s is in the store router context', (routeFile) => {
    expect(fs.existsSync(path.join(root, 'app', routeFile))).toBe(true);
    expect(inStore(routeFile)).toBe(true);
  });

  test.each([
    '_learning_v2_authoring_preview.tsx',
    '_learning_v2_modes_showcase.tsx',
    'learning_v2_modes_showcase_run/[family].tsx',
    'learning-v2/intro-reader-fixture.tsx',
  ])('dev-only V2 screen %s stays out of the store router context', (routeFile) => {
    expect(fs.existsSync(path.join(root, 'app', routeFile))).toBe(true);
    expect(inStore(routeFile)).toBe(false);
  });

  test('coin-exchange replay and its store stub are gone (D70/D78)', () => {
    expect(metroConfig).not.toContain('coin_exchange_wallet_outbox');
    expect(fs.existsSync(path.join(root, 'store_release_stubs', 'coin_exchange_wallet_outbox_stub.ts'))).toBe(false);
  });

  test('V2 session rewards use the real module in store builds (no stub)', () => {
    expect(metroConfig).not.toContain('learning_session_rune_reward_composite_v1');
    expect(metroConfig).not.toContain('storeReleaseSessionRuneCompositeStubPath');
    expect(fs.existsSync(path.join(root, 'store_release_stubs', 'learning_session_rune_reward_composite_stub.ts'))).toBe(false);
  });
});
