import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: пакеты A и C «Шпиля» — замок вкладки и главный экран без игры. Тест сторожит
// именно замки и запреты владельца: вкладка выключена по умолчанию, второй замок по
// config.enabled, экран НЕ зовёт spireJoinRoom (сервер флаг не проверяет).

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const flag = read('app/spire_tab_flag.ts');
const model = read('app/tab_page_model.ts');
const community = read('app/(tabs)/community.tsx');
const screen = read('components/spire/SpireHomeScreen.tsx');

const spireDir = new URL('../components/spire/', import.meta.url);
const spireFiles = readdirSync(spireDir).filter((n) => /\.(ts|tsx)$/.test(n));
const spireSources = spireFiles.map((n) => [n, readFileSync(new URL(n, spireDir), 'utf8')]);

test('flag: tab is hidden by default and only opens by remote key or __DEV__ override', () => {
  // зачем (Ядро 11.10): с 8d5e4f79d ([COLD-START-IO]) кэш remote_config читается одним общим помощником на всех —
  // смысл замка прежний: тот же кэш-документ, без своих чтений Firestore.
  assert.ok(flag.includes('readRemoteConfigCacheRaw') || flag.includes("'remote_config_cache_v1'"), 'reads the already cached remote config');
  assert.ok(flag.includes("'spire_tab_enabled'"), 'own boolean key, remote_flags.ts is not touched');
  assert.ok(flag.includes('let _remoteEnabled = false'), 'remote default is false');
  assert.ok(flag.includes('let _devOverride = false'), 'dev override default is false');
  assert.ok(flag.includes('__DEV__'), 'dev switch is guarded by __DEV__');
  assert.ok(!/@react-native-firebase|firestore\(\)/.test(flag), 'the flag never reads Firestore');
});

test('tab model: spire is a sub-runtime owner', () => {
  assert.match(model, /SUB_RUNTIME_OWNER_IDS = \[[^\]]*'spire'[^\]]*\] as const/);
});

test('community: third segment only when the flag is on, screen loaded lazily', () => {
  assert.ok(community.includes('useSpireTabEnabled'), 'segment depends on the reactive flag');
  assert.ok(community.includes("require('../../components/spire/SpireHomeScreen')"), 'lazy require of the screen');
  assert.ok(community.includes("key: 'spire'"), 'spire segment exists');
  assert.ok(community.includes('spireVisible ?'), 'segment is added conditionally');
});

test('screen: second lock by config.enabled and no room join / flush / pack calls', () => {
  assert.ok(screen.includes('loadSpireConfig'), 'reads the cached config');
  assert.ok(screen.includes('config.enabled'), 'checks config.enabled');
  assert.ok(screen.includes('SpireLockedState'), 'locked state exists');
  for (const [name, src] of spireSources) {
    assert.ok(!/spireJoinRoom/.test(src), `${name}: must not call spireJoinRoom (server does not check the flag)`);
    assert.ok(!/spireFlushNow/.test(src), `${name}: must not flush the report queue in the lock package`);
    assert.ok(!/spire_packs|loadSpirePack/.test(src), `${name}: must not load the week pack`);
    assert.ok(!/onSnapshot|firestore\(\)/.test(src), `${name}: no new Firestore reads`);
  }
});

test('screen: local week is read only after the config is enabled', () => {
  assert.ok(screen.includes('const unlocked = config !== null && config.enabled === true'), 'single unlock condition');
  const idxUnlock = screen.indexOf('const unlocked');
  const idxCall = screen.indexOf('readCurrentLocalWeek(spireLang)');
  assert.ok(idxUnlock > -1 && idxCall > idxUnlock, 'the local week helper is called only after the unlock condition');
  // зачем (вынос из SpireHomeScreen ≤ 400 строк, 13.10): чтение недели живёт в spire_home_week.ts — один вызов внутри помощника, на экране вызовов нет
  assert.equal(read('components/spire/spire_home_week.ts').split('spireReadWeekLocal(').length - 1, 1, 'spireReadWeekLocal has a single call site (inside the helper)');
  assert.equal(screen.split('spireReadWeekLocal(').length - 1, 0, 'the screen never reads the week directly');
  assert.ok(screen.includes('if (!unlocked || preview) return undefined;'), 'the week effect exits early while locked (и в DEV-превью на моках)');
  assert.ok(screen.includes('if (!unlocked) return <View style={s.root}><SpireLockedState'), 'locked render happens before the main tree');
});

test('owner bans: no thick borders, no adjustsFontSizeToFit, no silent catch, no mockup data', () => {
  assert.ok(spireFiles.length >= 6, 'spire components exist');
  for (const [name, src] of spireSources) {
    assert.ok(!/adjustsFontSizeToFit/.test(src), `${name}: adjustsFontSizeToFit`);
    for (const m of src.matchAll(/borderWidth:\s*([0-9.]+)/g)) {
      assert.ok(Number(m[1]) <= 1, `${name}: borderWidth ${m[1]} is thicker than a hairline`);
    }
    assert.ok(!/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(src), `${name}: empty catch`);
    assert.ok(!/'Аня'|'Kirill'|'Sergio'|RANKS\s*=/.test(src), `${name}: mockup names or rank arrays`);
  }
});

test('screen: honest placeholders and log prefix', () => {
  assert.ok(screen.includes("'—'") || screen.includes('"—"'), 'missing data is drawn as a dash');
  assert.ok(spireSources.some(([, src]) => src.includes('[SPIRE]')), '[SPIRE] log prefix is used');
  assert.ok(existsSync(new URL('../components/spire/SpireTower.tsx', import.meta.url)), 'tower component exists');
});

test('every spire component file stays within 400 lines', () => {
  for (const [name, src] of spireSources) {
    assert.ok(src.split('\n').length <= 400, `${name} is longer than 400 lines`);
  }
});
