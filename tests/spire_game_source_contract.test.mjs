import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: игровая часть Шпиля (пакеты B, D, E) написана «сейчас», но включается только
// владельцем. Сторож проверяет ИСХОДНИКИ на главные обещания:
//   1) ни одного сетевого вызова без SpireLiveGate (флаг spire_tab_enabled +
//      config/spire_v1.enabled), и ворота проверяют оба замка;
//   2) экраны на токенах стекла (useSpirePalette, liquid-glass-opaque шторки);
//   3) никакого XP / жемчуга; награды — монеты из конфига;
//   4) энергия — на первом задании (confirmSpendOne) с подтверждением и возвратом;
//   5) логи [SPIRE] и никаких немых catch; дешёвый Firestore (без подписок и листингов).

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dirFiles = (dir) => readdirSync(new URL(`../${dir}/`, import.meta.url))
  .filter((n) => /\.(ts|tsx)$/.test(n))
  .map((n) => [`${dir}/${n}`, read(`${dir}/${n}`)]);

const appSpire = dirFiles('app/spire');
const gameComponents = [
  'SpireStepScreen.tsx', 'SpireTaskView.tsx', 'SpireTimerRing.tsx', 'SpireExitSheet.tsx', 'SpireResultPanel.tsx',
  'SpireWeekResultCard.tsx', 'SpireRulesSheet.tsx', 'SpireTour.tsx', 'SpireClimbDock.tsx', 'spire_game_strings.ts',
].map((n) => [`components/spire/${n}`, read(`components/spire/${n}`)]);
const pureModules = ['modules/spire/pack_plan.ts', 'modules/spire/answer_reveal.ts', 'modules/spire/room_rows.ts']
  .map((p) => [p, read(p)]);
const gate = read('app/spire/spire_live_gate.ts');
const net = read('app/spire/spire_net.ts');
const game = read('app/spire/use_spire_game.ts');
const runner = read('app/spire/use_spire_step_runner.ts');
const home = read('components/spire/SpireHomeScreen.tsx');
const stepScreen = read('components/spire/SpireStepScreen.tsx');
const gameHook = game;

test('gate: both locks are checked and the gate type is branded', () => {
  assert.ok(gate.includes('isSpireTabEnabled()'), 'checks the tab flag');
  assert.ok(gate.includes('config.enabled !== true'), 'checks config/spire_v1.enabled');
  assert.ok(gate.includes('unique symbol'), 'gate is a branded type (cannot be forged without the check)');
  assert.ok(gate.includes('export function spireGateStillOpen'), 're-check right before the network');
});

test('all canonical Spire language contours are selectable without cross-language fallback', () => {
  // зачем (вынос из SpireHomeScreen ≤ 400 строк, 13.10): список языков Шпиля переехал в spire_home_week.ts, экран берёт его оттуда через asSpireLang
  assert.match(read('components/spire/spire_home_week.ts'), /SPIRE_LANGS:\s*readonly SpireLang\[\]\s*=\s*\['en', 'es', 'de', 'fr', 'it'\]/u);
  assert.ok(home.includes('asSpireLang'), 'the screen resolves the study target through asSpireLang');
});

test('every rendered Spire task exposes the standard report flag and skips a reported task without penalty', () => {
  assert.match(stepScreen, /SpireTaskReportButton/u);
  assert.match(stepScreen, /stableUid:\s*stableId/u);
  assert.match(stepScreen, /floor:\s*pick\.packFloor/u);
  assert.match(stepScreen, /taskIndex:\s*runner\.displayTaskIndex/u);
  assert.match(stepScreen, /removeFromRemainingRun=\{runner\.reportCurrentTask\}/u);
  assert.match(home, /stableId=\{game\.stableId\}/u);
  assert.match(gameHook, /stableId:\s*ids\?\.stableId\s*\?\?\s*null/u);
});

test('gate: every network client takes the gate first and re-checks it', () => {
  const clients = ['spire_room_client.ts', 'spire_pack_client.ts', 'spire_week_result_client.ts', 'spire_friends_client.ts'];
  for (const name of clients) {
    const src = read(`app/spire/${name}`);
    const exported = [...src.matchAll(/export (?:async )?function (spire[A-Za-z]+)\(([^)]*)/g)];
    const network = exported.filter(([, fn]) => /Sync|Ensure|Load(?!.*Cache)/.test(fn) && !/Dismiss|Read|peek/i.test(fn));
    assert.ok(network.length > 0, `${name}: has a network entry point`);
    for (const [, fn, params] of network) {
      assert.match(params, /^\s*gate: SpireLiveGate/, `${name}: ${fn} must take SpireLiveGate first`);
    }
  }
  for (const fn of ['spireCall', 'spireFirestore', 'spireIdToken']) {
    const body = net.slice(net.indexOf(`export ${fn === 'spireCall' ? 'async ' : fn === 'spireIdToken' ? 'async ' : ''}function ${fn}`));
    assert.ok(body.slice(0, 600).includes('spireGateStillOpen('), `${fn} re-checks the gate before the network`);
  }
});

test('game hook: no network while the gate is closed', () => {
  assert.ok(game.includes("spireOpenLiveGate(config, 'home')"), 'gate opened only through the check');
  assert.ok(game.includes('unlocked && lang ? spireOpenLiveGate'), 'gate requires the unlocked screen');
  // Каждый эффект/функция с сетью начинается с раннего выхода по воротам.
  for (const marker of ['spireSyncRoom(gate', 'spireLoadFriendChips(gate', 'spireLoadWeekResult(gate', 'spireEnsureWeekPack(gate']) {
    const at = game.indexOf(marker);
    assert.ok(at > -1, `${marker} is used`);
    const guard = game.lastIndexOf('if (!gate', at);
    assert.ok(guard > -1 && at - guard < 2500, `${marker} is behind an "if (!gate" early return`);
  }
  const flushAt = game.indexOf('spireFlushNow(');
  assert.ok(flushAt > -1 && game.lastIndexOf('if (!gate || !ids || !lang) return;', flushAt) > -1, 'queue flush is behind the gate');
  assert.equal(game.split('spireFlushNow(').length - 1, 1, 'single flush call site');
  // Экран не зовёт сеть сам: только через хук.
  assert.ok(home.includes('useSpireGame({ config: preview ? null : config, unlocked: preview ? false : unlocked, lang: spireLang, week, setWeek })'), 'home passes the lock into the hook (в DEV-превью ворота закрыты, игра подменена моками)');
});

test('no Firestore listeners or collection scans in the game layer', () => {
  for (const [name, src] of appSpire) {
    assert.ok(!/onSnapshot/.test(src), `${name}: no realtime listeners`);
    assert.ok(!/\.where\(|\.orderBy\(|collectionGroup/.test(src), `${name}: no queries / collection scans`);
    for (const m of src.matchAll(/\.collection\([^)]*\)(?:\.doc\([^)]*\))?(?:\.collection\([^)]*\)\.doc\([^)]*\))?\.get\(\)/g)) {
      assert.ok(/\.doc\(/.test(m[0]), `${name}: .get() only on a single document (${m[0]})`);
    }
  }
  const room = read('app/spire/spire_room_client.ts');
  assert.ok(room.includes('SPIRE_ROOM_REFRESH_MS = 6 * 60 * 60 * 1000'), 'room TTL is 6 hours');
});

test('glass tokens: palette, opaque sheets, safe-area, no thick borders or text squeezing', () => {
  for (const [name, src] of gameComponents) {
    if (name.endsWith('.ts')) continue;
    assert.ok(src.includes('useSpirePalette'), `${name}: uses the glass palette`);
    assert.ok(!/adjustsFontSizeToFit/.test(src), `${name}: adjustsFontSizeToFit`);
    assert.ok(!/numberOfLines/.test(src), `${name}: no text truncation`);
    for (const m of src.matchAll(/borderWidth:\s*([0-9.]+)/g)) assert.ok(Number(m[1]) <= 1, `${name}: borderWidth ${m[1]}`);
    assert.ok(!/#[0-9A-Fa-f]{6}\b/.test(src), `${name}: colours come from tokens, not literals`);
  }
  for (const sheet of ['SpireExitSheet.tsx', 'SpireRulesSheet.tsx']) {
    assert.ok(read(`components/spire/${sheet}`).includes('material="liquid-glass-opaque"'), `${sheet}: opaque glass sheet`);
  }
  for (const full of ['SpireStepScreen.tsx', 'SpireTour.tsx']) {
    assert.ok(read(`components/spire/${full}`).includes('useStableSafeAreaInsets'), `${full}: stable safe-area insets`);
  }
});

test('no XP / pearls anywhere in the Spire game code; rewards are coins from config', () => {
  for (const [name, src] of [...appSpire, ...gameComponents, ...pureModules]) {
    assert.ok(!/\bxp\b|\bXP\b|pearl|жемчуг|жемчуж/i.test(src.replace(/\/\/.*$/gm, '')), `${name}: XP/pearl mention`);
  }
  const panel = read('components/spire/SpireResultPanel.tsx');
  assert.ok(panel.includes('coins.perStep') && panel.includes('coins.summitBonus'), 'coin amounts come from config/spire_v1');
});

test('energy: charged on the first task, acknowledged, refunded if the task never showed', () => {
  assert.ok(runner.includes('confirmSpendOne(intent)'), 'single canonical spend');
  assert.ok(runner.includes('acknowledgeSessionStart(intent.operationId)'), 'start acknowledged once the first task is on screen');
  assert.ok(runner.includes("refundOne(intent.operationId, 'spire_first_task_not_shown')"), 'refund when the first task never showed (D87)');
  assert.ok(runner.includes("useEnergySessionIntent('spire_step'"), 'stable operation id per step run');
});

test('optimistic UI: marker moves before the disk write, rollback on failure, late write guard', () => {
  const apply = game.indexOf('spireApplyStepReport(base, finish.report)');
  const record = game.indexOf('spireRecordStepResult(ids.uid');
  assert.ok(apply > -1 && record > apply, 'local week updates before the record promise');
  assert.ok(game.includes('setWeek(base)'), 'rollback to the previous week');
  assert.ok(game.includes('lastReportRef.current !== finish.report.reportId'), 'late write does not overwrite a newer screen');
  assert.ok(game.includes('startingRef.current || session'), 'double-tap guard on start');
});

test('logs: [SPIRE] prefix everywhere, no silent catch', () => {
  for (const [name, src] of [...appSpire, ...gameComponents]) {
    if (/^app\//.test(name)) assert.ok(src.includes("'[SPIRE]'"), `${name}: [SPIRE] prefix`);
    assert.ok(!/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(src), `${name}: empty catch`);
    assert.ok(!/\.catch\(\(\)\s*=>\s*\{\s*\}\)/.test(src), `${name}: swallowed promise`);
  }
});

test('pure modules stay pure and every new file stays small', () => {
  for (const [name, src] of pureModules) {
    assert.ok(!/react-native|@react-native-firebase|AsyncStorage|Date\.now\(\)/.test(src), `${name}: pure (no RN / Firebase / clock)`);
  }
  for (const [name, src] of [...appSpire, ...gameComponents, ...pureModules]) {
    assert.ok(src.split('\n').length <= 400, `${name} is longer than 400 lines`);
  }
});

test('owner 30.09: the correct answer stays until «Дальше», the timer is stopped meanwhile', () => {
  assert.ok(!runner.includes('SPIRE_STEP_REVEAL_MS'), 'no auto-advance after an error');
  assert.ok(runner.includes('const continueAfterReveal = useCallback'), 'explicit continue');
  assert.ok(runner.includes("if (cur.phase !== 'active' || exitOpenRef.current) return;"), 'timer ticks only in the active phase');
  const step = read('components/spire/SpireStepScreen.tsx');
  assert.ok(step.includes('onContinue={runner.continueAfterReveal}') && step.includes('onPress={props.onContinue}'), '«Дальше» button');
  assert.match(step, /onward: \{[^}]*minHeight: (4[4-9]|[5-9]\d)/, '«Дальше» is at least 44dp tall');
});

test('owner 30.09: rivals on the tower and «who is on this floor» come from the cached room only', () => {
  const tower = read('components/spire/SpireTower.tsx');
  const info = read('components/spire/SpireFloorInfo.tsx');
  assert.ok(home.includes('spireRivalsByFloor(game.rows)'), 'rivals are derived from the cached room rows');
  assert.ok(tower.includes('RivalsLayer') && tower.includes('`+${extra}`'), 'up to two rivals and «+N» left of the floor');
  assert.ok(info.includes('testID="spire-floor-who"'), 'floor card shows who is on it');
  for (const src of [tower, info]) assert.ok(!/firestore|spireSync|fetch\(/.test(src), 'no reads for rivals');
});
